"""
네이버 플레이스 API 스크래퍼
⚠️ 경고: 이 코드는 네이버의 비공식 API를 사용합니다.
         교육 목적으로만 사용하세요.
"""

import httpx
import asyncio
import time
from typing import Optional, Dict, List
from dataclasses import dataclass
from loguru import logger

from .proxy_manager import get_proxy_manager


@dataclass
class PlaceRankResult:
    """플레이스 순위 결과"""
    keyword: str
    place_id: str
    place_name: str
    rank: int  # 0 = 순위 없음
    total_count: int
    blog_review_count: int
    visitor_review_count: int
    save_count: int
    category: str
    address: str
    found: bool
    checked_at: str


class NaverPlaceScraper:
    """
    네이버 플레이스 스크래퍼
    
    ⚠️ 이 클래스는 네이버의 비공식 내부 API를 사용합니다.
    """
    
    # 네이버 모바일 플레이스 검색 API (비공식)
    PLACE_SEARCH_API = "https://m.place.naver.com/place/list"
    
    # 사용자 에이전트 (모바일 브라우저 위장)
    USER_AGENTS = [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
        "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    ]
    
    def __init__(
        self,
        use_proxy: bool = True,
        max_retries: int = 3,
        timeout: float = 15.0,
        rate_limit_delay: float = 2.0
    ):
        """
        Args:
            use_proxy: 프록시 사용 여부
            max_retries: 최대 재시도 횟수
            timeout: 요청 타임아웃 (초)
            rate_limit_delay: 요청 간 지연 시간 (초)
        """
        self.use_proxy = use_proxy
        self.max_retries = max_retries
        self.timeout = timeout
        self.rate_limit_delay = rate_limit_delay
        self._last_request_time = 0
    
    async def _wait_rate_limit(self) -> None:
        """Rate Limiting을 위한 대기"""
        if self.rate_limit_delay > 0:
            elapsed = time.time() - self._last_request_time
            if elapsed < self.rate_limit_delay:
                await asyncio.sleep(self.rate_limit_delay - elapsed)
        self._last_request_time = time.time()
    
    async def search_place(
        self,
        keyword: str,
        place_id: Optional[str] = None,
        place_name: Optional[str] = None
    ) -> PlaceRankResult:
        """
        플레이스 검색 및 순위 확인
        
        Args:
            keyword: 검색 키워드
            place_id: 플레이스 ID (선택)
            place_name: 플레이스명 (선택)
        
        Returns:
            PlaceRankResult: 순위 결과
        """
        # Rate Limiting
        await self._wait_rate_limit()
        
        # 프록시 선택
        proxy_url = None
        if self.use_proxy:
            try:
                proxy_manager = get_proxy_manager()
                proxy_url = await proxy_manager.get_proxy()
            except Exception as e:
                logger.warning(f"프록시 로드 실패, 프록시 없이 진행: {e}")
        
        # 재시도 로직
        for attempt in range(self.max_retries):
            try:
                result = await self._fetch_place_data(
                    keyword=keyword,
                    proxy_url=proxy_url,
                    place_id=place_id,
                    place_name=place_name
                )
                
                # 성공 시 프록시 성공 보고
                if self.use_proxy and proxy_url:
                    proxy_manager = get_proxy_manager()
                    await proxy_manager.report_success(proxy_url)
                
                return result
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    # 429 Too Many Requests
                    logger.warning(
                        f"Rate Limiting 발생 (시도 {attempt + 1}/{self.max_retries})"
                    )
                    
                    # 프록시 실패 보고
                    if self.use_proxy and proxy_url:
                        proxy_manager = get_proxy_manager()
                        await proxy_manager.report_failure(proxy_url, e)
                    
                    # 다른 프록시로 재시도
                    if self.use_proxy and attempt < self.max_retries - 1:
                        proxy_url = await proxy_manager.get_proxy()
                        await asyncio.sleep(2 ** attempt)  # 지수 백오프
                    else:
                        raise
                else:
                    raise
            
            except Exception as e:
                logger.error(f"검색 오류 (시도 {attempt + 1}/{self.max_retries}): {e}")
                
                # 프록시 실패 보고
                if self.use_proxy and proxy_url:
                    proxy_manager = get_proxy_manager()
                    await proxy_manager.report_failure(proxy_url, e)
                
                if attempt == self.max_retries - 1:
                    raise
                
                await asyncio.sleep(1)
        
        # 모든 재시도 실패
        raise Exception(f"최대 재시도 횟수 초과: {self.max_retries}")
    
    async def _fetch_place_data(
        self,
        keyword: str,
        proxy_url: Optional[str],
        place_id: Optional[str],
        place_name: Optional[str]
    ) -> PlaceRankResult:
        """
        네이버 API에서 플레이스 데이터 가져오기
        
        ⚠️ 이 함수는 네이버의 비공식 API를 호출합니다.
        """
        import random
        
        # HTTP 클라이언트 설정
        proxies = proxy_url if proxy_url else None
        headers = {
            "User-Agent": random.choice(self.USER_AGENTS),
            "Referer": "https://m.place.naver.com/",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
        }
        
        # API 요청 파라미터 (실제 네이버 앱과 동일하게)
        params = {
            "query": keyword,
            "type": "place",
        }
        
        start_time = time.time()
        
        async with httpx.AsyncClient(
            proxies=proxies,
            timeout=self.timeout,
            follow_redirects=True
        ) as client:
            response = await client.get(
                self.PLACE_SEARCH_API,
                headers=headers,
                params=params
            )
            response.raise_for_status()
        
        response_time = time.time() - start_time
        logger.debug(f"API 응답 시간: {response_time:.2f}초")
        
        # 응답 파싱
        data = response.json()
        
        # 검색 결과에서 플레이스 찾기
        return self._parse_response(
            data=data,
            keyword=keyword,
            place_id=place_id,
            place_name=place_name
        )
    
    def _parse_response(
        self,
        data: Dict,
        keyword: str,
        place_id: Optional[str],
        place_name: Optional[str]
    ) -> PlaceRankResult:
        """
        API 응답 파싱
        
        응답 구조 (예상):
        {
            "result": {
                "place": {
                    "list": [
                        {
                            "id": "1580429575",
                            "name": "오아카페",
                            "category": ["카페","디저트"],
                            "roadAddress": "서울특별시...",
                            "reviewCount": 433,
                            "bookingReviewCount": 305,
                            "keepCount": 1250
                        }
                    ],
                    "total": 1109
                }
            }
        }
        """
        # 데이터 구조 확인
        if "result" not in data:
            logger.error(f"예상치 못한 응답 구조: {data}")
            raise ValueError("Invalid response structure")
        
        result = data.get("result", {})
        place_data = result.get("place", {})
        items = place_data.get("list", [])
        total_count = place_data.get("total", 0)
        
        logger.info(f"검색 결과: {len(items)}개 (전체: {total_count}개)")
        
        # 플레이스 찾기
        rank = 0
        found_place = None
        
        for idx, item in enumerate(items, start=1):
            item_id = str(item.get("id", ""))
            item_name = item.get("name", "")
            
            # ID 또는 이름으로 매칭
            if (place_id and item_id == place_id) or \
               (place_name and place_name in item_name):
                rank = idx
                found_place = item
                logger.success(f"플레이스 발견! 순위: {rank}위 - {item_name}")
                break
        
        # 결과 생성
        if found_place:
            return PlaceRankResult(
                keyword=keyword,
                place_id=found_place.get("id", ""),
                place_name=found_place.get("name", ""),
                rank=rank,
                total_count=total_count,
                blog_review_count=found_place.get("bookingReviewCount", 0),
                visitor_review_count=found_place.get("reviewCount", 0),
                save_count=found_place.get("keepCount", 0),
                category=", ".join(found_place.get("category", [])),
                address=found_place.get("roadAddress", ""),
                found=True,
                checked_at=time.strftime("%Y-%m-%d %H:%M:%S")
            )
        else:
            logger.warning(f"플레이스를 찾을 수 없습니다: {place_id or place_name}")
            return PlaceRankResult(
                keyword=keyword,
                place_id=place_id or "",
                place_name=place_name or "",
                rank=0,
                total_count=total_count,
                blog_review_count=0,
                visitor_review_count=0,
                save_count=0,
                category="",
                address="",
                found=False,
                checked_at=time.strftime("%Y-%m-%d %H:%M:%S")
            )
    
    async def batch_search(
        self,
        searches: List[Dict[str, str]]
    ) -> List[PlaceRankResult]:
        """
        여러 검색을 일괄 처리
        
        Args:
            searches: [{"keyword": "...", "place_id": "...", "place_name": "..."}]
        
        Returns:
            List[PlaceRankResult]: 순위 결과 리스트
        """
        tasks = [
            self.search_place(
                keyword=s["keyword"],
                place_id=s.get("place_id"),
                place_name=s.get("place_name")
            )
            for s in searches
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 예외 처리
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"검색 실패 [{i}]: {result}")
                # 빈 결과 추가
                s = searches[i]
                processed_results.append(PlaceRankResult(
                    keyword=s["keyword"],
                    place_id=s.get("place_id", ""),
                    place_name=s.get("place_name", ""),
                    rank=0,
                    total_count=0,
                    blog_review_count=0,
                    visitor_review_count=0,
                    save_count=0,
                    category="",
                    address="",
                    found=False,
                    checked_at=time.strftime("%Y-%m-%d %H:%M:%S")
                ))
            else:
                processed_results.append(result)
        
        return processed_results


# 사용 예시
if __name__ == "__main__":
    async def test():
        # 프록시 매니저 초기화 (선택사항)
        from proxy_manager import init_proxy_manager
        
        proxies = [
            # 여기에 실제 프록시 주소 추가
            # "http://user:pass@proxy1.example.com:8080",
            # "http://user:pass@proxy2.example.com:8080",
        ]
        
        if proxies:
            init_proxy_manager(proxies)
        
        # 스크래퍼 생성
        scraper = NaverPlaceScraper(
            use_proxy=bool(proxies),
            max_retries=3,
            rate_limit_delay=2.0
        )
        
        # 단일 검색
        result = await scraper.search_place(
            keyword="성수사진",
            place_id="1580429575",
            place_name="오아카페"
        )
        
        print("\n=== 검색 결과 ===")
        print(f"키워드: {result.keyword}")
        print(f"플레이스명: {result.place_name}")
        print(f"순위: {result.rank}위")
        print(f"전체: {result.total_count}개")
        print(f"블로그 리뷰: {result.blog_review_count}개")
        print(f"방문자 리뷰: {result.visitor_review_count}개")
        print(f"저장수: {result.save_count}개")
        print(f"카테고리: {result.category}")
        print(f"주소: {result.address}")
    
    asyncio.run(test())
