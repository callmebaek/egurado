-- Create stored procedure to delete keyword with cascade and bypass RLS
-- This function is needed because Supabase Python client's delete() method
-- may still be affected by RLS policies even with service_role key

CREATE OR REPLACE FUNCTION delete_keyword_cascade(p_keyword_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  -- This bypasses RLS policies
SET search_path = public
AS $$
DECLARE
  v_keyword_name TEXT;
  v_tracker_count INT;
  v_history_count INT;
  v_keyword_count INT;
BEGIN
  -- 1. Get keyword name first
  SELECT keyword INTO v_keyword_name
  FROM keywords
  WHERE id = p_keyword_id;
  
  IF v_keyword_name IS NULL THEN
    RETURN json_build_object(
      'status', 'error',
      'message', '키워드를 찾을 수 없습니다.'
    );
  END IF;
  
  -- 2. Delete from metric_trackers (if any)
  DELETE FROM metric_trackers WHERE keyword_id = p_keyword_id;
  GET DIAGNOSTICS v_tracker_count = ROW_COUNT;
  
  -- 3. Delete from rank_history
  DELETE FROM rank_history WHERE keyword_id = p_keyword_id;
  GET DIAGNOSTICS v_history_count = ROW_COUNT;
  
  -- 4. Delete from keywords
  DELETE FROM keywords WHERE id = p_keyword_id;
  GET DIAGNOSTICS v_keyword_count = ROW_COUNT;
  
  -- Return success response
  RETURN json_build_object(
    'status', 'success',
    'keyword', v_keyword_name,
    'deleted_trackers', v_tracker_count,
    'deleted_history', v_history_count,
    'deleted_keywords', v_keyword_count
  );
END;
$$;

-- Add comment
COMMENT ON FUNCTION delete_keyword_cascade(UUID) IS 
'키워드를 cascade 방식으로 삭제 (metric_trackers -> rank_history -> keywords). RLS를 우회합니다.';
