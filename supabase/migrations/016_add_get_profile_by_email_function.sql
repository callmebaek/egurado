-- ============================================
-- Add get_profile_by_email_bypass_rls Function
-- 소셜 로그인 시 이메일로 기존 사용자를 확인하기 위한 함수
-- RLS를 우회하여 조회
-- ============================================

-- get_profile_by_email_bypass_rls 함수 생성
CREATE OR REPLACE FUNCTION public.get_profile_by_email_bypass_rls(
    p_email text
)
RETURNS TABLE(
    id uuid,
    email text,
    display_name text,
    auth_provider text,
    subscription_tier text,
    onboarding_completed boolean,
    profile_image_url text,
    phone_number text,
    user_position text,
    marketing_experience text,
    agency_experience text,
    created_at timestamptz,
    updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.display_name,
        p.auth_provider,
        p.subscription_tier,
        p.onboarding_completed,
        p.profile_image_url,
        p.phone_number,
        p.user_position,
        p.marketing_experience,
        p.agency_experience,
        p.created_at,
        p.updated_at
    FROM profiles p
    WHERE p.email = p_email
    LIMIT 1;
END;
$$;

-- 권한 부여
GRANT EXECUTE ON FUNCTION public.get_profile_by_email_bypass_rls TO service_role;
GRANT EXECUTE ON FUNCTION public.get_profile_by_email_bypass_rls TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_by_email_bypass_rls TO anon;

-- 코멘트
COMMENT ON FUNCTION public.get_profile_by_email_bypass_rls IS 
'RLS를 우회하여 이메일로 프로필을 조회합니다. 소셜 로그인에서 기존 사용자 확인용.';

-- 완료 메시지
SELECT 'get_profile_by_email_bypass_rls function created successfully' AS status;
