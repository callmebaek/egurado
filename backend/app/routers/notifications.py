"""
Notifications Router
알림 센터 API 엔드포인트
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, Literal
from app.routers.auth import get_current_user
from app.dependencies.admin import require_god_tier
from app.models.notification import (
    NotificationCreate,
    NotificationUpdate,
    NotificationResponse,
    NotificationListResponse,
    NotificationUnreadCountResponse,
    MarkAsReadResponse
)
from app.core.database import get_supabase_client
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    type_filter: Optional[Literal['announcement', 'update', 'marketing', 'system']] = None,
    unread_only: bool = False,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(get_current_user)
):
    """
    알림 목록 조회
    
    - 사용자 본인의 알림 + 전역 알림
    - 타입별 필터링 가능
    - 읽지 않은 알림만 필터링 가능
    """
    try:
        supabase = get_supabase_client()
        user_id = user["id"]
        
        # 쿼리 시작
        query = supabase.table("notifications").select("*")
        
        # 사용자 본인 또는 전역 알림 필터
        query = query.or_(f"user_id.eq.{user_id},is_global.eq.true")
        
        # 타입 필터
        if type_filter:
            query = query.eq("type", type_filter)
        
        # 읽지 않은 알림만
        if unread_only:
            query = query.eq("is_read", False)
        
        # 정렬 및 페이징
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        
        result = query.execute()
        notifications_data = result.data or []
        
        # 전체 개수 및 읽지 않은 개수 조회
        count_query = supabase.table("notifications").select("id, is_read", count="exact")
        count_query = count_query.or_(f"user_id.eq.{user_id},is_global.eq.true")
        if type_filter:
            count_query = count_query.eq("type", type_filter)
        
        count_result = count_query.execute()
        total_count = count_result.count or 0
        unread_count = sum(1 for n in (count_result.data or []) if not n.get("is_read", True))
        
        # 응답 생성
        notifications = [
            NotificationResponse(
                id=str(n["id"]),
                type=n["type"],
                title=n["title"],
                content=n["content"],
                link=n.get("link"),
                is_read=n.get("is_read", False),
                is_global=n.get("is_global", False),
                created_at=n["created_at"]
            )
            for n in notifications_data
        ]
        
        return NotificationListResponse(
            notifications=notifications,
            total_count=total_count,
            unread_count=unread_count
        )
        
    except Exception as e:
        logger.error(f"Failed to get notifications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get notifications"
        )


@router.get("/unread-count", response_model=NotificationUnreadCountResponse)
async def get_unread_count(user=Depends(get_current_user)):
    """
    읽지 않은 알림 개수 조회
    """
    try:
        supabase = get_supabase_client()
        user_id = user["id"]
        
        result = supabase.table("notifications").select("id", count="exact") \
            .or_(f"user_id.eq.{user_id},is_global.eq.true") \
            .eq("is_read", False) \
            .execute()
        
        unread_count = result.count or 0
        
        return NotificationUnreadCountResponse(unread_count=unread_count)
        
    except Exception as e:
        logger.error(f"Failed to get unread count: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get unread count"
        )


@router.put("/{notification_id}/read", response_model=MarkAsReadResponse)
async def mark_as_read(
    notification_id: str,
    user=Depends(get_current_user)
):
    """
    알림 읽음 처리
    """
    try:
        supabase = get_supabase_client()
        user_id = user["id"]
        
        # 알림이 사용자 것인지 또는 전역 알림인지 확인
        check_result = supabase.table("notifications").select("id") \
            .eq("id", notification_id) \
            .or_(f"user_id.eq.{user_id},is_global.eq.true") \
            .execute()
        
        if not check_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        # 읽음 처리
        supabase.table("notifications").update({"is_read": True}) \
            .eq("id", notification_id) \
            .execute()
        
        return MarkAsReadResponse(
            success=True,
            message="Notification marked as read"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to mark notification as read: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark notification as read"
        )


@router.post("/read-all", response_model=MarkAsReadResponse)
async def mark_all_as_read(user=Depends(get_current_user)):
    """
    모든 알림 읽음 처리
    """
    try:
        supabase = get_supabase_client()
        
        # Stored procedure 호출
        result = supabase.rpc("mark_all_notifications_as_read").execute()
        updated_count = result.data if result.data else 0
        
        return MarkAsReadResponse(
            success=True,
            message=f"{updated_count} notifications marked as read"
        )
        
    except Exception as e:
        logger.error(f"Failed to mark all notifications as read: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark all notifications as read"
        )


# ==================== ADMIN ENDPOINTS ====================

@router.post("", response_model=NotificationResponse, dependencies=[Depends(require_god_tier)])
async def create_notification(
    notification: NotificationCreate,
    user=Depends(get_current_user)
):
    """
    알림 생성 (관리자 전용)
    
    - God Tier만 접근 가능
    - 전역 알림 생성
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("notifications").insert({
            "type": notification.type,
            "title": notification.title,
            "content": notification.content,
            "link": notification.link,
            "is_global": notification.is_global,
            "user_id": None  # 전역 알림
        }).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create notification"
            )
        
        n = result.data[0]
        return NotificationResponse(
            id=str(n["id"]),
            type=n["type"],
            title=n["title"],
            content=n["content"],
            link=n.get("link"),
            is_read=n.get("is_read", False),
            is_global=n.get("is_global", False),
            created_at=n["created_at"]
        )
        
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create notification"
        )


@router.put("/{notification_id}", response_model=NotificationResponse, dependencies=[Depends(require_god_tier)])
async def update_notification(
    notification_id: str,
    notification: NotificationUpdate,
    user=Depends(get_current_user)
):
    """
    알림 수정 (관리자 전용)
    """
    try:
        supabase = get_supabase_client()
        
        # 업데이트할 필드 구성
        update_data = {}
        if notification.type:
            update_data["type"] = notification.type
        if notification.title:
            update_data["title"] = notification.title
        if notification.content:
            update_data["content"] = notification.content
        if notification.link is not None:
            update_data["link"] = notification.link
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        result = supabase.table("notifications").update(update_data) \
            .eq("id", notification_id) \
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        n = result.data[0]
        return NotificationResponse(
            id=str(n["id"]),
            type=n["type"],
            title=n["title"],
            content=n["content"],
            link=n.get("link"),
            is_read=n.get("is_read", False),
            is_global=n.get("is_global", False),
            created_at=n["created_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update notification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification"
        )


@router.delete("/{notification_id}", dependencies=[Depends(require_god_tier)])
async def delete_notification(
    notification_id: str,
    user=Depends(get_current_user)
):
    """
    알림 삭제 (관리자 전용)
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("notifications").delete() \
            .eq("id", notification_id) \
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        return {"success": True, "message": "Notification deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete notification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete notification"
        )
