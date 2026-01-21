-- ============================================
-- Fix RLS Policy for Metric Tracking
-- 백엔드 API에서 보안을 관리하므로, RLS를 비활성화하여 시스템 작업 허용
-- ============================================

-- 이유:
-- 1. 프론트엔드는 DB에 직접 접근하지 않음 (API만 사용)
-- 2. API에서 get_current_user로 인증 및 user_id 검증
-- 3. Supabase Python client의 service_role RLS 우회 이슈 해결
-- 4. 백엔드 시스템이 자동 수집 작업을 수행할 수 있도록 함

-- metric_trackers RLS 비활성화
ALTER TABLE metric_trackers DISABLE ROW LEVEL SECURITY;

-- daily_metrics RLS 비활성화
ALTER TABLE daily_metrics DISABLE ROW LEVEL SECURITY;

-- 완료 메시지
SELECT 'RLS disabled for metric_trackers and daily_metrics - API-level security maintained' AS status;
