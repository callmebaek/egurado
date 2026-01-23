-- test@example.com 계정 확인
SELECT 
    id,
    email,
    auth_provider,
    subscription_tier,
    onboarding_completed,
    created_at
FROM public.profiles
WHERE email = 'test@example.com';
