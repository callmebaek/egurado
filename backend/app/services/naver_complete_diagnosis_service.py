"""네이버 플레이스 완전 진단 서비스 - 모든 정보 통합"""
import asyncio
import logging
from typing import Dict, Any
from app.services.naver_search_api_unofficial import search_service_api_unofficial
from app.services.naver_review_service import naver_review_service
from app.services.naver_html_parser_service import html_parser_service
from app.services.naver_additional_info_service import additional_info_service

logger = logging.getLogger(__name__)


class NaverCompleteDiagnosisService:
    """네이버 플레이스 완전 진단 서비스"""
    
    async def diagnose_place(self, place_id: str, store_name: str = None) -> Dict[str, Any]:
        """플레이스 완전 진단 실행
        
        Args:
            place_id: 네이버 플레이스 ID
            store_name: 매장명 (선택, 제공하면 검색 API 사용으로 정확도 향상)
        """
        logger.info(f"[완전진단] 시작: place_id={place_id}, store_name={store_name}")
        
        # 병렬로 모든 데이터 수집
        tasks = [
            self._get_graphql_info(place_id, store_name),
            self._get_html_info(place_id),
            self._get_additional_info(place_id)
        ]
        
        graphql_info, html_info, additional_info = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 예외 처리
        if isinstance(graphql_info, Exception):
            logger.error(f"[완전진단] GraphQL 오류: {str(graphql_info)}")
            graphql_info = {}
        
        if isinstance(html_info, Exception):
            logger.error(f"[완전진단] HTML 파싱 오류: {str(html_info)}")
            html_info = {}
        
        if isinstance(additional_info, Exception):
            logger.error(f"[완전진단] 추가정보 오류: {str(additional_info)}")
            additional_info = {}
        
        # 모든 정보 통합
        complete_info = self._merge_all_info(place_id, graphql_info, html_info, additional_info)
        
        # 네이버페이 체크 (검색 결과 HTML에서 확인) ⭐
        final_store_name = store_name or complete_info.get("name")
        if final_store_name:
            try:
                has_naverpay = await search_service_api_unofficial.check_naverpay_from_search_html(
                    place_id, final_store_name
                )
                complete_info["has_naverpay_in_search"] = has_naverpay
                logger.info(f"[완전진단] 네이버페이: {'사용중' if has_naverpay else '미사용'}")
            except Exception as e:
                logger.error(f"[완전진단] 네이버페이 체크 오류: {str(e)}")
                complete_info["has_naverpay_in_search"] = False
        else:
            complete_info["has_naverpay_in_search"] = False
        
        # 통계 로깅
        filled_fields = sum(1 for v in complete_info.values() if self._is_filled(v))
        total_fields = len(complete_info)
        fill_rate = (filled_fields / total_fields * 100) if total_fields > 0 else 0
        
        logger.info(f"[완전진단] 완료: {filled_fields}/{total_fields} 필드 ({fill_rate:.1f}%)")
        
        return complete_info
    
    async def _get_graphql_info(self, place_id: str, store_name: str = None) -> Dict[str, Any]:
        """GraphQL API로 기본 정보 가져오기
        
        Args:
            place_id: 네이버 플레이스 ID
            store_name: 매장명 (선택, 제공되면 리뷰 추출 생략)
        """
        logger.info(f"[완전진단-GraphQL] place_id={place_id}, store_name={store_name}")
        
        # 1. 매장명 확보 (제공되지 않으면 리뷰에서 추출)
        if not store_name:
            try:
                visitor_reviews = await naver_review_service.get_visitor_reviews(place_id, size=1)
                
                if not visitor_reviews or not visitor_reviews.get("items"):
                    logger.warning(f"[완전진단-GraphQL] 리뷰가 없음")
                    return {}
                
                store_name = visitor_reviews["items"][0].get("businessName", "")
                
                if not store_name:
                    logger.warning(f"[완전진단-GraphQL] 매장명 추출 실패")
                    return {}
                
                logger.info(f"[완전진단-GraphQL] 리뷰에서 매장명 추출: {store_name}")
            except Exception as e:
                logger.error(f"[완전진단-GraphQL] 리뷰 조회 오류: {e}")
                return {}
        else:
            logger.info(f"[완전진단-GraphQL] 제공된 매장명 사용: {store_name}")
        
        # 2. 검색 API로 상세 정보
        search_results = await search_service_api_unofficial.search_stores(store_name, max_results=10)
        
        matched = None
        for result in search_results:
            if result.get("place_id") == place_id:
                matched = result
                break
        
        if matched:
            logger.info(f"[완전진단-GraphQL] 매칭 성공")
            return matched
        
        # 매칭 실패 시 get_place_info 호출
        logger.warning(f"[완전진단-GraphQL] 검색 매칭 실패, get_place_info 호출")
        try:
            place_info = await naver_review_service.get_place_info(place_id, store_name)
            if place_info:
                logger.info(f"[완전진단-GraphQL] get_place_info 성공")
                return {
                    "place_id": place_id,
                    "name": place_info.get("name", store_name),
                    "category": place_info.get("category", ""),
                    "address": place_info.get("address", ""),
                    "road_address": place_info.get("roadAddress", ""),
                    "x": place_info.get("x", ""),
                    "y": place_info.get("y", ""),
                    "phone": "",
                    "rating": place_info.get("rating"),
                    "visitor_review_count": place_info.get("visitor_review_count", 0),
                    "blog_review_count": place_info.get("blog_review_count", 0),
                    "thumbnail": place_info.get("imageUrl", ""),
                }
        except Exception as e:
            logger.error(f"[완전진단-GraphQL] get_place_info 오류: {e}")
        
        # 모든 시도 실패 시 최소 정보 반환
        logger.warning(f"[완전진단-GraphQL] 최소 정보만 반환")
        return {
            "place_id": place_id,
            "name": store_name,
            "category": "",
            "address": "",
            "road_address": "",
            "x": "",
            "y": "",
            "phone": "",
            "rating": None,
            "visitor_review_count": 0,
            "blog_review_count": 0,
            "thumbnail": "",
        }
    
    async def _get_html_info(self, place_id: str) -> Dict[str, Any]:
        """HTML 파싱으로 추가 정보 가져오기"""
        logger.info(f"[완전진단-HTML] place_id={place_id}")
        return await html_parser_service.parse_place_html(place_id)
    
    async def _get_additional_info(self, place_id: str) -> Dict[str, Any]:
        """추가 GraphQL 쿼리로 프로모션/공지사항 가져오기"""
        logger.info(f"[완전진단-추가정보] place_id={place_id}")
        return await additional_info_service.get_all_additional_info(place_id)
    
    def _merge_all_info(
        self,
        place_id: str,
        graphql_info: Dict[str, Any],
        html_info: Dict[str, Any],
        additional_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """모든 정보 통합"""
        
        # 기본 구조 (모든 필드)
        result = {
            # 기본 정보
            "place_id": place_id,
            "name": "",
            "category": "",
            "category_code": "",
            
            # 주소/위치
            "address": "",
            "road_address": "",
            "latitude": "",
            "longitude": "",
            
            # 연락처
            "phone_number": "",
            "homepage_url": "",
            "homepage": "",
            "instagram": "",
            "blog": "",
            "tv_program": "",
            
            # 평점/리뷰
            "visitor_review_score": None,
            "visitor_review_count": 0,
            "blog_review_count": 0,
            "booking_review_count": 0,
            
            # 이미지
            "image_url": "",
            "image_count": 0,
            
            # 예약
            "booking_url": "",
            "booking_available": False,
            
            # 영업시간
            "business_hours": None,
            "business_status": "",
            "is_open": False,
            
            # 편의시설
            "conveniences": [],
            "has_parking": False,
            "has_wifi": False,
            "has_delivery": False,
            "has_takeout": False,
            "has_reservation": False,
            "group_seating": False,
            
            # 결제
            "payment_methods": [],
            
            # 메뉴
            "menus": [],
            "menu_count": 0,
            
            # 기타
            "micro_reviews": [],
            "directions": "",
            "description": "",  # 업체소개글 (업체가 직접 입력한 소개)
            "ai_briefing": "",  # AI가 생성한 요약 정보
            
            # 프로모션/공지
            "promotions": {"total": 0, "coupons": []},
            "announcements": [],
            
            # 플레이스 플러스
            "is_place_plus": False,
            
            # 새로오픈
            "is_new_business": False,
        }
        
        # 1. GraphQL 정보 (기본 정보)
        if graphql_info:
            result["name"] = graphql_info.get("name") or result["name"]
            result["category"] = graphql_info.get("category") or result["category"]
            result["address"] = graphql_info.get("address") or result["address"]
            result["road_address"] = graphql_info.get("road_address") or result["road_address"]
            result["latitude"] = graphql_info.get("y") or result["latitude"]
            result["longitude"] = graphql_info.get("x") or result["longitude"]
            result["phone_number"] = graphql_info.get("phone") or result["phone_number"]
            result["image_url"] = graphql_info.get("thumbnail") or result["image_url"]
            result["booking_url"] = graphql_info.get("booking_url") or result["booking_url"]
            result["image_count"] = graphql_info.get("image_count") or result["image_count"]
            
            # 평점/리뷰 (GraphQL 우선)
            if graphql_info.get("rating") is not None:
                result["visitor_review_score"] = graphql_info.get("rating")
            
            result["visitor_review_count"] = int(str(graphql_info.get("visitor_review_count") or 0).replace(",", ""))
            result["blog_review_count"] = int(str(graphql_info.get("blog_review_count") or 0).replace(",", ""))
            result["booking_review_count"] = int(str(graphql_info.get("booking_review_count") or 0).replace(",", ""))
        
        # 2. HTML 파싱 정보 (더 상세한 정보로 덮어쓰기)
        if html_info:
            # HTML의 기본 정보로 덮어쓰기 (더 정확할 수 있음)
            if html_info.get("name"):
                result["name"] = html_info.get("name")
            if html_info.get("category"):
                result["category"] = html_info.get("category")
            if html_info.get("address"):
                result["address"] = html_info.get("address")
            if html_info.get("road_address"):
                result["road_address"] = html_info.get("road_address")
            if html_info.get("latitude"):
                result["latitude"] = html_info.get("latitude")
            if html_info.get("longitude"):
                result["longitude"] = html_info.get("longitude")
            if html_info.get("phone_number"):
                result["phone_number"] = html_info.get("phone_number")
            
            # HTML에서만 얻을 수 있는 정보들
            result["category_code"] = html_info.get("category_code") or result["category_code"]
            result["conveniences"] = html_info.get("conveniences") or result["conveniences"]
            result["has_parking"] = html_info.get("has_parking", False)
            result["has_wifi"] = html_info.get("has_wifi", False)
            result["has_delivery"] = html_info.get("has_delivery", False)
            result["has_takeout"] = html_info.get("has_takeout", False)
            result["has_reservation"] = html_info.get("has_reservation", False)
            result["group_seating"] = html_info.get("group_seating", False)
            
            result["payment_methods"] = html_info.get("payment_methods") or result["payment_methods"]
            result["micro_reviews"] = html_info.get("micro_reviews") or result["micro_reviews"]
            result["directions"] = html_info.get("directions") or result["directions"]
            
            # SNS 및 웹사이트
            result["homepage"] = html_info.get("homepage") or result["homepage"]
            result["instagram"] = html_info.get("instagram") or result["instagram"]
            result["blog"] = html_info.get("blog") or result["blog"]
            
            # TV 방송 정보
            result["tv_program"] = html_info.get("tv_program") or result["tv_program"]
            
            # 업체소개글 (HTML에서 추출)
            result["description"] = html_info.get("description") or result["description"]
            
            # 영업시간
            business_hours = html_info.get("business_hours")
            if business_hours:
                result["business_hours"] = business_hours.get("hours")
                result["business_status"] = business_hours.get("status", "")
                result["is_open"] = "영업" in business_hours.get("status", "")
            
            # 영업 상태 텍스트 (실시간)
            if html_info.get("business_status_text"):
                result["business_status"] = html_info.get("business_status_text")
                result["is_open"] = html_info.get("is_open", False)
            
            # 메뉴
            menus = html_info.get("menus")
            if menus:
                result["menus"] = menus
                result["menu_count"] = len(menus)
            
            # HTML의 평점이 있으면 우선 (더 정확함)
            if html_info.get("visitor_reviews_score") is not None:
                result["visitor_review_score"] = html_info.get("visitor_reviews_score")
            
            if html_info.get("visitor_reviews_total") is not None:
                result["visitor_review_count"] = html_info.get("visitor_reviews_total")
        
        # 3. 추가 정보 (프로모션/공지/AI브리핑)
        if additional_info:
            result["promotions"] = additional_info.get("promotions", result["promotions"])
            result["announcements"] = additional_info.get("announcements", result["announcements"])
            
            # AI 브리핑을 별도 필드로 저장
            ai_briefing = additional_info.get("ai_briefing", {})
            if ai_briefing and ai_briefing.get("description"):
                result["ai_briefing"] = ai_briefing.get("description")
        
        # 플레이스 플러스 (HTML의 APOLLO_STATE에서 가져온 정보 사용)
        if html_info and html_info.get("is_place_plus") == True:
            # HTML에서 명확하게 True인 경우만 덮어쓰기
            result["is_place_plus"] = True
        
        # 새로오픈 (HTML에서 추출)
        if html_info and html_info.get("is_new_business") == True:
            result["is_new_business"] = True
        
        # 예약 가능 여부 판단
        result["booking_available"] = bool(result["booking_url"])
        
        return result
    
    def _is_filled(self, value: Any) -> bool:
        """값이 채워져 있는지 확인"""
        if value is None:
            return False
        if isinstance(value, str) and value == "":
            return False
        if isinstance(value, (list, dict)) and len(value) == 0:
            return False
        if isinstance(value, bool):
            return True
        if isinstance(value, (int, float)) and value == 0:
            return False
        return True


# 싱글톤 인스턴스
complete_diagnosis_service = NaverCompleteDiagnosisService()
