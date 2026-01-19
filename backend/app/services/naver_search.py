"""
Naver Mobile Map Search Service
네이버 모바일 지도에서 매장 정보를 검색하는 서비스

클라우드 환경에서도 안정적으로 동작하도록 설계:
- 타임아웃 설정
- 에러 핸들링
- 리소스 정리
- 진행 상황 로깅
"""
import asyncio
import logging
import time
from typing import List, Dict
from playwright.sync_api import sync_playwright
import re

logger = logging.getLogger(__name__)


class NaverStoreSearchService:
    """네이버 모바일 지도 매장 검색 서비스"""
    
    def __init__(self):
        self.base_url = "https://m.map.naver.com/search2/search.naver"
        self.timeout = 15000  # 15초 타임아웃 (최적화)
        
    async def search_stores(self, query: str) -> List[Dict[str, str]]:
        """
        네이버 모바일 지도에서 매장 검색 (async 래퍼)
        
        Args:
            query: 검색할 매장명
            
        Returns:
            매장 정보 리스트
        """
        # 동기 Playwright를 별도 스레드에서 실행 (Windows subprocess 문제 우회)
        return await asyncio.to_thread(self._search_stores_sync, query)
    
    def _search_stores_sync(self, query: str) -> List[Dict[str, str]]:
        """동기 버전의 매장 검색 (Windows 호환성)"""
        logger.info(f"[Step 1/4] Starting store search for: {query}")
        
        playwright_context = None
        browser = None
        
        try:
            # Playwright 초기화 (동기 버전)
            logger.info("[Step 2/4] Initializing browser...")
            playwright_context = sync_playwright()
            playwright = playwright_context.__enter__()
            
            # 헤드리스 모드로 브라우저 실행 (클라우드 환경 최적화)
            browser = playwright.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                ]
            )
            
            # 한국 환경 설정
            context = browser.new_context(
                locale='ko-KR',
                timezone_id='Asia/Seoul',
                user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
                viewport={'width': 375, 'height': 812},
            )
            
            page = context.new_page()
            
            # 최적화: 불필요한 리소스만 선택적 차단 (속도 + 안정성 균형)
            page.route("**/*", lambda route: (
                route.abort() if (
                    route.request.resource_type in ["font"] or  # 폰트만 차단
                    "/ads/" in route.request.url or  # 광고 경로 차단
                    "/analytics/" in route.request.url  # 분석 스크립트 차단
                )
                else route.continue_()
            ))
            
            # 네이버 모바일 지도 검색
            search_url = f"{self.base_url}?query={query}"
            logger.info(f"[Step 3/4] Navigating to: {search_url}")
            
            # 최적화: domcontentloaded로 빠르게 시작
            page.goto(search_url, wait_until='domcontentloaded', timeout=self.timeout)
            
            # 검색 결과 로딩 대기 (최적화: 1초로 조정 - 안정성 확보)
            time.sleep(1.0)
            
            # 검색 결과 파싱
            logger.info("[Step 4/4] Parsing search results...")
            stores = self._parse_search_results(page)
            
            logger.info(f"Successfully found {len(stores)} stores")
            
            return stores
            
        except Exception as e:
            logger.error(f"Error during store search: {str(e)}", exc_info=True)
            raise
            
        finally:
            if browser:
                browser.close()
                logger.info("Browser closed")
            if playwright_context:
                playwright_context.__exit__(None, None, None)
                logger.info("Playwright stopped")
    
    def _parse_search_results(self, page) -> List[Dict[str, str]]:
        """검색 결과 파싱 (동기 버전)"""
        stores = []
        
        try:
            # 검색 결과 리스트 찾기
            items = page.query_selector_all('ul.search_list li')
            logger.info(f"Found {len(items)} result items")
            
            for idx, item in enumerate(items[:10]):  # 최대 10개
                try:
                    # 매장명
                    name_elem = item.query_selector('strong[class*="item_name"]')
                    name = name_elem.inner_text() if name_elem else None
                    
                    if not name:
                        continue
                    
                    # 카테고리
                    category_elem = item.query_selector('em[class*="item_category"]')
                    category = category_elem.inner_text() if category_elem else ""
                    
                    # 주소
                    address_elem = item.query_selector('button[class*="item_address"]')
                    address = address_elem.inner_text() if address_elem else ""
                    
                    # Place ID 추출
                    place_id = None
                    link_elem = item.query_selector('a[href*="/place/"]')
                    if link_elem:
                        href = link_elem.get_attribute('href')
                        if href:
                            match = re.search(r'/place/(\d+)', href)
                            if match:
                                place_id = match.group(1)
                    
                    # 대표 이미지 URL 추출
                    thumbnail = ""
                    img_elem = item.query_selector('img[class*="thumb"]')
                    if img_elem:
                        thumbnail = img_elem.get_attribute('src') or ""
                    
                    if place_id and name:
                        stores.append({
                            "place_id": place_id,
                            "name": name.strip(),
                            "category": category.strip(),
                            "address": address.strip(),
                            "road_address": "",
                            "thumbnail": thumbnail,
                        })
                        
                        logger.info(f"Parsed store {idx + 1}: {name} (ID: {place_id})")
                        
                except Exception as e:
                    logger.warning(f"Error parsing item {idx}: {str(e)}")
                    continue
            
            return stores
            
        except Exception as e:
            logger.error(f"Error parsing search results: {str(e)}", exc_info=True)
            return []


# 싱글톤 인스턴스
search_service = NaverStoreSearchService()
