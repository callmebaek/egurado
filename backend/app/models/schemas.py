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
    subscription_tier: Literal['free', 'basic', 'pro'] = 'free'


class ProfileCreate(ProfileBase):
    id: UUID


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    subscription_tier: Optional[Literal['free', 'basic', 'pro']] = None


class Profile(ProfileBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


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


