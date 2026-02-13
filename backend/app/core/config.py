"""
Application Configuration
Environment variables and feature flags
"""
import os
from dotenv import load_dotenv
from typing import List

load_dotenv()


class Settings:
    """Application Settings"""
    
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    
    # Naver API
    NAVER_CLIENT_ID: str = os.getenv("NAVER_CLIENT_ID", "")
    NAVER_CLIENT_SECRET: str = os.getenv("NAVER_CLIENT_SECRET", "")
    
    # OpenAI API
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    
    # CORS
    ALLOWED_ORIGINS: List[str] = os.getenv(
        "ALLOWED_ORIGINS", 
        "https://whiplace.com,https://www.whiplace.com"
    ).split(",")
    
    # ============================================
    # Credit System Feature Flags
    # ============================================
    
    # 크레딧 시스템 전체 활성화 여부
    CREDIT_SYSTEM_ENABLED: bool = os.getenv("CREDIT_SYSTEM_ENABLED", "false").lower() == "true"
    
    # 크레딧 체크 엄격 모드
    # true: 크레딧 부족 시 요청 차단
    # false: 크레딧 부족해도 경고만 (로깅)
    CREDIT_CHECK_STRICT: bool = os.getenv("CREDIT_CHECK_STRICT", "false").lower() == "true"
    
    # 크레딧 자동 차감 활성화
    # true: API 성공 시 자동 차감
    # false: 차감 안 함 (테스트 모드)
    CREDIT_AUTO_DEDUCT: bool = os.getenv("CREDIT_AUTO_DEDUCT", "false").lower() == "true"
    
    # ============================================
    # Payment Configuration
    # ============================================
    
    # Toss Payment
    TOSS_CLIENT_KEY: str = os.getenv("TOSS_CLIENT_KEY", "")
    TOSS_SECRET_KEY: str = os.getenv("TOSS_SECRET_KEY", "")
    TOSS_API_URL: str = os.getenv("TOSS_API_URL", "https://api.tosspayments.com")
    TOSS_SUCCESS_URL: str = os.getenv("TOSS_SUCCESS_URL", "https://whiplace.com/payment/success")
    TOSS_FAIL_URL: str = os.getenv("TOSS_FAIL_URL", "https://whiplace.com/payment/fail")
    
    # 프론트엔드 URL (결제 콜백 등에서 사용)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://whiplace.com")
    
    # 결제 연동 활성화 여부
    PAYMENT_ENABLED: bool = os.getenv("PAYMENT_ENABLED", "false").lower() == "true"
    
    # ============================================
    # NHN Cloud Configuration
    # ============================================
    
    # KakaoTalk Bizmessage (알림톡)
    NHN_KAKAO_URL: str = os.getenv("NHN_KAKAO_URL", "https://api-alimtalk.cloud.toast.com")
    NHN_KAKAO_APPKEY: str = os.getenv("NHN_KAKAO_APPKEY", "")
    NHN_KAKAO_SECRET_KEY: str = os.getenv("NHN_KAKAO_SECRET_KEY", "")
    NHN_KAKAO_SENDER_KEY: str = os.getenv("NHN_KAKAO_SENDER_KEY", "")
    
    # SMS 서비스
    NHN_SMS_URL: str = os.getenv("NHN_SMS_URL", "https://api-sms.cloud.toast.com")
    NHN_SMS_APPKEY: str = os.getenv("NHN_SMS_APPKEY", "")
    NHN_SMS_SECRET_KEY: str = os.getenv("NHN_SMS_SECRET_KEY", "")
    NHN_SMS_SENDER_NUMBER: str = os.getenv("NHN_SMS_SENDER_NUMBER", "")
    
    # Email 서비스
    NHN_EMAIL_URL: str = os.getenv("NHN_EMAIL_URL", "https://email.api.nhncloudservice.com")
    NHN_EMAIL_APPKEY: str = os.getenv("NHN_EMAIL_APPKEY", "")
    NHN_EMAIL_SECRET_KEY: str = os.getenv("NHN_EMAIL_SECRET_KEY", "")
    NHN_EMAIL_SENDER: str = os.getenv("NHN_EMAIL_SENDER", "support@whiplace.com")
    
    # 알림톡 템플릿 코드
    KAKAO_TEMPLATE_AUTH_CODE: str = "auth_code"
    KAKAO_TEMPLATE_RANK_ALERT: str = "rank_alert"
    KAKAO_TEMPLATE_RANK_ALERT_V2: str = "rank_alert_v2"
    
    # OTP 설정
    OTP_EXPIRE_MINUTES: int = 3  # OTP 유효 시간 (분)
    OTP_LENGTH: int = 6  # OTP 자릿수


# 싱글톤 인스턴스
settings = Settings()


# Tier별 크레딧 설정
TIER_CREDITS = {
    "free": 100,
    "basic": 600,
    "basic_plus": 1500,
    "pro": 3500,
    "custom": 0,  # 협의
    "god": -1,  # 무제한
}

# Tier별 자동수집 제한
TIER_AUTO_COLLECTION_LIMITS = {
    "free": 0,
    "basic": 3,
    "basic_plus": 8,
    "pro": 20,
    "custom": 0,  # 협의
    "god": -1,  # 무제한
}

# Tier별 월 구독 가격 (원) - TBD는 0으로 설정, 추후 업데이트
TIER_PRICES = {
    "free": 0,
    "basic": 24900,        # ₩24,900/월
    "basic_plus": 37900,   # ₩37,900/월
    "pro": 69900,          # ₩69,900/월
    "custom": 0,           # 협의
    "god": 0,              # 관리자 전용
}

# Tier 등급 순서 (업그레이드 판단용)
TIER_ORDER = {
    "free": 0,
    "basic": 1,
    "basic_plus": 2,
    "pro": 3,
    "custom": 4,
    "god": 5,
}


def get_tier_price(tier: str) -> int:
    """Tier별 월 구독 가격 조회"""
    return TIER_PRICES.get(tier, 0)


def get_tier_order(tier: str) -> int:
    """Tier 등급 순서 조회"""
    return TIER_ORDER.get(tier, 0)

# 기능별 크레딧 소비 (확정된 값)
FEATURE_CREDITS = {
    # 고정 크레딧
    "place_diagnosis": 8,
    "business_description": 10,
    "directions": 10,
    "representative_keyword": 15,
    "rank_check": 5,
    "main_keyword_analysis": 10,
    "place_activation": 15,
    "target_keyword_extraction": 20,
    "review_analysis": 2,  # 리뷰 1개당 2 크레딧 (동적 계산: 리뷰수 × 2)
    "competitor_analysis": 30,
    
    # 동적 크레딧 (건당)
    "ai_reply_generate": 5,
    "ai_reply_post": 8,
    
    # 동적 크레딧 (키워드 수 × 2)
    "keyword_search_volume": 2,  # per keyword
}


def get_tier_credits(tier: str) -> int:
    """Tier별 월 크레딧 조회"""
    return TIER_CREDITS.get(tier, 100)


def get_tier_auto_collection_limit(tier: str) -> int:
    """Tier별 자동수집 키워드 제한 조회"""
    return TIER_AUTO_COLLECTION_LIMITS.get(tier, 0)


def calculate_feature_credits(feature: str, **kwargs) -> int:
    """
    기능별 크레딧 계산
    
    Args:
        feature: 기능 이름
        **kwargs: 기능별 파라미터 (rank, review_count, competitor_count, etc.)
    
    Returns:
        int: 소비될 크레딧 수
    """
    if feature == "rank_check":
        # 순위에 따라 3-10 크레딧
        rank = kwargs.get("rank", 999)
        if rank == -1 or rank > 300:
            return 10  # 순위 없음
        elif rank <= 3:
            return 3  # 1-3위
        elif rank <= 10:
            return 4  # 4-10위
        elif rank <= 30:
            return 5  # 11-30위
        elif rank <= 50:
            return 6  # 31-50위
        elif rank <= 100:
            return 7  # 51-100위
        else:
            return 10  # 101위 이상
    
    elif feature == "target_keyword":
        # 조합 수에 비례
        combination_count = kwargs.get("combination_count", 1)
        return max(12, min(50, 10 + combination_count // 2))
    
    elif feature == "review_analysis":
        # 리뷰 수 × 2 크레딧
        review_count = kwargs.get("review_count", 1)
        return review_count * 2
    
    elif feature == "ai_reply_generate":
        # 답글 수 × 1
        reply_count = kwargs.get("reply_count", 1)
        return reply_count * 1
    
    elif feature == "ai_reply_post":
        # 게시 수 × 2
        post_count = kwargs.get("post_count", 1)
        return post_count * 2
    
    elif feature == "competitor_analysis":
        # 경쟁사 수에 비례
        competitor_count = kwargs.get("competitor_count", 5)
        return max(13, min(30, 10 + competitor_count))
    
    # 고정 크레딧
    elif feature in FEATURE_CREDITS and isinstance(FEATURE_CREDITS[feature], int):
        return FEATURE_CREDITS[feature]
    
    # 기본값
    return 1
