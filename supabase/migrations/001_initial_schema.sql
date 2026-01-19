-- Egurado Database Schema
-- 네이버 플레이스 및 구글 비즈니스 프로필 관리 시스템

-- profiles 테이블: 사용자 프로필 정보
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- stores 테이블: 연결된 매장 정보
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('naver', 'google')),
  place_id TEXT NOT NULL, -- 네이버 플레이스 ID 또는 구글 Location ID
  store_name TEXT NOT NULL,
  credentials JSONB, -- 암호화된 세션/토큰 정보
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'error')),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform, place_id)
);

-- reviews 테이블: 수집된 리뷰
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  external_review_id TEXT NOT NULL, -- 플랫폼의 원본 리뷰 ID
  review_text TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  author_name TEXT,
  author_profile_url TEXT,
  visit_date DATE,
  posted_date TIMESTAMP WITH TIME ZONE,
  reply_text TEXT,
  reply_status TEXT DEFAULT 'none' CHECK (reply_status IN ('none', 'ai_generated', 'posted')),
  ai_generated_reply TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, platform, external_review_id)
);

-- keywords 테이블: 순위 추적 키워드
CREATE TABLE IF NOT EXISTS keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  current_rank INTEGER,
  previous_rank INTEGER,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, keyword)
);

-- rank_history 테이블: 순위 변동 기록
CREATE TABLE IF NOT EXISTS rank_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  rank INTEGER,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_store_id ON reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_reviews_platform ON reviews(platform);
CREATE INDEX IF NOT EXISTS idx_reviews_posted_date ON reviews(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_keywords_store_id ON keywords(store_id);
CREATE INDEX IF NOT EXISTS idx_rank_history_keyword_id ON rank_history(keyword_id);
CREATE INDEX IF NOT EXISTS idx_rank_history_checked_at ON rank_history(checked_at DESC);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE rank_history ENABLE ROW LEVEL SECURITY;

-- profiles 정책
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- stores 정책
CREATE POLICY "Users can view own stores" ON stores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stores" ON stores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stores" ON stores
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stores" ON stores
  FOR DELETE USING (auth.uid() = user_id);

-- reviews 정책
CREATE POLICY "Users can view own reviews" ON reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = reviews.store_id 
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own reviews" ON reviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = reviews.store_id 
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = reviews.store_id 
      AND stores.user_id = auth.uid()
    )
  );

-- keywords 정책
CREATE POLICY "Users can view own keywords" ON keywords
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = keywords.store_id 
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own keywords" ON keywords
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = keywords.store_id 
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own keywords" ON keywords
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = keywords.store_id 
      AND stores.user_id = auth.uid()
    )
  );

-- rank_history 정책
CREATE POLICY "Users can view own rank history" ON rank_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM keywords 
      JOIN stores ON stores.id = keywords.store_id
      WHERE keywords.id = rank_history.keyword_id 
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own rank history" ON rank_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM keywords 
      JOIN stores ON stores.id = keywords.store_id
      WHERE keywords.id = rank_history.keyword_id 
      AND stores.user_id = auth.uid()
    )
  );

-- 자동 updated_at 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- profiles 테이블에 updated_at 트리거 적용
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- reviews 테이블에 updated_at 트리거 적용
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


