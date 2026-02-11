-- profiles.phone_number UNIQUE 제약조건 추가
-- 1인 1계정 정책: 하나의 전화번호로 하나의 계정만 허용
-- 작성일: 2026-02-11

-- NULL 값은 UNIQUE 제약조건에서 제외됨 (여러 NULL 허용)
-- 기존 소셜 로그인 사용자 중 phone_number가 NULL인 경우 영향 없음

-- 기존 중복 전화번호가 있는지 확인 (안전장치)
-- 중복이 있으면 마이그레이션 실패하도록 의도적으로 설계
ALTER TABLE profiles 
    ADD CONSTRAINT profiles_phone_number_unique UNIQUE (phone_number);

COMMENT ON CONSTRAINT profiles_phone_number_unique ON profiles 
    IS '1인 1계정 정책: 하나의 전화번호로 하나의 계정만 생성 가능';
