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
            visitor_review_trends = await self._calculate_visitor_review_trends_realtime(place_id)
            logger.info(f"[플레이스 활성화 V3-독립] 방문자 리뷰 추이: 7일={visitor_review_trends['last_7days_avg']:.2f}, 30일={visitor_review_trends['last_30days_avg']:.2f}, 60일={visitor_review_trends['last_60days_avg']:.2f}")
            
            # 3. 블로그 리뷰 추정 분석 (API 미지원)
            blog_review_count = place_details.get("blog_review_count", 0)
            blog_review_trends = self._calculate_blog_review_trends_estimated(blog_review_count)
            logger.info(f"[플레이스 활성화 V3-독립] 블로그 리뷰 추정: 일평균={blog_review_trends['last_7days_avg']:.2f}")
            
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
                "has_announcement": announcement_info["count"] > 0,
                "announcement_count": announcement_info["count"],
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
                "has_naver_talk": sns_info.get("has_talk", False),
            }
            
            logger.info(f"[플레이스 활성화 V3-독립] 완료")
            return result
            
        except Exception as e:
            logger.error(f"[플레이스 활성화 V3-독립] 오류: {str(e)}", exc_info=True)
            raise
    
    async def _calculate_visitor_review_trends_realtime(self, place_id: str) -> Dict[str, Any]:
        """
        실시간으로 방문자 리뷰를 가져와서 일평균 계산 (완전 독립적)
        
        Args:
            place_id: 네이버 플레이스 ID
            
        Returns:
            리뷰 추이 정보 (7일, 30일, 60일 일평균)
        """
        try:
            # 최근 100개 리뷰 가져오기 (실시간)
            reviews_data = await naver_review_service.get_visitor_reviews(
                place_id=place_id,
                size=100,
                sort="recent"
            )
            
            if not reviews_data or not reviews_data.get("items"):
                logger.warning(f"[활성화-실시간] 리뷰 데이터 없음")
                return self._get_empty_trend()
            
            items = reviews_data["items"]
            now = datetime.now(timezone.utc)
            
            # 기간별 리뷰 개수 계산
            count_7d = 0
            count_30d = 0
            count_60d = 0
            
            for review in items:
                created_str = review.get("created")
                if not created_str:
                    continue
                
                try:
                    # ISO 날짜 파싱 (예: "2024-01-27T10:30:00+09:00")
                    review_date = datetime.fromisoformat(created_str.replace('Z', '+00:00'))
                    days_ago = (now - review_date).days
                    
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
            avg_7d = count_7d / 7 if count_7d > 0 else 0.0
            avg_30d = count_30d / 30 if count_30d > 0 else 0.0
            avg_60d = count_60d / 60 if count_60d > 0 else 0.0
            
            # 비교 분석 (7일 일평균 기준)
            comparisons = {
                'vs_last_7days': self._compare_values(avg_7d, avg_7d),
                'vs_last_30days': self._compare_values(avg_7d, avg_30d),
                'vs_last_60days': self._compare_values(avg_7d, avg_60d),
            }
            
            logger.info(f"[활성화-실시간] 방문자 리뷰: 7일={count_7d}개({avg_7d:.2f}/일), 30일={count_30d}개({avg_30d:.2f}/일), 60일={count_60d}개({avg_60d:.2f}/일)")
            
            return {
                'last_7days_avg': round(avg_7d, 2),
                'last_30days_avg': round(avg_30d, 2),
                'last_60days_avg': round(avg_60d, 2),
                'comparisons': comparisons
            }
            
        except Exception as e:
            logger.error(f"[활성화-실시간] 방문자 리뷰 추이 계산 실패: {str(e)}", exc_info=True)
            return self._get_empty_trend()
    
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
        
        avg_7d = estimated_daily_avg
        avg_30d = estimated_daily_avg
        avg_60d = estimated_daily_avg
        
        logger.info(f"[활성화-추정] 블로그 리뷰: 총 {total_blog_count}개, 추정 일평균={estimated_daily_avg:.2f}")
        
        return {
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
            공지사항 정보 (개수, 마지막 날짜)
        """
        try:
            announcements = await additional_info_service.get_announcements(place_id)
            
            if not announcements:
                return {"count": 0, "last_date": None, "days_since_last": 999}
            
            now = datetime.now()
            recent_count = 0
            latest_days = 999
            latest_date = None
            
            for ann in announcements:
                relative = ann.get("relativeCreated", "")
                
                if relative and "일 전" in relative:
                    try:
                        days_ago = int(relative.split("일")[0].strip())
                        
                        if days_ago <= 7:
                            recent_count += 1
                        
                        if days_ago < latest_days:
                            latest_days = days_ago
                            latest_date = (now - timedelta(days=days_ago)).isoformat()
                    except:
                        pass
            
            logger.info(f"[활성화-공지] 최근 7일 내 {recent_count}개, 최신은 {latest_days}일 전")
            
            return {
                "count": recent_count,
                "last_date": latest_date,
                "days_since_last": latest_days
            }
            
        except Exception as e:
            logger.error(f"[활성화-공지] 분석 실패: {str(e)}", exc_info=True)
            return {"count": 0, "last_date": None, "days_since_last": 999}
    
    def _analyze_promotions(self, promotions: Dict[str, Any]) -> Dict[str, Any]:
        """프로모션 분석"""
        if not promotions or not isinstance(promotions, dict):
            return {"has_active": False, "count": 0}
        
        coupons = promotions.get("coupons", [])
        count = len(coupons) if coupons else 0
        
        return {
            "has_active": count > 0,
            "count": count
        }
    
    def _analyze_sns(self, place_details: Dict[str, Any]) -> Dict[str, Any]:
        """SNS 및 웹사이트 분석"""
        return {
            "has_instagram": bool(place_details.get("instagram")),
            "has_blog": bool(place_details.get("blog")),
            "has_homepage": bool(place_details.get("homepage")),
            "has_talk": False  # 별도 API 필요
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
        
        # 방문자 리뷰 카드
        visitor_7d_avg = visitor_trends.get('last_7days_avg', 0)
        visitor_30d_avg = visitor_trends.get('last_30days_avg', 0)
        visitor_60d_avg = visitor_trends.get('last_60days_avg', 0)
        visitor_trend = self._get_trend_direction(visitor_7d_avg, visitor_30d_avg)
        
        # 블로그 리뷰 카드
        blog_7d_avg = blog_trends.get('last_7days_avg', 0)
        blog_30d_avg = blog_trends.get('last_30days_avg', 0)
        blog_60d_avg = blog_trends.get('last_60days_avg', 0)
        blog_trend = self._get_trend_direction(blog_7d_avg, blog_30d_avg)
        
        cards = [
            {
                "type": "visitor_review",
                "title": "방문자 리뷰",
                "value": visitor_7d_avg,
                "daily_avg": visitor_7d_avg,
                "trend": visitor_trend,
                "comparison_30d": visitor_30d_avg,
                "comparison_60d": visitor_60d_avg
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
                "value": blog_7d_avg,
                "daily_avg": blog_7d_avg,
                "trend": blog_trend,
                "comparison_30d": blog_30d_avg,
                "comparison_60d": blog_60d_avg
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
            "change": round(change_rate, 1)
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
