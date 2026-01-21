"""
주요지표 추적 서비스
Metric Tracker Service - 매장 x 키워드 조합의 일별 지표 자동 추적
"""
import logging
from typing import Dict, List, Optional, Any
from uuid import UUID
from datetime import datetime, date, time, timedelta
import pytz
from app.core.database import get_supabase_client
from app.services.naver_rank_api_unofficial import rank_service_api_unofficial

logger = logging.getLogger(__name__)

# Tier별 추적 제한
TRACKER_LIMITS = {
    "free": 1,
    "basic": 3,
    "pro": 10,
    "god": 9999  # God tier: 무제한
}

# 업데이트 주기별 기본 시간 설정
DEFAULT_UPDATE_TIMES = {
    "daily_once": [16],  # 오후 4시
    "daily_twice": [6, 16],  # 오전 6시, 오후 4시
    "daily_thrice": [6, 12, 18],  # 오전 6시, 정오, 오후 6시
}


class MetricTrackerService:
    """주요지표 추적 서비스"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.timezone = pytz.timezone('Asia/Seoul')
    
    def check_tracker_limit(self, user_id: str) -> tuple[bool, int, int]:
        """
        사용자의 추적 설정 제한을 확인합니다.
        
        Returns:
            tuple: (제한 초과 여부, 현재 추적 수, 최대 허용 수)
        """
        try:
            # 사용자의 구독 tier 확인
            user_result = self.supabase.table("profiles").select("subscription_tier").eq("id", user_id).single().execute()
            
            if not user_result.data:
                logger.warning(f"User not found: {user_id}")
                return False, 0, TRACKER_LIMITS["free"]
            
            subscription_tier = user_result.data.get("subscription_tier", "free").lower()
            max_trackers = TRACKER_LIMITS.get(subscription_tier, TRACKER_LIMITS["free"])
            
            # 현재 추적 중인 항목 수 확인
            trackers_result = self.supabase.table("metric_trackers").select("id", count="exact").eq("user_id", user_id).eq("is_active", True).execute()
            current_trackers = trackers_result.count if trackers_result.count else 0
            
            logger.info(
                f"[Tracker Limit Check] User: {user_id}, Tier: {subscription_tier}, "
                f"Current: {current_trackers}, Max: {max_trackers}"
            )
            
            return current_trackers >= max_trackers, current_trackers, max_trackers
            
        except Exception as e:
            logger.error(f"Error checking tracker limit: {str(e)}")
            return False, 0, TRACKER_LIMITS["free"]
    
    def create_tracker(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        새로운 추적 설정 생성
        
        Args:
            data: 추적 설정 데이터 (user_id, store_id, keyword_id, update_frequency 등)
            
        Returns:
            생성된 추적 설정 데이터
        """
        try:
            # UUID를 문자열로 변환
            user_id = str(data.get("user_id"))
            data["user_id"] = user_id
            store_id = str(data.get("store_id"))
            keyword_id = str(data.get("keyword_id"))
            data["store_id"] = store_id
            data["keyword_id"] = keyword_id
            
            # 중복 체크 (같은 매장 x 키워드 조합이 이미 존재하는지)
            existing = self.supabase.table("metric_trackers") \
                .select("id") \
                .eq("user_id", user_id) \
                .eq("store_id", store_id) \
                .eq("keyword_id", keyword_id) \
                .execute()
            
            if existing.data and len(existing.data) > 0:
                raise Exception(
                    "이미 동일한 매장과 키워드 조합의 추적 설정이 존재합니다. "
                    "기존 추적 설정을 삭제한 후 다시 시도해주세요."
                )
            
            # 제한 확인
            is_limit_exceeded, current_count, max_count = self.check_tracker_limit(user_id)
            
            if is_limit_exceeded:
                raise Exception(
                    f"추적 설정 제한에 도달했습니다. (현재: {current_count}/{max_count}개). "
                    "더 많은 추적을 설정하려면 플랜을 업그레이드하세요."
                )
            
            # 기본 업데이트 시간 설정
            update_frequency = data.get("update_frequency", "daily_once")
            if not data.get("update_times"):
                data["update_times"] = DEFAULT_UPDATE_TIMES.get(update_frequency, [16])
            
            # 다음 수집 시간 계산
            next_collection_at = self._calculate_next_collection_time(
                data.get("update_times", [16])
            )
            data["next_collection_at"] = next_collection_at.isoformat()
            
            # 데이터베이스에 저장
            result = self.supabase.table("metric_trackers").insert(data).execute()
            
            if not result.data:
                raise Exception("추적 설정 생성에 실패했습니다")
            
            logger.info(f"[Tracker Created] ID: {result.data[0]['id']}, User: {user_id}")
            return result.data[0]
            
        except Exception as e:
            logger.error(f"Error creating tracker: {str(e)}")
            raise
    
    def get_tracker(self, tracker_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """특정 추적 설정 조회"""
        try:
            result = self.supabase.table("metric_trackers").select("*").eq("id", tracker_id).eq("user_id", user_id).single().execute()
            return result.data if result.data else None
        except Exception as e:
            logger.error(f"Error getting tracker: {str(e)}")
            return None
    
    def get_trackers_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        """사용자의 모든 추적 설정 조회 (상세 정보 포함)"""
        try:
            # metric_trackers + stores + keywords 조인
            result = self.supabase.table("metric_trackers") \
                .select("*, stores(store_name, platform), keywords(keyword)") \
                .eq("user_id", user_id) \
                .order("created_at", desc=True) \
                .execute()
            
            trackers = []
            for tracker in result.data:
                # 조인된 데이터 평탄화
                trackers.append({
                    **tracker,
                    "store_name": tracker.get("stores", {}).get("store_name", ""),
                    "platform": tracker.get("stores", {}).get("platform", ""),
                    "keyword": tracker.get("keywords", {}).get("keyword", ""),
                })
            
            return trackers
        except Exception as e:
            logger.error(f"Error getting trackers by user: {str(e)}")
            return []
    
    def update_tracker(self, tracker_id: str, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """추적 설정 업데이트"""
        try:
            # 업데이트 시간이 변경된 경우 다음 수집 시간 재계산
            if "update_times" in data:
                next_collection_at = self._calculate_next_collection_time(data["update_times"])
                data["next_collection_at"] = next_collection_at.isoformat()
            
            result = self.supabase.table("metric_trackers") \
                .update(data) \
                .eq("id", tracker_id) \
                .eq("user_id", user_id) \
                .execute()
            
            if not result.data:
                raise Exception("추적 설정 업데이트에 실패했습니다")
            
            logger.info(f"[Tracker Updated] ID: {tracker_id}")
            return result.data[0]
        except Exception as e:
            logger.error(f"Error updating tracker: {str(e)}")
            raise
    
    def delete_tracker(self, tracker_id: str, user_id: str) -> bool:
        """추적 설정 삭제"""
        try:
            result = self.supabase.table("metric_trackers") \
                .delete() \
                .eq("id", tracker_id) \
                .eq("user_id", user_id) \
                .execute()
            
            logger.info(f"[Tracker Deleted] ID: {tracker_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting tracker: {str(e)}")
            return False
    
    async def collect_metrics(self, tracker_id: str) -> Dict[str, Any]:
        """
        특정 추적 설정에 대한 지표 수집
        
        Args:
            tracker_id: 추적 설정 ID
            
        Returns:
            수집된 지표 데이터
        """
        try:
            # 추적 설정 조회
            tracker_result = self.supabase.table("metric_trackers") \
                .select("*, stores(place_id, store_name), keywords(id, keyword)") \
                .eq("id", tracker_id) \
                .single() \
                .execute()
            
            if not tracker_result.data:
                raise Exception(f"추적 설정을 찾을 수 없습니다: {tracker_id}")
            
            tracker = tracker_result.data
            store_id = tracker["store_id"]
            keyword_id = tracker["keyword_id"]
            place_id = tracker["stores"]["place_id"]
            keyword = tracker["keywords"]["keyword"]
            
            logger.info(f"[Collecting Metrics] Tracker: {tracker_id}, Keyword: {keyword}, Place ID: {place_id}")
            
            # 순위 및 리뷰수 조회 (비공식 API 사용)
            rank_result = await rank_service_api_unofficial.check_rank(
                keyword=keyword,
                target_place_id=place_id,
                max_results=300
            )
            
            # 오늘 날짜 (서울 시간대)
            today = datetime.now(self.timezone).date()
            
            # 어제 데이터 조회 (순위 변동 계산용)
            yesterday = today - timedelta(days=1)
            yesterday_result = self.supabase.table("daily_metrics") \
                .select("rank") \
                .eq("tracker_id", tracker_id) \
                .eq("collection_date", yesterday.isoformat()) \
                .execute()
            
            previous_rank = yesterday_result.data[0].get("rank") if yesterday_result.data and len(yesterday_result.data) > 0 else None
            rank_change = None
            if rank_result.get("rank") and previous_rank:
                rank_change = previous_rank - rank_result.get("rank")  # 양수면 순위 상승
            
            # 일별 지표 데이터 생성
            metric_data = {
                "tracker_id": tracker_id,
                "keyword_id": keyword_id,
                "store_id": store_id,
                "collection_date": today.isoformat(),
                "rank": rank_result.get("rank"),
                "visitor_review_count": rank_result.get("visitor_review_count", 0),
                "blog_review_count": rank_result.get("blog_review_count", 0),
                "rank_change": rank_change,
                "previous_rank": previous_rank,
                "collected_at": datetime.now(self.timezone).isoformat(),
            }
            
            # 데이터베이스에 저장 (UPSERT: 같은 날짜면 업데이트)
            result = self.supabase.table("daily_metrics") \
                .upsert(metric_data, on_conflict="tracker_id,collection_date") \
                .execute()
            
            # 추적 설정의 last_collected_at, next_collection_at 업데이트
            next_collection_at = self._calculate_next_collection_time(tracker["update_times"])
            self.supabase.table("metric_trackers") \
                .update({
                    "last_collected_at": datetime.now(self.timezone).isoformat(),
                    "next_collection_at": next_collection_at.isoformat(),
                }) \
                .eq("id", tracker_id) \
                .execute()
            
            logger.info(
                f"[Metrics Collected] Tracker: {tracker_id}, Rank: {rank_result.get('rank')}, "
                f"Visitor Reviews: {rank_result.get('visitor_review_count')}, "
                f"Blog Reviews: {rank_result.get('blog_review_count')}"
            )
            
            return result.data[0] if result.data else metric_data
            
        except Exception as e:
            logger.error(f"Error collecting metrics: {str(e)}")
            raise
    
    def get_daily_metrics(
        self, 
        tracker_id: str, 
        start_date: Optional[date] = None, 
        end_date: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        """
        특정 추적 설정의 일별 지표 조회
        
        Args:
            tracker_id: 추적 설정 ID
            start_date: 시작 날짜 (선택사항)
            end_date: 종료 날짜 (선택사항)
            
        Returns:
            일별 지표 목록
        """
        try:
            query = self.supabase.table("daily_metrics") \
                .select("*") \
                .eq("tracker_id", tracker_id) \
                .order("collection_date", desc=True)
            
            if start_date:
                query = query.gte("collection_date", start_date.isoformat())
            if end_date:
                query = query.lte("collection_date", end_date.isoformat())
            
            result = query.execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error getting daily metrics: {str(e)}")
            return []
    
    def get_all_active_trackers(self) -> List[Dict[str, Any]]:
        """수집이 필요한 모든 활성 추적 설정 조회 (스케줄러용)"""
        try:
            now = datetime.now(self.timezone)
            
            result = self.supabase.table("metric_trackers") \
                .select("*") \
                .eq("is_active", True) \
                .lte("next_collection_at", now.isoformat()) \
                .execute()
            
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error getting active trackers: {str(e)}")
            return []
    
    def _calculate_next_collection_time(self, update_times: List[int]) -> datetime:
        """
        다음 수집 시간 계산
        
        Args:
            update_times: 업데이트 시간 리스트 (예: [6, 16, 18])
            
        Returns:
            다음 수집 시간 (datetime)
        """
        now = datetime.now(self.timezone)
        today = now.date()
        
        # 오늘의 남은 수집 시간 확인
        for hour in sorted(update_times):
            collection_time = self.timezone.localize(
                datetime.combine(today, time(hour=hour, minute=0))
            )
            if collection_time > now:
                return collection_time
        
        # 오늘의 모든 수집 시간이 지났으면 내일 첫 번째 시간
        tomorrow = today + timedelta(days=1)
        first_hour = min(update_times)
        return self.timezone.localize(
            datetime.combine(tomorrow, time(hour=first_hour, minute=0))
        )


# 싱글톤 인스턴스
metric_tracker_service = MetricTrackerService()
