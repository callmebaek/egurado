"""
Pydantic schemas for API request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal, List
from datetime import datetime
from uuid import UUID


# ============================================
# Profile Schemas
# ============================================

class ProfileBase(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None
    subscription_tier: Literal['free', 'basic', 'basic_plus', 'pro', 'custom', 'god'] = 'free'


class ProfileCreate(ProfileBase):
    id: UUID
    auth_provider: Literal['email', 'kakao', 'naver', 'phone'] = 'email'


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    subscription_tier: Optional[Literal['free', 'basic', 'basic_plus', 'pro', 'custom', 'god']] = None
    phone_number: Optional[str] = None
    profile_image_url: Optional[str] = None


class Profile(ProfileBase):
    id: UUID
    auth_provider: str
    user_position: Optional[str] = None
    marketing_experience: Optional[str] = None
    agency_experience: Optional[str] = None
    onboarding_completed: bool
    phone_number: Optional[str] = None
    profile_image_url: Optional[str] = None
    total_credits: Optional[int] = 1000
    used_credits: Optional[int] = 0
    max_stores: Optional[int] = 1
    max_keywords: Optional[int] = 3
    max_trackers: Optional[int] = 1
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Auth Schemas
# ============================================

class UserSignupRequest(BaseModel):
    """User signup request"""
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    display_name: Optional[str] = None


class UserLoginRequest(BaseModel):
    """User login request"""
    email: EmailStr
    password: str


class OnboardingRequest(BaseModel):
    """Onboarding information"""
    user_position: Literal['advertiser', 'agency']
    marketing_experience: Literal['beginner', 'intermediate', 'advanced']
    agency_experience: Optional[Literal['past_used', 'currently_using', 'considering', 'doing_alone']] = None


class KakaoLoginRequest(BaseModel):
    """Kakao login request"""
    code: str


class NaverLoginRequest(BaseModel):
    """Naver login request"""
    code: str
    state: str


class AuthResponse(BaseModel):
    """Authentication response"""
    access_token: str
    token_type: str = "bearer"
    user: Profile
    onboarding_required: bool = False


class SignupResponse(BaseModel):
    """Signup response"""
    message: str
    email: str
    requires_email_confirmation: bool = True


class ForgotPasswordRequest(BaseModel):
    """Forgot password request"""
    email: str


class ResetPasswordRequest(BaseModel):
    """Reset password request"""
    access_token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    """Change password request (authenticated user)"""
    current_password: str
    new_password: str = Field(min_length=8, max_length=100)


class DeleteAccountRequest(BaseModel):
    """Delete account request"""
    password: str
    confirmation: str = Field(min_length=1)


# ============================================
# OTP (Phone Auth) Schemas
# ============================================

class OTPSendRequest(BaseModel):
    """OTP 인증코드 발송 요청"""
    phone_number: str = Field(..., description="전화번호 (010-1234-5678 또는 01012345678)")


class OTPVerifyRequest(BaseModel):
    """OTP 인증코드 검증 요청"""
    phone_number: str = Field(..., description="전화번호")
    code: str = Field(..., min_length=6, max_length=6, description="6자리 인증코드")


class OTPSendResponse(BaseModel):
    """OTP 발송 응답"""
    success: bool
    message: str
    expires_in: Optional[int] = None  # 초 단위 만료 시간


class OTPVerifyResponse(BaseModel):
    """OTP 검증 응답"""
    success: bool
    message: str
    access_token: Optional[str] = None
    user: Optional[Profile] = None
    is_new_user: Optional[bool] = None
    onboarding_required: Optional[bool] = None


# ============================================
# Store Schemas
# ============================================

class StoreBase(BaseModel):
    platform: Literal['naver', 'google']
    place_id: str
    store_name: str


class StoreCreate(StoreBase):
    user_id: UUID
    credentials: Optional[dict] = None


class StoreUpdate(BaseModel):
    store_name: Optional[str] = None
    credentials: Optional[dict] = None
    status: Optional[Literal['active', 'disconnected', 'error']] = None
    last_synced_at: Optional[datetime] = None


class Store(StoreBase):
    id: UUID
    user_id: UUID
    status: str
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Review Schemas
# ============================================

class ReviewBase(BaseModel):
    store_id: UUID
    platform: Literal['naver', 'google']
    external_review_id: str
    review_text: Optional[str] = None
    rating: int = Field(ge=1, le=5)
    author_name: Optional[str] = None


class ReviewCreate(ReviewBase):
    author_profile_url: Optional[str] = None
    visit_date: Optional[datetime] = None
    posted_date: Optional[datetime] = None
    sentiment: Optional[Literal['positive', 'neutral', 'negative']] = None


class ReviewUpdate(BaseModel):
    reply_text: Optional[str] = None
    reply_status: Optional[Literal['none', 'ai_generated', 'posted']] = None
    ai_generated_reply: Optional[str] = None
    sentiment: Optional[Literal['positive', 'neutral', 'negative']] = None


class Review(ReviewBase):
    id: UUID
    author_profile_url: Optional[str] = None
    visit_date: Optional[datetime] = None
    posted_date: Optional[datetime] = None
    reply_text: Optional[str] = None
    reply_status: str
    ai_generated_reply: Optional[str] = None
    sentiment: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Keyword Schemas
# ============================================

class KeywordBase(BaseModel):
    store_id: UUID
    keyword: str


class KeywordCreate(KeywordBase):
    pass


class KeywordUpdate(BaseModel):
    current_rank: Optional[int] = None
    previous_rank: Optional[int] = None
    last_checked_at: Optional[datetime] = None


class Keyword(KeywordBase):
    id: UUID
    current_rank: Optional[int] = None
    previous_rank: Optional[int] = None
    last_checked_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Rank History Schemas
# ============================================

class RankHistoryCreate(BaseModel):
    keyword_id: UUID
    rank: Optional[int] = None


class RankHistory(RankHistoryCreate):
    id: UUID
    checked_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# API Request/Response Schemas
# ============================================

class NaverConnectionRequest(BaseModel):
    """Naver Place connection request"""
    store_id: UUID
    cookies: list[dict]


class AIReplyGenerateRequest(BaseModel):
    """AI reply generation request"""
    review_id: UUID


class AIReplyResponse(BaseModel):
    """AI reply generation response"""
    review_id: UUID
    ai_generated_reply: str
    sentiment: str


class RankCheckRequest(BaseModel):
    """Rank check request"""
    store_id: UUID
    keyword: str


class RankCheckResponse(BaseModel):
    """Rank check response"""
    keyword: str
    rank: int
    previous_rank: Optional[int] = None
    checked_at: datetime


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    message: str
    database_connected: bool = False


# ============================================
# Metric Tracker Schemas
# ============================================

class MetricTrackerBase(BaseModel):
    """Metric tracker base schema"""
    store_id: UUID
    keyword_id: Optional[UUID] = None
    keyword: Optional[str] = None
    update_frequency: Literal['daily_once', 'daily_twice', 'daily_thrice'] = 'daily_once'
    update_times: List[int] = Field(default=[16])  # Default: 4 PM
    notification_enabled: bool = False
    notification_type: Optional[Literal['kakao', 'sms', 'email']] = None
    notification_consent: bool = False
    notification_phone: Optional[str] = None
    notification_email: Optional[str] = None


class MetricTrackerCreateRequest(MetricTrackerBase):
    """Metric tracker creation request (API) - user_id is auto-set"""
    pass


class MetricTrackerCreate(MetricTrackerBase):
    """Metric tracker creation (internal)"""
    user_id: UUID


class MetricTrackerUpdate(BaseModel):
    """Metric tracker update request"""
    update_frequency: Optional[Literal['daily_once', 'daily_twice', 'daily_thrice']] = None
    update_times: Optional[List[int]] = None
    notification_enabled: Optional[bool] = None
    notification_type: Optional[Literal['kakao', 'sms', 'email']] = None
    notification_consent: Optional[bool] = None
    notification_phone: Optional[str] = None
    notification_email: Optional[str] = None
    is_active: Optional[bool] = None


class MetricTracker(MetricTrackerBase):
    """Metric tracker response"""
    id: UUID
    user_id: UUID
    is_active: bool
    last_collected_at: Optional[datetime] = None
    next_collection_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class MetricTrackerWithDetails(MetricTracker):
    """Metric tracker with detailed information"""
    store_name: str
    keyword: str
    platform: str
    latest_rank: Optional[int] = None
    rank_change: Optional[int] = None
    visitor_review_count: Optional[int] = None
    blog_review_count: Optional[int] = None
    visitor_review_change: Optional[int] = None
    blog_review_change: Optional[int] = None


class DailyMetricBase(BaseModel):
    """Daily metric base schema"""
    tracker_id: UUID
    keyword_id: UUID
    store_id: UUID
    collection_date: datetime
    rank: Optional[int] = None
    visitor_review_count: int = 0
    blog_review_count: int = 0
    rank_change: Optional[int] = None
    previous_rank: Optional[int] = None


class DailyMetricCreate(DailyMetricBase):
    """Daily metric creation request"""
    pass


class DailyMetric(DailyMetricBase):
    """Daily metric response"""
    id: UUID
    collected_at: datetime
    
    class Config:
        from_attributes = True


class DailyMetricWithKeyword(DailyMetric):
    """Daily metric with keyword information"""
    keyword: str
    store_name: str


class MetricTrackerListResponse(BaseModel):
    """Metric tracker list response"""
    trackers: list[MetricTrackerWithDetails]
    total_count: int


class DailyMetricsListResponse(BaseModel):
    """Daily metrics list response"""
    metrics: list[DailyMetricWithKeyword]
    total_count: int
