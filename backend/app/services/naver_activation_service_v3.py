"""네이버 플레이스 활성화 서비스 V3 - 경쟁매장분석 및 AI답글 로직 참조"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from app.services.naver_complete_diagnosis_service import complete_diagnosis_service
from app.services.naver_review_service import naver_review_service
from app.services.naver_additional_info_service import additional_info_service

logger = logging.getLogger(__name__)


class NaverActivationServiceV3:
    """네이버 플레이스 활성화 분석 서비스 V3"""
    
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
        logger.info(f"[플레이스 활성화 V3] 시작: store_id={store_id}, place_id={place_id}, store_name={store_name}")
        
        try:
            # 1. 플레이스 진단 정보 가져오기
            place_details = await complete_diagnosis_service.diagnose_place(place_id, store_name)
            
            if not place_details:
                raise Exception("플레이스 정보를 가져올 수 없습니다")
            
            # 2. 리뷰 일평균 계산 (경쟁매장분석 방식)
            visitor_review_trends = self._calculate_review_trends(
                place_details.get("recent_visitor_reviews", []),
                place_details.get("visitor_review_count", 0)
            )
            
            blog_review_trends = self._calculate_review_trends(
                place_details.get("recent_blog_reviews", []),
                place_details.get("blog_review_count", 0)
            )
            
            logger.info(f"[플레이스 활성화 V3] 방문자 리뷰 추이: 7일={visitor_review_trends['last_7days_avg']}, 30일={visitor_review_trends['last_30days_avg']}, 60일={visitor_review_trends['last_60days_avg']}")
            logger.info(f"[플레이스 활성화 V3] 블로그 리뷰 추이: 7일={blog_review_trends['last_7days_avg']}, 30일={blog_review_trends['last_30days_avg']}, 60일={blog_review_trends['last_60days_avg']}")
            
            # 3. 답글 대기 수 계산 (AI 답글 방식)
            pending_reply_info = await self._get_pending_reply_count(place_id)
            logger.info(f"[플레이스 활성화 V3] 답글 대기: {pending_reply_info['pending_count']}개 / {pending_reply_info['total_reviews']}개")
            
            # 4. 공지사항 분석 (최근 7일 내)
            announcement_info = await self._analyze_announcements(place_id)
            logger.info(f"[플레이스 활성화 V3] 공지사항: 최근 7일 내 {announcement_info['count']}개")
            
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
                
                # 리뷰 추이
                'visitor_review_trends': visitor_review_trends,
                'blog_review_trends': blog_review_trends,
                
                # 현재 리뷰 수
                'current_visitor_review_count': place_details.get('visitor_review_count', 0),
                'current_blog_review_count': place_details.get('blog_review_count', 0),
                
                # 답글 대기
                'pending_reply_info': pending_reply_info,
                
                # 네이버 API 제한 여부
                'naver_api_limited': pending_reply_info.get('total_reviews', 0) == 0 and place_details.get('visitor_review_count', 0) > 0,
                
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
            
            logger.info(f"[플레이스 활성화 V3] 완료")
            return result
            
        except Exception as e:
            logger.error(f"[플레이스 활성화 V3] 오류: {str(e)}", exc_info=True)
            raise
    
    def _calculate_review_trends(
        self, 
        recent_reviews: List[Dict], 
        total_count: int
    ) -> Dict[str, Any]:
        """
        리뷰 추이 계산 (경쟁매장분석 방식)
        
        Args:
            recent_reviews: 최근 리뷰 리스트 (date 필드 포함)
            total_count: 전체 리뷰 수
            
        Returns:
            추이 정보 (7일, 30일, 60일 일평균 및 비교)
        """
        try:
            if not recent_reviews:
                logger.warning(f"[플레이스 활성화 V3] recent_reviews 없음, 전체 리뷰 수: {total_count}")
                return self._get_empty_trend()
            
            # 기간별 일평균 계산
            last_7days_avg = self._calculate_recent_reviews(recent_reviews, days=7)
            last_30days_avg = self._calculate_recent_reviews(recent_reviews, days=30)
            last_60days_avg = self._calculate_recent_reviews(recent_reviews, days=60)
            
            # 비교 분석 (7일 일평균 기준)
            comparisons = {
                'vs_last_7days': self._compare_values(last_7days_avg, last_7days_avg),
                'vs_last_30days': self._compare_values(last_7days_avg, last_30days_avg),
                'vs_last_60days': self._compare_values(last_7days_avg, last_60days_avg),
            }
            
            return {
                'last_7days_avg': round(last_7days_avg, 2),
                'last_30days_avg': round(last_30days_avg, 2),
                'last_60days_avg': round(last_60days_avg, 2),
                'comparisons': comparisons
            }
            
        except Exception as e:
            logger.error(f"[리뷰 추이 계산] 오류: {str(e)}")
            return self._get_empty_trend()
    
    def _calculate_recent_reviews(
        self,
        recent_reviews: List[Dict],
        days: int = 7
    ) -> float:
        """
        최근 N일간 리뷰 수 계산 후 일평균 반환
        (경쟁매장분석의 _calculate_recent_reviews 방식)
        
        Args:
            recent_reviews: 최근 리뷰 리스트
            days: 기간 (일)
            
        Returns:
            일평균 리뷰 수
        """
        if not recent_reviews:
            return 0.0
        
        cutoff_date = datetime.now() - timedelta(days=days)
        recent_count = sum(
            1 for review in recent_reviews
            if self._parse_review_date(review.get("date")) >= cutoff_date
        )
        
        return recent_count / days if days > 0 else 0.0
    
    def _parse_review_date(self, date_str: str) -> datetime:
        """
        리뷰 날짜 파싱 (경쟁매장분석의 _parse_review_date 방식)
        
        Args:
            date_str: 날짜 문자열 ("3일 전", "1주일 전", "2024.01.27" 등)
            
        Returns:
            datetime 객체
        """
        try:
            # None이나 빈 문자열 처리
            if not date_str:
                return datetime.min
            
            # "3일 전", "1주일 전" 등 파싱
            if "일 전" in date_str:
                days = int(date_str.split("일")[0].strip())
                return datetime.now() - timedelta(days=days)
            elif "주일 전" in date_str:
                weeks = int(date_str.split("주일")[0].strip())
                return datetime.now() - timedelta(weeks=weeks)
            elif "개월 전" in date_str:
                months = int(date_str.split("개월")[0].strip())
                return datetime.now() - timedelta(days=months * 30)
            else:
                # 날짜 형식이면 파싱 (YYYY.MM.DD)
                return datetime.strptime(date_str, "%Y.%m.%d")
        except Exception as e:
            logger.warning(f"[날짜 파싱] 실패: {date_str}, 오류: {str(e)}")
            return datetime.min
    
    async def _get_pending_reply_count(self, place_id: str) -> Dict[str, Any]:
        """
        답글 대기 수 계산 (AI 답글 방식)
        
        Args:
            place_id: 네이버 플레이스 ID
            
        Returns:
            답글 대기 정보
        """
        try:
            logger.info(f"[답글 대기 계산] 시작: place_id={place_id}")
            
            # 최근 300개 리뷰 조회
            reviews = await naver_review_service.get_visitor_reviews(place_id, size=300)
            
            if not reviews or not reviews.get('items'):
                logger.warning(f"[답글 대기 계산] 리뷰 데이터 없음")
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
            
            logger.info(f"[답글 대기 계산] 완료: total={total_reviews}, pending={pending_count}, replied={replied_count}, rate={reply_rate:.1f}%")
            
            return {
                'total_reviews': total_reviews,
                'pending_count': pending_count,
                'replied_count': replied_count,
                'reply_rate': round(reply_rate, 1),
                'oldest_pending_date': oldest_pending_date
            }
            
        except Exception as e:
            logger.error(f"[답글 대기 계산] 오류: {str(e)}", exc_info=True)
            return {
                'total_reviews': 0,
                'pending_count': 0,
                'replied_count': 0,
                'reply_rate': 0.0,
                'oldest_pending_date': None
            }
    
    async def _analyze_announcements(self, place_id: str) -> Dict[str, Any]:
        """
        공지사항 분석 (최근 7일 내 공지사항 카운트)
        (플레이스 진단 및 경쟁매장분석 방식)
        
        Args:
            place_id: 네이버 플레이스 ID
            
        Returns:
            공지사항 정보
        """
        try:
            logger.info(f"[공지사항 분석] 시작: place_id={place_id}")
            
            # additional_info_service로 공지사항 조회
            announcements = await additional_info_service.get_announcements(place_id)
            
            if not announcements:
                logger.info(f"[공지사항 분석] 공지사항 없음")
                return {
                    'has_announcement': False,
                    'count': 0
                }
            
            logger.info(f"[공지사항 분석] 전체 공지사항: {len(announcements)}개")
            
            # 최근 7일 내 공지사항 카운트
            recent_count = self._count_recent_announcements(announcements, days=7)
            
            # 가장 최근 공지사항 날짜 계산
            days_since_last = None
            if announcements:
                # relativeCreated 파싱 (예: "3일 전")
                first_ann = announcements[0]
                relative = first_ann.get("relativeCreated", "")
                if "일 전" in relative:
                    try:
                        days_since_last = int(relative.split("일")[0].strip())
                    except:
                        pass
            
            logger.info(f"[공지사항 분석] 완료: 최근 7일 내 {recent_count}개, 최신은 {days_since_last}일 전")
            
            return {
                'has_announcement': recent_count > 0,
                'count': recent_count,
                'days_since_last': days_since_last
            }
            
        except Exception as e:
            logger.error(f"[공지사항 분석] 오류: {str(e)}", exc_info=True)
            return {
                'has_announcement': False,
                'count': 0
            }
    
    def _count_recent_announcements(
        self,
        announcements: List[Dict],
        days: int = 7
    ) -> int:
        """
        최근 N일간 공지 수 계산 (경쟁매장분석의 _count_recent_announcements 방식)
        
        Args:
            announcements: 공지사항 리스트
            days: 기간 (일)
            
        Returns:
            공지사항 개수
        """
        if not announcements:
            return 0
        
        count = 0
        
        for ann in announcements:
            # relativeCreated가 None일 수 있으므로 명시적으로 빈 문자열로 처리
            relative = ann.get("relativeCreated") or ""
            if relative and "일 전" in relative:
                try:
                    days_ago = int(relative.split("일")[0].strip())
                    if days_ago <= days:
                        count += 1
                except:
                    pass
        
        return count
    
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
            'last_30days_avg': 0.0,
            'last_60days_avg': 0.0,
            'comparisons': {
                'vs_last_7days': {'direction': 'stable', 'change': 0.0},
                'vs_last_30days': {'direction': 'stable', 'change': 0.0},
                'vs_last_60days': {'direction': 'stable', 'change': 0.0},
            }
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
        
        # 1. 방문자 리뷰 카드 (지난 7일 일평균을 주요 숫자로)
        cards.append({
            'type': 'visitor_review',
            'title': '방문자 리뷰',
            'value': visitor_trends.get('last_7days_avg', 0),  # 주요 숫자: 지난 7일 일평균
            'total_count': place_details.get('visitor_review_count', 0),  # 전체 리뷰 수
            'last_30days_avg': visitor_trends.get('last_30days_avg', 0),  # 비교용
            'last_60days_avg': visitor_trends.get('last_60days_avg', 0),  # 비교용
            'comparisons': visitor_trends.get('comparisons', {})
        })
        
        # 2. 답글 대기 카드
        cards.append({
            'type': 'pending_reply',
            'title': '답글 대기',
            'value': pending_reply_info.get('pending_count', 0),
            'total': pending_reply_info.get('total_reviews', 0),
            'reply_rate': pending_reply_info.get('reply_rate', 0)
        })
        
        # 3. 블로그 리뷰 카드 (지난 7일 일평균을 주요 숫자로)
        cards.append({
            'type': 'blog_review',
            'title': '블로그 리뷰',
            'value': blog_trends.get('last_7days_avg', 0),  # 주요 숫자: 지난 7일 일평균
            'total_count': place_details.get('blog_review_count', 0),  # 전체 리뷰 수
            'last_30days_avg': blog_trends.get('last_30days_avg', 0),  # 비교용
            'last_60days_avg': blog_trends.get('last_60days_avg', 0),  # 비교용
            'comparisons': blog_trends.get('comparisons', {})
        })
        
        # 4. 쿠폰 카드
        cards.append({
            'type': 'coupon',
            'title': '쿠폰',
            'value': promotion_info.get('count', 0),
            'has_active': promotion_info.get('has_promotion', False)
        })
        
        # 5. 공지사항 카드 (최근 7일 내 것만)
        cards.append({
            'type': 'announcement',
            'title': '공지사항',
            'value': announcement_info.get('count', 0),  # 최근 7일 내 공지사항만
            'days_since_last': announcement_info.get('days_since_last', 999)
        })
        
        return cards
    
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
activation_service_v3 = NaverActivationServiceV3()
