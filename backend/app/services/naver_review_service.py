"""
네이버 플레이스 리뷰 조회 서비스
- 방문자 리뷰 (GraphQL API)
- 블로그 리뷰 (GraphQL API)
"""
import httpx
import logging
import pytz
from typing import List, Dict, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class NaverReviewService:
    """네이버 플레이스 리뷰 조회 서비스"""
    
    GRAPHQL_URL = "https://api.place.naver.com/graphql"
    TIMEOUT = 30.0
    
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Origin": "https://m.place.naver.com",
            "Referer": "https://m.place.naver.com/",
        }
    
    async def get_visitor_reviews(
        self, 
        place_id: str, 
        size: int = 20,
        sort: str = "recent",  # recent, popular, high_rating, low_rating
        after: str = None  # Cursor for pagination
    ) -> Dict[str, Any]:
        """
        방문자 리뷰 조회 (GraphQL - Cursor 기반 페이지네이션)
        
        Args:
            place_id: 네이버 플레이스 ID
            size: 가져올 리뷰 수
            sort: 정렬 기준
            after: 페이지네이션 커서 (이전 응답의 마지막 리뷰 cursor)
        
        Returns:
            {
                "total": 전체 리뷰 수,
                "items": [리뷰 목록] (각 리뷰에 cursor 포함),
                "has_more": 다음 페이지 여부,
                "last_cursor": 마지막 리뷰의 cursor
            }
        """
        query = """
        query getVisitorReviews($input: VisitorReviewsInput) {
            visitorReviews(input: $input) {
                items {
                    id
                    cursor
                    reviewId
                    rating
                    author {
                        id
                        nickname
                        imageUrl
                    }
                    body
                    thumbnail
                    media {
                        type
                        thumbnail
                    }
                    tags
                    status
                    visited
                    created
                    reply {
                        editedBy
                        body
                        created
                    }
                    businessName
                }
                total
            }
        }
        """
        
        variables = {
            "input": {
                "businessId": place_id,
                "size": size,
                "sort": sort.upper(),
                "includeContent": True
            }
        }
        
        # Cursor 기반 페이지네이션
        if after:
            variables["input"]["after"] = after
        
        print(f"[DEBUG] GraphQL Request - place_id={place_id}, size={size}, after={after[:20] if after else 'None'}...", flush=True)
        
        try:
            logger.info(f"방문자 리뷰 조회 시작: place_id={place_id}, size={size}, after={after[:20] if after else 'None'}...")
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                payload = {"query": query, "variables": variables}
                logger.debug(f"GraphQL 요청: {payload}")
                print(f"[DEBUG] GraphQL variables: {variables}", flush=True)
                
                response = await client.post(
                    self.GRAPHQL_URL,
                    json=payload,
                    headers=self.headers
                )
                
                if response.status_code != 200:
                    logger.error(f"방문자 리뷰 조회 실패: status={response.status_code}, body={response.text}")
                    return {"total": 0, "items": [], "has_more": False, "last_cursor": None}
                
                data = response.json()
                
                # 응답 구조 디버깅
                print(f"[DEBUG] Response keys: {list(data.keys())}", flush=True)
                if 'data' in data:
                    print(f"[DEBUG] data keys: {list(data.get('data', {}).keys()) if data.get('data') else 'data is None'}", flush=True)
                
                if "errors" in data:
                    logger.error(f"GraphQL 에러: {data['errors']}")
                    print(f"[DEBUG] GraphQL errors: {data['errors']}", flush=True)
                    return {"total": 0, "items": [], "has_more": False, "last_cursor": None}
                
                # visitor_reviews가 None일 수 있으므로 안전하게 처리
                visitor_reviews = data.get("data", {})
                if visitor_reviews is None:
                    logger.error(f"data is None in response")
                    print(f"[DEBUG] data is None in response", flush=True)
                    return {"total": 0, "items": [], "has_more": False, "last_cursor": None}
                
                visitor_reviews = visitor_reviews.get("visitorReviews")
                if visitor_reviews is None:
                    logger.error(f"visitorReviews is None in response")
                    print(f"[DEBUG] visitorReviews is None in response, full response: {data}", flush=True)
                    return {"total": 0, "items": [], "has_more": False, "last_cursor": None}
                
                items = visitor_reviews.get("items", [])
                total = visitor_reviews.get("total", 0)
                
                # 마지막 리뷰의 cursor 추출
                last_cursor = None
                if items:
                    last_cursor = items[-1].get('cursor')
                    first_id = items[0].get('id', 'N/A')
                    last_id = items[-1].get('id', 'N/A')
                    first_cursor = items[0].get('cursor', 'N/A')
                    print(f"[DEBUG] GraphQL Response - items={len(items)}, first_id={first_id[:16]}, last_id={last_id[:16]}", flush=True)
                    print(f"[DEBUG] Cursors - first={first_cursor[:20] if first_cursor != 'N/A' else 'N/A'}..., last={last_cursor[:20] if last_cursor else 'None'}...", flush=True)
                
                # has_more: cursor가 있고, size만큼 가져왔다면 다음이 있을 가능성
                has_more = len(items) == size and last_cursor is not None
                
                logger.info(f"방문자 리뷰 조회 성공: place_id={place_id}, total={total}, items_count={len(items)}, has_more={has_more}, last_cursor={last_cursor[:20] if last_cursor else 'None'}...")
                
                return {
                    "total": total,
                    "items": items,
                    "has_more": has_more,
                    "last_cursor": last_cursor
                }
                
        except Exception as e:
            logger.error(f"방문자 리뷰 조회 예외: {type(e).__name__} - {str(e)}")
            return {"total": 0, "items": [], "has_more": False, "last_cursor": None}
    
    async def get_blog_reviews(
        self, 
        place_id: str,
        page: int = 1,
        size: int = 20
    ) -> Dict[str, Any]:
        """
        블로그 리뷰 조회 (현재 네이버 API에서 지원하지 않음)
        
        Args:
            place_id: 네이버 플레이스 ID
            page: 페이지 번호 (1부터 시작)
            size: 페이지당 리뷰 수
        
        Returns:
            {
                "total": 전체 블로그 리뷰 수,
                "items": [블로그 리뷰 목록],
                "page": 현재 페이지,
                "has_more": 다음 페이지 여부
            }
        """
        # 네이버 GraphQL API에서 blogReviews 쿼리가 제거됨
        # 추후 대체 방법 필요 (웹 스크래핑 등)
        logger.warning(f"블로그 리뷰 조회: 현재 네이버 API에서 지원하지 않음 (place_id={place_id})")
        return {"total": 0, "items": [], "page": page, "has_more": False}
    
    async def get_all_today_visitor_reviews(
        self,
        place_id: str,
        target_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        특정 날짜에 작성된 모든 방문자 리뷰 조회
        
        Args:
            place_id: 네이버 플레이스 ID
            target_date: 조회할 날짜 (None이면 오늘)
        
        Returns:
            해당 날짜에 작성된 모든 리뷰 목록
        """
        if target_date is None:
            target_date = datetime.now()
        
        target_date_str = target_date.strftime("%Y-%m-%d")
        all_reviews = []
        cursor = None
        max_iterations = 10  # 최대 10회 반복
        
        logger.info(f"날짜별 리뷰 조회 시작: place_id={place_id}, date={target_date_str}")
        
        for iteration in range(1, max_iterations + 1):
            result = await self.get_visitor_reviews(place_id, size=20, after=cursor)
            items = result.get("items", [])
            
            if not items:
                break
            
            # 해당 날짜의 리뷰만 필터링 (ID에서 날짜 추출)
            for item in items:
                review_id = item.get("id")
                if review_id:
                    # ID에서 날짜 추출
                    review_date_str = self.extract_date_from_id(review_id)
                    if review_date_str:
                        if review_date_str == target_date_str:
                            all_reviews.append(item)
                        elif review_date_str < target_date_str:
                            # 더 오래된 리뷰가 나오면 중단
                            logger.info(f"과거 리뷰 발견, 조회 중단: {review_date_str}")
                            return all_reviews
            
            if not result.get("has_more"):
                break
            
            cursor = result.get("last_cursor")
            if not cursor:
                break
        
        logger.info(f"날짜별 리뷰 조회 완료: {len(all_reviews)}개")
        return all_reviews
    
    async def get_reviews_by_date_range(
        self,
        place_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """
        특정 기간 내에 작성된 모든 방문자 리뷰 조회
        
        Args:
            place_id: 네이버 플레이스 ID
            start_date: 시작 날짜
            end_date: 종료 날짜
        
        Returns:
            해당 기간 내에 작성된 모든 리뷰 목록
        """
        start_date_str = start_date.strftime("%Y-%m-%d")
        end_date_str = end_date.strftime("%Y-%m-%d")
        all_reviews = []
        
        # 기간 일수 계산
        date_diff = (end_date - start_date).days + 1  # +1은 시작일 포함
        
        # 기간에 따라 목표 개수와 페이지 수 결정
        # ⚠️ Naver API는 size > 20이면 visitorReviews를 None으로 반환함!
        page_size = 20  # Naver API 최대 허용치
        
        if date_diff <= 2:  # 오늘 또는 어제 (1~2일)
            target_reviews = 100
            max_pages = 5  # 20개씩 5페이지
        elif date_diff <= 7:  # 7일간
            target_reviews = 400
            max_pages = 20  # 20개씩 20페이지
        elif date_diff <= 30:  # 30일간
            target_reviews = 1000
            max_pages = 50  # 20개씩 50페이지
        else:  # 30일 초과
            target_reviews = 1000
            max_pages = 50
        
        print(f"[DEBUG] get_reviews_by_date_range START: place_id={place_id}, period={start_date_str} ~ {end_date_str}", flush=True)
        try:
            print(f"[DEBUG] 📊 기간: {date_diff}일 → 목표={target_reviews}개, max_pages={max_pages}, page_size={page_size}", flush=True)
        except UnicodeEncodeError:
            print(f"[DEBUG] [STATS] Period: {date_diff}days -> target={target_reviews}, max_pages={max_pages}, page_size={page_size}", flush=True)
        
        page_dates = []  # 각 페이지의 날짜 범위 추적
        seen_review_ids = set()  # 이미 본 리뷰 ID 추적 (중복 방지)
        
        cursor = None  # Cursor 기반 페이지네이션
        iteration = 1
        
        while iteration <= max_pages:
            print(f"[DEBUG] Iteration {iteration}/{max_pages} requesting (size={page_size}, cursor={cursor[:20] if cursor else 'None'}...)...", flush=True)
            result = await self.get_visitor_reviews(place_id, size=page_size, after=cursor)
            items = result.get("items", [])
            last_cursor = result.get("last_cursor")
            
            print(f"[DEBUG] Iteration {iteration}: items={len(items)}, total={result.get('total', 0)}", flush=True)
            
            if not items:
                print(f"[DEBUG] Iteration {iteration}: No items, stopping", flush=True)
                break
            
            # 해당 기간 내의 리뷰만 필터링 (날짜 감지 로직 사용)
            found_older_review = False
            page_review_dates = []
            page_included = 0
            page_excluded_future = 0
            page_excluded_past = 0
            
            # 상세 로깅 (디버깅용, 100개 이하일 때만)
            if len(items) <= 100:
                all_ids = [item.get('id') for item in items]
                unique_ids = len(set(all_ids))
                print(f"\n{'='*100}", flush=True)
                try:
                    print(f"[DEBUG] 📋 Iteration {iteration} 수신 (Total: {len(items)}개, Unique: {unique_ids})", flush=True)
                except UnicodeEncodeError:
                    print(f"[DEBUG] [LIST] Iteration {iteration} received (Total: {len(items)}, Unique: {unique_ids})", flush=True)
                
                if unique_ids < len(all_ids):
                    try:
                        print(f"[DEBUG] ⚠️ WARNING: Duplicate IDs found within response!", flush=True)
                    except UnicodeEncodeError:
                        print(f"[DEBUG] [WARNING] Duplicate IDs found within response!", flush=True)
                print(f"{'='*100}\n", flush=True)
            
            # 첫 2번의 iteration에서 모든 리뷰 ID 출력 (페이지네이션 검증)
            if iteration <= 2:
                print(f"\n[VERIFY] ===== Iteration {iteration} - 전체 리뷰 ID 목록 =====", flush=True)
                for idx, item in enumerate(items, 1):
                    review_id = item.get('id', 'N/A')
                    visited = item.get('visited', 'N/A')
                    cursor_preview = item.get('cursor', 'N/A')
                    cursor_preview = cursor_preview[:20] + '...' if cursor_preview != 'N/A' else 'N/A'
                    print(f"  [{idx:2d}] ID: {review_id}, 방문일: {visited}, cursor: {cursor_preview}", flush=True)
                print(f"[VERIFY] ===== Iteration {iteration} 끝 =====\n", flush=True)
            
            new_reviews_in_page = 0  # 이 페이지에서 새로 발견한 리뷰 수
            duplicates_in_page = 0  # 이 페이지에서 발견한 중복 수
            
            for item in items:
                review_id = item.get("id")
                if not review_id:
                    continue
                
                # 중복 리뷰 체크
                if review_id in seen_review_ids:
                    duplicates_in_page += 1
                    continue  # 이미 본 리뷰는 건너뛰기
                
                seen_review_ids.add(review_id)
                new_reviews_in_page += 1
                    
                # visited 필드에서 날짜 추출 ("1.10.금" 형식)
                visited_str = item.get("visited", "")
                review_date_str = self.parse_naver_date(visited_str)
                
                # visited 실패시 ID에서 추출 시도 (fallback)
                if not review_date_str:
                    review_date_str = self.extract_date_from_id(review_id)
                
                # 첫 iteration 첫 리뷰 디버깅
                if iteration == 1 and len(page_review_dates) == 0:
                    print(f"[DEBUG] ========== FIRST REVIEW DATA ==========", flush=True)
                    print(f"[DEBUG] ID: {review_id}", flush=True)
                    print(f"[DEBUG] visited (raw): {visited_str}", flush=True)
                    print(f"[DEBUG] Parsed date: {review_date_str}", flush=True)
                    print(f"[DEBUG] =========================================", flush=True)
                
                if not review_date_str:
                    print(f"[DEBUG] Iteration {iteration}: Failed to extract date: visited={visited_str}, id={review_id}", flush=True)
                    continue
                    
                page_review_dates.append(review_date_str)
                
                # 첫 iteration 첫 3개 리뷰의 날짜 비교 로그
                if iteration == 1 and len(page_review_dates) <= 3:
                    print(f"[DEBUG] Review #{len(page_review_dates)}: date={review_date_str}, range={start_date_str}~{end_date_str}", flush=True)
                    print(f"[DEBUG] Comparison: {start_date_str} <= {review_date_str} <= {end_date_str} = {start_date_str <= review_date_str <= end_date_str}", flush=True)
                
                if start_date_str <= review_date_str <= end_date_str:
                    all_reviews.append(item)
                    page_included += 1
                elif review_date_str > end_date_str:
                    # 종료일보다 최신 리뷰 (미래)
                    page_excluded_future += 1
                elif review_date_str < start_date_str:
                    # 시작일보다 오래된 리뷰 (과거)
                    page_excluded_past += 1
                    # ⚠️ 범위 내 리뷰가 하나라도 있으면 중단, 아니면 계속 (최신 리뷰라도 보여주기 위해)
                    if len(all_reviews) > 0:
                        # 이미 범위 내 리뷰를 찾았으면 중단
                        print(f"[DEBUG] Found older review: {review_date_str} < {start_date_str}, stopping", flush=True)
                        found_older_review = True
                        break
                    # 아직 범위 내 리뷰를 못 찾았으면 최신 리뷰라도 포함
                    all_reviews.append(item)
                    page_included += 1
        
            # Iteration 처리 결과 로깅
            if duplicates_in_page > 0:
                print(f"[DEBUG] Iteration {iteration}: DUPLICATES = {duplicates_in_page}/{len(items)}", flush=True)
            
            if page_review_dates:
                min_date = min(page_review_dates)
                max_date = max(page_review_dates)
                print(f"[DEBUG] Iteration {iteration}: 날짜범위={min_date}~{max_date}, 추출={new_reviews_in_page}, 중복={duplicates_in_page}, 포함={page_included}, 미래제외={page_excluded_future}, 과거제외={page_excluded_past}", flush=True)
                page_dates.append((iteration, min_date, max_date, page_included))
            else:
                print(f"[DEBUG] Iteration {iteration}: 추출={new_reviews_in_page}, 중복={duplicates_in_page}, 포함={page_included}", flush=True)
            
            # 조기 종료 조건
            # 1. 과거 리뷰 발견 - 오래된 리뷰가 나왔으므로 중단
            if found_older_review:
                print(f"[DEBUG] STOP: Iteration {iteration} found older review", flush=True)
                break
            
            # 2. 이번 iteration에서 새로운 리뷰가 0개 - 모두 중복이므로 중단
            if new_reviews_in_page == 0 and iteration > 1:
                print(f"[DEBUG] STOP: Iteration {iteration} has no new reviews (all duplicates)", flush=True)
                break
            
            # 3. 이번 iteration에서 포함된 리뷰가 0개 - 범위 밖 리뷰만 있을 때
            # 첫 페이지가 아니고, 이미 일부 리뷰를 찾았다면 중단
            if page_included == 0 and iteration > 1 and len(all_reviews) > 0:
                print(f"[DEBUG] STOP: Iteration {iteration} has 0 included reviews (already found some)", flush=True)
                break
            # 첫 페이지에서 포함된 리뷰가 0개면 계속 진행 (최신 리뷰라도 보여주기 위해)
            
            # 4. 목표 개수 달성
            if len(all_reviews) >= target_reviews:
                print(f"[DEBUG] STOP: Target reached ({len(all_reviews)}/{target_reviews})", flush=True)
                break
            
            # 5. 더 이상 페이지 없음 (cursor가 없거나 has_more가 False)
            if not result.get("has_more") or not last_cursor:
                print(f"[DEBUG] STOP: No more items (has_more={result.get('has_more')}, cursor={last_cursor is not None})", flush=True)
                break
            
            # 다음 iteration을 위해 cursor 업데이트
            cursor = last_cursor
            iteration += 1
        
        # 최종 요약
        iterations_processed = len(page_dates)
        print(f"\n{'='*100}", flush=True)
        print(f"[결과] 기간별 리뷰 추출 완료 (Cursor 기반 페이지네이션)", flush=True)
        print(f"  요청 기간: {start_date_str} ~ {end_date_str} ({date_diff}일)", flush=True)
        print(f"  목표 개수: {target_reviews}개", flush=True)
        print(f"  처리 Iterations: {iterations_processed}회 (size={page_size})", flush=True)
        print(f"  최종 결과: {len(all_reviews)}개", flush=True)
        
        if page_dates:
            print(f"  Iteration별 요약:", flush=True)
            for it, min_d, max_d, included in page_dates:
                print(f"    Iteration {it}: {min_d}~{max_d}, 포함={included}", flush=True)
        
        print(f"{'='*100}\n", flush=True)
        
        if all_reviews:
            logger.info(f"[OK] 기간별 리뷰 조회 완료: {len(all_reviews)}개 (요청: {start_date_str}~{end_date_str})")
        else:
            logger.info(f"[WARN] 기간별 리뷰 조회 완료: 0개 (기간: {start_date_str} ~ {end_date_str})")
        
        return all_reviews
    
    def parse_naver_date(self, date_str: str) -> Optional[str]:
        """
        네이버 날짜 형식 파싱: "1.10.금" → "2026-01-10"
        
        Args:
            date_str: "월.일.요일" 형식 (예: "1.10.금", "12.25.수")
        
        Returns:
            ISO 형식 날짜 문자열 (YYYY-MM-DD)
        """
        try:
            if not date_str or date_str == "":
                return None
            
            # "1.10.금" → ["1", "10", "금"]
            parts = date_str.split(".")
            if len(parts) < 2:
                return None
            
            month = int(parts[0])
            day = int(parts[1])
            
            # 현재 년도 가정 (KST 기준)
            KST = pytz.timezone('Asia/Seoul')
            now = datetime.now(KST)
            current_year = now.year
            
            # 날짜 생성
            review_date = datetime(current_year, month, day)
            
            # 미래 날짜라면 작년으로 변경
            if review_date.replace(tzinfo=None) > now.replace(tzinfo=None):
                review_date = datetime(current_year - 1, month, day)
            
            return review_date.strftime("%Y-%m-%d")
        except Exception as e:
            logger.debug(f"네이버 날짜 파싱 실패: {date_str}, {str(e)}")
            return None
    
    def extract_date_from_id(self, review_id: str) -> str:
        """
        리뷰 ID(MongoDB ObjectId)에서 작성 날짜 추출
        
        Args:
            review_id: 네이버 리뷰 ID (24자 hex string)
        
        Returns:
            ISO 형식 날짜 문자열 (YYYY-MM-DD, KST 기준)
        """
        try:
            # ObjectId의 첫 8자는 Unix timestamp (hex)
            timestamp_hex = review_id[:8]
            timestamp = int(timestamp_hex, 16)
            
            # UTC 시간으로 변환 후 KST로 변경
            dt_utc = datetime.fromtimestamp(timestamp, tz=pytz.utc)
            KST = pytz.timezone('Asia/Seoul')
            dt_kst = dt_utc.astimezone(KST)
            return dt_kst.strftime("%Y-%m-%d")
        except Exception as e:
            # 파싱 실패 시 None 반환
            logger.debug(f"리뷰 ID 날짜 추출 실패: {review_id}, {str(e)}")
            return None
    
    def parse_review_data(self, review: Dict[str, Any], review_type: str) -> Dict[str, Any]:
        """
        네이버 리뷰 데이터를 파싱하여 표준 포맷으로 변환
        
        Args:
            review: 네이버 API 리뷰 원본 데이터
            review_type: 'visitor' 또는 'blog'
        
        Returns:
            파싱된 리뷰 데이터
        """
        if review_type == "visitor":
            author = review.get("author", {})
            media = review.get("media", [])
            images = [m.get("thumbnail") for m in media if m.get("type") == "image"]
            
            review_id = str(review.get("id", ""))
            # visited 필드에서 날짜 추출 ("1.10.금" 형식)
            visited_str = review.get("visited", "")
            review_date = self.parse_naver_date(visited_str)
            
            # visited 실패시 ID에서 추출 시도
            if not review_date:
                review_date = self.extract_date_from_id(review_id)
            
            # 작성자 리뷰 수는 Naver API에서 제공하지 않음 (reviewCount 필드 없음)
            # 향후 개선: 작성자 프로필 페이지 크롤링 또는 다른 방법 필요
            author_review_count = 0
            is_power_reviewer = False
            
            return {
                "naver_review_id": review_id,
                "review_type": "visitor",
                "author_name": author.get("nickname", ""),
                "author_id": str(author.get("id", "")),
                "author_review_count": author_review_count,
                "is_power_reviewer": is_power_reviewer,
                "is_receipt_review": False,  # tags 필드가 None이므로 판단 불가
                "is_reservation_review": False,  # tags 필드가 None이므로 판단 불가
                "rating": float(review.get("rating")) if review.get("rating") is not None else None,
                "content": review.get("body", ""),
                "images": images,
                "review_date": review_date,  # ID에서 추출한 날짜
                "like_count": 0,  # heart 필드 제거됨
                "comment_count": 1 if review.get("reply") else 0
            }
        
        elif review_type == "blog":
            return {
                "naver_review_id": str(review.get("id", "")),
                "review_type": "blog",
                "author_name": review.get("author", ""),
                "author_id": "",
                "author_review_count": 0,
                "is_power_reviewer": False,
                "is_receipt_review": False,
                "is_reservation_review": False,
                "rating": None,
                "content": review.get("summary", "") or review.get("title", ""),
                "images": [review.get("thumbnail")] if review.get("thumbnail") else [],
                "review_date": review.get("created"),
                "like_count": 0,
                "comment_count": 0
            }
        
        return {}
    
    async def get_place_info(
        self, 
        place_id: str, 
        store_name: str = None,
        x: str = None,
        y: str = None
    ) -> Dict[str, Any]:
        """
        매장 상세 정보 조회 (리뷰 수, 평점 등)
        
        places 검색 쿼리를 활용하여 매장 정보를 조회합니다.
        매장명으로 검색 후 place_id를 매칭합니다.
        
        Args:
            place_id: 네이버 플레이스 ID
            store_name: 매장명 (검색에 사용)
            x: 경도 (선택)
            y: 위도 (선택)
        
        Returns:
            {
                "place_id": 매장 ID,
                "name": 매장명,
                "visitor_review_count": 방문자 리뷰 수,
                "blog_review_count": 블로그 리뷰 수,
                "rating": 평점,
                "description": 한줄평 (빈 문자열, API에서 제공하지 않음)
            }
        """
        query = """
        query getPlacesList($input: PlacesInput) {
            places(input: $input) {
                items {
                    id
                    name
                    visitorReviewCount
                    blogCafeReviewCount
                    visitorReviewScore
                    category
                    address
                    roadAddress
                }
            }
        }
        """
        
        # 매장명으로 검색 (place_id로는 검색 안 됨)
        # store_name이 없으면 place_id로 시도
        search_query = store_name if store_name else place_id
        
        # 좌표 설정 (stores 테이블 값 우선, 없으면 서울 기준)
        coord_x = x if x else "127.0276"
        coord_y = y if y else "37.4979"
        
        variables = {
            "input": {
                "query": search_query,
                "start": 1,
                "display": 10,  # 중복 결과 대비
                "deviceType": "mobile",
                "x": coord_x,
                "y": coord_y
            }
        }
        
        try:
            logger.info(f"매장 정보 조회 시작: place_id={place_id}, store_name='{store_name}', x={coord_x}, y={coord_y}")
            
            # 매장명이 없으면 리뷰에서 가져오기 시도
            if not store_name or store_name.strip() == "":
                logger.warning(f"[WARN] 매장명 없음. 리뷰에서 매장명 추출 시도")
                try:
                    visitor_result = await self.get_visitor_reviews(place_id, size=1)
                    if visitor_result and visitor_result.get("items"):
                        store_name = visitor_result["items"][0].get("businessName", "")
                        logger.info(f"[OK] 리뷰에서 매장명 추출 성공: '{store_name}'")
                        search_query = store_name
                except Exception as e:
                    logger.error(f"리뷰에서 매장명 추출 실패: {str(e)}")
                    # 여전히 매장명이 없으면 place_id 그대로 사용 (실패할 확률 높음)
                    search_query = place_id
            
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                response = await client.post(
                    self.GRAPHQL_URL,
                    json={
                        "operationName": "getPlacesList",
                        "variables": variables,
                        "query": query
                    },
                    headers=self.headers
                )
                
                if response.status_code != 200:
                    logger.error(f"매장 정보 조회 실패: status={response.status_code}")
                    return None
                
                data = response.json()
                
                if "errors" in data:
                    logger.error(f"GraphQL 에러: {data['errors']}")
                    return None
                
                items = data.get("data", {}).get("places", {}).get("items", [])
                
                logger.info(f"검색 결과 수: {len(items)}")
                if items:
                    for idx, item in enumerate(items):
                        logger.info(f"  [{idx+1}] {item.get('name')} (ID: {item.get('id')})")
                
                if not items:
                    logger.warning(f"검색 결과 없음: query={search_query}, place_id={place_id}")
                    return None
                
                # place_id가 정확히 일치하는 항목 찾기
                place = None
                for item in items:
                    if str(item.get("id")) == str(place_id):
                        place = item
                        logger.info(f"[OK] place_id 일치: {item.get('name')} (ID: {item.get('id')})")
                        break
                
                # 일치하는 항목이 없으면 첫 번째 항목 사용 (매장명이 유사하다고 가정)
                if not place and items:
                    place = items[0]
                    logger.warning(f"[WARN] place_id 불일치. 첫 번째 결과 사용: {place.get('name')} (ID: {place.get('id')}) - 요청한 ID: {place_id}")
                
                if not place:
                    logger.error(f"[ERROR] 매장 정보를 찾을 수 없음: place_id={place_id}")
                    return None
                
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
                
                def parse_float(value):
                    """문자열을 float로 변환"""
                    if value is None:
                        return None
                    if isinstance(value, (int, float)):
                        return float(value)
                    try:
                        return float(str(value).replace(',', ''))
                    except (ValueError, AttributeError):
                        return None
                
                result = {
                    "place_id": str(place.get("id", place_id)),
                    "name": place.get("name", ""),
                    "category": place.get("category", ""),
                    "address": place.get("address", ""),
                    "roadAddress": place.get("roadAddress", ""),
                    "visitor_review_count": parse_int(place.get("visitorReviewCount")),
                    "blog_review_count": parse_int(place.get("blogCafeReviewCount")),
                    "visitorReviewScore": parse_float(place.get("visitorReviewScore")),
                    "rating": parse_float(place.get("visitorReviewScore")),  # 호환성
                    "description": ""
                }
                
                logger.info(f"매장 정보 조회 성공: {result}")
                return result
                
        except Exception as e:
            logger.error(f"매장 정보 조회 예외: {type(e).__name__} - {str(e)}")
            return None


# 싱글톤 인스턴스
naver_review_service = NaverReviewService()
