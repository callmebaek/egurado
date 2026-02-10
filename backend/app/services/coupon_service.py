"""
Coupon Service
쿠폰 관리 서비스
"""
from uuid import UUID
from typing import Optional, List
from datetime import datetime, timedelta
import logging
import secrets
import string

from app.core.database import get_supabase_client
from app.core.config import get_tier_price

logger = logging.getLogger(__name__)


class CouponService:
    """쿠폰 관리 서비스"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    def generate_coupon_code(self, length: int = 10) -> str:
        """랜덤 쿠폰 코드 생성 (영대문자 + 숫자)"""
        chars = string.ascii_uppercase + string.digits
        code = ''.join(secrets.choice(chars) for _ in range(length))
        # 4자리마다 하이픈 추가 (예: ABCD-1234-EFGH)
        parts = [code[i:i+4] for i in range(0, len(code), 4)]
        return '-'.join(parts)
    
    async def create_coupon(
        self,
        name: str,
        discount_type: str,
        discount_value: int,
        code: Optional[str] = None,
        description: Optional[str] = None,
        applicable_tiers: Optional[list] = None,
        max_uses: Optional[int] = None,
        max_uses_per_user: int = 1,
        is_permanent: bool = True,
        duration_months: Optional[int] = None,
        valid_from: Optional[datetime] = None,
        valid_until: Optional[datetime] = None,
        created_by: Optional[UUID] = None,
    ) -> Optional[dict]:
        """쿠폰 생성"""
        try:
            if not code:
                code = self.generate_coupon_code()
            
            # 코드 중복 확인
            existing = self.supabase.table("coupons")\
                .select("id")\
                .eq("code", code)\
                .execute()
            
            if existing.data:
                logger.warning(f"쿠폰 코드 중복: {code}")
                return None
            
            coupon_data = {
                "code": code.upper(),
                "name": name,
                "description": description,
                "discount_type": discount_type,
                "discount_value": discount_value,
                "applicable_tiers": applicable_tiers or ["basic", "basic_plus", "pro"],
                "max_uses": max_uses,
                "current_uses": 0,
                "max_uses_per_user": max_uses_per_user,
                "is_active": True,
                "is_permanent": is_permanent,
                "duration_months": duration_months,
                "valid_from": valid_from.isoformat() if valid_from else datetime.utcnow().isoformat(),
                "valid_until": valid_until.isoformat() if valid_until else None,
                "created_by": str(created_by) if created_by else None,
            }
            
            result = self.supabase.table("coupons")\
                .insert(coupon_data)\
                .execute()
            
            if not result.data:
                return None
            
            logger.info(f"쿠폰 생성: code={code}, name={name}, discount={discount_value}{'%' if discount_type == 'percentage' else '원'}")
            return result.data[0]
            
        except Exception as e:
            logger.error(f"쿠폰 생성 실패: {e}")
            return None
    
    async def validate_coupon(
        self,
        code: str,
        tier: str,
        user_id: Optional[UUID] = None
    ) -> Optional[dict]:
        """
        쿠폰 유효성 검증
        
        Returns:
            dict: {valid, discount_type, discount_value, coupon_id, discounted_amount, original_amount, message}
        """
        try:
            code = code.upper().strip()
            
            # 쿠폰 조회
            result = self.supabase.table("coupons")\
                .select("*")\
                .eq("code", code)\
                .eq("is_active", True)\
                .single()\
                .execute()
            
            if not result.data:
                return {"valid": False, "message": "유효하지 않은 쿠폰 코드입니다."}
            
            coupon = result.data
            now = datetime.utcnow()
            
            # 유효기간 확인
            if coupon.get("valid_from"):
                valid_from = datetime.fromisoformat(coupon["valid_from"].replace("Z", "+00:00")).replace(tzinfo=None)
                if now < valid_from:
                    return {"valid": False, "message": "아직 사용할 수 없는 쿠폰입니다."}
            
            if coupon.get("valid_until"):
                valid_until = datetime.fromisoformat(coupon["valid_until"].replace("Z", "+00:00")).replace(tzinfo=None)
                if now > valid_until:
                    return {"valid": False, "message": "유효기간이 만료된 쿠폰입니다."}
            
            # 사용 횟수 확인
            if coupon.get("max_uses") and coupon["current_uses"] >= coupon["max_uses"]:
                return {"valid": False, "message": "모든 쿠폰이 소진되었습니다."}
            
            # Tier 적용 가능 확인
            applicable_tiers = coupon.get("applicable_tiers", [])
            if applicable_tiers and tier not in applicable_tiers:
                return {"valid": False, "message": f"이 쿠폰은 해당 요금제에 적용할 수 없습니다."}
            
            # 사용자별 사용 횟수 확인
            if user_id:
                user_usage = self.supabase.table("user_coupons")\
                    .select("id")\
                    .eq("user_id", str(user_id))\
                    .eq("coupon_id", coupon["id"])\
                    .execute()
                
                max_per_user = coupon.get("max_uses_per_user", 1)
                if user_usage.data and len(user_usage.data) >= max_per_user:
                    return {"valid": False, "message": "이미 사용한 쿠폰입니다."}
            
            # 할인 금액 계산
            original_amount = get_tier_price(tier)
            discount_type = coupon["discount_type"]
            discount_value = coupon["discount_value"]
            
            if discount_type == "percentage":
                discount_amount = int(original_amount * discount_value / 100)
            else:
                discount_amount = min(discount_value, original_amount)
            
            discounted_amount = max(0, original_amount - discount_amount)
            
            return {
                "valid": True,
                "coupon_id": coupon["id"],
                "discount_type": discount_type,
                "discount_value": discount_value,
                "discount_amount": discount_amount,
                "discounted_amount": discounted_amount,
                "original_amount": original_amount,
                "is_permanent": coupon.get("is_permanent", True),
                "duration_months": coupon.get("duration_months"),
                "message": f"{'영구' if coupon.get('is_permanent') else f'{coupon.get(\"duration_months\", 1)}개월'} {discount_value}{'%' if discount_type == 'percentage' else '원'} 할인이 적용됩니다."
            }
            
        except Exception as e:
            logger.error(f"쿠폰 검증 실패: {e}")
            return {"valid": False, "message": "쿠폰 검증 중 오류가 발생했습니다."}
    
    async def apply_coupon(
        self,
        user_id: UUID,
        coupon_code: str,
        tier: str,
        subscription_id: Optional[str] = None,
    ) -> bool:
        """쿠폰 사용 처리"""
        try:
            code = coupon_code.upper().strip()
            
            # 쿠폰 조회
            result = self.supabase.table("coupons")\
                .select("*")\
                .eq("code", code)\
                .single()\
                .execute()
            
            if not result.data:
                return False
            
            coupon = result.data
            
            # 사용 횟수 증가
            self.supabase.table("coupons")\
                .update({
                    "current_uses": coupon["current_uses"] + 1,
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("id", coupon["id"])\
                .execute()
            
            # 사용자-쿠폰 매핑 생성
            expires_at = None
            if not coupon.get("is_permanent") and coupon.get("duration_months"):
                expires_at = (datetime.utcnow() + timedelta(days=30 * coupon["duration_months"])).isoformat()
            
            user_coupon_data = {
                "user_id": str(user_id),
                "coupon_id": coupon["id"],
                "subscription_id": subscription_id,
                "applied_at": datetime.utcnow().isoformat(),
                "expires_at": expires_at,
                "is_active": True,
                "discount_type": coupon["discount_type"],
                "discount_value": coupon["discount_value"],
            }
            
            self.supabase.table("user_coupons")\
                .insert(user_coupon_data)\
                .execute()
            
            logger.info(f"쿠폰 적용: user={user_id}, code={code}")
            return True
            
        except Exception as e:
            logger.error(f"쿠폰 적용 실패: {e}")
            return False
    
    async def get_user_active_coupon(self, user_id: UUID) -> Optional[dict]:
        """사용자의 활성 쿠폰 조회 (영구 할인 등)"""
        try:
            now = datetime.utcnow().isoformat()
            
            result = self.supabase.table("user_coupons")\
                .select("*, coupons(*)")\
                .eq("user_id", str(user_id))\
                .eq("is_active", True)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            if not result.data:
                return None
            
            user_coupon = result.data[0]
            
            # 만료 확인
            if user_coupon.get("expires_at"):
                expires_at = datetime.fromisoformat(user_coupon["expires_at"].replace("Z", "+00:00")).replace(tzinfo=None)
                if datetime.utcnow() > expires_at:
                    # 만료 처리
                    self.supabase.table("user_coupons")\
                        .update({"is_active": False})\
                        .eq("id", user_coupon["id"])\
                        .execute()
                    return None
            
            return user_coupon
            
        except Exception as e:
            logger.error(f"사용자 쿠폰 조회 실패: {e}")
            return None
    
    # ============================================
    # Admin 쿠폰 관리
    # ============================================
    
    async def get_all_coupons(self, include_inactive: bool = False) -> List[dict]:
        """모든 쿠폰 조회 (관리자)"""
        try:
            query = self.supabase.table("coupons")\
                .select("*")\
                .order("created_at", desc=True)
            
            if not include_inactive:
                query = query.eq("is_active", True)
            
            result = query.execute()
            return result.data or []
            
        except Exception as e:
            logger.error(f"쿠폰 목록 조회 실패: {e}")
            return []
    
    async def update_coupon(self, coupon_id: UUID, updates: dict) -> Optional[dict]:
        """쿠폰 수정 (관리자)"""
        try:
            updates["updated_at"] = datetime.utcnow().isoformat()
            
            result = self.supabase.table("coupons")\
                .update(updates)\
                .eq("id", str(coupon_id))\
                .execute()
            
            return result.data[0] if result.data else None
            
        except Exception as e:
            logger.error(f"쿠폰 수정 실패: {e}")
            return None
    
    async def toggle_coupon(self, coupon_id: UUID) -> Optional[dict]:
        """쿠폰 활성화/비활성화 토글"""
        try:
            # 현재 상태 조회
            result = self.supabase.table("coupons")\
                .select("is_active")\
                .eq("id", str(coupon_id))\
                .single()\
                .execute()
            
            if not result.data:
                return None
            
            new_status = not result.data["is_active"]
            
            updated = self.supabase.table("coupons")\
                .update({
                    "is_active": new_status,
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("id", str(coupon_id))\
                .execute()
            
            return updated.data[0] if updated.data else None
            
        except Exception as e:
            logger.error(f"쿠폰 토글 실패: {e}")
            return None
    
    async def delete_coupon(self, coupon_id: UUID) -> bool:
        """쿠폰 삭제 (관리자)"""
        try:
            self.supabase.table("coupons")\
                .delete()\
                .eq("id", str(coupon_id))\
                .execute()
            return True
        except Exception as e:
            logger.error(f"쿠폰 삭제 실패: {e}")
            return False
    
    async def get_coupon_usage_stats(self, coupon_id: UUID) -> dict:
        """쿠폰 사용 통계"""
        try:
            result = self.supabase.table("user_coupons")\
                .select("id, user_id, applied_at, is_active")\
                .eq("coupon_id", str(coupon_id))\
                .execute()
            
            users = result.data or []
            active_count = sum(1 for u in users if u.get("is_active"))
            
            return {
                "total_uses": len(users),
                "active_uses": active_count,
                "unique_users": len(set(u["user_id"] for u in users)),
            }
            
        except Exception as e:
            logger.error(f"쿠폰 통계 조회 실패: {e}")
            return {"total_uses": 0, "active_uses": 0, "unique_users": 0}


# 싱글톤 인스턴스
coupon_service = CouponService()
