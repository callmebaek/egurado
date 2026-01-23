-- test@example.com 계정 완전 삭제 및 재생성

-- 1단계: profiles 테이블에서 삭제
DELETE FROM public.profiles WHERE email = 'test@example.com';

-- 2단계: auth.users에서 삭제 (Supabase Dashboard > Authentication > Users에서 수동 삭제 필요)
-- 또는 SQL Editor에서 다음 명령 실행:
-- DELETE FROM auth.users WHERE email = 'test@example.com';

-- 3단계: 재생성은 회원가입 기능을 통해 진행
-- 이메일: test@example.com
-- 비밀번호: asdf1234
-- 이름: 테스터

-- 또는 직접 SQL로 생성하려면:
-- ⚠️ 주의: 이 방법은 권장하지 않습니다. 회원가입 API를 사용하세요.
