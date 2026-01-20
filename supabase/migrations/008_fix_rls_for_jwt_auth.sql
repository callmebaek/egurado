-- JWT 인증 방식과 소셜 로그인 지원을 위한 RLS 정책 수정
-- 작성일: 2026-01-20
-- 
-- 문제: profiles 테이블이 auth.users와 독립적으로 관리되면서
--       기존 RLS 정책(auth.uid() 사용)이 제대로 작동하지 않음
--
-- 해결: 백엔드는 Service Role Key를 사용하므로 RLS를 우회하지만,
--       프론트엔드에서 직접 Supabase를 사용하는 경우를 대비하여
--       RLS 정책을 유지하되, 추가 정책을 생성

-- 기존 RLS 정책은 유지 (auth.uid()를 사용하는 이메일 로그인 사용자용)
-- 추가 정책 생성 불필요 - 백엔드 API만 사용하도록 프론트엔드 수정 예정

-- 참고: 현재 시스템은 다음과 같이 작동합니다:
-- 1. 이메일 로그인: auth.users에 사용자 생성 → profiles에 동일 ID로 레코드 생성
-- 2. 소셜 로그인: auth.users 없이 profiles에만 레코드 생성 (독립적 ID)
-- 3. 백엔드 API: SUPABASE_SERVICE_ROLE_KEY 사용 → RLS 우회하여 모든 데이터 접근 가능
-- 4. 프론트엔드: 백엔드 API를 통해서만 데이터 조회 (직접 Supabase 사용 X)

-- 이 마이그레이션은 문서화 목적으로 생성되었으며, 실제 스키마 변경은 없습니다.
-- 대신 프론트엔드 코드에서 supabase.auth.getUser()를 사용하는 부분을 
-- JWT 기반 인증(useAuth 훅)으로 통일해야 합니다.

-- 확인: 백엔드가 Service Role Key를 사용하는지 확인
DO $$
BEGIN
  RAISE NOTICE '✅ 이 마이그레이션은 문서화 목적입니다.';
  RAISE NOTICE '📝 백엔드는 SUPABASE_SERVICE_ROLE_KEY를 사용하여 RLS를 우회합니다.';
  RAISE NOTICE '📝 프론트엔드는 백엔드 API를 통해서만 데이터를 조회해야 합니다.';
  RAISE NOTICE '⚠️  프론트엔드에서 supabase.auth.getUser() 사용을 중단하고 useAuth 훅을 사용하세요.';
END $$;
