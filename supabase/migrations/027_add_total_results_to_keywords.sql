-- Add total_results column to keywords table
ALTER TABLE keywords ADD COLUMN IF NOT EXISTS total_results INTEGER;

-- Add comment
COMMENT ON COLUMN keywords.total_results IS '해당 키워드로 검색 시 전체 업체 수';
