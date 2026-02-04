-- ========================================
-- metric_trackers RLS 우회 함수 생성
-- ========================================
-- 목적: 멀티 유저 세션 충돌 문제 해결
-- 백엔드의 전역 Supabase 클라이언트는 세션을 유지하지 않으므로
-- auth.uid()가 NULL이 되어 RLS 정책이 데이터를 차단함
-- 이 함수는 RLS를 우회하여 user_id로 직접 조회
-- ========================================

-- 1단계: 기존 함수 삭제 (함수 수정 시 필수)
DROP FUNCTION IF EXISTS get_metric_trackers_by_user_id_bypass_rls(UUID);

-- 2단계: RLS 우회 함수 생성
CREATE OR REPLACE FUNCTION get_metric_trackers_by_user_id_bypass_rls(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    store_id UUID,
    keyword_id UUID,
    update_frequency TEXT,
    update_times INTEGER[],
    notification_enabled BOOLEAN,
    notification_type TEXT,
    notification_consent BOOLEAN,
    notification_phone TEXT,
    notification_email TEXT,
    is_active BOOLEAN,
    last_collected_at TIMESTAMPTZ,
    next_collection_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    store_name TEXT,
    platform TEXT,
    keyword TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ 함수를 정의한 사용자 권한으로 실행 (RLS 우회)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mt.id,
        mt.user_id,
        mt.store_id,
        mt.keyword_id,
        mt.update_frequency,
        mt.update_times,
        mt.notification_enabled,
        mt.notification_type,
        mt.notification_consent,
        mt.notification_phone,
        mt.notification_email,
        mt.is_active,
        mt.last_collected_at,
        mt.next_collection_at,
        mt.created_at,
        mt.updated_at,
        s.store_name,
        s.platform,
        k.keyword
    FROM metric_trackers mt
    LEFT JOIN stores s ON mt.store_id = s.id
    LEFT JOIN keywords k ON mt.keyword_id = k.id
    WHERE mt.user_id = p_user_id
    ORDER BY mt.created_at DESC;
END;
$$;

-- 3단계: 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_metric_trackers_by_user_id_bypass_rls(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_metric_trackers_by_user_id_bypass_rls(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_metric_trackers_by_user_id_bypass_rls(UUID) TO anon;

-- 4단계: 함수 설명 추가
COMMENT ON FUNCTION get_metric_trackers_by_user_id_bypass_rls(UUID) IS 
'RLS를 우회하여 사용자의 metric_trackers 조회 (멀티 유저 세션 충돌 방지)';
