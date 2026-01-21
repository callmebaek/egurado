-- ============================================
-- RLS 우회 함수 수정
-- RETURNS TABLE의 컬럼 순서를 profiles 테이블과 일치시킴
-- ============================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS public.insert_profile_bypass_rls(uuid, text, text, text, text, boolean, text, text);

-- profiles 테이블에 데이터 삽입하는 함수 (RLS 우회) - 수정됨
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
    created_at timestamptz,  -- 올바른 위치로 이동!
    updated_at timestamptz,  -- 올바른 위치로 이동!
    auth_provider text,
    user_position text,
    marketing_experience text,
    agency_experience text,
    onboarding_completed boolean,
    phone_number text,
    profile_image_url text
)
SECURITY DEFINER  -- 이것이 RLS를 우회하게 함
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
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
'RLS를 우회하여 profiles 테이블에 데이터를 삽입합니다. 주로 소셜 로그인에서 사용됩니다. (컬럼 순서 수정됨)';

-- 완료 메시지
SELECT 'RLS bypass function fixed successfully - column order corrected' AS status;
