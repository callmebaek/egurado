-- =============================================
-- Migration 056: insert_profile_bypass_rls 함수의 쿼터값을 052 기준으로 통일
-- 날짜: 2026-04-03
-- 변경 내용:
--   가입 시 프로필 생성 함수가 과거 값(021)을 사용하고 있어
--   052_update_tier_quotas_v2.sql 기준으로 동기화
--   free:       매장1, 키워드1, 추적1
--   basic:      매장1, 키워드3, 추적3
--   basic_plus: 매장2, 키워드8, 추적8
--   pro:        매장5, 키워드20, 추적20
--   custom:     매장0, 키워드0, 추적0
--   god:        무제한(-1)
-- =============================================

DROP FUNCTION IF EXISTS public.insert_profile_bypass_rls(uuid, text, text, text, text, boolean, text, text);

CREATE OR REPLACE FUNCTION public.insert_profile_bypass_rls(
    p_id uuid,
    p_email text,
    p_display_name text,
    p_auth_provider text,
    p_subscription_tier text DEFAULT 'free',
    p_onboarding_completed boolean DEFAULT false,
    p_profile_image_url text DEFAULT NULL,
    p_phone_number text DEFAULT NULL
)
RETURNS TABLE(
    id uuid,
    email text,
    display_name text,
    subscription_tier text,
    created_at timestamptz,
    updated_at timestamptz,
    auth_provider text,
    user_position text,
    marketing_experience text,
    agency_experience text,
    onboarding_completed boolean,
    phone_number text,
    profile_image_url text,
    total_credits integer,
    used_credits integer,
    max_stores integer,
    max_keywords integer,
    max_trackers integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_credits integer;
    v_max_stores integer;
    v_max_keywords integer;
    v_max_trackers integer;
BEGIN
    IF p_subscription_tier = 'free' THEN
        v_total_credits := 100;
        v_max_stores := 1;
        v_max_keywords := 1;
        v_max_trackers := 1;
    ELSIF p_subscription_tier = 'basic' THEN
        v_total_credits := 600;
        v_max_stores := 1;
        v_max_keywords := 3;
        v_max_trackers := 3;
    ELSIF p_subscription_tier = 'basic_plus' THEN
        v_total_credits := 1500;
        v_max_stores := 2;
        v_max_keywords := 8;
        v_max_trackers := 8;
    ELSIF p_subscription_tier = 'pro' THEN
        v_total_credits := 3500;
        v_max_stores := 5;
        v_max_keywords := 20;
        v_max_trackers := 20;
    ELSIF p_subscription_tier = 'custom' THEN
        v_total_credits := 0;
        v_max_stores := 0;
        v_max_keywords := 0;
        v_max_trackers := 0;
    ELSIF p_subscription_tier = 'god' THEN
        v_total_credits := -1;
        v_max_stores := -1;
        v_max_keywords := -1;
        v_max_trackers := -1;
    ELSE
        v_total_credits := 100;
        v_max_stores := 1;
        v_max_keywords := 1;
        v_max_trackers := 1;
    END IF;

    RETURN QUERY
    INSERT INTO profiles (
        id, 
        email, 
        display_name, 
        auth_provider, 
        subscription_tier, 
        onboarding_completed,
        profile_image_url,
        phone_number,
        total_credits,
        used_credits,
        max_stores,
        max_keywords,
        max_trackers,
        created_at, 
        updated_at
    )
    VALUES (
        p_id,
        p_email,
        p_display_name,
        p_auth_provider,
        p_subscription_tier,
        p_onboarding_completed,
        p_profile_image_url,
        p_phone_number,
        v_total_credits,
        0,
        v_max_stores,
        v_max_keywords,
        v_max_trackers,
        now(),
        now()
    )
    RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_profile_bypass_rls(
    uuid, text, text, text, text, boolean, text, text
) TO service_role;

GRANT EXECUTE ON FUNCTION public.insert_profile_bypass_rls(
    uuid, text, text, text, text, boolean, text, text
) TO authenticated;

-- 기존 free tier 사용자 중 과거 마이그레이션에서 잘못 설정된 값 수정
UPDATE profiles
SET
    max_stores = 1,
    max_keywords = 1,
    max_trackers = 1
WHERE subscription_tier = 'free'
  AND (max_stores > 1 OR max_keywords > 1 OR max_trackers > 1);

-- basic tier 사용자도 052 기준으로 보정
UPDATE profiles
SET
    max_stores = 1,
    max_keywords = 3,
    max_trackers = 3
WHERE subscription_tier = 'basic'
  AND (max_stores != 1 OR max_keywords != 3 OR max_trackers != 3);

-- basic_plus tier
UPDATE profiles
SET
    max_stores = 2,
    max_keywords = 8,
    max_trackers = 8
WHERE subscription_tier = 'basic_plus'
  AND (max_stores != 2 OR max_keywords != 8 OR max_trackers != 8);

-- pro tier
UPDATE profiles
SET
    max_stores = 5,
    max_keywords = 20,
    max_trackers = 20
WHERE subscription_tier = 'pro'
  AND (max_stores != 5 OR max_keywords != 20 OR max_trackers != 20);

SELECT '056: insert_profile_bypass_rls synced to 052 quotas + existing profiles corrected' AS status;
