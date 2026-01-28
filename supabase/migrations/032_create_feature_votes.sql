-- ================================
-- Feature Votes Table
-- ================================
-- 신규 기능 투표 시스템을 위한 테이블
-- 사용자들이 원하는 기능에 투표할 수 있으며, 투표 결과는 모든 사용자에게 공개됨

-- 1. feature_votes 테이블 생성
CREATE TABLE IF NOT EXISTS feature_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key TEXT NOT NULL,  -- 기능 고유 식별자 (예: 'kpi-dashboard', 'google-review-analysis')
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('want', 'not_needed')),  -- 'want': 빨리 만들어주세요, 'not_needed': 별로 필요없을것 같아요
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 중복 투표 방지: 한 사용자는 각 기능에 대해 한 번만 투표 가능
    CONSTRAINT unique_user_feature_vote UNIQUE (feature_key, user_id)
);

-- 2. 인덱스 생성
CREATE INDEX idx_feature_votes_feature_key ON feature_votes(feature_key);
CREATE INDEX idx_feature_votes_user_id ON feature_votes(user_id);
CREATE INDEX idx_feature_votes_created_at ON feature_votes(created_at DESC);

-- 3. RLS (Row Level Security) 활성화
ALTER TABLE feature_votes ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 생성
-- 모든 인증된 사용자가 투표 결과를 볼 수 있음 (투표 결과 공개)
CREATE POLICY "Anyone can view all votes." 
    ON feature_votes
    FOR SELECT 
    TO authenticated
    USING (true);

-- 인증된 사용자만 자신의 투표를 등록할 수 있음
CREATE POLICY "Users can insert their own votes." 
    ON feature_votes
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 투표 수정/삭제 불가 (투표는 최초 1회만 유효)
-- UPDATE, DELETE 정책 없음 = 불가

-- 5. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_feature_votes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_feature_votes_updated_at
    BEFORE UPDATE ON feature_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_feature_votes_updated_at();

-- 6. 권한 설정
GRANT SELECT ON feature_votes TO authenticated;
GRANT INSERT ON feature_votes TO authenticated;
GRANT SELECT ON feature_votes TO service_role;
GRANT ALL ON feature_votes TO service_role;

-- 7. 주석
COMMENT ON TABLE feature_votes IS '신규 기능 투표 시스템 - 사용자들이 원하는 기능에 투표';
COMMENT ON COLUMN feature_votes.feature_key IS '기능 고유 식별자 (예: kpi-dashboard, google-review-analysis)';
COMMENT ON COLUMN feature_votes.vote_type IS 'want: 빨리 만들어주세요, not_needed: 별로 필요없을것 같아요';
COMMENT ON CONSTRAINT unique_user_feature_vote ON feature_votes IS '중복 투표 방지: 한 사용자는 각 기능에 대해 한 번만 투표 가능';
