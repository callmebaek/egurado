"""
Credit System Pydantic Models
크레딧 시스템 관련 데이터 모델
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, date
from uuid import UUID


# ============================================
# User Credits Models
# ============================================

class UserCredits(BaseModel):
    """사용자 크레딧 정보"""
    id: UUID
    user_id: UUID
    tier: Literal["free", "basic", "basic_plus", "pro", "custom", "god"]
    
    # 월 구독 크레딧
    monthly_credits: int = Field(description="Tier별 월 할당 크레딧")
    monthly_used: int = Field(description="이번 달 사용한 크레딧")
    monthly_remaining: int = Field(description="월 구독 크레딧 잔액 (읽기 전용)")
    
    # 수동 충전 크레딧
    manual_credits: int = Field(description="수동 충전 크레딧 (이월 가능)")
    
    # 전체 잔액
    total_remaining: int = Field(description="전체 크레딧 잔액 (읽기 전용)")
    
    # 리셋 정보
    reset_date: int = Field(description="매월 리셋 날짜 (1-31)")
    last_reset_at: Optional[datetime] = Field(description="마지막 리셋 시각")
    next_reset_at: Optional[datetime] = Field(description="다음 리셋 예정 시각")
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserCreditsResponse(BaseModel):
    """크레딧 조회 응답"""
    user_id: UUID
    tier: str
    monthly_credits: int
    monthly_used: int
    monthly_remaining: int
    manual_credits: int
    total_remaining: int
    next_reset_at: Optional[datetime]
    percentage_used: float = Field(description="사용률 (%)")


# ============================================
# Credit Transaction Models
# ============================================

class CreditTransaction(BaseModel):
    """크레딧 트랜잭션"""
    id: UUID
    user_id: UUID
    transaction_type: Literal["deduct", "charge", "refund", "reset"]
    feature: Optional[str] = Field(None, description="기능 이름 (차감 시)")
    credits_amount: int = Field(description="양수: 충전/환불, 음수: 차감")
    from_monthly: int = Field(0, description="월 구독에서 차감/충전")
    from_manual: int = Field(0, description="수동 충전에서 차감/충전")
    balance_before: Optional[int]
    balance_after: Optional[int]
    status: Literal["pending", "completed", "failed", "refunded"]
    metadata: dict = Field(default_factory=dict)
    payment_id: Optional[UUID] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CreditCheckRequest(BaseModel):
    """크레딧 체크 요청"""
    feature: str = Field(description="기능 이름")
    estimated_credits: int = Field(description="예상 크레딧 소비량")


class CreditCheckResponse(BaseModel):
    """크레딧 체크 응답"""
    sufficient: bool = Field(description="크레딧 충분 여부")
    current_credits: int = Field(description="현재 크레딧 잔액")
    monthly_remaining: Optional[int] = Field(default=None, description="월 구독 크레딧 잔액")
    manual_credits: Optional[int] = Field(default=None, description="수동 충전 크레딧")
    required_credits: int = Field(description="필요한 크레딧")
    shortage: int = Field(description="부족한 크레딧 (0이면 충분)")
    tier: Optional[str] = Field(default=None, description="사용자 Tier")
    next_reset: Optional[datetime] = Field(default=None, description="다음 리셋일")
    is_god_tier: bool = Field(default=False, description="God Tier 여부")


class CreditDeductRequest(BaseModel):
    """크레딧 차감 요청"""
    feature: str = Field(description="기능 이름")
    credits_amount: int = Field(description="차감할 크레딧")
    metadata: dict = Field(default_factory=dict, description="메타데이터")


class CreditChargeRequest(BaseModel):
    """크레딧 충전 요청"""
    credits_amount: int = Field(description="충전할 크레딧")
    payment_id: Optional[UUID] = None


# ============================================
# Subscription Models
# ============================================

class Subscription(BaseModel):
    """구독 정보"""
    id: UUID
    user_id: UUID
    tier: Literal["free", "basic", "basic_plus", "pro", "custom", "god"]
    status: Literal["active", "cancelled", "expired", "paused"]
    started_at: datetime
    expires_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    payment_method: Optional[str] = None
    auto_renewal: bool = False
    next_billing_date: Optional[date] = None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    
    # Tier별 할당량 정보 (프론트엔드 호환성)
    monthly_credits: int = 0
    max_stores: int = 0
    max_keywords: int = 0
    max_auto_collection: int = 0

    class Config:
        from_attributes = True


class SubscriptionCreateRequest(BaseModel):
    """구독 생성 요청"""
    tier: Literal["basic", "basic_plus", "pro", "custom"]
    payment_method: str = Field(description="결제 수단")
    auto_renewal: bool = Field(True, description="자동 갱신 여부")


class SubscriptionUpdateRequest(BaseModel):
    """구독 업데이트 요청"""
    tier: Optional[Literal["basic", "basic_plus", "pro", "custom"]] = None
    auto_renewal: Optional[bool] = None
    status: Optional[Literal["active", "cancelled", "paused"]] = None


class TierUpgradeRequest(BaseModel):
    """Tier 업그레이드 요청"""
    new_tier: Literal["basic", "basic_plus", "pro", "custom"]
    payment_id: Optional[UUID] = None


# ============================================
# Payment Models
# ============================================

class Payment(BaseModel):
    """결제 정보"""
    id: UUID
    user_id: UUID
    subscription_id: Optional[UUID] = None
    order_id: str = Field(description="주문 ID (우리 시스템)")
    order_name: str = Field(description="주문 이름")
    payment_key: Optional[str] = Field(None, description="Toss Payment Key")
    amount: int = Field(description="결제 금액 (원)")
    currency: str = Field("KRW")
    method: Optional[str] = Field(None, description="결제 수단")
    easy_pay_provider: Optional[str] = Field(None, description="간편결제 제공자")
    card_company: Optional[str] = None
    card_number: Optional[str] = Field(None, description="마스킹된 카드번호")
    status: Literal["pending", "in_progress", "done", "cancelled", "aborted", "failed"]
    payment_type: Literal["subscription", "credit_package", "one_time"]
    requested_at: datetime
    approved_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    toss_response: dict = Field(default_factory=dict)
    cancel_reason: Optional[str] = None
    cancel_amount: Optional[int] = None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaymentCreateRequest(BaseModel):
    """결제 생성 요청"""
    order_name: str = Field(description="주문 이름")
    amount: int = Field(description="결제 금액")
    payment_type: Literal["subscription", "credit_package", "one_time"]
    subscription_id: Optional[UUID] = None
    metadata: dict = Field(default_factory=dict)


class TossPaymentRequest(BaseModel):
    """Toss Payment 승인 요청"""
    payment_key: str
    order_id: str
    amount: int


class TossPaymentCallbackRequest(BaseModel):
    """Toss Payment 콜백 데이터"""
    payment_key: str
    order_id: str
    amount: int


# ============================================
# Credit Package Models
# ============================================

class CreditPackage(BaseModel):
    """크레딧 패키지"""
    id: UUID
    name: str
    display_name: str
    description: Optional[str] = None
    credits: int = Field(description="지급되는 크레딧")
    price: Optional[int] = Field(None, description="가격 (원), None이면 Coming Soon")
    original_price: Optional[int] = None
    discount_rate: int = Field(0, description="할인율 (%)")
    bonus_credits: int = Field(0, description="보너스 크레딧")
    is_popular: bool = False
    display_order: int = 0
    is_active: bool = True
    metadata: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CreditPackageResponse(BaseModel):
    """크레딧 패키지 응답"""
    id: UUID
    name: str
    display_name: str
    description: Optional[str]
    credits: int
    total_credits: int = Field(description="보너스 포함 총 크레딧")
    price: Optional[int]
    original_price: Optional[int]
    discount_rate: int
    is_popular: bool
    is_coming_soon: bool = Field(description="가격 미정 여부")


# ============================================
# Tier Quotas Models
# ============================================

class TierQuotas(BaseModel):
    """Tier별 쿼터"""
    tier: Literal["free", "basic", "basic_plus", "pro", "custom", "god"]
    monthly_credits: int
    max_stores: int
    max_keywords: int
    max_auto_collection: int


class TierQuotasResponse(BaseModel):
    """Tier별 쿼터 응답 (전체 Tier 비교용)"""
    tiers: list[TierQuotas]


# ============================================
# Billing Key Models
# ============================================

class BillingKey(BaseModel):
    """빌링키 정보"""
    id: UUID
    user_id: UUID
    billing_key: str
    customer_key: str
    method: str = "card"
    card_company: Optional[str] = None
    card_number: Optional[str] = None
    card_type: Optional[str] = None
    is_active: bool = True
    authenticated_at: Optional[datetime] = None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BillingKeyIssueRequest(BaseModel):
    """빌링키 발급 요청 (프론트엔드에서 authKey 전달)"""
    auth_key: str = Field(description="결제위젯에서 받은 인증키")
    customer_key: str = Field(description="고객 고유 식별자")


class BillingKeyResponse(BaseModel):
    """빌링키 발급 응답"""
    success: bool
    billing_key_id: Optional[UUID] = None
    card_company: Optional[str] = None
    card_number: Optional[str] = None
    message: Optional[str] = None


# ============================================
# Coupon Models
# ============================================

class Coupon(BaseModel):
    """쿠폰 정보"""
    id: UUID
    code: str
    name: str
    description: Optional[str] = None
    discount_type: str = "percentage"
    discount_value: int
    applicable_tiers: Optional[list[str]] = None
    max_uses: Optional[int] = None
    current_uses: int = 0
    max_uses_per_user: int = 1
    is_active: bool = True
    is_permanent: bool = True
    duration_months: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    created_by: Optional[UUID] = None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CouponCreateRequest(BaseModel):
    """쿠폰 생성 요청"""
    code: Optional[str] = Field(None, description="쿠폰 코드 (미입력 시 자동 생성)")
    name: str = Field(description="쿠폰 이름")
    description: Optional[str] = None
    discount_type: str = Field("percentage", description="할인 유형: percentage, fixed")
    discount_value: int = Field(description="할인 값 (% 또는 원)")
    applicable_tiers: Optional[list[str]] = None
    max_uses: Optional[int] = Field(None, description="총 사용 가능 횟수")
    max_uses_per_user: int = Field(1, description="사용자당 사용 가능 횟수")
    is_permanent: bool = Field(True, description="영구 할인 여부")
    duration_months: Optional[int] = Field(None, description="할인 적용 기간 (개월)")
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None


class CouponUpdateRequest(BaseModel):
    """쿠폰 수정 요청"""
    name: Optional[str] = None
    description: Optional[str] = None
    discount_value: Optional[int] = None
    is_active: Optional[bool] = None
    max_uses: Optional[int] = None
    valid_until: Optional[datetime] = None


class CouponValidateRequest(BaseModel):
    """쿠폰 검증 요청"""
    code: str = Field(description="쿠폰 코드")
    tier: str = Field(description="적용할 Tier")


class CouponValidateResponse(BaseModel):
    """쿠폰 검증 응답"""
    valid: bool
    coupon_id: Optional[UUID] = None
    discount_type: Optional[str] = None
    discount_value: Optional[int] = None
    discounted_amount: Optional[int] = None
    original_amount: Optional[int] = None
    message: Optional[str] = None


class UserCoupon(BaseModel):
    """사용자 쿠폰 사용 정보"""
    id: UUID
    user_id: UUID
    coupon_id: UUID
    subscription_id: Optional[UUID] = None
    applied_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool = True
    discount_type: str
    discount_value: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Checkout / Payment Flow Models
# ============================================

class CheckoutRequest(BaseModel):
    """결제 체크아웃 요청"""
    tier: str = Field(description="구독할 Tier")
    coupon_code: Optional[str] = Field(None, description="쿠폰 코드")
    agree_terms: bool = Field(description="이용약관 동의")
    agree_privacy: bool = Field(description="개인정보처리방침 동의")
    agree_refund: bool = Field(description="환불정책 동의")
    agree_payment: bool = Field(description="정기결제 동의")


class CheckoutResponse(BaseModel):
    """결제 체크아웃 응답"""
    order_id: str
    order_name: str
    amount: int
    original_amount: int
    discount_amount: int = 0
    upgrade_deduction: int = 0  # 업그레이드 시 현재 플랜 차액 공제
    current_tier: Optional[str] = None  # 현재 플랜 tier
    current_tier_price: int = 0  # 현재 플랜 가격
    coupon_applied: bool = False
    coupon_code: Optional[str] = None
    customer_key: str
    tier: str
    is_upgrade: bool = False


class PaymentConfirmRequest(BaseModel):
    """결제 승인 확인 요청 (프론트엔드에서 결제 완료 후) - 레거시"""
    payment_key: str = Field(description="토스 결제키")
    order_id: str = Field(description="주문 ID")
    amount: int = Field(description="결제 금액")


class BillingConfirmRequest(BaseModel):
    """빌링키 발급 + 첫 결제 통합 요청 (정기결제용)"""
    auth_key: str = Field(description="requestBillingAuth에서 받은 인증키")
    customer_key: str = Field(description="고객 고유 식별자")
    order_id: str = Field(description="체크아웃에서 생성된 주문 ID")


class SubscriptionCancelRequest(BaseModel):
    """구독 취소 요청"""
    reason: Optional[str] = Field(None, description="취소 사유")
    keep_store_ids: list[str] = Field(default_factory=list, description="유지할 매장 ID 목록")
    keep_keyword_ids: list[str] = Field(default_factory=list, description="유지할 키워드 ID 목록")
