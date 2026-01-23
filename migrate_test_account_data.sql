-- test@example.com → test@whiplace.com 데이터 이전

-- 1단계: 계정 ID 확인
DO $$
DECLARE
    old_user_id UUID;
    new_user_id UUID;
BEGIN
    -- 기존 계정 ID
    SELECT id INTO old_user_id FROM public.profiles WHERE email = 'test@example.com';
    
    -- 새 계정 ID
    SELECT id INTO new_user_id FROM public.profiles WHERE email = 'test@whiplace.com';
    
    IF old_user_id IS NULL THEN
        RAISE EXCEPTION 'test@example.com 계정을 찾을 수 없습니다.';
    END IF;
    
    IF new_user_id IS NULL THEN
        RAISE EXCEPTION 'test@whiplace.com 계정을 찾을 수 없습니다. 먼저 회원가입해주세요.';
    END IF;
    
    RAISE NOTICE '기존 계정 ID: %', old_user_id;
    RAISE NOTICE '새 계정 ID: %', new_user_id;
    
    -- 2단계: stores 테이블 이전
    UPDATE public.stores 
    SET user_id = new_user_id 
    WHERE user_id = old_user_id;
    
    RAISE NOTICE 'stores 테이블 이전 완료';
    
    -- 3단계: metric_trackers 테이블 이전
    UPDATE public.metric_trackers 
    SET user_id = new_user_id 
    WHERE user_id = old_user_id;
    
    RAISE NOTICE 'metric_trackers 테이블 이전 완료';
    
    -- 4단계: 기타 user_id 참조 테이블 확인 및 이전
    -- (필요시 추가 테이블 업데이트)
    
    RAISE NOTICE '✓ 데이터 이전 완료!';
    RAISE NOTICE '이제 test@example.com 계정을 안전하게 삭제할 수 있습니다.';
    
END $$;

-- 이전 결과 확인
SELECT 
    'test@whiplace.com의 매장 수:' as info,
    COUNT(*) as count
FROM public.stores 
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'test@whiplace.com')
UNION ALL
SELECT 
    'test@whiplace.com의 추적 키워드 수:' as info,
    COUNT(*) as count
FROM public.metric_trackers 
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'test@whiplace.com')
UNION ALL
SELECT 
    'test@example.com의 남은 매장 수 (0이어야 함):' as info,
    COUNT(*) as count
FROM public.stores 
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'test@example.com');
