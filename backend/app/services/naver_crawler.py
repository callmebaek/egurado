"""
네이버 플레이스 크롤러
네트워크 인터셉션을 통한 리뷰 데이터 수집
"""
import asyncio
import json
from typing import List, Dict, Optional
from datetime import datetime
from playwright.async_api import Page, Response, BrowserContext

from app.core.browser import get_browser_manager
from app.core.database import get_supabase_client
from app.services.naver_auth import inject_naver_session


class NaverCrawler:
    """네이버 플레이스 데이터 크롤러"""
    
    def __init__(self):
        self.collected_reviews: List[Dict] = []
    
    async def collect_reviews_via_network_interception(
        self,
        store_id: str,
        place_id: str,
        max_reviews: int = 100
    ) -> List[Dict]:
        """
        네트워크 응답 인터셉션으로 리뷰 수집
        
        Args:
            store_id: 매장 ID (UUID)
            place_id: 네이버 플레이스 ID
            max_reviews: 수집할 최대 리뷰 수
            
        Returns:
            List[Dict]: 수집된 리뷰 목록
        """
        self.collected_reviews = []
        browser_manager = await get_browser_manager()
        context = await browser_manager.create_korean_context()
        
        try:
            # 세션 주입 (선택사항 - 로그인 필요한 경우)
            await inject_naver_session(context, store_id)
            
            page = await context.new_page()
            
            # 네트워크 응답 리스너 등록
            page.on("response", lambda response: asyncio.create_task(
                self._handle_response(response)
            ))
            
            # 네이버 플레이스 리뷰 페이지로 이동 (/place/는 모든 업종 지원)
            url = f"https://pcmap.place.naver.com/place/{place_id}/review/visitor"
            await page.goto(url, timeout=30000, wait_until="networkidle")
            await page.wait_for_timeout(3000)
            
            # 스크롤하여 더 많은 리뷰 로드
            for i in range(min(max_reviews // 10, 10)):  # 한 페이지에 약 10개씩
                await page.mouse.wheel(0, 1500)
                await page.wait_for_timeout(1500)
                
                # 더보기 버튼 클릭 시도
                try:
                    more_button = page.locator("button:has-text('더보기'), a:has-text('더보기')")
                    if await more_button.count() > 0:
                        await more_button.first.click()
                        await page.wait_for_timeout(2000)
                except:
                    pass
            
            await page.wait_for_timeout(2000)
            await page.close()
            await context.close()
            
            # DB 저장
            saved_count = await self._save_reviews_to_db(store_id, self.collected_reviews)
            print(f"✅ {saved_count}개의 리뷰를 DB에 저장했습니다.")
            
            return self.collected_reviews
            
        except Exception as e:
            print(f"❌ 리뷰 수집 중 오류 발생: {e}")
            await context.close()
            raise
    
    async def _handle_response(self, response: Response):
        """
        네트워크 응답 처리 (리뷰 데이터 추출)
        
        Args:
            response: Playwright Response 객체
        """
        try:
            url = response.url
            
            # 리뷰 관련 API 응답만 처리
            if "review" in url.lower() or "place" in url.lower():
                if response.status == 200:
                    try:
                        data = await response.json()
                        
                        # 다양한 JSON 구조에 대응
                        reviews = self._extract_reviews_from_json(data)
                        if reviews:
                            self.collected_reviews.extend(reviews)
                            print(f"📥 {len(reviews)}개의 리뷰 수집 (총: {len(self.collected_reviews)})")
                    except:
                        pass  # JSON 아닌 응답은 무시
        except Exception as e:
            # 네트워크 인터셉션 에러는 조용히 무시
            pass
    
    def _extract_reviews_from_json(self, data: Dict) -> List[Dict]:
        """
        JSON 데이터에서 리뷰 추출
        
        Args:
            data: API 응답 JSON
            
        Returns:
            List[Dict]: 추출된 리뷰 목록
        """
        reviews = []
        
        # 패턴 1: reviews 키가 있는 경우
        if isinstance(data, dict) and "reviews" in data:
            reviews_data = data["reviews"]
            if isinstance(reviews_data, list):
                for review in reviews_data:
                    parsed = self._parse_review_item(review)
                    if parsed:
                        reviews.append(parsed)
        
        # 패턴 2: result.reviews 구조
        elif isinstance(data, dict) and "result" in data:
            result = data["result"]
            if isinstance(result, dict) and "reviews" in result:
                for review in result["reviews"]:
                    parsed = self._parse_review_item(review)
                    if parsed:
                        reviews.append(parsed)
        
        # 패턴 3: data.list 구조
        elif isinstance(data, dict) and "data" in data:
            data_obj = data["data"]
            if isinstance(data_obj, dict) and "list" in data_obj:
                for review in data_obj["list"]:
                    parsed = self._parse_review_item(review)
                    if parsed:
                        reviews.append(parsed)
        
        return reviews
    
    def _parse_review_item(self, review: Dict) -> Optional[Dict]:
        """
        개별 리뷰 아이템 파싱
        
        Args:
            review: 리뷰 딕셔너리
            
        Returns:
            Optional[Dict]: 파싱된 리뷰 또는 None
        """
        try:
            # 필수 필드 확인
            if not isinstance(review, dict):
                return None
            
            # 리뷰 ID (다양한 키 이름 대응)
            review_id = (
                review.get("id") or
                review.get("reviewId") or
                review.get("review_id") or
                str(review.get("seq", ""))
            )
            
            if not review_id:
                return None
            
            # 리뷰 내용
            content = (
                review.get("text") or
                review.get("content") or
                review.get("body") or
                review.get("review_text") or
                ""
            )
            
            # 평점
            rating = (
                review.get("rating") or
                review.get("score") or
                review.get("star") or
                5
            )
            
            # 작성자
            author = "Unknown"
            if "author" in review:
                if isinstance(review["author"], dict):
                    author = review["author"].get("name") or review["author"].get("nickname") or "Unknown"
                else:
                    author = str(review["author"])
            elif "userName" in review:
                author = review["userName"]
            elif "nickname" in review:
                author = review["nickname"]
            
            # 날짜
            posted_date = None
            date_str = (
                review.get("date") or
                review.get("createdAt") or
                review.get("created_at") or
                review.get("visitDate")
            )
            if date_str:
                try:
                    # 다양한 날짜 형식 처리
                    if isinstance(date_str, str):
                        posted_date = date_str
                except:
                    pass
            
            return {
                "external_review_id": str(review_id),
                "review_text": content,
                "rating": int(rating) if rating else 5,
                "author_name": author,
                "posted_date": posted_date,
                "raw_data": review  # 원본 데이터 보관
            }
            
        except Exception as e:
            print(f"⚠️ 리뷰 파싱 실패: {e}")
            return None
    
    async def _save_reviews_to_db(self, store_id: str, reviews: List[Dict]) -> int:
        """
        수집된 리뷰를 Supabase에 저장 (Upsert)
        
        Args:
            store_id: 매장 ID
            reviews: 리뷰 목록
            
        Returns:
            int: 저장된 리뷰 수
        """
        if not reviews:
            return 0
        
        try:
            supabase = get_supabase_client()
            saved_count = 0
            
            for review in reviews:
                try:
                    # raw_data 제외하고 저장
                    review_data = {
                        "store_id": store_id,
                        "platform": "naver",
                        "external_review_id": review["external_review_id"],
                        "review_text": review.get("review_text"),
                        "rating": review.get("rating", 5),
                        "author_name": review.get("author_name"),
                        "posted_date": review.get("posted_date"),
                        "sentiment": "neutral",  # AI 분석 전 기본값
                    }
                    
                    # Upsert (중복 시 업데이트)
                    supabase.table("reviews").upsert(
                        review_data,
                        on_conflict="store_id,platform,external_review_id"
                    ).execute()
                    
                    saved_count += 1
                    
                except Exception as e:
                    print(f"⚠️ 개별 리뷰 저장 실패: {e}")
                    continue
            
            # 마지막 동기화 시간 업데이트
            supabase.table("stores").update({
                "last_synced_at": datetime.utcnow().isoformat()
            }).eq("id", store_id).execute()
            
            return saved_count
            
        except Exception as e:
            print(f"❌ 리뷰 DB 저장 실패: {e}")
            return 0


# 간편 함수
async def crawl_naver_reviews(store_id: str, place_id: str) -> List[Dict]:
    """네이버 리뷰 크롤링 (간편 함수)"""
    crawler = NaverCrawler()
    return await crawler.collect_reviews_via_network_interception(store_id, place_id)


