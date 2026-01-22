-- 키워드 시스템 전면 개편: 등록 키워드 → 조회 히스토리 방식 전환
-- 세션 21: 2026-01-22

-- 1. keywords 테이블에 새 컬럼 추가
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS is_tracked BOOLEAN DEFAULT false;
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. 기존 데이터는 모두 추적중으로 설정 (기존 키워드는 모두 추적 상태로 간주)
UPDATE keywords SET is_tracked = true WHERE is_tracked IS NULL;
UPDATE keywords SET last_searched_at = last_checked_at WHERE last_searched_at IS NULL;

-- 3. rank_history 테이블 삭제 (조회 히스토리는 저장하지 않음, daily_metrics만 사용)
DROP TABLE IF EXISTS rank_history CASCADE;

-- 4. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_keywords_is_tracked ON keywords(is_tracked);
CREATE INDEX IF NOT EXISTS idx_keywords_last_searched ON keywords(last_searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_keywords_store_search ON keywords(store_id, last_searched_at DESC);

-- 5. 주석 추가
COMMENT ON COLUMN keywords.is_tracked IS '추적 여부 플래그 (false = 조회만 함, true = 추적중)';
COMMENT ON COLUMN keywords.last_searched_at IS '마지막 조회 시간 (FIFO 정렬용)';
