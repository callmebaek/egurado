"""
주요지표 추적 API 라우터
Metric Tracker API Router
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from uuid import UUID
from datetime import date
import logging

from app.models.schemas import (
    MetricTrackerCreate,
    MetricTrackerCreateRequest,
    MetricTrackerUpdate,
    MetricTracker,
    MetricTrackerWithDetails,
    MetricTrackerListResponse,
    DailyMetric,
    DailyMetricWithKeyword,
    DailyMetricsListResponse,
)
from app.services.metric_tracker_service import metric_tracker_service
from app.routers.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/trackers", response_model=MetricTracker, status_code=status.HTTP_201_CREATED)
async def create_tracker(
    data: MetricTrackerCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    새로운 주요지표 추적 설정 생성
    
    - **store_id**: 추적할 매장 ID
    - **keyword_id**: 추적할 키워드 ID
    - **update_frequency**: 업데이트 주기 (daily_once, daily_twice, daily_thrice)
    - **notification_enabled**: 알림 활성화 여부
    - **notification_type**: 알림 타입 (kakao, sms, email)
    
    ⭐ 생성 즉시 첫 번째 지표를 수집합니다.
    """
    try:
        # mode='json'으로 UUID를 문자열로 자동 변환
        tracker_data = data.model_dump(mode='json')
        tracker_data["user_id"] = current_user["id"]
        
        result = metric_tracker_service.create_tracker(tracker_data)
        
        # ⭐ 생성 즉시 첫 번째 지표 수집
        try:
            logger.info(f"[Tracker Create] 첫 번째 지표 수집 시작: {result['id']}")
            await metric_tracker_service.collect_metrics(result["id"])
            logger.info(f"[Tracker Create] 첫 번째 지표 수집 완료: {result['id']}")
        except Exception as collect_error:
            # 지표 수집 실패해도 tracker는 생성됨
            logger.error(f"[Tracker Create] 첫 번째 지표 수집 실패: {str(collect_error)}")
        
        return result
    except Exception as e:
        logger.error(f"Error creating tracker: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/trackers", response_model=MetricTrackerListResponse)
async def get_trackers(
    current_user: dict = Depends(get_current_user)
):
    """
    사용자의 모든 주요지표 추적 설정 조회
    
    - 매장 및 키워드 정보 포함
    - 생성일 기준 내림차순 정렬
    """
    try:
        trackers = metric_tracker_service.get_trackers_by_user(current_user["id"])
        return {
            "trackers": trackers,
            "total_count": len(trackers)
        }
    except Exception as e:
        logger.error(f"Error getting trackers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="추적 설정 조회 중 오류가 발생했습니다"
        )


@router.get("/trackers/{tracker_id}", response_model=MetricTracker)
async def get_tracker(
    tracker_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """특정 주요지표 추적 설정 조회"""
    try:
        tracker = metric_tracker_service.get_tracker(str(tracker_id), current_user["id"])
        
        if not tracker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="추적 설정을 찾을 수 없습니다"
            )
        
        return tracker
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tracker: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="추적 설정 조회 중 오류가 발생했습니다"
        )


@router.patch("/trackers/{tracker_id}", response_model=MetricTracker)
async def update_tracker(
    tracker_id: UUID,
    data: MetricTrackerUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    주요지표 추적 설정 업데이트
    
    - 업데이트 주기, 알림 설정 등 수정 가능
    - is_active: false로 설정하면 추적 일시정지
    """
    try:
        update_data = data.model_dump(exclude_unset=True)
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="업데이트할 데이터가 없습니다"
            )
        
        result = metric_tracker_service.update_tracker(
            str(tracker_id), 
            current_user["id"], 
            update_data
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating tracker: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/trackers/{tracker_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tracker(
    tracker_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    주요지표 추적 설정 삭제
    
    - 추적 설정 및 관련 일별 지표 데이터 모두 삭제됨
    """
    try:
        success = metric_tracker_service.delete_tracker(str(tracker_id), current_user["id"])
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="추적 설정을 찾을 수 없습니다"
            )
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting tracker: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="추적 설정 삭제 중 오류가 발생했습니다"
        )


@router.post("/trackers/{tracker_id}/collect", response_model=DailyMetric)
async def collect_metrics_now(
    tracker_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    즉시 지표 수집 (수동 트리거)
    
    - 스케줄과 관계없이 즉시 순위, 리뷰수 등을 수집
    - 테스트 및 데모용으로 유용
    """
    try:
        # 권한 확인
        tracker = metric_tracker_service.get_tracker(str(tracker_id), current_user["id"])
        if not tracker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="추적 설정을 찾을 수 없습니다"
            )
        
        # 지표 수집
        result = await metric_tracker_service.collect_metrics(str(tracker_id))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error collecting metrics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"지표 수집 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/trackers/{tracker_id}/metrics", response_model=DailyMetricsListResponse)
async def get_tracker_metrics(
    tracker_id: UUID,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    특정 추적 설정의 일별 지표 조회
    
    - **start_date**: 시작 날짜 (YYYY-MM-DD 형식, 선택사항)
    - **end_date**: 종료 날짜 (YYYY-MM-DD 형식, 선택사항)
    - 기본값: 최근 30일
    """
    try:
        # 권한 확인
        tracker = metric_tracker_service.get_tracker(str(tracker_id), current_user["id"])
        if not tracker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="추적 설정을 찾을 수 없습니다"
            )
        
        # 날짜 파싱
        start = date.fromisoformat(start_date) if start_date else None
        end = date.fromisoformat(end_date) if end_date else None
        
        # 지표 조회
        metrics = metric_tracker_service.get_daily_metrics(
            str(tracker_id), 
            start_date=start, 
            end_date=end
        )
        
        # 데이터 평탄화 (nested 구조를 flat하게 변환)
        flattened_metrics = []
        for metric in metrics:
            flat_metric = {**metric}
            # keywords 객체를 keyword 필드로 변환
            if 'keywords' in metric and metric['keywords']:
                flat_metric['keyword'] = metric['keywords']['keyword']
                del flat_metric['keywords']
            # stores 객체를 store_name 필드로 변환
            if 'stores' in metric and metric['stores']:
                flat_metric['store_name'] = metric['stores']['store_name']
                del flat_metric['stores']
            flattened_metrics.append(flat_metric)
        
        return {
            "metrics": flattened_metrics,
            "total_count": len(flattened_metrics)
        }
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="잘못된 날짜 형식입니다 (YYYY-MM-DD 형식을 사용하세요)"
        )
    except Exception as e:
        logger.error(f"Error getting tracker metrics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="지표 조회 중 오류가 발생했습니다"
        )
