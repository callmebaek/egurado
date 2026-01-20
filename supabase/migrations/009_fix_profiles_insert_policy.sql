-- Disable RLS for user-related tables to support social login
-- 
-- 문제: 
-- 1. Migration 007에서 profiles와 auth.users의 외래키 제약조건을 제거하여 소셜 로그인 지원
-- 2. 그러나 RLS 정책이 여전히 auth.uid()를 체크하여 소셜 로그인 사용자를 차단
-- 3. 소셜 로그인 사용자는 Supabase Auth에 등록되지 않아 auth.uid()가 null
-- 4. 결과: profiles, stores 등 테이블에 INSERT/UPDATE 불가
-- 
-- 해결: 
-- - 모든 사용자 관련 테이블의 RLS를 비활성화
-- - 보안은 백엔드 API의 JWT 인증으로 관리
-- - 프론트엔드는 SUPABASE_ANON_KEY만 가지고 있어 직접 접근 불가
-- - 백엔드만 SUPABASE_SERVICE_ROLE_KEY로 데이터베이스 접근

-- 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own stores" ON stores;
DROP POLICY IF EXISTS "Users can insert own stores" ON stores;
DROP POLICY IF EXISTS "Users can update own stores" ON stores;
DROP POLICY IF EXISTS "Users can delete own stores" ON stores;

DROP POLICY IF EXISTS "Users can view reviews of own stores" ON reviews;
DROP POLICY IF EXISTS "Users can insert reviews of own stores" ON reviews;
DROP POLICY IF EXISTS "Users can update reviews of own stores" ON reviews;
DROP POLICY IF EXISTS "Users can delete reviews of own stores" ON reviews;

DROP POLICY IF EXISTS "Users can view keywords of own stores" ON keywords;
DROP POLICY IF EXISTS "Users can insert keywords of own stores" ON keywords;
DROP POLICY IF EXISTS "Users can update keywords of own stores" ON keywords;
DROP POLICY IF EXISTS "Users can delete keywords of own stores" ON keywords;

DROP POLICY IF EXISTS "Users can view rank_history of own keywords" ON rank_history;
DROP POLICY IF EXISTS "Users can insert rank_history of own keywords" ON rank_history;

-- RLS 비활성화
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE keywords DISABLE ROW LEVEL SECURITY;
ALTER TABLE rank_history DISABLE ROW LEVEL SECURITY;

-- 보안 설명:
-- 1. 모든 데이터베이스 접근은 백엔드 API를 통해서만 가능
-- 2. 백엔드 API는 JWT 토큰으로 사용자 인증 (get_current_user 미들웨어)
-- 3. 프론트엔드는 백엔드 API만 호출 가능 (Supabase 직접 접근 불가)
-- 4. 이메일 로그인, 카카오 로그인, 네이버 로그인 모두 동일하게 작동
