"""
키워드 순위 관련 API 라우터
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.services.naver_rank import NaverRankTracker
from app.core.database import get_supabase_client

router = APIRouter()


class KeywordCreateRequest(BaseModel):
    """키워드 등록 요청"""
    store_id: UUID
    keyword: str


class RankCheckRequest(BaseModel):
    """순위 확인 요청"""
    store_id: UUID
    store_name: str
    keyword: str


class KeywordResponse(BaseModel):
    """키워드 응답"""
    id: UUID
    store_id: UUID
    keyword: str
    current_rank: Optional[int]
    previous_rank: Optional[int]
    last_checked_at: Optional[str]


@router.post("/check-rank")
async def check_keyword_rank(request: RankCheckRequest):
    """
    키워드 순위 실시간 확인
    """
    try:
        result = await NaverRankTracker.check_and_update_rank(
            str(request.store_id),
            request.store_name,
            request.keyword
        )
        
        return {
            "status": "success",
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"순위 확인 실패: {str(e)}"
        )


@router.get("/stores/{store_id}/keywords", response_model=List[KeywordResponse])
async def get_store_keywords(store_id: UUID):
    """
    매장의 등록된 키워드 목록 조회
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("keywords").select("*").eq(
            "store_id", str(store_id)
        ).order("last_checked_at", desc=True).execute()
        
        return result.data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"키워드 조회 실패: {str(e)}"
        )


@router.post("/stores/{store_id}/keywords")
async def add_keyword(store_id: UUID, request: KeywordCreateRequest):
    """
    새 키워드 등록
    """
    try:
        if str(request.store_id) != str(store_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="store_id가 일치하지 않습니다."
            )
        
        supabase = get_supabase_client()
        
        # 중복 확인
        existing = supabase.table("keywords").select("id").eq(
            "store_id", str(store_id)
        ).eq("keyword", request.keyword).execute()
        
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="이미 등록된 키워드입니다."
            )
        
        # 키워드 등록
        result = supabase.table("keywords").insert({
            "store_id": str(store_id),
            "keyword": request.keyword,
            "current_rank": None,
            "previous_rank": None
        }).execute()
        
        return {
            "status": "success",
            "message": "키워드가 등록되었습니다.",
            "data": result.data[0] if result.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"키워드 등록 실패: {str(e)}"
        )


@router.delete("/keywords/{keyword_id}")
async def delete_keyword(keyword_id: UUID):
    """
    키워드 삭제
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("keywords").delete().eq(
            "id", str(keyword_id)
        ).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="키워드를 찾을 수 없습니다."
            )
        
        return {
            "status": "success",
            "message": "키워드가 삭제되었습니다."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"키워드 삭제 실패: {str(e)}"
        )


@router.get("/keywords/{keyword_id}/history")
async def get_keyword_rank_history(keyword_id: UUID, limit: int = 30):
    """
    키워드 순위 변동 히스토리 조회
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("rank_history").select("*").eq(
            "keyword_id", str(keyword_id)
        ).order("checked_at", desc=True).limit(limit).execute()
        
        return {
            "keyword_id": keyword_id,
            "history": result.data
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"히스토리 조회 실패: {str(e)}"
        )


