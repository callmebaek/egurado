-- =====================================================
-- Fix get_admin_users_list Function - Remove last_sign_in_at
-- Created: 2026-02-06
-- Description: profiles 테이블에 last_sign_in_at 컬럼이 없어서 에러 발생 - 제거
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_admin_users_list(
  search_query text DEFAULT '',
  tier_filter_param text DEFAULT '',
  page_num integer DEFAULT 1,
  page_size_param integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset integer;
  v_users jsonb;
  v_total_count integer;
BEGIN
  -- 페이징 계산
  v_offset := (page_num - 1) * page_size_param;
  
  -- 사용자 목록 조회 (profiles + user_credits 조인)
  WITH filtered_users AS (
    SELECT 
      p.id,
      p.email,
      p.display_name,
      p.subscription_tier as tier,
      'active' as status,  -- 하드코딩 (profiles 테이블에 status 컬럼 없음)
      p.created_at,
      COALESCE(uc.monthly_credits, 0) as monthly_credits,
      COALESCE(uc.manual_credits, 0) as manual_credits,
      COALESCE(uc.monthly_used, 0) as monthly_used,
      COALESCE(uc.total_remaining, 0) as total_remaining,
      COALESCE(
        (SELECT SUM(credits_amount) 
         FROM credit_transactions 
         WHERE user_id = p.id 
         AND transaction_type = 'deduct'), 
        0
      ) as total_credits_used
    FROM profiles p
    LEFT JOIN user_credits uc ON uc.user_id = p.id
    WHERE 
      (search_query = '' OR 
       p.email ILIKE '%' || search_query || '%' OR 
       p.display_name ILIKE '%' || search_query || '%')
      AND
      (tier_filter_param = '' OR p.subscription_tier = tier_filter_param)
    ORDER BY p.created_at DESC
    LIMIT page_size_param
    OFFSET v_offset
  ),
  total_count_query AS (
    SELECT COUNT(*) as count
    FROM profiles p
    WHERE 
      (search_query = '' OR 
       p.email ILIKE '%' || search_query || '%' OR 
       p.display_name ILIKE '%' || search_query || '%')
      AND
      (tier_filter_param = '' OR p.subscription_tier = tier_filter_param)
  )
  SELECT 
    jsonb_build_object(
      'users', COALESCE(jsonb_agg(row_to_json(fu.*)), '[]'::jsonb),
      'total_count', (SELECT count FROM total_count_query)
    ) INTO v_users
  FROM filtered_users fu;
  
  RETURN v_users;
END;
$$;

COMMENT ON FUNCTION public.get_admin_users_list IS 'Admin 페이지에서 회원 목록 및 크레딧 정보 조회 (God Tier 전용) - last_sign_in_at 제거';
