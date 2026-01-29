"""
네이버 플레이스 관련 API 라우터
(경쟁매장 분석 포함)
"""
from fastapi import APIRouter, HTTPException, status, Query, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from uuid import UUID
import logging

from app.services.naver_auth import store_naver_cookies
from app.services.naver_search_new import search_service_new as search_service
from app.services.naver_search_api import api_search_service
from app.services.naver_rank_service import rank_service
# 비공식 API 서비스 (새로 추가)
from app.services.naver_search_api_unofficial import search_service_api_unofficial
from app.services.naver_rank_api_unofficial import rank_service_api_unofficial
from app.services.naver_keywords_analyzer import keywords_analyzer_service
from app.services.naver_competitor_analysis_service import competitor_analysis_service
from app.core.database import get_supabase_client
from app.routers.auth import get_current_user
from datetime import datetime, date

security = HTTPBearer(auto_error=False)

router = APIRouter()
logger = logging.getLogger(__name__)

# 구독 tier별 키워드 등록 제한
KEYWORD_LIMITS = {
    "free": 1,
    "basic": 10,
    "pro": 50,
    "god": 9999  # God tier: 무제한 (커스터마이징 가능)
}

def check_keyword_limit(supabase, user_id: str) -> tuple[bool, int, int]:
    """
    사용자의 키워드 등록 제한을 확인합니다.
    
    Returns:
        tuple: (제한 초과 여부, 현재 키워드 수, 최대 허용 수)
    """
    try:
        # 사용자의 구독 tier 확인
        user_result = supabase.table("profiles").select("subscription_tier").eq("id", user_id).single().execute()
        
        if not user_result.data:
            logger.warning(f"User not found: {user_id}")
            return False, 0, KEYWORD_LIMITS["free"]
        
        subscription_tier = user_result.data.get("subscription_tier", "free").lower()
        max_keywords = KEYWORD_LIMITS.get(subscription_tier, KEYWORD_LIMITS["free"])
        
        # 해당 사용자의 모든 매장에 등록된 키워드 수 확인
        stores_result = supabase.table("stores").select("id").eq("user_id", user_id).execute()
        
        if not stores_result.data:
            return False, 0, max_keywords
        
        store_ids = [store["id"] for store in stores_result.data]
        
        # 모든 매장의 키워드 수 합산
        keywords_result = supabase.table("keywords").select("id", count="exact").in_("store_id", store_ids).execute()
        current_keywords = keywords_result.count if keywords_result.count else 0
        
        logger.info(
            f"[Keyword Limit Check] User: {user_id}, Tier: {subscription_tier}, "
            f"Current: {current_keywords}, Max: {max_keywords}"
        )
        
        return current_keywords >= max_keywords, current_keywords, max_keywords
        
    except Exception as e:
        logger.error(f"Error checking keyword limit: {str(e)}")
        return False, 0, KEYWORD_LIMITS["free"]


class StoreSearchResult(BaseModel):
    """매장 검색 결과"""
    place_id: str
    name: str
    category: str
    address: str
    road_address: Optional[str] = ""
    thumbnail: Optional[str] = ""


class StoreSearchResponse(BaseModel):
    """매장 검색 응답"""
    status: str
    query: str
    results: List[StoreSearchResult]
    total_count: int


class NaverConnectionRequest(BaseModel):
    """네이버 플레이스 연결 요청"""
    user_id: UUID
    store_id: UUID
    cookies: List[Dict]


class NaverConnectionResponse(BaseModel):
    """네이버 플레이스 연결 응답"""
    status: str
    message: str
    store_id: UUID


class RankCheckRequest(BaseModel):
    """순위 조회 요청"""
    store_id: UUID
    keyword: str


class RankCheckResponse(BaseModel):
    """순위 조회 응답"""
    status: str
    keyword: str
    place_id: str
    store_name: str
    rank: Optional[int] = None
    found: bool
    total_results: int
    total_count: Optional[str] = None  # 전체 업체 수 (예: "1,234")
    previous_rank: Optional[int] = None
    rank_change: Optional[int] = None  # 순위 변동 (양수: 상승, 음수: 하락)
    last_checked_at: datetime
    search_results: List[Dict]  # 전체 검색 결과 (순위 내 매장들)


class KeywordListResponse(BaseModel):
    """매장의 키워드 목록 응답"""
    status: str
    store_id: UUID
    keywords: List[Dict]
    total_count: int


@router.get("/search-stores-test")
async def search_naver_stores_test(query: str = "카페"):
    """테스트 엔드포인트"""
    try:
        results = await search_service.search_stores(query)
        return {"status": "success", "count": len(results), "results": results}
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "type": type(e).__name__, "trace": traceback.format_exc()}


@router.get("/search-stores", response_model=StoreSearchResponse)
async def search_naver_stores(
    query: str = Query(..., min_length=1, description="검색할 매장명")
):
    """
    네이버 모바일 지도에서 매장 검색 (크롤링 방식)
    
    Args:
        query: 검색할 매장명 (필수)
        
    Returns:
        검색 결과 리스트 (최대 10개)
        
    Raises:
        HTTPException: 검색 실패 시
    """
    try:
        logger.info(f"[Crawling] Searching for stores: {query}")
        
        # 네이버 모바일 지도에서 검색
        results = await search_service.search_stores(query)
        
        # 응답 변환
        search_results = [
            StoreSearchResult(
                place_id=store["place_id"],
                name=store["name"],
                category=store["category"],
                address=store["address"],
                road_address=store.get("road_address", ""),
                thumbnail=store.get("thumbnail", "")
            )
            for store in results
        ]
        
        logger.info(f"[Crawling] Found {len(search_results)} stores for query: {query}")
        
        return StoreSearchResponse(
            status="success",
            query=query,
            results=search_results,
            total_count=len(search_results)
        )
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"[Crawling] Error searching stores: {str(e)}\n{error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"매장 검색 중 오류가 발생했습니다: {type(e).__name__}: {str(e)}"
        )


@router.get("/search-stores-api", response_model=StoreSearchResponse)
async def search_naver_stores_api(
    query: str = Query(..., min_length=1, description="검색할 매장명")
):
    """
    네이버 로컬 검색 API로 매장 검색 (API 방식 - 테스트)
    
    - 크롤링보다 빠르고 안정적 (약 2-6배 빠름)
    - API 키 필요 (환경 변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET)
    - 일일 25,000건 제한
    - 썸네일 이미지 없음
    
    Args:
        query: 검색할 매장명 (필수)
        
    Returns:
        검색 결과 리스트 (최대 5개)
        
    Raises:
        HTTPException: 검색 실패 시
    """
    try:
        logger.info(f"[API] Searching for stores: {query}")
        results = await api_search_service.search_stores(query)
        
        search_results = [
            StoreSearchResult(
                place_id=store["place_id"],
                name=store["name"],
                category=store["category"],
                address=store["address"],
                road_address=store.get("road_address", ""),
                thumbnail=store.get("thumbnail", "")
            )
            for store in results
        ]
        
        logger.info(f"[API] Found {len(search_results)} stores for query: {query}")
        
        return StoreSearchResponse(
            status="success",
            query=query,
            results=search_results,
            total_count=len(search_results)
        )
    except ValueError as e:
        logger.error(f"[API] Configuration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="네이버 API 설정이 완료되지 않았습니다. 환경 변수를 확인해주세요."
        )
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"[API] Error searching stores: {str(e)}\n{error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"매장 검색 중 오류가 발생했습니다: {type(e).__name__}: {str(e)}"
        )


@router.post("/connect", response_model=NaverConnectionResponse)
async def connect_naver_store(request: NaverConnectionRequest):
    """
    네이버 플레이스 연결 (세션 쿠키 저장)
    
    사용자가 로컬 브라우저에서 네이버 로그인 후 추출한 쿠키를 저장합니다.
    """
    try:
        # 매장 존재 확인
        supabase = get_supabase_client()
        store_check = supabase.table("stores").select("id, platform").eq(
            "id", str(request.store_id)
        ).eq("user_id", str(request.user_id)).single().execute()
        
        if not store_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없거나 권한이 없습니다."
            )
        
        if store_check.data["platform"] != "naver":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="네이버 플레이스 매장이 아닙니다."
            )
        
        # 쿠키 저장
        success = await store_naver_cookies(
            str(request.user_id),
            str(request.store_id),
            request.cookies
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="네이버 세션 저장에 실패했습니다."
            )
        
        return NaverConnectionResponse(
            status="success",
            message="네이버 플레이스가 성공적으로 연결되었습니다.",
            store_id=request.store_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"서버 오류가 발생했습니다: {str(e)}"
        )


@router.get("/stores/{store_id}/status")
async def check_naver_store_status(store_id: UUID):
    """
    네이버 플레이스 연결 상태 확인
    """
    try:
        supabase = get_supabase_client()
        result = supabase.table("stores").select("status, last_synced_at, platform").eq(
            "id", str(store_id)
        ).single().execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다."
            )
        
        return {
            "store_id": store_id,
            "status": result.data["status"],
            "platform": result.data["platform"],
            "last_synced_at": result.data["last_synced_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/stores/{store_id}/sync-reviews")
async def sync_naver_reviews(store_id: UUID):
    """
    네이버 플레이스 리뷰 수집
    
    네트워크 인터셉션을 통해 리뷰 데이터를 수집하고 DB에 저장합니다.
    """
    try:
        from app.services.naver_crawler import crawl_naver_reviews
        
        # 매장 정보 조회
        supabase = get_supabase_client()
        store = supabase.table("stores").select("place_id, platform").eq(
            "id", str(store_id)
        ).single().execute()
        
        if not store.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다."
            )
        
        if store.data["platform"] != "naver":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="네이버 플레이스 매장이 아닙니다."
            )
        
        place_id = store.data["place_id"]
        
        # 리뷰 크롤링
        reviews = await crawl_naver_reviews(str(store_id), place_id)
        
        return {
            "status": "success",
            "message": f"{len(reviews)}개의 리뷰를 수집했습니다.",
            "store_id": store_id,
            "review_count": len(reviews)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"리뷰 수집 중 오류 발생: {str(e)}"
        )


@router.post("/check-rank", response_model=RankCheckResponse)
async def check_place_rank(request: RankCheckRequest):
    """
    네이버 플레이스 키워드 순위 조회
    
    특정 키워드로 검색했을 때 매장의 순위를 확인하고 DB에 저장합니다.
    - 최초 조회 시: keywords 테이블에 INSERT
    - 재조회 시: keywords 테이블 UPDATE, rank_history에 오늘 날짜 데이터 UPSERT
    
    속도 최적화:
    - 최대 40개까지만 확인 (스크롤 2회)
    - 타겟 매장 발견 시 즉시 중단
    """
    try:
        supabase = get_supabase_client()
        
        # 매장 정보 조회
        store_result = supabase.table("stores").select(
            "id, place_id, store_name, platform, user_id"
        ).eq("id", str(request.store_id)).single().execute()
        
        if not store_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다."
            )
        
        if store_result.data["platform"] != "naver":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="네이버 플레이스 매장이 아닙니다."
            )
        
        store_data = store_result.data
        place_id = store_data["place_id"]
        store_name = store_data["store_name"]
        
        logger.info(
            f"[Rank Check] Store: {store_name} (ID: {place_id}), "
            f"Keyword: {request.keyword}"
        )
        
        # 순위 체크 (크롤링) - 최대 300개까지 확인
        rank_result = await rank_service.check_rank(
            keyword=request.keyword,
            target_place_id=place_id,
            max_results=300
        )
        
        # 기존 키워드 확인
        keyword_check = supabase.table("keywords").select(
            "id, current_rank, previous_rank"
        ).eq("store_id", str(request.store_id)).eq(
            "keyword", request.keyword
        ).execute()
        
        now = datetime.utcnow()
        today = date.today()
        
        keyword_id = None
        previous_rank = None
        
        if keyword_check.data and len(keyword_check.data) > 0:
            # 기존 키워드 업데이트
            existing_keyword = keyword_check.data[0]
            keyword_id = existing_keyword["id"]
            previous_rank = existing_keyword["current_rank"]
            
            # keywords 테이블 업데이트
            # total_count 처리: 정수 또는 문자열 "1,234" → 1234 변환
            total_count_value = rank_result.get("total_count")
            total_results = 0
            
            if total_count_value is not None:
                if isinstance(total_count_value, str):
                    # 문자열 "1,234" → 1234
                    total_results = int(total_count_value.replace(",", "")) if total_count_value.strip() else 0
                elif isinstance(total_count_value, int):
                    # 정수 그대로
                    total_results = total_count_value
            
            logger.info(f"[Rank Check] UPDATE - total_count: {total_count_value}, total_results: {total_results}")
            
            supabase.table("keywords").update({
                "previous_rank": previous_rank,
                "current_rank": rank_result["rank"],
                "total_results": total_results,
                "last_checked_at": now.isoformat()
            }).eq("id", keyword_id).execute()
            
            logger.info(
                f"[Rank Check] Updated existing keyword (ID: {keyword_id}), "
                f"Rank: {previous_rank} → {rank_result['rank']}"
            )
            
        else:
            # 새 키워드 등록 전에 제한 확인
            # store를 통해 user_id 가져오기
            user_id = store_data.get("user_id")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="매장에 연결된 사용자를 찾을 수 없습니다."
                )
            
            is_limit_exceeded, current_count, max_count = check_keyword_limit(supabase, user_id)
            
            if is_limit_exceeded:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"키워드 등록 제한에 도달했습니다. (현재: {current_count}/{max_count}개) 구독 플랜을 업그레이드해주세요."
                )
            
            # 새 키워드 등록
            # total_count 처리: 정수 또는 문자열 "1,234" → 1234 변환
            total_count_value = rank_result.get("total_count")
            total_results = 0
            
            if total_count_value is not None:
                if isinstance(total_count_value, str):
                    # 문자열 "1,234" → 1234
                    total_results = int(total_count_value.replace(",", "")) if total_count_value.strip() else 0
                elif isinstance(total_count_value, int):
                    # 정수 그대로
                    total_results = total_count_value
            
            logger.info(f"[Rank Check] NEW KEYWORD - total_count: {total_count_value}, total_results: {total_results}")
            
            keyword_insert = supabase.table("keywords").insert({
                "store_id": str(request.store_id),
                "keyword": request.keyword,
                "current_rank": rank_result["rank"],
                "previous_rank": None,
                "total_results": total_results,
                "last_checked_at": now.isoformat()
            }).execute()
            
            keyword_id = keyword_insert.data[0]["id"]
            
            logger.info(
                f"[Rank Check] Created new keyword (ID: {keyword_id}), "
                f"Rank: {rank_result['rank']}, User keywords: {current_count + 1}/{max_count}"
            )
        
        # rank_history 처리 (오늘 날짜 데이터만 유지)
        # 1. 오늘 날짜의 기존 기록 삭제
        supabase.table("rank_history").delete().eq(
            "keyword_id", keyword_id
        ).gte(
            "checked_at", today.isoformat()
        ).lt(
            "checked_at", (today.replace(day=today.day + 1)).isoformat() if today.day < 28 else today.isoformat()
        ).execute()
        
        # 2. 새로운 기록 추가
        supabase.table("rank_history").insert({
            "keyword_id": keyword_id,
            "rank": rank_result["rank"],
            "checked_at": now.isoformat()
        }).execute()
        
        logger.info(f"[Rank Check] Saved rank history for today")
        
        # 순위 변동 계산
        rank_change = None
        if previous_rank and rank_result["rank"]:
            # 순위가 낮을수록 좋음 (1위가 최고)
            rank_change = previous_rank - rank_result["rank"]  # 양수: 순위 상승
        
        return RankCheckResponse(
            status="success",
            keyword=request.keyword,
            place_id=place_id,
            store_name=store_name,
            rank=rank_result["rank"],
            found=rank_result["found"],
            total_results=rank_result["total_results"],
            total_count=rank_result.get("total_count"),  # 전체 업체 수
            previous_rank=previous_rank,
            rank_change=rank_change,
            last_checked_at=now,
            search_results=rank_result["search_results"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"[Rank Check] Error: {str(e)}\n{error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"순위 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/stores/{store_id}/keywords", response_model=KeywordListResponse)
async def get_store_keywords(store_id: UUID):
    """
    매장의 키워드 목록 조회
    
    등록된 키워드와 현재 순위, 이전 순위를 반환합니다.
    """
    try:
        supabase = get_supabase_client()
        
        # 매장 존재 확인
        store_check = supabase.table("stores").select("id").eq(
            "id", str(store_id)
        ).single().execute()
        
        if not store_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다."
            )
        
        # 키워드 조회 (최근 30개만) with is_tracked 정보
        keywords_result = supabase.table("keywords").select(
            "id, keyword, current_rank, previous_rank, total_results, last_checked_at, created_at"
        ).eq("store_id", str(store_id)).order(
            "last_checked_at", desc=True
        ).limit(30).execute()
        
        # 추적 중인 키워드 ID 목록 조회
        trackers_result = supabase.table("metric_trackers").select(
            "keyword_id"
        ).eq("store_id", str(store_id)).execute()
        
        tracked_keyword_ids = set()
        for tracker in trackers_result.data:
            if tracker.get("keyword_id"):
                tracked_keyword_ids.add(tracker["keyword_id"])
        
        keywords = []
        for kw in keywords_result.data:
            rank_change = None
            if kw["previous_rank"] and kw["current_rank"]:
                rank_change = kw["previous_rank"] - kw["current_rank"]
            
            # keywords 테이블의 id를 사용하여 is_tracked 확인
            is_tracked = kw["id"] in tracked_keyword_ids
            
            keywords.append({
                "id": kw["id"],
                "keyword": kw["keyword"],
                "current_rank": kw["current_rank"],
                "previous_rank": kw["previous_rank"],
                "rank_change": rank_change,
                "total_results": kw.get("total_results", 0),
                "is_tracked": is_tracked,
                "last_checked_at": kw["last_checked_at"],
                "created_at": kw["created_at"]
            })
        
        return KeywordListResponse(
            status="success",
            store_id=store_id,
            keywords=keywords,
            total_count=len(keywords)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching keywords: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"키워드 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/keywords/{keyword_id}/history")
async def get_keyword_rank_history(keyword_id: UUID):
    """
    키워드 순위 히스토리 조회
    
    날짜별 순위 변화를 조회하여 차트로 표시할 수 있습니다.
    """
    try:
        supabase = get_supabase_client()
        
        # 키워드 정보 조회
        keyword_check = supabase.table("keywords").select(
            "id, keyword, store_id"
        ).eq("id", str(keyword_id)).single().execute()
        
        if not keyword_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="키워드를 찾을 수 없습니다."
            )
        
        keyword_data = keyword_check.data
        
        # 순위 히스토리 조회 (날짜순 정렬)
        history_result = supabase.table("rank_history").select(
            "id, rank, checked_at"
        ).eq("keyword_id", str(keyword_id)).order(
            "checked_at", desc=False  # 오래된 것부터
        ).execute()
        
        history = []
        for record in history_result.data:
            history.append({
                "date": record["checked_at"],
                "rank": record["rank"],
                "checked_at": record["checked_at"]
            })
        
        return {
            "status": "success",
            "keyword_id": str(keyword_id),
            "keyword": keyword_data["keyword"],
            "store_id": keyword_data["store_id"],
            "history": history,
            "total_records": len(history)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Get Keyword History] Error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"순위 히스토리 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.delete("/keywords/{keyword_id}")
async def delete_keyword(keyword_id: UUID, current_user: dict = Depends(get_current_user)):
    """
    키워드 삭제 (Stored Procedure 사용, RLS 우회)
    
    ⚠️ 경고: 이 작업은 되돌릴 수 없습니다.
    - 키워드 정보가 영구적으로 삭제됩니다.
    - 과거 순위 기록(rank_history)도 모두 삭제됩니다.
    - 삭제된 데이터는 복구할 수 없습니다.
    """
    try:
        supabase = get_supabase_client()
        
        logger.info(f"[Delete Keyword] Attempting to delete keyword ID: {keyword_id}")
        
        # Stored procedure를 호출하여 cascade delete 수행 (RLS 우회)
        result = supabase.rpc(
            'delete_keyword_cascade',
            {'p_keyword_id': str(keyword_id)}
        ).execute()
        
        logger.info(f"[Delete Keyword] RPC result: {result.data}")
        
        # 결과 파싱
        if result.data:
            response_data = result.data
            
            if response_data.get('status') == 'error':
                logger.error(f"[Delete Keyword] RPC returned error: {response_data.get('message')}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=response_data.get('message', '키워드를 찾을 수 없습니다.')
            )
        
        # 성공
        keyword_name = response_data.get('keyword', 'Unknown')
        deleted_trackers = response_data.get('deleted_trackers', 0)
        deleted_history = response_data.get('deleted_history', 0)
        deleted_keywords = response_data.get('deleted_keywords', 0)
        
        logger.info(
            f"[Delete Keyword] Successfully deleted: "
            f"keyword='{keyword_name}', "
            f"trackers={deleted_trackers}, "
            f"history={deleted_history}, "
            f"keywords={deleted_keywords}"
        )
        
        return {
            "status": "success",
            "message": f"키워드 '{keyword_name}'가 삭제되었습니다.",
            "keyword_id": str(keyword_id),
            "keyword": keyword_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Delete Keyword] Error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"키워드 삭제 중 오류가 발생했습니다: {str(e)}"
        )


# ============================================
# 비공식 API 방식 엔드포인트 (새로 추가)
# ============================================

@router.get("/search-stores-unofficial", response_model=StoreSearchResponse)
async def search_naver_stores_unofficial(
    query: str = Query(..., min_length=1, description="검색할 매장명")
):
    """
    네이버 모바일 지도에서 매장 검색 (비공식 API 방식)
    
    ⚠️ 경고: 이 엔드포인트는 네이버의 비공식 API를 사용합니다.
             교육 목적으로만 사용하세요.
    
    장점:
    - 크롤링보다 2-3배 빠름
    - 더 안정적
    - 리뷰수, 저장수 등 추가 데이터 제공
    
    Args:
        query: 검색할 매장명 (필수)
        
    Returns:
        검색 결과 리스트 (최대 100개)
        
    Raises:
        HTTPException: 검색 실패 시
    """
    try:
        logger.info(f"[Unofficial API] Searching for stores: {query}")
        
        # 비공식 API로 검색
        results = await search_service_api_unofficial.search_stores(query)
        
        # 응답 변환
        search_results = [
            StoreSearchResult(
                place_id=store["place_id"],
                name=store["name"],
                category=store["category"],
                address=store["address"],
                road_address=store.get("road_address", ""),
                thumbnail=store.get("thumbnail", "")
            )
            for store in results
        ]
        
        logger.info(f"[Unofficial API] Found {len(search_results)} stores for query: {query}")
        
        return StoreSearchResponse(
            status="success",
            query=query,
            results=search_results,
            total_count=len(search_results)
        )
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"[Unofficial API] Error searching stores: {str(e)}\n{error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"매장 검색 중 오류가 발생했습니다: {type(e).__name__}: {str(e)}"
        )


class RankCheckResponseUnofficial(BaseModel):
    """순위 조회 응답 (비공식 API - 리뷰수 포함)"""
    status: str
    keyword: str
    place_id: str
    store_name: str
    rank: Optional[int] = None
    found: bool
    total_results: int
    total_count: Optional[int] = None  # 전체 업체 수
    previous_rank: Optional[int] = None
    rank_change: Optional[int] = None  # 순위 변동
    last_checked_at: datetime
    search_results: List[Dict]
    # 리뷰수 정보 추가 ⭐
    visitor_review_count: int  # 방문자 리뷰 수
    blog_review_count: int  # 블로그 리뷰 수
    save_count: int  # 저장 수


@router.post("/check-rank-unofficial", response_model=RankCheckResponseUnofficial)
async def check_place_rank_unofficial(request: RankCheckRequest):
    """
    네이버 플레이스 키워드 순위 조회 (비공식 API 방식)
    
    ⚠️ 경고: 이 엔드포인트는 네이버의 비공식 API를 사용합니다.
             교육 목적으로만 사용하세요.
    
    장점:
    - 크롤링보다 5-10배 빠름 (약 2-3초)
    - 더 안정적인 응답
    - 방문자 리뷰수, 블로그 리뷰수, 저장수 추가 제공 ⭐
    
    특정 키워드로 검색했을 때 매장의 순위를 확인하고 DB에 저장합니다.
    - 최초 조회 시: keywords 테이블에 INSERT
    - 재조회 시: keywords 테이블 UPDATE, rank_history에 오늘 날짜 데이터 UPSERT
    
    속도 최적화:
    - 최대 300개까지 확인
    - 타겟 매장 발견 시 즉시 중단 가능
    """
    try:
        supabase = get_supabase_client()
        
        # 매장 정보 조회
        store_result = supabase.table("stores").select(
            "id, place_id, store_name, platform, user_id"
        ).eq("id", str(request.store_id)).single().execute()
        
        if not store_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다."
            )
        
        if store_result.data["platform"] != "naver":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="네이버 플레이스 매장이 아닙니다."
            )
        
        store_data = store_result.data
        place_id = store_data["place_id"]
        store_name = store_data["store_name"]
        
        logger.info(
            f"[Unofficial API Rank] Store: {store_name} (ID: {place_id}), "
            f"Keyword: {request.keyword}"
        )
        
        # 순위 체크 (비공식 API) - 최대 300개까지 확인
        rank_result = await rank_service_api_unofficial.check_rank(
            keyword=request.keyword,
            target_place_id=place_id,
            max_results=300
        )
        
        # 타겟 매장의 리뷰수 정보 추출
        target_store = rank_result.get("target_store", {})
        visitor_review_count = target_store.get("visitor_review_count", 0)
        blog_review_count = target_store.get("blog_review_count", 0)
        save_count = target_store.get("save_count", 0)
        
        logger.info(
            f"[Unofficial API Rank] Target store stats: "
            f"Visitor Reviews={visitor_review_count}, "
            f"Blog Reviews={blog_review_count}, "
            f"Saves={save_count}"
        )
        
        # 기존 키워드 확인
        keyword_check = supabase.table("keywords").select(
            "id, current_rank, previous_rank"
        ).eq("store_id", str(request.store_id)).eq(
            "keyword", request.keyword
        ).execute()
        
        now = datetime.utcnow()
        today = date.today()
        
        keyword_id = None
        previous_rank = None
        
        # total_count 파싱 (문자열 "778" 또는 정수 778 → 정수 778)
        total_count_value = rank_result.get("total_count", 0)
        total_results_int = 0
        if total_count_value is not None:
            if isinstance(total_count_value, str):
                # 문자열 "1,234" → 1234
                total_results_int = int(total_count_value.replace(",", "")) if total_count_value.strip() else 0
            elif isinstance(total_count_value, int):
                # 정수 그대로
                total_results_int = total_count_value
        
        logger.info(f"[Total Results] Parsed total_count: {total_count_value} → {total_results_int}")
        
        if keyword_check.data and len(keyword_check.data) > 0:
            # 기존 키워드 업데이트
            existing_keyword = keyword_check.data[0]
            keyword_id = existing_keyword["id"]
            previous_rank = existing_keyword["current_rank"]
            
            # keywords 테이블 업데이트 (total_results 포함)
            supabase.table("keywords").update({
                "previous_rank": previous_rank,
                "current_rank": rank_result["rank"],
                "total_results": total_results_int,
                "last_checked_at": now.isoformat()
            }).eq("id", keyword_id).execute()
            
            logger.info(
                f"[Unofficial API Rank] Updated existing keyword (ID: {keyword_id}), "
                f"Rank: {previous_rank} → {rank_result['rank']}, Total: {total_results_int}"
            )
            
        else:
            # 새 키워드 등록 전에 제한 확인
            # store를 통해 user_id 가져오기
            user_id = store_data.get("user_id")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="매장에 연결된 사용자를 찾을 수 없습니다."
                )
            
            is_limit_exceeded, current_count, max_count = check_keyword_limit(supabase, user_id)
            
            if is_limit_exceeded:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"키워드 등록 제한에 도달했습니다. (현재: {current_count}/{max_count}개) 구독 플랜을 업그레이드해주세요."
                )
            
            # 새 키워드 등록 (total_results 포함)
            keyword_insert = supabase.table("keywords").insert({
                "store_id": str(request.store_id),
                "keyword": request.keyword,
                "current_rank": rank_result["rank"],
                "previous_rank": None,
                "total_results": total_results_int,
                "last_checked_at": now.isoformat()
            }).execute()
            
            keyword_id = keyword_insert.data[0]["id"]
            
            logger.info(
                f"[Unofficial API Rank] Created new keyword (ID: {keyword_id}), "
                f"Rank: {rank_result['rank']}, Total: {total_results_int}, User keywords: {current_count + 1}/{max_count}"
            )
        
        # rank_history 처리 (오늘 날짜 데이터만 유지)
        # 1. 오늘 날짜의 기존 기록 삭제
        supabase.table("rank_history").delete().eq(
            "keyword_id", keyword_id
        ).gte(
            "checked_at", today.isoformat()
        ).lt(
            "checked_at", (today.replace(day=today.day + 1)).isoformat() if today.day < 28 else today.isoformat()
        ).execute()
        
        # 2. 새로운 기록 추가
        supabase.table("rank_history").insert({
            "keyword_id": keyword_id,
            "rank": rank_result["rank"],
            "checked_at": now.isoformat()
        }).execute()
        
        logger.info(f"[Unofficial API Rank] Saved rank history for today")
        
        # 순위 변동 계산
        rank_change = None
        if previous_rank and rank_result["rank"]:
            # 순위가 낮을수록 좋음 (1위가 최고)
            rank_change = previous_rank - rank_result["rank"]  # 양수: 순위 상승
        
        return RankCheckResponseUnofficial(
            status="success",
            keyword=request.keyword,
            place_id=place_id,
            store_name=store_name,
            rank=rank_result["rank"],
            found=rank_result["found"],
            total_results=rank_result["total_results"],
            total_count=rank_result.get("total_count"),
            previous_rank=previous_rank,
            rank_change=rank_change,
            last_checked_at=now,
            search_results=rank_result["search_results"],
            # 리뷰수 정보 추가 ⭐
            visitor_review_count=visitor_review_count,
            blog_review_count=blog_review_count,
            save_count=save_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"[Unofficial API Rank] Error: {str(e)}\n{error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"순위 조회 중 오류가 발생했습니다: {str(e)}"
        )


# ============================================
# 대표키워드 분석 API
# ============================================

class KeywordsAnalysisRequest(BaseModel):
    """대표키워드 분석 요청"""
    query: str


class StoreKeywordInfo(BaseModel):
    """매장별 키워드 정보"""
    rank: int
    place_id: str
    name: str
    category: str
    address: str
    thumbnail: Optional[str] = ""
    rating: Optional[float] = None
    review_count: str
    keywords: List[str]


class KeywordsAnalysisResponse(BaseModel):
    """대표키워드 분석 응답"""
    status: str
    query: str
    total_stores: int
    stores_analyzed: List[StoreKeywordInfo]


@router.post("/analyze-main-keywords", response_model=KeywordsAnalysisResponse)
async def analyze_main_keywords(request: KeywordsAnalysisRequest):
    """
    대표키워드 분석
    
    검색 키워드로 상위 15개 매장의 대표 키워드를 분석합니다.
    """
    try:
        logger.info(f"[대표키워드 분석] 요청: {request.query}")
        
        result = await keywords_analyzer_service.analyze_top_stores_keywords(
            query=request.query,
            top_n=15
        )
        
        return KeywordsAnalysisResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"[대표키워드 분석] Error: {str(e)}\n{error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"대표키워드 분석 중 오류가 발생했습니다: {str(e)}"
        )


# ============================================
# 플레이스 진단 API
# ============================================

async def get_optional_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
    """
    Optional 인증: 토큰이 있으면 사용자 정보 반환, 없으면 None 반환
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        logger.warning("[Optional Auth] 토큰 검증 실패, 익명 사용자로 처리")
        return None


@router.get("/place-details/{place_id}")
async def get_place_details(
    place_id: str, 
    mode: str = "complete", 
    store_name: str = None,
    store_id: Optional[UUID] = None,
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    """
    플레이스 상세 정보 조회 (진단용)
    
    Args:
        place_id: 네이버 플레이스 ID
        mode: 진단 모드 (기본값: complete)
            - "quick": 빠른 진단 (GraphQL만, 1-2초)
            - "standard": 표준 진단 (GraphQL + HTML, 3-5초) - 미구현
            - "complete": 완전 진단 (모든 데이터, 5-10초)
        store_name: 매장명 (선택, 제공하면 검색 API 사용으로 정확도 향상)
        store_id: 매장 ID (선택, 제공하면 진단 히스토리 저장, 인증 필요)
    """
    try:
        logger.info(f"[플레이스 진단] 요청: place_id={place_id}, mode={mode}, store_name={store_name}, store_id={store_id}, authenticated={current_user is not None}")
        
        # 완전 진단 서비스 사용
        from app.services.naver_complete_diagnosis_service import complete_diagnosis_service
        
        details = await complete_diagnosis_service.diagnose_place(place_id, store_name)
        
        if not details:
            raise HTTPException(
                status_code=404,
                detail="플레이스 정보를 찾을 수 없습니다. 잘못된 place_id이거나 정보가 없습니다."
            )
        
        # name이 비어있어도 place_id가 있으면 계속 진행
        if not details.get("name"):
            logger.warning(f"[플레이스 진단] Name 필드가 비어있지만 진행: place_id={place_id}")
        
        # 진단 평가 실행
        from app.services.naver_diagnosis_engine import diagnosis_engine
        diagnosis_result = diagnosis_engine.diagnose(details)
        
        # 채워진 필드 통계
        filled_count = sum(1 for v in details.values() if v not in [None, "", [], {}, 0, False])
        total_count = len(details)
        fill_rate = (filled_count / total_count * 100) if total_count > 0 else 0
        
        logger.info(f"[플레이스 진단] 완료: {details['name']}")
        logger.info(f"[플레이스 진단] 채워진 정보: {filled_count}/{total_count} ({fill_rate:.1f}%)")
        logger.info(f"[플레이스 진단] 평가 점수: {diagnosis_result['total_score']}/{diagnosis_result['max_score']}점 ({diagnosis_result['grade']}등급)")
        
        # 진단 히스토리 저장 (store_id와 current_user가 제공된 경우에만)
        history_id = None
        if store_id and current_user:
            try:
                supabase = get_supabase_client()
                user_id = current_user.get("id")
                
                if user_id:
                    history_data = {
                        "user_id": str(user_id),
                        "store_id": str(store_id),
                        "place_id": place_id,
                        "store_name": details.get("name", "Unknown"),
                        "total_score": int(float(diagnosis_result["total_score"])),  # float을 int로 변환
                        "max_score": int(float(diagnosis_result["max_score"])),      # float을 int로 변환
                        "grade": diagnosis_result["grade"],
                        "diagnosis_result": diagnosis_result,
                        "place_details": details
                    }
                    result = supabase.table("diagnosis_history").insert(history_data).execute()
                    if result.data and len(result.data) > 0:
                        history_id = result.data[0].get("id")
                        logger.info(f"[진단 히스토리] 저장 완료: store_id={store_id}, user_id={user_id}, history_id={history_id}")
                    else:
                        logger.warning(f"[진단 히스토리] 저장은 되었으나 ID를 가져올 수 없음")
                else:
                    logger.warning(f"[진단 히스토리] user_id를 찾을 수 없음")
            except Exception as e:
                # 히스토리 저장 실패해도 진단 결과는 반환 (기존 기능에 영향 없음)
                logger.error(f"[진단 히스토리] 저장 실패: {str(e)}")
        elif store_id and not current_user:
            logger.info(f"[진단 히스토리] 인증되지 않은 사용자, 히스토리 저장 건너뜀")
        else:
            logger.info(f"[진단 히스토리] store_id 없음, 히스토리 저장 건너뜀")
        
        return {
            "status": "success",
            "place_id": place_id,
            "mode": mode,
            "fill_rate": round(fill_rate, 1),
            "details": details,
            "diagnosis": diagnosis_result,  # 진단 평가 결과 추가
            "history_id": history_id  # 저장된 히스토리 ID 추가
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"[플레이스 진단] Error: {str(e)}\n{error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"플레이스 진단 중 오류가 발생했습니다: {str(e)}"
        )


# ============================================
# 경쟁매장 분석 API
# ============================================

class CompetitorSearchRequest(BaseModel):
    """경쟁매장 검색 요청"""
    keyword: str
    limit: int = 20


class CompetitorSearchResponse(BaseModel):
    """경쟁매장 검색 응답"""
    status: str
    keyword: str
    total: int
    stores: List[Dict]


class CompetitorAnalysisRequest(BaseModel):
    """경쟁매장 분석 요청"""
    keyword: str
    my_place_id: str
    limit: int = 20


class CompetitorCompareRequest(BaseModel):
    """경쟁매장 비교 분석 요청"""
    my_store: dict
    competitors: list
    
    class Config:
        arbitrary_types_allowed = True


class CompetitorAnalysisResponse(BaseModel):
    """경쟁매장 분석 응답"""
    status: str
    keyword: str
    my_store: Dict
    competitors: List[Dict]
    comparison: Dict


@router.post("/competitor/search", response_model=CompetitorSearchResponse)
async def search_competitors(request: CompetitorSearchRequest):
    """
    키워드로 상위 노출 경쟁매장 검색
    
    Args:
        request: 검색 요청 (키워드, 개수)
        
    Returns:
        상위 노출 매장 목록
    """
    try:
        logger.info(f"[경쟁매장] 검색 시작: keyword={request.keyword}, limit={request.limit}")
        
        # 상위 매장 검색
        stores = await competitor_analysis_service.get_top_competitors(
            keyword=request.keyword,
            limit=request.limit
        )
        
        logger.info(f"[경쟁매장] 검색 완료: {len(stores)}개 발견")
        
        return {
            "status": "success",
            "keyword": request.keyword,
            "total": len(stores),
            "stores": stores
        }
        
    except Exception as e:
        logger.error(f"[경쟁매장] 검색 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"경쟁매장 검색 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/competitor/analyze", response_model=CompetitorAnalysisResponse)
async def analyze_competitors(request: CompetitorAnalysisRequest):
    """
    경쟁매장 전체 분석 및 비교
    
    Args:
        request: 분석 요청 (키워드, 우리 매장 ID, 개수)
        
    Returns:
        경쟁매장 분석 결과 + 우리 매장 비교
    """
    try:
        logger.info(f"[경쟁매장] 전체 분석 시작: keyword={request.keyword}, my_place_id={request.my_place_id}")
        
        # 1. 우리 매장 분석
        logger.info(f"[경쟁매장] 우리 매장 분석 중...")
        my_store = await competitor_analysis_service.analyze_competitor(
            place_id=request.my_place_id,
            rank=0  # 우리 매장은 순위 0
        )
        
        if not my_store:
            raise HTTPException(
                status_code=404,
                detail="우리 매장 정보를 찾을 수 없습니다."
            )
        
        # 2. 경쟁매장 분석
        logger.info(f"[경쟁매장] 경쟁사 분석 중...")
        competitors = await competitor_analysis_service.analyze_all_competitors(
            keyword=request.keyword,
            limit=request.limit
        )
        
        # 3. 비교 분석 (LLM 기반)
        logger.info(f"[경쟁매장] 비교 분석 중 (LLM 사용)...")
        comparison = await competitor_analysis_service.compare_with_my_store(
            my_store_data=my_store,
            competitors=competitors
        )
        
        logger.info(f"[경쟁매장] 전체 분석 완료: {len(competitors)}개 경쟁사")
        
        return {
            "status": "success",
            "keyword": request.keyword,
            "my_store": my_store,
            "competitors": competitors,
            "comparison": comparison
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"[경쟁매장] 분석 실패: {str(e)}\n{error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"경쟁매장 분석 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/competitor/compare")
async def compare_competitors(request: dict):
    """
    경쟁매장 비교 분석 (LLM 기반)
    
    Args:
        request: 우리 매장 + 경쟁매장 데이터
        
    Returns:
        LLM 기반 비교 분석 결과
    """
    try:
        print(f"[DEBUG] 비교 분석 요청 받음")
        my_store = request.get("my_store", {})
        competitors = request.get("competitors", [])
        print(f"[DEBUG] my_store type: {type(my_store)}")
        print(f"[DEBUG] competitors type: {type(competitors)}")
        print(f"[DEBUG] competitors length: {len(competitors)}")
        logger.info(f"[경쟁매장] 비교 분석 요청: {len(competitors)}개 경쟁사")
        
        comparison = await competitor_analysis_service.compare_with_my_store(
            my_store_data=my_store,
            competitors=competitors
        )
        
        logger.info(f"[경쟁매장] 비교 분석 완료: {len(comparison.get('recommendations', []))}개 권장사항")
        
        return comparison
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"[경쟁매장] 비교 분석 실패: {str(e)}\n{error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"비교 분석 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/competitor/analyze-single/{place_id}")
async def analyze_single_competitor(place_id: str, rank: int = 0, store_name: str = None):
    """
    단일 경쟁매장 분석 (점진적 로딩용)
    
    Args:
        place_id: 네이버 플레이스 ID
        rank: 검색 순위
        store_name: 매장명 (선택, 제공하면 정확도 향상)
        
    Returns:
        매장 분석 결과
    """
    try:
        logger.info(f"[경쟁매장] 단일 분석 시작: place_id={place_id}, store_name={store_name}, rank={rank}")
        
        result = await competitor_analysis_service.analyze_competitor(
            place_id=place_id,
            rank=rank,
            store_name=store_name
        )
        
        if not result:
            logger.error(f"[경쟁매장] place_id={place_id}로 매장 정보를 찾을 수 없습니다")
            raise HTTPException(
                status_code=404,
                detail=f"매장 정보를 찾을 수 없습니다. place_id: {place_id}"
            )
        
        logger.info(f"[경쟁매장] 단일 분석 완료: {result.get('name', 'Unknown')}")
        
        return {
            "status": "success",
            "result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"[경쟁매장] 단일 분석 실패: {str(e)}\n{error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"매장 분석 중 오류가 발생했습니다: {str(e)}"
        )


# ============================================
# 진단 히스토리 API
# ============================================

@router.get("/diagnosis-history/{store_id}")
async def get_diagnosis_history(
    store_id: UUID,
    current_user: dict = Depends(get_current_user),
    limit: int = Query(30, ge=1, le=100, description="조회할 히스토리 개수")
):
    """
    매장의 진단 히스토리 목록 조회
    
    Args:
        store_id: 매장 ID
        limit: 조회할 개수 (기본 30개, 최대 100개)
        
    Returns:
        진단 히스토리 목록 (최신순)
    """
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        logger.info(f"[진단 히스토리] 조회 시작: user_id={user_id}, store_id={store_id}, limit={limit}")
        
        # 히스토리 조회 (최신순, user_id와 store_id로 필터링)
        result = supabase.table("diagnosis_history")\
            .select("id, place_id, store_name, diagnosed_at, total_score, max_score, grade")\
            .eq("user_id", str(user_id))\
            .eq("store_id", str(store_id))\
            .order("diagnosed_at", desc=True)\
            .limit(limit)\
            .execute()
        
        history_list = result.data if result.data else []
        
        logger.info(f"[진단 히스토리] 조회 완료: {len(history_list)}개")
        
        return {
            "status": "success",
            "store_id": str(store_id),
            "total": len(history_list),
            "history": history_list
        }
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"[진단 히스토리] 조회 실패: {str(e)}\n{error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"진단 히스토리 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/diagnosis-history/detail/{history_id}")
async def get_diagnosis_history_detail(
    history_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    특정 진단 히스토리의 상세 정보 조회
    
    Args:
        history_id: 히스토리 ID
        
    Returns:
        진단 히스토리 상세 정보 (전체 진단 결과 포함)
    """
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        logger.info(f"[진단 히스토리] 상세 조회: user_id={user_id}, history_id={history_id}")
        
        # 히스토리 상세 조회 (user_id 확인)
        result = supabase.table("diagnosis_history")\
            .select("*")\
            .eq("id", str(history_id))\
            .eq("user_id", str(user_id))\
            .single()\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="진단 히스토리를 찾을 수 없습니다."
            )
        
        logger.info(f"[진단 히스토리] 상세 조회 완료: {result.data['store_name']}")
        
        return {
            "status": "success",
            "history": result.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"[진단 히스토리] 상세 조회 실패: {str(e)}\n{error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"진단 히스토리 상세 조회 중 오류가 발생했습니다: {str(e)}"
        )


# ==================== 플레이스 활성화 ====================

class ActivationResponse(BaseModel):
    """플레이스 활성화 정보 응답"""
    status: str
    data: Dict[str, Any]


class GenerateTextRequest(BaseModel):
    """텍스트 생성 요청"""
    store_id: str
    # 기존 필드 (하위 호환성 유지)
    prompt: Optional[str] = None
    # 새로운 필드 (업체소개글 SEO 최적화용)
    region_keyword: Optional[str] = None  # 지역 키워드 (1개)
    landmark_keywords: Optional[List[str]] = None  # 랜드마크 키워드 (최대 2개)
    business_type_keyword: Optional[str] = None  # 업종 키워드 (1개)
    product_keywords: Optional[List[str]] = None  # 상품/서비스 키워드 (최대 3개)
    store_features: Optional[str] = None  # 매장 특색 및 강점
    # 찾아오는길 SEO 최적화용
    directions_description: Optional[str] = None  # 찾아오는 길 자유 입력 설명


class GenerateTextResponse(BaseModel):
    """텍스트 생성 응답"""
    status: str
    generated_text: str


@router.get("/activation/{store_id}", response_model=ActivationResponse)
async def get_activation_info(
    store_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    플레이스 활성화 정보 조회
    
    Args:
        store_id: 매장 ID (UUID)
        current_user: 현재 사용자 정보
    """
    try:
        logger.info(f"[플레이스 활성화] 요청: store_id={store_id}, user_id={current_user['id']}")
        
        supabase = get_supabase_client()
        
        # 1. 매장 정보 조회
        store_result = supabase.table("stores").select("*").eq("id", store_id).execute()
        
        if not store_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다"
            )
        
        store = store_result.data[0]
        
        # 2. 권한 확인
        if store.get("user_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="해당 매장에 접근할 권한이 없습니다"
            )
        
        place_id = store.get("place_id")
        store_name = store.get("store_name")
        
        if not place_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="네이버 플레이스 ID가 등록되지 않은 매장입니다"
            )
        
        # 3. 활성화 정보 조회
        from app.services.naver_activation_service_v3 import activation_service_v3
        
        activation_data = await activation_service_v3.get_activation_info(
            store_id=store_id,
            place_id=place_id,
            store_name=store_name
        )
        
        logger.info(f"[플레이스 활성화] 완료: {len(activation_data.get('issues', []))}개 이슈")
        
        # 4. 활성화 이력 저장
        try:
            history_data = {
                "user_id": current_user["id"],
                "store_id": store_id,
                "store_name": store_name,
                "place_id": place_id,
                "thumbnail": store.get("thumbnail"),
                "summary_cards": activation_data.get("summary_cards", []),
                "activation_data": activation_data,
            }
            
            supabase.table("activation_history").insert(history_data).execute()
            logger.info(f"[플레이스 활성화] 이력 저장 완료: store_id={store_id}")
        except Exception as e:
            # 이력 저장 실패해도 결과는 반환
            logger.warning(f"[플레이스 활성화] 이력 저장 실패: {str(e)}")
        
        return ActivationResponse(
            status="success",
            data=activation_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[플레이스 활성화] 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"활성화 정보 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/activation/generate-description", response_model=GenerateTextResponse)
async def generate_description(
    request: GenerateTextRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    업체소개글 SEO 최적화 생성
    
    Args:
        request: 생성 요청 (store_id, prompt)
        current_user: 현재 사용자 정보
    """
    try:
        logger.info(f"[업체소개글 생성] 요청: store_id={request.store_id}")
        
        supabase = get_supabase_client()
        
        # 1. 매장 정보 조회 및 권한 확인
        store_result = supabase.table("stores").select("*").eq("id", request.store_id).execute()
        
        if not store_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다"
            )
        
        store = store_result.data[0]
        
        if store.get("user_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="해당 매장에 접근할 권한이 없습니다"
            )
        
        # 2. LLM으로 업체소개글 생성
        import os
        from openai import AsyncOpenAI
        
        openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # 새로운 필드가 제공된 경우 SEO 최적화 프롬프트 사용
        if request.region_keyword or request.landmark_keywords or request.business_type_keyword:
            # 키워드 정리
            region = request.region_keyword or "정보 없음"
            landmarks = ", ".join(request.landmark_keywords) if request.landmark_keywords else "정보 없음"
            business_type = request.business_type_keyword or "정보 없음"
            products = ", ".join(request.product_keywords) if request.product_keywords else "정보 없음"
            features = request.store_features or "정보 없음"
            
            system_prompt = """당신은 네이버 플레이스 SEO 및 로컬 검색 알고리즘에 특화된 대한민국 최고 수준의
로컬 마케팅 전문 카피라이터입니다.

당신의 목표는 아래 [입력 정보]를 기반으로
네이버 플레이스 노출에 최적화된 업체 설명을 작성하는 것입니다."""
            
            user_message = f"""━━━━━━━━━━━━━━━━━━
[입력 정보]

1. 지역 키워드:
{region}

2. 랜드마크 키워드 (역, 상권, 건물, 관광지 등):
{landmarks}

3. 업종 키워드:
{business_type}

4. 상품/서비스 키워드:
{products}

5. 매장 특색 및 강점, 우리 매장을 꼭 방문해야 하는 이유:
{features}

━━━━━━━━━━━━━━━━━━
[SEO 핵심 지침 — 반드시 준수]

1. 최종 결과물은 **1900자 이상 1950자 이하 (한글 기준)** 로 작성하세요.
   - 글자 수를 반드시 직접 계산하여 이 범위를 벗어나지 않도록 하세요.

2. 아래 키워드는 **SEO 최적 빈도로 자연스럽게 분산 배치**해야 합니다.

   ▪ 지역 키워드:
     - 총 **7~9회**
     - 도입부, 중반, 결론부에 고르게 분포

   ▪ 랜드마크 키워드:
     - 총 **4~6회**
     - '위치 설명', '찾아오는 방법', '접근성', '주변 환경' 문맥에서 사용
     - 지역 키워드를 단순 반복하지 말고 보조 위치 신호로 활용

   ▪ 업종 키워드:
     - 총 **6~7회**
     - 매장 정체성과 전문성을 설명하는 문장에서 활용

   ▪ 상품/서비스 키워드:
     - 핵심 상품 각 **2~4회**
     - 실제 제공 가치, 경험, 결과 중심으로 서술

3. **유저가 입력한 모든 문장은 의미 훼손 없이 반영**해야 합니다.
   - 일부 표현은 자연스럽게 다듬을 수 있으나, 새로운 사실을 만들어내지 마세요.

━━━━━━━━━━━━━━━━━━
[네이버 플레이스 최적화 구조]

아래 구조가 자연스럽게 드러나도록 작성하세요.  
(소제목은 쓰지 말고 흐름으로만 반영)

1) 지역 + 랜드마크 기반 매장 소개
2) 업종 및 상품/서비스 전문성 설명
3) 매장의 차별화된 강점과 분위기
4) 실제 방문 시 고객이 경험하게 되는 포인트
5) 이런 고객에게 특히 추천되는 이유
6) 재방문과 추천을 유도하는 마무리

━━━━━━━━━━━━━━━━━━
[문체 및 표현 규칙]

- 광고 문구처럼 과장된 표현 ❌
- 실제 매장 운영자가 정성껏 직접 작성한 설명처럼 신뢰감 있게 작성
- "입니다 / 합니다" 체로 통일
- 키워드 나열처럼 보이지 않도록 문맥 속에 자연스럽게 녹일 것

━━━━━━━━━━━━━━━━━━
[출력 제한]

- 제목 ❌
- 소제목 ❌
- 이모지 ❌
- 해시태그 ❌
- 전화번호, 가격, 이벤트 언급 ❌
- 순수 본문 텍스트만 출력"""
        
        else:
            # 기존 방식 (하위 호환성 유지)
            system_prompt = """당신은 네이버 플레이스 SEO 전문가입니다. 
업체소개글을 작성할 때 다음 가이드라인을 따르세요:

1. 핵심 키워드를 자연스럽게 포함 (지역명, 업종, 특징)
2. 고객이 찾는 정보 우선 (메뉴, 가격대, 특색)
3. 간결하고 읽기 쉬운 문장 (200-300자 권장)
4. 차별화 포인트 강조
5. 과장 표현 지양, 사실 기반 작성

업체소개글만 출력하고, 추가 설명은 하지 마세요."""

            user_message = f"""다음 정보를 바탕으로 네이버 플레이스 업체소개글을 작성해주세요:

매장명: {store.get('store_name')}
카테고리: {store.get('category', '정보 없음')}
주소: {store.get('address', '정보 없음')}

사용자 요청사항:
{request.prompt or '매장 특색을 살린 업체소개글을 작성해주세요.'}

업체소개글:"""

        # OpenAI API 직접 호출
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=3000
        )
        
        generated_text = response.choices[0].message.content
        logger.info(f"[업체소개글 생성] 완료: {len(generated_text)}자")
        
        return GenerateTextResponse(
            status="success",
            generated_text=generated_text.strip()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[업체소개글 생성] 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"업체소개글 생성 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/activation/generate-directions", response_model=GenerateTextResponse)
async def generate_directions(
    request: GenerateTextRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    찾아오는길 SEO 최적화 생성
    
    Args:
        request: 생성 요청 (store_id, prompt)
        current_user: 현재 사용자 정보
    """
    try:
        logger.info(f"[찾아오는길 생성] 요청: store_id={request.store_id}")
        
        supabase = get_supabase_client()
        
        # 1. 매장 정보 조회 및 권한 확인
        store_result = supabase.table("stores").select("*").eq("id", request.store_id).execute()
        
        if not store_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다"
            )
        
        store = store_result.data[0]
        
        if store.get("user_id") != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="해당 매장에 접근할 권한이 없습니다"
            )
        
        # 2. LLM으로 찾아오는길 생성
        import os
        from openai import AsyncOpenAI
        
        openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # 새로운 SEO 최적화 방식 (region_keyword, landmark_keywords, directions_description 사용)
        if request.region_keyword and request.directions_description:
            system_prompt = """당신은 네이버 플레이스 '찾아오는 길' 영역을
SEO 관점에서 최적화하는 로컬 마케팅 전문가입니다.

아래 [입력 정보]를 반드시 참고하여,
네이버 플레이스 노출과 실제 방문 편의성을 모두 높이는
'찾아오는 길' 설명문을 작성하세요.

━━━━━━━━━━━━━━━━━━
[입력 정보]

1. 지역 키워드:
{region_keyword}

2. 랜드마크 키워드 (역, 상권, 건물, 관광지 등):
{landmark_keywords}

3. 작성자가 자유롭게 입력한 찾아오는 길 설명:
{directions_description}

━━━━━━━━━━━━━━━━━━
[작성 핵심 지침 — 반드시 준수]

1. 최종 글자 수는 **360자 이상 390자 이하 (한글 기준)** 로 작성하세요.
   - 반드시 글자 수를 계산하여 이 범위를 초과하거나 부족하지 않게 작성하세요.

2. 입력된 모든 정보는 **의미 훼손 없이 반드시 반영**해야 합니다.
   - 작성자가 입력한 설명은 핵심 동선·방향·특징을 유지한 채
     더 이해하기 쉽고 자연스럽게 재구성하세요.
   - 존재하지 않는 길, 건물, 출구, 교통편을 임의로 생성 ❌

━━━━━━━━━━━━━━━━━━
[SEO 키워드 사용 가이드]

아래 키워드는 네이버 지도 및 지역 검색 노출을 고려해
자연스럽고 분산된 빈도로 사용하세요.

▪ 지역 키워드:
  - 총 **2~3회**
  - 문장 도입부 또는 마무리 포함

▪ 랜드마크 키워드:
  - 총 **2~3회**
  - '역에서 오는 방법', '도보 기준', '주변 기준물' 문맥에서 활용
  - 길 안내의 기준점(anchor) 역할로 사용

※ 키워드를 나열하거나 반복 삽입한 느낌 ❌
※ 실제 길 안내 문장처럼 자연스럽게 녹여서 사용

━━━━━━━━━━━━━━━━━━
[구성 및 내용 가이드]

다음 요소가 자연스럽게 포함되도록 작성하세요.

1) 대표적인 접근 기준 (역, 주요 건물, 상권 등)
2) 도보 또는 이동 시 주요 동선 설명
3) 초행자도 헷갈리지 않도록 돕는 기준물
4) 마지막 도착 지점에서의 간단한 안내

※ 지시형 문장보다는
   '~하시면 찾기 쉽습니다', '~쪽으로 오시면 됩니다'와 같은
   친절한 안내 문체를 사용하세요.

━━━━━━━━━━━━━━━━━━
[표현 및 출력 제한]

- 제목 ❌
- 소제목 ❌
- 이모지 ❌
- 화살표(→), 특수기호 ❌
- 거리·시간 과장 ❌
- 순수 텍스트 본문만 출력"""

            user_message = f"""다음 [입력 정보]를 기반으로 네이버 플레이스 찾아오는 길을 작성해주세요.

[입력 정보]
1. 지역 키워드: {request.region_keyword}
2. 랜드마크 키워드: {', '.join(request.landmark_keywords) if request.landmark_keywords else '없음'}
3. 작성자가 자유롭게 입력한 찾아오는 길 설명: {request.directions_description}

찾아오는길:"""
        
        else:
            # 기존 방식 (하위 호환성 유지)
            system_prompt = """당신은 네이버 플레이스 SEO 전문가입니다. 
찾아오는길을 작성할 때 다음 가이드라인을 따르세요:

1. 대중교통 정보 우선 (지하철역, 버스 정류장)
2. 도보 소요 시간 명시
3. 주차 정보 포함
4. 주요 랜드마크 활용
5. 명확하고 구체적인 방향 안내
6. 150-250자 권장

찾아오는길만 출력하고, 추가 설명은 하지 마세요."""

            user_message = f"""다음 정보를 바탕으로 네이버 플레이스 찾아오는길을 작성해주세요:

매장명: {store.get('store_name')}
주소: {store.get('address', '정보 없음')}
도로명 주소: {store.get('road_address', '정보 없음')}

사용자 요청사항:
{request.prompt}

찾아오는길:"""

        # OpenAI API 직접 호출
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=1500
        )
        
        generated_text = response.choices[0].message.content
        logger.info(f"[찾아오는길 생성] 완료: {len(generated_text)}자")
        
        return GenerateTextResponse(
            status="success",
            generated_text=generated_text.strip()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[찾아오는길 생성] 오류: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"찾아오는길 생성 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/activation/history/{store_id}")
async def get_activation_history(
    store_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    플레이스 활성화 과거 이력 조회
    
    Args:
        store_id: 매장 ID (UUID)
        current_user: 현재 사용자 정보
        
    Returns:
        과거 활성화 이력 목록 (최신 10개)
    """
    try:
        user_id = current_user["id"]
        logger.info(f"[활성화 이력] User {user_id} - Store {store_id} 이력 조회 시작")
        
        # 해당 매장의 이력 조회 (최신순)
        result = supabase.table("activation_history")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("store_id", store_id)\
            .order("created_at", desc=True)\
            .limit(10)\
            .execute()
        
        histories = result.data if result.data else []
        logger.info(f"[활성화 이력] {len(histories)}개 이력 조회 완료")
        
        return {
            "status": "success",
            "store_id": store_id,
            "histories": histories,
            "total_count": len(histories)
        }
        
    except Exception as e:
        logger.error(f"[활성화 이력] 조회 실패: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"활성화 이력 조회 중 오류가 발생했습니다: {str(e)}"
        )
