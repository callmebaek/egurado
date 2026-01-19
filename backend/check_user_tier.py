"""
사용자의 구독 tier를 확인하고 수정하는 스크립트
"""
import os
import sys
from supabase import create_client, Client

# Supabase 설정
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "your-service-role-key")

def main():
    # Supabase 클라이언트 생성
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("=" * 60)
    print("사용자 구독 Tier 확인 및 수정 도구")
    print("=" * 60)
    print()
    
    # 모든 사용자 조회
    result = supabase.table("profiles").select("id, email, subscription_tier").execute()
    
    if not result.data:
        print("❌ 사용자를 찾을 수 없습니다.")
        return
    
    print(f"📋 총 {len(result.data)}명의 사용자:")
    print()
    
    for idx, user in enumerate(result.data, 1):
        user_id = user.get("id", "N/A")
        email = user.get("email", "N/A")
        tier = user.get("subscription_tier", "N/A")
        
        # tier별 키워드 제한 표시
        limits = {
            "free": 1,
            "basic": 10,
            "pro": 50
        }
        tier_lower = tier.lower() if tier and tier != "N/A" else "free"
        limit = limits.get(tier_lower, 1)
        
        print(f"{idx}. 이메일: {email}")
        print(f"   User ID: {user_id}")
        print(f"   현재 Tier: '{tier}' (키워드 제한: {limit}개)")
        print()
    
    # 수정할 사용자 선택
    print("-" * 60)
    user_input = input("수정할 사용자 번호를 입력하세요 (취소: Enter): ").strip()
    
    if not user_input:
        print("✅ 종료합니다.")
        return
    
    try:
        selected_idx = int(user_input) - 1
        if selected_idx < 0 or selected_idx >= len(result.data):
            print("❌ 잘못된 번호입니다.")
            return
        
        selected_user = result.data[selected_idx]
        user_id = selected_user["id"]
        current_tier = selected_user.get("subscription_tier", "N/A")
        
        print()
        print(f"선택된 사용자: {selected_user['email']}")
        print(f"현재 Tier: '{current_tier}'")
        print()
        print("새로운 Tier를 입력하세요:")
        print("  - free  (키워드 1개)")
        print("  - basic (키워드 10개)")
        print("  - pro   (키워드 50개)")
        print()
        
        new_tier = input("새 Tier: ").strip().lower()
        
        if new_tier not in ["free", "basic", "pro"]:
            print("❌ 잘못된 tier입니다. (free, basic, pro 중 하나)")
            return
        
        # 확인
        confirm = input(f"\n'{current_tier}' → '{new_tier}'로 변경하시겠습니까? (y/n): ").strip().lower()
        
        if confirm != 'y':
            print("✅ 취소되었습니다.")
            return
        
        # 업데이트 실행
        update_result = supabase.table("profiles").update({
            "subscription_tier": new_tier
        }).eq("id", user_id).execute()
        
        print()
        print(f"✅ 성공! {selected_user['email']}의 tier가 '{new_tier}'로 변경되었습니다.")
        print(f"   키워드 제한: {limits[new_tier]}개")
        
    except ValueError:
        print("❌ 숫자를 입력해주세요.")
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")

if __name__ == "__main__":
    main()
