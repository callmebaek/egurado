"""
User Settings Models
사용자 설정 Pydantic 모델
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class NotificationSettingsBase(BaseModel):
    """알림 설정 기본 모델"""
    email_notifications: bool = True
    weekly_report: bool = True
    marketing_consent: bool = False


class NotificationSettingsUpdate(NotificationSettingsBase):
    """알림 설정 업데이트"""
    pass


class NotificationSettingsResponse(NotificationSettingsBase):
    """알림 설정 응답"""
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class LoginHistoryResponse(BaseModel):
    """로그인 기록 응답"""
    id: str
    user_id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    location: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PasswordChangeRequest(BaseModel):
    """비밀번호 변경 요청"""
    current_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)


class ProfileUpdateRequest(BaseModel):
    """프로필 업데이트 요청"""
    display_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
