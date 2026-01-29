-- ============================================
-- 크레딧 패키지 테이블
-- 수동 충전용 크레딧 패키지 정보
-- ============================================

-- credit_packages 테이블: 수동 충전 패키지
CREATE TABLE IF NOT EXISTS credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 패키지 정보
    name TEXT NOT NULL, -- 예: "스타터 패키지", "베이직 패키지"
    display_name TEXT NOT NULL, -- 화면 표시용 이름
    description TEXT,
    
    -- 크레딧
    credits INTEGER NOT NULL, -- 지급되는 크레딧 수
    
    -- 가격 (추후 설정)
    price INTEGER, -- 원 단위, NULL이면 "Coming Soon"
    original_price INTEGER, -- 정가
    discount_rate INTEGER DEFAULT 0, -- 할인율 (%)
    
    -- 보너스
    bonus_credits INTEGER DEFAULT 0, -- 보너스 크레딧
    
    -- 인기 여부
    is_popular BOOLEAN DEFAULT false,
    
    -- 노출 순서
    display_order INTEGER DEFAULT 0,
    
    -- 활성화 여부
    is_active BOOLEAN DEFAULT true,
    
    -- 메타데이터
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_credit_packages_active ON credit_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_credit_packages_display_order ON credit_packages(display_order);

-- RLS 정책 (모든 사용자 조회 가능)
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active packages" ON credit_packages
    FOR SELECT USING (is_active = true);

-- Service role full access
CREATE POLICY "Service role full access on packages" ON credit_packages
    FOR ALL USING (true)
    WITH CHECK (true);

-- updated_at 트리거
CREATE TRIGGER update_credit_packages_updated_at
    BEFORE UPDATE ON credit_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 초기 패키지 데이터 삽입
INSERT INTO credit_packages (name, display_name, description, credits, price, original_price, discount_rate, bonus_credits, is_popular, display_order, is_active)
VALUES
    ('starter', '스타터', '소량 사용자를 위한 기본 패키지', 100, NULL, NULL, 0, 0, false, 1, true),
    ('basic', '베이직', '일반 사용자를 위한 추천 패키지', 500, NULL, NULL, 20, 50, true, 2, true),
    ('standard', '스탠다드', '활발한 사용자를 위한 패키지', 1000, NULL, NULL, 30, 150, false, 3, true),
    ('premium', '프리미엄', '파워 유저를 위한 대용량 패키지', 5000, NULL, NULL, 40, 1000, false, 4, true)
ON CONFLICT DO NOTHING;

-- 코멘트
COMMENT ON TABLE credit_packages IS '수동 충전용 크레딧 패키지';
COMMENT ON COLUMN credit_packages.credits IS '지급되는 기본 크레딧';
COMMENT ON COLUMN credit_packages.bonus_credits IS '추가 보너스 크레딧';
COMMENT ON COLUMN credit_packages.price IS '가격 (원), NULL이면 Coming Soon';
COMMENT ON COLUMN credit_packages.discount_rate IS '할인율 (%)';
