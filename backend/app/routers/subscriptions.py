"""
Subscriptions API Router
구독 관리 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Depends, status
from uuid import UUID
from typing import Optional

from app.models.credits import (
    Subscription,
    SubscriptionCreateRequest,
    SubscriptionUpdateRequest,
    TierUpgradeRequest,
    SubscriptionCancelRequest,
)
from app.services.subscription_service import subscription_service
from app.services.credit_service import credit_service
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/subscriptions", tags=["subscriptions"])


@router.get("/me", response_model=Subscription)
async def get_my_subscription(
    current_user: dict = Depends(get_current_user)
):
    """현재 사용자의 구독 조회"""
    user_id = UUID(current_user["id"])
    subscription = await subscription_service.get_user_subscription(user_id)
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    return subscription


@router.post("/", response_model=Subscription)
async def create_subscription(
    request: SubscriptionCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """구독 생성"""
    user_id = UUID(current_user["id"])
    subscription = await subscription_service.create_subscription(user_id, request)
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subscription"
        )
    
    return subscription


@router.patch("/", response_model=Subscription)
async def update_subscription(
    request: SubscriptionUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """구독 업데이트"""
    user_id = UUID(current_user["id"])
    subscription = await subscription_service.update_subscription(user_id, request)
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    return subscription


@router.post("/upgrade")
async def upgrade_tier(
    request: TierUpgradeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Tier 업그레이드"""
    user_id = UUID(current_user["id"])
    
    try:
        from app.core.database import get_supabase_client
        supabase = get_supabase_client()
        
        response = supabase.rpc(
            "update_user_tier",
            {
                "p_user_id": str(user_id),
                "p_new_tier": request.new_tier,
                "p_payment_id": str(request.payment_id) if request.payment_id else None
            }
        ).execute()
        
        result = response.data
        
        return {
            "success": True,
            "message": f"Tier upgraded from {result['old_tier']} to {result['new_tier']}",
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upgrade tier: {str(e)}"
        )


@router.post("/cancel")
async def cancel_subscription(
    request: SubscriptionCancelRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    구독 취소 (기간 만료 후 종료)
    - 유지할 매장/키워드 선택 필수
    - 서비스 종료일까지 이용 가능
    - 종료 후 Free tier로 전환
    """
    user_id = current_user["id"]
    
    from app.services.billing_service import billing_service
    result = await billing_service.process_subscription_cancellation(
        user_id=user_id,
        keep_store_ids=request.keep_store_ids,
        keep_keyword_ids=request.keep_keyword_ids,
        reason=request.reason
    )
    
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "구독 취소에 실패했습니다.")
        )
    
    return result


@router.delete("/")
async def cancel_subscription_legacy(
    immediate: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """
    구독 취소 (레거시 API)
    """
    user_id = UUID(current_user["id"])
    success = await subscription_service.cancel_subscription(user_id, immediate)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )
    
    return {
        "success": True,
        "message": "Subscription cancelled successfully",
        "immediate": immediate
    }


@router.get("/cancel-info")
async def get_cancel_info(
    current_user: dict = Depends(get_current_user)
):
    """
    구독 취소 시 필요한 정보 조회
    - 현재 등록된 매장 목록
    - 현재 등록된 키워드 목록
    - Free tier 제한 정보
    """
    user_id = current_user["id"]
    
    try:
        from app.core.database import get_supabase_client
        supabase = get_supabase_client()
        
        # 현재 매장 목록
        stores = supabase.table("stores")\
            .select("id, store_name, platform, place_id, status")\
            .eq("user_id", user_id)\
            .eq("status", "active")\
            .execute()
        
        # 현재 키워드 목록 (keywords 테이블에는 user_id가 없으므로 stores 조인)
        store_ids = [s["id"] for s in (stores.data or [])]
        keywords_data = []
        if store_ids:
            keywords = supabase.table("keywords")\
                .select("id, keyword, store_id, current_rank, stores(store_name)")\
                .in_("store_id", store_ids)\
                .execute()
            keywords_data = keywords.data or []
        
        # metric_trackers도 조회 (추적 키워드)
        trackers = supabase.table("metric_trackers")\
            .select("id, keyword, store_id, stores(store_name)")\
            .eq("user_id", user_id)\
            .execute()
        
        # 현재 구독 정보
        subscription = await subscription_service.get_user_subscription(UUID(user_id))
        
        return {
            "stores": stores.data or [],
            "keywords": keywords_data,
            "trackers": trackers.data or [],
            "current_tier": subscription.tier if subscription else "free",
            "free_tier_limits": {
                "max_stores": 1,
                "max_keywords": 1,
                "max_auto_collection": 0,
                "monthly_credits": 100
            },
            "service_end_date": subscription.expires_at.isoformat() if subscription and subscription.expires_at else None,
            "warning": "Free 티어로 전환 시 선택하지 않은 매장과 키워드의 데이터가 영구적으로 삭제됩니다."
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"취소 정보 조회 실패: {str(e)}"
        )
