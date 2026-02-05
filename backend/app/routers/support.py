"""
Support Router
고객 지원 티켓 API 엔드포인트
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, Literal
from app.routers.auth import get_current_user
from app.dependencies.admin import require_god_tier
from app.models.support_ticket import (
    TicketCreate,
    TicketAnswer,
    TicketResponse,
    TicketListResponse,
    TicketStatusUpdate
)
from app.core.database import get_supabase_client
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/support", tags=["Support"])


@router.get("/tickets", response_model=TicketListResponse)
async def get_tickets(
    status_filter: Optional[Literal['pending', 'answered', 'closed']] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(get_current_user)
):
    """
    문의 내역 조회
    
    - 사용자 본인의 티켓만 조회
    - 상태별 필터링 가능
    """
    try:
        supabase = get_supabase_client()
        user_id = user["id"]
        
        # 쿼리 시작
        query = supabase.table("support_tickets").select("*", count="exact") \
            .eq("user_id", user_id)
        
        # 상태 필터
        if status_filter:
            query = query.eq("status", status_filter)
        
        # 정렬 및 페이징
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        
        result = query.execute()
        tickets_data = result.data or []
        total_count = result.count or 0
        
        # 응답 생성
        tickets = [
            TicketResponse(
                id=str(t["id"]),
                user_id=str(t["user_id"]),
                type=t["type"],
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
        logger.error(f"Failed to get tickets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get tickets"
        )


@router.post("/tickets", response_model=TicketResponse)
async def create_ticket(
    ticket: TicketCreate,
    user=Depends(get_current_user)
):
    """
    문의 생성
    """
    try:
        supabase = get_supabase_client()
        user_id = user["id"]
        
        result = supabase.table("support_tickets").insert({
            "user_id": user_id,
            "type": ticket.type,
            "title": ticket.title,
            "content": ticket.content,
            "status": "pending"
        }).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create ticket"
            )
        
        t = result.data[0]
        return TicketResponse(
            id=str(t["id"]),
            user_id=str(t["user_id"]),
            type=t["type"],
            title=t["title"],
            content=t["content"],
            status=t["status"],
            answer=t.get("answer"),
            answered_at=t.get("answered_at"),
            answered_by=str(t["answered_by"]) if t.get("answered_by") else None,
            created_at=t["created_at"],
            updated_at=t["updated_at"]
        )
        
    except Exception as e:
        logger.error(f"Failed to create ticket: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create ticket"
        )


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: str,
    user=Depends(get_current_user)
):
    """
    문의 상세 조회
    """
    try:
        supabase = get_supabase_client()
        user_id = user["id"]
        
        result = supabase.table("support_tickets").select("*") \
            .eq("id", ticket_id) \
            .eq("user_id", user_id) \
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found"
            )
        
        t = result.data[0]
        return TicketResponse(
            id=str(t["id"]),
            user_id=str(t["user_id"]),
            type=t["type"],
            title=t["title"],
            content=t["content"],
            status=t["status"],
            answer=t.get("answer"),
            answered_at=t.get("answered_at"),
            answered_by=str(t["answered_by"]) if t.get("answered_by") else None,
            created_at=t["created_at"],
            updated_at=t["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get ticket: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get ticket"
        )


# ==================== ADMIN ENDPOINTS ====================

@router.put("/tickets/{ticket_id}/answer", response_model=TicketResponse, dependencies=[Depends(require_god_tier)])
async def answer_ticket(
    ticket_id: str,
    ticket_answer: TicketAnswer,
    user=Depends(get_current_user)
):
    """
    문의 답변 (관리자 전용)
    """
    try:
        supabase = get_supabase_client()
        user_id = user["id"]
        
        # 티켓 존재 확인
        check_result = supabase.table("support_tickets").select("id") \
            .eq("id", ticket_id) \
            .execute()
        
        if not check_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found"
            )
        
        # 답변 업데이트
        result = supabase.table("support_tickets").update({
            "answer": ticket_answer.answer,
            "answered_by": user_id,
            "status": "answered"
        }).eq("id", ticket_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to answer ticket"
            )
        
        t = result.data[0]
        return TicketResponse(
            id=str(t["id"]),
            user_id=str(t["user_id"]),
            type=t["type"],
            title=t["title"],
            content=t["content"],
            status=t["status"],
            answer=t.get("answer"),
            answered_at=t.get("answered_at"),
            answered_by=str(t["answered_by"]) if t.get("answered_by") else None,
            created_at=t["created_at"],
            updated_at=t["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to answer ticket: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to answer ticket"
        )


@router.put("/tickets/{ticket_id}/status", response_model=TicketResponse, dependencies=[Depends(require_god_tier)])
async def update_ticket_status(
    ticket_id: str,
    status_update: TicketStatusUpdate,
    user=Depends(get_current_user)
):
    """
    문의 상태 변경 (관리자 전용)
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("support_tickets").update({
            "status": status_update.status
        }).eq("id", ticket_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found"
            )
        
        t = result.data[0]
        return TicketResponse(
            id=str(t["id"]),
            user_id=str(t["user_id"]),
            type=t["type"],
            title=t["title"],
            content=t["content"],
            status=t["status"],
            answer=t.get("answer"),
            answered_at=t.get("answered_at"),
            answered_by=str(t["answered_by"]) if t.get("answered_by") else None,
            created_at=t["created_at"],
            updated_at=t["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update ticket status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update ticket status"
        )
