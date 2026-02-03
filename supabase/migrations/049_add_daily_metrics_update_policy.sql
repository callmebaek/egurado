-- Add UPDATE RLS policy for daily_metrics table
-- 
-- Issue: 키워드 순위추적에서 "수집" 버튼 클릭 시 데이터가 업데이트되지 않는 문제
-- Cause: daily_metrics 테이블에 UPDATE RLS 정책이 없어서 
--        service_role_key를 사용해도 UPDATE가 0 rows affected로 실패
-- Solution: UPDATE 정책 추가하여 사용자가 자신의 tracker에 대한 metrics를 업데이트할 수 있도록 허용
--
-- Date: 2026-02-03

CREATE POLICY "Users can update own daily metrics" 
ON daily_metrics 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM metric_trackers 
    WHERE metric_trackers.id = daily_metrics.tracker_id 
    AND metric_trackers.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM metric_trackers 
    WHERE metric_trackers.id = daily_metrics.tracker_id 
    AND metric_trackers.user_id = auth.uid()
  )
);
