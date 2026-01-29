-- Comprehensive fix for review_stats RLS policies

-- Drop all existing policies
DROP POLICY IF EXISTS "review_stats_select_policy" ON review_stats;
DROP POLICY IF EXISTS "service_role_all_review_stats" ON review_stats;
DROP POLICY IF EXISTS "users_read_own_review_stats" ON review_stats;

-- 1. Allow service_role to do everything (bypass RLS)
CREATE POLICY "service_role_bypass_rls"
ON review_stats
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Allow anon (backend using anon key) to insert/update review stats
CREATE POLICY "backend_insert_review_stats"
ON review_stats
AS PERMISSIVE
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

CREATE POLICY "backend_update_review_stats"
ON review_stats
AS PERMISSIVE
FOR UPDATE
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 3. Allow users to read their own review stats
CREATE POLICY "users_read_own_review_stats"
ON review_stats
AS PERMISSIVE
FOR SELECT
TO anon, authenticated, service_role
USING (
  store_id IN (
    SELECT id FROM stores WHERE user_id = auth.uid()
  )
  OR auth.role() = 'service_role'
  OR auth.uid() IS NULL  -- Allow anon to read (backend access)
);

COMMENT ON POLICY "service_role_bypass_rls" ON review_stats IS 
'Allow service role to bypass all RLS checks';

COMMENT ON POLICY "backend_insert_review_stats" ON review_stats IS 
'Allow backend (anon/authenticated/service_role) to insert review stats';

COMMENT ON POLICY "backend_update_review_stats" ON review_stats IS 
'Allow backend (anon/authenticated/service_role) to update review stats';

COMMENT ON POLICY "users_read_own_review_stats" ON review_stats IS 
'Allow users to read their own review stats, backend can read all';
