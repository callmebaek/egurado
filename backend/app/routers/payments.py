"""
Payments API Router
결제 처리 API 엔드포인트 (Toss Payments 결제위젯 + 빌링키 연동)
"""
from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from app.models.credits import (
    Payment,
    PaymentCreateRequest,
    TossPaymentRequest,
    TossPaymentCallbackRequest,
    CreditPackage,
    CreditPackageResponse,
    BillingKeyIssueRequest,
    BillingKeyResponse,
    CheckoutRequest,
    CheckoutResponse,
    PaymentConfirmRequest,
)
from app.services.payment_service import payment_service
from app.services.credit_service import credit_service
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


# ============================================
# 결제 체크아웃 (새 플로우)
# ============================================

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    request: CheckoutRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    결제 체크아웃 생성
    - 주문 ID, 결제 금액 계산
    - 쿠폰 할인 적용
    - 업그레이드 차액 계산
    """
    user_id = UUID(current_user["id"])
    
    # 동의 확인
    if not all([request.agree_terms, request.agree_privacy, request.agree_refund, request.agree_payment]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="모든 약관에 동의해야 합니다."
        )
    
    try:
        checkout = await payment_service.create_checkout(user_id, request)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    
    if not checkout:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="체크아웃 생성에 실패했습니다."
        )
    
    return checkout


@router.post("/confirm")
async def confirm_payment(
    request: PaymentConfirmRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    결제 승인 확인
    - 프론트엔드에서 토스 결제 완료 후 호출
    - 결제 승인 → 구독 생성 → 크레딧 부여
    """
    user_id = UUID(current_user["id"])
    result = await payment_service.confirm_payment(user_id, request)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "결제 승인에 실패했습니다.")
        )
    
    return result


# ============================================
# 빌링키 관리
# ============================================

@router.post("/billing-key", response_model=BillingKeyResponse)
async def issue_billing_key(
    request: BillingKeyIssueRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    빌링키 발급 (자동결제용 카드 등록)
    """
    user_id = UUID(current_user["id"])
    result = await payment_service.issue_billing_key(user_id, request)
    
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.message or "빌링키 발급에 실패했습니다."
        )
    
    return result


@router.get("/billing-key")
async def get_billing_key(
    current_user: dict = Depends(get_current_user)
):
    """
    등록된 결제 수단 조회
    """
    user_id = UUID(current_user["id"])
    billing_key = await payment_service.get_active_billing_key(user_id)
    
    if not billing_key:
        return {"has_billing_key": False}
    
    return {
        "has_billing_key": True,
        "card_company": billing_key.get("card_company"),
        "card_number": billing_key.get("card_number"),
        "card_type": billing_key.get("card_type"),
        "registered_at": billing_key.get("created_at"),
    }


# ============================================
# 쿠폰 검증 (사용자용)
# ============================================

class CouponValidateBody(BaseModel):
    code: str
    tier: str

@router.post("/validate-coupon")
async def validate_coupon(
    body: CouponValidateBody,
    current_user: dict = Depends(get_current_user)
):
    """
    쿠폰 유효성 검증
    """
    from app.services.coupon_service import coupon_service
    
    user_id = UUID(current_user["id"])
    result = await coupon_service.validate_coupon(body.code, body.tier, user_id)
    
    return result


# ============================================
# Tier 가격 정보 (공개)
# ============================================

@router.get("/tier-prices")
async def get_tier_prices():
    """
    Tier별 가격 정보 조회 (공개 API)
    """
    from app.core.config import TIER_PRICES, TIER_CREDITS
    
    tiers = []
    for tier_key, price in TIER_PRICES.items():
        if tier_key in ("custom", "god"):
            continue
        tiers.append({
            "tier": tier_key,
            "price": price,
            "monthly_credits": TIER_CREDITS.get(tier_key, 0),
        })
    
    return {"tiers": tiers}


# ============================================
# 기존 API (호환성 유지)
# ============================================

@router.post("/", response_model=Payment)
async def create_payment(
    request: PaymentCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """결제 생성"""
    user_id = UUID(current_user["id"])
    payment = await payment_service.create_payment(user_id, request)
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment"
        )
    
    return payment


@router.post("/toss/approve", response_model=Payment)
async def approve_toss_payment(
    request: TossPaymentRequest
):
    """Toss Payment 승인 (레거시)"""
    payment = await payment_service.approve_toss_payment(request)
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment approval failed"
        )
    
    if payment.payment_type == "credit_package":
        credits_amount = payment.metadata.get("credits_amount", 0)
        if credits_amount > 0:
            await credit_service.charge_manual_credits(
                payment.user_id,
                credits_amount,
                payment.id
            )
    
    return payment


@router.post("/toss/callback")
async def toss_payment_callback(
    request: TossPaymentCallbackRequest
):
    """Toss Payment 콜백"""
    toss_request = TossPaymentRequest(
        payment_key=request.payment_key,
        order_id=request.order_id,
        amount=request.amount
    )
    
    payment = await payment_service.approve_toss_payment(toss_request)
    
    if not payment:
        return {"success": False, "message": "Payment approval failed"}
    
    return {"success": True, "payment_id": str(payment.id)}


@router.get("/order/{order_id}", response_model=Payment)
async def get_payment_by_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """주문 ID로 결제 조회"""
    payment = await payment_service.get_payment_by_order_id(order_id)
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    if str(payment.user_id) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return payment


@router.delete("/{order_id}")
async def cancel_payment(
    order_id: str,
    cancel_reason: str,
    cancel_amount: int = None,
    current_user: dict = Depends(get_current_user)
):
    """결제 취소"""
    payment = await payment_service.get_payment_by_order_id(order_id)
    if not payment or str(payment.user_id) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    success = await payment_service.cancel_payment(order_id, cancel_reason, cancel_amount)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel payment"
        )
    
    return {"success": True, "message": "Payment cancelled successfully"}


@router.get("/history", response_model=List[Payment])
async def get_payment_history(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """결제 내역 조회"""
    user_id = UUID(current_user["id"])
    payments = await payment_service.get_user_payments(user_id, limit, offset)
    return payments


@router.get("/packages", response_model=List[CreditPackageResponse])
async def get_credit_packages():
    """크레딧 패키지 목록 조회 (공개 API)"""
    from app.core.database import get_supabase_client
    supabase = get_supabase_client()
    
    try:
        response = supabase.table("credit_packages")\
            .select("*")\
            .eq("is_active", True)\
            .order("display_order")\
            .execute()
        
        packages = []
        for data in response.data:
            package = CreditPackage(**data)
            packages.append(CreditPackageResponse(
                id=package.id,
                name=package.name,
                display_name=package.display_name,
                description=package.description,
                credits=package.credits,
                total_credits=package.credits + package.bonus_credits,
                price=package.price,
                original_price=package.original_price,
                discount_rate=package.discount_rate,
                is_popular=package.is_popular,
                is_coming_soon=package.price is None
            ))
        
        return packages
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get packages: {str(e)}"
        )
