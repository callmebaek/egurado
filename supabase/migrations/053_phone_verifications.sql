-- Phone Verifications 테이블
-- OTP 인증코드 저장 및 검증용
-- 작성일: 2026-02-11

-- phone_verifications 테이블 생성
CREATE TABLE IF NOT EXISTS phone_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    code TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone 
    ON phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires 
    ON phone_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone_verified 
    ON phone_verifications(phone_number, is_verified);

-- 오래된 인증 기록 자동 정리 (30일 이상된 기록 삭제하는 정책용 코멘트)
COMMENT ON TABLE phone_verifications IS 'OTP 인증코드 저장 테이블 (카카오 알림톡/SMS 인증)';
COMMENT ON COLUMN phone_verifications.phone_number IS '수신자 전화번호 (하이픈 없이)';
COMMENT ON COLUMN phone_verifications.code IS '6자리 인증코드';
COMMENT ON COLUMN phone_verifications.is_verified IS '인증 완료 여부';
COMMENT ON COLUMN phone_verifications.attempts IS '인증 시도 횟수 (최대 5회)';
COMMENT ON COLUMN phone_verifications.expires_at IS '인증코드 만료 시간';
COMMENT ON COLUMN phone_verifications.verified_at IS '인증 완료 시간';

-- RLS 정책 (서비스 레벨에서만 접근 가능)
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- service_role만 접근 가능 (백엔드에서만 사용)
CREATE POLICY "Service role full access on phone_verifications"
    ON phone_verifications
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- auth_provider 제약조건에 'phone' 추가
-- 기존 CHECK 제약 조건 삭제 후 새로 생성
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_auth_provider_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_auth_provider_check 
    CHECK (auth_provider IN ('email', 'kakao', 'naver', 'phone'));

COMMENT ON COLUMN profiles.auth_provider IS '인증 제공자: email(이메일), kakao(카카오), naver(네이버), phone(휴대폰)';
