-- test@example.com 계정 완전 삭제

-- 1단계: 관련 데이터 확인 (혹시 남은 데이터가 있는지 체크)
SELECT 
    'stores' as 테이블,
    COUNT(*) as 남은_데이터
FROM public.stores 
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'test@example.com')
UNION ALL
SELECT 
    'metric_trackers',
    COUNT(*)
FROM public.metric_trackers 
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'test@example.com')
UNION ALL
SELECT 
    'keywords',
    COUNT(*)
FROM public.keywords 
WHERE store_id IN (SELECT id FROM public.stores WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'test@example.com'));

-- 2단계: profiles 테이블에서 삭제
DELETE FROM public.profiles WHERE email = 'test@example.com';

-- 3단계: auth.users에서 삭제
DELETE FROM auth.users WHERE email = 'test@example.com';

-- 완료 확인
SELECT 'test@example.com 계정이 완전히 삭제되었습니다.' as 결과;
