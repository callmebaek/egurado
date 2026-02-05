"""
Support Ticket Models
고객 지원 티켓 Pydantic 모델
"""
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class TicketBase(BaseModel):
    """티켓 기본 모델"""
    type: Literal['feature', 'bug', 'payment', 'other']
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)


class TicketCreate(TicketBase):
    """티켓 생성"""
    pass


class TicketAnswer(BaseModel):
    """티켓 답변 (관리자용)"""
    answer: str = Field(..., min_length=1)


class TicketResponse(TicketBase):
    """티켓 응답"""
    id: str
    user_id: str
    user_email: Optional[str] = None  # 관리자용: 문의자 이메일
    status: Literal['pending', 'answered', 'closed']
    answer: Optional[str] = None
    answered_at: Optional[datetime] = None
    answered_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class TicketListResponse(BaseModel):
    """티켓 목록 응답"""
    tickets: list[TicketResponse]
    total_count: int


class TicketStatusUpdate(BaseModel):
    """티켓 상태 업데이트"""
    status: Literal['pending', 'answered', 'closed']
