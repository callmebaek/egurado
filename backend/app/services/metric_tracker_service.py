"""
주요지표 추적 서비스
Metric Tracker Service
"""
import logging
from typing import List, Dict, Optional
from datetime import datetime, date, timedelta
from uuid import UUID, uuid4
from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)


class MetricTrackerService:
    """주요지표 추적 서비스"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    def create_tracker(self, data: dict) -> dict:
        """
        새로운 추적 설정 생성
        
        Args:
            data: {
                user_id, store_id, keyword_id, update_frequency, 
                update_times, notification_enabled, notification_type
            }
        
        Returns:
            생성된 tracker
        """
        try:
            # update_times 기본값 설정
            if 'update_times' not in data or data['update_times'] is None:
                update_frequency = data.get('update_frequency', 'daily_once')
                if update_frequency == 'daily_once':
                    data['update_times'] = [16]
                elif update_frequency == 'daily_twice':
                    data['update_times'] = [6, 16]
                elif update_frequency == 'daily_thrice':
                    data['update_times'] = [6, 12, 18]
                else:
                    data['update_times'] = [16]
            
            logger.info(f"[Tracker Create] 데이터: {data}")
            
            # Supabase에 삽입
            result = self.supabase.table('metric_trackers').insert(data).execute()
            
            if result.data and len(result.data) > 0:
                tracker = result.data[0]
                
                # 관련 정보 조회 (store, keyword)
                store_response = self.supabase.table('stores').select('*').eq('id', tracker['store_id']).execute()
                keyword_response = self.supabase.table('keywords').select('*').eq('id', tracker['keyword_id']).execute()
                
                if store_response.data and len(store_response.data) > 0:
                    tracker['store_name'] = store_response.data[0].get('store_name', '')
                    tracker['platform'] = store_response.data[0].get('platform', 'naver')
                
                if keyword_response.data and len(keyword_response.data) > 0:
                    tracker['keyword'] = keyword_response.data[0].get('keyword', '')
                
                logger.info(f"[Tracker Create] 생성 완료: {tracker['id']}")
                return tracker
            else:
                raise Exception("Tracker 생성 실패: 응답 데이터 없음")
                
        except Exception as e:
            logger.error(f"[Tracker Create] 오류: {str(e)}")
            raise Exception(f"Tracker 생성 실패: {str(e)}")
    
    def get_tracker(self, tracker_id: str, user_id: str) -> Optional[dict]:
        """특정 tracker 조회 (권한 확인 포함)"""
        try:
            result = self.supabase.table('metric_trackers')\
                .select('*')\
                .eq('id', tracker_id)\
                .eq('user_id', user_id)\
                .execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            logger.error(f"[Tracker Get] 오류: {str(e)}")
            return None
    
    def get_all_trackers(self, user_id: str) -> List[dict]:
        """사용자의 모든 tracker 조회"""
        try:
            result = self.supabase.table('metric_trackers')\
                .select('*, stores(store_name, platform), keywords(keyword)')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .execute()
            
            trackers = []
            for item in result.data:
                tracker = {**item}
                
                # stores와 keywords 정보 평탄화
                if 'stores' in item and item['stores']:
                    tracker['store_name'] = item['stores'].get('store_name', '')
                    tracker['platform'] = item['stores'].get('platform', 'naver')
                
                if 'keywords' in item and item['keywords']:
                    tracker['keyword'] = item['keywords'].get('keyword', '')
                
                trackers.append(tracker)
            
            return trackers
        except Exception as e:
            logger.error(f"[Trackers Get All] 오류: {str(e)}")
            return []
    
    def get_all_active_trackers(self) -> List[dict]:
        """
        현재 시간에 수집해야 할 활성 tracker 조회
        
        스케줄러에서 매 시간마다 호출됨
        현재 시간이 update_times 배열에 포함된 tracker들을 반환
        
        Returns:
            현재 시간에 수집할 tracker 목록 (stores, keywords 정보 포함)
        """
        try:
            current_hour = datetime.now().hour
            logger.info(f"[Get Active Trackers] 현재 시간: {current_hour}시")
            
            # 모든 활성 tracker 조회
            result = self.supabase.table('metric_trackers')\
                .select('*, stores(store_name, place_id, platform), keywords(keyword)')\
                .eq('is_active', True)\
                .execute()
            
            if not result.data:
                logger.info("[Get Active Trackers] 활성 tracker 없음")
                return []
            
            # 현재 시간에 수집해야 할 tracker 필터링
            scheduled_trackers = []
            for tracker in result.data:
                update_times = tracker.get('update_times', [])
                
                # update_times가 None이거나 비어있으면 기본값 사용
                if not update_times:
                    update_frequency = tracker.get('update_frequency', 'daily_once')
                    if update_frequency == 'daily_once':
                        update_times = [16]
                    elif update_frequency == 'daily_twice':
                        update_times = [6, 16]
                    elif update_frequency == 'daily_thrice':
                        update_times = [6, 12, 18]
                    else:
                        update_times = [16]
                
                # 현재 시간이 수집 시간에 포함되는지 확인
                if current_hour in update_times:
                    scheduled_trackers.append(tracker)
                    keyword_text = tracker.get('keywords', {}).get('keyword', 'Unknown') if tracker.get('keywords') else 'Unknown'
                    store_name = tracker.get('stores', {}).get('store_name', 'Unknown') if tracker.get('stores') else 'Unknown'
                    logger.info(
                        f"[Schedule] {current_hour}시 수집 예정: '{keyword_text}' (매장: {store_name})"
                    )
            
            logger.info(f"[Get Active Trackers] 총 {len(scheduled_trackers)}개 tracker 수집 예정")
            return scheduled_trackers
            
        except Exception as e:
            logger.error(f"[Get Active Trackers] 오류: {str(e)}")
            return []
    
    def update_tracker(self, tracker_id: str, user_id: str, data: dict) -> dict:
        """tracker 설정 수정"""
        try:
            # 권한 확인
            tracker = self.get_tracker(tracker_id, user_id)
            if not tracker:
                raise Exception("Tracker를 찾을 수 없거나 권한이 없습니다")
            
            # update_times 처리: update_frequency가 변경되었고 update_times가 없으면 기본값 설정
            if 'update_frequency' in data and ('update_times' not in data or data['update_times'] is None):
                update_frequency = data['update_frequency']
                if update_frequency == 'daily_once':
                    data['update_times'] = [16]
                elif update_frequency == 'daily_twice':
                    data['update_times'] = [6, 16]
                elif update_frequency == 'daily_thrice':
                    data['update_times'] = [6, 12, 18]
            
            # 업데이트 실행
            result = self.supabase.table('metric_trackers')\
                .update(data)\
                .eq('id', tracker_id)\
                .eq('user_id', user_id)\
                .execute()
            
            if result.data and len(result.data) > 0:
                logger.info(f"[Tracker Update] 수정 완료: {tracker_id}")
                return result.data[0]
            else:
                raise Exception("Tracker 수정 실패")
        except Exception as e:
            logger.error(f"[Tracker Update] 오류: {str(e)}")
            raise Exception(f"Tracker 수정 실패: {str(e)}")
    
    def delete_tracker(self, tracker_id: str, user_id: str) -> bool:
        """tracker 삭제"""
        try:
            result = self.supabase.table('metric_trackers')\
                .delete()\
                .eq('id', tracker_id)\
                .eq('user_id', user_id)\
                .execute()
            
            logger.info(f"[Tracker Delete] 삭제 완료: {tracker_id}")
            return True
        except Exception as e:
            logger.error(f"[Tracker Delete] 오류: {str(e)}")
            raise Exception(f"Tracker 삭제 실패: {str(e)}")
    
    async def collect_metrics(self, tracker_id: str) -> dict:
        """
        지표 수집 (순위, 리뷰 수 등)
        
        Args:
            tracker_id: 추적 설정 ID
        
        Returns:
            수집된 지표 데이터
        """
        try:
            # Tracker 정보 조회
            tracker_result = self.supabase.table('metric_trackers')\
                .select('*, stores(*), keywords(*)')\
                .eq('id', tracker_id)\
                .execute()
            
            if not tracker_result.data or len(tracker_result.data) == 0:
                raise Exception(f"Tracker {tracker_id}를 찾을 수 없습니다")
            
            tracker = tracker_result.data[0]
            store = tracker['stores']
            keyword = tracker['keywords']['keyword']
            
            logger.info(f"[Metrics Collect] 시작: {tracker_id} - {store['store_name']} / {keyword}")
            
            # Naver Rank API 호출
            from app.services.naver_rank_api_unofficial import rank_service_api_unofficial
            
            rank_result = await rank_service_api_unofficial.check_rank(
                keyword=keyword,
                target_place_id=store['place_id'],
                store_name=store['store_name']
            )
            
            # 지표 데이터 구성
            today = date.today()
            metric_data = {
                'tracker_id': tracker_id,
                'keyword_id': tracker['keyword_id'],
                'store_id': tracker['store_id'],
                'collection_date': today.isoformat(),
                'rank': rank_result.get('rank'),
                'visitor_review_count': rank_result.get('visitor_review_count', 0),
                'blog_review_count': rank_result.get('blog_review_count', 0),
                'collected_at': datetime.now().isoformat()
            }
            
            # 전일 데이터 조회 (순위 변동 계산)
            yesterday = today - timedelta(days=1)
            prev_result = self.supabase.table('daily_metrics')\
                .select('*')\
                .eq('tracker_id', tracker_id)\
                .eq('collection_date', yesterday.isoformat())\
                .execute()
            
            if prev_result.data and len(prev_result.data) > 0:
                prev_metric = prev_result.data[0]
                if prev_metric.get('rank') and rank_result.get('rank'):
                    metric_data['previous_rank'] = prev_metric['rank']
                    metric_data['rank_change'] = prev_metric['rank'] - rank_result['rank']
            
            # 오늘 데이터가 이미 있으면 업데이트, 없으면 삽입
            existing_result = self.supabase.table('daily_metrics')\
                .select('*')\
                .eq('tracker_id', tracker_id)\
                .eq('collection_date', today.isoformat())\
                .execute()
            
            if existing_result.data and len(existing_result.data) > 0:
                # 업데이트
                result = self.supabase.table('daily_metrics')\
                    .update(metric_data)\
                    .eq('tracker_id', tracker_id)\
                    .eq('collection_date', today.isoformat())\
                    .execute()
                logger.info(f"[Metrics Collect] 업데이트 완료: {tracker_id}")
            else:
                # 삽입
                result = self.supabase.table('daily_metrics')\
                    .insert(metric_data)\
                    .execute()
                logger.info(f"[Metrics Collect] 삽입 완료: {tracker_id}")
            
            # tracker의 last_collected_at 업데이트
            self.supabase.table('metric_trackers')\
                .update({'last_collected_at': datetime.now().isoformat()})\
                .eq('id', tracker_id)\
                .execute()
            
            return result.data[0] if result.data else metric_data
            
        except Exception as e:
            logger.error(f"[Metrics Collect] 오류: {str(e)}")
            raise Exception(f"지표 수집 실패: {str(e)}")
    
    def get_daily_metrics(
        self, 
        tracker_id: str, 
        start_date: Optional[date] = None, 
        end_date: Optional[date] = None
    ) -> List[dict]:
        """
        특정 tracker의 일별 지표 조회
        
        Args:
            tracker_id: 추적 설정 ID
            start_date: 시작 날짜
            end_date: 종료 날짜
        
        Returns:
            일별 지표 목록
        """
        try:
            # 기본값: 최근 30일
            if not end_date:
                end_date = date.today()
            if not start_date:
                start_date = end_date - timedelta(days=30)
            
            result = self.supabase.table('daily_metrics')\
                .select('*, keywords(keyword), stores(store_name)')\
                .eq('tracker_id', tracker_id)\
                .gte('collection_date', start_date.isoformat())\
                .lte('collection_date', end_date.isoformat())\
                .order('collection_date', desc=True)\
                .execute()
            
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"[Daily Metrics Get] 오류: {str(e)}")
            return []
    
    def get_latest_metric(self, tracker_id: str) -> Optional[dict]:
        """가장 최근 지표 조회"""
        try:
            result = self.supabase.table('daily_metrics')\
                .select('*')\
                .eq('tracker_id', tracker_id)\
                .order('collection_date', desc=True)\
                .limit(1)\
                .execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            logger.error(f"[Latest Metric Get] 오류: {str(e)}")
            return None


# 싱글톤 인스턴스
metric_tracker_service = MetricTrackerService()
