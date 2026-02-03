"""
매장 관리 API 라우터
"""
# #region agent log
import json
import time
def _log(msg, data=None, hyp=None):
    try:
        with open(r"c:\egurado\.cursor\debug.log", "a", encoding="utf-8") as f:
            f.write(json.dumps({"timestamp": int(time.time()*1000), "location": "stores.py", "message": msg, "data": data or {}, "hypothesisId": hyp, "sessionId": "debug-session"}) + "\n")
    except: pass
_log("stores.py module loading started", {}, "H1")
# #endregion

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime
import logging

from app.core.database import get_supabase_client
from app.routers.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

# #region agent log
_log("stores.py router created", {"router_type": str(type(router))}, "H1,H3")
# #endregion


@router.get("/search")
async def search_stores(query: str):
    """
    네이버 모바일 지도에서 매장 검색
    
    Args:
        query: 검색할 매장명
        
    Returns:
        검색 결과 목록
    """
    try:
        logger.info(f"Searching for stores with query: {query}")
        
        # TODO: 네이버 모바일 지도 검색 구현
        # naver_search import 이슈로 임시 비활성화
        search_results = []
        
        logger.info(f"Found {len(search_results)} stores")
        
        return {
            "status": "success",
            "query": query,
            "results": search_results,
            "total_count": len(search_results)
        }
        
    except Exception as e:
        logger.error(f"Error searching stores: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"매장 검색 중 오류가 발생했습니다: {str(e)}"
        )


class StoreCreateRequest(BaseModel):
    """매장 등록 요청 (인증된 사용자의 ID는 JWT에서 추출)"""
    place_id: str
    name: str
    category: Optional[str] = ""
    address: Optional[str] = ""
    road_address: Optional[str] = ""
    thumbnail: Optional[str] = ""
    platform: str = "naver"  # "naver" 또는 "google"


# Tier별 매장 등록 개수 제한 설정
STORE_LIMITS = {
    "free": 1,
    "basic": 3,
    "pro": 10,
    "god": 9999  # God tier: 무제한 (커스터마이징 가능)
}


class StoreResponse(BaseModel):
    """매장 정보 응답"""
    id: UUID
    user_id: UUID
    place_id: str
    name: str
    category: Optional[str]
    address: Optional[str]
    road_address: Optional[str]
    thumbnail: Optional[str]
    platform: str
    status: str
    display_order: Optional[int] = 0
    created_at: datetime
    last_synced_at: Optional[datetime]


class StoreListResponse(BaseModel):
    """매장 목록 응답"""
    status: str
    stores: List[StoreResponse]
    total_count: int


@router.post("/", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
async def create_store(
    request: StoreCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    매장 등록 (인증 필요)
    
    Args:
        request: 매장 등록 정보
        current_user: 인증된 사용자 정보
        
    Returns:
        등록된 매장 정보
        
    Raises:
        HTTPException: 등록 실패 시
    """
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]  # 인증된 사용자의 ID 사용
        
        # 1. 사용자 프로필 조회 (subscription_tier 확인) - 프로필이 없으면 기본값 사용
        user_tier = "free"  # 기본값
        max_stores = STORE_LIMITS.get(user_tier, 1)
        
        try:
            profile_result = supabase.table("profiles").select("subscription_tier").eq(
                "id", str(user_id)
            ).execute()
            
            if profile_result.data and len(profile_result.data) > 0:
                user_tier = profile_result.data[0].get("subscription_tier", "free")
                max_stores = STORE_LIMITS.get(user_tier, 1)
        except Exception as e:
            logger.warning(f"Could not fetch user profile, using default tier: {str(e)}")
        
        # 2. 현재 등록된 매장 개수 확인
        stores_count_result = supabase.table("stores").select("id", count="exact").eq(
            "user_id", str(user_id)
        ).execute()
        
        current_store_count = stores_count_result.count or 0
        
        # 3. 매장 등록 개수 제한 확인
        if current_store_count >= max_stores:
            tier_names = {"free": "무료", "basic": "베이직", "pro": "프로"}
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{tier_names.get(user_tier, user_tier)} 플랜은 최대 {max_stores}개의 매장만 등록할 수 있습니다. (현재: {current_store_count}개)"
            )
        
        # 4. 중복 확인 (같은 user_id와 place_id)
        existing = supabase.table("stores").select("id").eq(
            "user_id", str(user_id)
        ).eq("place_id", request.place_id).execute()
        
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="이미 등록된 매장입니다."
            )
        
        # 매장 등록
        new_store = {
            "id": str(uuid4()),
            "user_id": str(user_id),
            "place_id": request.place_id,
            "store_name": request.name,
            "category": request.category,
            "address": request.address,
            "road_address": request.road_address,
            "thumbnail": request.thumbnail,
            "platform": request.platform,
            "status": "active",
            "created_at": datetime.utcnow().isoformat(),
        }
        
        result = supabase.table("stores").insert(new_store).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="매장 등록에 실패했습니다."
            )
        
        store_data = result.data[0]
        
        logger.info(f"Store created successfully: {store_data['id']} - {store_data['store_name']}")
        
        return StoreResponse(
            id=UUID(store_data["id"]),
            user_id=UUID(store_data["user_id"]),
            place_id=store_data["place_id"],
            name=store_data["store_name"],
            category=store_data.get("category"),
            address=store_data.get("address"),
            road_address=store_data.get("road_address"),
            thumbnail=store_data.get("thumbnail"),
            platform=store_data["platform"],
            status=store_data["status"],
            display_order=store_data.get("display_order", 0),
            created_at=datetime.fromisoformat(store_data["created_at"].replace("Z", "+00:00")),
            last_synced_at=datetime.fromisoformat(store_data["last_synced_at"].replace("Z", "+00:00")) if store_data.get("last_synced_at") else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating store: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"매장 등록 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/", response_model=StoreListResponse)
async def list_stores(current_user: dict = Depends(get_current_user)):
    """
    사용자의 매장 목록 조회 (인증 필요)
    
    Returns:
        매장 목록
    """
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        # 디버깅: user_id 로깅
        logger.info(f"[DEBUG] list_stores called with authenticated user_id: {user_id}")
        
        # RLS 우회 RPC 함수 사용 (멀티 유저 세션 충돌 방지)
        result = supabase.rpc('get_stores_by_user_id_bypass_rls', {'p_user_id': str(user_id)}).execute()
        
        # 디버깅: 조회 결과 로깅
        logger.info(f"[DEBUG] list_stores found {len(result.data) if result.data else 0} stores for user_id: {user_id}")
        
        stores = []
        if result.data:
            for store in result.data:
                stores.append(StoreResponse(
                    id=UUID(store["id"]),
                    user_id=UUID(store["user_id"]),
                    place_id=store["place_id"],
                    name=store["store_name"],
                    category=store.get("category"),
                    address=store.get("address"),
                    road_address=store.get("road_address"),
                    thumbnail=store.get("thumbnail"),
                    platform=store["platform"],
                    status=store["status"],
                    display_order=store.get("display_order", 0),
                    created_at=datetime.fromisoformat(store["created_at"].replace("Z", "+00:00")),
                    last_synced_at=datetime.fromisoformat(store["last_synced_at"].replace("Z", "+00:00")) if store.get("last_synced_at") else None
                ))
        
        return StoreListResponse(
            status="success",
            stores=stores,
            total_count=len(stores)
        )
        
    except Exception as e:
        logger.error(f"Error listing stores: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"매장 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/{store_id}", response_model=StoreResponse)
async def get_store(store_id: UUID):
    """
    매장 상세 정보 조회
    
    Args:
        store_id: 매장 ID
        
    Returns:
        매장 상세 정보
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("stores").select("*").eq(
            "id", str(store_id)
        ).single().execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다."
            )
        
        store = result.data
        
        return StoreResponse(
            id=UUID(store["id"]),
            user_id=UUID(store["user_id"]),
            place_id=store["place_id"],
            name=store["store_name"],
            category=store.get("category"),
            address=store.get("address"),
            road_address=store.get("road_address"),
            thumbnail=store.get("thumbnail"),
            platform=store["platform"],
            status=store["status"],
            display_order=store.get("display_order", 0),
            created_at=datetime.fromisoformat(store["created_at"].replace("Z", "+00:00")),
            last_synced_at=datetime.fromisoformat(store["last_synced_at"].replace("Z", "+00:00")) if store.get("last_synced_at") else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting store: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"매장 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.delete("/{store_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_store(store_id: UUID, current_user: dict = Depends(get_current_user)):
    """
    매장 삭제 (인증 필요)
    
    Args:
        store_id: 매장 ID
    """
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        # 권한 확인
        store = supabase.table("stores").select("user_id").eq(
            "id", str(store_id)
        ).single().execute()
        
        if not store.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다."
            )
        
        if store.data["user_id"] != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="매장을 삭제할 권한이 없습니다."
            )
        
        # 매장 삭제
        supabase.table("stores").delete().eq("id", str(store_id)).execute()
        
        logger.info(f"Store deleted: {store_id}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting store: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"매장 삭제 중 오류가 발생했습니다: {str(e)}"
        )


class StoreOrderUpdate(BaseModel):
    """매장 순서 업데이트 요청"""
    store_id: str
    display_order: int


class StoreOrderBatchRequest(BaseModel):
    """매장 순서 일괄 업데이트 요청"""
    orders: List[StoreOrderUpdate]


@router.patch("/reorder", status_code=status.HTTP_200_OK)
async def update_store_order(
    request: StoreOrderBatchRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    매장 표시 순서 일괄 업데이트 (인증 필요)
    
    Args:
        request: 매장 ID와 순서 목록
        current_user: 인증된 사용자 정보
        
    Returns:
        업데이트된 매장 개수
    """
    try:
        supabase = get_supabase_client()
        user_id = current_user["id"]
        
        # 각 매장의 순서 업데이트
        updated_count = 0
        for order_item in request.orders:
            # 권한 확인 (해당 매장이 현재 사용자의 것인지)
            store = supabase.table("stores").select("user_id").eq(
                "id", order_item.store_id
            ).single().execute()
            
            if store.data and store.data["user_id"] == str(user_id):
                # 순서 업데이트
                supabase.table("stores").update({
                    "display_order": order_item.display_order
                }).eq("id", order_item.store_id).execute()
                
                updated_count += 1
        
        logger.info(f"Store order updated for user {user_id}: {updated_count} stores")
        
        return {
            "status": "success",
            "updated_count": updated_count,
            "message": f"{updated_count}개 매장의 순서가 업데이트되었습니다."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating store order: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"매장 순서 업데이트 중 오류가 발생했습니다: {str(e)}"
        )

# #region agent log
_log("stores.py module loaded completely", {"total_routes": len(router.routes), "routes": [{"path": r.path, "methods": list(r.methods)} for r in router.routes if hasattr(r, 'path')]}, "H1,H3")
# #endregion
