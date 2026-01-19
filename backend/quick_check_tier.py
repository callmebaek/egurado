"""
빠른 tier 확인 스크립트
"""
import os
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "your-key")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 60)
print("사용자 Tier 빠른 확인")
print("=" * 60)

# 모든 사용자 조회
result = supabase.table("profiles").select("id, email, subscription_tier").execute()

for user in result.data:
    tier = user.get("subscription_tier", "N/A")
    tier_lower = tier.lower() if tier else "N/A"
    
    limits = {"free": 1, "basic": 10, "pro": 50}
    limit = limits.get(tier_lower, "?")
    
    print(f"\n이메일: {user['email']}")
    print(f"Tier (원본): '{tier}'")
    print(f"Tier (소문자): '{tier_lower}'")
    print(f"키워드 제한: {limit}개")
    
    if tier_lower not in limits:
        print(f"⚠️ 경고: '{tier}'는 올바른 tier가 아닙니다!")
        print(f"   올바른 값: free, basic, pro")

print("\n" + "=" * 60)
