"""
네이버 플레이스 경쟁매장 분석 서비스

키워드 기반으로 상위 노출 매장들을 분석하고 우리 매장과 비교
(매장명 검색량 포함 + NoneType 에러 완전 수정)
"""
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
import asyncio
import re

from .naver_search_api_unofficial import NaverPlaceNewAPIService
from .naver_complete_diagnosis_service import complete_diagnosis_service
from .naver_diagnosis_engine import diagnosis_engine
from .llm_recommendation_service import llm_recommendation_service
from .naver_keyword_search_volume_service import NaverKeywordSearchVolumeService
from .naver_review_service import NaverReviewService

logger = logging.getLogger(__name__)


class NaverCompetitorAnalysisService:
    """경쟁매장 분석 서비스"""
    
    def __init__(self):
        self.search_service = NaverPlaceNewAPIService()
        self.review_service = NaverReviewService()
    
    async def get_top_competitors(
        self,
        keyword: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        키워드로 상위 노출 매장 검색
        
        Args:
            keyword: 검색 키워드
            limit: 가져올 매장 수 (기본 20개)
            
        Returns:
            상위 매장 목록 (기본 정보 포함)
        """
        logger.info(f"[경쟁분석] 키워드 '{keyword}' 상위 {limit}개 매장 검색")
        
        try:
            # 네이버 검색 API로 매장 검색
            stores = await self.search_service.search_stores(keyword, max_results=limit)
            
            # 상위 limit개만 추출
            top_stores = stores[:limit]
            
            logger.info(f"[경쟁분석] {len(top_stores)}개 매장 검색 완료")
            return top_stores
            
        except Exception as e:
            logger.error(f"[경쟁분석] 검색 실패: {str(e)}")
            raise
    
    async def analyze_competitor(
        self,
        place_id: str,
        rank: int,
        store_name: str = None
    ) -> Optional[Dict[str, Any]]:
        """
        경쟁 매장 상세 분석 (플레이스 진단 실행)
        
        Args:
            place_id: 네이버 플레이스 ID
            rank: 검색 순위
            store_name: 매장명 (선택, 제공하면 정확도 향상)
            
        Returns:
            매장 상세 정보 + 진단 결과
        """
        logger.info(f"[경쟁분석] 매장 {place_id} (순위 {rank}, 이름: {store_name}) 분석 시작")
        
        try:
            # 완전한 플레이스 정보 수집 (store_name 전달)
            logger.info(f"[경쟁분석-DEBUG] Step 1: diagnose_place 호출")
            place_data = await complete_diagnosis_service.diagnose_place(place_id, store_name)
            
            if not place_data:
                logger.warning(f"[경쟁분석] 매장 {place_id} 정보 수집 실패")
                return None
            
            # 플레이스 진단 실행
            logger.info(f"[경쟁분석-DEBUG] Step 2: diagnosis_engine.diagnose 호출")
            diagnosis_result = diagnosis_engine.diagnose(place_data)
            
            # 7일간 리뷰 통계 추출 (정확한 데이터 수집 - API 직접 호출)
            logger.info(f"[경쟁분석-DEBUG] Step 3: 방문자 리뷰 통계 계산 (API 직접 호출)")
            visitor_reviews_7d = await self._calculate_visitor_reviews_accurate(
                place_id,
                place_data.get("visitor_review_count", 0)
            )
            logger.info(f"[경쟁분석-DEBUG] Step 4: 블로그 리뷰 통계 계산 (HTML 파싱)")
            blog_reviews_7d = await self._calculate_blog_reviews_accurate(
                place_id,
                store_name or place_data.get("name", ""),
                place_data.get("road_address", ""),
                place_data.get("blog_review_count", 0)
            )
            
            # 공지 통계
            logger.info(f"[경쟁분석-DEBUG] Step 5: 공지 통계 계산")
            recent_announcements = self._count_recent_announcements(
                place_data.get("announcements") or [],
                days=7
            )
            
            # 중요 리뷰 (네이버 하이라이트 리뷰)
            micro_reviews = place_data.get("micro_reviews") or []
            important_review = ""
            if micro_reviews and len(micro_reviews) > 0:
                # 네이버가 하이라이트한 첫 번째 리뷰 사용
                first_review = micro_reviews[0]
                if isinstance(first_review, dict):
                    important_review = first_review.get("sentence", "") or first_review.get("description", "")
                elif isinstance(first_review, str):
                    important_review = first_review
            
            # 네이버 서비스 정확한 데이터 (HTML 파싱 결과)
            # has_naverpay_in_search: 검색 결과에서 확인한 네이버페이 사용 여부
            supports_naverpay = place_data.get("has_naverpay_in_search", False)
            has_naver_talk = place_data.get("has_naver_talk", False)
            has_naver_order = place_data.get("has_naver_order", False)
            
            # 쿠폰 보유 여부 확인
            promotions = place_data.get("promotions") or {}
            coupons = promotions.get("coupons") if isinstance(promotions, dict) else []
            has_coupon = len(coupons or []) > 0
            
            # 전체 리뷰수 계산
            visitor_review_count = place_data.get("visitor_review_count", 0)
            blog_review_count = place_data.get("blog_review_count", 0)
            total_review_count = visitor_review_count + blog_review_count
            
            # 네이버 예약 여부 확인
            has_naver_booking = place_data.get("has_reservation", False) or place_data.get("booking_available", False)
            
            # 매장명 검색량 조회 (음절별 로직)
            store_search_volume = await self._get_store_search_volume(place_data.get("name", ""))
            
            # 결과 조합
            result = {
                "rank": rank,
                "place_id": place_id,
                "name": place_data.get("name", ""),
                "category": place_data.get("category", ""),
                "address": place_data.get("address", ""),
                
                # 진단 점수
                "diagnosis_score": diagnosis_result.get("total_score", 0),
                "diagnosis_grade": diagnosis_result.get("grade", "N/A"),
                
                # 리뷰 통계
                "visitor_review_count": visitor_review_count,
                "blog_review_count": blog_review_count,
                "total_review_count": total_review_count,
                
                # 7일 통계
                "visitor_reviews_7d_avg": round(visitor_reviews_7d / 7, 1),
                "blog_reviews_7d_avg": round(blog_reviews_7d / 7, 1),
                "announcements_7d": recent_announcements,
                
                # 기타 정보
                "has_coupon": has_coupon,
                "is_place_plus": place_data.get("is_place_plus", False),
                "is_new_business": place_data.get("is_new_business", False),
                "supports_naverpay": supports_naverpay,
                "has_naver_talk": has_naver_talk,  # 네이버톡톡
                "has_naver_order": has_naver_order,  # 네이버주문
                "has_naver_booking": has_naver_booking,  # 네이버 예약
                "store_search_volume": store_search_volume,  # 매장명 검색량
                "important_review": important_review,  # 네이버 하이라이트 리뷰
                
                # 전체 데이터 (상세 분석용)
                "full_data": place_data,
                "diagnosis_details": diagnosis_result,
            }
            
            logger.info(f"[경쟁분석] 매장 {place_id} 분석 완료 (점수: {result['diagnosis_score']})")
            return result
            
        except Exception as e:
            import traceback
            logger.error(f"[경쟁분석] 매장 {place_id} 분석 실패: {str(e)}")
            logger.error(f"[경쟁분석] Traceback:\n{traceback.format_exc()}")
            return None
    
    async def analyze_all_competitors(
        self,
        keyword: str,
        limit: int = 20,
        callback = None
    ) -> List[Dict[str, Any]]:
        """
        키워드로 검색된 모든 경쟁매장 분석
        
        Args:
            keyword: 검색 키워드
            limit: 분석할 매장 수
            callback: 진행 상황 콜백 함수 (optional)
            
        Returns:
            분석된 매장 목록
        """
        logger.info(f"[경쟁분석] 키워드 '{keyword}' 전체 분석 시작 (최대 {limit}개)")
        
        # 1단계: 상위 매장 검색
        top_stores = await self.get_top_competitors(keyword, limit)
        
        if callback:
            callback({
                "stage": "search_completed",
                "total": len(top_stores),
                "stores": top_stores
            })
        
        # 2단계: 각 매장 상세 분석
        analyzed_stores = []
        
        for idx, store in enumerate(top_stores, start=1):
            place_id = store.get("place_id")
            
            if not place_id:
                logger.warning(f"[경쟁분석] 순위 {idx} 매장 ID 없음")
                continue
            
            # 분석 실행 (store_name 전달)
            result = await self.analyze_competitor(
                place_id=place_id,
                rank=idx,
                store_name=store.get("name", "")
            )
            
            if result:
                analyzed_stores.append(result)
            
            # 진행 상황 콜백
            if callback:
                callback({
                    "stage": "analyzing",
                    "current": idx,
                    "total": len(top_stores),
                    "place_name": store.get("name", ""),
                    "completed": result is not None
                })
            
            # Rate limiting (1초 대기)
            await asyncio.sleep(1.0)
        
        logger.info(f"[경쟁분석] 전체 분석 완료: {len(analyzed_stores)}/{len(top_stores)}개 성공")
        
        if callback:
            callback({
                "stage": "completed",
                "total": len(analyzed_stores),
                "analyzed_stores": analyzed_stores
            })
        
        return analyzed_stores
    
    async def compare_with_my_store(
        self,
        my_store_data: Dict[str, Any],
        competitors: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        우리 매장과 경쟁사 비교 분석
        
        Args:
            my_store_data: 우리 매장 분석 결과
            competitors: 경쟁매장 분석 결과 리스트
            
        Returns:
            비교 분석 결과
        """
        logger.info(f"[경쟁분석] 우리 매장 vs 경쟁사 {len(competitors)}개 비교")
        
        if not competitors:
            return {
                "error": "비교할 경쟁매장이 없습니다"
            }
        
        # Top 5와 Top 20 분리
        top5_competitors = competitors[:5] if len(competitors) >= 5 else competitors
        top20_competitors = competitors[:20]
        
        # Top 5 평균 계산
        avg_diagnosis_score_top5 = sum(c["diagnosis_score"] for c in top5_competitors) / len(top5_competitors)
        avg_visitor_reviews_7d_top5 = sum(c["visitor_reviews_7d_avg"] for c in top5_competitors) / len(top5_competitors)
        avg_blog_reviews_7d_top5 = sum(c["blog_reviews_7d_avg"] for c in top5_competitors) / len(top5_competitors)
        avg_announcements_7d_top5 = sum(c["announcements_7d"] for c in top5_competitors) / len(top5_competitors)
        
        # Top 20 평균 계산
        avg_diagnosis_score_top20 = sum(c["diagnosis_score"] for c in top20_competitors) / len(top20_competitors)
        avg_visitor_reviews_7d_top20 = sum(c["visitor_reviews_7d_avg"] for c in top20_competitors) / len(top20_competitors)
        avg_blog_reviews_7d_top20 = sum(c["blog_reviews_7d_avg"] for c in top20_competitors) / len(top20_competitors)
        avg_announcements_7d_top20 = sum(c["announcements_7d"] for c in top20_competitors) / len(top20_competitors)
        
        coupon_rate = sum(1 for c in competitors if c["has_coupon"]) / len(competitors) * 100
        place_plus_rate = sum(1 for c in competitors if c["is_place_plus"]) / len(competitors) * 100
        naverpay_rate = sum(1 for c in competitors if c["supports_naverpay"]) / len(competitors) * 100
        
        # 우리 매장 데이터
        my_score = my_store_data.get("diagnosis_score", 0)
        my_visitor_reviews = my_store_data.get("visitor_reviews_7d_avg", 0)
        my_blog_reviews = my_store_data.get("blog_reviews_7d_avg", 0)
        my_announcements = my_store_data.get("announcements_7d", 0)
        my_has_coupon = my_store_data.get("has_coupon", False)
        my_is_place_plus = my_store_data.get("is_place_plus", False)
        my_naverpay = my_store_data.get("supports_naverpay", False)
        
        # 차이 분석 (Top 5 & Top 20)
        gaps = {
            "diagnosis_score": {
                "my_value": my_score,
                "competitor_avg_top5": round(avg_diagnosis_score_top5, 1),
                "competitor_avg_top20": round(avg_diagnosis_score_top20, 1),
                "gap_top5": round(my_score - avg_diagnosis_score_top5, 1),
                "gap_top20": round(my_score - avg_diagnosis_score_top20, 1),
                "status_top5": "good" if my_score >= avg_diagnosis_score_top5 else "bad",
                "status_top20": "good" if my_score >= avg_diagnosis_score_top20 else "bad",
            },
            "visitor_reviews_7d_avg": {
                "my_value": my_visitor_reviews,
                "competitor_avg_top5": round(avg_visitor_reviews_7d_top5, 1),
                "competitor_avg_top20": round(avg_visitor_reviews_7d_top20, 1),
                "gap_top5": round(my_visitor_reviews - avg_visitor_reviews_7d_top5, 1),
                "gap_top20": round(my_visitor_reviews - avg_visitor_reviews_7d_top20, 1),
                "status_top5": "good" if my_visitor_reviews >= avg_visitor_reviews_7d_top5 else "bad",
                "status_top20": "good" if my_visitor_reviews >= avg_visitor_reviews_7d_top20 else "bad",
            },
            "blog_reviews_7d_avg": {
                "my_value": my_blog_reviews,
                "competitor_avg_top5": round(avg_blog_reviews_7d_top5, 1),
                "competitor_avg_top20": round(avg_blog_reviews_7d_top20, 1),
                "gap_top5": round(my_blog_reviews - avg_blog_reviews_7d_top5, 1),
                "gap_top20": round(my_blog_reviews - avg_blog_reviews_7d_top20, 1),
                "status_top5": "good" if my_blog_reviews >= avg_blog_reviews_7d_top5 else "bad",
                "status_top20": "good" if my_blog_reviews >= avg_blog_reviews_7d_top20 else "bad",
            },
            "announcements_7d": {
                "my_value": my_announcements,
                "competitor_avg_top5": round(avg_announcements_7d_top5, 1),
                "competitor_avg_top20": round(avg_announcements_7d_top20, 1),
                "gap_top5": round(my_announcements - avg_announcements_7d_top5, 1),
                "gap_top20": round(my_announcements - avg_announcements_7d_top20, 1),
                "status_top5": "good" if my_announcements >= avg_announcements_7d_top5 else "bad",
                "status_top20": "good" if my_announcements >= avg_announcements_7d_top20 else "bad",
            },
            "has_coupon": {
                "my_value": my_has_coupon,
                "competitor_rate": round(coupon_rate, 1),
                "status": "good" if my_has_coupon else "bad",
            },
            "is_place_plus": {
                "my_value": my_is_place_plus,
                "competitor_rate": round(place_plus_rate, 1),
                "status": "good" if my_is_place_plus else "bad",
            },
            "supports_naverpay": {
                "my_value": my_naverpay,
                "competitor_rate": round(naverpay_rate, 1),
                "status": "good" if my_naverpay else "bad",
            },
        }
        
        # LLM 기반 개선 권장사항 생성
        recommendations = await llm_recommendation_service.generate_detailed_recommendations(
            my_store_data, competitors, gaps
        )
        
        # 순위별 분포
        score_distribution = {
            "S": sum(1 for c in competitors if c["diagnosis_grade"] == "S"),
            "A": sum(1 for c in competitors if c["diagnosis_grade"] == "A"),
            "B": sum(1 for c in competitors if c["diagnosis_grade"] == "B"),
            "C": sum(1 for c in competitors if c["diagnosis_grade"] == "C"),
            "D": sum(1 for c in competitors if c["diagnosis_grade"] == "D"),
        }
        
        result = {
            "my_store": my_store_data,
            "competitor_count": len(competitors),
            "gaps": gaps,
            "recommendations": recommendations,
            "score_distribution": score_distribution,
            "analysis_date": datetime.now().isoformat(),
        }
        
        logger.info(f"[경쟁분석] 비교 완료: 우리 {my_score}점 vs Top5 평균 {avg_diagnosis_score_top5:.1f}점, Top20 평균 {avg_diagnosis_score_top20:.1f}점")
        return result
    
    def _calculate_recent_reviews(
        self,
        total_count: int,
        recent_reviews: List[Dict],
        days: int = 7
    ) -> float:
        """최근 N일간 리뷰 수 추정"""
        # 실제 최근 리뷰 데이터가 있으면 사용
        if recent_reviews:
            cutoff_date = datetime.now() - timedelta(days=days)
            recent_count = sum(
                1 for review in recent_reviews
                if self._parse_review_date(review.get("date")) >= cutoff_date
            )
            return recent_count
        
        # 없으면 추정 (전체 리뷰의 1/30 * days)
        estimated_daily_avg = total_count / 365 if total_count > 0 else 0
        return estimated_daily_avg * days
    
    def _parse_review_date(self, date_str: str) -> datetime:
        """리뷰 날짜 파싱"""
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
                # 날짜 형식이면 파싱
                return datetime.strptime(date_str, "%Y.%m.%d")
        except:
            return datetime.min
    
    def _count_recent_announcements(
        self,
        announcements: List[Dict],
        days: int = 7
    ) -> int:
        """최근 N일간 공지 수 계산"""
        # announcements가 None일 경우 처리
        if not announcements:
            return 0
        
        count = 0
        cutoff_date = datetime.now() - timedelta(days=days)
        
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
    
    async def _get_store_search_volume(self, store_name: str) -> int:
        """
        매장명 검색량 조회
        
        Args:
            store_name: 매장명
            
        Returns:
            검색량 (전체 검색량)
            
        로직:
        - 매장명의 띄어쓰기를 제거한 형태의 검색량만 조회
        - 예: "금금 광화문점" → "금금광화문점"의 검색량
        - 예: "인사도담" → "인사도담"의 검색량
        """
        if not store_name:
            return 0
        
        try:
            # 특수문자 제거 (띄어쓰기는 유지)
            cleaned_name = re.sub(r'[^\w가-힣\s]', '', store_name)
            
            # 띄어쓰기 제거한 전체 매장명
            full_without_space = cleaned_name.replace(' ', '').strip()
            
            logger.info(f"[검색량] 원본 매장명: {store_name}")
            logger.info(f"[검색량] 정제 후 (띄어쓰기 제거): {full_without_space}")
            
            keywords_to_search = [full_without_space]
            logger.info(f"[검색량] 검색할 키워드: {keywords_to_search}")
            
            # 검색량 API 호출
            search_service = NaverKeywordSearchVolumeService()
            result = search_service.get_keyword_search_volume(keywords_to_search)
            
            if result.get("status") != "success":
                logger.warning(f"[검색량] API 실패: {result.get('message')}")
                return 0
            
            # 검색량 합산
            total_volume = 0
            # result 구조: {"status": "success", "data": {"keywordList": [...]}}
            keyword_list = result.get("data", {}).get("keywordList", [])
            logger.info(f"[검색량] 키워드 리스트 길이: {len(keyword_list)}")
            
            for keyword_data in keyword_list:
                keyword = keyword_data.get("relKeyword", "")
                # 명시적으로 정수 변환 (API가 문자열로 반환할 수 있음)
                try:
                    monthly_pc = int(keyword_data.get("monthlyPcQcCnt", 0) or 0)
                    monthly_mobile = int(keyword_data.get("monthlyMobileQcCnt", 0) or 0)
                except (ValueError, TypeError):
                    monthly_pc = 0
                    monthly_mobile = 0
                
                keyword_volume = monthly_pc + monthly_mobile
                total_volume += keyword_volume
                logger.info(f"[검색량] '{keyword}': PC {monthly_pc:,} + Mobile {monthly_mobile:,} = {keyword_volume:,}")
            
            logger.info(f"[검색량] {store_name} 총 검색량: {total_volume:,}")
            return total_volume
            
        except Exception as e:
            logger.error(f"[검색량] 조회 실패 ({store_name}): {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return 0
    
    def _generate_recommendations(
        self,
        gaps: Dict[str, Any],
        competitors: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """비교 분석 기반 개선 권장사항 생성"""
        recommendations = []
        
        # 진단 점수가 낮은 경우
        if gaps["diagnosis_score"]["status"] == "bad":
            gap_value = abs(gaps["diagnosis_score"]["gap"])
            recommendations.append({
                "priority": "high",
                "category": "overall",
                "title": "전체 플레이스 진단 점수 개선 필요",
                "description": f"경쟁매장 평균 대비 {gap_value}점 낮습니다. 플레이스 진단 기능을 통해 개선이 필요한 항목을 확인하세요.",
                "impact": "high"
            })
        
        # 방문자 리뷰가 적은 경우
        if gaps["visitor_reviews_7d_avg"]["status"] == "bad":
            gap_value = abs(gaps["visitor_reviews_7d_avg"]["gap"])
            recommendations.append({
                "priority": "high",
                "category": "reviews",
                "title": "방문자 리뷰 활성화 필요",
                "description": f"경쟁매장은 일평균 {gaps['visitor_reviews_7d_avg']['competitor_avg']}개의 리뷰를 받고 있습니다. 리뷰 요청 프로세스를 개선하세요.",
                "impact": "high"
            })
        
        # 블로그 리뷰가 적은 경우
        if gaps["blog_reviews_7d_avg"]["status"] == "bad":
            recommendations.append({
                "priority": "medium",
                "category": "blog",
                "title": "블로그 마케팅 강화 필요",
                "description": f"경쟁매장 대비 블로그 리뷰가 부족합니다. 체험단이나 인플루언서 협업을 고려하세요.",
                "impact": "medium"
            })
        
        # 공지가 적은 경우
        if gaps["announcements_7d"]["status"] == "bad":
            recommendations.append({
                "priority": "medium",
                "category": "announcements",
                "title": "정기 공지 업데이트 필요",
                "description": "경쟁매장은 정기적으로 공지를 업데이트하고 있습니다. 신메뉴, 이벤트 소식을 공유하세요.",
                "impact": "medium"
            })
        
        # 쿠폰이 없는 경우
        if not gaps["has_coupon"]["my_value"] and gaps["has_coupon"]["competitor_rate"] > 50:
            recommendations.append({
                "priority": "high",
                "category": "coupon",
                "title": "쿠폰 발행 권장",
                "description": f"경쟁매장의 {gaps['has_coupon']['competitor_rate']}%가 쿠폰을 사용하고 있습니다. 첫 방문 할인 쿠폰을 발행하세요.",
                "impact": "high"
            })
        
        # 플레이스 플러스 미가입
        if not gaps["is_place_plus"]["my_value"] and gaps["is_place_plus"]["competitor_rate"] > 50:
            recommendations.append({
                "priority": "high",
                "category": "place_plus",
                "title": "플레이스 플러스 가입 권장",
                "description": f"경쟁매장의 {gaps['is_place_plus']['competitor_rate']}%가 플레이스 플러스를 사용하고 있습니다. 고급 관리 기능을 활용하세요.",
                "impact": "high"
            })
        
        # 네이버페이 미지원
        if not gaps["supports_naverpay"]["my_value"] and gaps["supports_naverpay"]["competitor_rate"] > 50:
            recommendations.append({
                "priority": "medium",
                "category": "payment",
                "title": "네이버페이 도입 권장",
                "description": f"경쟁매장의 {gaps['supports_naverpay']['competitor_rate']}%가 네이버페이를 지원합니다. 결제 편의성을 개선하세요.",
                "impact": "medium"
            })
        
        # 우선순위로 정렬
        priority_order = {"high": 0, "medium": 1, "low": 2}
        recommendations.sort(key=lambda x: priority_order.get(x["priority"], 2))
        
        return recommendations
    
    async def _calculate_visitor_reviews_accurate(
        self,
        place_id: str,
        total_visitor_review_count: int
    ) -> float:
        """
        방문자리뷰 7일 정확한 계산 (API 직접 호출 - 플레이스 활성화와 동일)
        
        Args:
            place_id: 네이버 플레이스 ID
            total_visitor_review_count: 전체 방문자 리뷰 수 (fallback용)
        
        Returns:
            7일간 리뷰 수
        """
        try:
            # API 직접 호출하여 최근 리뷰 가져오기 (플레이스 활성화와 동일)
            all_reviews = []
            cursor = None
            max_pages = 5  # 경쟁사 분석은 최대 100개(20*5)만 필요
            now = datetime.now(timezone.utc)
            oldest_needed_days = 7  # 7일치만 필요
            should_stop = False
            
            logger.info(f"[경쟁분석] 방문자 리뷰 API 호출 시작: place_id={place_id}")
            
            for page in range(max_pages):
                reviews_data = await self.review_service.get_visitor_reviews(
                    place_id=place_id,
                    size=20,
                    after=cursor,
                    sort="recent"
                )
                
                if not reviews_data or not reviews_data.get("items"):
                    logger.warning(f"[경쟁분석] 리뷰 API 실패 (페이지 {page+1})")
                    if page == 0:
                        # 첫 페이지부터 실패하면 0 반환
                        logger.info(f"[경쟁분석] 방문자리뷰 7일: 0개 (API 실패)")
                        return 0.0
                    else:
                        break
                
                items = reviews_data["items"]
                
                # 7일보다 오래된 리뷰가 나오면 중단
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
                    logger.info(f"[경쟁분석] 7일 이상 리뷰 도달, 중단 (페이지 {page+1}, 총 {len(all_reviews)}개)")
                    break
                
                # 다음 페이지 확인
                cursor = reviews_data.get("nextCursor") or reviews_data.get("last_cursor")
                has_more = reviews_data.get("hasMore", reviews_data.get("has_more", False))
                
                if not cursor or not has_more:
                    logger.info(f"[경쟁분석] 모든 리뷰 조회 완료 (페이지 {page+1}, 총 {len(all_reviews)}개, cursor={cursor is not None}, has_more={has_more})")
                    break
            
            if not all_reviews:
                logger.warning(f"[경쟁분석] 리뷰 없음, 0으로 처리")
                return 0.0
            
            # 7일 이내 리뷰 개수 계산
            count_7d = 0
            cutoff_date = now - timedelta(days=7)
            
            logger.info(f"[경쟁분석] 방문자 리뷰 날짜 필터링 시작 - cutoff_date: {cutoff_date}, now: {now}")
            
            # 첫 번째 리뷰의 모든 필드 로깅 (디버깅용)
            if all_reviews:
                first_review = all_reviews[0]
                logger.info(f"[경쟁분석] 첫 번째 리뷰 필드: {list(first_review.keys())}")
                logger.info(f"[경쟁분석] created={first_review.get('created')}, visited={first_review.get('visited')}")
            
            for idx, review in enumerate(all_reviews):
                created_str = review.get("created")
                if not created_str:
                    if idx < 3:  # 처음 3개만 로깅
                        logger.warning(f"[경쟁분석] 리뷰 #{idx}: created 필드 없음")
                    continue
                
                try:
                    # 방문자 리뷰 날짜 파싱 (활성화 서비스와 동일한 로직 사용)
                    review_date = self._parse_visitor_review_date(created_str)
                    if not review_date:
                        if idx < 3:  # 처음 3개만 로깅
                            logger.warning(f"[경쟁분석] 리뷰 #{idx}: 날짜 파싱 실패 - {created_str}")
                        continue
                    
                    # timezone이 없으면 UTC로 가정
                    if review_date.tzinfo is None:
                        review_date = review_date.replace(tzinfo=timezone.utc)
                    
                    # cutoff_date도 timezone 추가
                    cutoff_with_tz = cutoff_date.replace(tzinfo=timezone.utc) if cutoff_date.tzinfo is None else cutoff_date
                    
                    days_diff = (now - review_date).days
                    
                    if idx < 3:  # 처음 3개만 로깅
                        logger.info(f"[경쟁분석] 리뷰 #{idx}: created={created_str}, review_date={review_date}, days_ago={days_diff}")
                    
                    if review_date >= cutoff_with_tz:
                        count_7d += 1
                except Exception as e:
                    if idx < 3:  # 처음 3개만 로깅
                        logger.warning(f"[경쟁분석] 리뷰 #{idx}: 예외 발생 - {created_str}, {str(e)}")
                    continue
            
            logger.info(f"[경쟁분석] 방문자리뷰 7일: {count_7d}개 (전체 조회: {len(all_reviews)}개)")
            return float(count_7d)
            
        except Exception as e:
            logger.error(f"[경쟁분석] 방문자리뷰 계산 실패: {str(e)}")
            import traceback
            logger.error(f"[경쟁분석] Traceback:\n{traceback.format_exc()}")
            return 0.0
    
    async def _calculate_blog_reviews_accurate(
        self,
        place_id: str,
        store_name: str,
        road_address: str,
        total_blog_review_count: int
    ) -> float:
        """
        블로그리뷰 7일 정확한 계산 (HTML 파싱 + 필터링)
        
        Args:
            place_id: 플레이스 ID
            store_name: 매장명
            road_address: 도로명주소
            total_blog_review_count: 전체 블로그 리뷰 수 (fallback용)
        
        Returns:
            7일간 리뷰 수
        """
        try:
            logger.info(f"[경쟁분석] 블로그 리뷰 계산 시작 - place_id={place_id}, store_name={store_name}, road_address={road_address}")
            
            # HTML 파싱으로 블로그 리뷰 가져오기 (7일치만 필요하므로 max_pages 제한)
            all_reviews = await self.review_service.get_blog_reviews_html(
                place_id=place_id,
                store_name=store_name,
                road_address=road_address,
                max_pages=3  # 7일치는 보통 1-2페이지에 있음 (속도 최적화)
            )
            
            logger.info(f"[경쟁분석] 블로그 리뷰 HTML 파싱 결과: {len(all_reviews) if all_reviews else 0}개")
            
            if not all_reviews:
                logger.warning(f"[경쟁분석] 블로그 리뷰 파싱 실패, 0으로 처리")
                return 0.0
            
            # 날짜 파싱하여 7일 이내 카운팅
            cutoff_date = datetime.now() - timedelta(days=7)
            recent_count = 0
            
            logger.info(f"[경쟁분석] 블로그 리뷰 날짜 필터링 시작 - cutoff_date: {cutoff_date}")
            
            for idx, review in enumerate(all_reviews):
                date_str = review.get("dateString") or review.get("date", "")
                if date_str:
                    review_date = self._parse_blog_review_date(date_str)
                    if review_date:
                        days_ago = (datetime.now() - review_date).days
                        if idx < 3:  # 처음 3개만 로깅
                            logger.info(f"[경쟁분석] 블로그 #{idx}: date={date_str}, parsed={review_date}, days_ago={days_ago}")
                        
                        if review_date >= cutoff_date:
                            recent_count += 1
                    else:
                        if idx < 3:  # 처음 3개만 로깅
                            logger.warning(f"[경쟁분석] 블로그 #{idx}: 날짜 파싱 실패 - {date_str}")
            
            logger.info(f"[경쟁분석] 블로그리뷰 7일: {recent_count}개 (전체: {len(all_reviews)}개)")
            return float(recent_count)
            
        except Exception as e:
            logger.error(f"[경쟁분석] 블로그 리뷰 계산 실패: {str(e)}")
            return 0.0
    
    def _parse_review_date_enhanced(self, date_str: str) -> Optional[datetime]:
        """
        방문자 리뷰 날짜 파싱 (다양한 형식 지원)
        
        지원 형식:
        - ISO 8601: "2025-01-28T12:30:45" 또는 "2025-01-28"
        - 한국어: "3일 전", "1주일 전", "2개월 전"
        - 점 형식: "2025.01.28"
        """
        if not date_str:
            return None
        
        try:
            # ISO 8601 형식 (T 포함)
            if "T" in date_str:
                # "2025-01-28T12:30:45" 또는 "2025-01-28T12:30:45.123Z"
                date_str_clean = date_str.split(".")[0].replace("Z", "")  # Z와 밀리초 제거
                return datetime.fromisoformat(date_str_clean)
            
            # ISO 날짜만 (YYYY-MM-DD)
            if "-" in date_str and len(date_str) >= 10:
                return datetime.strptime(date_str[:10], "%Y-%m-%d")
            
            # "N일 전", "N주일 전", "N개월 전" 형식
            if "전" in date_str:
                if "시간" in date_str or "분" in date_str:
                    return datetime.now()
                elif "일" in date_str:
                    days = int(re.search(r'\d+', date_str).group())
                    return datetime.now() - timedelta(days=days)
                elif "주" in date_str:
                    weeks = int(re.search(r'\d+', date_str).group())
                    return datetime.now() - timedelta(weeks=weeks)
                elif "개월" in date_str:
                    months = int(re.search(r'\d+', date_str).group())
                    return datetime.now() - timedelta(days=months * 30)
            
            # "YYYY.MM.DD" 형식
            if "." in date_str:
                date_str_clean = date_str.replace(".", "").strip()
                if len(date_str_clean) == 8:  # YYYYMMDD
                    return datetime.strptime(date_str_clean, "%Y%m%d")
                elif len(date_str_clean) == 6:  # YYMMDD
                    return datetime.strptime(date_str_clean, "%y%m%d")
            
            return None
            
        except Exception as e:
            logger.debug(f"[경쟁분석] 날짜 파싱 실패: '{date_str}' - {str(e)}")
            return None
    
    def _parse_visitor_review_date(self, date_str: str) -> Optional[datetime]:
        """
        방문자 리뷰 날짜 파싱 (활성화 서비스와 동일한 로직)
        
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
            logger.debug(f"[경쟁분석] 방문자 리뷰 날짜 파싱 실패: {date_str}, {str(e)}")
        
        return None
    
    def _parse_blog_review_date(self, date_str: str) -> Optional[datetime]:
        """
        블로그 리뷰 날짜 파싱
        
        지원 형식:
        - "2025.09.30."
        - "25.9.30."
        - "14시간 전", "3일 전"
        """
        if not date_str:
            return None
        
        try:
            # "N일 전", "N주 전", "N시간 전" 형식
            if "전" in date_str:
                if "시간" in date_str or "분" in date_str:
                    # 시간/분 전 -> 오늘
                    return datetime.now()
                elif "일" in date_str:
                    days = int(re.search(r'\d+', date_str).group())
                    return datetime.now() - timedelta(days=days)
                elif "주" in date_str:
                    weeks = int(re.search(r'\d+', date_str).group())
                    return datetime.now() - timedelta(weeks=weeks)
            
            # "YYYY.MM.DD." 또는 "YY.MM.DD." 형식
            date_str_clean = date_str.replace(".", "").strip()
            if len(date_str_clean) == 6:  # YYMMDD
                return datetime.strptime(date_str_clean, "%y%m%d")
            elif len(date_str_clean) == 8:  # YYYYMMDD
                return datetime.strptime(date_str_clean, "%Y%m%d")
            
            return None
            
        except Exception as e:
            logger.debug(f"[경쟁분석] 날짜 파싱 실패: {date_str} - {str(e)}")
            return None


# 싱글톤 인스턴스
competitor_analysis_service = NaverCompetitorAnalysisService()
