"""
Admin Models
관리자 기능 Pydantic 모델
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class GrantCreditsRequest(BaseModel):
    """크레딧 지급 요청"""
    credit_amount: int = Field(..., gt=0, le=1000000)
    admin_note: Optional[str] = Field(None, max_length=500)


class GrantCreditsResponse(BaseModel):
    """크레딧 지급 응답"""
    success: bool
    user_id: str
    credits_granted: int
    new_manual_credits: int
    granted_by: str
    timestamp: datetime


class UserInfoResponse(BaseModel):
    """사용자 정보 응답 (관리자용)"""
    id: str
    email: str
    display_name: Optional[str] = None
    subscription_tier: str
    status: str
    created_at: datetime
    last_login: Optional[datetime] = None
    total_credits_used: int = 0
    monthly_credits: int = 0
    manual_credits: int = 0
    monthly_used: int = 0
    total_remaining: int = 0
    
    # 구독/결제 관련 필드
    subscription_status: Optional[str] = None  # active, cancelled, expired
    next_billing_date: Optional[datetime] = None  # 다음 결제 예정일
    service_end_date: Optional[datetime] = None  # 서비스 종료일 (구독 취소 시)
    cancelled_at: Optional[datetime] = None  # 구독 취소 시각
    auto_renewal: bool = True  # 자동 갱신 여부
    
    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    """사용자 목록 응답"""
    users: list[UserInfoResponse]
    total_count: int
    page: int
    page_size: int


class AdminStatsResponse(BaseModel):
    """관리자 통계"""
    total_users: int
    active_subscriptions: int
    pending_tickets: int
    total_credits_used_today: int
    new_users_this_week: int
