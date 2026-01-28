"""
Feature Voting API Router
신규 기능 투표 시스템 API
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
import logging

from app.core.database import get_supabase_client
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/votes", tags=["Feature Voting"])


# ================================
# Pydantic Models
# ================================

class VoteRequest(BaseModel):
    """투표 요청 모델"""
    vote_type: str  # 'want' | 'not_needed'


class VoteResponse(BaseModel):
    """투표 응답 모델"""
    status: str
    message: str
    vote: Optional[dict] = None


class FeatureVoteSummary(BaseModel):
    """기능별 투표 요약"""
    feature_key: str
    want_count: int
    not_needed_count: int
    total_votes: int
    user_voted: Optional[str] = None  # 'want' | 'not_needed' | None


class MyVotesResponse(BaseModel):
    """내 투표 목록 응답"""
    votes: List[dict]
    total_count: int


# ================================
# API Endpoints
# ================================

@router.get("/features", response_model=List[FeatureVoteSummary])
async def get_all_feature_votes(
    current_user: dict = Depends(get_current_user)
):
    """
    모든 기능의 투표 현황 조회
    - 각 기능별 투표 수 집계
    - 현재 사용자의 투표 여부 포함
    """
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        logger.info(f"[Vote] Fetching all feature votes for user: {user_id}")
        
        # 1. 모든 투표 데이터 조회
        response = supabase.table("feature_votes").select("*").execute()
        
        all_votes = response.data or []
        
        # 2. 기능별로 투표 집계
        feature_summary = {}
        
        for vote in all_votes:
            feature_key = vote["feature_key"]
            vote_type = vote["vote_type"]
            voter_id = vote["user_id"]
            
            if feature_key not in feature_summary:
                feature_summary[feature_key] = {
                    "feature_key": feature_key,
                    "want_count": 0,
                    "not_needed_count": 0,
                    "total_votes": 0,
                    "user_voted": None
                }
            
            # 투표 수 집계
            if vote_type == "want":
                feature_summary[feature_key]["want_count"] += 1
            elif vote_type == "not_needed":
                feature_summary[feature_key]["not_needed_count"] += 1
            
            feature_summary[feature_key]["total_votes"] += 1
            
            # 현재 사용자의 투표 여부
            if voter_id == user_id:
                feature_summary[feature_key]["user_voted"] = vote_type
        
        # 3. 결과 반환
        result = list(feature_summary.values())
        
        logger.info(f"[Vote] Found {len(result)} features with votes")
        
        return result
        
    except Exception as e:
        logger.error(f"[Vote] Error fetching feature votes: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"투표 현황 조회 실패: {str(e)}"
        )


@router.post("/features/{feature_key}", response_model=VoteResponse)
async def vote_for_feature(
    feature_key: str,
    vote_request: VoteRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    특정 기능에 투표하기
    - 'want': 빨리 만들어주세요
    - 'not_needed': 별로 필요없을것 같아요
    - 중복 투표 방지 (UNIQUE 제약)
    """
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        vote_type = vote_request.vote_type
        
        # 투표 타입 검증
        if vote_type not in ['want', 'not_needed']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="투표 타입은 'want' 또는 'not_needed'만 가능합니다."
            )
        
        logger.info(f"[Vote] User {user_id} voting for {feature_key}: {vote_type}")
        
        # 투표 등록
        vote_data = {
            "feature_key": feature_key,
            "user_id": user_id,
            "vote_type": vote_type
        }
        
        response = supabase.table("feature_votes").insert(vote_data).execute()
        
        if response.data:
            vote = response.data[0]
            logger.info(f"[Vote] Successfully voted: {vote['id']}")
            
            return VoteResponse(
                status="success",
                message="투표가 완료되었습니다!",
                vote=vote
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="투표 등록에 실패했습니다."
            )
        
    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e).lower()
        
        # 중복 투표 에러 처리
        if "unique" in error_message or "duplicate" in error_message:
            logger.warning(f"[Vote] User {user_id} already voted for {feature_key}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="이미 투표하신 기능입니다."
            )
        
        logger.error(f"[Vote] Error voting for feature: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"투표 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/my-votes", response_model=MyVotesResponse)
async def get_my_votes(
    current_user: dict = Depends(get_current_user)
):
    """
    내가 투표한 기능 목록 조회
    """
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        logger.info(f"[Vote] Fetching votes for user: {user_id}")
        
        # 내 투표 조회
        response = supabase.table("feature_votes") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()
        
        votes = response.data or []
        
        logger.info(f"[Vote] Found {len(votes)} votes for user {user_id}")
        
        return MyVotesResponse(
            votes=votes,
            total_count=len(votes)
        )
        
    except Exception as e:
        logger.error(f"[Vote] Error fetching user votes: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"내 투표 조회 실패: {str(e)}"
        )


@router.get("/features/{feature_key}/summary")
async def get_feature_vote_summary(
    feature_key: str,
    current_user: dict = Depends(get_current_user)
):
    """
    특정 기능의 투표 현황 상세 조회
    """
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        logger.info(f"[Vote] Fetching summary for feature: {feature_key}")
        
        # 해당 기능의 모든 투표 조회
        response = supabase.table("feature_votes") \
            .select("*") \
            .eq("feature_key", feature_key) \
            .execute()
        
        votes = response.data or []
        
        # 집계
        want_count = sum(1 for v in votes if v["vote_type"] == "want")
        not_needed_count = sum(1 for v in votes if v["vote_type"] == "not_needed")
        user_voted = None
        
        for v in votes:
            if v["user_id"] == user_id:
                user_voted = v["vote_type"]
                break
        
        summary = {
            "feature_key": feature_key,
            "want_count": want_count,
            "not_needed_count": not_needed_count,
            "total_votes": len(votes),
            "user_voted": user_voted
        }
        
        logger.info(f"[Vote] Summary for {feature_key}: {summary}")
        
        return summary
        
    except Exception as e:
        logger.error(f"[Vote] Error fetching feature summary: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"기능 투표 현황 조회 실패: {str(e)}"
        )
