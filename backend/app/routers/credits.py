"""
Credits API Router
크레딧 시스템 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from uuid import UUID

from app.models.credits import (
    UserCreditsResponse,
    CreditCheckRequest,
    CreditCheckResponse,
    CreditDeductRequest,
    CreditChargeRequest,
    CreditTransaction,
    TierQuotas,
)
from app.services.credit_service import credit_service
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/credits", tags=["credits"])


@router.get("/me", response_model=UserCreditsResponse)
async def get_my_credits(
    current_user: dict = Depends(get_current_user)
):
    """
    현재 사용자의 크레딧 조회
    """
    user_id = UUID(current_user["user_id"])
    credits = await credit_service.get_user_credits(user_id)
    
    if not credits:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credits not found"
        )
    
    return credits


@router.post("/check", response_model=CreditCheckResponse)
async def check_credits(
    request: CreditCheckRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    크레딧 충분한지 확인
    """
    user_id = UUID(current_user["user_id"])
    result = await credit_service.check_sufficient_credits(
        user_id,
        request.feature,
        request.estimated_credits
    )
    
    return result


@router.post("/deduct")
async def deduct_credits(
    request: CreditDeductRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    크레딧 차감
    """
    user_id = UUID(current_user["user_id"])
    
    try:
        transaction_id = await credit_service.deduct_credits(
            user_id,
            request.feature,
            request.credits_amount,
            request.metadata
        )
        
        return {
            "success": True,
            "transaction_id": str(transaction_id) if transaction_id else None
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/charge")
async def charge_credits(
    request: CreditChargeRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    수동 충전 크레딧 추가
    """
    user_id = UUID(current_user["user_id"])
    
    try:
        transaction_id = await credit_service.charge_manual_credits(
            user_id,
            request.credits_amount,
            request.payment_id
        )
        
        return {
            "success": True,
            "transaction_id": str(transaction_id) if transaction_id else None
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/transactions", response_model=List[CreditTransaction])
async def get_credit_transactions(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """
    크레딧 트랜잭션 내역 조회
    """
    user_id = UUID(current_user["user_id"])
    transactions = await credit_service.get_credit_transactions(user_id, limit, offset)
    
    return transactions


@router.get("/tier/{tier}", response_model=TierQuotas)
async def get_tier_quotas(tier: str):
    """
    Tier별 쿼터 정보 조회 (공개 API)
    """
    quotas = await credit_service.get_tier_quotas(tier)
    
    if not quotas:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tier not found"
        )
    
    return quotas


@router.post("/reset")
async def reset_monthly_credits(
    current_user: dict = Depends(get_current_user)
):
    """
    월 크레딧 리셋 (테스트용, 실제로는 스케줄러가 실행)
    """
    user_id = UUID(current_user["user_id"])
    success = await credit_service.reset_monthly_credits(user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset credits"
        )
    
    return {"success": True, "message": "Credits reset successfully"}
