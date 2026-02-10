-- ============================================
-- 쿠폰 테이블에 duration 관련 컬럼 추가
-- ============================================

-- is_permanent 컬럼 추가 (영구 할인 여부)
ALTER TABLE coupons 
ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN DEFAULT true;

-- duration_months 컬럼 추가 (할인 적용 기간)
ALTER TABLE coupons 
ADD COLUMN IF NOT EXISTS duration_months INTEGER;

-- 기존 데이터 업데이트 (is_recurring=true → is_permanent=true)
UPDATE coupons 
SET is_permanent = is_recurring 
WHERE is_permanent IS NULL;

-- 코멘트 추가
COMMENT ON COLUMN coupons.is_permanent IS '영구 할인 여부 (true: 구독 기간 내내 할인)';
COMMENT ON COLUMN coupons.duration_months IS '할인 적용 기간 (개월, is_permanent=false일 때만 사용)';
