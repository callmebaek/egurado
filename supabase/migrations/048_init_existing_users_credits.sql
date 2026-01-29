-- ============================================
-- 기존 사용자 크레딧 초기화
-- 주의: 수동 실행 필요
-- ============================================

-- 기존 모든 사용자에게 크레딧 초기화 함수
CREATE OR REPLACE FUNCTION init_all_existing_users_credits()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user record;
    v_count integer := 0;
    v_errors jsonb := '[]'::jsonb;
BEGIN
    -- 모든 사용자 순회
    FOR v_user IN 
        SELECT id, subscription_tier 
        FROM profiles 
        WHERE id NOT IN (SELECT user_id FROM user_credits)
    LOOP
        BEGIN
            -- 크레딧 초기화
            PERFORM init_user_credits(
                v_user.id,
                CASE 
                    WHEN v_user.subscription_tier = 'free' THEN 'free'
                    WHEN v_user.subscription_tier = 'basic' THEN 'basic'
                    WHEN v_user.subscription_tier = 'pro' THEN 'pro'
                    WHEN v_user.subscription_tier = 'god' THEN 'god'
                    ELSE 'free'
                END,
                1 -- 기본 리셋 날짜: 매월 1일
            );
            
            v_count := v_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'user_id', v_user.id,
                'error', SQLERRM
            );
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'initialized_count', v_count,
        'errors', v_errors
    );
END;
$$;

GRANT EXECUTE ON FUNCTION init_all_existing_users_credits() TO service_role;

-- 신규 사용자 자동 초기화 트리거 함수
CREATE OR REPLACE FUNCTION trigger_init_new_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 새 사용자 생성 시 자동으로 크레딧 초기화
    PERFORM init_user_credits(
        NEW.id,
        COALESCE(NEW.subscription_tier, 'free'),
        1 -- 기본 리셋 날짜: 매월 1일
    );
    
    RETURN NEW;
END;
$$;

-- profiles 테이블에 트리거 추가
DROP TRIGGER IF EXISTS init_new_user_credits ON profiles;

CREATE TRIGGER init_new_user_credits
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_init_new_user_credits();

-- 신규 사용자 자동 구독 생성 트리거 함수
CREATE OR REPLACE FUNCTION trigger_init_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 새 사용자 생성 시 자동으로 구독 생성
    INSERT INTO subscriptions (user_id, tier, status, started_at, expires_at, auto_renewal)
    VALUES (
        NEW.id,
        COALESCE(NEW.subscription_tier, 'free'),
        'active',
        NOW(),
        NULL, -- free, god는 만료일 없음
        false
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- profiles 테이블에 트리거 추가
DROP TRIGGER IF EXISTS init_new_user_subscription ON profiles;

CREATE TRIGGER init_new_user_subscription
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_init_new_user_subscription();

-- Tier 업그레이드/다운그레이드 함수
CREATE OR REPLACE FUNCTION update_user_tier(
    p_user_id uuid,
    p_new_tier text,
    p_payment_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_tier text;
    v_new_credits integer;
    v_subscription_id uuid;
BEGIN
    -- 현재 Tier 조회
    SELECT tier INTO v_old_tier FROM user_credits WHERE user_id = p_user_id;
    
    -- 새 Tier의 월 크레딧 조회
    v_new_credits := get_tier_monthly_credits(p_new_tier);
    
    -- user_credits 업데이트
    UPDATE user_credits
    SET 
        tier = p_new_tier,
        monthly_credits = v_new_credits,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- profiles 업데이트
    UPDATE profiles
    SET 
        subscription_tier = p_new_tier,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- subscriptions 업데이트
    UPDATE subscriptions
    SET 
        tier = p_new_tier,
        updated_at = NOW()
    WHERE user_id = p_user_id AND status = 'active'
    RETURNING id INTO v_subscription_id;
    
    -- 트랜잭션 기록
    INSERT INTO credit_transactions (
        user_id, transaction_type, credits_amount,
        status, payment_id, metadata, completed_at
    ) VALUES (
        p_user_id, 'reset', 0,
        'completed', p_payment_id,
        jsonb_build_object(
            'old_tier', v_old_tier,
            'new_tier', p_new_tier,
            'reason', 'tier_change'
        ),
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'old_tier', v_old_tier,
        'new_tier', p_new_tier,
        'new_monthly_credits', v_new_credits
    );
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_tier(uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION update_user_tier(uuid, text, uuid) TO authenticated;

-- 코멘트
COMMENT ON FUNCTION init_all_existing_users_credits IS '기존 모든 사용자에게 크레딧 초기화 (마이그레이션용, 수동 실행)';
COMMENT ON FUNCTION trigger_init_new_user_credits IS '신규 사용자 자동 크레딧 초기화 트리거';
COMMENT ON FUNCTION trigger_init_new_user_subscription IS '신규 사용자 자동 구독 생성 트리거';
COMMENT ON FUNCTION update_user_tier IS 'Tier 업그레이드/다운그레이드';

-- ============================================
-- 수동 실행 가이드
-- ============================================
-- 
-- 1. 기존 사용자 구독 초기화:
--    SELECT init_subscription_for_existing_users();
--
-- 2. 기존 사용자 크레딧 초기화:
--    SELECT init_all_existing_users_credits();
--
-- 3. 결과 확인:
--    SELECT * FROM user_credits;
--    SELECT * FROM subscriptions;
--
-- ============================================
