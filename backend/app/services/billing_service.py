"""
Billing Service
정기결제 및 크레딧 리셋 스케줄러 서비스
"""
from datetime import datetime, timedelta, date
from typing import List, Optional
import logging

from app.core.database import get_supabase_client
from app.core.config import (
    get_tier_credits, get_tier_price, get_tier_order,
    TIER_PRICES
)

logger = logging.getLogger(__name__)


class BillingService:
    """정기결제 및 크레딧 리셋 서비스"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    async def process_due_subscriptions(self) -> dict:
        """
        결제일이 도래한 구독들을 처리 (매일 실행)
        
        1. next_billing_date <= 오늘인 active 구독 조회
        2. 각 구독에 대해:
           - 빌링키 확인
           - 쿠폰 할인 적용 (영구 쿠폰인 경우)
           - 자동결제 실행
           - 성공 시: 다음 결제일 갱신, 크레딧 리셋
           - 실패 시: 재시도 마킹
        
        Returns:
            dict: {processed, success, failed, skipped}
        """
        stats = {"processed": 0, "success": 0, "failed": 0, "skipped": 0}
        
        try:
            today = date.today()
            
            # 오늘이 결제일인 활성 구독 조회
            result = self.supabase.table("subscriptions")\
                .select("*, profiles!subscriptions_user_id_fkey(email, display_name)")\
                .eq("status", "active")\
                .eq("auto_renewal", True)\
                .lte("next_billing_date", today.isoformat())\
                .execute()
            
            if not result.data:
                logger.info(f"[Billing] 오늘({today}) 결제 대상 없음")
                return stats
            
            subscriptions = result.data
            logger.info(f"[Billing] {len(subscriptions)}건 결제 처리 시작")
            
            for sub in subscriptions:
                stats["processed"] += 1
                user_id = sub["user_id"]
                tier = sub["tier"]
                
                try:
                    # Free tier는 크레딧만 리셋
                    if tier == "free":
                        await self._reset_free_credits(user_id, sub)
                        stats["success"] += 1
                        continue
                    
                    # 빌링키 확인
                    billing_key = self.supabase.table("billing_keys")\
                        .select("billing_key, customer_key")\
                        .eq("user_id", user_id)\
                        .eq("is_active", True)\
                        .order("created_at", desc=True)\
                        .limit(1)\
                        .execute()
                    
                    if not billing_key.data:
                        logger.warning(f"[Billing] 빌링키 없음: user={user_id}")
                        stats["skipped"] += 1
                        continue
                    
                    bk = billing_key.data[0]
                    
                    # 결제 금액 계산 (쿠폰 할인 적용)
                    amount = get_tier_price(tier)
                    coupon_discount = await self._get_active_coupon_discount(user_id, amount)
                    final_amount = max(0, amount - coupon_discount)
                    
                    if final_amount <= 0:
                        # 100% 할인: 결제 없이 갱신
                        await self._renew_subscription(user_id, sub, tier)
                        stats["success"] += 1
                        continue
                    
                    # 자동결제 실행
                    from app.services.payment_service import payment_service
                    
                    tier_names = {
                        "basic": "Basic", "basic_plus": "Basic+",
                        "pro": "Pro", "custom": "Custom"
                    }
                    order_name = f"Whiplace {tier_names.get(tier, tier)} 월 구독 (자동결제)"
                    
                    charge_result = await payment_service.charge_billing(
                        user_id=user_id,
                        billing_key=bk["billing_key"],
                        customer_key=bk["customer_key"],
                        amount=final_amount,
                        order_name=order_name,
                        tier=tier,
                        subscription_id=sub["id"]
                    )
                    
                    if charge_result.get("success"):
                        # 구독 갱신
                        await self._renew_subscription(user_id, sub, tier)
                        stats["success"] += 1
                        logger.info(f"[Billing] 자동결제 성공: user={user_id}, amount={final_amount}")
                    else:
                        stats["failed"] += 1
                        logger.error(f"[Billing] 자동결제 실패: user={user_id}, reason={charge_result.get('message')}")
                        
                        # 실패 메타데이터 업데이트
                        self.supabase.table("subscriptions")\
                            .update({
                                "metadata": {
                                    **sub.get("metadata", {}),
                                    "last_billing_failed_at": datetime.utcnow().isoformat(),
                                    "billing_fail_reason": charge_result.get("message", "Unknown"),
                                    "billing_retry_count": sub.get("metadata", {}).get("billing_retry_count", 0) + 1,
                                },
                                "updated_at": datetime.utcnow().isoformat()
                            })\
                            .eq("id", sub["id"])\
                            .execute()
                    
                except Exception as e:
                    stats["failed"] += 1
                    logger.error(f"[Billing] 개별 결제 오류: user={user_id}, error={e}")
            
            logger.info(
                f"[Billing] 처리 완료: "
                f"총 {stats['processed']}건, 성공 {stats['success']}건, "
                f"실패 {stats['failed']}건, 스킵 {stats['skipped']}건"
            )
            
            return stats
            
        except Exception as e:
            logger.error(f"[Billing] 정기결제 처리 오류: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return stats
    
    async def _renew_subscription(self, user_id: str, sub: dict, tier: str):
        """구독 갱신 (다음 결제일, 만료일, 크레딧 리셋)"""
        now = datetime.utcnow()
        next_billing = (now + timedelta(days=30)).date()
        new_expires = now + timedelta(days=30)
        
        # 구독 업데이트
        self.supabase.table("subscriptions")\
            .update({
                "next_billing_date": next_billing.isoformat(),
                "expires_at": new_expires.isoformat(),
                "updated_at": now.isoformat(),
                "metadata": {
                    **sub.get("metadata", {}),
                    "last_renewed_at": now.isoformat(),
                    "billing_retry_count": 0,
                }
            })\
            .eq("id", sub["id"])\
            .execute()
        
        # 크레딧 리셋
        monthly_credits = get_tier_credits(tier)
        self.supabase.table("user_credits")\
            .update({
                "tier": tier,
                "monthly_credits": monthly_credits,
                "monthly_used": 0,
                "last_reset_at": now.isoformat(),
                "next_reset_at": new_expires.isoformat(),
                "updated_at": now.isoformat()
            })\
            .eq("user_id", user_id)\
            .execute()
        
        logger.info(f"[Billing] 구독 갱신 완료: user={user_id}, tier={tier}, next_billing={next_billing}")
    
    async def _reset_free_credits(self, user_id: str, sub: dict):
        """Free 티어 크레딧 리셋"""
        now = datetime.utcnow()
        next_reset = now + timedelta(days=30)
        
        self.supabase.table("user_credits")\
            .update({
                "monthly_credits": 100,
                "monthly_used": 0,
                "last_reset_at": now.isoformat(),
                "next_reset_at": next_reset.isoformat(),
                "updated_at": now.isoformat()
            })\
            .eq("user_id", user_id)\
            .execute()
        
        # 다음 결제일 갱신
        next_billing = (now + timedelta(days=30)).date()
        self.supabase.table("subscriptions")\
            .update({
                "next_billing_date": next_billing.isoformat(),
                "expires_at": next_reset.isoformat(),
                "updated_at": now.isoformat()
            })\
            .eq("id", sub["id"])\
            .execute()
        
        logger.info(f"[Billing] Free 크레딧 리셋: user={user_id}")
    
    async def _get_active_coupon_discount(self, user_id: str, amount: int) -> int:
        """사용자의 활성 쿠폰 할인 금액 계산"""
        try:
            result = self.supabase.table("user_coupons")\
                .select("*, coupons(*)")\
                .eq("user_id", user_id)\
                .eq("is_active", True)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            if not result.data:
                return 0
            
            user_coupon = result.data[0]
            
            # 만료 확인
            if user_coupon.get("expires_at"):
                expires_at = datetime.fromisoformat(
                    user_coupon["expires_at"].replace("Z", "+00:00")
                ).replace(tzinfo=None)
                if datetime.utcnow() > expires_at:
                    self.supabase.table("user_coupons")\
                        .update({"is_active": False})\
                        .eq("id", user_coupon["id"])\
                        .execute()
                    return 0
            
            discount_type = user_coupon["discount_type"]
            discount_value = user_coupon["discount_value"]
            
            if discount_type == "percentage":
                return int(amount * discount_value / 100)
            else:
                return min(discount_value, amount)
            
        except Exception as e:
            logger.error(f"쿠폰 할인 계산 실패: {e}")
            return 0
    
    async def check_and_expire_subscriptions(self) -> int:
        """
        만료된 구독 처리 (취소된 구독의 서비스 종료일 도래)
        
        - cancelled 상태이면서 expires_at이 지난 구독 → expired로 변경
        - 프로필을 free tier로 변경
        - 크레딧 초기화
        """
        try:
            now = datetime.utcnow()
            
            # 취소 후 만료 대상 조회
            result = self.supabase.table("subscriptions")\
                .select("*")\
                .eq("status", "cancelled")\
                .lt("expires_at", now.isoformat())\
                .execute()
            
            if not result.data:
                return 0
            
            count = 0
            for sub in result.data:
                user_id = sub["user_id"]
                
                # 구독 상태 변경
                self.supabase.table("subscriptions")\
                    .update({
                        "status": "expired",
                        "updated_at": now.isoformat()
                    })\
                    .eq("id", sub["id"])\
                    .execute()
                
                # Free tier로 다운그레이드
                self.supabase.table("profiles")\
                    .update({"subscription_tier": "free"})\
                    .eq("id", user_id)\
                    .execute()
                
                # 크레딧 Free tier로 초기화
                self.supabase.table("user_credits")\
                    .update({
                        "tier": "free",
                        "monthly_credits": 100,
                        "monthly_used": 0,
                        "last_reset_at": now.isoformat(),
                        "next_reset_at": (now + timedelta(days=30)).isoformat(),
                        "updated_at": now.isoformat()
                    })\
                    .eq("user_id", user_id)\
                    .execute()
                
                # 매장/키워드 데이터 정리 (유지 항목 외 삭제)
                metadata = sub.get("metadata", {})
                keep_store_ids = metadata.get("keep_store_ids", [])
                keep_keyword_ids = metadata.get("keep_keyword_ids", [])
                await self.cleanup_on_expiry(user_id, keep_store_ids, keep_keyword_ids)
                
                count += 1
                logger.info(f"[Billing] 구독 만료 처리: user={user_id}, tier={sub['tier']} → free")
            
            if count > 0:
                logger.info(f"[Billing] {count}건 구독 만료 처리 완료")
            
            return count
            
        except Exception as e:
            logger.error(f"구독 만료 처리 오류: {e}")
            return 0
    
    async def process_subscription_cancellation(
        self,
        user_id: str,
        keep_store_ids: list,
        keep_keyword_ids: list,
        reason: Optional[str] = None
    ) -> dict:
        """
        구독 취소 처리 (즉시 취소가 아닌, 기간 만료 후 취소)
        
        1. 구독 상태를 cancelled로 변경
        2. 유지할 매장/키워드 메타데이터 저장
        3. 만료일에 실제 데이터 삭제 (check_and_expire에서 처리)
        """
        try:
            now = datetime.utcnow()
            
            # 활성 구독 조회
            sub_result = self.supabase.table("subscriptions")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("status", "active")\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            if not sub_result.data:
                return {"success": False, "message": "활성 구독이 없습니다."}
            
            sub = sub_result.data[0]
            
            # 구독 취소 (기간 만료 후 종료)
            self.supabase.table("subscriptions")\
                .update({
                    "status": "cancelled",
                    "cancelled_at": now.isoformat(),
                    "auto_renewal": False,
                    "updated_at": now.isoformat(),
                    "metadata": {
                        **sub.get("metadata", {}),
                        "cancel_reason": reason,
                        "keep_store_ids": keep_store_ids,
                        "keep_keyword_ids": keep_keyword_ids,
                        "cancelled_by_user": True,
                    }
                })\
                .eq("id", sub["id"])\
                .execute()
            
            # 서비스 종료일 = expires_at
            service_end_date = sub.get("expires_at", now.isoformat())
            
            logger.info(
                f"[Billing] 구독 취소: user={user_id}, "
                f"서비스 종료일={service_end_date}, "
                f"유지 매장={len(keep_store_ids)}개, 유지 키워드={len(keep_keyword_ids)}개"
            )
            
            return {
                "success": True,
                "message": "구독이 취소되었습니다. 서비스 종료일까지 이용 가능합니다.",
                "service_end_date": service_end_date,
                "tier_after_expiry": "free",
            }
            
        except Exception as e:
            logger.error(f"구독 취소 처리 오류: {e}")
            return {"success": False, "message": f"구독 취소 중 오류가 발생했습니다: {str(e)}"}
    
    async def cleanup_on_expiry(self, user_id: str, keep_store_ids: list, keep_keyword_ids: list):
        """
        구독 만료 시 데이터 정리
        Free tier 제한에 맞게 매장/키워드 삭제
        """
        try:
            # 유지하지 않는 매장 비활성화
            if keep_store_ids:
                # 유지할 매장 외 모두 비활성화
                all_stores = self.supabase.table("stores")\
                    .select("id")\
                    .eq("user_id", user_id)\
                    .eq("status", "active")\
                    .execute()
                
                for store in (all_stores.data or []):
                    if store["id"] not in keep_store_ids:
                        self.supabase.table("stores")\
                            .update({"status": "inactive"})\
                            .eq("id", store["id"])\
                            .execute()
            
            # 유지하지 않는 키워드 삭제
            if keep_keyword_ids:
                all_keywords = self.supabase.table("keywords")\
                    .select("id")\
                    .eq("user_id", user_id)\
                    .execute()
                
                for kw in (all_keywords.data or []):
                    if kw["id"] not in keep_keyword_ids:
                        self.supabase.table("keywords")\
                            .delete()\
                            .eq("id", kw["id"])\
                            .execute()
            
            logger.info(f"[Billing] 만료 데이터 정리 완료: user={user_id}")
            
        except Exception as e:
            logger.error(f"만료 데이터 정리 실패: {e}")


# 싱글톤 인스턴스
billing_service = BillingService()
