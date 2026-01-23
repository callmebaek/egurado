"""
Pydantic 스키마 모델
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# ==================== Metric Tracker ====================

class MetricTrackerCreateRequest(BaseModel):
    """주요지표 추적 생성 요청"""
    store_id: str = Field(..., description="매장 ID")
    keyword: str = Field(..., description="추적할 키워드")
    update_frequency: str = Field(default='daily_once', description="업데이트 주기 (daily_once, daily_twice, daily_thrice)")
    update_times: Optional[List[int]] = Field(default=None, description="수집 시간 배열 (0-23시)")
    notification_enabled: bool = Field(default=False, description="알림 활성화 여부")
    notification_type: Optional[str] = Field(default=None, description="알림 타입 (kakao, sms, email)")

    class Config:
        from_attributes = True


class MetricTrackerCreate(BaseModel):
    """주요지표 추적 생성 (내부 사용)"""
    user_id: str
    store_id: str
    keyword_id: str
    update_frequency: str = 'daily_once'
    update_times: Optional[List[int]] = None
    notification_enabled: bool = False
    notification_type: Optional[str] = None

    class Config:
        from_attributes = True


class MetricTrackerUpdate(BaseModel):
    """주요지표 추적 수정"""
    update_frequency: Optional[str] = None
    update_times: Optional[List[int]] = None
    notification_enabled: Optional[bool] = None
    notification_type: Optional[str] = None
    is_active: Optional[bool] = None

    class Config:
        from_attributes = True


class MetricTracker(BaseModel):
    """주요지표 추적 응답"""
    id: str
    user_id: str
    store_id: str
    keyword_id: str
    store_name: str
    keyword: str
    platform: str
    update_frequency: str
    update_times: List[int]
    is_active: bool
    last_collected_at: Optional[datetime] = None
    created_at: datetime
    notification_enabled: bool
    notification_type: Optional[str] = None

    class Config:
        from_attributes = True


class MetricTrackerWithDetails(MetricTracker):
    """주요지표 추적 상세 (매장/키워드 정보 포함)"""
    pass


class MetricTrackerListResponse(BaseModel):
    """주요지표 추적 목록 응답"""
    trackers: List[MetricTracker]
    total_count: int


# ==================== Daily Metrics ====================

class DailyMetric(BaseModel):
    """일별 지표"""
    id: str
    tracker_id: str
    keyword_id: str
    store_id: str
    collection_date: str  # date
    rank: Optional[int] = None
    visitor_review_count: int = 0
    blog_review_count: int = 0
    rank_change: Optional[int] = None
    previous_rank: Optional[int] = None
    collected_at: datetime

    class Config:
        from_attributes = True


class DailyMetricWithKeyword(DailyMetric):
    """키워드 정보 포함 일별 지표"""
    keyword: str
    store_name: Optional[str] = None


class DailyMetricsListResponse(BaseModel):
    """일별 지표 목록 응답"""
    metrics: List[DailyMetricWithKeyword]
    total_count: int
