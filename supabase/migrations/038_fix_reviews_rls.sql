-- ====================================================================
-- Migration: 038_fix_reviews_rls
-- Description: reviews 테이블에 RLS 정책 추가 (백엔드 INSERT 허용)
-- Created: 2026-01-29
-- ====================================================================

-- 1. reviews 테이블 RLS 활성화 (이미 활성화되어 있을 수 있음)
ALTER TABLE IF EXISTS reviews ENABLE ROW LEVEL SECURITY;

-- 2. service_role에 대한 우회 정책 (모든 작업 허용)
DROP POLICY IF EXISTS "service_role_bypass_reviews" ON reviews;
CREATE POLICY "service_role_bypass_reviews"
ON reviews
TO service_role
USING (true)
WITH CHECK (true);

-- 3. 인증된 사용자 및 익명 사용자의 INSERT 허용
DROP POLICY IF EXISTS "allow_insert_reviews" ON reviews;
CREATE POLICY "allow_insert_reviews"
ON reviews
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

-- 4. 인증된 사용자 및 익명 사용자의 UPDATE 허용
DROP POLICY IF EXISTS "allow_update_reviews" ON reviews;
CREATE POLICY "allow_update_reviews"
ON reviews
FOR UPDATE
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 5. 인증된 사용자 및 익명 사용자의 SELECT 허용 (store_id 필터링)
DROP POLICY IF EXISTS "allow_select_reviews" ON reviews;
CREATE POLICY "allow_select_reviews"
ON reviews
FOR SELECT
TO anon, authenticated, service_role
USING (
    -- service_role은 모든 데이터 접근 가능
    current_setting('role') = 'service_role'
    OR
    -- 일반 사용자는 자신의 매장 리뷰만 조회
    store_id IN (
        SELECT id FROM stores WHERE user_id = auth.uid()
    )
);

-- 6. 인증된 사용자 및 익명 사용자의 DELETE 허용 (store_id 필터링)
DROP POLICY IF EXISTS "allow_delete_reviews" ON reviews;
CREATE POLICY "allow_delete_reviews"
ON reviews
FOR DELETE
TO anon, authenticated, service_role
USING (
    -- service_role은 모든 데이터 삭제 가능
    current_setting('role') = 'service_role'
    OR
    -- 일반 사용자는 자신의 매장 리뷰만 삭제
    store_id IN (
        SELECT id FROM stores WHERE user_id = auth.uid()
    )
);
