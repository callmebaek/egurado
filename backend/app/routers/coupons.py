"""
Coupons API Router
쿠폰 관리 API 엔드포인트 (Admin 전용 + 사용자 검증)
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from app.models.credits import (
    CouponCreateRequest,
    CouponUpdateRequest,
    CouponValidateRequest,
    CouponValidateResponse,
)
from app.services.coupon_service import coupon_service
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/coupons", tags=["coupons"])


# ============================================
# Admin 쿠폰 관리
# ============================================

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    """관리자 권한 확인 (God Tier만 허용)"""
    from app.core.database import get_supabase_client
    supabase = get_supabase_client()
    
    profile = supabase.table("profiles")\
        .select("subscription_tier")\
        .eq("id", current_user["id"])\
        .single()\
        .execute()
    
    if not profile.data:
        raise HTTPException(status_code=403, detail="권한이 없습니다.")
    
    tier = profile.data.get("subscription_tier", "free")
    
    if tier != "god":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다. (God Tier 전용)")
    
    return current_user


@router.get("/admin/list")
async def admin_list_coupons(
    include_inactive: bool = False,
    admin_user: dict = Depends(get_admin_user)
):
    """[Admin] 모든 쿠폰 조회"""
    coupons = await coupon_service.get_all_coupons(include_inactive)
    return {"coupons": coupons}


@router.post("/admin/create")
async def admin_create_coupon(
    request: CouponCreateRequest,
    admin_user: dict = Depends(get_admin_user)
):
    """[Admin] 쿠폰 생성"""
    coupon = await coupon_service.create_coupon(
        name=request.name,
        discount_type=request.discount_type,
        discount_value=request.discount_value,
        code=request.code,
        description=request.description,
        applicable_tiers=request.applicable_tiers,
        max_uses=request.max_uses,
        max_uses_per_user=request.max_uses_per_user,
        is_permanent=request.is_permanent,
        duration_months=request.duration_months,
        valid_from=request.valid_from,
        valid_until=request.valid_until,
        created_by=UUID(admin_user["id"]),
    )
    
    if not coupon:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="쿠폰 생성에 실패했습니다. 코드가 중복되었을 수 있습니다."
        )
    
    return {"success": True, "coupon": coupon}


@router.patch("/admin/{coupon_id}")
async def admin_update_coupon(
    coupon_id: str,
    request: CouponUpdateRequest,
    admin_user: dict = Depends(get_admin_user)
):
    """[Admin] 쿠폰 수정"""
    updates = {}
    if request.name is not None:
        updates["name"] = request.name
    if request.description is not None:
        updates["description"] = request.description
    if request.discount_value is not None:
        updates["discount_value"] = request.discount_value
    if request.is_active is not None:
        updates["is_active"] = request.is_active
    if request.max_uses is not None:
        updates["max_uses"] = request.max_uses
    if request.valid_until is not None:
        updates["valid_until"] = request.valid_until.isoformat()
    
    if not updates:
        raise HTTPException(status_code=400, detail="수정할 내용이 없습니다.")
    
    coupon = await coupon_service.update_coupon(UUID(coupon_id), updates)
    
    if not coupon:
        raise HTTPException(status_code=404, detail="쿠폰을 찾을 수 없습니다.")
    
    return {"success": True, "coupon": coupon}


@router.post("/admin/{coupon_id}/toggle")
async def admin_toggle_coupon(
    coupon_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """[Admin] 쿠폰 활성화/비활성화 토글"""
    coupon = await coupon_service.toggle_coupon(UUID(coupon_id))
    
    if not coupon:
        raise HTTPException(status_code=404, detail="쿠폰을 찾을 수 없습니다.")
    
    return {
        "success": True,
        "is_active": coupon.get("is_active"),
        "coupon": coupon
    }


@router.delete("/admin/{coupon_id}")
async def admin_delete_coupon(
    coupon_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """[Admin] 쿠폰 삭제"""
    success = await coupon_service.delete_coupon(UUID(coupon_id))
    
    if not success:
        raise HTTPException(status_code=500, detail="쿠폰 삭제에 실패했습니다.")
    
    return {"success": True, "message": "쿠폰이 삭제되었습니다."}


@router.get("/admin/{coupon_id}/stats")
async def admin_coupon_stats(
    coupon_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """[Admin] 쿠폰 사용 통계"""
    stats = await coupon_service.get_coupon_usage_stats(UUID(coupon_id))
    return stats


class GenerateCodeRequest(BaseModel):
    count: int = 1
    prefix: Optional[str] = None

@router.post("/admin/generate-codes")
async def admin_generate_coupon_codes(
    request: GenerateCodeRequest,
    admin_user: dict = Depends(get_admin_user)
):
    """[Admin] 쿠폰 코드 생성 (코드만 생성, 쿠폰은 미생성)"""
    codes = []
    for _ in range(min(request.count, 100)):
        code = coupon_service.generate_coupon_code()
        if request.prefix:
            code = f"{request.prefix}-{code}"
        codes.append(code)
    
    return {"codes": codes}


# ============================================
# 사용자 쿠폰 검증
# ============================================

@router.post("/validate", response_model=CouponValidateResponse)
async def validate_coupon(
    request: CouponValidateRequest,
    current_user: dict = Depends(get_current_user)
):
    """사용자 쿠폰 유효성 검증"""
    user_id = UUID(current_user["id"])
    result = await coupon_service.validate_coupon(request.code, request.tier, user_id)
    
    if not result:
        return CouponValidateResponse(valid=False, message="쿠폰 검증에 실패했습니다.")
    
    return CouponValidateResponse(
        valid=result.get("valid", False),
        coupon_id=result.get("coupon_id"),
        discount_type=result.get("discount_type"),
        discount_value=result.get("discount_value"),
        discounted_amount=result.get("discounted_amount"),
        original_amount=result.get("original_amount"),
        message=result.get("message"),
    )
