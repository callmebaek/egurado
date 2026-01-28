"""
네이버 플레이스 활성화 분석 서비스 V3 (완전 독립적)

- diagnosis_history와 무관하게 실시간으로 데이터 수집
- 매번 새롭게 리뷰를 가져와서 분석
- 다른 기능과 0% 연관성
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone

from app.services.naver_complete_diagnosis_service import complete_diagnosis_service
from app.services.naver_review_service import naver_review_service
from app.services.naver_additional_info_service import additional_info_service

logger = logging.getLogger(__name__)


class NaverActivationServiceV3:
    """네이버 플레이스 활성화 분석 서비스 V3 (완전 독립적)"""
    
    async def get_activation_info(self, store_id: str, place_id: str, store_name: str) -> Dict[str, Any]:
        """
        플레이스 활성화 정보 조회 (완전 독립적)
        
        Args:
            store_id: 매장 ID (Supabase stores 테이블)
            place_id: 네이버 플레이스 ID
            store_name: 매장명
            
        Returns:
            활성화 분석 결과
        """
        logger.info(f"[플레이스 활성화 V3-독립] 시작: store_id={store_id}, place_id={place_id}, store_name={store_name}")
        
        try:
            # 1. 플레이스 기본 정보 가져오기 (완전진단 서비스 사용)
            place_details = await complete_diagnosis_service.diagnose_place(place_id, store_name)
            
            if not place_details:
                raise Exception("플레이스 정보를 가져올 수 없습니다")
            
            # 2. 방문자 리뷰 실시간 분석 (독립적)
            visitor_review_count = place_details.get("visitor_review_count", 0)
            visitor_review_trends = await self._calculate_visitor_review_trends_realtime(
                place_id, 
                visitor_review_count
            )
            logger.info(f"[플레이스 활성화 V3-독립] 방문자 리뷰 추이: 7일={visitor_review_trends['last_7days_avg']:.2f}, 30일={visitor_review_trends['last_30days_avg']:.2f}, 60일={visitor_review_trends['last_60days_avg']:.2f}")
            
            # 3. 블로그 리뷰 실시간 분석
            blog_review_count = place_details.get("blog_review_count", 0)
            road_address = place_details.get("road_address", "")
            logger.info(f"[플레이스 활성화 V3-독립] 블로그 리뷰 실시간 분석 시작: place_id={place_id}, store_name={store_name}, total_count={blog_review_count}")
            blog_review_trends = await self._calculate_blog_review_trends_realtime(place_id, store_name, road_address, blog_review_count)
            logger.info(f"[플레이스 활성화 V3-독립] 블로그 리뷰 완료: 3일={blog_review_trends['last_3days_avg']:.2f}, 7일={blog_review_trends['last_7days_avg']:.2f}, 30일={blog_review_trends['last_30days_avg']:.2f}")
            
            # 4. 답글 대기 수 계산 (최근 300개 리뷰 기준)
            pending_reply_info = await self._get_pending_reply_count(place_id)
            logger.info(f"[플레이스 활성화 V3-독립] 답글 대기: {pending_reply_info['pending_count']}개 / {pending_reply_info['total_reviews']}개")
            
            # 5. 공지사항 분석 (최근 7일 내)
            announcement_info = await self._analyze_announcements(place_id)
            logger.info(f"[플레이스 활성화 V3-독립] 공지사항: 최근 7일 내 {announcement_info['count']}개")
            
            # 6. 프로모션 분석
            promotion_info = self._analyze_promotions(place_details.get('promotions', {}))
            
            # 7. SNS 및 웹사이트 분석
            sns_info = self._analyze_sns(place_details)
            
            # 8. 요약 카드 생성
            summary_cards = self._create_summary_cards(
                visitor_review_trends,
                blog_review_trends,
                pending_reply_info,
                promotion_info,
                announcement_info
            )
            
            # 9. 결과 조합
            logger.info(f"[활성화-결과조합] visitor_review_trends.last_3days_avg: {visitor_review_trends.get('last_3days_avg', 0)}")
            logger.info(f"[활성화-결과조합] summary_cards[0].value (visitor): {summary_cards[0]['value'] if summary_cards else 'N/A'}")
            
            result = {
                "store_name": store_name,
                "place_id": place_id,
                "thumbnail": place_details.get("image_url", ""),
                
                # 요약 카드
                "summary_cards": summary_cards,
                
                # 리뷰 추이
                "visitor_review_trends": visitor_review_trends,
                "blog_review_trends": blog_review_trends,
                "current_visitor_review_count": place_details.get("visitor_review_count", 0),
                "current_blog_review_count": blog_review_count,
                
                # 답글 정보
                "pending_reply_info": pending_reply_info,
                
                # 프로모션/공지
                "has_promotion": promotion_info["has_active"],
                "promotion_count": promotion_info["count"],
                "promotion_items": promotion_info["items"],
                "has_announcement": announcement_info["count"] > 0,
                "announcement_count": announcement_info["count"],
                "announcement_items": announcement_info["items"],
                "last_announcement_date": announcement_info.get("last_date"),
                "days_since_last_announcement": announcement_info.get("days_since_last"),
                
                # SNS 및 기타
                "description": place_details.get("description", ""),
                "directions": place_details.get("directions", ""),
                "homepage": place_details.get("homepage", ""),
                "instagram": place_details.get("instagram", ""),
                "facebook": place_details.get("facebook", ""),
                "blog": place_details.get("blog", ""),
                "has_smart_call": place_details.get("has_smart_call", False),
                "has_naver_pay": place_details.get("has_naverpay_in_search", False),
                "has_naver_booking": place_details.get("booking_available", False),
                "has_naver_order": place_details.get("has_naver_order", False),
                "has_naver_talk": sns_info.get("has_talk", False),
                "is_place_plus": place_details.get("is_place_plus", False),
            }
            
            logger.info(f"[플레이스 활성화 V3-독립] 완료")
            return result
            
        except Exception as e:
            logger.error(f"[플레이스 활성화 V3-독립] 오류: {str(e)}", exc_info=True)
            raise
    
    async def _calculate_visitor_review_trends_realtime(
        self, 
        place_id: str,
        total_visitor_review_count: int = 0
    ) -> Dict[str, Any]:
        """
        실시간으로 방문자 리뷰를 가져와서 일평균 계산 (완전 독립적)
        
        Args:
            place_id: 네이버 플레이스 ID
            total_visitor_review_count: 전체 방문자 리뷰 수 (API 실패 시 추정용)
            
        Returns:
            리뷰 추이 정보 (7일, 30일, 60일 일평균)
        """
        try:
            # 네이버 API는 size=100을 제한하므로, size=20으로 페이징
            all_reviews = []
            cursor = None
            max_pages = 15  # 최대 300개 (20 * 15)
            now = datetime.now(timezone.utc)
            oldest_needed_days = 60  # 60일치 데이터만 필요
            should_stop = False
            
            for page in range(max_pages):
                reviews_data = await naver_review_service.get_visitor_reviews(
                    place_id=place_id,
                    size=20,
                    after=cursor,
                    sort="recent"
                )
                
                if not reviews_data or not reviews_data.get("items"):
                    logger.warning(f"[활성화-실시간] 리뷰 API 실패 (페이지 {page+1}), 추정값 사용 (전체: {total_visitor_review_count}개)")
                    if page == 0:
                        # 첫 페이지부터 실패하면 추정값 사용
                        return self._calculate_visitor_review_trends_estimated(total_visitor_review_count)
                    else:
                        # 일부라도 가져왔으면 그것으로 계산
                        break
                
                items = reviews_data["items"]
                
                # 60일보다 오래된 리뷰가 나오면 더 이상 페이징 불필요
                for review in items:
                    created_str = review.get("created")
                    if created_str:
                        try:
                            review_date = datetime.fromisoformat(created_str.replace('Z', '+00:00'))
                            days_ago = (now - review_date).days
                            if days_ago > oldest_needed_days:
                                should_stop = True
                                break
                        except:
                            pass
                    all_reviews.append(review)
                
                if should_stop:
                    logger.info(f"[활성화-실시간] 60일 이상 리뷰 도달, 페이징 중단 (페이지 {page+1}, 총 {len(all_reviews)}개)")
                    break
                
                # 다음 페이지 확인
                cursor = reviews_data.get("nextCursor")
                if not cursor or not reviews_data.get("hasMore", False):
                    logger.info(f"[활성화-실시간] 모든 리뷰 조회 완료 (페이지 {page+1}, 총 {len(all_reviews)}개)")
                    break
            
            if not all_reviews:
                logger.warning(f"[활성화-실시간] 리뷰 없음, 추정값 사용 (전체: {total_visitor_review_count}개)")
                return self._calculate_visitor_review_trends_estimated(total_visitor_review_count)
            
            # 기간별 리뷰 개수 계산
            count_3d = 0
            count_7d = 0
            count_30d = 0
            count_60d = 0
            
            for review in all_reviews:
                created_str = review.get("created")
                if not created_str:
                    continue
                
                try:
                    # 날짜 파싱 (ISO 형식 또는 상대적 표기)
                    review_date = self._parse_review_date(created_str)
                    if not review_date:
                        continue
                    
                    days_ago = (now - review_date).days
                    
                    if days_ago <= 3:
                        count_3d += 1
                    if days_ago <= 7:
                        count_7d += 1
                    if days_ago <= 30:
                        count_30d += 1
                    if days_ago <= 60:
                        count_60d += 1
                except Exception as e:
                    logger.warning(f"[활성화-실시간] 날짜 파싱 실패: {created_str}, {str(e)}")
                    continue
            
            # 일평균 계산
            avg_3d = count_3d / 3 if count_3d > 0 else 0.0
            avg_7d = count_7d / 7 if count_7d > 0 else 0.0
            avg_30d = count_30d / 30 if count_30d > 0 else 0.0
            avg_60d = count_60d / 60 if count_60d > 0 else 0.0
            
            # 비교 분석 (3일 일평균 기준)
            comparisons = {
                'vs_last_7days': self._compare_values(avg_3d, avg_7d),
                'vs_last_30days': self._compare_values(avg_3d, avg_30d),
                'vs_last_60days': self._compare_values(avg_3d, avg_60d),
            }
            
            logger.info(f"[활성화-실시간] 방문자 리뷰: 3일={count_3d}개({avg_3d:.2f}/일), 7일={count_7d}개({avg_7d:.2f}/일), 30일={count_30d}개({avg_30d:.2f}/일), 60일={count_60d}개({avg_60d:.2f}/일)")
            
            return {
                'last_3days_avg': round(avg_3d, 2),
                'last_7days_avg': round(avg_7d, 2),
                'last_30days_avg': round(avg_30d, 2),
                'last_60days_avg': round(avg_60d, 2),
                'comparisons': comparisons
            }
            
        except Exception as e:
            logger.error(f"[활성화-실시간] 방문자 리뷰 추이 계산 실패: {str(e)}", exc_info=True)
            return self._get_empty_trend()
    
    def _calculate_visitor_review_trends_estimated(self, total_visitor_count: int) -> Dict[str, Any]:
        """
        방문자 리뷰 추정 (네이버 API 제한 시 사용)
        
        Args:
            total_visitor_count: 전체 방문자 리뷰 수
            
        Returns:
            리뷰 추이 정보 (추정값)
        """
        # 전체 방문자 리뷰 수 기반 추정 (1년 기준으로 균등 분포 가정)
        estimated_daily_avg = total_visitor_count / 365 if total_visitor_count > 0 else 0.0
        
        avg_3d = estimated_daily_avg
        avg_7d = estimated_daily_avg
        avg_30d = estimated_daily_avg
        avg_60d = estimated_daily_avg
        
        logger.info(f"[활성화-추정] 방문자 리뷰: 총 {total_visitor_count}개, 추정 일평균={estimated_daily_avg:.2f}")
        
        return {
            'last_3days_avg': round(avg_3d, 2),
            'last_7days_avg': round(avg_7d, 2),
            'last_30days_avg': round(avg_30d, 2),
            'last_60days_avg': round(avg_60d, 2),
            'comparisons': {
                'vs_last_7days': {'direction': 'stable', 'change': 0.0},
                'vs_last_30days': {'direction': 'stable', 'change': 0.0},
                'vs_last_60days': {'direction': 'stable', 'change': 0.0},
            }
        }
    
    async def _calculate_blog_review_trends_realtime(
        self, 
        place_id: str,
        store_name: str,
        road_address: str,
        total_blog_review_count: int
    ) -> Dict[str, Any]:
        """
        블로그 리뷰 추이 실시간 계산 (네이버 통합 검색 HTML 파싱 사용 - 활성화 전용)
        
        Args:
            place_id: 네이버 플레이스 ID (로깅용)
            store_name: 매장명 (검색 쿼리 및 필터링용)
            road_address: 도로명주소 (필터링용)
            total_blog_review_count: 전체 블로그 리뷰 수 (API 실패 시 추정용)
            
        Returns:
            리뷰 추이 정보 (7일, 30일, 60일 일평균)
        """
        logger.info(f"[활성화-블로그 실시간] 네이버 검색 시작: place_id={place_id}, store_name={store_name}, total={total_blog_review_count}")
        try:
            # 네이버 통합 검색에서 블로그 리뷰 가져오기 (제목 기반 필터링)
            all_reviews = await naver_review_service.get_blog_reviews_html(
                place_id=place_id,
                store_name=store_name,
                road_address=road_address,
                max_pages=10  # 사용 안 함 (호환성)
            )
            
            if not all_reviews:
                logger.warning(f"[활성화-블로그 HTML] 매칭된 블로그가 없음, 0으로 처리")
                return {
                    'last_3days_avg': 0.0,
                    'last_7days_avg': 0.0,
                    'last_30days_avg': 0.0,
                    'last_60days_avg': 0.0,
                    'comparisons': {
                        'vs_last_7days': {'direction': 'stable', 'change': 0.0},
                        'vs_last_30days': {'direction': 'stable', 'change': 0.0},
                        'vs_last_60days': {'direction': 'stable', 'change': 0.0},
                    }
                }
            
            logger.info(f"[활성화-블로그 HTML] 파싱 완료: {len(all_reviews)}개")
            
            # 날짜가 있는 리뷰만 필터링
            reviews_with_date = [r for r in all_reviews if r.get("date")]
            logger.info(f"[활성화-블로그 HTML] 날짜 있는 리뷰: {len(reviews_with_date)}개 / {len(all_reviews)}개")
            
            # 날짜가 있는 리뷰가 0개이면 0으로 처리 (추정값 사용 안 함)
            if len(reviews_with_date) == 0:
                logger.warning(f"[활성화-블로그 HTML] 날짜 있는 리뷰가 없음, 0으로 처리")
                return {
                    'last_3days_avg': 0.0,
                    'last_7days_avg': 0.0,
                    'last_30days_avg': 0.0,
                    'last_60days_avg': 0.0,
                    'comparisons': {
                        'vs_last_7days': {'direction': 'stable', 'change': 0.0},
                        'vs_last_30days': {'direction': 'stable', 'change': 0.0},
                        'vs_last_60days': {'direction': 'stable', 'change': 0.0},
                    }
                }
            
            # 날짜 기준으로 정렬 (최신순)
            reviews_with_date.sort(key=lambda x: x.get("date", ""), reverse=True)
            all_reviews = reviews_with_date  # 날짜 있는 리뷰만 사용
            
            now = datetime.now(timezone.utc)
            
            # 기간별 리뷰 개수 계산
            count_3d = 0
            count_7d = 0
            count_30d = 0
            count_60d = 0
            
            # 디버깅용: 처음 10개 리뷰의 날짜 출력
            for idx, review in enumerate(all_reviews[:10]):
                date_str = review.get("date")
                date_string = review.get("dateString", "N/A")
                title = review.get("title", "N/A")[:50]
                logger.info(f"[블로그 리뷰 #{idx+1}] 날짜: {date_str}, 원본: {date_string}, 제목: {title}")
            
            for review in all_reviews:
                date_str = review.get("date")  # ISO 형식 문자열
                if not date_str:
                    continue
                
                try:
                    # ISO 형식 날짜 파싱
                    review_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    if review_date.tzinfo is None:
                        review_date = review_date.replace(tzinfo=timezone.utc)
                    
                    days_ago = (now - review_date).days
                    
                    if days_ago <= 3:
                        count_3d += 1
                    if days_ago <= 7:
                        count_7d += 1
                    if days_ago <= 30:
                        count_30d += 1
                    if days_ago <= 60:
                        count_60d += 1
                except Exception as e:
                    logger.warning(f"[활성화-블로그 HTML] 날짜 파싱 실패: {date_str}, {str(e)}")
                    continue
            
            # 일평균 계산
            avg_3d = count_3d / 3 if count_3d > 0 else 0.0
            avg_7d = count_7d / 7 if count_7d > 0 else 0.0
            avg_30d = count_30d / 30 if count_30d > 0 else 0.0
            avg_60d = count_60d / 60 if count_60d > 0 else 0.0
            
            # 비교 분석 (3일 일평균 기준)
            comparisons = {
                'vs_last_7days': self._compare_values(avg_3d, avg_7d),
                'vs_last_30days': self._compare_values(avg_3d, avg_30d),
                'vs_last_60days': self._compare_values(avg_3d, avg_60d),
            }
            
            logger.info(f"[활성화-블로그 HTML] 블로그 리뷰: 3일={count_3d}개({avg_3d:.2f}/일), 7일={count_7d}개({avg_7d:.2f}/일), 30일={count_30d}개({avg_30d:.2f}/일), 60일={count_60d}개({avg_60d:.2f}/일)")
            
            return {
                'last_3days_avg': round(avg_3d, 2),
                'last_7days_avg': round(avg_7d, 2),
                'last_30days_avg': round(avg_30d, 2),
                'last_60days_avg': round(avg_60d, 2),
                'comparisons': comparisons
            }
            
        except Exception as e:
            logger.error(f"[활성화-블로그 HTML] 블로그 리뷰 추이 계산 실패: {str(e)}", exc_info=True)
            return self._calculate_blog_review_trends_estimated(total_blog_review_count)
    
    def _parse_blog_review_date(self, date_str: str) -> Optional[datetime]:
        """
        블로그 리뷰 날짜 파싱
        
        지원 형식:
        - "2025.09.30."
        - "25.9.30.화"
        - "14시간 전", "3일 전"
        """
        try:
            date_str = date_str.strip()
            
            # "2025.09.30." 형식
            if date_str.count('.') >= 2:
                parts = date_str.replace('.', '').split()
                if parts:
                    date_only = parts[0]
                    # "20250930" 또는 "250930" 형식
                    if len(date_only) == 8:  # "20250930"
                        year = int(date_only[:4])
                        month = int(date_only[4:6])
                        day = int(date_only[6:8])
                    elif len(date_only) == 6:  # "250930"
                        year = 2000 + int(date_only[:2])
                        month = int(date_only[2:4])
                        day = int(date_only[4:6])
                    else:
                        # "2025.9.30" 형식
                        date_parts = date_str.split('.')
                        if len(date_parts) >= 3:
                            year = int(date_parts[0])
                            if year < 100:
                                year = 2000 + year
                            month = int(date_parts[1])
                            day = int(date_parts[2])
                        else:
                            return None
                    
                    return datetime(year, month, day, tzinfo=timezone.utc)
            
            # "X일 전", "X시간 전" 형식
            if "일 전" in date_str:
                days = int(date_str.split("일")[0].strip())
                return datetime.now(timezone.utc) - timedelta(days=days)
            elif "시간 전" in date_str:
                hours = int(date_str.split("시간")[0].strip())
                return datetime.now(timezone.utc) - timedelta(hours=hours)
            elif "분 전" in date_str:
                minutes = int(date_str.split("분")[0].strip())
                return datetime.now(timezone.utc) - timedelta(minutes=minutes)
            
        except Exception as e:
            logger.debug(f"[활성화-블로그 날짜파싱] 실패: {date_str}, {str(e)}")
        
        return None
    
    def _calculate_blog_review_trends_estimated(self, total_blog_count: int) -> Dict[str, Any]:
        """
        블로그 리뷰 추정 (네이버 API 미지원으로 추정값 사용)
        
        Args:
            total_blog_count: 전체 블로그 리뷰 수
            
        Returns:
            리뷰 추이 정보 (추정값)
        """
        # 전체 블로그 리뷰 수 기반 추정 (1년 기준으로 균등 분포 가정)
        estimated_daily_avg = total_blog_count / 365 if total_blog_count > 0 else 0.0
        
        avg_3d = estimated_daily_avg
        avg_7d = estimated_daily_avg
        avg_30d = estimated_daily_avg
        avg_60d = estimated_daily_avg
        
        logger.info(f"[활성화-추정] 블로그 리뷰: 총 {total_blog_count}개, 추정 일평균={estimated_daily_avg:.2f}")
        
        return {
            'last_3days_avg': round(avg_3d, 2),
            'last_7days_avg': round(avg_7d, 2),
            'last_30days_avg': round(avg_30d, 2),
            'last_60days_avg': round(avg_60d, 2),
            'comparisons': {
                'vs_last_7days': {'direction': 'stable', 'change': 0.0},
                'vs_last_30days': {'direction': 'stable', 'change': 0.0},
                'vs_last_60days': {'direction': 'stable', 'change': 0.0},
            }
        }
    
    async def _get_pending_reply_count(self, place_id: str) -> Dict[str, Any]:
        """
        답글 대기 중인 리뷰 수 계산 (최근 300개 기준)
        
        Args:
            place_id: 네이버 플레이스 ID
            
        Returns:
            답글 정보 (대기 수, 답글률, 가장 오래된 날짜)
        """
        try:
            # 최근 300개 리뷰 가져오기 (AI 답글 기능과 동일)
            all_reviews = []
            cursor = None
            max_iterations = 15  # 300개 가져오기 위해 (20개씩 15번)
            
            for i in range(max_iterations):
                reviews_data = await naver_review_service.get_visitor_reviews(
                    place_id=place_id,
                    size=20,
                    sort="recent",
                    after=cursor
                )
                
                if not reviews_data or not reviews_data.get("items"):
                    break
                
                all_reviews.extend(reviews_data["items"])
                
                if len(all_reviews) >= 300:
                    all_reviews = all_reviews[:300]
                    break
                
                if not reviews_data.get("has_more"):
                    break
                
                cursor = reviews_data.get("last_cursor")
                if not cursor:
                    break
            
            total_reviews = len(all_reviews)
            
            if total_reviews == 0:
                logger.warning(f"[활성화-답글] 리뷰 없음")
                return {
                    "total_reviews": 0,
                    "pending_count": 0,
                    "replied_count": 0,
                    "reply_rate": 0.0,
                    "oldest_pending_date": None
                }
            
            # 답글 대기 중인 리뷰 찾기
            pending_reviews = []
            replied_count = 0
            
            for review in all_reviews:
                reply = review.get("reply", {})
                reply_text = reply.get("body", "") if reply else ""
                
                if reply_text and reply_text.strip():
                    replied_count += 1
                else:
                    pending_reviews.append(review)
            
            pending_count = len(pending_reviews)
            reply_rate = (replied_count / total_reviews * 100) if total_reviews > 0 else 0.0
            
            # 가장 오래된 답글 대기 리뷰 찾기
            oldest_pending_date = None
            if pending_reviews:
                oldest_review = min(pending_reviews, key=lambda r: r.get("created", "9999-12-31"))
                oldest_pending_date = oldest_review.get("created")
            
            logger.info(f"[활성화-답글] 총 {total_reviews}개 중 답글대기 {pending_count}개 ({reply_rate:.1f}% 답글완료)")
            
            return {
                "total_reviews": total_reviews,
                "pending_count": pending_count,
                "replied_count": replied_count,
                "reply_rate": round(reply_rate, 1),
                "oldest_pending_date": oldest_pending_date
            }
            
        except Exception as e:
            logger.error(f"[활성화-답글] 계산 실패: {str(e)}", exc_info=True)
            return {
                "total_reviews": 0,
                "pending_count": 0,
                "replied_count": 0,
                "reply_rate": 0.0,
                "oldest_pending_date": None
            }
    
    async def _analyze_announcements(self, place_id: str) -> Dict[str, Any]:
        """
        공지사항 분석 (최근 7일 내)
        
        Args:
            place_id: 네이버 플레이스 ID
            
        Returns:
            공지사항 정보 (개수, 마지막 날짜, 내용 리스트)
        """
        try:
            announcements = await additional_info_service.get_announcements(place_id)
            
            if not announcements:
                return {"count": 0, "last_date": None, "days_since_last": 999, "items": []}
            
            now = datetime.now()
            recent_items = []
            latest_days = 999
            latest_date = None
            
            for ann in announcements:
                relative = ann.get("relativeCreated", "")
                
                if relative and "일 전" in relative:
                    try:
                        days_ago = int(relative.split("일")[0].strip())
                        
                        if days_ago <= 7:
                            recent_items.append({
                                "title": ann.get("title", ""),
                                "content": ann.get("content", ""),
                                "days_ago": days_ago,
                                "relative": relative
                            })
                        
                        if days_ago < latest_days:
                            latest_days = days_ago
                            latest_date = (now - timedelta(days=days_ago)).isoformat()
                    except:
                        pass
            
            logger.info(f"[활성화-공지] 최근 7일 내 {len(recent_items)}개, 최신은 {latest_days}일 전")
            
            return {
                "count": len(recent_items),
                "last_date": latest_date,
                "days_since_last": latest_days,
                "items": recent_items
            }
            
        except Exception as e:
            logger.error(f"[활성화-공지] 분석 실패: {str(e)}", exc_info=True)
            return {"count": 0, "last_date": None, "days_since_last": 999, "items": []}
    
    def _analyze_promotions(self, promotions: Dict[str, Any]) -> Dict[str, Any]:
        """프로모션 분석"""
        if not promotions or not isinstance(promotions, dict):
            return {"has_active": False, "count": 0, "items": []}
        
        coupons = promotions.get("coupons", [])
        count = len(coupons) if coupons else 0
        
        # 쿠폰 정보 추출
        coupon_items = []
        if coupons:
            for coupon in coupons:
                if isinstance(coupon, dict):
                    coupon_items.append({
                        "title": coupon.get("title", ""),
                        "description": coupon.get("description", ""),
                        "discount": coupon.get("discount", "")
                    })
        
        return {
            "has_active": count > 0,
            "count": count,
            "items": coupon_items
        }
    
    def _analyze_sns(self, place_details: Dict[str, Any]) -> Dict[str, Any]:
        """SNS 및 웹사이트 분석"""
        return {
            "has_instagram": bool(place_details.get("instagram")),
            "has_blog": bool(place_details.get("blog")),
            "has_homepage": bool(place_details.get("homepage")),
            "has_talk": place_details.get("has_naver_talk", False)
        }
    
    def _create_summary_cards(
        self,
        visitor_trends: Dict[str, Any],
        blog_trends: Dict[str, Any],
        pending_info: Dict[str, Any],
        promotion_info: Dict[str, Any],
        announcement_info: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """활성화 요약 카드 생성"""
        
        # 방문자 리뷰 카드 (3일 일평균 메인)
        visitor_3d_avg = visitor_trends.get('last_3days_avg', 0)
        visitor_7d_avg = visitor_trends.get('last_7days_avg', 0)
        visitor_30d_avg = visitor_trends.get('last_30days_avg', 0)
        
        # vs 7일/30일 비교 비율 (추이 카드와 동일한 값 사용)
        visitor_vs_7d_pct = visitor_trends.get('comparisons', {}).get('vs_last_7days', {}).get('change', 0.0)
        visitor_vs_30d_pct = visitor_trends.get('comparisons', {}).get('vs_last_30days', {}).get('change', 0.0)
        
        # 블로그 리뷰 카드 (3일 일평균 메인)
        blog_3d_avg = blog_trends.get('last_3days_avg', 0)
        blog_7d_avg = blog_trends.get('last_7days_avg', 0)
        blog_30d_avg = blog_trends.get('last_30days_avg', 0)
        
        # vs 7일/30일 비교 비율 (추이 카드와 동일한 값 사용)
        blog_vs_7d_pct = blog_trends.get('comparisons', {}).get('vs_last_7days', {}).get('change', 0.0)
        blog_vs_30d_pct = blog_trends.get('comparisons', {}).get('vs_last_30days', {}).get('change', 0.0)
        
        logger.info(f"[활성화-카드생성] 방문자 리뷰 3일 일평균: {visitor_3d_avg}, 7일: {visitor_7d_avg}, 30일: {visitor_30d_avg}")
        logger.info(f"[활성화-카드생성] 블로그 리뷰 3일 일평균: {blog_3d_avg}, 7일: {blog_7d_avg}, 30일: {blog_30d_avg}")
        
        cards = [
            {
                "type": "visitor_review",
                "title": "방문자 리뷰",
                "value": visitor_3d_avg,  # 3일 일평균
                "daily_avg": visitor_3d_avg,
                "vs_7d_pct": round(visitor_vs_7d_pct, 1),
                "vs_30d_pct": round(visitor_vs_30d_pct, 1),
                "avg_7d": visitor_7d_avg,
                "avg_30d": visitor_30d_avg
            },
            {
                "type": "pending_reply",
                "title": "답글 대기",
                "value": pending_info.get("pending_count", 0),
                "total": pending_info.get("total_reviews", 0),
                "reply_rate": pending_info.get("reply_rate", 0.0)
            },
            {
                "type": "blog_review",
                "title": "블로그 리뷰",
                "value": blog_3d_avg,  # 3일 일평균
                "daily_avg": blog_3d_avg,
                "vs_7d_pct": round(blog_vs_7d_pct, 1),
                "vs_30d_pct": round(blog_vs_30d_pct, 1),
                "avg_7d": blog_7d_avg,
                "avg_30d": blog_30d_avg
            },
            {
                "type": "coupon",
                "title": "쿠폰",
                "value": promotion_info.get("count", 0),
                "has_active": promotion_info.get("has_active", False)
            },
            {
                "type": "announcement",
                "title": "공지사항",
                "value": announcement_info.get("count", 0),
                "days_since_last": announcement_info.get("days_since_last", 999)
            }
        ]
        
        return cards
    
    def _get_trend_direction(self, current: float, baseline: float) -> str:
        """추이 방향 판단"""
        if current == 0 and baseline == 0:
            return "stable"
        
        diff = current - baseline
        change_rate = abs(diff / baseline * 100) if baseline > 0 else 0
        
        if change_rate < 10:
            return "stable"
        elif diff > 0:
            return "up"
        else:
            return "down"
    
    def _parse_review_date(self, date_str: str) -> Optional[datetime]:
        """
        리뷰 날짜 파싱 (ISO 형식 또는 상대적 표기)
        
        Args:
            date_str: 날짜 문자열 (예: "2024-01-27T10:30:00+09:00" 또는 "1.27.전" 또는 "1.23.금")
            
        Returns:
            datetime 객체 또는 None
        """
        try:
            # 1. ISO 형식 시도
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except:
            pass
        
        try:
            # 2. 상대적 날짜 표기 파싱 (예: "1.27.전", "1.23.금")
            import re
            from datetime import timedelta
            
            # "M.D.전" 또는 "M.D.요일" 형식
            match = re.match(r'(\d+)\.(\d+)\.', date_str)
            if match:
                month = int(match.group(1))
                day = int(match.group(2))
                current_date = datetime.now(timezone.utc)
                
                # 올해 날짜로 생성
                try:
                    review_date = datetime(current_date.year, month, day, tzinfo=timezone.utc)
                    
                    # 미래 날짜면 작년으로 조정
                    if review_date > current_date:
                        review_date = datetime(current_date.year - 1, month, day, tzinfo=timezone.utc)
                    
                    return review_date
                except ValueError:
                    pass
            
            # "X일 전", "X시간 전" 형식
            if "일 전" in date_str:
                days = int(date_str.split("일")[0].strip())
                return datetime.now(timezone.utc) - timedelta(days=days)
            elif "시간 전" in date_str:
                hours = int(date_str.split("시간")[0].strip())
                return datetime.now(timezone.utc) - timedelta(hours=hours)
            elif "분 전" in date_str:
                minutes = int(date_str.split("분")[0].strip())
                return datetime.now(timezone.utc) - timedelta(minutes=minutes)
            
        except Exception as e:
            logger.debug(f"[활성화-날짜파싱] 실패: {date_str}, {str(e)}")
        
        return None
    
    def _compare_values(self, current: float, baseline: float) -> Dict[str, Any]:
        """값 비교 분석"""
        if current == 0 and baseline == 0:
            return {"direction": "stable", "change": 0.0}
        
        diff = current - baseline
        change_rate = (diff / baseline * 100) if baseline > 0 else 0
        
        if abs(change_rate) < 10:
            direction = "stable"
        elif diff > 0:
            direction = "up"
        else:
            direction = "down"
        
        return {
            "direction": direction,
            "change": round(change_rate, 1)  # 소수점 한 자리로 통일
        }
    
    def _get_empty_trend(self) -> Dict[str, Any]:
        """빈 추이 데이터 반환"""
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


# 싱글톤 인스턴스
activation_service_v3 = NaverActivationServiceV3()
