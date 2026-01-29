"""
타겟 키워드 추출 및 진단 API 라우터
"""
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging

from app.services.naver_target_keyword_service import NaverTargetKeywordService
from app.core.database import get_supabase_client
from app.routers.auth import get_current_user
from app.services.credit_service import credit_service
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


class TargetKeywordAnalysisRequest(BaseModel):
    """타겟 키워드 분석 요청"""
    store_id: str = Field(..., description="매장 ID")
    # user_id: UUID = Field(..., description="사용자 ID")  # Removed: user_id is now extracted from current_user
    regions: List[str] = Field(default=[], description="지역명 리스트")
    landmarks: List[str] = Field(default=[], description="랜드마크 리스트")
    menus: List[str] = Field(default=[], description="메뉴/상품명 리스트")
    industries: List[str] = Field(default=[], description="업종 리스트")
    others: List[str] = Field(default=[], description="기타 키워드 리스트")


@router.post("/analyze")
async def analyze_target_keywords(
    request: TargetKeywordAnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    타겟 키워드 추출 및 진단
    
    - 입력된 키워드를 조합하여 타겟 키워드 생성
    - 각 키워드의 검색량 조회
    - 상위 20개 키워드 추출
    - 매장의 SEO 최적화 상태 분석
    - 히스토리 저장 (매장별 최대 10개, 초과 시 가장 오래된 것 삭제)
    크레딧: 20 크레딧 소모
    
    Args:
        request: 분석 요청 데이터
        
    Returns:
        분석 결과 (history_id 포함)
        
    Raises:
        HTTPException: 분석 실패 시
    """
    user_id = UUID(current_user["id"])
    
    try:
        # 🆕 크레딧 체크 (Feature Flag 확인)
        if settings.CREDIT_SYSTEM_ENABLED and settings.CREDIT_CHECK_STRICT:
            check_result = await credit_service.check_sufficient_credits(
                user_id=user_id,
                feature="target_keyword_extraction",
                required_credits=20
            )
            
            if not check_result.sufficient:
                logger.warning(f"[Credits] User {user_id} has insufficient credits for target keyword extraction")
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail="크레딧이 부족합니다. 크레딧을 충전하거나 플랜을 업그레이드해주세요."
                )
            
            logger.info(f"[Credits] User {user_id} has sufficient credits for target keyword extraction")
        
        logger.info(f"[타겟 키워드 API] 요청 받음: store_id={request.store_id}, user_id={user_id}")  # Modified: use user_id from current_user
        logger.info(f"[타겟 키워드 API] 입력 키워드: regions={request.regions}, landmarks={request.landmarks}, menus={request.menus}, industries={request.industries}, others={request.others}")
        
        service = NaverTargetKeywordService()
        
        result = await service.analyze_target_keywords(
            store_id=request.store_id,
            user_id=str(user_id),  # Modified: use user_id from current_user
            regions=request.regions,
            landmarks=request.landmarks,
            menus=request.menus,
            industries=request.industries,
            others=request.others
        )
        
        if result.get("status") == "error":
            logger.error(f"[타겟 키워드 API] 에러 발생: {result.get('message')}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message")
            )
        
        # 히스토리 저장
        history_id = None
        try:
            supabase = get_supabase_client()
            data = result.get("data", {})
            store_info = data.get("store_info", {})
            rank_data = data.get("rank_data", {})
            
            # 추출된 키워드들 (순위 정보 포함)
            extracted_keywords = []
            for kw in data.get("top_keywords", []):
                keyword_text = kw.get("keyword")
                rank_info = rank_data.get(keyword_text, {})
                
                extracted_keywords.append({
                    "keyword": keyword_text,
                    "total_volume": kw.get("total_volume"),
                    "comp_idx": kw.get("comp_idx"),
                    "rank": rank_info.get("rank", 0),
                    "total_count": rank_info.get("total_count", 0)
                })
            
            # 히스토리 데이터 구성
            history_data = {
                "user_id": str(request.user_id),
                "store_id": request.store_id,
                "store_name": store_info.get("store_name", "Unknown"),
                "regions": request.regions,
                "landmarks": request.landmarks,
                "menus": request.menus,
                "industries": request.industries,
                "other_keywords": request.others,
                "extracted_keywords": extracted_keywords,
                "total_keywords": len(extracted_keywords)
            }
            
            # 히스토리 저장
            insert_result = supabase.table("target_keywords_history").insert(history_data).execute()
            
            if insert_result.data and len(insert_result.data) > 0:
                history_id = insert_result.data[0].get("id")
                logger.info(f"[타겟 키워드 히스토리] 저장 완료: history_id={history_id}")
                
                # 매장별 히스토리 개수 확인 및 오래된 것 삭제 (10개 제한)
                history_count_result = supabase.table("target_keywords_history") \
                    .select("id", count="exact") \
                    .eq("store_id", request.store_id) \
                    .execute()
                
                history_count = history_count_result.count if history_count_result.count else 0
                logger.info(f"[타겟 키워드 히스토리] 매장 {request.store_id}의 히스토리 개수: {history_count}")
                
                if history_count > 10:
                    # 가장 오래된 것 삭제 (10개 초과분)
                    to_delete_count = history_count - 10
                    oldest_result = supabase.table("target_keywords_history") \
                        .select("id") \
                        .eq("store_id", request.store_id) \
                        .order("created_at", desc=False) \
                        .limit(to_delete_count) \
                        .execute()
                    
                    if oldest_result.data:
                        ids_to_delete = [item["id"] for item in oldest_result.data]
                        for delete_id in ids_to_delete:
                            supabase.table("target_keywords_history").delete().eq("id", delete_id).execute()
                        logger.info(f"[타겟 키워드 히스토리] {to_delete_count}개 오래된 히스토리 삭제 완료")
            else:
                logger.warning(f"[타겟 키워드 히스토리] 저장은 되었으나 ID를 가져올 수 없음")
                
        except Exception as e:
            logger.error(f"[타겟 키워드 히스토리] 저장 실패: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            # 히스토리 저장 실패는 무시하고 계속 진행
        
        # 응답에 history_id 추가
        if history_id:
            result["history_id"] = history_id
        
        # 🆕 크레딧 차감 (성공 시)
        if settings.CREDIT_SYSTEM_ENABLED and settings.CREDIT_AUTO_DEDUCT:
            try:
                transaction_id = await credit_service.deduct_credits(
                    user_id=user_id,
                    feature="target_keyword_extraction",
                    credits_amount=20,
                    metadata={
                        "store_id": request.store_id,
                        "keywords_count": len(result.get('data', {}).get('top_keywords', [])),
                        "history_id": history_id
                    }
                )
                logger.info(f"[Credits] Deducted 20 credits from user {user_id} (transaction: {transaction_id})")
            except Exception as credit_error:
                logger.error(f"[Credits] Failed to deduct credits: {credit_error}")
        
        logger.info(f"[타겟 키워드 API] 분석 완료: {len(result.get('data', {}).get('top_keywords', []))}개 키워드")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"타겟 키워드 분석 실패: {str(e)}"
        )


@router.get("/history/{store_id}")
async def get_store_keyword_history(
    store_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    매장별 타겟 키워드 추출 히스토리 조회
    
    Args:
        store_id: 매장 ID
        current_user: 현재 로그인한 사용자 정보
        
    Returns:
        히스토리 목록 (최신순, 최대 10개)
    """
    try:
        supabase = get_supabase_client()
        user_id = current_user.get("id")
        
        # 사용자의 매장인지 확인
        store_check = supabase.table("stores") \
            .select("id") \
            .eq("id", store_id) \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        
        if not store_check.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="해당 매장에 대한 권한이 없습니다."
            )
        
        # 히스토리 조회 (최신순, 최대 10개)
        result = supabase.table("target_keywords_history") \
            .select("*") \
            .eq("store_id", store_id) \
            .order("created_at", desc=True) \
            .limit(10) \
            .execute()
        
        histories = result.data if result.data else []
        
        logger.info(f"[타겟 키워드 히스토리] 조회 완료: store_id={store_id}, count={len(histories)}")
        
        # 디버깅: 첫 번째 히스토리의 키 확인
        if histories:
            logger.info(f"[타겟 키워드 히스토리] 첫 번째 히스토리 키: {list(histories[0].keys())}")
            logger.info(f"[타겟 키워드 히스토리] extracted_keywords 존재 여부: {'extracted_keywords' in histories[0]}")
            if 'extracted_keywords' in histories[0]:
                logger.info(f"[타겟 키워드 히스토리] extracted_keywords 값: {histories[0]['extracted_keywords']}")
        
        return {
            "status": "success",
            "store_id": store_id,
            "histories": histories
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[타겟 키워드 히스토리] 조회 실패: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"히스토리 조회 실패: {str(e)}"
        )


@router.get("/history/detail/{history_id}")
async def get_keyword_history_detail(
    history_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    타겟 키워드 히스토리 상세 조회
    
    Args:
        history_id: 히스토리 ID
        current_user: 현재 로그인한 사용자 정보
        
    Returns:
        히스토리 상세 정보 (추출된 키워드 포함)
    """
    try:
        supabase = get_supabase_client()
        user_id = current_user.get("id")
        
        # 히스토리 조회 (사용자 소유 확인)
        result = supabase.table("target_keywords_history") \
            .select("*") \
            .eq("id", history_id) \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="히스토리를 찾을 수 없습니다."
            )
        
        history = result.data
        
        logger.info(f"[타겟 키워드 히스토리] 상세 조회 완료: history_id={history_id}")
        
        return {
            "status": "success",
            "history": history
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[타겟 키워드 히스토리] 상세 조회 실패: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"히스토리 상세 조회 실패: {str(e)}"
        )
