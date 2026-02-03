-- RLS를 우회하여 사용자의 매장 목록을 조회하는 함수
CREATE OR REPLACE FUNCTION get_stores_by_user_id_bypass_rls(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    place_id TEXT,
    store_name TEXT,
    category TEXT,
    address TEXT,
    road_address TEXT,
    thumbnail TEXT,
    platform TEXT,
    status TEXT,
    display_order INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.user_id,
        s.place_id,
        s.store_name,
        s.category,
        s.address,
        s.road_address,
        s.thumbnail,
        s.platform,
        s.status,
        s.display_order,
        s.created_at,
        s.updated_at
    FROM stores s
    WHERE s.user_id = p_user_id
    ORDER BY s.display_order ASC NULLS LAST, s.created_at DESC;
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_stores_by_user_id_bypass_rls(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_stores_by_user_id_bypass_rls(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stores_by_user_id_bypass_rls(UUID) TO anon;

-- 함수 설명
COMMENT ON FUNCTION get_stores_by_user_id_bypass_rls(UUID) IS 
'RLS를 우회하여 특정 사용자의 매장 목록을 조회합니다. 멀티 유저 세션 충돌 문제 해결용.';
