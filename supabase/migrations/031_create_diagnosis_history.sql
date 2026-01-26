-- =====================================================
-- 진단 히스토리 테이블 및 관련 함수 생성
-- =====================================================
-- 목적: 플레이스 진단 결과를 날짜별로 저장하여 과거 진단 결과 조회 가능
-- 제한: store_id별로 최근 30개까지만 저장 (자동 정리)
-- 작성일: 2026-01-26
-- =====================================================

-- 1. diagnosis_history 테이블 생성
CREATE TABLE IF NOT EXISTS diagnosis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  store_name TEXT NOT NULL,
  
  -- 진단 시점
  diagnosed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 진단 결과 요약
  total_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  grade TEXT NOT NULL,
  
  -- 상세 진단 결과 (JSONB)
  diagnosis_result JSONB NOT NULL,
  
  -- 플레이스 전체 정보 (JSONB)
  place_details JSONB NOT NULL,
  
  -- 메타데이터
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_diagnosis_history_user_store_date 
  ON diagnosis_history(user_id, store_id, diagnosed_at DESC);

CREATE INDEX IF NOT EXISTS idx_diagnosis_history_store_date 
  ON diagnosis_history(store_id, diagnosed_at DESC);

CREATE INDEX IF NOT EXISTS idx_diagnosis_history_created_at 
  ON diagnosis_history(created_at DESC);

-- 3. RLS(Row Level Security) 활성화
ALTER TABLE diagnosis_history ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 생성

-- SELECT: 본인의 히스토리만 조회 가능
CREATE POLICY "Users can view their own diagnosis history"
  ON diagnosis_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: 본인의 히스토리만 생성 가능
CREATE POLICY "Users can insert their own diagnosis history"
  ON diagnosis_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DELETE: 본인의 히스토리만 삭제 가능
CREATE POLICY "Users can delete their own diagnosis history"
  ON diagnosis_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5. 자동 정리 함수 생성 (store_id별로 최근 30개만 유지)
CREATE OR REPLACE FUNCTION cleanup_old_diagnosis_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_deleted_count INTEGER := 0;
BEGIN
  -- 해당 store_id의 히스토리 개수 확인
  SELECT COUNT(*) INTO v_count
  FROM diagnosis_history
  WHERE store_id = NEW.store_id AND user_id = NEW.user_id;
  
  -- 30개 초과 시 오래된 것 삭제
  IF v_count > 30 THEN
    DELETE FROM diagnosis_history
    WHERE id IN (
      SELECT id
      FROM diagnosis_history
      WHERE store_id = NEW.store_id AND user_id = NEW.user_id
      ORDER BY diagnosed_at ASC
      LIMIT (v_count - 30)
    );
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old diagnosis history records for store_id=%', 
      v_deleted_count, NEW.store_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. 트리거 생성 (INSERT 후 자동 정리)
CREATE TRIGGER trigger_cleanup_diagnosis_history
  AFTER INSERT ON diagnosis_history
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_diagnosis_history();

-- 7. 테이블 코멘트
COMMENT ON TABLE diagnosis_history IS 
'플레이스 진단 결과 히스토리. store_id별로 최근 30개까지만 저장되며, 오래된 것은 자동으로 삭제됨.';

COMMENT ON COLUMN diagnosis_history.diagnosed_at IS 
'진단이 수행된 시점';

COMMENT ON COLUMN diagnosis_history.diagnosis_result IS 
'진단 엔진이 반환한 전체 진단 결과 (items, total_score, grade 등)';

COMMENT ON COLUMN diagnosis_history.place_details IS 
'진단 당시의 플레이스 전체 정보 (complete_diagnosis_service가 수집한 데이터)';

COMMENT ON FUNCTION cleanup_old_diagnosis_history() IS 
'store_id별로 최근 30개 진단 히스토리만 유지하고 오래된 것을 자동 삭제';

-- =====================================================
-- 마이그레이션 완료
-- =====================================================
