"""
온보딩 진행 상태 관리 API

사용자의 온보딩 액션 완료 상태 및 UI 설정을 관리합니다.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime
import logging

from app.core.database import get_supabase_client
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

# =====================================
# Pydantic Schemas
# =====================================

class ActionProgressResponse(BaseModel):
    """액션 진행 상태 응답"""
    action_key: str
    completed: bool
    completed_at: Optional[datetime] = None


class ProgressResponse(BaseModel):
    """전체 진행 상태 응답"""
    progress: Dict[str, ActionProgressResponse]
    is_collapsed: bool


class UpdateProgressRequest(BaseModel):
    """진행 상태 업데이트 요청"""
    completed: bool


class PreferencesRequest(BaseModel):
    """UI 설정 업데이트 요청"""
    is_collapsed: bool


class PreferencesResponse(BaseModel):
    """UI 설정 응답"""
    is_collapsed: bool
    updated_at: datetime


# =====================================
# API Endpoints
# =====================================

@router.get("/progress", response_model=ProgressResponse)
async def get_onboarding_progress(
    current_user: dict = Depends(get_current_user)
):
    """
    사용자의 온보딩 진행 상태 조회
    
    Returns:
        - progress: 각 액션의 완료 상태
        - is_collapsed: 접어두기 상태
    """
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        # 1. 진행 상태 조회
        progress_result = supabase.table("onboarding_progress").select("*").eq(
            "user_id", user_id
        ).execute()
        
        # 2. 접어두기 상태 조회
        preferences_result = supabase.table("onboarding_preferences").select("*").eq(
            "user_id", user_id
        ).execute()
        
        # 3. 진행 상태 매핑
        progress_dict = {}
        for item in (progress_result.data or []):
            progress_dict[item["action_key"]] = ActionProgressResponse(
                action_key=item["action_key"],
                completed=item["completed"],
                completed_at=item.get("completed_at")
            )
        
        # 4. 접어두기 상태 (없으면 false)
        is_collapsed = False
        if preferences_result.data and len(preferences_result.data) > 0:
            is_collapsed = preferences_result.data[0].get("is_collapsed", False)
        
        logger.info(f"[Onboarding] 진행 상태 조회 성공: user_id={user_id}, progress_count={len(progress_dict)}")
        
        return ProgressResponse(
            progress=progress_dict,
            is_collapsed=is_collapsed
        )
        
    except Exception as e:
        logger.error(f"[Onboarding] 진행 상태 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"진행 상태 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/progress/{action_key}")
async def update_action_progress(
    action_key: str,
    request: UpdateProgressRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    특정 액션의 완료 상태 업데이트
    
    Args:
        action_key: 액션 고유 식별자
        request: 완료 여부
    """
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        # UPSERT (INSERT or UPDATE)
        data = {
            "user_id": user_id,
            "action_key": action_key,
            "completed": request.completed,
            "completed_at": datetime.now().isoformat() if request.completed else None,
            "updated_at": datetime.now().isoformat()
        }
        
        # ON CONFLICT (user_id, action_key) DO UPDATE
        result = supabase.table("onboarding_progress").upsert(
            data,
            on_conflict="user_id,action_key"
        ).execute()
        
        logger.info(
            f"[Onboarding] 액션 상태 업데이트: "
            f"user_id={user_id}, action_key={action_key}, completed={request.completed}"
        )
        
        return {
            "status": "success",
            "message": "진행 상태가 업데이트되었습니다.",
            "action_key": action_key,
            "completed": request.completed
        }
        
    except Exception as e:
        logger.error(f"[Onboarding] 액션 상태 업데이트 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"진행 상태 업데이트 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/preferences", response_model=PreferencesResponse)
async def get_onboarding_preferences(
    current_user: dict = Depends(get_current_user)
):
    """
    사용자의 온보딩 UI 설정 조회
    """
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        result = supabase.table("onboarding_preferences").select("*").eq(
            "user_id", user_id
        ).execute()
        
        # 없으면 기본값
        if not result.data or len(result.data) == 0:
            return PreferencesResponse(
                is_collapsed=False,
                updated_at=datetime.now()
            )
        
        pref = result.data[0]
        return PreferencesResponse(
            is_collapsed=pref.get("is_collapsed", False),
            updated_at=pref.get("updated_at", datetime.now())
        )
        
    except Exception as e:
        logger.error(f"[Onboarding] UI 설정 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"UI 설정 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.put("/preferences")
async def update_onboarding_preferences(
    request: PreferencesRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    사용자의 온보딩 UI 설정 업데이트
    
    Args:
        request: 접어두기 상태 등
    """
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        # UPSERT
        data = {
            "user_id": user_id,
            "is_collapsed": request.is_collapsed,
            "updated_at": datetime.now().isoformat()
        }
        
        result = supabase.table("onboarding_preferences").upsert(
            data,
            on_conflict="user_id"
        ).execute()
        
        logger.info(
            f"[Onboarding] UI 설정 업데이트: "
            f"user_id={user_id}, is_collapsed={request.is_collapsed}"
        )
        
        return {
            "status": "success",
            "message": "UI 설정이 업데이트되었습니다.",
            "is_collapsed": request.is_collapsed
        }
        
    except Exception as e:
        logger.error(f"[Onboarding] UI 설정 업데이트 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"UI 설정 업데이트 중 오류가 발생했습니다: {str(e)}"
        )
