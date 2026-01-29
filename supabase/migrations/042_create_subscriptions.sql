-- ============================================
-- 구독 관리 테이블 생성
-- Toss Payment 연동 준비
-- ============================================

-- subscriptions 테이블: 사용자 구독 정보
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 구독 정보
    tier TEXT NOT NULL CHECK (tier IN ('free', 'basic', 'basic_plus', 'pro', 'custom', 'god')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),
    
    -- 기간
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- NULL이면 무제한 (free, god)
    cancelled_at TIMESTAMPTZ,
    
    -- 결제 정보
    payment_method TEXT, -- 'card', 'kakaopay', 'naverpay', etc.
    auto_renewal BOOLEAN DEFAULT true,
    
    -- 다음 결제 예정일 (자동 갱신용)
    next_billing_date DATE,
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);

-- RLS 정책
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role은 모든 작업 가능 (결제 콜백용)
CREATE POLICY "Service role full access" ON subscriptions
    FOR ALL USING (true)
    WITH CHECK (true);

-- updated_at 트리거
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 코멘트
COMMENT ON TABLE subscriptions IS '사용자 구독 정보 (Tier, 기간, 자동 갱신)';
COMMENT ON COLUMN subscriptions.tier IS 'free, basic, basic_plus, pro, custom, god';
COMMENT ON COLUMN subscriptions.status IS 'active, cancelled, expired, paused';
COMMENT ON COLUMN subscriptions.next_billing_date IS '다음 결제 예정일 (자동 갱신용)';

-- 기존 사용자들에게 기본 구독 생성 함수
CREATE OR REPLACE FUNCTION init_subscription_for_existing_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO subscriptions (user_id, tier, status, started_at, expires_at, auto_renewal)
    SELECT 
        p.id,
        CASE 
            WHEN p.subscription_tier = 'free' THEN 'free'
            WHEN p.subscription_tier = 'basic' THEN 'basic'
            WHEN p.subscription_tier = 'pro' THEN 'pro'
            WHEN p.subscription_tier = 'god' THEN 'god'
            ELSE 'free'
        END,
        'active',
        NOW(),
        NULL, -- free, god는 만료일 없음
        false
    FROM profiles p
    WHERE NOT EXISTS (
        SELECT 1 FROM subscriptions s WHERE s.user_id = p.id
    );
END;
$$;

-- 함수 실행 권한
GRANT EXECUTE ON FUNCTION init_subscription_for_existing_users() TO service_role;

COMMENT ON FUNCTION init_subscription_for_existing_users IS '기존 사용자들에게 기본 구독 생성 (마이그레이션용)';

-- 실행 안내 (수동 실행 필요)
-- SELECT init_subscription_for_existing_users();
