"""
Payment Service
결제 처리 서비스 (Toss Payment 연동 준비)
"""
from uuid import UUID
from typing import Optional, List
from datetime import datetime
import logging
import httpx

from app.core.database import get_supabase_client
from app.core.config import settings
from app.models.credits import (
    Payment,
    PaymentCreateRequest,
    TossPaymentRequest,
    TossPaymentCallbackRequest
)

logger = logging.getLogger(__name__)


class PaymentService:
    """결제 처리 서비스"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.toss_api_url = "https://api.tosspayments.com/v1"
    
    async def generate_order_id(self, user_id: UUID) -> str:
        """
        주문 ID 생성
        
        Args:
            user_id: 사용자 ID
            
        Returns:
            str: 주문 ID
        """
        try:
            response = self.supabase.rpc(
                "generate_order_id",
                {"p_user_id": str(user_id)}
            ).execute()
            
            return response.data
            
        except Exception as e:
            logger.error(f"Failed to generate order ID: {e}")
            # Fallback: 간단한 생성 로직
            timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
            return f"ORD_{timestamp}_{str(user_id)[:8]}"
    
    async def create_payment(
        self,
        user_id: UUID,
        request: PaymentCreateRequest
    ) -> Optional[Payment]:
        """
        결제 생성
        
        Args:
            user_id: 사용자 ID
            request: 결제 생성 요청
            
        Returns:
            Payment: 생성된 결제
        """
        try:
            # 주문 ID 생성
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
        """
        주문 ID로 결제 조회
        
        Args:
            order_id: 주문 ID
            
        Returns:
            Payment: 결제 정보
        """
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
        """
        Toss Payment 승인 (실제 API 호출)
        
        Args:
            request: Toss Payment 승인 요청
            
        Returns:
            Payment: 승인된 결제
        """
        # 결제 연동이 비활성화면 Mock 응답
        if not settings.PAYMENT_ENABLED:
            logger.warning("Payment disabled. Returning mock approval.")
            return await self._mock_approve_payment(request.order_id)
        
        try:
            # Toss Payment API 승인 호출
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.toss_api_url}/payments/{request.payment_key}",
                    json={
                        "orderId": request.order_id,
                        "amount": request.amount
                    },
                    headers={
                        "Authorization": f"Basic {settings.TOSS_SECRET_KEY}",
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code != 200:
                    logger.error(f"Toss Payment approval failed: {response.text}")
                    await self._update_payment_status(request.order_id, "failed")
                    return None
                
                toss_response = response.json()
            
            # 결제 정보 업데이트
            update_data = {
                "payment_key": request.payment_key,
                "status": "done",
                "method": toss_response.get("method"),
                "easy_pay_provider": toss_response.get("easyPay", {}).get("provider"),
                "card_company": toss_response.get("card", {}).get("company"),
                "card_number": toss_response.get("card", {}).get("number"),
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
            
            logger.info(f"Payment approved: order_id={request.order_id}, payment_key={request.payment_key}")
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
        """
        결제 취소
        
        Args:
            order_id: 주문 ID
            cancel_reason: 취소 사유
            cancel_amount: 취소 금액 (부분 취소 가능)
            
        Returns:
            bool: 성공 여부
        """
        try:
            payment = await self.get_payment_by_order_id(order_id)
            if not payment or payment.status != "done":
                logger.warning(f"Payment not found or not done: {order_id}")
                return False
            
            # Toss Payment API 취소 호출 (실제 연동 시)
            if settings.PAYMENT_ENABLED and payment.payment_key:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.toss_api_url}/payments/{payment.payment_key}/cancel",
                        json={
                            "cancelReason": cancel_reason,
                            "cancelAmount": cancel_amount or payment.amount
                        },
                        headers={
                            "Authorization": f"Basic {settings.TOSS_SECRET_KEY}",
                            "Content-Type": "application/json"
                        }
                    )
                    
                    if response.status_code != 200:
                        logger.error(f"Toss Payment cancel failed: {response.text}")
                        return False
            
            # 결제 상태 업데이트
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
            
            logger.info(f"Payment cancelled: order_id={order_id}, reason={cancel_reason}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cancel payment: {e}")
            return False
    
    async def get_user_payments(
        self,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0
    ) -> List[Payment]:
        """
        사용자 결제 내역 조회
        
        Args:
            user_id: 사용자 ID
            limit: 조회 개수
            offset: 오프셋
            
        Returns:
            List[Payment]: 결제 목록
        """
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
