"""네이버 플레이스 활성화 서비스 V2 - 개선된 버전"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from app.services.naver_complete_diagnosis_service import complete_diagnosis_service
from app.services.naver_review_service import naver_review_service
from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)


class NaverActivationServiceV2:
    """네이버 플레이스 활성화 분석 서비스 V2"""
    
    async def get_activation_info(self, store_id: str, place_id: str, store_name: str) -> Dict[str, Any]:
        """
        플레이스 활성화 정보 조회
        
        Args:
            store_id: 매장 ID (UUID)
            place_id: 네이버 플레이스 ID
            store_name: 매장명
            
        Returns:
            활성화 정보 딕셔너리
        """
        logger.info(f"[플레이스 활성화 V2] 시작: store_id={store_id}, place_id={place_id}, store_name={store_name}")
        
        try:
            # 1. 플레이스 진단 정보 가져오기
            place_details = await complete_diagnosis_service.diagnose_place(place_id, store_name)
            
            if not place_details:
                raise Exception("플레이스 정보를 가져올 수 없습니다")
            
            # 2. 리뷰 추이 분석 (새로운 로직)
            visitor_review_trends = await self._analyze_review_trend_v2(store_id, 'visitor')
            blog_review_trends = await self._analyze_review_trend_v2(store_id, 'blog')
            
            # 3. 답글 대기 수 계산 (개선된 로직)
            pending_reply_info = await self._get_pending_reply_count_v2(place_id)
            
            # 4. 공지사항 분석
            announcement_info = self._analyze_announcements(place_details.get('announcements', []))
            
            # 5. 프로모션 분석
            promotion_info = self._analyze_promotions(place_details.get('promotions', {}))
            
            # 6. SNS 및 웹사이트 분석
            sns_info = self._analyze_sns(place_details)
            
            # 7. 네이버 서비스 분석
            naver_services = self._analyze_naver_services(place_details)
            
            # 8. 활성화 요약 카드 데이터
            summary_cards = self._create_summary_cards(
                place_details,
                visitor_review_trends,
                blog_review_trends,
                pending_reply_info,
                promotion_info,
                announcement_info
            )
            
            # 9. 결과 반환
            result = {
                'store_name': store_name,
                'place_id': place_id,
                'thumbnail': place_details.get('image_url'),
                
                # 활성화 요약 카드
                'summary_cards': summary_cards,
                
                # 리뷰 추이 (새로운 구조)
                'visitor_review_trends': visitor_review_trends,
                'blog_review_trends': blog_review_trends,
                
                # 답글 대기 (개선된 정보)
                'pending_reply_info': pending_reply_info,
                
                # 플레이스 정보
                'has_promotion': promotion_info['has_promotion'],
                'promotion_count': promotion_info['count'],
                
                'has_announcement': announcement_info['has_announcement'],
                'announcement_count': announcement_info['count'],
                'last_announcement_date': announcement_info.get('last_date'),
                'days_since_last_announcement': announcement_info.get('days_since_last'),
                
                'description': place_details.get('description'),
                'directions': place_details.get('directions'),
                
                # SNS 및 웹사이트
                'homepage': sns_info.get('homepage'),
                'instagram': sns_info.get('instagram'),
                'facebook': sns_info.get('facebook'),
                'blog': sns_info.get('blog'),
                
                # 네이버 서비스
                'has_smart_call': naver_services['smart_call'],
                'has_naver_pay': naver_services['naver_pay'],
                'has_naver_booking': naver_services['naver_booking'],
                'has_naver_talk': naver_services['naver_talk'],
            }
            
            logger.info(f"[플레이스 활성화 V2] 완료")
            return result
            
        except Exception as e:
            logger.error(f"[플레이스 활성화 V2] 오류: {str(e)}", exc_info=True)
            raise
    
    async def _analyze_review_trend_v2(
        self, 
        store_id: str, 
        review_type: str  # 'visitor' or 'blog'
    ) -> Dict[str, Any]:
        """
        리뷰 추이 분석 V2 (지난 7일, 전주, 30일, 3개월, 이번주)
        
        Args:
            store_id: 매장 ID
            review_type: 리뷰 타입 ('visitor' 또는 'blog')
            
        Returns:
            추이 정보
        """
        try:
            supabase = get_supabase_client()
            now = datetime.now(timezone.utc)
            
            # 3개월치 데이터 조회
            cutoff_date = now - timedelta(days=90)
            
            history_result = supabase.table("diagnosis_history").select(
                "diagnosed_at, place_details"
            ).eq(
                "store_id", store_id
            ).gte(
                "diagnosed_at", cutoff_date.isoformat()
            ).order(
                "diagnosed_at", desc=False  # 오래된 것부터
            ).execute()
            
            if not history_result.data:
                return self._get_empty_trend()
            
            # 날짜별 리뷰 수 추출
            field_name = 'visitor_review_count' if review_type == 'visitor' else 'blog_review_count'
            data_points = []
            
            for record in history_result.data:
                diagnosed_at = datetime.fromisoformat(record['diagnosed_at'].replace('Z', '+00:00'))
                place_details = record.get('place_details', {})
                count = place_details.get(field_name, 0)
                
                data_points.append({
                    'date': diagnosed_at,
                    'count': count if count is not None else 0
                })
            
            if len(data_points) < 2:
                return self._get_empty_trend()
            
            # 기간별 일평균 계산
            last_7days_avg = self._calculate_daily_avg(data_points, now, 7)
            last_week_avg = self._calculate_daily_avg(data_points, now - timedelta(days=7), 7)  # 전주
            last_30days_avg = self._calculate_daily_avg(data_points, now, 30)
            last_90days_avg = self._calculate_daily_avg(data_points, now, 90)
            
            # 이번주 (오늘 제외) 일평균
            this_week_avg = self._calculate_this_week_avg(data_points, now)
            
            # 비교 분석
            comparisons = {
                'vs_last_7days': self._compare_values(this_week_avg, last_7days_avg),
                'vs_last_week': self._compare_values(this_week_avg, last_week_avg),
                'vs_last_30days': self._compare_values(this_week_avg, last_30days_avg),
                'vs_last_90days': self._compare_values(this_week_avg, last_90days_avg),
            }
            
            return {
                'last_7days_avg': round(last_7days_avg, 2),
                'last_week_avg': round(last_week_avg, 2),
                'last_30days_avg': round(last_30days_avg, 2),
                'last_90days_avg': round(last_90days_avg, 2),
                'this_week_avg': round(this_week_avg, 2),
                'comparisons': comparisons
            }
            
        except Exception as e:
            logger.error(f"[리뷰 추이 분석 V2] 오류: {str(e)}")
            return self._get_empty_trend()
    
    def _calculate_daily_avg(self, data_points: List[Dict], end_date: datetime, days: int) -> float:
        """특정 기간의 일평균 계산"""
        start_date = end_date - timedelta(days=days)
        
        # 기간 내 데이터 필터링
        period_data = [
            dp for dp in data_points 
            if start_date <= dp['date'] <= end_date
        ]
        
        if not period_data:
            return 0.0
        
        # 첫 번째와 마지막 리뷰 수 차이를 일수로 나눔
        if len(period_data) == 1:
            return 0.0
        
        first_count = period_data[0]['count']
        last_count = period_data[-1]['count']
        
        review_diff = last_count - first_count
        actual_days = (period_data[-1]['date'] - period_data[0]['date']).days
        
        if actual_days == 0:
            return 0.0
        
        return review_diff / actual_days if actual_days > 0 else 0.0
    
    def _calculate_this_week_avg(self, data_points: List[Dict], now: datetime) -> float:
        """이번주 (오늘 제외) 일평균 계산"""
        # 이번주 월요일 계산
        days_since_monday = now.weekday()
        monday = now - timedelta(days=days_since_monday)
        yesterday = now - timedelta(days=1)
        
        # 월요일부터 어제까지의 데이터
        this_week_data = [
            dp for dp in data_points 
            if monday <= dp['date'] <= yesterday
        ]
        
        if len(this_week_data) < 2:
            return 0.0
        
        first_count = this_week_data[0]['count']
        last_count = this_week_data[-1]['count']
        
        review_diff = last_count - first_count
        actual_days = (this_week_data[-1]['date'] - this_week_data[0]['date']).days
        
        if actual_days == 0:
            return 0.0
        
        return review_diff / actual_days if actual_days > 0 else 0.0
    
    def _compare_values(self, current: float, baseline: float) -> Dict[str, Any]:
        """두 값을 비교하여 방향과 변화율 반환"""
        if baseline == 0:
            if current > 0:
                return {'direction': 'up', 'change': 100.0}
            else:
                return {'direction': 'stable', 'change': 0.0}
        
        change_pct = ((current - baseline) / baseline) * 100
        
        if change_pct > 5:
            direction = 'up'
        elif change_pct < -5:
            direction = 'down'
        else:
            direction = 'stable'
        
        return {
            'direction': direction,
            'change': round(change_pct, 1)
        }
    
    def _get_empty_trend(self) -> Dict[str, Any]:
        """데이터 부족 시 기본값"""
        return {
            'last_7days_avg': 0.0,
            'last_week_avg': 0.0,
            'last_30days_avg': 0.0,
            'last_90days_avg': 0.0,
            'this_week_avg': 0.0,
            'comparisons': {
                'vs_last_7days': {'direction': 'stable', 'change': 0.0},
                'vs_last_week': {'direction': 'stable', 'change': 0.0},
                'vs_last_30days': {'direction': 'stable', 'change': 0.0},
                'vs_last_90days': {'direction': 'stable', 'change': 0.0},
            }
        }
    
    async def _get_pending_reply_count_v2(self, place_id: str) -> Dict[str, Any]:
        """
        답글 대기 수 계산 V2 (AI 리뷰답글 로직 참고)
        
        Args:
            place_id: 네이버 플레이스 ID
            
        Returns:
            답글 대기 정보
        """
        try:
            # 최근 300개 리뷰 조회
            reviews = await naver_review_service.get_visitor_reviews(place_id, size=300)
            
            if not reviews or not reviews.get('items'):
                return {
                    'total_reviews': 0,
                    'pending_count': 0,
                    'replied_count': 0,
                    'reply_rate': 0.0,
                    'oldest_pending_date': None
                }
            
            total_reviews = len(reviews['items'])
            pending_reviews = []
            replied_reviews = []
            
            for review in reviews['items']:
                # 답글이 있고 비어있지 않은 경우
                reply = review.get('reply', {})
                reply_text = reply.get('replyText', '').strip() if reply else ''
                
                if reply_text:
                    replied_reviews.append(review)
                else:
                    pending_reviews.append(review)
            
            pending_count = len(pending_reviews)
            replied_count = len(replied_reviews)
            reply_rate = (replied_count / total_reviews * 100) if total_reviews > 0 else 0.0
            
            # 가장 오래된 답글 대기 리뷰 날짜
            oldest_pending_date = None
            if pending_reviews:
                oldest_review = pending_reviews[-1]  # 리뷰는 최신순으로 정렬되어 있음
                oldest_pending_date = oldest_review.get('visitDate') or oldest_review.get('created')
            
            return {
                'total_reviews': total_reviews,
                'pending_count': pending_count,
                'replied_count': replied_count,
                'reply_rate': round(reply_rate, 1),
                'oldest_pending_date': oldest_pending_date
            }
            
        except Exception as e:
            logger.error(f"[답글 대기 수 계산 V2] 오류: {str(e)}")
            return {
                'total_reviews': 0,
                'pending_count': 0,
                'replied_count': 0,
                'reply_rate': 0.0,
                'oldest_pending_date': None
            }
    
    def _create_summary_cards(
        self,
        place_details: Dict[str, Any],
        visitor_trends: Dict[str, Any],
        blog_trends: Dict[str, Any],
        pending_reply_info: Dict[str, Any],
        promotion_info: Dict[str, Any],
        announcement_info: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """활성화 요약 카드 데이터 생성"""
        cards = []
        
        # 1. 방문자 리뷰 카드
        cards.append({
            'type': 'visitor_review',
            'title': '방문자 리뷰',
            'value': place_details.get('visitor_review_count', 0),
            'daily_avg': visitor_trends.get('this_week_avg', 0),
            'trend': self._get_overall_trend(visitor_trends.get('comparisons', {}))
        })
        
        # 2. 답글 대기 카드
        cards.append({
            'type': 'pending_reply',
            'title': '답글 대기',
            'value': pending_reply_info.get('pending_count', 0),
            'total': pending_reply_info.get('total_reviews', 0),
            'reply_rate': pending_reply_info.get('reply_rate', 0)
        })
        
        # 3. 블로그 리뷰 카드
        cards.append({
            'type': 'blog_review',
            'title': '블로그 리뷰',
            'value': place_details.get('blog_review_count', 0),
            'daily_avg': blog_trends.get('this_week_avg', 0),
            'trend': self._get_overall_trend(blog_trends.get('comparisons', {}))
        })
        
        # 4. 쿠폰 카드
        cards.append({
            'type': 'coupon',
            'title': '쿠폰',
            'value': promotion_info.get('count', 0),
            'has_active': promotion_info.get('has_promotion', False)
        })
        
        # 5. 공지사항 카드
        cards.append({
            'type': 'announcement',
            'title': '공지사항',
            'value': announcement_info.get('count', 0),
            'days_since_last': announcement_info.get('days_since_last', 999)
        })
        
        return cards
    
    def _get_overall_trend(self, comparisons: Dict[str, Any]) -> str:
        """전반적인 추세 판단"""
        if not comparisons:
            return 'stable'
        
        up_count = sum(1 for comp in comparisons.values() if comp.get('direction') == 'up')
        down_count = sum(1 for comp in comparisons.values() if comp.get('direction') == 'down')
        
        if up_count > down_count:
            return 'up'
        elif down_count > up_count:
            return 'down'
        else:
            return 'stable'
    
    def _analyze_announcements(self, announcements: List[Any]) -> Dict[str, Any]:
        """공지사항 분석"""
        if not announcements:
            return {
                'has_announcement': False,
                'count': 0
            }
        
        count = len(announcements)
        
        try:
            latest_announcement = announcements[0]
            last_date_str = latest_announcement.get('created_at') or latest_announcement.get('date')
            
            if last_date_str:
                last_date = datetime.fromisoformat(last_date_str.replace('Z', '+00:00'))
                days_since = (datetime.now(timezone.utc) - last_date).days
                
                return {
                    'has_announcement': True,
                    'count': count,
                    'last_date': last_date.strftime('%Y-%m-%d'),
                    'days_since_last': days_since
                }
        except Exception as e:
            logger.error(f"[공지사항 날짜 파싱] 오류: {str(e)}")
        
        return {
            'has_announcement': True,
            'count': count
        }
    
    def _analyze_promotions(self, promotions: Dict[str, Any]) -> Dict[str, Any]:
        """프로모션 분석"""
        if not promotions:
            return {
                'has_promotion': False,
                'count': 0
            }
        
        total_count = promotions.get('total', 0)
        coupons = promotions.get('coupons', [])
        
        count = total_count or len(coupons)
        
        return {
            'has_promotion': count > 0,
            'count': count
        }
    
    def _analyze_sns(self, place_details: Dict[str, Any]) -> Dict[str, Optional[str]]:
        """SNS 및 웹사이트 분석"""
        return {
            'homepage': place_details.get('homepage_url') or place_details.get('homepage'),
            'instagram': place_details.get('instagram'),
            'facebook': place_details.get('facebook'),
            'blog': place_details.get('blog')
        }
    
    def _analyze_naver_services(self, place_details: Dict[str, Any]) -> Dict[str, bool]:
        """네이버 서비스 사용 여부 분석"""
        return {
            'smart_call': bool(place_details.get('smart_call') or place_details.get('has_smart_call')),
            'naver_pay': bool(place_details.get('naver_pay') or place_details.get('has_naver_pay')),
            'naver_booking': bool(place_details.get('booking_available') or place_details.get('has_naver_booking')),
            'naver_talk': bool(place_details.get('naver_talk') or place_details.get('has_naver_talk'))
        }


# 싱글톤 인스턴스
activation_service_v2 = NaverActivationServiceV2()
