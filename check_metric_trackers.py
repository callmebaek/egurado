#!/usr/bin/env python3
"""
metric_trackers 데이터 확인 스크립트
"""
import os
import sys
from supabase import create_client

# user_id
USER_ID = "2b19b314-d7ce-44c2-8755-374e63938c87"

def main():
    # Supabase 클라이언트 생성
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.")
        sys.exit(1)
    
    supabase = create_client(supabase_url, supabase_key)
    
    print(f"🔍 user_id: {USER_ID} 의 metric_trackers 데이터 확인 중...\n")
    
    # 1. metric_trackers 조회 (RLS 우회)
    print("=" * 80)
    print("1. metric_trackers 테이블 직접 조회 (RLS 우회)")
    print("=" * 80)
    try:
        result = supabase.table("metric_trackers").select(
            "*"
        ).eq("user_id", USER_ID).execute()
        
        print(f"✅ 조회 성공: {len(result.data) if result.data else 0}개 발견")
        if result.data:
            for idx, tracker in enumerate(result.data, 1):
                print(f"\n  [{idx}] ID: {tracker.get('id')}")
                print(f"      Store ID: {tracker.get('store_id')}")
                print(f"      Keyword ID: {tracker.get('keyword_id')}")
                print(f"      Status: {tracker.get('status')}")
                print(f"      Created: {tracker.get('created_at')}")
        else:
            print("  ⚠️  데이터가 없습니다!")
    except Exception as e:
        print(f"❌ 오류: {e}")
    
    # 2. 프론트엔드가 사용하는 쿼리와 동일하게 조회
    print("\n" + "=" * 80)
    print("2. 프론트엔드 쿼리와 동일하게 조회 (stores, keywords 포함)")
    print("=" * 80)
    try:
        result = supabase.table("metric_trackers").select(
            "*,stores(store_name,platform),keywords(keyword)"
        ).eq("user_id", USER_ID).order("created_at", desc=True).execute()
        
        print(f"✅ 조회 성공: {len(result.data) if result.data else 0}개 발견")
        if result.data:
            for idx, tracker in enumerate(result.data, 1):
                store_name = tracker.get('stores', {}).get('store_name', 'N/A') if tracker.get('stores') else 'N/A'
                keyword = tracker.get('keywords', {}).get('keyword', 'N/A') if tracker.get('keywords') else 'N/A'
                print(f"\n  [{idx}] {store_name} - {keyword}")
                print(f"      Status: {tracker.get('status')}")
        else:
            print("  ⚠️  데이터가 없습니다!")
    except Exception as e:
        print(f"❌ 오류: {e}")
    
    # 3. stores 확인
    print("\n" + "=" * 80)
    print("3. stores 테이블 확인")
    print("=" * 80)
    try:
        result = supabase.rpc('get_stores_by_user_id_bypass_rls', {
            'p_user_id': USER_ID
        }).execute()
        
        print(f"✅ 매장 수: {len(result.data) if result.data else 0}개")
        if result.data and len(result.data) > 0:
            print(f"  예시 매장: {result.data[0].get('store_name')} (ID: {result.data[0].get('id')})")
    except Exception as e:
        print(f"❌ 오류: {e}")
    
    # 4. keywords 확인
    print("\n" + "=" * 80)
    print("4. keywords 테이블 확인")
    print("=" * 80)
    try:
        result = supabase.table("keywords").select(
            "*"
        ).eq("user_id", USER_ID).execute()
        
        print(f"✅ 키워드 수: {len(result.data) if result.data else 0}개")
        if result.data and len(result.data) > 0:
            for idx, kw in enumerate(result.data[:5], 1):
                print(f"  [{idx}] {kw.get('keyword')} (ID: {kw.get('id')})")
            if len(result.data) > 5:
                print(f"  ... 외 {len(result.data) - 5}개")
    except Exception as e:
        print(f"❌ 오류: {e}")
    
    print("\n" + "=" * 80)
    print("✅ 확인 완료")
    print("=" * 80)

if __name__ == "__main__":
    main()
