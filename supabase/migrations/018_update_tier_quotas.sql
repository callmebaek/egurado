-- ============================================
-- Tier별 Quota 업데이트
-- 사용자 요청에 따른 할당량 조정
-- ============================================

-- 기존 사용자 데이터 업데이트
-- free tier: 매장 1개, 키워드 3개, 추적 1개
UPDATE profiles
SET 
  max_stores = 1,
  max_keywords = 3,
  max_trackers = 1
WHERE subscription_tier = 'free';

-- basic tier: 매장 3개, 키워드 20개, 추적 10개
UPDATE profiles
SET 
  max_stores = 3,
  max_keywords = 20,
  max_trackers = 10
WHERE subscription_tier = 'basic';

-- pro tier: 매장 10개, 키워드 50개, 추적 50개
UPDATE profiles
SET 
  max_stores = 10,
  max_keywords = 50,
  max_trackers = 50
WHERE subscription_tier = 'pro';

-- god tier: 무제한 유지 (변경 없음)
-- total_credits, used_credits, max_stores, max_keywords, max_trackers 모두 -1

-- NULL 값 처리: 기존에 NULL인 사용자들에게 기본값 설정
UPDATE profiles
SET 
  total_credits = CASE subscription_tier
    WHEN 'free' THEN 1000
    WHEN 'basic' THEN 5000
    WHEN 'pro' THEN 20000
    WHEN 'god' THEN -1
    ELSE 1000
  END,
  used_credits = 0,
  max_stores = CASE subscription_tier
    WHEN 'free' THEN 1
    WHEN 'basic' THEN 3
    WHEN 'pro' THEN 10
    WHEN 'god' THEN -1
    ELSE 1
  END,
  max_keywords = CASE subscription_tier
    WHEN 'free' THEN 3
    WHEN 'basic' THEN 20
    WHEN 'pro' THEN 50
    WHEN 'god' THEN -1
    ELSE 3
  END,
  max_trackers = CASE subscription_tier
    WHEN 'free' THEN 1
    WHEN 'basic' THEN 10
    WHEN 'pro' THEN 50
    WHEN 'god' THEN -1
    ELSE 1
  END
WHERE total_credits IS NULL 
   OR used_credits IS NULL 
   OR max_stores IS NULL 
   OR max_keywords IS NULL 
   OR max_trackers IS NULL;

-- 확인용 쿼리 (주석 처리됨)
-- SELECT email, subscription_tier, total_credits, used_credits, max_stores, max_keywords, max_trackers
-- FROM profiles
-- ORDER BY subscription_tier, email;
