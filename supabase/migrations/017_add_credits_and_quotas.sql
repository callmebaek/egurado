-- ============================================
-- 크레딧 및 쿼터 필드 추가
-- Tier별 사용량 제한 및 크레딧 시스템 구현
-- ============================================

-- profiles 테이블에 크레딧 및 쿼터 필드 추가
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS total_credits INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS used_credits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_stores INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_keywords INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_trackers INTEGER DEFAULT 3;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);

-- 코멘트 추가 (문서화)
COMMENT ON COLUMN profiles.total_credits IS '전체 할당 크레딧 (Tier별로 다름)';
COMMENT ON COLUMN profiles.used_credits IS '사용한 크레딧';
COMMENT ON COLUMN profiles.max_stores IS '최대 등록 가능 매장 수 (Tier별로 다름)';
COMMENT ON COLUMN profiles.max_keywords IS '최대 등록 가능 키워드 수 (Tier별로 다름)';
COMMENT ON COLUMN profiles.max_trackers IS '최대 추적 가능 키워드 수 (Tier별로 다름)';

-- 기존 사용자의 Tier별 기본값 설정
-- free tier: 크레딧 1000, 매장 1개, 키워드 10개, 추적 3개
UPDATE profiles
SET 
  total_credits = 1000,
  used_credits = 0,
  max_stores = 1,
  max_keywords = 10,
  max_trackers = 3
WHERE subscription_tier = 'free' AND total_credits IS NULL;

-- basic tier: 크레딧 5000, 매장 3개, 키워드 50개, 추적 10개
UPDATE profiles
SET 
  total_credits = 5000,
  used_credits = 0,
  max_stores = 3,
  max_keywords = 50,
  max_trackers = 10
WHERE subscription_tier = 'basic' AND total_credits IS NULL;

-- pro tier: 크레딧 20000, 매장 10개, 키워드 200개, 추적 50개
UPDATE profiles
SET 
  total_credits = 20000,
  used_credits = 0,
  max_stores = 10,
  max_keywords = 200,
  max_trackers = 50
WHERE subscription_tier = 'pro' AND total_credits IS NULL;

-- god tier: 크레딧 무제한(-1), 매장 무제한(-1), 키워드 무제한(-1), 추적 무제한(-1)
UPDATE profiles
SET 
  total_credits = -1,
  used_credits = 0,
  max_stores = -1,
  max_keywords = -1,
  max_trackers = -1
WHERE subscription_tier = 'god' AND total_credits IS NULL;

-- 크레딧 및 쿼터 체크 함수 생성
CREATE OR REPLACE FUNCTION check_user_quota(
  p_user_id uuid,
  p_quota_type text -- 'stores', 'keywords', 'trackers'
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_count integer;
  v_max_count integer;
  v_tier text;
BEGIN
  -- 사용자 Tier 및 최대값 조회
  SELECT subscription_tier INTO v_tier FROM profiles WHERE id = p_user_id;
  
  -- god tier는 무제한
  IF v_tier = 'god' THEN
    RETURN true;
  END IF;
  
  -- 쿼터 타입별 체크
  IF p_quota_type = 'stores' THEN
    SELECT COUNT(*) INTO v_current_count FROM stores WHERE user_id = p_user_id;
    SELECT max_stores INTO v_max_count FROM profiles WHERE id = p_user_id;
  ELSIF p_quota_type = 'keywords' THEN
    SELECT COUNT(*) INTO v_current_count FROM keywords k
    JOIN stores s ON s.id = k.store_id
    WHERE s.user_id = p_user_id;
    SELECT max_keywords INTO v_max_count FROM profiles WHERE id = p_user_id;
  ELSIF p_quota_type = 'trackers' THEN
    SELECT COUNT(*) INTO v_current_count FROM metric_trackers WHERE user_id = p_user_id;
    SELECT max_trackers INTO v_max_count FROM profiles WHERE id = p_user_id;
  ELSE
    RETURN false;
  END IF;
  
  -- 현재 사용량이 최대값보다 작으면 true
  RETURN v_current_count < v_max_count;
END;
$$;

-- 크레딧 차감 함수 생성
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id uuid,
  p_amount integer
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_credits integer;
  v_used_credits integer;
  v_tier text;
BEGIN
  -- 사용자 크레딧 정보 조회
  SELECT total_credits, used_credits, subscription_tier 
  INTO v_total_credits, v_used_credits, v_tier
  FROM profiles 
  WHERE id = p_user_id;
  
  -- god tier는 크레딧 무제한
  IF v_tier = 'god' OR v_total_credits = -1 THEN
    RETURN true;
  END IF;
  
  -- 잔여 크레딧 확인
  IF (v_total_credits - v_used_credits) < p_amount THEN
    RETURN false;
  END IF;
  
  -- 크레딧 차감
  UPDATE profiles
  SET used_credits = used_credits + p_amount
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION check_user_quota(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION check_user_quota(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_credits(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION deduct_credits(uuid, integer) TO authenticated;

-- 코멘트 추가
COMMENT ON FUNCTION check_user_quota IS '사용자의 쿼터(매장/키워드/추적) 제한 확인';
COMMENT ON FUNCTION deduct_credits IS '사용자의 크레딧 차감';
