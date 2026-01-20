"""
Pydantic 스키마 모델
API 요청/응답 데이터 검증
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID


# ============================================
# Profile Schemas
# ============================================

class ProfileBase(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None
    subscription_tier: Literal['free', 'basic', 'pro', 'god'] = 'free'


class ProfileCreate(ProfileBase):
    id: UUID
    auth_provider: Literal['email', 'kakao', 'naver'] = 'email'


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    subscription_tier: Optional[Literal['free', 'basic', 'pro', 'god']] = None
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
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# ============================================
# Auth Schemas (회원가입/로그인)
# ============================================

class UserSignupRequest(BaseModel):
    """이메일 회원가입 요청"""
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    display_name: Optional[str] = None


class UserLoginRequest(BaseModel):
    """이메일 로그인 요청"""
    email: EmailStr
    password: str


class OnboardingRequest(BaseModel):
    """온보딩 정보 제출"""
    user_position: Literal['advertiser', 'agency']
    marketing_experience: Literal['beginner', 'intermediate', 'advanced']
    agency_experience: Optional[Literal['past_used', 'currently_using', 'considering', 'doing_alone']] = None


class KakaoLoginRequest(BaseModel):
    """카카오 로그인 요청"""
    code: str  # 카카오 인증 코드


class NaverLoginRequest(BaseModel):
    """네이버 로그인 요청"""
    code: str  # 네이버 인증 코드
    state: str  # 네이버 state 파라미터


class AuthResponse(BaseModel):
    """인증 응답"""
    access_token: str
    token_type: str = "bearer"
    user: Profile
    onboarding_required: bool = False


class SignupResponse(BaseModel):
    """회원가입 응답 (이메일 인증 필요)"""
    message: str
    email: str
    requires_email_confirmation: bool = True


class ForgotPasswordRequest(BaseModel):
    """비밀번호 재설정 요청"""
    email: str


class ResetPasswordRequest(BaseModel):
    """비밀번호 재설정"""
    access_token: str
    new_password: str


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
    """네이버 플레이스 연결 요청"""
    store_id: UUID
    cookies: list[dict]


class AIReplyGenerateRequest(BaseModel):
    """AI 답글 생성 요청"""
    review_id: UUID


class AIReplyResponse(BaseModel):
    """AI 답글 생성 응답"""
    review_id: UUID
    ai_generated_reply: str
    sentiment: str


class RankCheckRequest(BaseModel):
    """키워드 순위 조회 요청"""
    store_id: UUID
    keyword: str


class RankCheckResponse(BaseModel):
    """키워드 순위 조회 응답"""
    keyword: str
    rank: int
    previous_rank: Optional[int] = None
    checked_at: datetime


class HealthCheckResponse(BaseModel):
    """헬스체크 응답"""
    status: str
    message: str
    database_connected: bool = False


# ============================================
# Metric Tracker Schemas (주요지표 추적)
# ============================================

class MetricTrackerBase(BaseModel):
    """주요지표 추적 기본 스키마"""
    store_id: UUID
    keyword_id: UUID
    update_frequency: Literal['daily_once', 'daily_twice', 'daily_thrice'] = 'daily_once'
    update_times: list[int] = Field(default=[16])  # 기본값: 오후 4시
    notification_enabled: bool = False
    notification_type: Optional[Literal['kakao', 'sms', 'email']] = None
    notification_consent: bool = False
    notification_phone: Optional[str] = None
    notification_email: Optional[str] = None


class MetricTrackerCreate(MetricTrackerBase):
    """주요지표 추적 생성 요청"""
    user_id: UUID


class MetricTrackerUpdate(BaseModel):
    """주요지표 추적 업데이트 요청"""
    update_frequency: Optional[Literal['daily_once', 'daily_twice', 'daily_thrice']] = None
    update_times: Optional[list[int]] = None
    notification_enabled: Optional[bool] = None
    notification_type: Optional[Literal['kakao', 'sms', 'email']] = None
    notification_consent: Optional[bool] = None
    notification_phone: Optional[str] = None
    notification_email: Optional[str] = None
    is_active: Optional[bool] = None


class MetricTracker(MetricTrackerBase):
    """주요지표 추적 응답"""
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
    """주요지표 추적 (상세 정보 포함)"""
    store_name: str
    keyword: str
    platform: str


class DailyMetricBase(BaseModel):
    """일별 지표 기본 스키마"""
    tracker_id: UUID
    keyword_id: UUID
    store_id: UUID
    collection_date: datetime  # 날짜만
    rank: Optional[int] = None
    visitor_review_count: int = 0
    blog_review_count: int = 0
    rank_change: Optional[int] = None
    previous_rank: Optional[int] = None


class DailyMetricCreate(DailyMetricBase):
    """일별 지표 생성 요청"""
    pass


class DailyMetric(DailyMetricBase):
    """일별 지표 응답"""
    id: UUID
    collected_at: datetime
    
    class Config:
        from_attributes = True


class DailyMetricWithKeyword(DailyMetric):
    """일별 지표 (키워드 정보 포함)"""
    keyword: str
    store_name: str


class MetricTrackerListResponse(BaseModel):
    """주요지표 추적 목록 응답"""
    trackers: list[MetricTrackerWithDetails]
    total_count: int


class DailyMetricsListResponse(BaseModel):
    """일별 지표 목록 응답"""
    metrics: list[DailyMetricWithKeyword]
    total_count: int

