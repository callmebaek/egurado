-- =====================================================
-- 리뷰 관리 테이블 생성 스크립트
-- =====================================================

-- 1. 리뷰 통계 테이블 (일별 집계)
CREATE TABLE IF NOT EXISTS review_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- 방문자 리뷰 통계
    visitor_review_count INT DEFAULT 0,
    visitor_positive_count INT DEFAULT 0,
    visitor_neutral_count INT DEFAULT 0,
    visitor_negative_count INT DEFAULT 0,
    visitor_receipt_count INT DEFAULT 0,  -- 영수증 리뷰
    visitor_reservation_count INT DEFAULT 0,  -- 예약자 리뷰
    
    -- 블로그 리뷰 통계
    blog_review_count INT DEFAULT 0,
    
    -- 파워 리뷰어 정보
    power_reviewer_count INT DEFAULT 0,  -- 파워리뷰어 수
    
    -- 요약 정보
    summary TEXT,  -- AI 생성 요약 (2-3문장)
    
    -- 메타 정보
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 제약 조건: 매장당 하루에 하나의 통계만
    UNIQUE(store_id, date)
);

-- 2. 개별 리뷰 테이블
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    review_stats_id UUID REFERENCES review_stats(id) ON DELETE CASCADE,
    
    -- 리뷰 기본 정보
    naver_review_id VARCHAR(255) NOT NULL,  -- 네이버 리뷰 ID
    review_type VARCHAR(50) NOT NULL,  -- 'visitor' 또는 'blog'
    
    -- 작성자 정보
    author_name VARCHAR(255),
    author_id VARCHAR(255),
    author_review_count INT DEFAULT 0,  -- 작성자가 쓴 총 리뷰 수
    is_power_reviewer BOOLEAN DEFAULT FALSE,  -- 파워리뷰어 여부 (100개 이상)
    
    -- 방문자 리뷰 전용 필드
    is_receipt_review BOOLEAN DEFAULT FALSE,  -- 영수증 리뷰 여부
    is_reservation_review BOOLEAN DEFAULT FALSE,  -- 예약자 리뷰 여부
    
    -- 리뷰 내용
    rating DECIMAL(2,1),  -- 별점 (0.0 ~ 5.0)
    content TEXT NOT NULL,  -- 리뷰 본문
    images TEXT[],  -- 이미지 URL 배열
    
    -- AI 감성 분석 결과
    sentiment VARCHAR(50),  -- 'positive', 'neutral', 'negative'
    temperature_score INT,  -- 리뷰 온도 (0~100)
    confidence DECIMAL(3,2),  -- 확신도 (0.0 ~ 1.0)
    evidence_quotes TEXT[],  -- 감성 근거 인용구
    
    -- 항목별 감성 (JSON)
    aspect_sentiments JSONB,  -- {taste: 'positive', service: 'neutral', ...}
    
    -- 메타 정보
    review_date TIMESTAMPTZ NOT NULL,  -- 리뷰 작성 날짜
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 제약 조건: 네이버 리뷰 ID는 유니크
    UNIQUE(naver_review_id)
);

-- 3. 인덱스 생성 (조회 성능 향상)
CREATE INDEX idx_review_stats_store_date ON review_stats(store_id, date DESC);
CREATE INDEX idx_reviews_store_id ON reviews(store_id);
CREATE INDEX idx_reviews_stats_id ON reviews(review_stats_id);
CREATE INDEX idx_reviews_sentiment ON reviews(sentiment);
CREATE INDEX idx_reviews_review_date ON reviews(review_date DESC);
CREATE INDEX idx_reviews_type ON reviews(review_type);

-- 4. 자동 업데이트 트리거 (updated_at)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_review_stats_updated_at
    BEFORE UPDATE ON review_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS (Row Level Security) 정책
ALTER TABLE review_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 매장 리뷰 통계만 조회 가능
CREATE POLICY review_stats_select_policy ON review_stats
    FOR SELECT
    USING (
        store_id IN (
            SELECT id FROM stores WHERE user_id = auth.uid()
        )
    );

-- 사용자는 자신의 매장 리뷰만 조회 가능
CREATE POLICY reviews_select_policy ON reviews
    FOR SELECT
    USING (
        store_id IN (
            SELECT id FROM stores WHERE user_id = auth.uid()
        )
    );

-- 6. 주석
COMMENT ON TABLE review_stats IS '리뷰 통계 테이블 (일별 집계)';
COMMENT ON TABLE reviews IS '개별 리뷰 테이블 (AI 감성 분석 포함)';
COMMENT ON COLUMN reviews.temperature_score IS '리뷰 온도: 0(매우 부정) ~ 100(매우 긍정)';
COMMENT ON COLUMN reviews.aspect_sentiments IS '항목별 감성: {taste, service, price_value, cleanliness, ambience, waiting_time, accessibility, others}';
