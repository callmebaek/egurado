-- Metric Tracker Feature
-- 주요지표 추적 기능을 위한 테이블

-- metric_trackers 테이블: 추적 설정 정보
CREATE TABLE IF NOT EXISTS metric_trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  
  -- 업데이트 주기 설정
  update_frequency TEXT DEFAULT 'daily_once' CHECK (update_frequency IN ('daily_once', 'daily_twice', 'daily_thrice')),
  
  -- 업데이트 시간 (시간대: Asia/Seoul, 24시간 형식)
  -- daily_once: [16], daily_twice: [6, 16], daily_thrice: [6, 12, 18]
  update_times INTEGER[] DEFAULT ARRAY[16], -- 시간 배열
  
  -- 알림 설정
  notification_enabled BOOLEAN DEFAULT false,
  notification_type TEXT CHECK (notification_type IN ('kakao', 'sms', 'email', NULL)),
  notification_consent BOOLEAN DEFAULT false, -- 알림 수신 동의 여부
  notification_phone TEXT, -- 문자 알림용 전화번호
  notification_email TEXT, -- 이메일 알림용 이메일
  
  -- 상태
  is_active BOOLEAN DEFAULT true,
  last_collected_at TIMESTAMP WITH TIME ZONE,
  next_collection_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 유니크 제약: 같은 매장x키워드 조합은 1개만
  UNIQUE(store_id, keyword_id)
);

-- daily_metrics 테이블: 일별 수집된 지표 데이터
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id UUID NOT NULL REFERENCES metric_trackers(id) ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  -- 수집 날짜 (날짜만, 시간 제외)
  collection_date DATE NOT NULL,
  
  -- 지표 데이터
  rank INTEGER, -- 순위
  visitor_review_count INTEGER DEFAULT 0, -- 방문자 리뷰 수
  blog_review_count INTEGER DEFAULT 0, -- 블로그 리뷰 수
  
  -- 순위 변동
  rank_change INTEGER, -- 전일 대비 순위 변동
  previous_rank INTEGER, -- 전일 순위
  
  -- 수집 시간
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 유니크 제약: 같은 tracker + 날짜 조합은 1개만 (하루에 1개씩만 저장)
  UNIQUE(tracker_id, collection_date)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_metric_trackers_user_id ON metric_trackers(user_id);
CREATE INDEX IF NOT EXISTS idx_metric_trackers_store_id ON metric_trackers(store_id);
CREATE INDEX IF NOT EXISTS idx_metric_trackers_keyword_id ON metric_trackers(keyword_id);
CREATE INDEX IF NOT EXISTS idx_metric_trackers_is_active ON metric_trackers(is_active);
CREATE INDEX IF NOT EXISTS idx_metric_trackers_next_collection ON metric_trackers(next_collection_at) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_daily_metrics_tracker_id ON daily_metrics(tracker_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_keyword_id ON daily_metrics(keyword_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_store_id ON daily_metrics(store_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_collection_date ON daily_metrics(collection_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_collected_at ON daily_metrics(collected_at DESC);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE metric_trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

-- metric_trackers 정책
CREATE POLICY "Users can view own metric trackers" ON metric_trackers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own metric trackers" ON metric_trackers
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own metric trackers" ON metric_trackers
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own metric trackers" ON metric_trackers
  FOR DELETE USING (user_id = auth.uid());

-- daily_metrics 정책
CREATE POLICY "Users can view own daily metrics" ON daily_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM metric_trackers 
      WHERE metric_trackers.id = daily_metrics.tracker_id 
      AND metric_trackers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own daily metrics" ON daily_metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM metric_trackers 
      WHERE metric_trackers.id = daily_metrics.tracker_id 
      AND metric_trackers.user_id = auth.uid()
    )
  );

-- updated_at 트리거
CREATE TRIGGER update_metric_trackers_updated_at
    BEFORE UPDATE ON metric_trackers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
