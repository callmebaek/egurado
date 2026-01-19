"""
네이버 플레이스 순위 추적
키워드 검색 후 매장 순위 확인
"""
from typing import Optional
from datetime import datetime

from app.core.browser import get_browser_manager
from app.core.database import get_supabase_client


class NaverRankTracker:
    """네이버 플레이스 순위 추적 클래스"""
    
    @staticmethod
    async def check_keyword_rank(keyword: str, store_name: str) -> int:
        """
        모바일 네이버에서 키워드 검색 후 순위 확인
        
        Args:
            keyword: 검색 키워드
            store_name: 매장명
            
        Returns:
            int: 순위 (못 찾으면 -1)
        """
        browser_manager = await get_browser_manager()
        browser = await browser_manager.start()
        
        try:
            # 모바일 User-Agent로 컨텍스트 생성
            context = await browser.new_context(
                locale='ko-KR',
                timezone_id='Asia/Seoul',
                user_agent=(
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) '
                    'AppleWebKit/605.1.15 (KHTML, like Gecko) '
                    'Version/17.0 Mobile/15E148 Safari/604.1'
                ),
                viewport={'width': 375, 'height': 812},  # iPhone 크기
                device_scale_factor=3
            )
            
            page = await context.new_page()
            
            # 네이버 모바일 검색
            search_url = f"https://m.search.naver.com/search.naver?query={keyword}"
            await page.goto(search_url, timeout=30000, wait_until="networkidle")
            await page.wait_for_timeout(2000)
            
            # 플레이스 검색 결과에서 순위 찾기
            rank = -1
            
            # 다양한 선택자로 플레이스 아이템 찾기
            place_selectors = [
                ".place_item",
                ".place_section",
                ".place_list_item",
                ".store_item",
                "[class*='place']",
                "[class*='store']"
            ]
            
            for selector in place_selectors:
                places = await page.locator(selector).all()
                
                if places:
                    print(f"✅ {len(places)}개의 플레이스 아이템 발견 (선택자: {selector})")
                    
                    for idx, place in enumerate(places, start=1):
                        try:
                            # 매장명 추출
                            title_selectors = [
                                ".place_name",
                                ".tit",
                                ".name",
                                "h3",
                                "strong"
                            ]
                            
                            title_text = None
                            for title_selector in title_selectors:
                                title_elem = place.locator(title_selector).first
                                if await title_elem.count() > 0:
                                    title_text = await title_elem.text_content()
                                    break
                            
                            if title_text and store_name in title_text:
                                rank = idx
                                print(f"🎯 매장 '{store_name}' 발견! 순위: {rank}위")
                                break
                        except:
                            continue
                    
                    if rank != -1:
                        break
            
            await page.close()
            await context.close()
            
            if rank == -1:
                print(f"⚠️ 매장 '{store_name}'을(를) 키워드 '{keyword}' 검색 결과에서 찾을 수 없습니다.")
            
            return rank
            
        except Exception as e:
            print(f"❌ 순위 확인 실패: {e}")
            return -1
    
    @staticmethod
    async def update_keyword_rank(
        store_id: str,
        keyword: str,
        rank: int
    ) -> bool:
        """
        키워드 순위 정보 업데이트
        
        Args:
            store_id: 매장 ID
            keyword: 키워드
            rank: 순위
            
        Returns:
            bool: 성공 여부
        """
        try:
            supabase = get_supabase_client()
            
            # 기존 키워드 정보 조회
            existing = supabase.table("keywords").select("id, current_rank").eq(
                "store_id", store_id
            ).eq("keyword", keyword).execute()
            
            if existing.data:
                # 기존 순위가 있으면 업데이트
                keyword_id = existing.data[0]["id"]
                previous_rank = existing.data[0].get("current_rank")
                
                supabase.table("keywords").update({
                    "previous_rank": previous_rank,
                    "current_rank": rank,
                    "last_checked_at": datetime.utcnow().isoformat()
                }).eq("id", keyword_id).execute()
                
                # 순위 히스토리 기록
                supabase.table("rank_history").insert({
                    "keyword_id": keyword_id,
                    "rank": rank
                }).execute()
                
                print(f"✅ 키워드 '{keyword}' 순위 업데이트: {previous_rank or '?'}위 → {rank}위")
            else:
                # 신규 키워드 등록
                result = supabase.table("keywords").insert({
                    "store_id": store_id,
                    "keyword": keyword,
                    "current_rank": rank,
                    "last_checked_at": datetime.utcnow().isoformat()
                }).execute()
                
                if result.data:
                    keyword_id = result.data[0]["id"]
                    
                    # 히스토리 기록
                    supabase.table("rank_history").insert({
                        "keyword_id": keyword_id,
                        "rank": rank
                    }).execute()
                    
                    print(f"✅ 신규 키워드 '{keyword}' 등록, 순위: {rank}위")
            
            return True
            
        except Exception as e:
            print(f"❌ 순위 정보 업데이트 실패: {e}")
            return False
    
    @staticmethod
    async def check_and_update_rank(
        store_id: str,
        store_name: str,
        keyword: str
    ) -> dict:
        """
        순위 확인 및 DB 업데이트 (통합 함수)
        
        Args:
            store_id: 매장 ID
            store_name: 매장명
            keyword: 키워드
            
        Returns:
            dict: 결과 정보
        """
        rank = await NaverRankTracker.check_keyword_rank(keyword, store_name)
        
        if rank > 0:
            await NaverRankTracker.update_keyword_rank(store_id, keyword, rank)
        
        return {
            "keyword": keyword,
            "rank": rank,
            "checked_at": datetime.utcnow().isoformat()
        }


# 간편 함수
async def check_rank(keyword: str, store_name: str) -> int:
    """키워드 순위 확인 (간편 함수)"""
    return await NaverRankTracker.check_keyword_rank(keyword, store_name)


