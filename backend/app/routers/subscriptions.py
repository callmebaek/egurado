"""
Subscriptions API Router
구독 관리 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Depends, status
from uuid import UUID
from typing import Optional
from datetime import datetime

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
from app.core.database import get_supabase_client
import logging

logger = logging.getLogger(__name__)

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


@router.post("/reactivate")
async def reactivate_subscription(
    current_user: dict = Depends(get_current_user)
):
    """
    구독 재활성화 (취소 철회)
    - cancelled 상태의 구독을 active로 되돌림
    - 추가 결제 없이 기존 구독 유지
    - expires_at, next_billing_date 등 기존 값 유지
    """
    user_id = current_user["id"]
    
    try:
        supabase = get_supabase_client()
        
        # cancelled 상태의 구독 조회
        sub_result = supabase.table("subscriptions")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("status", "cancelled")\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
        
        if not sub_result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="취소된 구독이 없습니다."
            )
        
        sub = sub_result.data[0]
        
        # 만료일 확인 - 이미 만료된 경우 재활성화 불가
        expires_at = sub.get("expires_at")
        if expires_at:
            from dateutil.parser import parse as parse_date
            expiry = parse_date(expires_at).replace(tzinfo=None)
            if datetime.utcnow() > expiry:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="구독 기간이 이미 만료되었습니다. 새로 구독해주세요."
                )
        
        # 구독 재활성화: cancelled → active
        now = datetime.utcnow()
        supabase.table("subscriptions")\
            .update({
                "status": "active",
                "cancelled_at": None,
                "auto_renewal": True,
                "updated_at": now.isoformat(),
                "metadata": {
                    **sub.get("metadata", {}),
                    "reactivated_at": now.isoformat(),
                    "cancel_reason": None,
                }
            })\
            .eq("id", sub["id"])\
            .execute()
        
        tier = sub.get("tier", "free")
        logger.info(f"[Subscription] 구독 재활성화: user={user_id}, tier={tier}")
        
        return {
            "success": True,
            "message": f"구독이 재활성화되었습니다. {tier.upper()} 플랜이 계속 유지됩니다.",
            "tier": tier,
            "next_billing_date": sub.get("next_billing_date"),
            "expires_at": sub.get("expires_at"),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"구독 재활성화 실패: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"구독 재활성화에 실패했습니다: {str(e)}"
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
        
        # metric_trackers도 조회 (추적 키워드 - keyword_id로 keywords 조인)
        trackers = supabase.table("metric_trackers")\
            .select("id, keyword_id, store_id, stores(store_name), keywords(keyword)")\
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
        import traceback
        logger.error(f"cancel-info 에러: {e}")
        logger.error(f"cancel-info traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"취소 정보 조회 실패: {str(e)}"
        )
