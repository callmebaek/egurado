-- ============================================
-- Fix Ambiguous tracker_id Error
-- ON CONFLICT 절의 ambiguity 문제를 해결하기 위해
-- 명시적인 IF EXISTS / ELSE 로직으로 UPSERT 구현
-- ============================================

-- insert_daily_metric_bypass_rls 함수 재생성
DROP FUNCTION IF EXISTS public.insert_daily_metric_bypass_rls(uuid, uuid, uuid, date, integer, integer, integer, integer, integer);

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
DECLARE
    v_existing_id uuid;
BEGIN
    -- 기존 데이터가 있는지 확인
    SELECT dm.id INTO v_existing_id
    FROM daily_metrics dm
    WHERE dm.tracker_id = p_tracker_id
      AND dm.collection_date = p_collection_date;
    
    IF v_existing_id IS NOT NULL THEN
        -- UPDATE: 기존 데이터가 있으면 업데이트
        RETURN QUERY
        UPDATE daily_metrics dm
        SET 
            rank = p_rank,
            visitor_review_count = p_visitor_review_count,
            blog_review_count = p_blog_review_count,
            rank_change = p_rank_change,
            previous_rank = p_previous_rank,
            collected_at = now()
        WHERE dm.id = v_existing_id
        RETURNING 
            dm.id,
            dm.tracker_id,
            dm.keyword_id,
            dm.store_id,
            dm.collection_date,
            dm.rank,
            dm.visitor_review_count,
            dm.blog_review_count,
            dm.rank_change,
            dm.previous_rank,
            dm.collected_at;
    ELSE
        -- INSERT: 새 데이터 삽입
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
        RETURNING 
            daily_metrics.id,
            daily_metrics.tracker_id,
            daily_metrics.keyword_id,
            daily_metrics.store_id,
            daily_metrics.collection_date,
            daily_metrics.rank,
            daily_metrics.visitor_review_count,
            daily_metrics.blog_review_count,
            daily_metrics.rank_change,
            daily_metrics.previous_rank,
            daily_metrics.collected_at;
    END IF;
END;
$$;

-- 권한 부여
GRANT EXECUTE ON FUNCTION public.insert_daily_metric_bypass_rls TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_daily_metric_bypass_rls TO authenticated;

-- 코멘트
COMMENT ON FUNCTION public.insert_daily_metric_bypass_rls IS 'RLS를 우회하여 daily_metrics에 UPSERT를 수행합니다. ambiguity 문제 해결.';

-- 완료 메시지
SELECT 'Ambiguous tracker_id error fixed - UPSERT logic rewritten' AS status;
