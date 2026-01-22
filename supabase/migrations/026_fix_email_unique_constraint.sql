-- ============================================
-- Fix email UNIQUE constraint issue
-- 기존 profiles의 이메일을 임시로 변경하여 UNIQUE 제약 회피
-- ============================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS public.migrate_user_to_new_auth_id(uuid, uuid, text, text, text, text, boolean, text, text, text, text, text);

-- 새로운 로직으로 함수 재생성
CREATE OR REPLACE FUNCTION public.migrate_user_to_new_auth_id(
    p_old_id uuid,
    p_new_id uuid,
    p_email text,
    p_display_name text,
    p_auth_provider text,
    p_subscription_tier text DEFAULT 'free',
    p_onboarding_completed boolean DEFAULT false,
    p_profile_image_url text DEFAULT NULL,
    p_phone_number text DEFAULT NULL,
    p_user_position text DEFAULT NULL,
    p_marketing_experience text DEFAULT NULL,
    p_agency_experience text DEFAULT NULL
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
    v_used_credits integer;
    v_max_stores integer;
    v_max_keywords integer;
    v_max_trackers integer;
    v_created_at timestamptz;
    v_temp_email text;
BEGIN
    RAISE NOTICE 'Starting migration from % to %', p_old_id, p_new_id;
    
    -- 1. 기존 프로필에서 credit/quota 정보 가져오기
    SELECT 
        profiles.total_credits, 
        profiles.used_credits, 
        profiles.max_stores, 
        profiles.max_keywords, 
        profiles.max_trackers,
        profiles.created_at
    INTO 
        v_total_credits, 
        v_used_credits, 
        v_max_stores, 
        v_max_keywords, 
        v_max_trackers,
        v_created_at
    FROM profiles
    WHERE profiles.id = p_old_id;
    
    -- credit/quota 정보가 없으면 Tier별 기본값 설정
    IF v_total_credits IS NULL THEN
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
            v_total_credits := 1000;
            v_max_stores := 1;
            v_max_keywords := 10;
            v_max_trackers := 3;
        END IF;
        v_used_credits := 0;
    END IF;
    
    -- created_at이 없으면 현재 시간 사용
    IF v_created_at IS NULL THEN
        v_created_at := now();
    END IF;
    
    -- ============================================
    -- 이메일 UNIQUE 제약 회피를 위한 임시 변경
    -- ============================================
    
    -- 2. 기존 profiles의 이메일을 임시값으로 변경
    v_temp_email := p_email || '_OLD_' || p_old_id::text;
    
    UPDATE profiles 
    SET email = v_temp_email,
        updated_at = now()
    WHERE profiles.id = p_old_id;
    
    RAISE NOTICE 'Old profile email changed to temporary: %', v_temp_email;
    
    -- 3. 새 프로필 생성 (실제 이메일)
    INSERT INTO profiles (
        id, 
        email, 
        display_name, 
        auth_provider, 
        subscription_tier, 
        onboarding_completed,
        profile_image_url,
        phone_number,
        user_position,
        marketing_experience,
        agency_experience,
        total_credits,
        used_credits,
        max_stores,
        max_keywords,
        max_trackers,
        created_at, 
        updated_at
    )
    VALUES (
        p_new_id,
        p_email,
        p_display_name,
        p_auth_provider,
        p_subscription_tier,
        p_onboarding_completed,
        p_profile_image_url,
        p_phone_number,
        p_user_position,
        p_marketing_experience,
        p_agency_experience,
        v_total_credits,
        v_used_credits,
        v_max_stores,
        v_max_keywords,
        v_max_trackers,
        v_created_at,
        now()
    );
    
    RAISE NOTICE 'New profile % created with email: %', p_new_id, p_email;
    
    -- 4. stores의 user_id를 새 ID로 업데이트
    UPDATE stores
    SET user_id = p_new_id
    WHERE user_id = p_old_id;
    
    RAISE NOTICE '% stores migrated', 
        (SELECT COUNT(*) FROM stores WHERE user_id = p_new_id);
    
    -- 5. metric_trackers의 user_id를 새 ID로 업데이트
    UPDATE metric_trackers
    SET user_id = p_new_id
    WHERE user_id = p_old_id;
    
    RAISE NOTICE '% metric_trackers migrated', 
        (SELECT COUNT(*) FROM metric_trackers WHERE user_id = p_new_id);
    
    -- 6. 기존 프로필 삭제 (임시 이메일)
    DELETE FROM profiles WHERE profiles.id = p_old_id;
    
    RAISE NOTICE 'Old profile % deleted', p_old_id;
    
    -- 7. 생성된 프로필 반환
    RETURN QUERY
    SELECT 
        profiles.id,
        profiles.email,
        profiles.display_name,
        profiles.subscription_tier,
        profiles.created_at,
        profiles.updated_at,
        profiles.auth_provider,
        profiles.user_position,
        profiles.marketing_experience,
        profiles.agency_experience,
        profiles.onboarding_completed,
        profiles.phone_number,
        profiles.profile_image_url,
        profiles.total_credits,
        profiles.used_credits,
        profiles.max_stores,
        profiles.max_keywords,
        profiles.max_trackers
    FROM profiles
    WHERE profiles.id = p_new_id;
    
    RAISE NOTICE 'Migration completed successfully: % -> %', p_old_id, p_new_id;
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.migrate_user_to_new_auth_id(
    uuid, uuid, text, text, text, text, boolean, text, text, text, text, text
) TO service_role;

GRANT EXECUTE ON FUNCTION public.migrate_user_to_new_auth_id(
    uuid, uuid, text, text, text, text, boolean, text, text, text, text, text
) TO authenticated;

-- anon과 public은 차단
REVOKE EXECUTE ON FUNCTION public.migrate_user_to_new_auth_id(
    uuid, uuid, text, text, text, text, boolean, text, text, text, text, text
) FROM anon;

REVOKE EXECUTE ON FUNCTION public.migrate_user_to_new_auth_id(
    uuid, uuid, text, text, text, text, boolean, text, text, text, text, text
) FROM public;

-- 코멘트 추가
COMMENT ON FUNCTION public.migrate_user_to_new_auth_id IS 
'기존 profiles ID를 새 Auth ID로 마이그레이션. 이메일 UNIQUE 제약 회피를 위해 기존 이메일을 임시로 변경한 후 새 profiles 생성.';

-- 완료 메시지
SELECT 'Migration function fixed - email UNIQUE constraint issue resolved' AS status;
