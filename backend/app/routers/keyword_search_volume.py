"""
키워드 검색량 관련 API 라우터
"""
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID

from app.services.naver_keyword_search_volume_service import NaverKeywordSearchVolumeService
from app.routers.auth import get_current_user
from app.services.credit_service import credit_service
from app.core.config import settings

router = APIRouter()


class KeywordSearchRequest(BaseModel):
    """키워드 검색량 조회 요청"""
    user_id: UUID
    keywords: List[str] = Field(..., max_items=5, description="조회할 키워드 리스트 (최대 5개)")


class KeywordCombinationRequest(BaseModel):
    """키워드 조합 생성 요청"""
    location_keywords: List[str] = Field(..., description="지역 키워드 리스트")
    product_keywords: List[str] = Field(..., description="상품 키워드 리스트")
    industry_keywords: List[str] = Field(..., description="업종 키워드 리스트")


class SearchVolumeHistoryDeleteRequest(BaseModel):
    """검색량 이력 삭제 요청"""
    user_id: UUID
    history_id: UUID


@router.post("/search-volume")
async def get_keyword_search_volume(
    request: KeywordSearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    키워드 검색량 조회 및 저장
    크레딧: 키워드 수 × 2 크레딧 소모
    """
    user_id = UUID(current_user["id"])
    
    try:
        # 🆕 크레딧 체크 (Feature Flag 확인) - 동적 크레딧
        required_credits = len(request.keywords) * 2
        
        if settings.CREDIT_SYSTEM_ENABLED and settings.CREDIT_CHECK_STRICT:
            check_result = await credit_service.check_sufficient_credits(
                user_id=user_id,
                feature="keyword_search_volume",
                required_credits=required_credits
            )
            
            if not check_result.sufficient:
                print(f"[Credits] User {user_id} has insufficient credits for keyword search volume ({required_credits} needed)")
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail=f"크레딧이 부족합니다. {required_credits} 크레딧이 필요합니다. 크레딧을 충전하거나 플랜을 업그레이드해주세요."
                )
            
            print(f"[Credits] User {user_id} has sufficient credits for keyword search volume")
        
        print(f"[키워드 검색량] 요청 받음: user_id={request.user_id}, keywords={request.keywords}")
        service = NaverKeywordSearchVolumeService()
        
        # 검색량 조회
        result = service.get_keyword_search_volume(request.keywords)
        print(f"[키워드 검색량] API 결과: {result['status']}")
        
        if result["status"] == "error":
            print(f"[키워드 검색량] 에러 발생: {result['message']}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["message"]
            )
        
        # 각 키워드에 대한 검색량 이력 저장
        saved_results = []
        for keyword in request.keywords:
            print(f"[키워드 검색량] 키워드 '{keyword}' 저장 시도...")
            save_result = service.save_search_volume_history(
                user_id=str(request.user_id),
                keyword=keyword,
                search_result=result["data"]
            )
            print(f"[키워드 검색량] 저장 결과: {save_result['status']}")
            if save_result["status"] == "success":
                saved_results.append(save_result["data"])
            else:
                print(f"[키워드 검색량] 저장 실패: {save_result.get('message', 'Unknown error')}")
        
        print(f"[키워드 검색량] 총 {len(saved_results)}개 저장됨")
        
        # 🆕 크레딧 차감 (성공 시) - 동적 크레딧
        if settings.CREDIT_SYSTEM_ENABLED and settings.CREDIT_AUTO_DEDUCT:
            try:
                transaction_id = await credit_service.deduct_credits(
                    user_id=user_id,
                    feature="keyword_search_volume",
                    credits_amount=required_credits,
                    metadata={
                        "keywords": request.keywords,
                        "keywords_count": len(request.keywords)
                    }
                )
                print(f"[Credits] Deducted {required_credits} credits from user {user_id} (transaction: {transaction_id})")
            except Exception as credit_error:
                print(f"[Credits] Failed to deduct credits: {credit_error}")
        
        return {
            "status": "success",
            "message": "검색량 조회 완료",
            "data": result["data"],
            "saved_history": saved_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"검색량 조회 실패: {str(e)}"
        )


@router.get("/search-volume/history/{user_id}")
async def get_search_volume_history(user_id: str, limit: int = 100):
    """
    사용자의 검색량 이력 조회
    """
    try:
        service = NaverKeywordSearchVolumeService()
        
        history = service.get_search_volume_history(
            user_id=user_id,
            limit=min(limit, 100)  # 최대 100개로 제한
        )
        
        return {
            "status": "success",
            "data": history,
            "total": len(history)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"검색 이력 조회 실패: {str(e)}"
        )


@router.delete("/search-volume/history")
async def delete_search_volume_history(request: SearchVolumeHistoryDeleteRequest):
    """
    검색량 이력 삭제
    """
    try:
        service = NaverKeywordSearchVolumeService()
        
        result = service.delete_search_volume_history(
            user_id=str(request.user_id),
            history_id=str(request.history_id)
        )
        
        if result["status"] == "error":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["message"]
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"이력 삭제 실패: {str(e)}"
        )


@router.post("/keyword-combinations")
async def generate_keyword_combinations(request: KeywordCombinationRequest):
    """
    키워드 조합 생성
    """
    try:
        service = NaverKeywordSearchVolumeService()
        
        combinations = service.generate_keyword_combinations(
            location_keywords=request.location_keywords,
            product_keywords=request.product_keywords,
            industry_keywords=request.industry_keywords
        )
        
        return {
            "status": "success",
            "data": combinations,
            "total": len(combinations)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"키워드 조합 생성 실패: {str(e)}"
        )
