-- ============================================
-- 크레딧 트랜잭션 테이블
-- 모든 크레딧 사용/충전 내역 추적
-- ============================================

-- credit_transactions 테이블: 크레딧 사용/충전 내역
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 트랜잭션 타입
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deduct', 'charge', 'refund', 'reset')),
    
    -- 기능 정보 (차감 시)
    feature TEXT, -- 'rank_check', 'review_analysis', 'ai_reply_generate', etc.
    
    -- 크레딧 수량
    credits_amount INTEGER NOT NULL, -- 양수: 충전/환불, 음수: 차감
    
    -- 어떤 크레딧에서 차감/충전했는지
    from_monthly INTEGER DEFAULT 0, -- 월 구독 크레딧에서 차감/충전
    from_manual INTEGER DEFAULT 0, -- 수동 충전 크레딧에서 차감/충전
    
    -- 트랜잭션 전/후 잔액
    balance_before INTEGER, -- 트랜잭션 전 잔액
    balance_after INTEGER, -- 트랜잭션 후 잔액
    
    -- 상태
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    
    -- 메타데이터 (기능별 상세 정보)
    metadata JSONB DEFAULT '{}',
    -- 예시:
    -- {
    --   "keyword": "강남 피부과",
    --   "rank": 45,
    --   "review_count": 100,
    --   "competitor_count": 10
    -- }
    
    -- 관련 결제 (충전 시)
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    
    -- 시간
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_feature ON credit_transactions(feature);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_status ON credit_transactions(status);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- RLS 정책
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access on transactions" ON credit_transactions
    FOR ALL USING (true)
    WITH CHECK (true);

-- 크레딧 체크 함수 (기능 실행 전)
CREATE OR REPLACE FUNCTION check_sufficient_credits(
    p_user_id uuid,
    p_required_credits integer
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_credits record;
    v_sufficient boolean;
    v_shortage integer;
BEGIN
    -- 현재 크레딧 조회
    SELECT * INTO v_credits
    FROM user_credits
    WHERE user_id = p_user_id;
    
    -- God tier는 무제한
    IF v_credits.tier = 'god' THEN
        RETURN jsonb_build_object(
            'sufficient', true,
            'current_credits', -1,
            'required_credits', p_required_credits,
            'shortage', 0,
            'is_god_tier', true
        );
    END IF;
    
    -- 잔액 확인
    v_sufficient := v_credits.total_remaining >= p_required_credits;
    v_shortage := CASE WHEN v_sufficient THEN 0 ELSE p_required_credits - v_credits.total_remaining END;
    
    RETURN jsonb_build_object(
        'sufficient', v_sufficient,
        'current_credits', v_credits.total_remaining,
        'monthly_remaining', v_credits.monthly_remaining,
        'manual_credits', v_credits.manual_credits,
        'required_credits', p_required_credits,
        'shortage', v_shortage,
        'tier', v_credits.tier,
        'next_reset', v_credits.next_reset_at,
        'is_god_tier', false
    );
END;
$$;

GRANT EXECUTE ON FUNCTION check_sufficient_credits(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION check_sufficient_credits(uuid, integer) TO authenticated;

-- 크레딧 차감 함수 (API 성공 후)
CREATE OR REPLACE FUNCTION deduct_user_credits(
    p_user_id uuid,
    p_feature text,
    p_credits_amount integer,
    p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_credits record;
    v_monthly_available integer;
    v_from_monthly integer;
    v_from_manual integer;
    v_balance_before integer;
    v_balance_after integer;
    v_transaction_id uuid;
BEGIN
    -- 현재 크레딧 조회
    SELECT * INTO v_credits
    FROM user_credits
    WHERE user_id = p_user_id
    FOR UPDATE; -- 락 걸기
    
    -- God tier는 차감 안 함
    IF v_credits.tier = 'god' THEN
        -- 트랜잭션 기록만 (차감 없음)
        INSERT INTO credit_transactions (
            user_id, transaction_type, feature, credits_amount,
            from_monthly, from_manual, balance_before, balance_after,
            status, metadata, completed_at
        ) VALUES (
            p_user_id, 'deduct', p_feature, 0,
            0, 0, -1, -1,
            'completed', p_metadata, NOW()
        ) RETURNING id INTO v_transaction_id;
        
        RETURN v_transaction_id;
    END IF;
    
    -- 잔액 부족 체크
    IF v_credits.total_remaining < p_credits_amount THEN
        RAISE EXCEPTION 'Insufficient credits: required %, available %', p_credits_amount, v_credits.total_remaining;
    END IF;
    
    v_balance_before := v_credits.total_remaining;
    
    -- 우선순위 1: 월 구독 크레딧 (이월 안 되므로 먼저 사용)
    v_monthly_available := v_credits.monthly_remaining;
    v_from_monthly := LEAST(p_credits_amount, v_monthly_available);
    
    -- 우선순위 2: 수동 충전 크레딧
    v_from_manual := p_credits_amount - v_from_monthly;
    
    -- 크레딧 차감
    UPDATE user_credits
    SET 
        monthly_used = monthly_used + v_from_monthly,
        manual_credits = manual_credits - v_from_manual,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    v_balance_after := v_balance_before - p_credits_amount;
    
    -- 트랜잭션 기록
    INSERT INTO credit_transactions (
        user_id, transaction_type, feature, credits_amount,
        from_monthly, from_manual, balance_before, balance_after,
        status, metadata, completed_at
    ) VALUES (
        p_user_id, 'deduct', p_feature, -p_credits_amount,
        v_from_monthly, v_from_manual, v_balance_before, v_balance_after,
        'completed', p_metadata, NOW()
    ) RETURNING id INTO v_transaction_id;
    
    RETURN v_transaction_id;
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_user_credits(uuid, text, integer, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION deduct_user_credits(uuid, text, integer, jsonb) TO authenticated;

-- 수동 충전 함수
CREATE OR REPLACE FUNCTION charge_manual_credits(
    p_user_id uuid,
    p_credits_amount integer,
    p_payment_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance_before integer;
    v_balance_after integer;
    v_transaction_id uuid;
BEGIN
    -- 현재 잔액 조회
    SELECT total_remaining INTO v_balance_before
    FROM user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- 크레딧 충전
    UPDATE user_credits
    SET 
        manual_credits = manual_credits + p_credits_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    v_balance_after := v_balance_before + p_credits_amount;
    
    -- 트랜잭션 기록
    INSERT INTO credit_transactions (
        user_id, transaction_type, credits_amount,
        from_monthly, from_manual, balance_before, balance_after,
        status, payment_id, completed_at
    ) VALUES (
        p_user_id, 'charge', p_credits_amount,
        0, p_credits_amount, v_balance_before, v_balance_after,
        'completed', p_payment_id, NOW()
    ) RETURNING id INTO v_transaction_id;
    
    RETURN v_transaction_id;
END;
$$;

GRANT EXECUTE ON FUNCTION charge_manual_credits(uuid, integer, uuid) TO service_role;

-- 코멘트
COMMENT ON TABLE credit_transactions IS '크레딧 트랜잭션 내역 (차감/충전/환불)';
COMMENT ON COLUMN credit_transactions.transaction_type IS 'deduct (차감), charge (충전), refund (환불), reset (리셋)';
COMMENT ON COLUMN credit_transactions.credits_amount IS '양수: 충전/환불, 음수: 차감';
COMMENT ON COLUMN credit_transactions.metadata IS '기능별 상세 정보 (JSON)';
COMMENT ON FUNCTION check_sufficient_credits IS '크레딧 충분한지 확인 (기능 실행 전)';
COMMENT ON FUNCTION deduct_user_credits IS '크레딧 차감 (API 성공 후)';
COMMENT ON FUNCTION charge_manual_credits IS '수동 충전 크레딧 추가';
