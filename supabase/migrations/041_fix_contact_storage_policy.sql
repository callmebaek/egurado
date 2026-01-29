-- ============================================
-- Contact Storage 정책 수정
-- ============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can upload their own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Service role can access all attachments" ON storage.objects;

-- 더 간단한 정책으로 교체
-- 인증된 사용자는 contact-attachments 버킷에 업로드 가능
CREATE POLICY "Authenticated users can upload to contact-attachments"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'contact-attachments');

-- 인증된 사용자는 contact-attachments 버킷의 파일 조회 가능
CREATE POLICY "Authenticated users can view contact-attachments"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'contact-attachments');

-- Service role은 모든 작업 가능
CREATE POLICY "Service role can manage contact-attachments"
    ON storage.objects
    FOR ALL
    TO service_role
    USING (bucket_id = 'contact-attachments');
