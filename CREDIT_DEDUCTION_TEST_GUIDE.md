# 크레딧 차감 테스트 가이드

## 📅 작성일: 2026-01-29
## 🎯 목적: 크레딧 시스템 실제 차감 동작 검증

---

## ⚠️ 테스트 전 주의사항

**중요:**
1. 크레딧 차감은 **실제 DB에 영향**을 줍니다
2. 테스트는 **본인 계정**으로만 진행하세요
3. 언제든지 **롤백 가능**합니다 (Feature Flag 비활성화)

---

## 🧪 테스트 전략 (3단계)

### ✅ Step 1: 크레딧 조회 테스트 (읽기 전용)
- 목적: 크레딧 정보가 제대로 저장되었는지 확인
- 영향: 0% (읽기만)
- 소요 시간: 5분

### ✅ Step 2: 크레딧 체크 테스트 (경고만)
- 목적: 크레딧 부족 시 경고 메시지 확인
- 영향: 0% (차감 안 함)
- 소요 시간: 10분

### ✅ Step 3: 크레딧 차감 테스트 (실제 차감)
- 목적: 실제 크레딧 차감 동작 확인
- 영향: 크레딧 차감 (복구 가능)
- 소요 시간: 15분

---

## 📊 Step 1: 크레딧 조회 테스트

### 1.1 본인 크레딧 확인 (Supabase)

```sql
-- Supabase SQL Editor에서 실행
-- 본인 이메일로 변경하세요
SELECT 
    u.email,
    uc.tier,
    uc.monthly_credits,
    uc.monthly_used,
    uc.total_remaining,
    uc.manual_credits,
    uc.next_reset_at
FROM user_credits uc
JOIN auth.users u ON u.id = uc.user_id
WHERE u.email = 'your-email@example.com';  -- 본인 이메일
```

**예상 결과:**
```
email                 | tier | monthly_credits | monthly_used | total_remaining | manual_credits | next_reset_at
----------------------|------|-----------------|--------------|-----------------|----------------|---------------
your-email@gmail.com  | free | 100             | 0            | 100             | 0              | 2026-02-01
```

### 1.2 API로 크레딧 조회

**방법 1: Swagger UI 사용**
```
1. https://api.whiplace.com/docs 접속
2. 로그인 (Authorize 버튼)
3. GET /api/v1/credits/me 실행
```

**방법 2: 브라우저 개발자 도구**
```javascript
// whiplace.com에 로그인 후
// 브라우저 콘솔(F12)에서 실행

const token = localStorage.getItem('supabase.auth.token');
const response = await fetch('https://api.whiplace.com/api/v1/credits/me', {
  headers: {
    'Authorization': `Bearer ${JSON.parse(token).access_token}`
  }
});
const data = await response.json();
console.log(data);
```

**예상 응답:**
```json
{
  "user_id": "...",
  "tier": "free",
  "monthly_credits": 100,
  "monthly_used": 0,
  "monthly_remaining": 100,
  "manual_credits": 0,
  "total_remaining": 100,
  "next_reset_at": "2026-02-01T00:00:00Z",
  "percentage_used": 0.0
}
```

✅ **Step 1 완료: 크레딧 정보가 정상적으로 조회됩니다!**

---

## 🔍 Step 2: 크레딧 체크 테스트 (경고만)

### 2.1 환경변수 업데이트

**EC2 서버에서:**
```bash
ssh -i "C:\Users\smbae\Downloads\egurado keyfair.pem" ubuntu@3.34.136.255

cd /home/ubuntu/egurado/backend

# .env 파일 확인
cat .env

# .env 파일이 없으면 생성
nano .env
```

**추가할 내용:**
```env
# 기존 환경변수는 그대로 두고 맨 아래 추가

# Credit System - Step 2 (경고만)
CREDIT_SYSTEM_ENABLED=true
CREDIT_CHECK_STRICT=false    # 경고만, 차단 안 함
CREDIT_AUTO_DEDUCT=false     # 차감 안 함
PAYMENT_ENABLED=false
```

**저장 후 재시작:**
```bash
docker-compose restart backend

# 로그 확인
docker-compose logs -f backend
```

**예상 로그:**
```
[OK] Egurado API started
INFO: Credit system enabled: True
INFO: Credit check strict: False
INFO: Credit auto deduct: False
```

### 2.2 크레딧 체크 동작 확인

**순위조회 실행 후 Backend 로그 확인:**
```bash
# 로그에서 "Credit" 관련 메시지 찾기
docker-compose logs backend | grep -i credit
```

**예상 로그:**
```
INFO: Checking credits for user=xxx, feature=rank_check, required=5
INFO: Credit check passed: current=100, required=5, sufficient=True
INFO: Credit auto-deduct disabled, skipping deduction
```

✅ **Step 2 완료: 크레딧 체크는 작동하지만 차감은 안 됩니다!**

---

## 💰 Step 3: 크레딧 실제 차감 테스트

### 3.1 환경변수 최종 업데이트

**EC2 서버에서:**
```bash
nano /home/ubuntu/egurado/backend/.env
```

**변경:**
```env
# Credit System - Step 3 (실제 차감)
CREDIT_SYSTEM_ENABLED=true
CREDIT_CHECK_STRICT=true     # 부족 시 차단
CREDIT_AUTO_DEDUCT=true      # 실제 차감 활성화 ⚠️
PAYMENT_ENABLED=false
```

**저장 후 재시작:**
```bash
docker-compose restart backend
docker-compose logs -f backend
```

### 3.2 테스트 시나리오

#### 🎯 시나리오 1: 순위조회 (5 크레딧)

**테스트:**
```
1. whiplace.com 로그인
2. 대시보드 → 네이버 → 순위조회
3. 키워드 입력 후 조회
```

**확인 사항:**
- [ ] 조회 성공
- [ ] Backend 로그에 "Credits deducted: 5" 메시지
- [ ] Supabase에서 크레딧 차감 확인

**Supabase 확인:**
```sql
-- 크레딧 잔액 확인
SELECT 
    u.email,
    uc.monthly_used,
    uc.total_remaining
FROM user_credits uc
JOIN auth.users u ON u.id = uc.user_id
WHERE u.email = 'your-email@example.com';

-- 예상: monthly_used = 5, total_remaining = 95

-- 트랜잭션 내역 확인
SELECT 
    feature,
    credits_amount,
    metadata,
    created_at
FROM credit_transactions
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'your-email@example.com'
)
ORDER BY created_at DESC
LIMIT 5;
```

**예상 결과:**
```
feature     | credits_amount | metadata                | created_at
------------|----------------|-------------------------|------------
rank_check  | -5             | {"keyword": "...", ...} | 2026-01-29
```

#### 🎯 시나리오 2: 리뷰 분석 (10-100 크레딧)

**테스트:**
```
1. 대시보드 → 네이버 → 리뷰 분석
2. 리뷰 수 선택 (10개)
3. 분석 실행
```

**예상 크레딧:**
```
크레딧 = ceil(리뷰 수 / 5) + 5
10개 리뷰 = ceil(10/5) + 5 = 7 크레딧
```

**확인:**
```sql
SELECT monthly_used, total_remaining 
FROM user_credits 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 예상: monthly_used = 12 (5 + 7), total_remaining = 88
```

#### 🎯 시나리오 3: AI 답글 생성 (1 크레딧/개)

**테스트:**
```
1. 대시보드 → 네이버 → AI 리뷰답글
2. 리뷰 1개 선택
3. AI 답글 생성
```

**예상 크레딧:** 1 크레딧

**확인:**
```sql
SELECT monthly_used FROM user_credits 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 예상: monthly_used = 13 (5 + 7 + 1)
```

#### 🎯 시나리오 4: 크레딧 부족 테스트

**준비:**
```sql
-- 크레딧을 거의 소진시키기
UPDATE user_credits 
SET monthly_used = 98
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 확인
SELECT total_remaining FROM user_credits 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
-- 예상: total_remaining = 2
```

**테스트:**
```
1. 순위조회 실행 (5 크레딧 필요)
2. 크레딧 부족 (2 < 5)
```

**예상 동작:**
- ❌ API 응답: 403 Forbidden 또는 400 Bad Request
- 🚫 에러 메시지: "Insufficient credits"

**Backend 로그:**
```
ERROR: Insufficient credits: required 5, available 2
```

### 3.3 크레딧 복구 (필요 시)

**수동으로 크레딧 초기화:**
```sql
-- 본인 계정만!
UPDATE user_credits 
SET monthly_used = 0
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 확인
SELECT * FROM user_credits 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
```

---

## 🎓 고급 테스트

### 테스트 1: 수동 충전 크레딧 테스트

```sql
-- 수동 충전 크레딧 100개 추가
SELECT charge_manual_credits(
    (SELECT id FROM auth.users WHERE email = 'your-email@example.com')::uuid,
    100,
    NULL
);

-- 확인
SELECT manual_credits, total_remaining 
FROM user_credits 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 예상: manual_credits = 100, total_remaining = 200 (100 월 + 100 수동)
```

**기능 사용 후:**
```sql
-- 월 구독 크레딧이 먼저 차감되는지 확인
SELECT monthly_used, manual_credits, total_remaining
FROM user_credits 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 예상 (순위조회 1회 후):
-- monthly_used = 5 (월 구독에서 차감)
-- manual_credits = 100 (수동 충전은 그대로)
-- total_remaining = 195
```

### 테스트 2: Tier 업그레이드 테스트

```sql
-- Basic Tier로 업그레이드
SELECT update_user_tier(
    (SELECT id FROM auth.users WHERE email = 'your-email@example.com')::uuid,
    'basic',
    NULL
);

-- 확인
SELECT tier, monthly_credits, total_remaining
FROM user_credits 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 예상:
-- tier = 'basic'
-- monthly_credits = 600 (Free 100 → Basic 600)
-- total_remaining = 695 (600 월 + 95 수동 - 0 사용)
```

### 테스트 3: 월 크레딧 리셋 테스트

```sql
-- 수동으로 리셋 실행 (테스트용)
SELECT reset_monthly_credits(
    (SELECT id FROM auth.users WHERE email = 'your-email@example.com')::uuid
);

-- 확인
SELECT monthly_credits, monthly_used, manual_credits, total_remaining
FROM user_credits 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');

-- 예상:
-- monthly_used = 0 (리셋됨)
-- manual_credits = 100 (그대로 유지)
-- total_remaining = 700 (600 월 + 100 수동)
```

---

## 📊 테스트 결과 체크리스트

### ✅ Step 1: 크레딧 조회
- [ ] Supabase에서 크레딧 정보 조회 성공
- [ ] API로 크레딧 조회 성공
- [ ] 초기 크레딧 100 확인

### ✅ Step 2: 크레딧 체크 (경고만)
- [ ] Feature Flag 업데이트 (ENABLED=true, DEDUCT=false)
- [ ] 순위조회 실행 성공
- [ ] Backend 로그에 "Credit check passed" 확인
- [ ] 크레딧 차감 안 됨 확인

### ✅ Step 3: 크레딧 차감 (실제)
- [ ] Feature Flag 업데이트 (DEDUCT=true)
- [ ] 순위조회 후 5 크레딧 차감 확인
- [ ] 리뷰 분석 후 크레딧 차감 확인
- [ ] 트랜잭션 내역 기록 확인
- [ ] 크레딧 부족 시 에러 확인

### ✅ 고급 테스트
- [ ] 수동 충전 크레딧 추가
- [ ] 월 구독 우선 차감 확인
- [ ] Tier 업그레이드 테스트
- [ ] 월 크레딧 리셋 테스트

---

## 🔄 롤백 방법

**문제 발생 시 즉시 비활성화:**

### 방법 1: Feature Flag 비활성화
```bash
ssh -i "C:\Users\smbae\Downloads\egurado keyfair.pem" ubuntu@3.34.136.255
cd /home/ubuntu/egurado/backend
nano .env

# 변경:
CREDIT_SYSTEM_ENABLED=false
CREDIT_AUTO_DEDUCT=false

# 저장 후 재시작
docker-compose restart backend
```

### 방법 2: 코드 롤백
```bash
cd /home/ubuntu/egurado
git log --oneline -5
git revert HEAD
docker-compose down
docker-compose up -d --build
```

### 방법 3: 크레딧 데이터 복구
```sql
-- 모든 사용자 크레딧 리셋
UPDATE user_credits SET monthly_used = 0;

-- 또는 특정 사용자만
UPDATE user_credits 
SET monthly_used = 0
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
```

---

## 📞 문제 해결

### 문제 1: 크레딧이 차감되지 않음
**원인:** Feature Flag 설정 문제
**해결:**
```bash
# .env 파일 확인
cat /home/ubuntu/egurado/backend/.env | grep CREDIT

# 재시작
docker-compose restart backend

# 로그 확인
docker-compose logs backend | grep -i "credit"
```

### 문제 2: 403 Forbidden 에러
**원인:** 인증 토큰 만료
**해결:**
```
1. 로그아웃
2. 다시 로그인
3. 재시도
```

### 문제 3: 크레딧이 음수로 표시
**원인:** DB 함수 오류
**해결:**
```sql
-- 데이터 확인
SELECT * FROM user_credits WHERE total_remaining < 0;

-- 수동 복구
UPDATE user_credits 
SET monthly_used = 0 
WHERE total_remaining < 0;
```

---

## 🎯 예상 테스트 시간

| 단계 | 소요 시간 | 영향도 |
|------|----------|--------|
| Step 1: 조회 | 5분 | 0% |
| Step 2: 체크 | 10분 | 0% |
| Step 3: 차감 | 15분 | 크레딧 차감 |
| 고급 테스트 | 20분 | 크레딧 차감 |
| **총 소요** | **50분** | 롤백 가능 |

---

**작성일**: 2026-01-29  
**버전**: 1.0  
**상태**: 테스트 준비 완료
