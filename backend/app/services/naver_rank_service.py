"""
Naver Place Rank Service
네이버 플레이스 키워드 순위 체크 서비스

새 URL 사용:
- https://m.place.naver.com/place/list?query=...&display=200
- 한 번에 200개 로드, 스크롤 불필요
- 더 빠른 속도 (2-3초)
"""
import asyncio
import logging
import time
import urllib.parse
from typing import Dict, Optional, List
from playwright.sync_api import sync_playwright
import re

logger = logging.getLogger(__name__)


class NaverRankService:
    """네이버 플레이스 키워드 순위 체크 서비스"""
    
    def __init__(self):
        self.base_url = "https://m.place.naver.com/place/list"
        self.timeout = 15000  # 15초 타임아웃
        
    async def check_rank(
        self, 
        keyword: str, 
        target_place_id: str,
        max_results: int = 300
    ) -> Dict:
        """
        특정 키워드에서 매장의 순위 확인
        
        Args:
            keyword: 검색 키워드
            target_place_id: 찾을 매장의 Place ID
            max_results: 최대 확인 개수 (기본 300개)
            
        Returns:
            {
                'rank': int 또는 None,
                'total_results': int,
                'found': bool,
                'search_results': List[Dict] (순위 내 모든 매장 정보)
            }
        """
        return await asyncio.to_thread(
            self._check_rank_sync, 
            keyword, 
            target_place_id,
            max_results
        )
    
    def _check_rank_sync(
        self, 
        keyword: str, 
        target_place_id: str,
        max_results: int
    ) -> Dict:
        """동기 버전의 순위 체크 (Windows 호환성)"""
        logger.info(f"[Rank Check] Keyword: {keyword}, Target Place ID: {target_place_id}")
        
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
            
            # 검색 실행 (새 URL)
            keyword_encoded = urllib.parse.quote(keyword)
            search_url = (
                f"{self.base_url}?"
                f"query={keyword_encoded}&"
                f"level=top&"
                f"entry=pll"
            )
            logger.info(f"[Rank Check] Navigating to: {search_url[:100]}...")
            
            page.goto(search_url, wait_until='domcontentloaded', timeout=self.timeout)
            
            # JavaScript 렌더링 대기
            try:
                page.wait_for_selector('a[href*="/place/"]', timeout=10000)
            except:
                pass  # 타임아웃되어도 계속 진행
            
            time.sleep(1.0)  # 안정화 대기
            
            # 검색 결과 파싱 및 순위 확인
            result = self._parse_and_find_rank(page, target_place_id, max_results)
            
            logger.info(
                f"[Rank Check] Result - Found: {result['found']}, "
                f"Rank: {result['rank']}, Total: {result['total_results']}"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error during rank check: {str(e)}", exc_info=True)
            raise
            
        finally:
            if browser:
                browser.close()
            if playwright_manager:
                playwright_manager.stop()
    
    def _parse_and_find_rank(
        self, 
        page, 
        target_place_id: str,
        max_results: int
    ) -> Dict:
        """
        검색 결과 파싱 및 순위 확인
        
        새 URL 사용:
        - 스크롤 불필요 (한 번에 display 개수만큼 로드)
        - 빠른 속도 (2-3초)
        """
        search_results = []
        found_rank = None
        total_count_text = None  # 전체 업체 수
        seen_place_ids = set()  # 중복 제거
        
        try:
            # 전체 검색 결과 수 추출
            try:
                # span[class*="count"] 또는 텍스트 검색
                count_elems = page.query_selector_all('span[class*="count"]')
                for elem in count_elems:
                    try:
                        text = elem.inner_text().strip()
                        # 숫자가 크고 콤마가 있으면 전체 개수일 가능성
                        if text and ',' in text:
                            numbers = text.replace(',', '')
                            if numbers.isdigit() and int(numbers) > 50:
                                total_count_text = text
                                logger.info(f"[Total Count] 전체 업체 수: {total_count_text}개")
                                break
                    except:
                        pass
            except Exception as e:
                logger.warning(f"전체 업체 수 추출 실패: {e}")
            
            # 매장 링크 파싱 (스크롤 없이 한 번에)
            logger.info(f"[Parsing] 검색 결과 파싱 중...")
            # 모든 매장 링크 가져오기
            all_links = page.query_selector_all('a[href*="/place/"]')
            logger.info(f"[Parsing] Found {len(all_links)} total links")
            
            for link in all_links:
                if len(search_results) >= max_results:
                    break
                
                try:
                    # href 가져오기
                    href = link.get_attribute('href')
                    if not href:
                        continue
                    
                    # /photo 링크 제외
                    if '/photo' in href:
                        continue
                    
                    # Place ID 추출
                    match = re.search(r'/place/(\d+)', href)
                    if not match:
                        continue
                    
                    place_id = match.group(1)
                    
                    # 중복 제거
                    if place_id in seen_place_ids:
                        continue
                    
                    # 링크 텍스트 확인
                    try:
                        link_text = link.inner_text()
                    except:
                        link_text = ""
                    
                    if len(link_text.strip()) < 3:
                        continue
                    
                    # 매장명 추출
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
                    share_selector = f'a[data-url*="id={place_id}"]'
                    share_button = page.query_selector(share_selector)
                    
                    if share_button:
                        # 주소
                        address = share_button.get_attribute('data-line-description') or ""
                        # 썸네일
                        thumbnail = share_button.get_attribute('data-kakaotalk-image-url') or ""
                    
                    # 평점과 리뷰 수는 새 URL에서 제공하지 않음
                    rating = None
                    review_count = None
                    
                    current_rank = len(search_results) + 1
                    
                    store_info = {
                        'rank': current_rank,
                        'place_id': place_id,
                        'name': name,
                        'category': category,
                        'address': address,
                        'thumbnail': thumbnail,
                        'rating': rating,
                        'review_count': review_count,
                    }
                    
                    search_results.append(store_info)
                    seen_place_ids.add(place_id)
                    
                    # 타겟 매장을 찾았는지 확인
                    if place_id == target_place_id and found_rank is None:
                        found_rank = current_rank
                        logger.info(f"[Found] Target store found at rank {current_rank}")
                    
                    logger.debug(f"Parsed rank {current_rank}: {name} (ID: {place_id})")
                    
                except Exception as e:
                    logger.warning(f"Error parsing link: {str(e)}")
                    continue
            
            logger.info(f"[Parsing] Parsed {len(search_results)} unique stores")
            
            return {
                'found': found_rank is not None,
                'rank': found_rank,
                'total_results': len(search_results),
                'total_count': total_count_text,  # 전체 업체 수 추가
                'search_results': search_results,
                'keyword': page.url  # 실제 검색된 URL
            }
            
        except Exception as e:
            logger.error(f"Error parsing search results: {str(e)}", exc_info=True)
            return {
                'found': False,
                'rank': None,
                'total_results': 0,
                'search_results': [],
            }


# 싱글톤 인스턴스
rank_service = NaverRankService()
