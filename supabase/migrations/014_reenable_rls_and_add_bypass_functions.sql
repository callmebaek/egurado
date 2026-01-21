-- ============================================
-- Re-enable RLS and Add Bypass Functions
-- 프론트엔드가 Supabase에 직접 접근하므로 RLS를 재활성화하고
-- 백엔드 시스템 작업을 위한 bypass 함수를 생성합니다
-- ============================================

-- Step 1: RLS 재활성화
ALTER TABLE metric_trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

-- Step 2: RLS Bypass Functions 생성

-- ============================================
-- Function 1: insert_daily_metric_bypass_rls
-- daily_metrics에 데이터를 삽입 (RLS 우회)
-- ============================================
CREATE OR REPLACE FUNCTION public.insert_daily_metric_bypass_rls(
    p_tracker_id uuid,
    p_keyword_id uuid,
    p_store_id uuid,
    p_collection_date date,
    p_rank integer,
    p_visitor_review_count integer,
    p_blog_review_count integer,
    p_rank_change integer DEFAULT NULL,
    p_previous_rank integer DEFAULT NULL
)
RETURNS TABLE(
    id uuid,
    tracker_id uuid,
    keyword_id uuid,
    store_id uuid,
    collection_date date,
    rank integer,
    visitor_review_count integer,
    blog_review_count integer,
    rank_change integer,
    previous_rank integer,
    collected_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- UPSERT: collection_date와 tracker_id가 같으면 업데이트, 아니면 삽입
    RETURN QUERY
    INSERT INTO daily_metrics (
        tracker_id,
        keyword_id,
        store_id,
        collection_date,
        rank,
        visitor_review_count,
        blog_review_count,
        rank_change,
        previous_rank,
        collected_at
    )
    VALUES (
        p_tracker_id,
        p_keyword_id,
        p_store_id,
        p_collection_date,
        p_rank,
        p_visitor_review_count,
        p_blog_review_count,
        p_rank_change,
        p_previous_rank,
        now()
    )
    ON CONFLICT (tracker_id, collection_date)
    DO UPDATE SET
        rank = EXCLUDED.rank,
        visitor_review_count = EXCLUDED.visitor_review_count,
        blog_review_count = EXCLUDED.blog_review_count,
        rank_change = EXCLUDED.rank_change,
        previous_rank = EXCLUDED.previous_rank,
        collected_at = now()
    RETURNING *;
END;
$$;

-- ============================================
-- Function 2: update_metric_tracker_bypass_rls
-- metric_trackers를 업데이트 (RLS 우회)
-- ============================================
CREATE OR REPLACE FUNCTION public.update_metric_tracker_bypass_rls(
    p_tracker_id uuid,
    p_last_collected_at timestamptz,
    p_next_collection_at timestamptz
)
RETURNS TABLE(
    id uuid,
    user_id uuid,
    store_id uuid,
    keyword_id uuid,
    update_frequency text,
    update_times integer[],
    notification_enabled boolean,
    notification_type text,
    notification_consent boolean,
    notification_phone text,
    notification_email text,
    is_active boolean,
    last_collected_at timestamptz,
    next_collection_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    UPDATE metric_trackers
    SET 
        last_collected_at = p_last_collected_at,
        next_collection_at = p_next_collection_at,
        updated_at = now()
    WHERE metric_trackers.id = p_tracker_id
    RETURNING *;
END;
$$;

-- ============================================
-- Function 3: get_metric_tracker_bypass_rls
-- metric_trackers를 조회 (RLS 우회)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_metric_tracker_bypass_rls(
    p_tracker_id uuid
)
RETURNS TABLE(
    id uuid,
    user_id uuid,
    store_id uuid,
    keyword_id uuid,
    place_id text,
    store_name text,
    keyword text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mt.id,
        mt.user_id,
        mt.store_id,
        mt.keyword_id,
        s.place_id,
        s.store_name,
        k.keyword
    FROM metric_trackers mt
    JOIN stores s ON mt.store_id = s.id
    JOIN keywords k ON mt.keyword_id = k.id
    WHERE mt.id = p_tracker_id;
END;
$$;

-- ============================================
-- Function 4: get_yesterday_metric_bypass_rls
-- 어제 데이터 조회 (RLS 우회)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_yesterday_metric_bypass_rls(
    p_tracker_id uuid,
    p_yesterday date
)
RETURNS TABLE(
    rank integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT dm.rank
    FROM daily_metrics dm
    WHERE dm.tracker_id = p_tracker_id
      AND dm.collection_date = p_yesterday
    LIMIT 1;
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.insert_daily_metric_bypass_rls TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_daily_metric_bypass_rls TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_metric_tracker_bypass_rls TO service_role;
GRANT EXECUTE ON FUNCTION public.update_metric_tracker_bypass_rls TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_metric_tracker_bypass_rls TO service_role;
GRANT EXECUTE ON FUNCTION public.get_metric_tracker_bypass_rls TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_yesterday_metric_bypass_rls TO service_role;
GRANT EXECUTE ON FUNCTION public.get_yesterday_metric_bypass_rls TO authenticated;

-- 코멘트 추가
COMMENT ON FUNCTION public.insert_daily_metric_bypass_rls IS 'RLS를 우회하여 daily_metrics에 데이터를 삽입합니다. 시스템 자동 수집용.';
COMMENT ON FUNCTION public.update_metric_tracker_bypass_rls IS 'RLS를 우회하여 metric_trackers를 업데이트합니다. 시스템 자동 수집용.';
COMMENT ON FUNCTION public.get_metric_tracker_bypass_rls IS 'RLS를 우회하여 metric_trackers를 조회합니다. 시스템 자동 수집용.';
COMMENT ON FUNCTION public.get_yesterday_metric_bypass_rls IS 'RLS를 우회하여 어제 데이터를 조회합니다. 시스템 자동 수집용.';

-- 완료 메시지
SELECT 'RLS re-enabled and bypass functions created successfully' AS status;
