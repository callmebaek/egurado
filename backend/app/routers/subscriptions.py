"""
Subscriptions API Router
구독 관리 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Depends, status
from uuid import UUID

from app.models.credits import (
    Subscription,
    SubscriptionCreateRequest,
    SubscriptionUpdateRequest,
    TierUpgradeRequest
)
from app.services.subscription_service import subscription_service
from app.services.credit_service import credit_service
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/subscriptions", tags=["subscriptions"])


@router.get("/me", response_model=Subscription)
async def get_my_subscription(
    current_user: dict = Depends(get_current_user)
):
    """
    현재 사용자의 구독 조회
    """
    user_id = UUID(current_user["user_id"])
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
    """
    구독 생성
    """
    user_id = UUID(current_user["user_id"])
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
    """
    구독 업데이트
    """
    user_id = UUID(current_user["user_id"])
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
    """
    Tier 업그레이드
    """
    user_id = UUID(current_user["user_id"])
    
    try:
        # Tier 업그레이드 (DB 함수 호출)
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


@router.delete("/")
async def cancel_subscription(
    immediate: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """
    구독 취소
    
    Args:
        immediate: 즉시 취소 (True) / 기간 만료 후 취소 (False)
    """
    user_id = UUID(current_user["user_id"])
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
