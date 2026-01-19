"""
현재 로그인한 사용자의 users 테이블 레코드를 생성/확인하는 스크립트
"""
import os
import sys
import io
from supabase import create_client
from dotenv import load_dotenv

# Windows 콘솔 인코딩 설정
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# .env 파일 로드
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
# Service Role Key 또는 Anon Key 사용
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ 환경 변수가 설정되지 않았습니다.")
    print("SUPABASE_URL:", SUPABASE_URL)
    print("SUPABASE_SERVICE_ROLE_KEY:", "설정됨" if os.getenv("SUPABASE_SERVICE_ROLE_KEY") else "없음")
    print("SUPABASE_ANON_KEY:", "설정됨" if os.getenv("SUPABASE_ANON_KEY") else "없음")
    print()
    print("backend/.env 파일에 다음 값 중 하나가 설정되어 있는지 확인해주세요:")
    print("  SUPABASE_SERVICE_ROLE_KEY=... (권장)")
    print("  또는 SUPABASE_ANON_KEY=...")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 70)
print("Users 테이블 레코드 생성/확인 도구")
print("=" * 70)
print()

# 1. 모든 stores 조회 (user_id 확인용)
print("📦 Stores 테이블에서 user_id 확인 중...")
stores_result = supabase.table("stores").select("user_id, store_name").execute()

if not stores_result.data:
    print("❌ Stores 테이블에 데이터가 없습니다.")
    sys.exit(1)

# user_id 수집
user_ids = set()
for store in stores_result.data:
    user_ids.add(store["user_id"])

print(f"✅ {len(user_ids)}명의 사용자 발견")
print()

# 2. 각 user_id에 대해 users 테이블 확인
for user_id in user_ids:
    print("-" * 70)
    print(f"User ID: {user_id}")
    
    # users 테이블에 레코드가 있는지 확인
    user_result = supabase.table("profiles").select("*").eq("id", user_id).execute()
    
    if user_result.data and len(user_result.data) > 0:
        # 레코드가 있음
        user_data = user_result.data[0]
        tier = user_data.get("subscription_tier", "없음")
        print(f"✅ Users 테이블에 레코드 존재")
        print(f"   현재 Tier: '{tier}'")
        
        if not tier or tier == "없음":
            print(f"⚠️ Tier가 설정되지 않았습니다!")
            confirm = input(f"   Tier를 'pro'로 설정하시겠습니까? (y/n): ").strip().lower()
            
            if confirm == 'y':
                supabase.table("profiles").update({
                    "subscription_tier": "pro"
                }).eq("id", user_id).execute()
                print(f"✅ Tier를 'pro'로 업데이트했습니다!")
    else:
        # 레코드가 없음 - 생성 필요
        print(f"❌ Users 테이블에 레코드가 없습니다!")
        print(f"   새 레코드를 생성해야 합니다.")
        
        # auth.users에서 email 가져오기 시도
        try:
            # Service role key로는 auth.users 조회가 제한될 수 있음
            print(f"   Email 정보를 수동으로 입력해주세요.")
            email = input(f"   이메일 주소: ").strip()
            
            if not email:
                print(f"   ⚠️ 이메일이 입력되지 않았습니다. 건너뜁니다.")
                continue
            
            tier = input(f"   Tier (free/basic/pro) [기본값: pro]: ").strip().lower() or "pro"
            
            if tier not in ["free", "basic", "pro"]:
                print(f"   ⚠️ 잘못된 tier입니다. 'pro' 사용")
                tier = "pro"
            
            confirm = input(f"   User ID: {user_id}, Email: {email}, Tier: {tier} 로 생성하시겠습니까? (y/n): ").strip().lower()
            
            if confirm == 'y':
                result = supabase.table("profiles").insert({
                    "id": user_id,
                    "email": email,
                    "subscription_tier": tier,
                    "subscription_status": "active"
                }).execute()
                
                print(f"✅ Users 테이블에 레코드를 생성했습니다!")
                print(f"   ID: {user_id}")
                print(f"   Email: {email}")
                print(f"   Tier: {tier}")
            else:
                print(f"   취소되었습니다.")
        
        except Exception as e:
            print(f"   ❌ 오류 발생: {str(e)}")

print()
print("=" * 70)
print("✅ 작업 완료!")
print()
print("다음 단계:")
print("1. 브라우저에서 Ctrl + Shift + R (하드 리프레시)")
print("2. 콘솔에서 '🔍 원본 tier: \"pro\"' 확인")
print("3. 화면에서 '전체 11/50개' 확인")
print("=" * 70)
