-- ====================================================================
-- Migration: 039_create_activation_history
-- Description: 플레이스 활성화 분석 이력 저장 테이블
-- Created: 2026-01-29
-- ====================================================================

-- 1. activation_history 테이블 생성
CREATE TABLE IF NOT EXISTS activation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    place_id TEXT NOT NULL,
    thumbnail TEXT,
    summary_cards JSONB NOT NULL, -- 5개 카드 데이터
    activation_data JSONB NOT NULL, -- 전체 활성화 데이터
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT activation_history_unique UNIQUE (store_id, created_at)
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_activation_history_user_id ON activation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_activation_history_store_id ON activation_history(store_id);
CREATE INDEX IF NOT EXISTS idx_activation_history_created_at ON activation_history(created_at DESC);

-- 3. RLS 활성화
ALTER TABLE activation_history ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책: service_role 우회
DROP POLICY IF EXISTS "service_role_bypass_activation_history" ON activation_history;
CREATE POLICY "service_role_bypass_activation_history"
ON activation_history
TO service_role
USING (true)
WITH CHECK (true);

-- 5. RLS 정책: 사용자 본인의 이력만 조회
DROP POLICY IF EXISTS "allow_select_own_activation_history" ON activation_history;
CREATE POLICY "allow_select_own_activation_history"
ON activation_history
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 6. RLS 정책: INSERT 허용 (service_role, anon, authenticated)
DROP POLICY IF EXISTS "allow_insert_activation_history" ON activation_history;
CREATE POLICY "allow_insert_activation_history"
ON activation_history
FOR INSERT
TO anon, authenticated, service_role
WITH CHECK (true);

-- 7. RLS 정책: 사용자 본인의 이력만 삭제
DROP POLICY IF EXISTS "allow_delete_own_activation_history" ON activation_history;
CREATE POLICY "allow_delete_own_activation_history"
ON activation_history
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 8. 매장별 최신 10개만 유지하는 함수
CREATE OR REPLACE FUNCTION maintain_activation_history_limit()
RETURNS TRIGGER AS $$
BEGIN
    -- 해당 매장의 이력이 10개를 초과하면 가장 오래된 것부터 삭제
    DELETE FROM activation_history
    WHERE id IN (
        SELECT id
        FROM activation_history
        WHERE store_id = NEW.store_id
        ORDER BY created_at DESC
        OFFSET 10
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. 트리거 생성
DROP TRIGGER IF EXISTS trigger_maintain_activation_history_limit ON activation_history;
CREATE TRIGGER trigger_maintain_activation_history_limit
AFTER INSERT ON activation_history
FOR EACH ROW
EXECUTE FUNCTION maintain_activation_history_limit();

-- 10. 코멘트 추가
COMMENT ON TABLE activation_history IS '플레이스 활성화 분석 이력 (매장별 최신 10개 유지)';
COMMENT ON COLUMN activation_history.summary_cards IS '요약 카드 5개 (방문자 리뷰, 블로그 리뷰, 답글, 프로모션, 공지사항)';
COMMENT ON COLUMN activation_history.activation_data IS '전체 활성화 데이터 (트렌드, 상세 정보 등)';
