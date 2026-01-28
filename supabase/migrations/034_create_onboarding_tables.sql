-- =====================================
-- Migration 034: Onboarding Progress & Preferences Tables
-- =====================================
-- 
-- Purpose: 사용자의 온보딩 진행 상태 및 UI 설정 저장
-- Date: 2026-01-28
--
-- Tables:
--   1. onboarding_progress: 각 액션의 완료 상태 저장
--   2. onboarding_preferences: 접어두기 등 UI 설정 저장
--
-- =====================================

-- 1. onboarding_progress 테이블 생성
CREATE TABLE IF NOT EXISTS onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_key TEXT NOT NULL,
    completed BOOLEAN DEFAULT false NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- 중복 방지: 사용자당 각 액션은 하나의 레코드만
    CONSTRAINT unique_user_action UNIQUE (user_id, action_key)
);

-- 2. onboarding_preferences 테이블 생성
CREATE TABLE IF NOT EXISTS onboarding_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_collapsed BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_action 
    ON onboarding_progress(user_id, action_key);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_completed 
    ON onboarding_progress(user_id, completed);

-- 4. RLS (Row Level Security) 활성화
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_preferences ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책: onboarding_progress
CREATE POLICY "Users can view their own onboarding progress." 
    ON onboarding_progress
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding progress." 
    ON onboarding_progress
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding progress." 
    ON onboarding_progress
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own onboarding progress." 
    ON onboarding_progress
    FOR DELETE 
    USING (auth.uid() = user_id);

-- 6. RLS 정책: onboarding_preferences
CREATE POLICY "Users can view their own onboarding preferences." 
    ON onboarding_preferences
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding preferences." 
    ON onboarding_preferences
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding preferences." 
    ON onboarding_preferences
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own onboarding preferences." 
    ON onboarding_preferences
    FOR DELETE 
    USING (auth.uid() = user_id);

-- 7. updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 트리거 적용
CREATE TRIGGER trg_onboarding_progress_updated_at
    BEFORE UPDATE ON onboarding_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_updated_at();

CREATE TRIGGER trg_onboarding_preferences_updated_at
    BEFORE UPDATE ON onboarding_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_updated_at();

-- 9. 주석
COMMENT ON TABLE onboarding_progress IS '사용자의 온보딩 액션 완료 상태';
COMMENT ON TABLE onboarding_preferences IS '사용자의 온보딩 UI 설정';

COMMENT ON COLUMN onboarding_progress.action_key IS '액션 고유 식별자 (예: basic-store-register)';
COMMENT ON COLUMN onboarding_progress.completed IS '완료 여부';
COMMENT ON COLUMN onboarding_progress.completed_at IS '완료 시각';

COMMENT ON COLUMN onboarding_preferences.is_collapsed IS '온보딩 섹션 접어두기 상태';
