"""
네이버 플레이스 상세 정보 조회 서비스 (신API 방식)
플레이스 진단을 위해 모든 정보를 가져옵니다.
"""
import logging
import httpx
import json
from typing import Dict, Optional, List, Any
import re
from bs4 import BeautifulSoup
from app.core.proxy import get_rotating_proxy

logger = logging.getLogger(__name__)


class NaverPlaceDetailsService:
    """네이버 플레이스 상세 정보 조회 서비스
    
    GraphQL API와 HTML 파싱을 조합하여 최대한 많은 정보 수집
    """
    
    def __init__(self):
        self.api_url = "https://api.place.naver.com/graphql"
        self.base_headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Origin": "https://m.place.naver.com",
            "Referer": "https://m.place.naver.com/",
        }
        self.timeout = 20.0
        self.proxies = get_rotating_proxy()
        
    async def get_place_details_via_search(self, place_name: str, place_id: str) -> Dict[str, Any]:
        """
        신API 검색으로 플레이스 상세 정보 조회
        
        Args:
            place_name: 매장명
            place_id: 네이버 플레이스 ID
            
        Returns:
            상세 정보 딕셔너리
        """
        logger.info(f"[플레이스 진단] 신API 검색: {place_name}")
        
        try:
            from .naver_search_api_unofficial import search_service_api_unofficial
            
            # 매장명으로 검색
            results = await search_service_api_unofficial.search_stores(place_name, max_results=10)
            
            # place_id 매칭
            for result in results:
                if result.get("place_id") == place_id:
                    logger.info(f"[플레이스 진단] 매칭 성공!")
                    return result
            
            logger.warning(f"[플레이스 진단] 매칭 실패")
            return {}
            
        except Exception as e:
            logger.error(f"[플레이스 진단] 오류: {str(e)}")
            return {}
    
    async def get_place_details_by_id(self, place_id: str) -> Dict[str, Any]:
        """place_id로 직접 플레이스 상세 정보 조회"""
        logger.info(f"[플레이스 진단] place_id 직접 조회: {place_id}")
        return await self._get_basic_info(place_id)
    
    async def _get_basic_info(self, place_id: str) -> Dict[str, Any]:
        """GraphQL로 기본 정보 조회"""
        logger.info(f"[기본 정보] 조회 시작: {place_id}")
        
        # 기본 필드만 요청 (안정적인 필드)
        query = """
        query getPlacesList($input: PlacesInput) {
            places(input: $input) {
                items {
                    id
                    name
                    category
                    address
                    roadAddress
                    x
                    y
                    imageUrl
                    visitorReviewScore
                    visitorReviewCount
                    blogCafeReviewCount
                }
            }
        }
        """
        
        payload = {
            "operationName": "getPlacesList",
            "variables": {
                "input": {
                    "businessId": place_id,
                    "start": 1,
                    "display": 1,
                    "deviceType": "mobile"
                }
            },
            "query": query
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout, proxies=self.proxies) as client:
                response = await client.post(
                    self.api_url,
                    json=payload,
                    headers=self.base_headers
                )
                response.raise_for_status()
                data = response.json()
                
                logger.info(f"[기본 정보] 응답 받음: {str(data)[:200]}")
                
                items = data.get("data", {}).get("places", {}).get("items", [])
                
                if not items:
                    logger.warning("[기본 정보] 검색 결과 없음")
                    return {}
                
                place = items[0]
                
                result = {
                    "name": place.get("name", ""),
                    "category": place.get("category", ""),
                    "address": place.get("address", ""),
                    "road_address": place.get("roadAddress", ""),
                    "phone_number": "",  # 검색 API에는 전화번호 없음
                    "latitude": place.get("y", ""),
                    "longitude": place.get("x", ""),
                    "image_url": place.get("imageUrl", ""),
                    "visitor_review_score": self._parse_float(place.get("visitorReviewScore")),
                    "visitor_review_count": self._parse_int(place.get("visitorReviewCount")),
                    "blog_review_count": self._parse_int(place.get("blogCafeReviewCount")),
                    "description": "",
                    "homepage_url": "",
                    "booking_url": "",
                    "tags": [],
                }
                
                logger.info(f"[기본 정보] 완료: {result.get('name')}")
                return result
                
        except Exception as e:
            logger.error(f"[기본 정보] 오류: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {}
    
    async def _get_review_info(self, place_id: str) -> Dict[str, Any]:
        """GraphQL로 리뷰 관련 정보 조회"""
        logger.info(f"[리뷰 정보] 조회 시작: {place_id}")
        
        # 이미 기본 정보에서 조회했으므로 빈 딕셔너리 반환
        # 필요시 더 자세한 리뷰 통계 추가 가능
        return {}
    
    async def _get_html_info(self, place_id: str) -> Dict[str, Any]:
        """HTML 페이지에서 모든 정보 파싱"""
        logger.info(f"[HTML 파싱] 시작: {place_id}")
        
        url = f"https://m.place.naver.com/place/{place_id}/home"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True, proxies=self.proxies) as client:
                response = await client.get(url, headers={
                    "User-Agent": self.base_headers["User-Agent"]
                })
                response.raise_for_status()
                html = response.text
                
                # window.__APOLLO_STATE__ 추출
                apollo_data = self._extract_apollo_state(html)
                
                if not apollo_data:
                    logger.warning("[HTML 파싱] APOLLO_STATE를 찾을 수 없음")
                    return {}
                
                # PlaceDetailBase 키 찾기
                place_key = None
                for key in apollo_data.keys():
                    if key.startswith(f"PlaceDetailBase:{place_id}") or key.startswith(f"Place:{place_id}"):
                        place_key = key
                        break
                
                if not place_key:
                    logger.warning(f"[HTML 파싱] Place 키를 찾을 수 없음")
                    logger.info(f"[HTML 파싱] 사용 가능한 키: {list(apollo_data.keys())[:10]}")
                    return {}
                
                place_data = apollo_data.get(place_key, {})
                logger.info(f"[HTML 파싱] Place 데이터 찾음: {place_key}")
                
                # 기본 정보 추출
                result = {
                    "name": place_data.get("name", ""),
                    "category": place_data.get("category", ""),
                    "address": place_data.get("address", ""),
                    "road_address": place_data.get("roadAddress", ""),
                    "phone_number": place_data.get("phone", ""),
                    "latitude": place_data.get("y", ""),
                    "longitude": place_data.get("x", ""),
                    "image_url": place_data.get("imageUrl", ""),
                    "visitor_review_score": self._parse_float(place_data.get("visitorReviewScore")),
                    "visitor_review_count": self._parse_int(place_data.get("visitorReviewCount")),
                    "blog_review_count": self._parse_int(place_data.get("blogCafeReviewCount")),
                    "description": place_data.get("description", ""),
                    "homepage_url": place_data.get("homepageUrl", ""),
                    "tags": place_data.get("tags", []),
                    "keyword_list": place_data.get("keywordList", []),
                    "menu_list": self._parse_menu_list(apollo_data),
                    "business_hours": self._parse_business_hours(place_data),
                    "parking": place_data.get("parking", ""),
                    "menu_images": self._extract_menu_images(apollo_data),
                    "facility_images": self._extract_facility_images(apollo_data),
                    "bookmark_count": self._parse_int(place_data.get("bookmarkCount")),
                    "is_claimed": place_data.get("isClaimed", False),
                }
                
                logger.info(f"[HTML 파싱] 완료: {result.get('name')}")
                return result
                
        except Exception as e:
            logger.error(f"[HTML 파싱] 오류: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {}
    
    def _extract_apollo_state(self, html: str) -> Dict:
        """HTML에서 window.__APOLLO_STATE__ 추출"""
        try:
            # window.__APOLLO_STATE__ = {...}; 형태 찾기
            marker = "window.__APOLLO_STATE__ = "
            start_idx = html.find(marker)
            
            if start_idx == -1:
                return {}
            
            json_start = start_idx + len(marker)
            
            # 중괄호 카운팅으로 JSON 끝 찾기
            brace_count = 0
            json_end = json_start
            
            for i, char in enumerate(html[json_start:], start=json_start):
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        json_end = i + 1
                        break
            
            json_str = html[json_start:json_end]
            return json.loads(json_str)
            
        except Exception as e:
            logger.error(f"APOLLO_STATE 추출 오류: {str(e)}")
            return {}
    
    def _parse_menu_list(self, apollo_data: Dict) -> List[Dict[str, str]]:
        """메뉴 리스트 파싱"""
        menu_list = []
        
        try:
            for key, value in apollo_data.items():
                if not isinstance(value, dict):
                    continue
                if key.startswith("Menu:"):
                    images = value.get("images", [])
                    image_url = ""
                    if isinstance(images, list) and len(images) > 0:
                        if isinstance(images[0], dict):
                            image_url = images[0].get("url", "")
                    
                    menu_list.append({
                        "name": value.get("name", ""),
                        "price": str(value.get("price", "")),
                        "image": image_url
                    })
        except Exception as e:
            logger.error(f"메뉴 파싱 오류: {str(e)}")
        
        return menu_list
    
    def _parse_business_hours(self, place_data: Dict) -> Optional[str]:
        """영업 시간 파싱"""
        try:
            hours = place_data.get("businessHours", {})
            if isinstance(hours, dict):
                return json.dumps(hours, ensure_ascii=False)
            return str(hours) if hours else None
        except:
            return None
    
    def _extract_menu_images(self, apollo_data: Dict) -> List[str]:
        """메뉴판 이미지 추출"""
        images = []
        
        try:
            for key, value in apollo_data.items():
                if "menuImages" in key or (isinstance(value, dict) and "menuImages" in str(value)):
                    if isinstance(value, dict) and "images" in value:
                        for img in value.get("images", []):
                            if isinstance(img, dict) and "url" in img:
                                images.append(img["url"])
        except Exception as e:
            logger.error(f"메뉴 이미지 추출 오류: {str(e)}")
        
        return images[:10]  # 최대 10개
    
    def _extract_facility_images(self, apollo_data: Dict) -> List[str]:
        """인테리어/외부 이미지 추출"""
        images = []
        
        try:
            for key, value in apollo_data.items():
                if "Photo:" in key:
                    if isinstance(value, dict) and "url" in value:
                        images.append(value["url"])
        except Exception as e:
            logger.error(f"시설 이미지 추출 오류: {str(e)}")
        
        return images[:20]  # 최대 20개
    
    def _parse_int(self, value) -> int:
        """정수 파싱"""
        if value is None:
            return 0
        if isinstance(value, int):
            return value
        try:
            return int(str(value).replace(',', ''))
        except:
            return 0
    
    def _parse_float(self, value) -> Optional[float]:
        """실수 파싱"""
        if value is None or value == "":
            return None
        try:
            return float(value)
        except:
            return None


# 싱글톤 인스턴스
place_details_service = NaverPlaceDetailsService()
