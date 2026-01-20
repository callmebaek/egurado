# Supabase 마이그레이션 SQL

다음 SQL을 Supabase SQL Editor에서 실행하세요:

```sql
-- 회원가입 및 온보딩 필드 추가
-- 작성일: 2026-01-20

-- profiles 테이블에 인증 및 온보딩 관련 필드 추가
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email' CHECK (auth_provider IN ('email', 'kakao', 'naver')),
ADD COLUMN IF NOT EXISTS user_position TEXT CHECK (user_position IN ('advertiser', 'agency')),
ADD COLUMN IF NOT EXISTS marketing_experience TEXT CHECK (marketing_experience IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN IF NOT EXISTS agency_experience TEXT CHECK (agency_experience IN ('past_used', 'currently_using', 'considering', 'doing_alone')),
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider ON profiles(auth_provider);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);

-- 코멘트 추가 (문서화)
COMMENT ON COLUMN profiles.auth_provider IS '인증 제공자: email(이메일), kakao(카카오), naver(네이버)';
COMMENT ON COLUMN profiles.user_position IS '사용자 포지션: advertiser(사장님/광고주), agency(대행사)';
COMMENT ON COLUMN profiles.marketing_experience IS '마케팅 경험: beginner(초보), intermediate(중급), advanced(고급)';
COMMENT ON COLUMN profiles.agency_experience IS '대행사 경험: past_used(과거 사용), currently_using(현재 사용중), considering(고민중), doing_alone(혼자 진행)';
COMMENT ON COLUMN profiles.onboarding_completed IS '온보딩 완료 여부';
COMMENT ON COLUMN profiles.phone_number IS '전화번호 (선택)';
COMMENT ON COLUMN profiles.profile_image_url IS '프로필 이미지 URL';
```

실행 후 "Success" 메시지가 나오면 완료!
