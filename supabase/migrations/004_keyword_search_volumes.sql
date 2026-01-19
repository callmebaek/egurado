-- 키워드 검색량 저장 테이블
CREATE TABLE IF NOT EXISTS keyword_search_volumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  monthly_pc_qc_cnt BIGINT, -- PC 월간 검색량
  monthly_mobile_qc_cnt BIGINT, -- 모바일 월간 검색량
  monthly_ave_pc_clk_cnt BIGINT, -- PC 월간 평균 클릭수
  monthly_ave_mobile_clk_cnt BIGINT, -- 모바일 월간 평균 클릭수
  monthly_ave_pc_ctr DECIMAL(5,2), -- PC 월간 평균 클릭률
  monthly_ave_mobile_ctr DECIMAL(5,2), -- 모바일 월간 평균 클릭률
  comp_idx TEXT, -- 경쟁 정도 (낮음/중간/높음)
  search_result JSON, -- API 전체 응답 저장
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_keyword_search_volumes_user_id ON keyword_search_volumes(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_search_volumes_keyword ON keyword_search_volumes(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_search_volumes_created_at ON keyword_search_volumes(created_at DESC);

-- RLS 정책 설정
ALTER TABLE keyword_search_volumes ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 검색 이력만 볼 수 있음
CREATE POLICY "Users can view own keyword search volumes" ON keyword_search_volumes
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 검색 이력만 생성할 수 있음
CREATE POLICY "Users can insert own keyword search volumes" ON keyword_search_volumes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 검색 이력을 삭제할 수 있음
CREATE POLICY "Users can delete own keyword search volumes" ON keyword_search_volumes
  FOR DELETE USING (auth.uid() = user_id);

-- updated_at 트리거 적용
CREATE TRIGGER update_keyword_search_volumes_updated_at
    BEFORE UPDATE ON keyword_search_volumes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
