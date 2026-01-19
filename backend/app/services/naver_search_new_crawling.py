"""
Naver Place Search Service (New URL)
새로운 네이버 플레이스 URL을 사용한 매장 검색 서비스

URL: https://m.place.naver.com/place/list?query=...&display=100
장점: 한 번에 100개 로드, 스크롤 불필요, 더 빠른 속도
"""
import asyncio
import logging
import time
import urllib.parse
from typing import List, Dict
from playwright.sync_api import sync_playwright
import re

logger = logging.getLogger(__name__)


class NaverPlaceSearchService:
    """네이버 플레이스 검색 서비스 (새 URL)"""
    
    def __init__(self):
        self.base_url = "https://m.place.naver.com/place/list"
        self.timeout = 15000  # 15초 타임아웃
        
    async def search_stores(self, query: str, max_results: int = 100) -> List[Dict[str, str]]:
        """
        네이버 플레이스에서 매장 검색
        
        Args:
            query: 검색할 매장명
            max_results: 최대 결과 개수 (기본 100개)
            
        Returns:
            매장 정보 리스트
        """
        return await asyncio.to_thread(self._search_stores_sync, query, max_results)
    
    def _search_stores_sync(self, query: str, max_results: int) -> List[Dict[str, str]]:
        """동기 버전의 매장 검색"""
        logger.info(f"[Search] Starting search for: {query}")
        
        playwright_manager = None
        browser = None
        
        try:
            # Playwright 시작
            playwright_manager = sync_playwright().start()
            
            browser = playwright_manager.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                ]
            )
            
            context = browser.new_context(
                locale='ko-KR',
                timezone_id='Asia/Seoul',
                user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
                viewport={'width': 375, 'height': 812},
            )
            
            page = context.new_page()
            
            # 리소스 최적화
            page.route("**/*", lambda route: (
                route.abort() if (
                    route.request.resource_type in ["font"] or
                    "/ads/" in route.request.url or
                    "/analytics/" in route.request.url
                )
                else route.continue_()
            ))
            
            # 검색 URL 생성
            query_encoded = urllib.parse.quote(query)
            search_url = (
                f"{self.base_url}?"
                f"query={query_encoded}&"
                f"level=top&"
                f"entry=pll"
            )
            
            logger.info(f"[Search] Navigating to: {search_url[:100]}...")
            page.goto(search_url, wait_until='domcontentloaded', timeout=self.timeout)
            
            # JavaScript 렌더링 대기 - 링크가 나타날 때까지 기다림
            try:
                page.wait_for_selector('a[href*="/place/"]', timeout=10000)
            except:
                # 타임아웃되어도 계속 진행 (페이지가 비어있을 수 있음)
                pass
            
            # 추가 안정화 대기
            time.sleep(1.0)
            
            # 디버깅: 페이지 정보 확인
            logger.info(f"[Search] Page URL: {page.url}")
            logger.info(f"[Search] Page title: {page.title()}")
            
            # 검색 결과 파싱
            logger.info("[Search] Parsing search results...")
            stores = self._parse_search_results(page)
            
            logger.info(f"[Search] Found {len(stores)} unique stores")
            
            return stores[:max_results]
            
        except Exception as e:
            logger.error(f"Error during store search: {str(e)}", exc_info=True)
            raise
            
        finally:
            if browser:
                browser.close()
            if playwright_manager:
                playwright_manager.stop()
    
    def _parse_search_results(self, page) -> List[Dict[str, str]]:
        """검색 결과 파싱"""
        stores = []
        seen_place_ids = set()  # 중복 제거용
        
        try:
            # 모든 매장 링크 가져오기
            all_links = page.query_selector_all('a[href*="/place/"]')
            logger.info(f"Found {len(all_links)} total place links")
            
            for link in all_links:
                try:
                    # href 가져오기
                    href = link.get_attribute('href')
                    if not href:
                        continue
                    
                    # /photo 링크 제외 (이미지 갤러리)
                    if '/photo' in href:
                        continue
                    
                    # Place ID 추출
                    match = re.search(r'/place/(\d+)', href)
                    if not match:
                        continue
                    
                    place_id = match.group(1)
                    
                    # 이미 처리한 Place ID면 스킵
                    if place_id in seen_place_ids:
                        continue
                    
                    # 링크의 텍스트 가져오기 (매장명이 있는지 확인)
                    try:
                        link_text = link.inner_text()
                    except:
                        link_text = ""
                    
                    # 텍스트가 너무 짧으면 스킵 (영업시간 등)
                    if len(link_text.strip()) < 3:
                        continue
                    
                    # 매장명 추출 - span.YwYLL
                    name = None
                    name_elem = link.query_selector('span.YwYLL')
                    if name_elem:
                        try:
                            name = name_elem.inner_text().strip()
                        except:
                            pass
                    
                    if not name:
                        continue
                    
                    # 카테고리 추출 - span.YzBgS
                    category = ""
                    category_elem = link.query_selector('span.YzBgS')
                    if category_elem:
                        try:
                            category = category_elem.inner_text().strip()
                        except:
                            pass
                    
                    # 주소와 썸네일은 공유 버튼의 data 속성에서 추출
                    address = ""
                    thumbnail = ""
                    
                    # 공유 버튼 찾기: data-url에 place_id가 포함된 요소
                    share_button = page.query_selector(f'a[data-url*="id={place_id}"]')
                    
                    if share_button:
                        # 주소
                        address = share_button.get_attribute('data-line-description') or ""
                        # 썸네일
                        thumbnail = share_button.get_attribute('data-kakaotalk-image-url') or ""
                    
                    # 매장 정보 저장
                    store_info = {
                        "place_id": place_id,
                        "name": name,
                        "category": category,
                        "address": address,
                        "road_address": "",
                        "thumbnail": thumbnail,
                    }
                    
                    stores.append(store_info)
                    seen_place_ids.add(place_id)
                    
                    logger.debug(f"Parsed store: {name} (ID: {place_id})")
                    
                except Exception as e:
                    logger.warning(f"Error parsing link: {str(e)}")
                    continue
            
            return stores
            
        except Exception as e:
            logger.error(f"Error parsing search results: {str(e)}", exc_info=True)
            return []


# 싱글톤 인스턴스
search_service_new = NaverPlaceSearchService()
