-- =====================================================
-- Notification & Support System Migration
-- Created: 2026-02-04
-- Description: 알림 센터, 고객 지원, 관리자 페이지 기능 추가
-- =====================================================

-- =====================================================
-- 1. NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL이면 전체 공지
  type TEXT NOT NULL CHECK (type IN ('announcement', 'update', 'marketing', 'system')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  is_global BOOLEAN DEFAULT false, -- 전체 사용자 대상
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_is_global ON public.notifications(is_global) WHERE is_global = true;

COMMENT ON TABLE public.notifications IS '알림 센터 - 사용자별 또는 전역 알림';
COMMENT ON COLUMN public.notifications.is_global IS 'true면 모든 사용자에게 표시';
COMMENT ON COLUMN public.notifications.user_id IS 'NULL이면 전역 알림 (관리자가 생성)';

-- =====================================================
-- 2. SUPPORT TICKETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('feature', 'bug', 'payment', 'other')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'closed')),
  answer TEXT,
  answered_at TIMESTAMP WITH TIME ZONE,
  answered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);

COMMENT ON TABLE public.support_tickets IS '1:1 고객 지원 티켓';
COMMENT ON COLUMN public.support_tickets.answered_by IS '답변 작성한 관리자 ID';

-- =====================================================
-- 3. USER NOTIFICATION SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  weekly_report BOOLEAN DEFAULT true,
  marketing_consent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.user_notification_settings IS '사용자별 알림 설정';

-- =====================================================
-- 4. LOGIN HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON public.login_history(created_at DESC);

COMMENT ON TABLE public.login_history IS '사용자 로그인 기록';

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- God Tier 확인 함수
CREATE OR REPLACE FUNCTION public.is_god_tier(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_id_param
    AND LOWER(tier) = 'god'
    AND status = 'active'
  );
$$;

COMMENT ON FUNCTION public.is_god_tier IS 'God Tier 사용자인지 확인';

-- 전체 읽음 처리 함수
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  UPDATE public.notifications
  SET is_read = true, updated_at = NOW()
  WHERE (user_id = current_user_id OR (is_global = true))
    AND is_read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION public.mark_all_notifications_as_read IS '사용자의 모든 알림을 읽음 처리';

-- 크레딧 수동 지급 함수 (관리자용)
CREATE OR REPLACE FUNCTION public.admin_grant_credits(
  target_user_id UUID,
  credit_amount INTEGER,
  admin_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id UUID;
  result JSONB;
  current_manual_credits INTEGER;
BEGIN
  -- 호출자가 God Tier인지 확인
  admin_user_id := auth.uid();
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF NOT public.is_god_tier(admin_user_id) THEN
    RAISE EXCEPTION 'Only God tier users can grant credits';
  END IF;
  
  -- 대상 사용자가 존재하는지 확인
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;
  
  -- credit_amount 검증
  IF credit_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive';
  END IF;
  
  -- user_credits 테이블 업데이트 (manual_credits 증가)
  UPDATE public.user_credits
  SET 
    manual_credits = manual_credits + credit_amount,
    updated_at = NOW()
  WHERE user_id = target_user_id
  RETURNING manual_credits INTO current_manual_credits;
  
  -- 레코드가 없으면 생성
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, manual_credits, monthly_credits, monthly_used)
    VALUES (target_user_id, credit_amount, 0, 0)
    RETURNING manual_credits INTO current_manual_credits;
  END IF;
  
  -- credit_transactions에 기록
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    created_at
  ) VALUES (
    target_user_id,
    credit_amount,
    'admin_grant',
    COALESCE(admin_note, 'Admin granted credits'),
    NOW()
  );
  
  -- 결과 반환
  SELECT jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'credits_granted', credit_amount,
    'new_manual_credits', current_manual_credits,
    'granted_by', admin_user_id,
    'timestamp', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.admin_grant_credits IS '관리자가 사용자에게 크레딧 수동 지급';

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- NOTIFICATIONS RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 알림 또는 전역 알림만 조회 가능
CREATE POLICY "Users can view their own notifications or global notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id OR is_global = true);

-- 사용자는 자신의 알림만 업데이트 가능 (읽음 처리)
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- God Tier는 전역 알림 생성 가능
CREATE POLICY "God tier can insert global notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  is_global = true 
  AND public.is_god_tier(auth.uid())
);

-- God Tier는 모든 알림 수정 가능
CREATE POLICY "God tier can update all notifications for admin"
ON public.notifications FOR UPDATE
USING (public.is_god_tier(auth.uid()));

-- God Tier는 모든 알림 삭제 가능
CREATE POLICY "God tier can delete all notifications"
ON public.notifications FOR DELETE
USING (public.is_god_tier(auth.uid()));

-- SUPPORT TICKETS RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 티켓만 조회 가능, God Tier는 모든 티켓 조회 가능
CREATE POLICY "Users can view their own tickets or god tier can view all"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id OR public.is_god_tier(auth.uid()));

-- 사용자는 자신의 티켓만 생성 가능
CREATE POLICY "Users can create their own tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- God Tier는 모든 티켓 업데이트 가능 (답변)
CREATE POLICY "God tier can update all tickets"
ON public.support_tickets FOR UPDATE
USING (public.is_god_tier(auth.uid()));

-- USER NOTIFICATION SETTINGS RLS
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification settings"
ON public.user_notification_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
ON public.user_notification_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
ON public.user_notification_settings FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- LOGIN HISTORY RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own login history"
ON public.login_history FOR SELECT
USING (auth.uid() = user_id OR public.is_god_tier(auth.uid()));

CREATE POLICY "System can insert login history"
ON public.login_history FOR INSERT
WITH CHECK (true); -- 백엔드에서 삽입 (서비스 키 사용)

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- notifications 테이블 트리거
DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- support_tickets 테이블 트리거
DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- user_notification_settings 테이블 트리거
DROP TRIGGER IF EXISTS update_user_notification_settings_updated_at ON public.user_notification_settings;
CREATE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON public.user_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 8. GRANTS (권한 부여)
-- =====================================================

-- authenticated 역할에 테이블 접근 권한 부여
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_notification_settings TO authenticated;
GRANT SELECT ON public.login_history TO authenticated;

-- 함수 실행 권한
GRANT EXECUTE ON FUNCTION public.is_god_tier TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_credits TO authenticated;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
