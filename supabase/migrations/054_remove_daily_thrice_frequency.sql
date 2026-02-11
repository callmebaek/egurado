-- 자동수집 빈도 최대 옵션을 3회(daily_thrice)에서 2회(daily_twice)로 변경
-- 1. 기존 daily_thrice 데이터를 daily_twice로 변환
-- 2. CHECK 제약조건 업데이트

-- Step 1: 기존 daily_thrice 데이터를 daily_twice로 마이그레이션
UPDATE metric_trackers
SET update_frequency = 'daily_twice',
    update_times = ARRAY[6, 16],
    updated_at = NOW()
WHERE update_frequency = 'daily_thrice';

-- Step 2: 기존 CHECK 제약조건 제거 후 새로 생성
ALTER TABLE metric_trackers DROP CONSTRAINT IF EXISTS metric_trackers_update_frequency_check;
ALTER TABLE metric_trackers ADD CONSTRAINT metric_trackers_update_frequency_check 
  CHECK (update_frequency IN ('daily_once', 'daily_twice'));
