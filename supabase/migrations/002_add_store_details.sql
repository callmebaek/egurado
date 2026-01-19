-- Add additional store information fields
-- 매장 상세 정보 필드 추가

ALTER TABLE stores 
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS road_address TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_stores_platform ON stores(platform);
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);

COMMENT ON COLUMN stores.category IS '매장 카테고리 (예: 카페, 음식점)';
COMMENT ON COLUMN stores.address IS '지번 주소';
COMMENT ON COLUMN stores.road_address IS '도로명 주소';
COMMENT ON COLUMN stores.thumbnail IS '매장 썸네일 이미지 URL';
