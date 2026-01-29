-- ============================================
-- 사용자 크레딧 테이블 (v2)
-- 월 구독 크레딧 vs 수동 충전 크레딧 분리
-- 결제일 기준 리셋 지원
-- ============================================

-- user_credits 테이블: 크레딧 잔액 관리
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 현재 Tier
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'basic_plus', 'pro', 'custom', 'god')),
    
    -- 월 구독 크레딧 (리셋 시 소멸)
    monthly_credits INTEGER NOT NULL DEFAULT 0, -- Tier별 할당량
    monthly_used INTEGER NOT NULL DEFAULT 0, -- 이번 달 사용량
    monthly_remaining INTEGER GENERATED ALWAYS AS (monthly_credits - monthly_used) STORED,
    
    -- 수동 충전 크레딧 (이월 가능)
    manual_credits INTEGER NOT NULL DEFAULT 0, -- 수동 충전 잔액 (소진될 때까지 유지)
    
    -- 전체 잔액 (읽기 전용)
    total_remaining INTEGER GENERATED ALWAYS AS ((monthly_credits - monthly_used) + manual_credits) STORED,
    
    -- 리셋 정책
    reset_date DATE NOT NULL, -- 매월 이 날짜에 리셋 (결제일 기준)
    last_reset_at TIMESTAMPTZ, -- 마지막 리셋 시각
    next_reset_at TIMESTAMPTZ, -- 다음 리셋 예정 시각
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_tier ON user_credits(tier);
CREATE INDEX IF NOT EXISTS idx_user_credits_next_reset ON user_credits(next_reset_at);

-- RLS 정책
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits" ON user_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON user_credits
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access on credits" ON user_credits
    FOR ALL USING (true)
    WITH CHECK (true);

-- updated_at 트리거
CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Tier별 월 크레딧 조회 함수
CREATE OR REPLACE FUNCTION get_tier_monthly_credits(p_tier text)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN CASE p_tier
        WHEN 'free' THEN 100
        WHEN 'basic' THEN 600
        WHEN 'basic_plus' THEN 1200
        WHEN 'pro' THEN 3000
        WHEN 'custom' THEN 5000 -- 기본값, 협의 필요
        WHEN 'god' THEN -1 -- 무제한
        ELSE 100
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION get_tier_monthly_credits(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_tier_monthly_credits(text) TO authenticated;

-- Tier별 자동수집 키워드 제한 조회 함수
CREATE OR REPLACE FUNCTION get_tier_auto_collection_limit(p_tier text)
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN CASE p_tier
        WHEN 'free' THEN 0
        WHEN 'basic' THEN 3
        WHEN 'basic_plus' THEN 6
        WHEN 'pro' THEN 15
        WHEN 'custom' THEN 50 -- 협의 필요
        WHEN 'god' THEN -1 -- 무제한
        ELSE 0
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION get_tier_auto_collection_limit(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_tier_auto_collection_limit(text) TO authenticated;

-- 사용자 크레딧 초기화 함수
CREATE OR REPLACE FUNCTION init_user_credits(
    p_user_id uuid,
    p_tier text DEFAULT 'free',
    p_reset_date integer DEFAULT 1 -- 매월 1일 (결제일)
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_credits_id uuid;
    v_monthly_credits integer;
    v_next_reset timestamptz;
BEGIN
    -- Tier별 월 크레딧 조회
    v_monthly_credits := get_tier_monthly_credits(p_tier);
    
    -- 다음 리셋일 계산
    v_next_reset := (DATE_TRUNC('month', NOW()) + INTERVAL '1 month' + (p_reset_date - 1 || ' days')::interval)::timestamptz;
    
    -- 크레딧 레코드 생성
    INSERT INTO user_credits (
        user_id,
        tier,
        monthly_credits,
        monthly_used,
        manual_credits,
        reset_date,
        last_reset_at,
        next_reset_at
    ) VALUES (
        p_user_id,
        p_tier,
        v_monthly_credits,
        0,
        0,
        p_reset_date,
        NOW(),
        v_next_reset
    )
    ON CONFLICT (user_id) DO UPDATE SET
        tier = EXCLUDED.tier,
        monthly_credits = EXCLUDED.monthly_credits,
        updated_at = NOW()
    RETURNING id INTO v_credits_id;
    
    RETURN v_credits_id;
END;
$$;

GRANT EXECUTE ON FUNCTION init_user_credits(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION init_user_credits(uuid, text, integer) TO authenticated;

-- 크레딧 리셋 함수 (스케줄러용)
CREATE OR REPLACE FUNCTION reset_monthly_credits(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tier text;
    v_monthly_credits integer;
    v_reset_date integer;
    v_next_reset timestamptz;
BEGIN
    -- 현재 Tier 조회
    SELECT tier, reset_date INTO v_tier, v_reset_date
    FROM user_credits
    WHERE user_id = p_user_id;
    
    -- Tier별 월 크레딧 조회
    v_monthly_credits := get_tier_monthly_credits(v_tier);
    
    -- 다음 리셋일 계산 (다음 달 동일한 날짜)
    v_next_reset := (DATE_TRUNC('month', NOW()) + INTERVAL '1 month' + (v_reset_date - 1 || ' days')::interval)::timestamptz;
    
    -- 월 구독 크레딧 리셋 (수동 충전 크레딧은 유지)
    UPDATE user_credits
    SET 
        monthly_credits = v_monthly_credits,
        monthly_used = 0,
        last_reset_at = NOW(),
        next_reset_at = v_next_reset,
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_monthly_credits(uuid) TO service_role;

-- 코멘트
COMMENT ON TABLE user_credits IS '사용자 크레딧 잔액 (월 구독 vs 수동 충전 분리)';
COMMENT ON COLUMN user_credits.monthly_credits IS 'Tier별 월 할당 크레딧';
COMMENT ON COLUMN user_credits.monthly_used IS '이번 달 사용한 크레딧';
COMMENT ON COLUMN user_credits.manual_credits IS '수동 충전 크레딧 (이월 가능)';
COMMENT ON COLUMN user_credits.reset_date IS '매월 리셋 날짜 (1-31, 결제일 기준)';
COMMENT ON FUNCTION get_tier_monthly_credits IS 'Tier별 월 크레딧 조회';
COMMENT ON FUNCTION get_tier_auto_collection_limit IS 'Tier별 자동수집 키워드 제한 조회';
COMMENT ON FUNCTION init_user_credits IS '사용자 크레딧 초기화';
COMMENT ON FUNCTION reset_monthly_credits IS '월 구독 크레딧 리셋 (스케줄러용)';
