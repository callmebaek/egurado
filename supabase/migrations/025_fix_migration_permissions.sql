-- ============================================
-- Fix migrate_user_to_new_auth_id permissions
-- authenticated와 service_role 모두에게 권한 부여
-- ============================================

-- 함수 실행 권한 재부여
GRANT EXECUTE ON FUNCTION public.migrate_user_to_new_auth_id(
    uuid, uuid, text, text, text, text, boolean, text, text, text, text, text
) TO service_role;

GRANT EXECUTE ON FUNCTION public.migrate_user_to_new_auth_id(
    uuid, uuid, text, text, text, text, boolean, text, text, text, text, text
) TO authenticated;

-- anon과 public은 여전히 차단
REVOKE EXECUTE ON FUNCTION public.migrate_user_to_new_auth_id(
    uuid, uuid, text, text, text, text, boolean, text, text, text, text, text
) FROM anon;

REVOKE EXECUTE ON FUNCTION public.migrate_user_to_new_auth_id(
    uuid, uuid, text, text, text, text, boolean, text, text, text, text, text
) FROM public;

-- 완료 메시지
SELECT 'Migration function permissions fixed - authenticated and service_role granted' AS status;
