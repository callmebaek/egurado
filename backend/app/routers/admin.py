"""
Admin Router
관리자 페이지 API 엔드포인트
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, Literal
from app.routers.auth import get_current_user
from app.dependencies.admin import require_god_tier
from app.models.admin import (
    GrantCreditsRequest,
    GrantCreditsResponse,
    UserInfoResponse,
    UserListResponse,
    AdminStatsResponse
)
from app.models.support_ticket import (
    TicketListResponse, 
    TicketResponse,
    TicketAnswer
)
from app.models.notification import NotificationResponse, NotificationCreate, NotificationUpdate
from app.core.database import get_supabase_client
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin"],
    dependencies=[Depends(require_god_tier)]
)


@router.get("/users", response_model=UserListResponse)
async def get_users(
    search: Optional[str] = None,
    tier_filter: Optional[Literal['free', 'basic', 'pro', 'god']] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user=Depends(get_current_user)
):
    """
    사용자 목록 조회 (관리자 전용)
    
    - 검색 (이메일, 이름)
    - Tier 필터링
    - 페이징
    """
    try:
        supabase = get_supabase_client()
        
        # RLS를 우회하여 모든 사용자 조회 (Service Role Key 사용)
        query = supabase.rpc("get_admin_users_list", {
            "search_query": search or "",
            "tier_filter_param": tier_filter or "",
            "page_num": page,
            "page_size_param": page_size
        }).execute()
        
        result_data = query.data or {}
        users_data = result_data.get("users", [])
        total_count = result_data.get("total_count", 0)
        
        # 응답 생성
        users = [
            UserInfoResponse(
                id=str(u["id"]),
                email=u["email"],
                display_name=u.get("display_name"),
                subscription_tier=u.get("tier", "free"),
                status=u.get("status", "inactive"),
                created_at=u["created_at"],
                last_login=u.get("last_sign_in_at"),
                monthly_credits=u.get("monthly_credits", 0),
                manual_credits=u.get("manual_credits", 0),
                monthly_used=u.get("monthly_used", 0),
                total_remaining=u.get("total_remaining", 0),
                total_credits_used=u.get("total_credits_used", 0)
            )
            for u in users_data
        ]
        
        return UserListResponse(
            users=users,
            total_count=total_count,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        logger.error(f"Failed to get users: {e}")
        
        # Stored procedure가 없으면 직접 쿼리
        # 이는 마이그레이션 이전의 대체 방법
        try:
            supabase = get_supabase_client()
            offset = (page - 1) * page_size
            
            # 간단한 사용자 목록 조회 (Service Role Key로 RLS 우회)
            query = supabase.table("profiles").select("*", count="exact")
            
            if search:
                query = query.or_(f"email.ilike.%{search}%,display_name.ilike.%{search}%")
            
            result = query.order("created_at", desc=True) \
                .range(offset, offset + page_size - 1) \
                .execute()
            
            users_data = result.data or []
            total_count = result.count or 0
            
            users = [
                UserInfoResponse(
                    id=str(u["id"]),
                    email=u["email"],
                    display_name=u.get("display_name"),
                    subscription_tier=u.get("subscription_tier", "free"),
                    status="active",
                    created_at=u["created_at"],
                    last_login=None,
                    monthly_credits=0,
                    manual_credits=0,
                    monthly_used=0,
                    total_remaining=0,
                    total_credits_used=0
                )
                for u in users_data
            ]
            
            return UserListResponse(
                users=users,
                total_count=total_count,
                page=page,
                page_size=page_size
            )
        except Exception as fallback_error:
            logger.error(f"Fallback query also failed: {fallback_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get users"
            )


@router.post("/users/{user_id}/grant-credits", response_model=GrantCreditsResponse)
async def grant_credits(
    user_id: str,
    request: GrantCreditsRequest,
    user=Depends(get_current_user)
):
    """
    사용자에게 크레딧 수동 지급 (관리자 전용)
    """
    try:
        supabase = get_supabase_client()
        
        # Stored procedure 호출
        result = supabase.rpc("admin_grant_credits", {
            "target_user_id": user_id,
            "credit_amount": request.credit_amount,
            "admin_note": request.admin_note
        }).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to grant credits"
            )
        
        result_data = result.data
        return GrantCreditsResponse(
            success=result_data["success"],
            user_id=result_data["user_id"],
            credits_granted=result_data["credits_granted"],
            new_manual_credits=result_data["new_manual_credits"],
            granted_by=result_data["granted_by"],
            timestamp=result_data["timestamp"]
        )
        
    except Exception as e:
        logger.error(f"Failed to grant credits: {e}")
        
        # 에러 메시지 파싱
        error_msg = str(e)
        if "Only God tier users can grant credits" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only God tier users can grant credits"
            )
        elif "Target user not found" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target user not found"
            )
        elif "Credit amount must be positive" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Credit amount must be positive"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to grant credits"
            )


@router.get("/notifications")
async def get_all_notifications(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(get_current_user)
):
    """
    모든 알림 조회 (관리자 전용)
    """
    try:
        supabase = get_supabase_client()
        
        # 모든 알림 조회 (Service Role Key로 RLS 우회)
        query = supabase.table("notifications").select("*", count="exact") \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1)
        
        result = query.execute()
        notifications_data = result.data or []
        
        # 응답 생성 (리스트 반환)
        notifications = [
            {
                "id": str(n["id"]),
                "type": n["type"],
                "title": n["title"],
                "content": n["content"],
                "link": n.get("link"),
                "created_at": n["created_at"]
            }
            for n in notifications_data
        ]
        
        return notifications
        
    except Exception as e:
        logger.error(f"Failed to get all notifications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get all notifications"
        )


@router.post("/notifications")
async def create_notification(
    notification: NotificationCreate,
    user=Depends(get_current_user)
):
    """
    알림 생성 (관리자 전용) - 전체 사용자에게 표시되는 전역 알림
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("notifications").insert({
            "type": notification.type,
            "title": notification.title,
            "content": notification.content,
            "link": notification.link,
            "is_global": True,  # 전역 알림 (모든 사용자에게 표시)
            "user_id": None  # NULL = 전역 알림
        }).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create notification"
            )
        
        return result.data[0]
        
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create notification: {str(e)}"
        )


@router.put("/notifications/{notification_id}")
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
        
        update_data = {}
        if notification.type is not None:
            update_data["type"] = notification.type
        if notification.title is not None:
            update_data["title"] = notification.title
        if notification.content is not None:
            update_data["content"] = notification.content
        if notification.link is not None:
            update_data["link"] = notification.link
        
        result = supabase.table("notifications").update(update_data) \
            .eq("id", notification_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update notification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification"
        )


@router.delete("/notifications/{notification_id}")
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
            .eq("id", notification_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        return {"message": "Notification deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete notification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete notification"
        )


@router.get("/tickets", response_model=TicketListResponse)
async def get_all_tickets(
    status_filter: Optional[Literal['pending', 'answered', 'closed']] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(get_current_user)
):
    """
    모든 문의 조회 (관리자 전용)
    """
    try:
        supabase = get_supabase_client()
        
        # 쿼리 시작: support_tickets 조회 (user_email은 별도 조회)
        query = supabase.table("support_tickets") \
            .select("*", count="exact")
        
        # 상태 필터
        if status_filter:
            query = query.eq("status", status_filter)
        
        # 정렬: pending 우선, 그 다음 최신순
        query = query.order("status").order("created_at", desc=True) \
            .range(offset, offset + limit - 1)
        
        result = query.execute()
        tickets_data = result.data or []
        total_count = result.count or 0
        
        # user_id별로 이메일 조회 (배치 처리)
        user_ids = list(set([t["user_id"] for t in tickets_data]))
        user_emails = {}
        
        if user_ids:
            profiles_result = supabase.table("profiles") \
                .select("id, email") \
                .in_("id", user_ids) \
                .execute()
            
            for profile in profiles_result.data or []:
                user_emails[profile["id"]] = profile["email"]
        
        # 응답 생성
        tickets = [
            TicketResponse(
                id=str(t["id"]),
                user_id=str(t["user_id"]),
                user_email=user_emails.get(t["user_id"], "Unknown"),
                type=t.get("type", "other"),
                title=t["title"],
                content=t["content"],
                status=t["status"],
                answer=t.get("answer"),
                answered_at=t.get("answered_at"),
                answered_by=str(t["answered_by"]) if t.get("answered_by") else None,
                created_at=t["created_at"],
                updated_at=t["updated_at"]
            )
            for t in tickets_data
        ]
        
        return TicketListResponse(
            tickets=tickets,
            total_count=total_count
        )
        
    except Exception as e:
        logger.error(f"Failed to get all tickets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get all tickets"
        )


@router.post("/tickets/{ticket_id}/answer")
async def answer_ticket(
    ticket_id: str,
    answer_request: TicketAnswer,
    user=Depends(get_current_user)
):
    """
    문의 답변 (관리자 전용)
    """
    try:
        supabase = get_supabase_client()
        
        # 티켓 업데이트
        result = supabase.table("support_tickets").update({
            "answer": answer_request.answer,  # 수정: admin_answer → answer
            "status": "answered",
            "answered_at": datetime.utcnow().isoformat(),
            "answered_by": user["id"],  # 수정: user.id → user["id"]
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", ticket_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found"
            )
        
        return {"message": "Answer sent successfully", "ticket": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to answer ticket: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to answer ticket"
        )


@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(user=Depends(get_current_user)):
    """
    관리자 통계 조회
    """
    try:
        supabase = get_supabase_client()
        
        # 전체 사용자 수
        users_result = supabase.table("profiles").select("id", count="exact").execute()
        total_users = users_result.count or 0
        
        # 활성 구독 수
        subs_result = supabase.table("subscriptions").select("id", count="exact") \
            .eq("status", "active") \
            .neq("tier", "free") \
            .execute()
        active_subscriptions = subs_result.count or 0
        
        # 대기 중인 티켓 수
        tickets_result = supabase.table("support_tickets").select("id", count="exact") \
            .eq("status", "pending") \
            .execute()
        pending_tickets = tickets_result.count or 0
        
        # 오늘 사용된 크레딧
        # RPC 함수가 필요하거나 직접 계산
        total_credits_used_today = 0  # TODO: Implement with RPC or query
        
        # 이번 주 신규 가입자
        # PostgreSQL date_trunc 사용
        new_users_this_week = 0  # TODO: Implement with RPC or query
        
        return AdminStatsResponse(
            total_users=total_users,
            active_subscriptions=active_subscriptions,
            pending_tickets=pending_tickets,
            total_credits_used_today=total_credits_used_today,
            new_users_this_week=new_users_this_week
        )
        
    except Exception as e:
        logger.error(f"Failed to get admin stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get admin stats"
        )
