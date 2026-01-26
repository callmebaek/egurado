-- ============================================
-- Migration 030: review_stats INSERT를 위한 RLS bypass 함수 생성
-- 작성일: 2026-01-26
-- 목적: 리뷰 분석 시 review_stats 테이블 INSERT 권한 문제 해결
-- ============================================

-- ⭐ review_stats INSERT용 RLS bypass 함수
CREATE OR REPLACE FUNCTION insert_review_stats_bypass_rls(
    p_store_id UUID,
    p_date DATE,
    p_visitor_review_count INTEGER,
    p_visitor_positive_count INTEGER,
    p_visitor_neutral_count INTEGER,
    p_visitor_negative_count INTEGER,
    p_visitor_receipt_count INTEGER DEFAULT 0,
    p_visitor_reservation_count INTEGER DEFAULT 0,
    p_photo_review_count INTEGER DEFAULT 0,
    p_average_temperature NUMERIC DEFAULT 0.0,
    p_blog_review_count INTEGER DEFAULT 0,
    p_summary TEXT DEFAULT NULL,
    p_checked_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER  -- RLS 우회
SET search_path = public
AS $$
DECLARE
    v_review_stats_id UUID;
BEGIN
    -- review_stats 테이블에 INSERT
    INSERT INTO review_stats (
        store_id,
        date,
        visitor_review_count,
        visitor_positive_count,
        visitor_neutral_count,
        visitor_negative_count,
        visitor_receipt_count,
        visitor_reservation_count,
        photo_review_count,
        average_temperature,
        blog_review_count,
        summary,
        checked_at,
        created_at,
        updated_at
    )
    VALUES (
        p_store_id,
        p_date,
        p_visitor_review_count,
        p_visitor_positive_count,
        p_visitor_neutral_count,
        p_visitor_negative_count,
        p_visitor_receipt_count,
        p_visitor_reservation_count,
        p_photo_review_count,
        p_average_temperature,
        p_blog_review_count,
        p_summary,
        p_checked_at,
        NOW(),
        NOW()
    )
    RETURNING id INTO v_review_stats_id;
    
    RETURN v_review_stats_id;
END;
$$;

-- 권한 설정 (service_role과 authenticated에게만 실행 권한 부여)
GRANT EXECUTE ON FUNCTION insert_review_stats_bypass_rls TO service_role;
GRANT EXECUTE ON FUNCTION insert_review_stats_bypass_rls TO authenticated;
REVOKE EXECUTE ON FUNCTION insert_review_stats_bypass_rls FROM anon, public;

-- 주석
COMMENT ON FUNCTION insert_review_stats_bypass_rls IS 
'리뷰 통계(review_stats) 데이터를 RLS를 우회하여 INSERT합니다. 
리뷰 분석 기능에서 사용됩니다.';

-- 로그
DO $$
BEGIN
    RAISE NOTICE 'Migration 030: insert_review_stats_bypass_rls 함수 생성 완료';
END $$;
