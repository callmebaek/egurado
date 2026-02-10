-- =============================================
-- Migration 052: 티어별 가격/혜택 전면 업데이트
-- 날짜: 2026-02-11
-- 변경 내용:
--   free:       100크레딧, 매장1, 키워드1, 자동수집0
--   basic:      600크레딧, 매장1, 키워드3, 자동수집3   (₩24,900/월)
--   basic_plus: 1500크레딧, 매장2, 키워드8, 자동수집8  (₩37,900/월)
--   pro:        3500크레딧, 매장5, 키워드20, 자동수집20 (₩69,900/월)
--   custom:     협의
-- =============================================

-- get_tier_quotas 함수 업데이트
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
            'max_stores', 1,
            'max_keywords', 3,
            'max_auto_collection', 3
        )
        WHEN 'basic_plus' THEN jsonb_build_object(
            'monthly_credits', 1500,
            'max_stores', 2,
            'max_keywords', 8,
            'max_auto_collection', 8
        )
        WHEN 'pro' THEN jsonb_build_object(
            'monthly_credits', 3500,
            'max_stores', 5,
            'max_keywords', 20,
            'max_auto_collection', 20
        )
        WHEN 'custom' THEN jsonb_build_object(
            'monthly_credits', 0,
            'max_stores', 0,
            'max_keywords', 0,
            'max_auto_collection', 0
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

-- get_tier_monthly_credits 함수도 업데이트
CREATE OR REPLACE FUNCTION get_tier_monthly_credits(p_tier text)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN CASE p_tier
        WHEN 'free' THEN 100
        WHEN 'basic' THEN 600
        WHEN 'basic_plus' THEN 1500
        WHEN 'pro' THEN 3500
        WHEN 'custom' THEN 0
        WHEN 'god' THEN 999999
        ELSE 100
    END;
END;
$$;

-- get_tier_auto_collection_limit 함수도 업데이트
CREATE OR REPLACE FUNCTION get_tier_auto_collection_limit(p_tier text)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN CASE p_tier
        WHEN 'free' THEN 0
        WHEN 'basic' THEN 3
        WHEN 'basic_plus' THEN 8
        WHEN 'pro' THEN 20
        WHEN 'custom' THEN 0
        WHEN 'god' THEN 999999
        ELSE 0
    END;
END;
$$;

-- 권한 부여
GRANT EXECUTE ON FUNCTION get_tier_quotas(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_tier_quotas(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tier_monthly_credits(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_tier_monthly_credits(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tier_auto_collection_limit(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_tier_auto_collection_limit(text) TO authenticated;
