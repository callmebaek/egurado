"""
Notification Models
알림 센터 Pydantic 모델
"""
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class NotificationBase(BaseModel):
    """알림 기본 모델"""
    type: Literal['announcement', 'update', 'marketing', 'system']
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    link: Optional[str] = None


class NotificationCreate(NotificationBase):
    """알림 생성 (관리자용)"""
    is_global: bool = True  # 전역 알림 (모든 사용자에게 표시)


class NotificationUpdate(BaseModel):
    """알림 수정 (관리자용)"""
    type: Optional[Literal['announcement', 'update', 'marketing', 'system']] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    link: Optional[str] = None


class NotificationResponse(NotificationBase):
    """알림 응답"""
    id: str
    is_read: bool
    is_global: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    """알림 목록 응답"""
    notifications: list[NotificationResponse]
    total_count: int
    unread_count: int


class NotificationUnreadCountResponse(BaseModel):
    """읽지 않은 알림 개수"""
    unread_count: int


class MarkAsReadResponse(BaseModel):
    """읽음 처리 응답"""
    success: bool
    message: str
