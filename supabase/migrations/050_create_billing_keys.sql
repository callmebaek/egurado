-- ============================================
-- 빌링키 테이블 생성
-- Toss Payment 자동결제(빌링) 지원
-- ============================================

-- billing_keys 테이블: 사용자별 빌링키 저장 (자동결제용)
CREATE TABLE IF NOT EXISTS billing_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Toss Payment 빌링 정보
    billing_key TEXT NOT NULL, -- 암호화된 빌링키
    customer_key TEXT NOT NULL, -- 토스 customerKey (사용자 고유 식별자)
    
    -- 결제 수단 정보
    method TEXT NOT NULL DEFAULT 'card', -- 'card', 'transfer'
    card_company TEXT, -- 카드사 (예: '현대', '삼성')
    card_number TEXT, -- 마스킹된 카드번호 (예: '4330****123*')
    card_type TEXT, -- '신용', '체크'
    
    -- 상태
    is_active BOOLEAN DEFAULT true, -- 활성 여부
    authenticated_at TIMESTAMPTZ, -- 인증 시각
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_billing_keys_user_id ON billing_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_keys_customer_key ON billing_keys(customer_key);
CREATE INDEX IF NOT EXISTS idx_billing_keys_active ON billing_keys(is_active);

-- RLS 정책
ALTER TABLE billing_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own billing keys" ON billing_keys
    FOR SELECT USING (auth.uid() = user_id);

-- Service role full access (결제 서버용)
CREATE POLICY "Service role full access on billing_keys" ON billing_keys
    FOR ALL USING (true)
    WITH CHECK (true);

-- updated_at 트리거
CREATE TRIGGER update_billing_keys_updated_at
    BEFORE UPDATE ON billing_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 코멘트
COMMENT ON TABLE billing_keys IS '사용자 빌링키 (자동결제용)';
COMMENT ON COLUMN billing_keys.billing_key IS 'Toss 발급 빌링키 (암호화됨)';
COMMENT ON COLUMN billing_keys.customer_key IS 'Toss customerKey (사용자 식별자)';
COMMENT ON COLUMN billing_keys.is_active IS '활성 상태 (해지 시 false)';
