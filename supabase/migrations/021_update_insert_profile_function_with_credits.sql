-- ============================================
-- insert_profile_bypass_rls 함수 업데이트
-- credit/quota 컬럼 추가로 18개 컬럼 반환
-- ============================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS public.insert_profile_bypass_rls(uuid, text, text, text, text, boolean, text, text);

-- profiles 테이블에 데이터 삽입하는 함수 (RLS 우회) - credit/quota 컬럼 추가
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
SECURITY DEFINER  -- 이것이 RLS를 우회하게 함
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_credits integer;
    v_max_stores integer;
    v_max_keywords integer;
    v_max_trackers integer;
BEGIN
    -- Tier별 기본값 설정
    IF p_subscription_tier = 'free' THEN
        v_total_credits := 1000;
        v_max_stores := 1;
        v_max_keywords := 10;
        v_max_trackers := 3;
    ELSIF p_subscription_tier = 'basic' THEN
        v_total_credits := 5000;
        v_max_stores := 3;
        v_max_keywords := 50;
        v_max_trackers := 10;
    ELSIF p_subscription_tier = 'pro' THEN
        v_total_credits := 20000;
        v_max_stores := 10;
        v_max_keywords := 200;
        v_max_trackers := 50;
    ELSIF p_subscription_tier = 'god' THEN
        v_total_credits := -1;
        v_max_stores := -1;
        v_max_keywords := -1;
        v_max_trackers := -1;
    ELSE
        -- 기본값 (free tier)
        v_total_credits := 1000;
        v_max_stores := 1;
        v_max_keywords := 10;
        v_max_trackers := 3;
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
        0,  -- used_credits 초기값
        v_max_stores,
        v_max_keywords,
        v_max_trackers,
        now(),
        now()
    )
    RETURNING *;
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.insert_profile_bypass_rls(
    uuid, text, text, text, text, boolean, text, text
) TO service_role;

GRANT EXECUTE ON FUNCTION public.insert_profile_bypass_rls(
    uuid, text, text, text, text, boolean, text, text
) TO authenticated;

-- 코멘트 추가
COMMENT ON FUNCTION public.insert_profile_bypass_rls IS 
'RLS를 우회하여 profiles 테이블에 데이터를 삽입합니다. credit/quota 컬럼 포함 (18개 컬럼)';

-- 완료 메시지
SELECT 'insert_profile_bypass_rls function updated with credit/quota columns' AS status;
