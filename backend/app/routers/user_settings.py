"""
User Settings Router
사용자 설정 API 엔드포인트
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.routers.auth import get_current_user
from app.models.user_settings import (
    NotificationSettingsUpdate,
    NotificationSettingsResponse,
    LoginHistoryResponse
)
from app.core.database import get_supabase_client
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])


@router.get("/notifications", response_model=NotificationSettingsResponse)
async def get_notification_settings(user=Depends(get_current_user)):
    """
    알림 설정 조회
    """
    try:
        supabase = get_supabase_client()
        user_id = user["id"]
        
        result = supabase.table("user_notification_settings").select("*") \
            .eq("user_id", user_id) \
            .execute()
        
        # 설정이 없으면 기본값으로 생성
        if not result.data:
            insert_result = supabase.table("user_notification_settings").insert({
                "user_id": user_id
            }).execute()
            
            if not insert_result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create notification settings"
                )
            
            settings = insert_result.data[0]
        else:
            settings = result.data[0]
        
        return NotificationSettingsResponse(
            user_id=str(settings["user_id"]),
            email_notifications=settings.get("email_notifications", True),
            weekly_report=settings.get("weekly_report", True),
            marketing_consent=settings.get("marketing_consent", False),
            created_at=settings["created_at"],
            updated_at=settings["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get notification settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get notification settings"
        )


@router.put("/notifications", response_model=NotificationSettingsResponse)
async def update_notification_settings(
    settings: NotificationSettingsUpdate,
    user=Depends(get_current_user)
):
    """
    알림 설정 업데이트
    """
    try:
        supabase = get_supabase_client()
        user_id = user["id"]
        
        # Upsert (기존 설정이 없으면 생성)
        result = supabase.table("user_notification_settings").upsert({
            "user_id": user_id,
            "email_notifications": settings.email_notifications,
            "weekly_report": settings.weekly_report,
            "marketing_consent": settings.marketing_consent
        }).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update notification settings"
            )
        
        updated_settings = result.data[0]
        
        return NotificationSettingsResponse(
            user_id=str(updated_settings["user_id"]),
            email_notifications=updated_settings["email_notifications"],
            weekly_report=updated_settings["weekly_report"],
            marketing_consent=updated_settings["marketing_consent"],
            created_at=updated_settings["created_at"],
            updated_at=updated_settings["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update notification settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification settings"
        )


@router.get("/login-history")
async def get_login_history(
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    user=Depends(get_current_user)
):
    """
    로그인 기록 조회
    """
    try:
        supabase = get_supabase_client()
        user_id = user["id"]
        
        result = supabase.table("login_history").select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
        
        history_data = result.data or []
        
        history = [
            LoginHistoryResponse(
                id=str(h["id"]),
                user_id=str(h["user_id"]),
                ip_address=h.get("ip_address"),
                user_agent=h.get("user_agent"),
                device_type=h.get("device_type"),
                browser=h.get("browser"),
                location=h.get("location"),
                created_at=h["created_at"]
            )
            for h in history_data
        ]
        
        return history
        
    except Exception as e:
        logger.error(f"Failed to get login history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get login history"
        )
