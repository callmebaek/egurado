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
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
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


# 싱글톤 인스턴스
search_service_new_api = NaverPlaceNewAPIService()
# 하위 호환성을 위한 별칭
search_service_api_unofficial = search_service_new_api
