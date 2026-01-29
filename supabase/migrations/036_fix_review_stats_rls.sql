-- Fix review_stats RLS policies for service role

-- Drop existing policies if any
DROP POLICY IF EXISTS "service_role_all_review_stats" ON review_stats;

-- Allow service role to bypass RLS for all operations
CREATE POLICY "service_role_all_review_stats"
ON review_stats
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Also ensure authenticated users can read their own stats
DROP POLICY IF EXISTS "users_read_own_review_stats" ON review_stats;

CREATE POLICY "users_read_own_review_stats"
ON review_stats
FOR SELECT
TO authenticated
USING (
  store_id IN (
    SELECT id FROM stores WHERE user_id = auth.uid()
  )
);

COMMENT ON POLICY "service_role_all_review_stats" ON review_stats IS 
'Allow service role to perform all operations on review_stats (bypasses RLS)';

COMMENT ON POLICY "users_read_own_review_stats" ON review_stats IS 
'Allow authenticated users to read review stats for their own stores';
