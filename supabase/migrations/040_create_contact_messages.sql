-- ============================================
-- 문의하기 (Contact Messages) 테이블 생성
-- ============================================

-- 1. contact_messages 테이블 생성
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'closed')),
    admin_reply TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX idx_contact_messages_user_id ON contact_messages(user_id);
CREATE INDEX idx_contact_messages_status ON contact_messages(status);
CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at DESC);

-- 3. RLS 활성화
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책
-- 사용자는 자신의 문의사항만 조회 가능
CREATE POLICY "Users can view their own messages"
    ON contact_messages
    FOR SELECT
    USING (auth.uid() = user_id);

-- 사용자는 자신의 문의사항을 작성 가능
CREATE POLICY "Users can insert their own messages"
    ON contact_messages
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role은 모든 작업 가능 (관리자용)
CREATE POLICY "Service role can do everything"
    ON contact_messages
    FOR ALL
    USING (auth.role() = 'service_role');

-- 5. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_contact_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contact_messages_updated_at
    BEFORE UPDATE ON contact_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_messages_updated_at();

-- 6. Storage Bucket 생성 (파일 첨부용)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contact-attachments', 'contact-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage 정책
-- 사용자는 자신의 파일만 업로드 가능
CREATE POLICY "Users can upload their own attachments"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'contact-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- 사용자는 자신의 파일만 조회 가능
CREATE POLICY "Users can view their own attachments"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'contact-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Service role은 모든 파일 접근 가능 (관리자용)
CREATE POLICY "Service role can access all attachments"
    ON storage.objects
    FOR ALL
    USING (
        bucket_id = 'contact-attachments' AND
        auth.role() = 'service_role'
    );

-- 8. 코멘트
COMMENT ON TABLE contact_messages IS '사용자 문의사항 저장';
COMMENT ON COLUMN contact_messages.status IS 'new: 새 문의, read: 읽음, replied: 답변 완료, closed: 종료';
COMMENT ON COLUMN contact_messages.attachments IS '첨부파일 정보 배열 [{name, url, size, type}]';
