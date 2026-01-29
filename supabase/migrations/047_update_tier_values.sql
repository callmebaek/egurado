-- ============================================
-- Tier 값 업데이트
-- Basic+ Tier 추가 및 Tier별 쿼터 업데이트
-- ============================================

-- profiles 테이블의 subscription_tier CHECK 제약 조건 업데이트
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_subscription_tier_check 
CHECK (subscription_tier IN ('free', 'basic', 'basic_plus', 'pro', 'custom', 'god'));

-- Tier별 쿼터 업데이트 함수 재정의
CREATE OR REPLACE FUNCTION get_tier_quotas(p_tier text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN CASE p_tier
        WHEN 'free' THEN jsonb_build_object(
            'monthly_credits', 100,
            'max_stores', 1,
            'max_keywords', 1,
            'max_auto_collection', 0
        )
        WHEN 'basic' THEN jsonb_build_object(
            'monthly_credits', 600,
            'max_stores', 3,
            'max_keywords', 10,
            'max_auto_collection', 3
        )
        WHEN 'basic_plus' THEN jsonb_build_object(
            'monthly_credits', 1200,
            'max_stores', 4,
            'max_keywords', 6,
            'max_auto_collection', 6
        )
        WHEN 'pro' THEN jsonb_build_object(
            'monthly_credits', 3000,
            'max_stores', 10,
            'max_keywords', 50,
            'max_auto_collection', 15
        )
        WHEN 'custom' THEN jsonb_build_object(
            'monthly_credits', 5000,
            'max_stores', 20,
            'max_keywords', 100,
            'max_auto_collection', 30
        )
        WHEN 'god' THEN jsonb_build_object(
            'monthly_credits', -1,
            'max_stores', -1,
            'max_keywords', -1,
            'max_auto_collection', -1
        )
        ELSE jsonb_build_object(
            'monthly_credits', 100,
            'max_stores', 1,
            'max_keywords', 1,
            'max_auto_collection', 0
        )
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION get_tier_quotas(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_tier_quotas(text) TO authenticated;

-- 기존 check_user_quota 함수 업데이트 (Basic+ 반영)
CREATE OR REPLACE FUNCTION check_user_quota(
  p_user_id uuid,
  p_quota_type text -- 'stores', 'keywords', 'trackers', 'auto_collection'
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_count integer;
  v_max_count integer;
  v_tier text;
  v_quotas jsonb;
BEGIN
  -- 사용자 Tier 조회
  SELECT subscription_tier INTO v_tier FROM profiles WHERE id = p_user_id;
  
  -- god tier는 무제한
  IF v_tier = 'god' THEN
    RETURN true;
  END IF;
  
  -- Tier별 쿼터 조회
  v_quotas := get_tier_quotas(v_tier);
  
  -- 쿼터 타입별 체크
  IF p_quota_type = 'stores' THEN
    SELECT COUNT(*) INTO v_current_count FROM stores WHERE user_id = p_user_id;
    v_max_count := (v_quotas->>'max_stores')::integer;
    
  ELSIF p_quota_type = 'keywords' THEN
    SELECT COUNT(*) INTO v_current_count FROM keywords k
    JOIN stores s ON s.id = k.store_id
    WHERE s.user_id = p_user_id;
    v_max_count := (v_quotas->>'max_keywords')::integer;
    
  ELSIF p_quota_type = 'trackers' THEN
    SELECT COUNT(*) INTO v_current_count FROM metric_trackers WHERE user_id = p_user_id;
    v_max_count := (v_quotas->>'max_keywords')::integer; -- trackers는 keywords와 동일
    
  ELSIF p_quota_type = 'auto_collection' THEN
    -- 자동수집 활성화된 키워드 수 체크
    SELECT COUNT(*) INTO v_current_count 
    FROM metric_trackers 
    WHERE user_id = p_user_id AND auto_collect = true;
    v_max_count := (v_quotas->>'max_auto_collection')::integer;
    
  ELSE
    RETURN false;
  END IF;
  
  -- 현재 사용량이 최대값보다 작으면 true
  RETURN v_current_count < v_max_count;
END;
$$;

-- 기존 함수 권한 유지
GRANT EXECUTE ON FUNCTION check_user_quota(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION check_user_quota(uuid, text) TO authenticated;

-- 코멘트
COMMENT ON FUNCTION get_tier_quotas IS 'Tier별 모든 쿼터 정보 반환 (JSON)';
COMMENT ON FUNCTION check_user_quota IS '사용자의 쿼터(매장/키워드/자동수집) 제한 확인';
