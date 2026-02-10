-- ============================================
-- 쿠폰 시스템 테이블 생성
-- 할인 쿠폰 관리 및 적용
-- ============================================

-- coupons 테이블: 쿠폰 정보 관리
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 쿠폰 기본 정보
    code TEXT NOT NULL UNIQUE, -- 쿠폰 코드 (직접 입력 또는 자동 생성)
    name TEXT NOT NULL, -- 쿠폰 이름 (예: "런칭 50% 할인")
    description TEXT, -- 쿠폰 설명
    
    -- 할인 정보
    discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value INTEGER NOT NULL, -- percentage: 할인율(%), fixed: 할인금액(원)
    
    -- 적용 조건
    min_tier TEXT, -- 최소 적용 가능 Tier (NULL이면 제한 없음)
    applicable_tiers TEXT[] DEFAULT ARRAY['basic', 'basic_plus', 'pro'], -- 적용 가능 Tier 목록
    
    -- 사용 제한
    max_uses INTEGER, -- 총 사용 가능 횟수 (NULL이면 무제한)
    current_uses INTEGER DEFAULT 0, -- 현재 사용 횟수
    max_uses_per_user INTEGER DEFAULT 1, -- 사용자당 사용 가능 횟수
    
    -- 유효기간
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ, -- NULL이면 무기한
    
    -- 쿠폰 지속 효과
    is_permanent BOOLEAN DEFAULT true, -- 영구 할인 여부 (구독 기간 내내 할인)
    duration_months INTEGER, -- 할인 적용 기간 (개월, is_permanent=false일 때만 사용)
    is_recurring BOOLEAN DEFAULT true, -- true: 구독 기간 내내 할인, false: 첫 결제만 (deprecated, use is_permanent)
    
    -- 상태
    is_active BOOLEAN DEFAULT true, -- 활성화/비활성화
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    
    -- 관리 정보
    created_by UUID REFERENCES auth.users(id), -- 생성한 관리자
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_valid_until ON coupons(valid_until);

-- RLS 정책
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- 활성화된 쿠폰만 일반 사용자 조회 가능
CREATE POLICY "Users can view active coupons" ON coupons
    FOR SELECT USING (is_active = true);

-- Service role full access (관리자용)
CREATE POLICY "Service role full access on coupons" ON coupons
    FOR ALL USING (true)
    WITH CHECK (true);

-- updated_at 트리거
CREATE TRIGGER update_coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 사용자 쿠폰 적용 내역
-- ============================================

-- user_coupons 테이블: 사용자별 쿠폰 사용 내역
CREATE TABLE IF NOT EXISTS user_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    
    -- 적용 정보
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    discount_type TEXT NOT NULL, -- 적용 당시 할인 타입
    discount_value INTEGER NOT NULL, -- 적용 당시 할인값
    
    -- 연결된 구독
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    -- 상태
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 사용자별 쿠폰 중복 적용 방지
    UNIQUE(user_id, coupon_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_coupon_id ON user_coupons(coupon_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_status ON user_coupons(status);

-- RLS 정책
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coupons" ON user_coupons
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coupons" ON user_coupons
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access on user_coupons" ON user_coupons
    FOR ALL USING (true)
    WITH CHECK (true);

-- updated_at 트리거
CREATE TRIGGER update_user_coupons_updated_at
    BEFORE UPDATE ON user_coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- subscriptions 테이블 컬럼 추가
-- 쿠폰 연결 및 결제 금액 정보
-- ============================================

-- 구독 테이블에 쿠폰 및 가격 정보 추가
ALTER TABLE subscriptions 
    ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id),
    ADD COLUMN IF NOT EXISTS original_price INTEGER, -- 원래 가격
    ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0, -- 할인 금액
    ADD COLUMN IF NOT EXISTS final_price INTEGER, -- 최종 결제 금액
    ADD COLUMN IF NOT EXISTS billing_key_id UUID REFERENCES billing_keys(id);

-- 코멘트
COMMENT ON TABLE coupons IS '쿠폰 관리 (할인율/할인금액, 유효기간 등)';
COMMENT ON COLUMN coupons.code IS '쿠폰 코드 (유저가 입력하는 값)';
COMMENT ON COLUMN coupons.discount_type IS 'percentage(%), fixed(원)';
COMMENT ON COLUMN coupons.discount_value IS '할인값 (percentage면 %, fixed면 원)';
COMMENT ON COLUMN coupons.is_recurring IS 'true: 구독 기간 내내 적용, false: 첫 결제만';

COMMENT ON TABLE user_coupons IS '사용자별 쿠폰 적용 내역';
COMMENT ON COLUMN user_coupons.status IS 'active(적용중), used(사용완료), expired(만료), cancelled(취소)';


-- ============================================
-- 쿠폰 유효성 검사 함수
-- ============================================

CREATE OR REPLACE FUNCTION validate_coupon(
    p_code TEXT,
    p_user_id UUID,
    p_tier TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_coupon RECORD;
    v_user_usage_count INTEGER;
BEGIN
    -- 쿠폰 조회
    SELECT * INTO v_coupon
    FROM coupons
    WHERE code = UPPER(TRIM(p_code));
    
    -- 쿠폰 존재 여부
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'COUPON_NOT_FOUND',
            'message', '존재하지 않는 쿠폰 코드입니다.'
        );
    END IF;
    
    -- 활성화 여부
    IF NOT v_coupon.is_active THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'COUPON_INACTIVE',
            'message', '비활성화된 쿠폰입니다.'
        );
    END IF;
    
    -- 유효기간 체크
    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'COUPON_EXPIRED',
            'message', '만료된 쿠폰입니다.'
        );
    END IF;
    
    IF v_coupon.valid_from > NOW() THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'COUPON_NOT_STARTED',
            'message', '아직 사용 가능 기간이 아닙니다.'
        );
    END IF;
    
    -- 총 사용 횟수 체크
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'COUPON_MAX_USES',
            'message', '쿠폰 사용 가능 횟수를 초과했습니다.'
        );
    END IF;
    
    -- 사용자별 사용 횟수 체크
    SELECT COUNT(*) INTO v_user_usage_count
    FROM user_coupons
    WHERE user_id = p_user_id AND coupon_id = v_coupon.id;
    
    IF v_user_usage_count >= v_coupon.max_uses_per_user THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'COUPON_USER_MAX_USES',
            'message', '이미 사용한 쿠폰입니다.'
        );
    END IF;
    
    -- Tier 적용 가능 여부 체크
    IF p_tier IS NOT NULL AND v_coupon.applicable_tiers IS NOT NULL THEN
        IF NOT (p_tier = ANY(v_coupon.applicable_tiers)) THEN
            RETURN jsonb_build_object(
                'valid', false,
                'error', 'COUPON_TIER_MISMATCH',
                'message', '해당 요금제에는 적용할 수 없는 쿠폰입니다.'
            );
        END IF;
    END IF;
    
    -- 유효한 쿠폰
    RETURN jsonb_build_object(
        'valid', true,
        'coupon_id', v_coupon.id,
        'code', v_coupon.code,
        'name', v_coupon.name,
        'discount_type', v_coupon.discount_type,
        'discount_value', v_coupon.discount_value,
        'is_recurring', v_coupon.is_recurring
    );
END;
$$;

GRANT EXECUTE ON FUNCTION validate_coupon(TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION validate_coupon(TEXT, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION validate_coupon IS '쿠폰 유효성 검사 (코드, 사용자, Tier 기준)';


-- ============================================
-- Tier별 가격 조회 함수
-- ============================================

CREATE OR REPLACE FUNCTION get_tier_price(p_tier TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN CASE p_tier
        WHEN 'free' THEN 0
        WHEN 'basic' THEN 15000
        WHEN 'basic_plus' THEN 25000
        WHEN 'pro' THEN 50000
        WHEN 'custom' THEN 0 -- 협의 필요
        WHEN 'god' THEN 0 -- 관리자 전용
        ELSE 0
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION get_tier_price(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_tier_price(TEXT) TO authenticated;

COMMENT ON FUNCTION get_tier_price IS 'Tier별 월 구독 가격 조회 (원)';


-- ============================================
-- 쿠폰 코드 생성 함수
-- ============================================

CREATE OR REPLACE FUNCTION generate_coupon_code(p_length INTEGER DEFAULT 8)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 혼동 문자 제외 (I,O,0,1)
    v_code TEXT := '';
    v_i INTEGER;
BEGIN
    FOR v_i IN 1..p_length LOOP
        v_code := v_code || SUBSTR(v_chars, FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER, 1);
    END LOOP;
    
    -- 중복 체크
    WHILE EXISTS (SELECT 1 FROM coupons WHERE code = v_code) LOOP
        v_code := '';
        FOR v_i IN 1..p_length LOOP
            v_code := v_code || SUBSTR(v_chars, FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER, 1);
        END LOOP;
    END LOOP;
    
    RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_coupon_code(INTEGER) TO service_role;

COMMENT ON FUNCTION generate_coupon_code IS '랜덤 쿠폰 코드 생성 (중복 방지)';

