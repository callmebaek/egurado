"""
Subscription Service
구독 관리 서비스
"""
from uuid import UUID
from typing import Optional, List
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import logging

from app.core.database import get_supabase_client
from app.models.credits import Subscription, SubscriptionCreateRequest, SubscriptionUpdateRequest

logger = logging.getLogger(__name__)


class SubscriptionService:
    """구독 관리 서비스"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    async def get_user_subscription(self, user_id: UUID) -> Optional[Subscription]:
        """
        사용자의 현재 구독 조회 (Tier별 할당량 정보 포함)
        
        Args:
            user_id: 사용자 ID
            
        Returns:
            Subscription: 구독 정보 (월 크레딧, 최대 매장/키워드/자동수집 수 포함)
        """
        try:
            # 1. 구독 정보 조회
            response = self.supabase.table("subscriptions")\
                .select("*")\
                .eq("user_id", str(user_id))\
                .eq("status", "active")\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            if not response.data:
                # 구독이 없으면 profiles에서 tier를 가져와서 기본 정보 반환
                profile_response = self.supabase.table("profiles")\
                    .select("subscription_tier")\
                    .eq("id", str(user_id))\
                    .single()\
                    .execute()
                
                if profile_response.data:
                    tier = profile_response.data.get("subscription_tier", "free")
                    
                    # Tier별 할당량 조회
                    quota_response = self.supabase.rpc("get_tier_quotas", {"p_tier": tier}).execute()
                    quotas = quota_response.data if quota_response.data else {}
                    
                    # 기본 구독 정보 생성 (활성 구독 없는 경우)
                    now = datetime.utcnow()
                    return Subscription(
                        id=UUID("00000000-0000-0000-0000-000000000000"),
                        user_id=user_id,
                        tier=tier,
                        status="active",
                        started_at=now,
                        created_at=now,
                        updated_at=now,
                        monthly_credits=quotas.get("monthly_credits", 100),
                        max_stores=quotas.get("max_stores", 1),
                        max_keywords=quotas.get("max_keywords", 1),
                        max_auto_collection=quotas.get("max_auto_collection", 0)
                    )
                
                return None
            
            subscription_data = response.data[0]
            tier = subscription_data.get("tier", "free")
            
            # 2. Tier별 할당량 조회 (get_tier_quotas 함수 호출)
            quota_response = self.supabase.rpc("get_tier_quotas", {"p_tier": tier}).execute()
            quotas = quota_response.data if quota_response.data else {}
            
            # 3. 구독 정보에 할당량 추가
            subscription_data["monthly_credits"] = quotas.get("monthly_credits", 100)
            subscription_data["max_stores"] = quotas.get("max_stores", 1)
            subscription_data["max_keywords"] = quotas.get("max_keywords", 1)
            subscription_data["max_auto_collection"] = quotas.get("max_auto_collection", 0)
            
            return Subscription(**subscription_data)
            
        except Exception as e:
            logger.error(f"Failed to get subscription: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None
    
    async def create_subscription(
        self,
        user_id: UUID,
        request: SubscriptionCreateRequest,
        payment_id: Optional[UUID] = None
    ) -> Optional[Subscription]:
        """
        구독 생성
        
        Args:
            user_id: 사용자 ID
            request: 구독 생성 요청
            payment_id: 결제 ID
            
        Returns:
            Subscription: 생성된 구독
        """
        try:
            # 기존 활성 구독이 있으면 취소
            existing = await self.get_user_subscription(user_id)
            if existing:
                await self.cancel_subscription(user_id)
            
            # 구독 기간 계산 (1개월)
            started_at = datetime.utcnow()
            expires_at = started_at + relativedelta(months=1)
            
            # 다음 결제일 계산 (1개월 후)
            next_billing_date = (started_at + relativedelta(months=1)).date()
            
            subscription_data = {
                "user_id": str(user_id),
                "tier": request.tier,
                "status": "active",
                "started_at": started_at.isoformat(),
                "expires_at": expires_at.isoformat(),
                "payment_method": request.payment_method,
                "auto_renewal": request.auto_renewal,
                "next_billing_date": next_billing_date.isoformat(),
                "metadata": {"payment_id": str(payment_id)} if payment_id else {}
            }
            
            response = self.supabase.table("subscriptions")\
                .insert(subscription_data)\
                .execute()
            
            if not response.data:
                return None
            
            logger.info(f"Subscription created: user={user_id}, tier={request.tier}")
            return Subscription(**response.data[0])
            
        except Exception as e:
            logger.error(f"Failed to create subscription: {e}")
            return None
    
    async def update_subscription(
        self,
        user_id: UUID,
        request: SubscriptionUpdateRequest
    ) -> Optional[Subscription]:
        """
        구독 업데이트
        
        Args:
            user_id: 사용자 ID
            request: 구독 업데이트 요청
            
        Returns:
            Subscription: 업데이트된 구독
        """
        try:
            update_data = {}
            if request.tier:
                update_data["tier"] = request.tier
            if request.auto_renewal is not None:
                update_data["auto_renewal"] = request.auto_renewal
            if request.status:
                update_data["status"] = request.status
            
            if not update_data:
                return await self.get_user_subscription(user_id)
            
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            response = self.supabase.table("subscriptions")\
                .update(update_data)\
                .eq("user_id", str(user_id))\
                .eq("status", "active")\
                .execute()
            
            if not response.data:
                return None
            
            logger.info(f"Subscription updated: user={user_id}, updates={update_data}")
            return Subscription(**response.data[0])
            
        except Exception as e:
            logger.error(f"Failed to update subscription: {e}")
            return None
    
    async def cancel_subscription(
        self,
        user_id: UUID,
        immediate: bool = False
    ) -> bool:
        """
        구독 취소
        
        Args:
            user_id: 사용자 ID
            immediate: 즉시 취소 (True) / 기간 만료 후 취소 (False)
            
        Returns:
            bool: 성공 여부
        """
        try:
            update_data = {
                "status": "cancelled",
                "cancelled_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            if immediate:
                # 즉시 취소: 만료일을 현재 시각으로 설정
                update_data["expires_at"] = datetime.utcnow().isoformat()
            
            response = self.supabase.table("subscriptions")\
                .update(update_data)\
                .eq("user_id", str(user_id))\
                .eq("status", "active")\
                .execute()
            
            logger.info(f"Subscription cancelled: user={user_id}, immediate={immediate}")
            return bool(response.data)
            
        except Exception as e:
            logger.error(f"Failed to cancel subscription: {e}")
            return False
    
    async def check_and_expire_subscriptions(self) -> int:
        """
        만료된 구독 확인 및 상태 업데이트 (스케줄러용)
        
        Returns:
            int: 만료 처리된 구독 수
        """
        try:
            now = datetime.utcnow()
            
            response = self.supabase.table("subscriptions")\
                .update({"status": "expired", "updated_at": now.isoformat()})\
                .eq("status", "active")\
                .lt("expires_at", now.isoformat())\
                .execute()
            
            count = len(response.data) if response.data else 0
            logger.info(f"Expired {count} subscriptions")
            
            return count
            
        except Exception as e:
            logger.error(f"Failed to expire subscriptions: {e}")
            return 0


# 싱글톤 인스턴스
subscription_service = SubscriptionService()
