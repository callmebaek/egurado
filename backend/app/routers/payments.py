"""
Payments API Router
결제 처리 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from uuid import UUID

from app.models.credits import (
    Payment,
    PaymentCreateRequest,
    TossPaymentRequest,
    TossPaymentCallbackRequest,
    CreditPackage,
    CreditPackageResponse
)
from app.services.payment_service import payment_service
from app.services.credit_service import credit_service
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


@router.post("/", response_model=Payment)
async def create_payment(
    request: PaymentCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    결제 생성
    """
    user_id = UUID(current_user["user_id"])
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
    """
    Toss Payment 승인 (Webhook)
    """
    payment = await payment_service.approve_toss_payment(request)
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment approval failed"
        )
    
    # 결제 성공 시 후처리
    if payment.payment_type == "credit_package":
        # 크레딧 충전 (metadata에서 credits_amount 추출)
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
    """
    Toss Payment 콜백 (사용자가 결제 완료 후 리다이렉트)
    """
    # 결제 승인 처리
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
    """
    주문 ID로 결제 조회
    """
    payment = await payment_service.get_payment_by_order_id(order_id)
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # 본인 결제인지 확인
    if str(payment.user_id) != current_user["user_id"]:
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
    """
    결제 취소
    """
    # 본인 결제인지 확인
    payment = await payment_service.get_payment_by_order_id(order_id)
    if not payment or str(payment.user_id) != current_user["user_id"]:
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
    """
    결제 내역 조회
    """
    user_id = UUID(current_user["user_id"])
    payments = await payment_service.get_user_payments(user_id, limit, offset)
    
    return payments


@router.get("/packages", response_model=List[CreditPackageResponse])
async def get_credit_packages():
    """
    크레딧 패키지 목록 조회 (공개 API)
    """
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
