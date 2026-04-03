-- stores 테이블에 매장 좌표 컬럼 추가
-- 순위 조회 시 매장 위치 기준으로 검색하여 정확한 순위를 반환하기 위함

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS place_x TEXT,
  ADD COLUMN IF NOT EXISTS place_y TEXT;

COMMENT ON COLUMN stores.place_x IS '매장 경도 (longitude)';
COMMENT ON COLUMN stores.place_y IS '매장 위도 (latitude)';
