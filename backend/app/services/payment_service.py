"""
Payment Service
결제 처리 서비스 (Toss Payments 빌링키 기반 정기결제)
"""
from uuid import UUID, uuid4
from typing import Optional, List
from datetime import datetime, timedelta
import logging
import base64
import httpx

from app.core.database import get_supabase_client
from app.core.config import (
    settings, 
    TIER_PRICES, TIER_ORDER,
    get_tier_price, get_tier_order
)
from app.models.credits import (
    Payment,
    PaymentCreateRequest,
    TossPaymentRequest,
    TossPaymentCallbackRequest,
    BillingKey,
    BillingKeyIssueRequest,
    BillingKeyResponse,
    CheckoutRequest,
    CheckoutResponse,
    PaymentConfirmRequest,
)

logger = logging.getLogger(__name__)


class PaymentService:
    """결제 처리 서비스 (Toss Payments 연동)"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.toss_api_url = settings.TOSS_API_URL or "https://api.tosspayments.com"
    
    def _get_toss_auth_header(self) -> dict:
        """Toss Payments API 인증 헤더 생성"""
        secret_key = settings.TOSS_SECRET_KEY
        auth_string = f"{secret_key}:"
        auth_base64 = base64.b64encode(auth_string.encode('utf-8')).decode('utf-8')
        return {
            "Authorization": f"Basic {auth_base64}",
            "Content-Type": "application/json"
        }
    
    def _generate_customer_key(self, user_id: UUID) -> str:
        """사용자 고유 customerKey 생성 (토스 빌링용)"""
        return f"cust_{str(user_id).replace('-', '')[:20]}"
    
    # ============================================
    # 빌링키 관련
    # ============================================
    
    async def issue_billing_key(
        self,
        user_id: UUID,
        request: BillingKeyIssueRequest
    ) -> BillingKeyResponse:
        """
        빌링키 발급 (결제위젯에서 authKey 받은 후)
        POST /v1/billing/authorizations/issue
        """
        try:
            headers = self._get_toss_auth_header()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.toss_api_url}/v1/billing/authorizations/issue",
                    json={
                        "authKey": request.auth_key,
                        "customerKey": request.customer_key
                    },
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    error_data = response.json()
                    logger.error(f"빌링키 발급 실패: {error_data}")
                    return BillingKeyResponse(
                        success=False,
                        message=error_data.get("message", "빌링키 발급에 실패했습니다.")
                    )
                
                toss_data = response.json()
            
            # 기존 활성 빌링키 비활성화
            self.supabase.table("billing_keys")\
                .update({"is_active": False, "updated_at": datetime.utcnow().isoformat()})\
                .eq("user_id", str(user_id))\
                .eq("is_active", True)\
                .execute()
            
            # 새 빌링키 저장
            card_info = toss_data.get("card", {})
            billing_data = {
                "user_id": str(user_id),
                "billing_key": toss_data["billingKey"],
                "customer_key": request.customer_key,
                "method": toss_data.get("method", "카드"),
                "card_company": card_info.get("issuerCode", ""),
                "card_number": card_info.get("number", ""),
                "card_type": card_info.get("cardType", ""),
                "is_active": True,
                "authenticated_at": toss_data.get("authenticatedAt"),
                "metadata": toss_data
            }
            
            result = self.supabase.table("billing_keys")\
                .insert(billing_data)\
                .execute()
            
            if not result.data:
                return BillingKeyResponse(
                    success=False,
                    message="빌링키 저장에 실패했습니다."
                )
            
            saved = result.data[0]
            logger.info(f"빌링키 발급 완료: user={user_id}, card={card_info.get('number', 'N/A')}")
            
            return BillingKeyResponse(
                success=True,
                billing_key_id=UUID(saved["id"]),
                card_company=card_info.get("issuerCode"),
                card_number=card_info.get("number"),
                message="카드가 등록되었습니다."
            )
            
        except Exception as e:
            logger.error(f"빌링키 발급 오류: {e}")
            return BillingKeyResponse(
                success=False,
                message=f"빌링키 발급 중 오류가 발생했습니다: {str(e)}"
            )
    
    async def get_active_billing_key(self, user_id: UUID) -> Optional[dict]:
        """사용자의 활성 빌링키 조회"""
        try:
            result = self.supabase.table("billing_keys")\
                .select("*")\
                .eq("user_id", str(user_id))\
                .eq("is_active", True)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"빌링키 조회 실패: {e}")
            return None
    
    # ============================================
    # 결제 체크아웃 (Checkout)
    # ============================================
    
    async def create_checkout(
        self,
        user_id: UUID,
        request: CheckoutRequest
    ) -> Optional[CheckoutResponse]:
        """
        결제 체크아웃 생성
        - 주문 ID 생성
        - 쿠폰 적용
        - 업그레이드 차액 계산
        """
        try:
            tier = request.tier
            original_amount = get_tier_price(tier)
            
            if original_amount <= 0:
                logger.error(f"유효하지 않은 Tier 가격: {tier} = {original_amount}")
                return None
            
            # 업그레이드 차액 계산
            is_upgrade = False
            discount_from_upgrade = 0
            
            current_sub = self.supabase.table("subscriptions")\
                .select("*")\
                .eq("user_id", str(user_id))\
                .in_("status", ["active"])\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            if current_sub.data:
                current = current_sub.data[0]
                current_tier = current.get("tier", "free")
                
                if get_tier_order(current_tier) > 0 and get_tier_order(tier) > get_tier_order(current_tier):
                    is_upgrade = True
                    current_price = get_tier_price(current_tier)
                    
                    # 남은 기간 비율 계산
                    expires_at = current.get("expires_at")
                    if expires_at:
                        expires_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                        now = datetime.utcnow().replace(tzinfo=expires_dt.tzinfo)
                        remaining_days = max(0, (expires_dt - now).days)
                        total_days = 30
                        remaining_ratio = remaining_days / total_days
                        discount_from_upgrade = int(current_price * remaining_ratio)
            
            # 쿠폰 할인 계산
            coupon_discount = 0
            coupon_applied = False
            coupon_code = None
            
            if request.coupon_code:
                from app.services.coupon_service import coupon_service
                coupon_result = await coupon_service.validate_coupon(
                    request.coupon_code, tier, user_id
                )
                if coupon_result and coupon_result.get("valid"):
                    coupon_applied = True
                    coupon_code = request.coupon_code
                    if coupon_result["discount_type"] == "percentage":
                        coupon_discount = int(original_amount * coupon_result["discount_value"] / 100)
                    else:
                        coupon_discount = coupon_result["discount_value"]
            
            # 최종 결제 금액
            total_discount = discount_from_upgrade + coupon_discount
            final_amount = max(0, original_amount - total_discount)
            
            # 주문 ID 생성
            order_id = await self.generate_order_id(user_id)
            
            # CustomerKey
            customer_key = self._generate_customer_key(user_id)
            
            # 주문명
            tier_names = {
                "basic": "Basic", "basic_plus": "Basic+",
                "pro": "Pro", "custom": "Custom"
            }
            order_name = f"Whiplace {tier_names.get(tier, tier)} 월 구독"
            
            # 결제 레코드 생성
            payment_data = {
                "user_id": str(user_id),
                "order_id": order_id,
                "order_name": order_name,
                "amount": final_amount,
                "currency": "KRW",
                "status": "pending",
                "payment_type": "subscription",
                "metadata": {
                    "tier": tier,
                    "original_amount": original_amount,
                    "discount_from_upgrade": discount_from_upgrade,
                    "coupon_discount": coupon_discount,
                    "coupon_code": coupon_code,
                    "is_upgrade": is_upgrade,
                    "customer_key": customer_key,
                },
                "requested_at": datetime.utcnow().isoformat()
            }
            
            self.supabase.table("payments").insert(payment_data).execute()
            
            return CheckoutResponse(
                order_id=order_id,
                order_name=order_name,
                amount=final_amount,
                original_amount=original_amount,
                discount_amount=total_discount,
                coupon_applied=coupon_applied,
                coupon_code=coupon_code,
                customer_key=customer_key,
                tier=tier,
                is_upgrade=is_upgrade,
            )
            
        except Exception as e:
            logger.error(f"체크아웃 생성 실패: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None
    
    # ============================================
    # 결제 승인 (Confirm)
    # ============================================
    
    async def confirm_payment(
        self,
        user_id: UUID,
        request: PaymentConfirmRequest
    ) -> dict:
        """
        결제 승인 확인 처리
        1. 토스 결제 승인 API 호출
        2. DB 결제 상태 업데이트
        3. 구독 생성/업데이트
        4. 크레딧 부여
        5. 쿠폰 사용 처리
        """
        try:
            # 1. 결제 레코드 조회
            payment_result = self.supabase.table("payments")\
                .select("*")\
                .eq("order_id", request.order_id)\
                .single()\
                .execute()
            
            if not payment_result.data:
                return {"success": False, "message": "결제 정보를 찾을 수 없습니다."}
            
            payment = payment_result.data
            
            # 금액 검증
            if payment["amount"] != request.amount:
                logger.error(f"금액 불일치: DB={payment['amount']}, 요청={request.amount}")
                return {"success": False, "message": "결제 금액이 일치하지 않습니다."}
            
            # 2. 토스 결제 승인 API 호출
            if settings.PAYMENT_ENABLED:
                headers = self._get_toss_auth_header()
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.toss_api_url}/v1/payments/confirm",
                        json={
                            "paymentKey": request.payment_key,
                            "orderId": request.order_id,
                            "amount": request.amount
                        },
                        headers=headers,
                        timeout=30.0
                    )
                    
                    if response.status_code != 200:
                        error_data = response.json()
                        logger.error(f"결제 승인 실패: {error_data}")
                        
                        self.supabase.table("payments")\
                            .update({
                                "status": "failed",
                                "toss_response": error_data,
                                "updated_at": datetime.utcnow().isoformat()
                            })\
                            .eq("order_id", request.order_id)\
                            .execute()
                        
                        return {
                            "success": False,
                            "message": error_data.get("message", "결제 승인에 실패했습니다.")
                        }
                    
                    toss_response = response.json()
            else:
                # 테스트 모드: Mock 응답
                toss_response = {
                    "paymentKey": request.payment_key,
                    "orderId": request.order_id,
                    "status": "DONE",
                    "method": "카드",
                    "card": {"company": "테스트", "number": "4242****4242"},
                    "approvedAt": datetime.utcnow().isoformat(),
                    "mock": True
                }
            
            # 3. 결제 상태 업데이트
            card_info = toss_response.get("card", {})
            self.supabase.table("payments")\
                .update({
                    "payment_key": request.payment_key,
                    "status": "done",
                    "method": toss_response.get("method"),
                    "easy_pay_provider": toss_response.get("easyPay", {}).get("provider") if toss_response.get("easyPay") else None,
                    "card_company": card_info.get("company"),
                    "card_number": card_info.get("number"),
                    "approved_at": datetime.utcnow().isoformat(),
                    "toss_response": toss_response,
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("order_id", request.order_id)\
                .execute()
            
            # 4. 구독 생성/업데이트
            metadata = payment.get("metadata", {})
            tier = metadata.get("tier", "basic")
            is_upgrade = metadata.get("is_upgrade", False)
            
            now = datetime.utcnow()
            
            if is_upgrade:
                # 기존 구독 업데이트 (Tier만 변경, 만료일 유지)
                self.supabase.table("subscriptions")\
                    .update({
                        "tier": tier,
                        "updated_at": now.isoformat(),
                        "metadata": {"last_upgrade_at": now.isoformat(), "upgrade_payment_id": str(payment["id"])}
                    })\
                    .eq("user_id", str(user_id))\
                    .eq("status", "active")\
                    .execute()
            else:
                # 기존 활성 구독 취소
                self.supabase.table("subscriptions")\
                    .update({
                        "status": "cancelled",
                        "cancelled_at": now.isoformat(),
                        "updated_at": now.isoformat()
                    })\
                    .eq("user_id", str(user_id))\
                    .eq("status", "active")\
                    .execute()
                
                # 새 구독 생성
                expires_at = now + timedelta(days=30)
                next_billing = (now + timedelta(days=30)).date()
                
                sub_data = {
                    "user_id": str(user_id),
                    "tier": tier,
                    "status": "active",
                    "started_at": now.isoformat(),
                    "expires_at": expires_at.isoformat(),
                    "payment_method": toss_response.get("method", "card"),
                    "auto_renewal": True,
                    "next_billing_date": next_billing.isoformat(),
                    "metadata": {
                        "payment_id": str(payment["id"]),
                        "payment_key": request.payment_key,
                    }
                }
                
                self.supabase.table("subscriptions")\
                    .insert(sub_data)\
                    .execute()
            
            # 5. 프로필 Tier 업데이트
            self.supabase.table("profiles")\
                .update({"subscription_tier": tier})\
                .eq("id", str(user_id))\
                .execute()
            
            # 6. 크레딧 리셋 및 부여
            from app.core.config import get_tier_credits
            monthly_credits = get_tier_credits(tier)
            
            credit_result = self.supabase.table("user_credits")\
                .select("id")\
                .eq("user_id", str(user_id))\
                .execute()
            
            if credit_result.data:
                self.supabase.table("user_credits")\
                    .update({
                        "tier": tier,
                        "monthly_credits": monthly_credits,
                        "monthly_used": 0,
                        "last_reset_at": now.isoformat(),
                        "next_reset_at": (now + timedelta(days=30)).isoformat(),
                        "updated_at": now.isoformat()
                    })\
                    .eq("user_id", str(user_id))\
                    .execute()
            else:
                self.supabase.table("user_credits")\
                    .insert({
                        "user_id": str(user_id),
                        "tier": tier,
                        "monthly_credits": monthly_credits,
                        "monthly_used": 0,
                        "manual_credits": 0,
                        "reset_date": now.day,
                        "last_reset_at": now.isoformat(),
                        "next_reset_at": (now + timedelta(days=30)).isoformat()
                    })\
                    .execute()
            
            # 7. 쿠폰 사용 처리
            coupon_code = metadata.get("coupon_code")
            if coupon_code:
                from app.services.coupon_service import coupon_service
                await coupon_service.apply_coupon(user_id, coupon_code, tier)
            
            logger.info(
                f"결제 완료: user={user_id}, tier={tier}, "
                f"amount={request.amount}, order={request.order_id}"
            )
            
            return {
                "success": True,
                "message": f"{'업그레이드' if is_upgrade else '구독'}이 완료되었습니다.",
                "tier": tier,
                "payment_id": str(payment["id"]),
                "order_id": request.order_id,
            }
            
        except Exception as e:
            logger.error(f"결제 승인 처리 실패: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {"success": False, "message": f"결제 처리 중 오류가 발생했습니다: {str(e)}"}
    
    # ============================================
    # 빌링키 기반 자동결제 (정기결제)
    # ============================================
    
    async def charge_billing(
        self,
        user_id: UUID,
        billing_key: str,
        customer_key: str,
        amount: int,
        order_name: str,
        tier: str,
        subscription_id: Optional[str] = None
    ) -> dict:
        """
        빌링키로 자동결제 실행
        POST /v1/billing/{billingKey}
        """
        try:
            order_id = await self.generate_order_id(user_id)
            
            # 결제 레코드 먼저 생성
            payment_data = {
                "user_id": str(user_id),
                "subscription_id": subscription_id,
                "order_id": order_id,
                "order_name": order_name,
                "amount": amount,
                "currency": "KRW",
                "status": "in_progress",
                "payment_type": "subscription",
                "metadata": {
                    "tier": tier,
                    "billing_type": "recurring",
                    "customer_key": customer_key,
                },
                "requested_at": datetime.utcnow().isoformat()
            }
            
            payment_result = self.supabase.table("payments")\
                .insert(payment_data)\
                .execute()
            
            if not payment_result.data:
                return {"success": False, "message": "결제 레코드 생성 실패"}
            
            payment_id = payment_result.data[0]["id"]
            
            if not settings.PAYMENT_ENABLED:
                # 테스트 모드
                logger.info(f"[테스트모드] 자동결제 실행: user={user_id}, amount={amount}")
                self.supabase.table("payments")\
                    .update({
                        "payment_key": f"MOCK_BILLING_{order_id}",
                        "status": "done",
                        "method": "카드",
                        "approved_at": datetime.utcnow().isoformat(),
                        "toss_response": {"mock": True, "billing": True},
                        "updated_at": datetime.utcnow().isoformat()
                    })\
                    .eq("id", payment_id)\
                    .execute()
                
                return {"success": True, "payment_id": payment_id, "order_id": order_id}
            
            # 토스 빌링 API 호출
            headers = self._get_toss_auth_header()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.toss_api_url}/v1/billing/{billing_key}",
                    json={
                        "customerKey": customer_key,
                        "amount": amount,
                        "orderId": order_id,
                        "orderName": order_name,
                    },
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    error_data = response.json()
                    logger.error(f"자동결제 실패: {error_data}")
                    
                    self.supabase.table("payments")\
                        .update({
                            "status": "failed",
                            "toss_response": error_data,
                            "updated_at": datetime.utcnow().isoformat()
                        })\
                        .eq("id", payment_id)\
                        .execute()
                    
                    return {"success": False, "message": error_data.get("message", "자동결제 실패")}
                
                toss_response = response.json()
            
            # 결제 성공 업데이트
            card_info = toss_response.get("card", {})
            self.supabase.table("payments")\
                .update({
                    "payment_key": toss_response.get("paymentKey"),
                    "status": "done",
                    "method": toss_response.get("method"),
                    "card_company": card_info.get("company"),
                    "card_number": card_info.get("number"),
                    "approved_at": datetime.utcnow().isoformat(),
                    "toss_response": toss_response,
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("id", payment_id)\
                .execute()
            
            logger.info(f"자동결제 완료: user={user_id}, amount={amount}, order={order_id}")
            return {"success": True, "payment_id": payment_id, "order_id": order_id}
            
        except Exception as e:
            logger.error(f"자동결제 오류: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {"success": False, "message": str(e)}
    
    # ============================================
    # 기존 메서드 (호환성 유지)
    # ============================================
    
    async def generate_order_id(self, user_id: UUID) -> str:
        """주문 ID 생성"""
        try:
            response = self.supabase.rpc(
                "generate_order_id",
                {"p_user_id": str(user_id)}
            ).execute()
            
            return response.data
            
        except Exception as e:
            logger.error(f"Failed to generate order ID: {e}")
            timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
            return f"ORD_{timestamp}_{str(user_id)[:8]}"
    
    async def create_payment(
        self,
        user_id: UUID,
        request: PaymentCreateRequest
    ) -> Optional[Payment]:
        """결제 생성"""
        try:
            order_id = await self.generate_order_id(user_id)
            
            payment_data = {
                "user_id": str(user_id),
                "subscription_id": str(request.subscription_id) if request.subscription_id else None,
                "order_id": order_id,
                "order_name": request.order_name,
                "amount": request.amount,
                "currency": "KRW",
                "status": "pending",
                "payment_type": request.payment_type,
                "metadata": request.metadata,
                "requested_at": datetime.utcnow().isoformat()
            }
            
            response = self.supabase.table("payments")\
                .insert(payment_data)\
                .execute()
            
            if not response.data:
                return None
            
            logger.info(f"Payment created: order_id={order_id}, user={user_id}, amount={request.amount}")
            return Payment(**response.data[0])
            
        except Exception as e:
            logger.error(f"Failed to create payment: {e}")
            return None
    
    async def get_payment_by_order_id(self, order_id: str) -> Optional[Payment]:
        """주문 ID로 결제 조회"""
        try:
            response = self.supabase.table("payments")\
                .select("*")\
                .eq("order_id", order_id)\
                .single()\
                .execute()
            
            if not response.data:
                return None
            
            return Payment(**response.data)
            
        except Exception as e:
            logger.error(f"Failed to get payment: {e}")
            return None
    
    async def approve_toss_payment(
        self,
        request: TossPaymentRequest
    ) -> Optional[Payment]:
        """Toss Payment 승인 (레거시 호환)"""
        if not settings.PAYMENT_ENABLED:
            return await self._mock_approve_payment(request.order_id)
        
        try:
            headers = self._get_toss_auth_header()
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.toss_api_url}/v1/payments/confirm",
                    json={
                        "paymentKey": request.payment_key,
                        "orderId": request.order_id,
                        "amount": request.amount
                    },
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    logger.error(f"Toss Payment approval failed: {response.text}")
                    await self._update_payment_status(request.order_id, "failed")
                    return None
                
                toss_response = response.json()
            
            card_info = toss_response.get("card", {})
            update_data = {
                "payment_key": request.payment_key,
                "status": "done",
                "method": toss_response.get("method"),
                "easy_pay_provider": toss_response.get("easyPay", {}).get("provider") if toss_response.get("easyPay") else None,
                "card_company": card_info.get("company"),
                "card_number": card_info.get("number"),
                "approved_at": datetime.utcnow().isoformat(),
                "toss_response": toss_response,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            response = self.supabase.table("payments")\
                .update(update_data)\
                .eq("order_id", request.order_id)\
                .execute()
            
            if not response.data:
                return None
            
            return Payment(**response.data[0])
            
        except Exception as e:
            logger.error(f"Failed to approve payment: {e}")
            await self._update_payment_status(request.order_id, "failed")
            return None
    
    async def _mock_approve_payment(self, order_id: str) -> Optional[Payment]:
        """Mock 결제 승인 (테스트용)"""
        update_data = {
            "payment_key": f"MOCK_KEY_{order_id}",
            "status": "done",
            "method": "card",
            "approved_at": datetime.utcnow().isoformat(),
            "toss_response": {"mock": True},
            "updated_at": datetime.utcnow().isoformat()
        }
        
        response = self.supabase.table("payments")\
            .update(update_data)\
            .eq("order_id", order_id)\
            .execute()
        
        return Payment(**response.data[0]) if response.data else None
    
    async def _update_payment_status(self, order_id: str, status: str) -> bool:
        """결제 상태 업데이트"""
        try:
            self.supabase.table("payments")\
                .update({"status": status, "updated_at": datetime.utcnow().isoformat()})\
                .eq("order_id", order_id)\
                .execute()
            return True
        except Exception as e:
            logger.error(f"Failed to update payment status: {e}")
            return False
    
    async def cancel_payment(
        self,
        order_id: str,
        cancel_reason: str,
        cancel_amount: Optional[int] = None
    ) -> bool:
        """결제 취소"""
        try:
            payment = await self.get_payment_by_order_id(order_id)
            if not payment or payment.status != "done":
                return False
            
            if settings.PAYMENT_ENABLED and payment.payment_key:
                headers = self._get_toss_auth_header()
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.toss_api_url}/v1/payments/{payment.payment_key}/cancel",
                        json={
                            "cancelReason": cancel_reason,
                            "cancelAmount": cancel_amount or payment.amount
                        },
                        headers=headers,
                        timeout=30.0
                    )
                    
                    if response.status_code != 200:
                        logger.error(f"결제 취소 실패: {response.text}")
                        return False
            
            update_data = {
                "status": "cancelled",
                "cancel_reason": cancel_reason,
                "cancel_amount": cancel_amount or payment.amount,
                "cancelled_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            self.supabase.table("payments")\
                .update(update_data)\
                .eq("order_id", order_id)\
                .execute()
            
            logger.info(f"결제 취소: order_id={order_id}, reason={cancel_reason}")
            return True
            
        except Exception as e:
            logger.error(f"결제 취소 오류: {e}")
            return False
    
    async def get_user_payments(
        self,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0
    ) -> List[Payment]:
        """사용자 결제 내역 조회"""
        try:
            response = self.supabase.table("payments")\
                .select("*")\
                .eq("user_id", str(user_id))\
                .order("created_at", desc=True)\
                .range(offset, offset + limit - 1)\
                .execute()
            
            payments = []
            for data in response.data:
                payments.append(Payment(**data))
            
            return payments
            
        except Exception as e:
            logger.error(f"Failed to get user payments: {e}")
            return []


# 싱글톤 인스턴스
payment_service = PaymentService()
