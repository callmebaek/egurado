"""
Credit Service
크레딧 시스템 비즈니스 로직
"""
from uuid import UUID
from typing import Optional, List
from datetime import datetime
import logging

from app.core.database import get_supabase_client
from app.core.config import settings, calculate_feature_credits
from app.models.credits import (
    UserCredits,
    UserCreditsResponse,
    CreditTransaction,
    CreditCheckResponse,
    TierQuotas,
)

logger = logging.getLogger(__name__)


class CreditService:
    """크레딧 관리 서비스"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    async def get_user_credits(self, user_id: UUID) -> Optional[UserCreditsResponse]:
        """
        사용자 크레딧 조회
        
        Args:
            user_id: 사용자 ID
            
        Returns:
            UserCreditsResponse: 크레딧 정보
        """
        try:
            response = self.supabase.table("user_credits")\
                .select("*")\
                .eq("user_id", str(user_id))\
                .single()\
                .execute()
            
            if not response.data:
                return None
            
            data = response.data
            percentage_used = 0
            if data["monthly_credits"] > 0:
                percentage_used = (data["monthly_used"] / data["monthly_credits"]) * 100
            
            return UserCreditsResponse(
                user_id=user_id,
                tier=data["tier"],
                monthly_credits=data["monthly_credits"],
                monthly_used=data["monthly_used"],
                monthly_remaining=data["monthly_remaining"],
                manual_credits=data["manual_credits"],
                total_remaining=data["total_remaining"],
                next_reset_at=data.get("next_reset_at"),
                percentage_used=round(percentage_used, 2)
            )
            
        except Exception as e:
            logger.error(f"Failed to get user credits: {e}")
            return None
    
    async def check_sufficient_credits(
        self,
        user_id: UUID,
        feature: str,
        required_credits: Optional[int] = None,
        **kwargs
    ) -> CreditCheckResponse:
        """
        크레딧 충분한지 확인
        
        Args:
            user_id: 사용자 ID
            feature: 기능 이름
            required_credits: 필요한 크레딧 (None이면 자동 계산)
            **kwargs: 크레딧 계산용 파라미터
            
        Returns:
            CreditCheckResponse: 체크 결과
        """
        # 크레딧 시스템이 비활성화면 항상 통과
        if not settings.CREDIT_SYSTEM_ENABLED:
            return CreditCheckResponse(
                sufficient=True,
                current_credits=-1,
                required_credits=0,
                shortage=0,
                is_god_tier=False
            )
        
        try:
            # 필요한 크레딧 계산
            if required_credits is None:
                required_credits = calculate_feature_credits(feature, **kwargs)
            
            # DB 함수 호출
            response = self.supabase.rpc(
                "check_sufficient_credits",
                {
                    "p_user_id": str(user_id),
                    "p_required_credits": required_credits
                }
            ).execute()
            
            result = response.data
            
            # 🆕 result가 None이거나 비어있는 경우 처리
            if not result:
                logger.warning(f"No credit data found for user {user_id}. User credits record may not exist.")
                # user_credits 레코드가 없는 경우 - STRICT 모드 확인
                if settings.CREDIT_CHECK_STRICT:
                    return CreditCheckResponse(
                        sufficient=False,
                        current_credits=0,
                        required_credits=required_credits,
                        shortage=required_credits,
                        is_god_tier=False
                    )
                else:
                    # 느슨한 모드: 통과
                    return CreditCheckResponse(
                        sufficient=True,
                        current_credits=-1,
                        required_credits=required_credits,
                        shortage=0,
                        is_god_tier=False
                    )
            
            return CreditCheckResponse(
                sufficient=result["sufficient"],
                current_credits=result["current_credits"],
                monthly_remaining=result.get("monthly_remaining"),
                manual_credits=result.get("manual_credits"),
                required_credits=result["required_credits"],
                shortage=result["shortage"],
                tier=result.get("tier"),
                next_reset=result.get("next_reset"),
                is_god_tier=result.get("is_god_tier", False)
            )
            
        except Exception as e:
            logger.error(f"Failed to check credits: {e}")
            # 에러 시 STRICT 모드에 따라 처리
            if settings.CREDIT_CHECK_STRICT:
                return CreditCheckResponse(
                    sufficient=False,
                    current_credits=0,
                    required_credits=required_credits,
                    shortage=required_credits,
                    is_god_tier=False
                )
            else:
                # 느슨한 모드: 통과
                return CreditCheckResponse(
                    sufficient=True,
                    current_credits=-1,
                    required_credits=required_credits,
                    shortage=0,
                    is_god_tier=False
                )
    
    async def deduct_credits(
        self,
        user_id: UUID,
        feature: str,
        credits_amount: int,
        metadata: dict = None
    ) -> Optional[UUID]:
        """
        크레딧 차감
        
        Args:
            user_id: 사용자 ID
            feature: 기능 이름
            credits_amount: 차감할 크레딧
            metadata: 메타데이터
            
        Returns:
            UUID: 트랜잭션 ID
        """
        # 크레딧 자동 차감이 비활성화면 스킵
        if not settings.CREDIT_AUTO_DEDUCT:
            logger.info(f"Credit auto-deduct disabled. Skipping deduction for user {user_id}")
            return None
        
        try:
            response = self.supabase.rpc(
                "deduct_user_credits",
                {
                    "p_user_id": str(user_id),
                    "p_feature": feature,
                    "p_credits_amount": credits_amount,
                    "p_metadata": metadata or {}
                }
            ).execute()
            
            transaction_id = response.data
            logger.info(f"Credits deducted: user={user_id}, feature={feature}, amount={credits_amount}, tx={transaction_id}")
            
            return UUID(transaction_id) if transaction_id else None
            
        except Exception as e:
            logger.error(f"Failed to deduct credits: {e}")
            raise
    
    async def charge_manual_credits(
        self,
        user_id: UUID,
        credits_amount: int,
        payment_id: Optional[UUID] = None
    ) -> Optional[UUID]:
        """
        수동 충전 크레딧 추가
        
        Args:
            user_id: 사용자 ID
            credits_amount: 충전할 크레딧
            payment_id: 결제 ID
            
        Returns:
            UUID: 트랜잭션 ID
        """
        try:
            response = self.supabase.rpc(
                "charge_manual_credits",
                {
                    "p_user_id": str(user_id),
                    "p_credits_amount": credits_amount,
                    "p_payment_id": str(payment_id) if payment_id else None
                }
            ).execute()
            
            transaction_id = response.data
            logger.info(f"Credits charged: user={user_id}, amount={credits_amount}, tx={transaction_id}")
            
            return UUID(transaction_id) if transaction_id else None
            
        except Exception as e:
            logger.error(f"Failed to charge credits: {e}")
            raise
    
    async def get_credit_transactions(
        self,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0
    ) -> List[CreditTransaction]:
        """
        크레딧 트랜잭션 내역 조회
        
        Args:
            user_id: 사용자 ID
            limit: 조회 개수
            offset: 오프셋
            
        Returns:
            List[CreditTransaction]: 트랜잭션 목록
        """
        try:
            response = self.supabase.table("credit_transactions")\
                .select("*")\
                .eq("user_id", str(user_id))\
                .order("created_at", desc=True)\
                .range(offset, offset + limit - 1)\
                .execute()
            
            transactions = []
            for data in response.data:
                transactions.append(CreditTransaction(**data))
            
            return transactions
            
        except Exception as e:
            logger.error(f"Failed to get transactions: {e}")
            return []
    
    async def reset_monthly_credits(self, user_id: UUID) -> bool:
        """
        월 구독 크레딧 리셋
        
        Args:
            user_id: 사용자 ID
            
        Returns:
            bool: 성공 여부
        """
        try:
            self.supabase.rpc(
                "reset_monthly_credits",
                {"p_user_id": str(user_id)}
            ).execute()
            
            logger.info(f"Monthly credits reset: user={user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to reset credits: {e}")
            return False
    
    async def init_user_credits(
        self,
        user_id: UUID,
        tier: str = "free",
        reset_date: int = 1
    ) -> Optional[UUID]:
        """
        사용자 크레딧 초기화
        
        Args:
            user_id: 사용자 ID
            tier: Tier
            reset_date: 리셋 날짜 (1-31)
            
        Returns:
            UUID: 크레딧 레코드 ID
        """
        try:
            response = self.supabase.rpc(
                "init_user_credits",
                {
                    "p_user_id": str(user_id),
                    "p_tier": tier,
                    "p_reset_date": reset_date
                }
            ).execute()
            
            credits_id = response.data
            logger.info(f"User credits initialized: user={user_id}, tier={tier}")
            
            return UUID(credits_id) if credits_id else None
            
        except Exception as e:
            logger.error(f"Failed to init credits: {e}")
            return None
    
    async def get_tier_quotas(self, tier: str) -> Optional[TierQuotas]:
        """
        Tier별 쿼터 조회
        
        Args:
            tier: Tier 이름
            
        Returns:
            TierQuotas: 쿼터 정보
        """
        try:
            response = self.supabase.rpc(
                "get_tier_quotas",
                {"p_tier": tier}
            ).execute()
            
            quotas = response.data
            return TierQuotas(
                tier=tier,
                monthly_credits=quotas["monthly_credits"],
                max_stores=quotas["max_stores"],
                max_keywords=quotas["max_keywords"],
                max_auto_collection=quotas["max_auto_collection"]
            )
            
        except Exception as e:
            logger.error(f"Failed to get tier quotas: {e}")
            return None


# 싱글톤 인스턴스
credit_service = CreditService()
