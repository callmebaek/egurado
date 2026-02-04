"""
Naver Place Search Service (신API 방식)
네이버 GraphQL API를 직접 호출하는 고속 검색 서비스

⚠️ 경고: 이 코드는 네이버의 내부 API를 사용합니다.
         교육 목적으로만 사용하세요.

실제 구현: 네이버가 사용하는 GraphQL API를 직접 호출 (빠름!)
"""
import logging
import httpx
import json
from typing import List, Dict, Optional
import asyncio
import random
from app.core.proxy import get_rotating_proxy

logger = logging.getLogger(__name__)


class NaverPlaceNewAPIService:
    """네이버 플레이스 신API 서비스 (GraphQL 직접 호출)
    
    네이버 내부 GraphQL API를 직접 호출하여 빠른 검색 제공
    """
    
    def __init__(self):
        # 네이버 실제 GraphQL API 엔드포인트
        self.api_url = "https://api.place.naver.com/graphql"
        
        # 필수 헤더 (실제 네이버 모바일과 동일하게)
        self.base_headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Content-Type": "application/json",
            "Origin": "https://m.place.naver.com",
            "Referer": "https://m.place.naver.com/",
            "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120"',
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": '"iOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
        }
        
        self.timeout = 15.0
        self.proxies = get_rotating_proxy()
        
    async def search_stores(self, query: str, max_results: int = 100) -> List[Dict[str, str]]:
        """
        네이버 플레이스에서 매장 검색 (신API - 빠름!)
        
        Args:
            query: 검색할 매장명
            max_results: 최대 결과 개수 (기본 100개)
            
        Returns:
            매장 정보 리스트
        """
        logger.info(f"[신API] 검색 시작: {query}")
        
        try:
            # GraphQL Query 구성
            graphql_query = self._build_search_query()
            variables = {
                "input": {
                    "query": query,
                    "start": 1,
                    "display": min(max_results, 100),
                    "deviceType": "mobile",
                    "x": "127.0276",  # 서울 기준 좌표
                    "y": "37.4979"
                }
            }
            
            payload = {
                "operationName": "getPlacesList",
                "variables": variables,
                "query": graphql_query
            }
            
            async with httpx.AsyncClient(timeout=self.timeout, proxies=self.proxies) as client:
                response = await client.post(
                    self.api_url,
                    json=payload,
                    headers=self.base_headers,
                    follow_redirects=True
                )
                
                response.raise_for_status()
                data = response.json()
                
                # 응답 파싱
                stores = self._parse_graphql_response(data)
                
                logger.info(f"[신API] 검색 완료: {len(stores)}개 발견")
                return stores
                
        except httpx.HTTPStatusError as e:
            logger.error(f"[신API] HTTP 오류 {e.response.status_code}: {e.response.text[:200]}")
            # GraphQL API 실패 시 크롤링 방식으로 폴백
            logger.info("[신API] 크롤링 방식으로 폴백...")
            return await self._fallback_to_crawling(query, max_results)
        except Exception as e:
            logger.error(f"[신API] 오류: {str(e)}")
            # 오류 시 크롤링 방식으로 폴백
            logger.info("[신API] 크롤링 방식으로 폴백...")
            return await self._fallback_to_crawling(query, max_results)
    
    def _build_search_query(self) -> str:
        """GraphQL 쿼리 문자열 생성"""
        # 네이버가 실제 사용하는 GraphQL 쿼리 패턴 (모든 가능한 필드)
        return """
        query getPlacesList($input: PlacesInput) {
            places(input: $input) {
                total
                items {
                    id
                    name
                    category
                    address
                    roadAddress
                    x
                    y
                    imageUrl
                    blogCafeReviewCount
                    visitorReviewCount
                    visitorReviewScore
                    bookingUrl
                    bookingReviewCount
                    virtualPhone
                    distance
                    imageCount
                }
            }
        }
        """
    
    def _parse_graphql_response(self, data: Dict) -> List[Dict[str, str]]:
        """GraphQL 응답을 우리 포맷으로 변환"""
        stores = []
        
        try:
            # GraphQL 응답 구조: data.places.items
            items = data.get("data", {}).get("places", {}).get("items", [])
            
            if not items:
                logger.warning("[신API] 응답에 items가 없음")
                return []
            
            # 숫자 파싱 헬퍼 함수
            def parse_int(value):
                """쉼표가 포함된 문자열을 정수로 변환"""
                if value is None:
                    return 0
                if isinstance(value, int):
                    return value
                try:
                    return int(str(value).replace(',', ''))
                except (ValueError, AttributeError):
                    return 0
            
            def parse_rating(value):
                """평점을 float로 변환, 없으면 None"""
                if value is None or value == "" or value == "None":
                    return None
                try:
                    rating = float(value)
                    return rating if rating > 0 else None
                except (ValueError, TypeError):
                    return None
            
            for item in items:
                visitor_count = parse_int(item.get("visitorReviewCount"))
                blog_count = parse_int(item.get("blogCafeReviewCount"))
                booking_count = parse_int(item.get("bookingReviewCount"))
                rating = parse_rating(item.get("visitorReviewScore"))
                
                store = {
                    "place_id": str(item.get("id", "")),
                    "name": item.get("name", ""),
                    "category": item.get("category", ""),
                    "address": item.get("address", ""),
                    "road_address": item.get("roadAddress", ""),
                    "thumbnail": item.get("imageUrl", ""),
                    "phone": item.get("virtualPhone", ""),  # ⭐ 전화번호!
                    "rating": rating,  # ⭐ 평점!
                    "review_count": str(visitor_count),
                    "blog_review_count": str(blog_count),
                    "visitor_review_count": str(visitor_count),
                    "booking_review_count": str(booking_count),  # ⭐ 예약 리뷰
                    "x": str(item.get("x", "")),
                    "y": str(item.get("y", "")),
                    "booking_url": item.get("bookingUrl", ""),  # ⭐ 예약 URL
                    "image_count": parse_int(item.get("imageCount")),  # ⭐ 이미지 수
                }
                stores.append(store)
            
            logger.info(f"[신API] {len(stores)}개 매장 파싱 완료")
        
        except Exception as e:
            logger.error(f"[신API] 응답 파싱 오류: {str(e)}")
            logger.error(f"[신API] 응답 구조: {json.dumps(data, ensure_ascii=False)[:500]}")
        
        return stores
    
    async def _fallback_to_crawling(self, query: str, max_results: int) -> List[Dict[str, str]]:
        """신API 실패 시 크롤링 방식으로 폴백"""
        try:
            from .naver_search_new_crawling import search_service_new
            logger.info("[신API → 크롤링] 크롤링 서비스 호출")
            results = await search_service_new.search_stores(query, max_results)
            return results
        except Exception as e:
            logger.error(f"[신API → 크롤링] 크롤링도 실패: {str(e)}")
            raise Exception(f"신API와 크롤링 모두 실패: {str(e)}")


    async def check_naverpay_from_search_html(self, place_id: str, store_name: str) -> bool:
        """검색 결과 HTML에서 네이버페이 아이콘 확인
        
        Args:
            place_id: 네이버 플레이스 ID
            store_name: 매장명
            
        Returns:
            네이버페이 사용 여부 (True: 사용중, False: 미사용)
        """
        logger.info(f"[네이버페이 체크] place_id={place_id}, store_name={store_name}")
        
        try:
            # 모바일 지도 검색 결과 페이지 크롤링 (네이버페이 아이콘은 검색 리스트에만 표시됨)
            search_url = f"https://m.map.naver.com/search2/search.naver?query={store_name}"
            
            headers = {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "ko-KR,ko;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
            }
            
            async with httpx.AsyncClient(timeout=self.timeout, proxies=self.proxies) as client:
                response = await client.get(search_url, headers=headers, follow_redirects=True)
                response.raise_for_status()
                html = response.text
            
            logger.info(f"[네이버페이 체크] HTML 길이: {len(html):,}자")
            
            # place_id가 HTML에 있는지 확인
            if place_id not in html:
                logger.warning(f"[네이버페이 체크] place_id '{place_id}'가 검색 결과에 없음 (HTML 길이: {len(html):,}자)")
                return False
            
            # place_id 위치 찾기
            place_id_pattern = f'/place/{place_id}/'
            place_id_idx = html.find(place_id_pattern)
            
            if place_id_idx == -1:
                # 패턴 없이 place_id만 확인
                place_id_idx = html.find(place_id)
                logger.info(f"[네이버페이 체크] place_id 위치: {place_id_idx}")
                
                if place_id_idx == -1:
                    logger.warning(f"[네이버페이 체크] place_id를 찾을 수 없음")
                    return False
            else:
                logger.info(f"[네이버페이 체크] place_id 패턴 위치: {place_id_idx}")
            
            # place_id 주변 4000자 확인 (앞 2000자 + 뒤 2000자)
            start_idx = max(0, place_id_idx - 2000)
            end_idx = min(len(html), place_id_idx + 2000)
            context = html[start_idx:end_idx]
            
            logger.info(f"[네이버페이 체크] 검색 범위: {start_idx}~{end_idx} (총 {len(context)}자)")
            
            # 네이버페이 정보는 JSON 데이터에 포함됨
            # 실제 패턴: "hasNPay":true 또는 "hasNPay":false
            # JSON 형식: {"id":1132863024,"name":"...","hasNPay":true,...}
            
            # ⚠️ 중요: 해당 place_id의 JSON 객체만 정확히 파싱해야 함
            # 인근 다른 매장의 hasNPay를 잘못 감지하는 것을 방지
            
            # place_id를 포함하는 JSON 객체의 정확한 범위 찾기
            json_pattern = f'"id":{place_id}'
            if json_pattern in html:
                json_start = html.find(json_pattern)
                
                # JSON 객체의 시작 { 찾기 (뒤에서 앞으로 검색)
                obj_start = html.rfind('{', max(0, json_start - 1000), json_start)
                if obj_start == -1:
                    obj_start = max(0, json_start - 100)
                
                # JSON 객체의 끝 } 찾기 (앞에서 뒤로 검색, 첫 번째 }가 아니라 매칭되는 }를 찾아야 함)
                # 간단한 방법: 다음 {"id": 패턴 직전까지 또는 최대 3000자
                next_id_pattern = '{"id":'
                next_id_idx = html.find(next_id_pattern, json_start + 10)
                
                if next_id_idx != -1:
                    # 다음 객체가 있으면 그 직전까지
                    obj_end = next_id_idx
                else:
                    # 없으면 최대 3000자까지
                    obj_end = min(len(html), json_start + 3000)
                
                # 이 객체 내에서만 hasNPay 확인
                json_object = html[obj_start:obj_end]
                
                has_npay_true = '"hasNPay":true' in json_object
                has_npay_false = '"hasNPay":false' in json_object
                
                logger.info(f"[네이버페이 체크] JSON 객체 범위: {obj_start}~{obj_end} (길이: {len(json_object)}자)")
                logger.info(f"[네이버페이 체크] hasNPay:true={has_npay_true}, hasNPay:false={has_npay_false}")
            else:
                logger.warning(f"[네이버페이 체크] JSON 패턴 '{json_pattern}'을 찾을 수 없음")
                has_npay_true = False
                has_npay_false = False
            
            has_naverpay = has_npay_true
            
            if has_naverpay:
                logger.info(f"[네이버페이 체크] ✅ 네이버페이 사용 중: {store_name} (JSON 데이터 확인)")
            else:
                logger.info(f"[네이버페이 체크] ❌ 네이버페이 미사용: {store_name} (hasNPay:true 없음)")
            
            return has_naverpay
            
        except Exception as e:
            logger.error(f"[네이버페이 체크] 오류: {str(e)}")
            # 오류 시 False 반환 (보수적 판단)
            return False


# 싱글톤 인스턴스
search_service_new_api = NaverPlaceNewAPIService()
# 하위 호환성을 위한 별칭
search_service_api_unofficial = search_service_new_api
