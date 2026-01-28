-- ================================
-- Initial Voting Data
-- ================================
-- 각 기능에 초기 투표 데이터 삽입 (더미 데이터)
-- want(빨리 만들어주세요): 10~30개 랜덤
-- not_needed(별로 필요없다): 0~5개 랜덤

-- 1. 임시로 foreign key 제약 삭제
ALTER TABLE feature_votes DROP CONSTRAINT IF EXISTS feature_votes_user_id_fkey;

-- 2. 더미 투표 데이터 삽입
DO $$
DECLARE
    feature_keys TEXT[] := ARRAY[
        'naver-kpi-dashboard',
        'naver-index-analysis',
        'naver-search-ad-analysis',
        'naver-notice',
        'kakao-business-diagnosis',
        'kakao-review-management',
        'kakao-map-rank',
        'kakao-metrics',
        'google-review-analysis',
        'google-ai-reply',
        'google-gbp-diagnosis',
        'google-map-rank',
        'google-citation-boost',
        'google-keyword-volume'
    ];
    feature_key TEXT;
    want_count INTEGER;
    not_needed_count INTEGER;
    i INTEGER;
    dummy_user_id UUID;
BEGIN
    -- 각 기능에 대해 투표 생성
    FOREACH feature_key IN ARRAY feature_keys
    LOOP
        -- want 투표: 10~30개 랜덤
        want_count := 10 + floor(random() * 21)::INTEGER;
        
        -- not_needed 투표: 0~5개 랜덤
        not_needed_count := floor(random() * 6)::INTEGER;
        
        -- want 투표 삽입
        FOR i IN 1..want_count LOOP
            dummy_user_id := gen_random_uuid();
            
            INSERT INTO feature_votes (feature_key, user_id, vote_type, created_at)
            VALUES (
                feature_key,
                dummy_user_id,
                'want',
                NOW() - (random() * INTERVAL '30 days')  -- 지난 30일 내 랜덤 날짜
            );
        END LOOP;
        
        -- not_needed 투표 삽입
        FOR i IN 1..not_needed_count LOOP
            dummy_user_id := gen_random_uuid();
            
            INSERT INTO feature_votes (feature_key, user_id, vote_type, created_at)
            VALUES (
                feature_key,
                dummy_user_id,
                'not_needed',
                NOW() - (random() * INTERVAL '30 days')  -- 지난 30일 내 랜덤 날짜
            );
        END LOOP;
        
        RAISE NOTICE '기능: %, want: %, not_needed: %', feature_key, want_count, not_needed_count;
    END LOOP;
END $$;

-- 3. Foreign key 제약을 다시 추가 (NOT VALID 옵션: 기존 데이터는 체크 안 함)
ALTER TABLE feature_votes 
ADD CONSTRAINT feature_votes_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE 
NOT VALID;

-- 주의: NOT VALID 옵션을 사용하면 기존 더미 데이터는 foreign key 체크를 받지 않지만,
-- 새로운 투표(실제 사용자)는 정상적으로 foreign key 체크를 받습니다.

-- 4. 결과 확인
SELECT 
    feature_key,
    SUM(CASE WHEN vote_type = 'want' THEN 1 ELSE 0 END) as want_count,
    SUM(CASE WHEN vote_type = 'not_needed' THEN 1 ELSE 0 END) as not_needed_count,
    COUNT(*) as total_votes
FROM feature_votes
GROUP BY feature_key
ORDER BY feature_key;
