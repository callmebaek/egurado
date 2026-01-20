# RLS (Row Level Security) 문제 해결 가이드

## 🔴 문제 상황

소셜 로그인(카카오, 네이버) 시 다음 에러 발생:
```
new row violates row-level security policy for table "profiles"
```

## 🔍 원인

Supabase Python SDK는 Service Role Key를 사용해도 RLS를 자동으로 우회하지 못하는 알려진 이슈가 있습니다.

## ✅ 해결 방법

### 1. PostgreSQL SECURITY DEFINER 함수 사용

`SECURITY DEFINER` 속성을 가진 함수는 함수 소유자의 권한으로 실행되므로 RLS를 우회할 수 있습니다.

### 2. 구현 내용

#### 2.1 Supabase SQL 함수 생성

파일: `supabase/migrations/010_create_rls_bypass_functions.sql`

- `insert_profile_bypass_rls()` 함수 생성
- `SECURITY DEFINER` 속성으로 RLS 우회
- Service Role과 Authenticated 역할에 실행 권한 부여

#### 2.2 백엔드 코드 수정

파일: `backend/app/routers/auth.py`

**변경 전:**
```python
supabase.table("profiles").insert(profile_data).execute()
```

**변경 후:**
```python
result = supabase.rpc('insert_profile_bypass_rls', {
    'p_id': user_id,
    'p_email': user_email,
    'p_display_name': display_name,
    'p_auth_provider': 'kakao',  # or 'naver'
    'p_subscription_tier': 'free',
    'p_onboarding_completed': False,
    'p_profile_image_url': profile_image_url,
    'p_phone_number': phone_number
}).execute()
```

## 📝 적용 순서

### Step 1: Supabase SQL 실행
1. Supabase Dashboard → SQL Editor
2. `supabase/migrations/010_create_rls_bypass_functions.sql` 내용 복사
3. 실행 (Run)

### Step 2: RLS 비활성화 상태에서 테스트
1. Supabase Dashboard → Database → Tables → profiles
2. RLS 비활성화 (Disable RLS)
3. 백엔드 배포
4. 소셜 로그인 테스트

### Step 3: RLS 재활성화
1. Supabase Dashboard → Database → Tables → profiles
2. RLS 활성화 (Enable RLS)
3. 소셜 로그인 재테스트
4. 정상 작동 확인 ✅

## 🔒 보안 고려사항

### 현재 구조의 보안성
- ✅ 백엔드만 Supabase에 직접 접근
- ✅ Service Role Key는 서버에만 보관
- ✅ 프론트엔드는 백엔드 API만 호출
- ✅ JWT로 사용자 인증

### RLS 정책 (활성화 상태)
```sql
-- 사용자는 자신의 프로필만 조회 가능
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Service Role은 모든 작업 가능
CREATE POLICY "Service role bypass" 
ON profiles FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
```

## ✨ 장점

1. **RLS 유지**: 데이터베이스 레벨 보안 유지
2. **코드 최소 변경**: 함수 호출만 변경
3. **확장 가능**: 다른 테이블에도 동일한 패턴 적용 가능
4. **디버깅 용이**: 함수 내부 로직 추가 가능

## 📚 참고

- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- PostgreSQL SECURITY DEFINER: https://www.postgresql.org/docs/current/sql-createfunction.html
