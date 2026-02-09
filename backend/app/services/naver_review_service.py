"""
네이버 플레이스 리뷰 조회 서비스
- 방문자 리뷰 (GraphQL API)
- 블로그 리뷰 (GraphQL API + HTML 파싱)
"""
import asyncio
import httpx
import logging
import pytz
import base64
import json
import re
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from playwright.async_api import Page
from app.core.proxy import get_proxy, report_proxy_success, report_proxy_failure

logger = logging.getLogger(__name__)


class NaverReviewService:
    """네이버 플레이스 리뷰 조회 서비스"""
    
    GRAPHQL_URL = "https://api.place.naver.com/graphql"
    PCMAP_GRAPHQL_URL = "https://pcmap-api.place.naver.com/graphql"
    TIMEOUT = 30.0
    
    def __init__(self):
        # 모바일 API용 헤더 (방문자 리뷰)
        self.headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Origin": "https://m.place.naver.com",
            "Referer": "https://m.place.naver.com/",
        }
        
        # PC API용 헤더 (블로그 리뷰)
        self.pc_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Content-Type": "application/json",
            "Origin": "https://pcmap.place.naver.com",
            "Referer": "https://pcmap.place.naver.com/",
        }
        
        # 프록시는 요청 시점에 동적으로 가져옴 (상태 기반 자동 폴백)
    
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
            
            # 프록시 조건부 설정
            client_kwargs = {"timeout": self.TIMEOUT}
            proxy_url = get_proxy()
            if proxy_url:
                client_kwargs["proxy"] = proxy_url
            
            async with httpx.AsyncClient(**client_kwargs) as client:
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
        size: int = 20,
        use_pc_api: bool = False
    ) -> Dict[str, Any]:
        """
        블로그 리뷰 조회
        
        Args:
            place_id: 네이버 플레이스 ID
            page: 페이지 번호 (1부터 시작)
            size: 페이지당 리뷰 수
            use_pc_api: PC API 사용 여부 (True: pcmap-api 사용, False: 기존 api 사용)
        
        Returns:
            {
                "total": 전체 블로그 리뷰 수,
                "items": [블로그 리뷰 목록],
                "page": 현재 페이지,
                "has_more": 다음 페이지 여부
            }
        """
        # getFsasReviews GraphQL API 사용
        query = """
        query getFsasReviews($input: FsasReviewsInput) {
            fsasReviews(input: $input) {
                total
                maxItemCount
                items {
                    id
                    date
                    createdString
                    type
                    typeName
                    title
                    contents
                    url
                    home
                    authorName
                    thumbnailUrl
                    thumbnailCount
                    reviewId
                }
            }
        }
        """
        
        variables = {
            "input": {
                "businessId": place_id,
                "page": page
                # FsasReviewsInput은 size와 type 필드를 지원하지 않음
            }
        }
        
        # API URL과 헤더 선택
        if use_pc_api:
            # PC API 사용 (활성화 기능 전용)
            api_url = self.PCMAP_GRAPHQL_URL
            
            # x-wtm-graphql 헤더 생성 (Base64 인코딩)
            wtm_data = {
                "arg": place_id,
                "type": "restaurant",
                "source": "place"
            }
            wtm_graphql_header = base64.b64encode(json.dumps(wtm_data).encode()).decode()
            
            # PC API용 헤더 복사 및 x-wtm-graphql 추가
            headers = self.pc_headers.copy()
            headers["x-wtm-graphql"] = wtm_graphql_header
            headers["Referer"] = f"https://pcmap.place.naver.com/restaurant/{place_id}/review/ugc"
            logger.info(f"[블로그 리뷰] PC API 사용: place_id={place_id}, page={page}")
        else:
            # 기존 모바일 API 사용 (기존 기능 유지)
            api_url = self.GRAPHQL_URL
            headers = self.headers
            logger.info(f"[블로그 리뷰] 모바일 API 사용: place_id={place_id}, page={page}")
        
        try:
            # 프록시 조건부 설정
            client_kwargs = {"timeout": self.TIMEOUT}
            proxy_url = get_proxy()
            if proxy_url:
                client_kwargs["proxy"] = proxy_url
            
            async with httpx.AsyncClient(**client_kwargs) as client:
                response = await client.post(
                    api_url,
                    json=[{
                        "operationName": "getFsasReviews",
                        "variables": variables,
                        "query": query
                    }],
                    headers=headers
                )
                response.raise_for_status()
                
                data = response.json()
                logger.info(f"[블로그 리뷰] API 호출 성공: place_id={place_id}, page={page}")
                logger.info(f"[블로그 리뷰] ✅ RAW Response: {data}")
                
                # 응답은 배열로 오므로 첫 번째 요소를 사용
                if isinstance(data, list) and len(data) > 0:
                    data = data[0]
                
                logger.info(f"[블로그 리뷰] 응답 구조 확인: has_data={data.get('data') is not None}, has_errors={data.get('errors') is not None}")
                
                # 에러 체크
                if data.get("errors"):
                    logger.error(f"[블로그 리뷰] GraphQL 에러: {data.get('errors')}")
                    return {
                        "total": 0,
                        "items": [],
                        "page": page,
                        "has_more": False
                    }
                
                # fsasReviews 데이터 추출
                fsas_reviews = data.get("data", {}).get("fsasReviews")
                logger.info(f"[블로그 리뷰] 🔍 fsasReviews 객체: {fsas_reviews}")
                if not fsas_reviews:
                    logger.warning(f"[블로그 리뷰] fsasReviews 없음: place_id={place_id}, data keys={list(data.keys())}")
                    return {
                        "total": 0,
                        "items": [],
                        "page": page,
                        "has_more": False
                    }
                
                total = fsas_reviews.get("total", 0)
                max_item_count = fsas_reviews.get("maxItemCount", 0)
                items = fsas_reviews.get("items", [])
                
                # has_more: items가 있고 아직 전체 total에 도달하지 않았는지 확인
                # 각 페이지가 몇 개를 반환하는지 알 수 없으므로 items 개수로 판단
                has_more = len(items) > 0 and total > (page * len(items))
                
                logger.info(f"블로그 리뷰 조회 성공: place_id={place_id}, total={total}, max_item_count={max_item_count}, items_count={len(items)}, page={page}, has_more={has_more}")
                
                return {
                    "total": total,
                    "items": items,
                    "page": page,
                    "has_more": has_more
                }
                
        except Exception as e:
            logger.error(f"블로그 리뷰 조회 예외: {type(e).__name__} - {str(e)}")
            return {
                "total": 0,
                "items": [],
                "page": page,
                "has_more": False
            }
    
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
                    imageUrl
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
            
            # 프록시 조건부 설정
            client_kwargs = {"timeout": self.TIMEOUT}
            proxy_url = get_proxy()
            if proxy_url:
                client_kwargs["proxy"] = proxy_url
            
            async with httpx.AsyncClient(**client_kwargs) as client:
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
                    "description": "",
                    "image_url": place.get("imageUrl", ""),
                    "thumbnail": place.get("imageUrl", ""),  # 호환성
                }
                
                logger.info(f"매장 정보 조회 성공: {result}")
                return result
                
        except Exception as e:
            logger.error(f"매장 정보 조회 예외: {type(e).__name__} - {str(e)}")
            return None
    
    async def get_blog_reviews_html(
        self,
        place_id: str,
        store_name: str,
        road_address: str = None,
        max_pages: int = 15
    ) -> List[Dict[str, Any]]:
        """
        네이버 통합 검색 블로그 탭에서 HTML 파싱 (활성화 기능 전용)
        
        Args:
            place_id: 네이버 플레이스 ID (로깅용)
            store_name: 매장명 (검색 쿼리)
            road_address: 도로명주소 (필터링용)
            max_pages: 사용 안 함 (호환성 유지)
        
        Returns:
            List[Dict]: 블로그 리뷰 목록 (date, title, author 등)
        """
        try:
            # 네이버 통합 검색 URL 생성 (블로그 탭, 최신순)
            from urllib.parse import quote
            
            # 지역구 추출
            district = self._extract_district_from_address(road_address) if road_address else None
            
            # 검색어: "매장명 + 지역구"
            if district:
                search_query = f"{store_name} {district}"
            else:
                search_query = store_name
            
            query = quote(search_query)
            
            # 네이버 검색 페이지용 헤더
            search_headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
                "Referer": "https://www.naver.com/",
            }
            
            # 여러 페이지 가져오기 (60일 이전 블로그를 찾을 때까지)
            all_reviews = []
            max_pages = 10  # 최대 10페이지 (약 300개)
            target_days = 60  # 60일 일평균 계산을 위해
            
            from datetime import datetime, timezone, timedelta
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=target_days)
            found_old_enough = False
            
            # 프록시 조건부 설정
            client_kwargs = {"timeout": 10.0}
            proxy_url = get_proxy()
            if proxy_url:
                client_kwargs["proxy"] = proxy_url
            
            async with httpx.AsyncClient(**client_kwargs) as client:
                for page in range(max_pages):
                    start = page * 30 + 1  # 네이버는 1, 31, 61, 91... 형태로 페이징
                    url = f"https://search.naver.com/search.naver?ssc=tab.blog.all&query={query}&sm=tab_opt&nso=so:dd,p:all&start={start}"
                    
                    if page == 0:
                        logger.info(f"[블로그 검색] HTTP 요청 시작: {url}")
                        logger.info(f"[블로그 검색] 검색어: '{search_query}', Place ID: {place_id}, 목표: {target_days}일 이전까지")
                    
                    try:
                        response = await client.get(url, headers=search_headers, follow_redirects=True)
                        
                        if response.status_code != 200:
                            logger.warning(f"[블로그 검색] 페이지 {page+1} HTTP {response.status_code}")
                            continue
                        
                        html = response.text
                        
                        if page == 0:
                            logger.info(f"[블로그 검색] HTML 길이: {len(html)} bytes")
                        
                        # HTML 파싱 (한 번만 수행하여 성능 최적화)
                        from bs4 import BeautifulSoup
                        import re
                        
                        soup = BeautifulSoup(html, 'html.parser')
                        blog_links_in_page = soup.find_all('a', href=re.compile(r'blog\.naver\.com/[^/]+/\d+'))
                        
                        # HTML에 블로그 링크가 아예 없으면 진짜 페이지 끝
                        if len(blog_links_in_page) == 0:
                            logger.info(f"[블로그 검색] 페이지 {page+1}: HTML에 블로그 링크 없음 (페이지 종료)")
                            break
                        
                        # 이 페이지의 모든 블로그 중 가장 오래된 날짜 찾기 (매칭 여부 무관)
                        oldest_date_in_page = None
                        checked_dates = 0
                        
                        # 페이지 내 일부 블로그 링크의 날짜만 샘플링 확인 (속도 최적화)
                        # 최대 3개만 확인하여 빠르게 60일 기준 확인
                        for link_idx, link in enumerate(blog_links_in_page):
                            if link_idx >= 3:  # 최대 3개까지 샘플링 (속도 최적화)
                                break
                            
                            try:
                                parent = link.parent
                                date_found_for_link = False  # 이 링크의 날짜를 찾았는지 여부
                                
                                for level in range(5):
                                    if not parent or date_found_for_link:
                                        break
                                    
                                    date_candidates = parent.find_all(['span', 'time', 'div'], limit=10)
                                    for candidate in date_candidates:
                                        text = candidate.get_text(strip=True)
                                        
                                        if not text or len(text) > 20:
                                            continue
                                        
                                        # 날짜 패턴 확인
                                        is_date = False
                                        if re.match(r'^\d+\s*(일|주|시간|분)\s*전', text):
                                            is_date = True
                                        elif re.match(r'^\d{2,4}\.\d{1,2}\.\d{1,2}\.?', text):
                                            is_date = True
                                        
                                        if is_date:
                                            parsed_date = self._parse_naver_search_date(text)
                                            if parsed_date:
                                                checked_dates += 1
                                                if oldest_date_in_page is None or parsed_date < oldest_date_in_page:
                                                    oldest_date_in_page = parsed_date
                                                date_found_for_link = True  # 이 링크의 날짜를 찾았음
                                                
                                                # 조기 종료: 60일 이전 날짜 발견 시 더 이상 확인 안 함
                                                if parsed_date <= cutoff_date:
                                                    logger.debug(f"[블로그 검색] 조기 발견: {(datetime.now(timezone.utc) - parsed_date).days}일 전 블로그 (샘플 {link_idx+1}번째)")
                                                    break  # 이 링크의 다른 날짜는 확인하지 않음
                                                break  # 이 링크의 다른 날짜는 확인하지 않음
                                    
                                    if date_found_for_link:
                                        break  # 이 링크의 부모를 더 탐색하지 않음
                                    parent = parent.parent
                                
                                # 60일 이전 날짜를 이미 찾았으면 다음 링크 확인 불필요
                                if oldest_date_in_page and oldest_date_in_page <= cutoff_date:
                                    break
                                    
                            except:
                                continue
                        
                        # 블로그 리뷰 추출 (매장명 필터링 적용, 이미 파싱된 soup 재사용)
                        page_reviews = self._parse_naver_blog_search_html(soup, store_name)
                        all_reviews.extend(page_reviews)
                        
                        # Early stopping 판단: 이 페이지의 가장 오래된 블로그가 60일 이전인지 확인
                        if oldest_date_in_page:
                            days_old = (datetime.now(timezone.utc) - oldest_date_in_page).days
                            logger.info(f"[블로그 검색] 페이지 {page+1}/{max_pages}: 매칭 {len(page_reviews)}개 (누적: {len(all_reviews)}개), 페이지 가장 오래된: {days_old}일 전 (확인: {checked_dates}개)")
                            
                            # 60일 이전 블로그 발견 → 조기 종료
                            if oldest_date_in_page <= cutoff_date:
                                found_old_enough = True
                                logger.info(f"[블로그 검색] ✓ {target_days}일 이전 블로그 발견 (조기 종료)")
                                break
                        else:
                            logger.info(f"[블로그 검색] 페이지 {page+1}/{max_pages}: 매칭 {len(page_reviews)}개 (누적: {len(all_reviews)}개), 날짜 파싱 실패")
                        
                        
                        # 페이지 간 딜레이 (bot 감지 방지, 최소화)
                        if page < max_pages - 1:
                            await asyncio.sleep(0.3)
                    
                    except Exception as e:
                        logger.warning(f"[블로그 검색] 페이지 {page+1} 오류: {str(e)}")
                        continue
                
                if not found_old_enough and len(all_reviews) > 0:
                    logger.warning(f"[블로그 검색] ⚠ {target_days}일 이전 블로그를 찾지 못함 ({max_pages}페이지 도달)")
                
                logger.info(f"[블로그 검색] 파싱 완료: 총 {len(all_reviews)}개")
                
                return all_reviews
            
        except Exception as e:
            logger.error(f"[블로그 검색] 예외 발생: {type(e).__name__} - {str(e)}", exc_info=True)
            return []
    
    def _extract_district_from_address(self, address: str) -> Optional[str]:
        """
        주소에서 지역구 이름 추출
        
        Args:
            address: 도로명주소 (예: "서울특별시 중랑구 면목천로6길 22")
        
        Returns:
            Optional[str]: 지역구 이름 (예: "중랑구") 또는 None
        """
        if not address:
            return None
        
        try:
            # "구"로 끝나는 단어 찾기 (예: 중랑구, 강남구, 분당구)
            match = re.search(r'(\S+구)', address)
            if match:
                district = match.group(1)
                logger.debug(f"[주소 파싱] 지역구 추출 성공: '{address}' → '{district}'")
                return district
            
            # "구"가 없으면 "군" 찾기 (예: 양평군, 가평군)
            match = re.search(r'(\S+군)', address)
            if match:
                district = match.group(1)
                logger.debug(f"[주소 파싱] 지역구 추출 성공 (군): '{address}' → '{district}'")
                return district
            
            logger.debug(f"[주소 파싱] 지역구 추출 실패: '{address}'")
            return None
        
        except Exception as e:
            logger.warning(f"[주소 파싱] 예외 발생: {str(e)}")
            return None
    
    def _parse_naver_blog_search_html(
        self, 
        soup,  # BeautifulSoup 객체를 직접 받아서 재파싱 방지 (성능 최적화)
        store_name: str
    ) -> List[Dict[str, Any]]:
        """
        네이버 통합 검색 블로그 탭 HTML 파싱 (매장명 필터링 적용)
        
        Args:
            soup: BeautifulSoup 파싱된 객체 (성능 최적화를 위해 재사용)
            store_name: 매장명 (필터링에 사용)
        
        Returns:
            List[Dict]: 파싱된 블로그 리뷰 목록 (매장명 필터링 적용)
        """
        from datetime import datetime, timedelta
        
        reviews = []
        
        # 매장명 필터링 준비 (단순화)
        # 1. 정확한 매장명
        exact_store_name = store_name.strip()
        
        # 2. 매장명 첫 단어 (띄어쓰기가 있을 때만)
        has_space = ' ' in exact_store_name
        first_word_store_name = exact_store_name.split()[0] if has_space else ""
        
        # 비교를 위해 소문자 변환 및 공백 제거 (블로그 제목/미리보기의 띄어쓰기 무시)
        exact_store_lower = exact_store_name.lower().replace(" ", "")
        first_word_lower = first_word_store_name.lower().replace(" ", "") if first_word_store_name else ""
        
        if has_space:
            logger.info(f"[블로그 필터링] 매장명: '{exact_store_name}' (정규화: '{exact_store_lower}'), 첫 단어: '{first_word_store_name}' (정규화: '{first_word_lower}')")
        else:
            logger.info(f"[블로그 필터링] 매장명: '{exact_store_name}' (정규화: '{exact_store_lower}', 띄어쓰기 없음)")
        
        # 블로그 링크를 직접 찾기
        blog_links = soup.find_all('a', href=re.compile(r'blog\.naver\.com/[^/]+/\d+'))
        logger.info(f"[블로그 검색] 발견된 블로그 링크: {len(blog_links)}개")
        
        processed_urls = set()  # 중복 방지
        filtered_count = 0  # 필터링으로 제외된 개수
        
        for idx, link in enumerate(blog_links):
            try:
                url = link.get('href', '')
                if not url or url in processed_urls:
                    continue
                
                processed_urls.add(url)
                
                # 제목 추출
                title = link.get_text(strip=True)
                if not title or len(title) < 5:  # 너무 짧은 제목은 무시
                    continue
                
                # 미리보기(description) 추출: 부모 요소에서 찾기
                description = ""
                parent_for_desc = link.parent
                for level in range(3):  # 최대 3단계까지 탐색
                    if not parent_for_desc:
                        break
                    # 부모 요소의 모든 텍스트에서 제목을 제외한 나머지가 미리보기
                    parent_text = parent_for_desc.get_text(strip=True)
                    # 제목보다 긴 텍스트가 있으면 그것이 미리보기를 포함
                    if len(parent_text) > len(title) + 10:  # 제목보다 충분히 길면
                        description = parent_text
                        break
                    parent_for_desc = parent_for_desc.parent
                
                # 매장명 필터링: 제목 OR 미리보기에 정확한 매장명 OR 첫 단어(띄어쓰기 있을 때만) 포함되어야 함
                # 블로그 제목/미리보기의 띄어쓰기도 제거하여 비교 (띄어쓰기 무시)
                title_lower = title.lower().replace(" ", "")
                description_lower = description.lower().replace(" ", "")
                combined_text_lower = title_lower + description_lower
                
                # 매칭 조건: 매장명 전체 OR 첫 단어 (2가지만)
                is_match = exact_store_lower in combined_text_lower
                if first_word_lower:  # 띄어쓰기가 있을 때만 첫 단어도 확인
                    is_match = is_match or (first_word_lower in combined_text_lower)
                
                if not is_match:
                    filtered_count += 1
                    if idx < 10:  # 처음 10개만 로그 (디버깅용)
                        logger.info(f"[블로그 필터링] 제외 #{idx+1}: '{title[:60]}' → 정규화: '{combined_text_lower[:80]}'")
                    continue
                
                if idx < 10:  # 처음 10개만 로그
                    # 어떤 조건으로 매칭되었는지 확인
                    if exact_store_lower in combined_text_lower:
                        match_type = "매장명"
                    else:
                        match_type = "첫단어"
                    
                    # 제목 또는 미리보기에서 매칭되었는지 확인
                    match_in_title = (exact_store_lower in title_lower) or (first_word_lower and first_word_lower in title_lower)
                    match_location = "제목" if match_in_title else "미리보기"
                    
                    logger.info(f"[블로그 파싱] ✓ #{idx+1} ({match_type}/{match_location}): '{title[:60]}' → 정규화: '{combined_text_lower[:80]}'")
                
                # 링크의 부모 요소에서 날짜와 작성자 찾기
                # 부모를 여러 단계 올라가면서 찾기
                date_str = None
                author = ""
                review_date = None
                
                # 부모 요소 탐색 (최대 5단계)
                parent = link.parent
                for level in range(5):
                    if not parent:
                        break
                    
                    # 날짜 찾기
                    if not date_str:
                        # 다양한 패턴의 날짜 요소 찾기
                        date_candidates = parent.find_all(['span', 'time', 'div'], limit=20)
                        for candidate in date_candidates:
                            text = candidate.get_text(strip=True)
                            
                            # 날짜는 보통 짧음 (20자 이내)
                            if not text or len(text) > 20:
                                continue
                            
                            # 엄격한 날짜 패턴 확인
                            is_date = False
                            
                            # "N일 전", "N주 전", "N시간 전", "N분 전" (숫자가 앞에 와야 함)
                            if re.match(r'^\d+\s*(일|주|시간|분)\s*전', text):
                                is_date = True
                            # "YYYY.MM.DD." 또는 "YY.MM.DD." 형식
                            elif re.match(r'^\d{2,4}\.\d{1,2}\.\d{1,2}\.?', text):
                                is_date = True
                            
                            if is_date:
                                date_str = text
                                review_date = self._parse_naver_search_date(date_str)
                                if review_date:  # 파싱 성공한 경우만
                                    break
                    
                    parent = parent.parent
                
                reviews.append({
                    "date": review_date.isoformat() if review_date else None,
                    "dateString": date_str,
                    "title": title,
                    "author": author,
                    "url": url
                })
            
            except Exception as e:
                if idx < 10:  # 처음 10개만 로그
                    logger.warning(f"[블로그 검색] 아이템 {idx} 파싱 중 오류: {str(e)}")
                continue
        
        logger.info(f"[블로그 파싱] 완료: {len(reviews)}개 (전체: {len(blog_links)}개, 필터링 제외: {filtered_count}개)")
        
        return reviews
    
    def _parse_naver_search_date(self, date_str: str) -> Optional[datetime]:
        """
        네이버 검색 결과의 날짜 파싱
        
        형식:
        - "1일 전", "2일 전" → 상대 날짜
        - "1주 전", "2주 전" → 상대 주
        - "1시간 전", "2시간 전" → 상대 시간
        - "2025.12.05.", "2025.12.5." → 절대 날짜
        - "25.12.05.", "25.12.5." → 절대 날짜 (20xx년 가정)
        """
        if not date_str:
            return None
        
        KST = pytz.timezone('Asia/Seoul')
        now = datetime.now(KST)
        
        try:
            # "N일 전"
            if "일 전" in date_str or "일전" in date_str:
                match = re.search(r'(\d+)일\s*전', date_str)
                if match:
                    days = int(match.group(1))
                    return now - timedelta(days=days)
            
            # "N주 전"
            if "주 전" in date_str or "주전" in date_str:
                match = re.search(r'(\d+)주\s*전', date_str)
                if match:
                    weeks = int(match.group(1))
                    return now - timedelta(weeks=weeks)
            
            # "N시간 전"
            if "시간 전" in date_str or "시간전" in date_str:
                match = re.search(r'(\d+)시간\s*전', date_str)
                if match:
                    hours = int(match.group(1))
                    return now - timedelta(hours=hours)
            
            # "N분 전"
            if "분 전" in date_str or "분전" in date_str:
                match = re.search(r'(\d+)분\s*전', date_str)
                if match:
                    minutes = int(match.group(1))
                    return now - timedelta(minutes=minutes)
            
            # "YYYY.MM.DD." 또는 "YYYY.M.D."
            match = re.match(r'(\d{4})\.(\d{1,2})\.(\d{1,2})\.?', date_str)
            if match:
                year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
                return datetime(year, month, day, tzinfo=KST)
            
            # "YY.MM.DD." 또는 "YY.M.D." (20xx년 가정)
            match = re.match(r'(\d{2})\.(\d{1,2})\.(\d{1,2})\.?', date_str)
            if match:
                year_short = int(match.group(1))
                year = 2000 + year_short if year_short < 50 else 1900 + year_short
                month, day = int(match.group(2)), int(match.group(3))
                return datetime(year, month, day, tzinfo=KST)
            
            logger.warning(f"[블로그 검색] 알 수 없는 날짜 형식: {date_str}")
            return None
        
        except Exception as e:
            logger.error(f"[블로그 검색] 날짜 파싱 오류: {date_str}, {str(e)}")
            return None
    
    async def _extract_place_id_from_blog_post(self, blog_url: str, place_id: str) -> bool:
        """
        블로그 포스트에서 placeId 추출하여 일치 여부 확인 (병렬 처리용)
        
        Args:
            blog_url: 블로그 포스트 URL
            place_id: 확인할 placeId
        
        Returns:
            bool: placeId가 일치하면 True, 아니면 False
        """
        try:
            import json
            from bs4 import BeautifulSoup
            
            # URL을 PostView.naver 형식으로 직접 변환
            # https://blog.naver.com/username/postid → https://blog.naver.com/PostView.naver?blogId=username&logNo=postid
            match = re.match(r'https://blog\.naver\.com/([^/]+)/(\d+)', blog_url)
            if not match:
                logger.info(f"[블로그 필터링] URL 패턴 불일치: {blog_url}")
                return False
            
            username, post_id = match.groups()
            postview_url = f"https://blog.naver.com/PostView.naver?blogId={username}&logNo={post_id}"
            
            logger.info(f"[블로그 필터링] PostView URL 변환: {blog_url} → {postview_url}")
            
            # 프록시 조건부 설정
            client_kwargs = {"timeout": 5.0}
            proxy_url = get_proxy()
            if proxy_url:
                client_kwargs["proxy"] = proxy_url
            
            async with httpx.AsyncClient(**client_kwargs) as client:
                # PostView URL로 직접 실제 컨텐츠 가져오기
                response = await client.get(postview_url, headers=self.headers, follow_redirects=True)
                
                if response.status_code != 200:
                    logger.info(f"[블로그 필터링] HTTP {response.status_code}: {postview_url}")
                    return False
                
                frame_html = response.text
                frame_soup = BeautifulSoup(frame_html, 'html.parser')
                
                logger.info(f"[블로그 필터링] HTML 길이: {len(frame_html)} bytes")
                
                # placeId 검색
                found_place_ids = []
                
                # 방법 1: data-linkdata 속성에서 placeId 추출
                map_links = frame_soup.find_all('a', attrs={'data-linkdata': True})
                logger.info(f"[블로그 필터링] data-linkdata 링크 {len(map_links)}개 발견: {blog_url}")
                
                for link in map_links:
                    try:
                        link_data_str = link['data-linkdata'].replace('&quot;', '"')
                        link_data = json.loads(link_data_str)
                        post_place_id = str(link_data.get('placeId', ''))
                        if post_place_id:
                            found_place_ids.append(post_place_id)
                        if post_place_id == place_id:
                            logger.info(f"[블로그 필터링] ✅ placeId 일치 (data-linkdata): {blog_url}")
                            return True
                    except (json.JSONDecodeError, KeyError):
                        continue
                
                # 방법 2: iframe src에서 placeId 추출
                iframes = frame_soup.find_all('iframe', src=re.compile(r'place\.naver\.com'))
                logger.info(f"[블로그 필터링] iframe {len(iframes)}개 발견: {blog_url}")
                
                for iframe in iframes:
                    src = iframe.get('src', '')
                    if place_id in src:
                        logger.info(f"[블로그 필터링] ✅ placeId 일치 (iframe): {blog_url}")
                        return True
                
                # 방법 3: 직접 링크에서 placeId 확인
                place_links = frame_soup.find_all('a', href=re.compile(rf'place\.naver\.com.*/place/{place_id}'))
                logger.info(f"[블로그 필터링] place 링크 {len(place_links)}개 발견: {blog_url}")
                
                if place_links:
                    logger.info(f"[블로그 필터링] ✅ placeId 일치 (링크): {blog_url}")
                    return True
                
                logger.info(f"[블로그 필터링] ❌ placeId 불일치 (찾은 placeId: {found_place_ids[:3]}...): {blog_url}")
                return False
                
        except asyncio.TimeoutError:
            logger.debug(f"[블로그 필터링] Timeout: {blog_url}")
            return False
        except Exception as e:
            logger.debug(f"[블로그 필터링] 예외 {type(e).__name__}: {blog_url}")
            return False
    
    def _parse_blog_reviews_from_html(self, html: str) -> List[Dict[str, Any]]:
        """
        HTML에서 블로그 리뷰 파싱 (구버전, 호환성 유지)
        
        Args:
            html: HTML 문자열
        
        Returns:
            List[Dict]: 파싱된 리뷰 목록
        """
        from bs4 import BeautifulSoup
        
        soup = BeautifulSoup(html, 'html.parser')
        reviews = []
        
        # listitem 요소 찾기 (블로그 리뷰 아이템)
        list_items = soup.find_all('li', role='listitem')
        logger.info(f"[블로그 HTML] listitem 개수: {len(list_items)}")
        
        for idx, item in enumerate(list_items):
            try:
                # time 태그에서 날짜 추출 (예: "24.7.17.수")
                time_tag = item.find('time')
                if not time_tag:
                    if idx < 3:  # 처음 3개만 로그
                        logger.debug(f"[블로그 HTML] 아이템 {idx}: time 태그 없음")
                    continue
                
                date_str = time_tag.get_text(strip=True)
                if idx < 3:
                    logger.debug(f"[블로그 HTML] 아이템 {idx}: date_str={date_str}")
                
                # 날짜 파싱 (YY.M.D.요일 형식)
                review_date = self._parse_blog_review_date_from_text(date_str)
                if not review_date:
                    if idx < 3:
                        logger.debug(f"[블로그 HTML] 아이템 {idx}: 날짜 파싱 실패")
                    continue
                
                # 제목 추출 (첫 번째 generic 태그)
                title_elem = item.select_one('div > div')
                title = title_elem.get_text(strip=True) if title_elem else ""
                
                # 작성자 추출
                author_elem = item.select_one('img[alt="프로필"] + div > div:first-child')
                author = author_elem.get_text(strip=True) if author_elem else ""
                
                if idx < 3:
                    logger.debug(f"[블로그 HTML] 아이템 {idx}: title={title[:30]}..., author={author}")
                
                reviews.append({
                    "date": review_date.isoformat(),
                    "dateString": date_str,
                    "title": title,
                    "author": author
                })
                
            except Exception as e:
                if idx < 3:
                    logger.warning(f"[블로그 HTML] 아이템 {idx} 파싱 예외: {e}")
                continue
        
        logger.info(f"[블로그 HTML] 최종 파싱 결과: {len(reviews)}개")
        return reviews
    
    def _extract_blog_reviews_from_apollo_state(self, html: str, place_id: str) -> List[Dict[str, Any]]:
        """
        HTML에서 __APOLLO_STATE__ 추출하여 블로그 리뷰 가져오기
        
        Args:
            html: HTML 문자열
            place_id: 네이버 플레이스 ID
        
        Returns:
            List[Dict]: 블로그 리뷰 목록
        """
        try:
            # __APOLLO_STATE__ 찾기
            match = re.search(r'window\.__APOLLO_STATE__\s*=\s*({.+?});', html, re.DOTALL)
            if not match:
                logger.debug(f"[블로그 HTML-Fast] __APOLLO_STATE__ 없음")
                return []
            
            apollo_state = json.loads(match.group(1))
            reviews = []
            
            # fsasReviews 키 찾기
            for key, value in apollo_state.items():
                if 'fsasReviews' in key and isinstance(value, dict):
                    items = value.get('items', [])
                    if isinstance(items, list):
                        for item in items:
                            if isinstance(item, dict):
                                # 날짜 파싱
                                date_str = item.get('date') or item.get('createdString', '')
                                if date_str:
                                    review_date = self._parse_blog_review_date_from_text(date_str)
                                    if review_date:
                                        reviews.append({
                                            'date': review_date.isoformat(),
                                            'dateString': date_str,
                                            'title': item.get('title', ''),
                                            'author': item.get('authorName', '')
                                        })
            
            logger.info(f"[블로그 HTML-Fast] Apollo State에서 {len(reviews)}개 추출")
            return reviews
            
        except Exception as e:
            logger.warning(f"[블로그 HTML-Fast] Apollo State 파싱 실패: {e}")
            return []
    
    def _parse_blog_review_date_from_text(self, date_str: str) -> Optional[datetime]:
        """
        블로그 리뷰 날짜 문자열 파싱
        
        지원 형식:
        - "24.7.17.수", "26.1.1.목" (YY.M.D.요일)
        - "2025.09.30." (YYYY.MM.DD.)
        - ISO 형식
        
        Args:
            date_str: 날짜 문자열
        
        Returns:
            datetime 객체 또는 None
        """
        try:
            # 1. ISO 형식 시도
            if 'T' in date_str or '-' in date_str:
                try:
                    dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    return dt.replace(tzinfo=None)  # naive datetime으로 변환
                except:
                    pass
            
            # 2. YYYY.MM.DD. 형식 (예: "2025.09.30.")
            match = re.match(r'(\d{4})\.(\d{1,2})\.(\d{1,2})', date_str)
            if match:
                year, month, day = match.groups()
                return datetime(int(year), int(month), int(day))
            
            # 3. YY.M.D.요일 형식 (예: "24.7.17.수")
            match = re.match(r'(\d{2})\.(\d{1,2})\.(\d{1,2})', date_str)
            if match:
                year_short, month, day = match.groups()
                year = 2000 + int(year_short)
                return datetime(year, int(month), int(day))
            
            return None
            
        except Exception as e:
            logger.debug(f"[블로그 HTML-Fast] 날짜 파싱 실패: {date_str}, {e}")
            return None


# 싱글톤 인스턴스
naver_review_service = NaverReviewService()
