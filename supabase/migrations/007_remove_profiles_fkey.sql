-- 소셜 로그인 지원을 위해 profiles 테이블의 auth.users 외래키 제약조건 제거
-- 이제 profiles는 auth.users와 독립적으로 관리됩니다

-- 기존 외래키 제약조건 제거
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 주석 추가
COMMENT ON COLUMN profiles.id IS '사용자 고유 ID (auth.users와 연동되지 않음, 소셜 로그인 지원)';
