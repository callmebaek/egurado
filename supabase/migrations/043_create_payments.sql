-- ============================================
-- 결제 내역 테이블 생성
-- Toss Payment 연동 대비
-- ============================================

-- payments 테이블: 결제 내역
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    -- 주문 정보 (우리 시스템)
    order_id TEXT NOT NULL UNIQUE, -- 우리가 생성하는 주문 ID (예: ORD_20260129_USER123_001)
    order_name TEXT NOT NULL, -- 주문 이름 (예: "Basic+ 월간 구독")
    
    -- Toss Payment 정보
    payment_key TEXT UNIQUE, -- Toss가 생성하는 결제 키 (승인 후 저장)
    
    -- 금액
    amount INTEGER NOT NULL, -- 결제 금액 (원)
    currency TEXT DEFAULT 'KRW',
    
    -- 결제 수단
    method TEXT, -- 'card', 'transfer', 'virtual_account', 'mobile', 'easy_pay' (간편결제)
    easy_pay_provider TEXT, -- 간편결제일 경우: 'kakaopay', 'naverpay', 'tosspay', etc.
    
    -- 카드 정보 (카드 결제 시)
    card_company TEXT,
    card_number TEXT, -- 마스킹된 카드번호 (예: "1234-****-****-5678")
    
    -- 결제 상태
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled', 'aborted', 'failed')),
    
    -- 결제 타입
    payment_type TEXT NOT NULL CHECK (payment_type IN ('subscription', 'credit_package', 'one_time')),
    
    -- 시간 정보
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Toss Payment 응답 (전체 JSON 저장)
    toss_response JSONB,
    
    -- 취소/환불 정보
    cancel_reason TEXT,
    cancel_amount INTEGER, -- 부분 취소 가능
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_key ON payments(payment_key);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_approved_at ON payments(approved_at DESC);

-- RLS 정책
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);

-- Service role은 모든 작업 가능 (결제 콜백용)
CREATE POLICY "Service role full access on payments" ON payments
    FOR ALL USING (true)
    WITH CHECK (true);

-- updated_at 트리거
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 주문 ID 생성 함수
CREATE OR REPLACE FUNCTION generate_order_id(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    v_date_str text;
    v_user_short text;
    v_sequence int;
    v_order_id text;
BEGIN
    -- 날짜 문자열 (YYYYMMDD)
    v_date_str := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- 사용자 ID 앞 8자리
    v_user_short := SUBSTRING(p_user_id::text, 1, 8);
    
    -- 오늘 날짜의 결제 수 + 1
    SELECT COALESCE(COUNT(*) + 1, 1) INTO v_sequence
    FROM payments
    WHERE user_id = p_user_id
    AND DATE(created_at) = CURRENT_DATE;
    
    -- 주문 ID 생성: ORD_20260129_12345678_001
    v_order_id := 'ORD_' || v_date_str || '_' || v_user_short || '_' || LPAD(v_sequence::text, 3, '0');
    
    RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_order_id(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION generate_order_id(uuid) TO authenticated;

-- 코멘트
COMMENT ON TABLE payments IS '결제 내역 (Toss Payment 연동)';
COMMENT ON COLUMN payments.order_id IS '우리 시스템이 생성하는 주문 ID';
COMMENT ON COLUMN payments.payment_key IS 'Toss Payment가 생성하는 결제 키';
COMMENT ON COLUMN payments.status IS 'pending, in_progress, done, cancelled, aborted, failed';
COMMENT ON COLUMN payments.payment_type IS 'subscription (구독), credit_package (크레딧 충전), one_time (단건)';
COMMENT ON COLUMN payments.toss_response IS 'Toss Payment 전체 응답 JSON';
COMMENT ON FUNCTION generate_order_id IS '주문 ID 자동 생성 (ORD_YYYYMMDD_USERID_SEQ)';
