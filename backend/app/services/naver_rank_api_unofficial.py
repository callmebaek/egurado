"""
Naver Place Rank Service (신API 방식)
네이버 GraphQL API를 직접 호출하는 고속 순위 체크 서비스

⚠️ 경고: 이 코드는 네이버의 내부 API를 사용합니다.
         교육 목적으로만 사용하세요.

실제 구현: 네이버가 사용하는 GraphQL API를 직접 호출 (빠름!)

🛡️ 폴백 전략:
1차: 프록시 경유 → 2차: 직접 연결 → 3차: Playwright 크롤링
"""
import logging
import httpx
import json
from typing import Dict, List, Optional
import asyncio
from app.core.proxy import get_proxy, report_proxy_success, report_proxy_failure

logger = logging.getLogger(__name__)


class NaverRankNewAPIService:
    """네이버 플레이스 신API 순위 체크 서비스 (GraphQL 직접 호출)
    
    네이버 내부 GraphQL API를 직접 호출하여 빠른 순위 확인 제공
    
    🛡️ 3단계 폴백:
    1. 프록시 경유 요청
    2. 프록시 실패 시 직접 연결 재시도
    3. 모두 실패 시 Playwright 크롤링 폴백
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
        logger.info(f"[신API Rank] 순위 체크 시작: keyword={keyword}, place_id={target_place_id}, store_name={store_name}, x={coord_x}, y={coord_y}")
        
        try:
            # 1. GraphQL로 검색 결과 가져오기 (프록시 -> 직접 연결 폴백 포함)
            search_results, total_count = await self._search_places_with_fallback(keyword, max_results, coord_x, coord_y)
            
            if not search_results:
                # GraphQL이 빈 결과를 반환한 경우 - 2초 대기 후 1회 재시도
                logger.warning(f"[신API Rank] 검색 결과 0개 -> 2초 후 1회 재시도")
                await asyncio.sleep(2)
                search_results, total_count = await self._search_places_with_fallback(keyword, max_results, coord_x, coord_y)
                
                if not search_results:
                    logger.warning(f"[신API Rank] 재시도 후에도 검색 결과 없음 -> 크롤링 폴백")
                    raise Exception("GraphQL 검색 결과 없음 - 재시도 포함 모든 연결 방식 실패")
            
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
                    
                    # 🔧 리뷰 수가 둘 다 0일 때 추가 조회 (GraphQL 응답에 누락된 경우 대비)
                    if target_store_data["visitor_review_count"] == 0 and target_store_data["blog_review_count"] == 0:
                        logger.info(f"[신API Rank] ⚠️ 리뷰 수가 0, 추가 조회 시도: place_id={target_place_id}")
                        try:
                            place_detail = await self._get_place_detail(target_place_id)
                            if place_detail:
                                target_store_data["visitor_review_count"] = place_detail.get("visitor_review_count", 0)
                                target_store_data["blog_review_count"] = place_detail.get("blog_review_count", 0)
                                target_store_data["save_count"] = place_detail.get("save_count", 0)
                                logger.info(f"[신API Rank] ✅ 추가 조회 성공: 방문자={target_store_data['visitor_review_count']}, 블로그={target_store_data['blog_review_count']}")
                        except Exception as e:
                            logger.warning(f"[신API Rank] 추가 조회 실패: {str(e)}")
                    
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
                    logger.error(f"[신API Rank] ❌ 매장 정보 조회 실패: {str(e)}")
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
            return await self._fallback_to_crawling(
                keyword, target_place_id, max_results,
                store_name=store_name, coord_x=coord_x, coord_y=coord_y
            )
    
    async def _search_places_with_fallback(
        self, keyword: str, max_results: int, coord_x: str = None, coord_y: str = None
    ) -> tuple[List[Dict], int]:
        """
        🛡️ 페이지별 프록시 → 직접 연결 자동 폴백이 포함된 검색
        
        각 페이지마다 개별적으로 폴백 처리:
        - 프록시로 성공한 페이지는 결과 유지
        - 프록시 실패한 페이지만 직접 연결로 재시도
        - 프록시 실패 시 남은 페이지도 직접 연결로 전환 (불필요한 재시도 방지)
        
        Returns:
            (검색 결과 리스트, 전체 업체수)
        """
        from app.core.proxy import record_request
        
        proxy_url = get_proxy()
        use_proxy = bool(proxy_url)
        
        search_x = coord_x if coord_x else "127.0276"
        search_y = coord_y if coord_y else "37.4979"
        
        if use_proxy:
            logger.info(f"[신API Rank] 프록시 모드 시작 (페이지별 폴백 활성)")
        else:
            logger.info(f"[신API Rank] 직접 연결 모드 (프록시 미설정 또는 비활성)")
        
        logger.info(f"[신API Rank] 검색 위치: x={search_x}, y={search_y}")
        
        all_stores = []
        total_count = 0
        page_size = 100
        proxy_page_successes = 0
        direct_page_successes = 0
        page_num = 0
        
        for start_idx in range(1, max_results + 1, page_size):
            remaining = max_results - len(all_stores)
            if remaining <= 0:
                break
            
            current_display = min(remaining, page_size)
            page_num += 1
            page_data = None
            
            # --- 프록시 시도 ---
            if use_proxy and proxy_url:
                try:
                    logger.info(f"[신API Rank] 페이지{page_num} 요청: start={start_idx}, display={current_display}, 연결=프록시")
                    page_data = await self._fetch_single_page(
                        keyword, start_idx, current_display, search_x, search_y, proxy_url
                    )
                    proxy_page_successes += 1
                    record_request("proxy", True, page=page_num)
                    logger.info(f"[신API Rank] 페이지{page_num} 프록시 성공")
                except Exception as e:
                    record_request("proxy", False, page=page_num, error=str(e))
                    logger.warning(f"[신API Rank] 페이지{page_num} 프록시 실패: {str(e)[:80]} → 이 페이지부터 직접 연결")
                    use_proxy = False  # 남은 페이지도 직접 연결로 전환
            
            # --- 직접 연결 폴백 (프록시 실패 또는 미설정) ---
            if page_data is None:
                try:
                    logger.info(f"[신API Rank] 페이지{page_num} 요청: start={start_idx}, display={current_display}, 연결=직접")
                    page_data = await self._fetch_single_page(
                        keyword, start_idx, current_display, search_x, search_y, None
                    )
                    direct_page_successes += 1
                    record_request("direct", True, page=page_num)
                    logger.info(f"[신API Rank] 페이지{page_num} 직접 연결 성공")
                except Exception as e:
                    record_request("direct", False, page=page_num, error=str(e))
                    logger.error(f"[신API Rank] 페이지{page_num} 직접 연결도 실패: {str(e)[:80]}")
                    break  # 직접 연결도 실패하면 중단
            
            # --- 데이터 추출 ---
            if start_idx == 1:
                total_count = page_data.get("data", {}).get("places", {}).get("total", 0)
                logger.info(f"[신API Rank] 전체 업체수: {total_count}개")
            
            items = page_data.get("data", {}).get("places", {}).get("items", [])
            if not items:
                logger.info(f"[신API Rank] 더 이상 결과 없음 (start={start_idx})")
                break
            
            for item in items:
                all_stores.append(self._parse_store_item(item))
            
            logger.info(f"[신API Rank] 누적 결과: {len(all_stores)}개")
        
        # --- 프록시 상태 보고 ---
        if proxy_page_successes > 0:
            report_proxy_success()
        if proxy_page_successes == 0 and proxy_url:
            report_proxy_failure("모든 페이지에서 프록시 실패")
        
        logger.info(
            f"[신API Rank] 검색 완료: 총 {len(all_stores)}개, "
            f"프록시 성공={proxy_page_successes}페이지, 직접 성공={direct_page_successes}페이지"
        )
        
        return (all_stores, total_count)
    
    async def _fetch_single_page(
        self, keyword: str, start: int, display: int,
        x: str, y: str, proxy_url: str = None
    ) -> dict:
        """GraphQL 단일 페이지 요청
        
        Args:
            keyword: 검색 키워드
            start: 시작 인덱스
            display: 요청 개수
            x: 경도
            y: 위도
            proxy_url: 프록시 URL (None이면 직접 연결)
            
        Returns:
            GraphQL API 응답 JSON
            
        Raises:
            Exception: 요청 실패 시 (호출자가 폴백 처리)
        """
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
        
        variables = {
            "input": {
                "query": keyword,
                "start": start,
                "display": display,
                "deviceType": "mobile",
                "x": x,
                "y": y
            }
        }
        
        payload = {
            "operationName": "getPlacesList",
            "variables": variables,
            "query": graphql_query
        }
        
        # 프록시 사용 시 타임아웃 여유 있게
        timeout = 20.0 if proxy_url else self.timeout
        client_kwargs = {"timeout": timeout}
        if proxy_url:
            client_kwargs["proxy"] = proxy_url
        
        async with httpx.AsyncClient(**client_kwargs) as client:
            response = await client.post(
                self.api_url,
                json=payload,
                headers=self.base_headers,
                follow_redirects=True
            )
            response.raise_for_status()
            return response.json()
    
    @staticmethod
    def _parse_store_item(item: dict) -> dict:
        """GraphQL 응답의 매장 항목을 표준 형식으로 변환"""
        def parse_int(value):
            if value is None:
                return 0
            if isinstance(value, int):
                return value
            try:
                return int(str(value).replace(',', ''))
            except (ValueError, AttributeError):
                return 0
        
        def parse_rating(value):
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
        
        return {
            "place_id": str(item.get("id", "")),
            "name": item.get("name", ""),
            "category": item.get("category", ""),
            "address": item.get("address", ""),
            "road_address": item.get("roadAddress", ""),
            "phone": "",
            "rating": rating,
            "review_count": str(visitor_count),
            "blog_review_count": str(blog_count),
            "visitor_review_count": visitor_count,
            "thumbnail": item.get("imageUrl", ""),
            "x": str(item.get("x", "")),
            "y": str(item.get("y", ""))
        }
    
    async def _get_place_detail(self, place_id: str) -> Dict:
        """특정 매장의 상세 정보 가져오기 (리뷰수, 저장수 등)
        
        🛡️ 프록시 → 직접 연결 폴백 포함
        """
        # 프록시 시도 → 직접 연결 폴백
        proxy_url = get_proxy()
        
        if proxy_url:
            try:
                result = await self._get_place_detail_internal(place_id, proxy_url=proxy_url)
                if result:
                    report_proxy_success()
                    return result
            except Exception as e:
                report_proxy_failure(str(e))
                logger.warning(f"[신API Rank] 상세 조회 프록시 실패: {str(e)} → 직접 연결")
        
        return await self._get_place_detail_internal(place_id, proxy_url=None)
    
    async def _get_place_detail_internal(self, place_id: str, proxy_url: str = None) -> Dict:
        """특정 매장의 상세 정보 가져오기 (내부 구현)"""
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
            
            # 프록시 조건부 설정
            client_kwargs = {"timeout": self.timeout}
            if proxy_url:
                client_kwargs["proxy"] = proxy_url
            
            async with httpx.AsyncClient(**client_kwargs) as client:
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
            logger.error(f"[신API Rank] ❌ 상세 정보 조회 오류: {str(e)}")
            return {
                "visitor_review_count": 0,
                "blog_review_count": 0,
                "save_count": 0
            }
    
    async def _fallback_to_crawling(
        self, 
        keyword: str, 
        target_place_id: str, 
        max_results: int,
        store_name: str = None,
        coord_x: str = None,
        coord_y: str = None
    ) -> Dict:
        """신API 실패 시 크롤링 방식으로 폴백
        
        크롤링으로 순위를 찾은 후, 리뷰수는 별도 API로 조회하여 보완
        """
        try:
            from .naver_rank_service_crawling import rank_service
            logger.info("[신API Rank -> 크롤링] 크롤링 서비스 호출")
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
            
            # 크롤링으로 매장을 찾았으면 리뷰수를 별도 API로 조회
            if result.get("found"):
                logger.info(f"[신API Rank -> 크롤링] 매장 발견 (rank={result.get('rank')}), 리뷰수 별도 조회 시작")
                try:
                    # 1차: GraphQL place detail로 리뷰수 조회
                    place_detail = await self._get_place_detail(target_place_id)
                    if place_detail and (place_detail.get("visitor_review_count", 0) > 0 or place_detail.get("blog_review_count", 0) > 0):
                        target_store = {
                            "place_id": target_place_id,
                            "visitor_review_count": place_detail.get("visitor_review_count", 0),
                            "blog_review_count": place_detail.get("blog_review_count", 0),
                            "save_count": place_detail.get("save_count", 0)
                        }
                        logger.info(
                            f"[신API Rank -> 크롤링] GraphQL 리뷰수 조회 성공: "
                            f"visitor={target_store['visitor_review_count']}, blog={target_store['blog_review_count']}"
                        )
                    else:
                        # 2차: naver_review_service로 리뷰수 조회
                        logger.info("[신API Rank -> 크롤링] GraphQL 리뷰수 0, naver_review_service로 재시도")
                        from .naver_review_service import NaverReviewService
                        review_service = NaverReviewService()
                        place_info = await review_service.get_place_info(
                            place_id=target_place_id,
                            store_name=store_name,
                            x=coord_x,
                            y=coord_y
                        )
                        if place_info:
                            target_store = {
                                "place_id": target_place_id,
                                "visitor_review_count": place_info.get("visitor_review_count", 0),
                                "blog_review_count": place_info.get("blog_review_count", 0),
                                "save_count": 0
                            }
                            logger.info(
                                f"[신API Rank -> 크롤링] review_service 리뷰수 조회 성공: "
                                f"visitor={target_store['visitor_review_count']}, blog={target_store['blog_review_count']}"
                            )
                except Exception as review_err:
                    logger.warning(f"[신API Rank -> 크롤링] 리뷰수 조회 실패 (순위는 유효): {str(review_err)}")
            
            result["target_store"] = target_store
            result["visitor_review_count"] = target_store["visitor_review_count"]
            result["blog_review_count"] = target_store["blog_review_count"]
            result["save_count"] = target_store["save_count"]
            
            logger.info(
                f"[신API Rank -> 크롤링] 최종 결과: rank={result.get('rank')}, "
                f"visitor={target_store['visitor_review_count']}, blog={target_store['blog_review_count']}"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"[신API Rank -> 크롤링] 크롤링도 실패: {str(e)}")
            raise Exception(f"신API와 크롤링 모두 실패: {str(e)}")


# 싱글톤 인스턴스
rank_service_new_api = NaverRankNewAPIService()
# 하위 호환성을 위한 별칭
rank_service_api_unofficial = rank_service_new_api
