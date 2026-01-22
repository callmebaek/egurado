"""
Naver Place Rank Service (신API 방식)
네이버 GraphQL API를 직접 호출하는 고속 순위 체크 서비스

⚠️ 경고: 이 코드는 네이버의 내부 API를 사용합니다.
         교육 목적으로만 사용하세요.

실제 구현: 네이버가 사용하는 GraphQL API를 직접 호출 (빠름!)
"""
import logging
import httpx
import json
from typing import Dict, List, Optional
import asyncio

logger = logging.getLogger(__name__)


class NaverRankNewAPIService:
    """네이버 플레이스 신API 순위 체크 서비스 (GraphQL 직접 호출)
    
    네이버 내부 GraphQL API를 직접 호출하여 빠른 순위 확인 제공
    """
    
    def __init__(self):
        # 네이버 실제 GraphQL API 엔드포인트
        self.api_url = "https://api.place.naver.com/graphql"
        
        # 필수 헤더
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
        
    async def check_rank(
        self, 
        keyword: str, 
        target_place_id: str,
        max_results: int = 300,
        store_name: str = None,
        coord_x: str = None,
        coord_y: str = None
    ) -> Dict:
        """
        특정 키워드에서 매장의 순위 확인 (신API - 빠름!)
        
        Args:
            keyword: 검색 키워드
            target_place_id: 찾을 매장의 Place ID
            max_results: 최대 확인 개수 (기본 300개)
            store_name: 매장명 (300위 밖일 때 리뷰 수 조회에 사용)
            coord_x: 경도 (300위 밖일 때 리뷰 수 조회에 사용)
            coord_y: 위도 (300위 밖일 때 리뷰 수 조회에 사용)
            
        Returns:
            {
                'rank': int 또는 None (순위),
                'total_results': int (검색 결과 개수),
                'total_count': str (전체 업체 수, 예: "1,234"),
                'found': bool (매장 발견 여부),
                'search_results': List[Dict] (순위 내 모든 매장 정보),
                'target_store': Dict (타겟 매장의 상세 정보) - 리뷰수 포함,
                'visitor_review_count': int (방문자 리뷰수),
                'blog_review_count': int (블로그 리뷰수),
                'save_count': int (저장 수)
            }
        """
        logger.info(f"[신API Rank] 순위 체크 시작: keyword={keyword}, place_id={target_place_id}, store_name={store_name}")
        
        try:
            # 1. GraphQL로 검색 결과 가져오기
            search_results, total_count = await self._search_places(keyword, max_results)
            
            if not search_results:
                logger.warning(f"[신API Rank] 검색 결과 없음")
                return {
                    "rank": None,
                    "total_results": 0,
                    "total_count": 0,
                    "found": False,
                    "search_results": [],
                    "target_store": {},
                    "visitor_review_count": 0,
                    "blog_review_count": 0,
                    "save_count": 0
                }
            
            # 2. 순위 찾기
            rank = None
            found = False
            target_store_data = {}
            
            for idx, store in enumerate(search_results, start=1):
                if store.get("place_id") == target_place_id:
                    rank = idx
                    found = True
                    # 검색 결과에서 이미 리뷰수 정보가 포함되어 있음
                    target_store_data = {
                        "place_id": target_place_id,
                        "visitor_review_count": store.get("visitor_review_count", 0),
                        "blog_review_count": int(str(store.get("blog_review_count", "0")).replace(",", "")),
                        "save_count": 0  # 검색 결과에는 save_count가 없으므로 0
                    }
                    break
            
            # 3. 순위를 못 찾았을 때 매장명으로 리뷰 수 조회
            if not found:
                logger.info(f"[신API Rank] ⭐ 순위 없음(300위 밖), 매장명으로 리뷰 수 조회 시도: place_id={target_place_id}, store_name={store_name}")
                try:
                    # naver_review_service 사용 (매장명 검색 방식)
                    from .naver_review_service import NaverReviewService
                    review_service = NaverReviewService()
                    place_info = await review_service.get_place_info(
                        place_id=target_place_id,
                        store_name=store_name,
                        x=coord_x,
                        y=coord_y
                    )
                    
                    if place_info:
                        target_store_data = {
                            "place_id": target_place_id,
                            "visitor_review_count": place_info.get("visitor_review_count", 0),
                            "blog_review_count": place_info.get("blog_review_count", 0),
                            "save_count": 0
                        }
                        logger.info(f"[신API Rank] ✅ 매장명 검색 성공: 방문자={target_store_data['visitor_review_count']}, 블로그={target_store_data['blog_review_count']}")
                    else:
                        logger.warning(f"[신API Rank] 매장 정보 없음 → 리뷰수 0으로 설정")
                        target_store_data = {
                            "place_id": target_place_id,
                            "visitor_review_count": 0,
                            "blog_review_count": 0,
                            "save_count": 0
                        }
                except Exception as e:
                    logger.error(f"[신API Rank] ❌ 매장 정보 조회 실패: {str(e)}", exc_info=True)
                    target_store_data = {
                        "place_id": target_place_id,
                        "visitor_review_count": 0,
                        "blog_review_count": 0,
                        "save_count": 0
                    }
                    logger.warning(f"[신API Rank] 매장 정보 조회 실패 → 리뷰수 0으로 설정")
            
            # 4. 결과 구성
            result = {
                "rank": rank,
                "total_results": len(search_results),
                "total_count": total_count,  # 실제 전체 업체수
                "found": found,
                "search_results": search_results,
                "target_store": target_store_data,
                "visitor_review_count": target_store_data.get("visitor_review_count", 0),
                "blog_review_count": target_store_data.get("blog_review_count", 0),
                "save_count": target_store_data.get("save_count", 0)
            }
            
            logger.info(
                f"[신API Rank] 결과: Found={found}, Rank={rank}, "
                f"방문자리뷰={result['visitor_review_count']}, "
                f"블로그리뷰={result['blog_review_count']}, "
                f"저장수={result['save_count']}"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"[신API Rank] 오류: {str(e)}")
            # 오류 시 크롤링 방식으로 폴백
            logger.info("[신API Rank] 크롤링 방식으로 폴백...")
            return await self._fallback_to_crawling(keyword, target_place_id, max_results)
    
    async def _search_places(self, keyword: str, max_results: int) -> tuple[List[Dict], int]:
        """GraphQL로 매장 검색 (페이지네이션 지원)
        
        Returns:
            (검색 결과 리스트, 전체 업체수)
        """
        try:
            graphql_query = """
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
                    }
                }
            }
            """
            
            all_stores = []
            total_count = 0
            page_size = 100  # API 최대 제한
            
            # 페이지네이션으로 여러 번 요청
            for start_idx in range(1, max_results + 1, page_size):
                # 남은 개수 계산
                remaining = max_results - len(all_stores)
                if remaining <= 0:
                    break
                
                current_display = min(remaining, page_size)
                
                logger.info(f"[신API Rank] 페이지 요청: start={start_idx}, display={current_display}")
                
                variables = {
                    "input": {
                        "query": keyword,
                        "start": start_idx,
                        "display": current_display,
                        "deviceType": "mobile",
                        "x": "127.0276",
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
                    
                    # 전체 업체수 추출 (첫 페이지에서만)
                    if start_idx == 1:
                        total_count = data.get("data", {}).get("places", {}).get("total", 0)
                        logger.info(f"[신API Rank] 전체 업체수: {total_count}개")
                    
                    # 파싱
                    items = data.get("data", {}).get("places", {}).get("items", [])
                    
                    # 결과가 없으면 중단
                    if not items:
                        logger.info(f"[신API Rank] 더 이상 결과 없음 (start={start_idx})")
                        break
                    
                    # 파싱
                    for item in items:
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
                        
                        visitor_count = parse_int(item.get("visitorReviewCount"))
                        blog_count = parse_int(item.get("blogCafeReviewCount"))
                        rating = parse_rating(item.get("visitorReviewScore"))
                        
                        store = {
                            "place_id": str(item.get("id", "")),
                            "name": item.get("name", ""),
                            "category": item.get("category", ""),
                            "address": item.get("address", ""),
                            "road_address": item.get("roadAddress", ""),
                            "phone": "",
                            "rating": rating,  # None 또는 float
                            "review_count": str(visitor_count),
                            "blog_review_count": str(blog_count),
                            "visitor_review_count": visitor_count,
                            "thumbnail": item.get("imageUrl", ""),
                            "x": str(item.get("x", "")),
                            "y": str(item.get("y", ""))
                        }
                        all_stores.append(store)
                    
                    logger.info(f"[신API Rank] 누적 결과: {len(all_stores)}개")
            
            return (all_stores, total_count)
                
        except Exception as e:
            logger.error(f"[신API Rank] 검색 오류: {str(e)}")
            return ([], 0)
    
    async def _get_place_detail(self, place_id: str) -> Dict:
        """특정 매장의 상세 정보 가져오기 (리뷰수, 저장수 등)"""
        try:
            logger.info(f"[신API Rank] _get_place_detail 호출: place_id={place_id}")
            
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
            
            # Places Search 쿼리 사용 (place ID로 직접 조회)
            graphql_query = """
            query getPlacesList($input: PlacesInput) {
                places(input: $input) {
                    items {
                        id
                        name
                        visitorReviewCount
                        blogCafeReviewCount
                        bookingReviewCount
                    }
                }
            }
            """
            
            variables = {
                "input": {
                    "query": place_id,
                    "start": 1,
                    "display": 1
                }
            }
            
            payload = {
                "operationName": "getPlacesList",
                "variables": variables,
                "query": graphql_query
            }
            
            logger.info(f"[신API Rank] GraphQL 요청 payload (Places Search): {payload}")
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.api_url,
                    json=payload,
                    headers=self.base_headers,
                    follow_redirects=True
                )
                
                logger.info(f"[신API Rank] GraphQL 응답 status: {response.status_code}")
                
                response.raise_for_status()
                data = response.json()
                
                places = data.get("data", {}).get("places", {}).get("items", [])
                
                if not places:
                    logger.warning(f"[신API Rank] Places Search에서 매장을 찾지 못함: place_id={place_id}")
                    return {
                        "visitor_review_count": 0,
                        "blog_review_count": 0,
                        "save_count": 0
                    }
                
                place = places[0]
                
                result = {
                    "visitor_review_count": parse_int(place.get("visitorReviewCount")),
                    "blog_review_count": parse_int(place.get("blogCafeReviewCount")),
                    "save_count": 0,  # Places Search에서는 saveCount 없음
                    "booking_review_count": parse_int(place.get("bookingReviewCount"))
                }
                
                logger.info(f"[신API Rank] ✅ 파싱 결과: {result}")
                return result
                
        except Exception as e:
            logger.error(f"[신API Rank] ❌ 상세 정보 조회 오류: {str(e)}", exc_info=True)
            return {
                "visitor_review_count": 0,
                "blog_review_count": 0,
                "save_count": 0
            }
    
    async def _fallback_to_crawling(
        self, 
        keyword: str, 
        target_place_id: str, 
        max_results: int
    ) -> Dict:
        """신API 실패 시 크롤링 방식으로 폴백"""
        try:
            from .naver_rank_service_crawling import rank_service
            logger.info("[신API Rank → 크롤링] 크롤링 서비스 호출")
            result = await rank_service.check_rank(
                keyword=keyword,
                target_place_id=target_place_id,
                max_results=max_results
            )
            
            # target_store 정보 추가
            target_store = {
                "place_id": target_place_id,
                "visitor_review_count": 0,
                "blog_review_count": 0,
                "save_count": 0
            }
            
            if result.get("found") and result.get("search_results"):
                for store in result["search_results"]:
                    if store.get("place_id") == target_place_id:
                        target_store = {
                            "place_id": target_place_id,
                            "visitor_review_count": int(store.get("review_count", 0) or 0),
                            "blog_review_count": 0,
                            "save_count": 0
                        }
                        break
            
            result["target_store"] = target_store
            result["visitor_review_count"] = target_store["visitor_review_count"]
            result["blog_review_count"] = target_store["blog_review_count"]
            result["save_count"] = target_store["save_count"]
            
            return result
            
        except Exception as e:
            logger.error(f"[신API Rank → 크롤링] 크롤링도 실패: {str(e)}")
            raise Exception(f"신API와 크롤링 모두 실패: {str(e)}")


# 싱글톤 인스턴스
rank_service_new_api = NaverRankNewAPIService()
# 하위 호환성을 위한 별칭
rank_service_api_unofficial = rank_service_new_api
