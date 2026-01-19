"""
타겟 키워드 추출 및 진단 API 라우터
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID

from app.services.naver_target_keyword_service import NaverTargetKeywordService

router = APIRouter()


class TargetKeywordAnalysisRequest(BaseModel):
    """타겟 키워드 분석 요청"""
    store_id: str = Field(..., description="매장 ID")
    user_id: UUID = Field(..., description="사용자 ID")
    regions: List[str] = Field(default=[], description="지역명 리스트")
    landmarks: List[str] = Field(default=[], description="랜드마크 리스트")
    menus: List[str] = Field(default=[], description="메뉴/상품명 리스트")
    industries: List[str] = Field(default=[], description="업종 리스트")
    others: List[str] = Field(default=[], description="기타 키워드 리스트")


@router.post("/analyze")
async def analyze_target_keywords(request: TargetKeywordAnalysisRequest):
    """
    타겟 키워드 추출 및 진단
    
    - 입력된 키워드를 조합하여 타겟 키워드 생성
    - 각 키워드의 검색량 조회
    - 상위 20개 키워드 추출
    - 매장의 SEO 최적화 상태 분석
    
    Args:
        request: 분석 요청 데이터
        
    Returns:
        분석 결과
        
    Raises:
        HTTPException: 분석 실패 시
    """
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[타겟 키워드 API] 요청 받음: store_id={request.store_id}, user_id={request.user_id}")
        logger.info(f"[타겟 키워드 API] 입력 키워드: regions={request.regions}, landmarks={request.landmarks}, menus={request.menus}, industries={request.industries}, others={request.others}")
        print(f"[타겟 키워드 분석] 요청 받음: store_id={request.store_id}, user_id={request.user_id}")
        
        service = NaverTargetKeywordService()
        
        result = await service.analyze_target_keywords(
            store_id=request.store_id,
            user_id=str(request.user_id),
            regions=request.regions,
            landmarks=request.landmarks,
            menus=request.menus,
            industries=request.industries,
            others=request.others
        )
        
        if result.get("status") == "error":
            logger.error(f"[타겟 키워드 API] 에러 발생: {result.get('message')}")
            print(f"[타겟 키워드 분석] 에러 발생: {result.get('message')}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("message")
            )
        
        logger.info(f"[타겟 키워드 API] 분석 완료: {len(result.get('data', {}).get('top_keywords', []))}개 키워드")
        print(f"[타겟 키워드 분석] 분석 완료")
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
