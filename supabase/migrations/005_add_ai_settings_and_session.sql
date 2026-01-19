-- Add AI settings and Naver session columns to stores table
-- AI 답글 생성 설정 및 네이버 세션 저장 기능 추가

ALTER TABLE stores 
  ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS naver_session_encrypted TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS session_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_stores_ai_settings ON stores USING GIN (ai_settings);

-- Add comments
COMMENT ON COLUMN stores.ai_settings IS '매장별 AI 답글 생성 설정 (PlaceAISettings JSON)';
COMMENT ON COLUMN stores.naver_session_encrypted IS '네이버 로그인 세션 쿠키 (암호화된 JSON)';
COMMENT ON COLUMN stores.session_saved_at IS '세션 저장 시각';
