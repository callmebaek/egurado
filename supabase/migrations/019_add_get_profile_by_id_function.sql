-- ============================================
-- Add get_profile_by_id_bypass_rls Function
-- JWT 인증 시 user_id로 프로필을 조회하기 위한 함수
-- RLS를 우회하여 조회
-- ============================================

-- get_profile_by_id_bypass_rls 함수 생성
CREATE OR REPLACE FUNCTION public.get_profile_by_id_bypass_rls(
    p_id uuid
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
    total_credits int,
    used_credits int,
    max_stores int,
    max_keywords int,
    max_trackers int,
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
        p.total_credits,
        p.used_credits,
        p.max_stores,
        p.max_keywords,
        p.max_trackers,
        p.created_at,
        p.updated_at
    FROM profiles p
    WHERE p.id = p_id
    LIMIT 1;
END;
$$;

-- 권한 부여
GRANT EXECUTE ON FUNCTION public.get_profile_by_id_bypass_rls TO service_role;
GRANT EXECUTE ON FUNCTION public.get_profile_by_id_bypass_rls TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_by_id_bypass_rls TO anon;

-- 코멘트
COMMENT ON FUNCTION public.get_profile_by_id_bypass_rls IS 
'RLS를 우회하여 ID로 프로필을 조회합니다. JWT 인증에서 사용자 정보 조회용.';

-- 완료 메시지
SELECT 'get_profile_by_id_bypass_rls function created successfully' AS status;
