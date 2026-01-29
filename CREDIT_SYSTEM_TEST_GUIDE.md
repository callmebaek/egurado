# 크레딧 시스템 테스트 가이드

## 📅 작성일: 2026-01-29
## 🎯 목적: 크레딧 시스템 Phase 1 검증

---

## 🧪 테스트 전 준비

### 1. 코드 커밋 & 푸시
```bash
# 프로젝트 루트에서
git add .
git commit -m "feat: Implement credit system Phase 1 (disabled)"
git push origin main
```

### 2. 필요한 도구
- ✅ Supabase 계정 (SQL Editor 접근)
- ✅ Postman 또는 Thunder Client (API 테스트용)
- ✅ 브라우저 (Chrome/Edge)

---

## 🗄️ Step 1: DB 마이그레이션 테스트

### 1.1 Supabase SQL Editor 접속
```
1. https://supabase.com 로그인
2. egurado 프로젝트 선택
3. 좌측 메뉴 "SQL Editor" 클릭
```

### 1.2 마이그레이션 파일 순서대로 실행

#### ① 042_create_subscriptions.sql
```sql
-- 파일 내용 복사 후 실행
-- 예상 결과: "Success. No rows returned"
```

**검증:**
```sql
-- subscriptions 테이블 생성 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'subscriptions';

-- 결과: subscriptions (1 row)
```

#### ② 043_create_payments.sql
```sql
-- 파일 내용 복사 후 실행
```

**검증:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'payments';

-- payments 테이블 확인
SELECT * FROM payments LIMIT 1;
```

#### ③ 044_create_user_credits_v2.sql
```sql
-- 파일 내용 복사 후 실행
```

**검증:**
```sql
-- user_credits 테이블 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'user_credits';

-- Tier별 크레딧 함수 테스트
SELECT get_tier_monthly_credits('free');      -- 결과: 100
SELECT get_tier_monthly_credits('basic');     -- 결과: 600
SELECT get_tier_monthly_credits('basic_plus'); -- 결과: 1200
SELECT get_tier_monthly_credits('pro');       -- 결과: 3000
```

#### ④ 045_create_credit_transactions.sql
```sql
-- 파일 내용 복사 후 실행
```

**검증:**
```sql
-- credit_transactions 테이블 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'credit_transactions';
```

#### ⑤ 046_create_credit_packages.sql
```sql
-- 파일 내용 복사 후 실행
```

**검증:**
```sql
-- 크레딧 패키지 확인
SELECT id, name, display_name, credits, price FROM credit_packages;

-- 예상 결과: 4개 패키지 (starter, basic, standard, premium)
```

#### ⑥ 047_update_tier_values.sql
```sql
-- 파일 내용 복사 후 실행
```

**검증:**
```sql
-- Tier 쿼터 함수 테스트
SELECT get_tier_quotas('basic_plus');

-- 예상 결과:
-- {
--   "monthly_credits": 1200,
--   "max_stores": 4,
--   "max_keywords": 6,
--   "max_auto_collection": 6
-- }
```

#### ⑦ 048_init_existing_users_credits.sql
```sql
-- 파일 내용 복사 후 실행
```

**검증:**
```sql
-- 트리거 함수 확인
SELECT proname FROM pg_proc 
WHERE proname IN ('trigger_init_new_user_credits', 'trigger_init_new_user_subscription');
```

### 1.3 기존 사용자 데이터 초기화

```sql
-- ⚠️ 주의: 실제 프로덕션 데이터에 영향을 줍니다!
-- 먼저 테스트 계정으로 테스트하는 것을 추천합니다.

-- 1. 기존 사용자 구독 초기화
SELECT init_subscription_for_existing_users();
-- 예상 결과: Success

-- 2. 기존 사용자 크레딧 초기화
SELECT init_all_existing_users_credits();
-- 예상 결과: {"success": true, "initialized_count": N, "errors": []}

-- 3. 확인
SELECT 
    u.email,
    uc.tier,
    uc.monthly_credits,
    uc.total_remaining,
    s.status
FROM user_credits uc
JOIN auth.users u ON u.id = uc.user_id
LEFT JOIN subscriptions s ON s.user_id = uc.user_id AND s.status = 'active'
LIMIT 10;
```

### 1.4 테스트 데이터 생성 (선택사항)

```sql
-- 테스트용 크레딧 트랜잭션 생성
-- (실제 user_id를 넣어야 함)

-- 1. 본인의 user_id 확인
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- 2. 크레딧 차감 테스트
SELECT deduct_user_credits(
    'YOUR_USER_ID'::uuid,
    'rank_check',
    10,
    '{"keyword": "테스트 키워드", "rank": 45}'::jsonb
);

-- 3. 트랜잭션 확인
SELECT * FROM credit_transactions 
WHERE user_id = 'YOUR_USER_ID'::uuid
ORDER BY created_at DESC
LIMIT 5;

-- 4. 크레딧 잔액 확인
SELECT * FROM user_credits WHERE user_id = 'YOUR_USER_ID'::uuid;
```

---

## 🖥️ Step 2: Backend 로컬 테스트

### 2.1 로컬 Backend 실행

```bash
# backend 폴더로 이동
cd backend

# 가상환경 활성화 (Windows)
python -m venv venv
venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정 (로컬 테스트용)
# .env 파일 생성 후 추가:
CREDIT_SYSTEM_ENABLED=true
CREDIT_CHECK_STRICT=false
CREDIT_AUTO_DEDUCT=false
PAYMENT_ENABLED=false

# 로컬 서버 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**예상 출력:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxx] using StatReload
INFO:     Started server process [xxxx]
INFO:     Waiting for application startup.
[OK] Egurado API started
INFO:     Application startup complete.
```

### 2.2 Swagger UI 접속

```
브라우저에서 http://localhost:8000/docs 접속
```

**확인 사항:**
- ✅ "Credits" 섹션 표시
- ✅ "Subscriptions" 섹션 표시
- ✅ "Payments" 섹션 표시

### 2.3 API 엔드포인트 테스트

#### ① 로그인 (토큰 발급)
```http
POST http://localhost:8000/api/v1/auth/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

**응답:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {...}
}
```

**토큰 복사:** `eyJhbGc...` (다음 요청에 사용)

#### ② 내 크레딧 조회
```http
GET http://localhost:8000/api/v1/credits/me
Authorization: Bearer eyJhbGc...
```

**예상 응답:**
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
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

#### ③ 크레딧 체크 테스트
```http
POST http://localhost:8000/api/v1/credits/check
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "feature": "rank_check",
  "estimated_credits": 5
}
```

**예상 응답:**
```json
{
  "sufficient": true,
  "current_credits": 100,
  "monthly_remaining": 100,
  "manual_credits": 0,
  "required_credits": 5,
  "shortage": 0,
  "tier": "free",
  "next_reset": "2026-02-01T00:00:00Z",
  "is_god_tier": false
}
```

#### ④ Tier 쿼터 조회 (공개 API)
```http
GET http://localhost:8000/api/v1/credits/tier/basic_plus
```

**예상 응답:**
```json
{
  "tier": "basic_plus",
  "monthly_credits": 1200,
  "max_stores": 4,
  "max_keywords": 6,
  "max_auto_collection": 6
}
```

#### ⑤ 크레딧 패키지 조회 (공개 API)
```http
GET http://localhost:8000/api/v1/payments/packages
```

**예상 응답:**
```json
[
  {
    "id": "...",
    "name": "starter",
    "display_name": "스타터",
    "description": "소량 사용자를 위한 기본 패키지",
    "credits": 100,
    "total_credits": 100,
    "price": null,
    "original_price": null,
    "discount_rate": 0,
    "is_popular": false,
    "is_coming_soon": true
  },
  ...
]
```

---

## 🌐 Step 3: Frontend 로컬 테스트

### 3.1 로컬 Frontend 실행

```bash
# frontend 폴더로 이동
cd frontend

# 의존성 설치 (처음 한 번만)
npm install

# 개발 서버 실행
npm run dev
```

**예상 출력:**
```
  ▲ Next.js 15.x.x
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Ready in 2.5s
```

### 3.2 Pricing Page 테스트

```
브라우저에서 http://localhost:3000/pricing 접속
```

**체크리스트:**

#### ① 레이아웃
- [ ] Hero 섹션 표시
- [ ] "Coming Soon" 배지 표시
- [ ] 4개 Tier 카드 (Free, Basic, Basic+, Pro)
- [ ] Basic+ 카드에 "인기" 배지
- [ ] FAQ 섹션
- [ ] 하단 CTA 섹션

#### ② Tier 카드 내용
**Free:**
- [ ] 월 100 크레딧
- [ ] 매장 1개
- [ ] 키워드 1개
- [ ] 자동수집 불가

**Basic:**
- [ ] 월 600 크레딧
- [ ] "Coming Soon" 가격
- [ ] 매장 3개
- [ ] 자동수집 3개

**Basic+:**
- [ ] 월 1,200 크레딧
- [ ] "인기" 배지
- [ ] 매장 4개
- [ ] 자동수집 6개
- [ ] 카드가 약간 크게 표시 (scale-105)

**Pro:**
- [ ] 월 3,000 크레딧
- [ ] 매장 10개
- [ ] 자동수집 15개

#### ③ 반응형 테스트
```
개발자 도구 (F12) → 디바이스 툴바 토글 (Ctrl+Shift+M)
```
- [ ] 모바일 (375px): 카드 1열
- [ ] 태블릿 (768px): 카드 2열
- [ ] 데스크톱 (1024px+): 카드 4열

#### ④ 버튼 동작
- [ ] "무료로 시작하기" 클릭 시 아무 동작 안 함 (disabled)
- [ ] "가격 문의" 버튼 disabled 상태

---

## 🚀 Step 4: EC2 Backend 배포 & 테스트

### 4.1 EC2 서버 배포

```bash
# SSH 접속
ssh -i "C:\Users\smbae\Downloads\egurado keyfair.pem" ubuntu@3.34.136.255

# 프로젝트 디렉토리로 이동
cd /home/ubuntu/egurado

# 최신 코드 Pull
git pull origin main

# 환경변수 확인 (초기에는 모두 false로 유지)
nano .env
# CREDIT_SYSTEM_ENABLED=false
# CREDIT_CHECK_STRICT=false
# CREDIT_AUTO_DEDUCT=false
# PAYMENT_ENABLED=false

# Docker 재빌드
docker-compose down
docker-compose up -d --build

# 로그 확인
docker-compose logs -f backend
```

**예상 로그:**
```
backend_1  | INFO:     Started server process [1]
backend_1  | INFO:     Waiting for application startup.
backend_1  | [OK] Egurado API started
backend_1  | INFO:     Application startup complete.
```

### 4.2 프로덕션 API 테스트

#### ① Health Check
```bash
curl https://api.whiplace.com/api/health
```

**예상 응답:**
```json
{
  "status": "ok",
  "message": "Egurado API is running",
  "database_connected": true
}
```

#### ② Swagger UI 확인
```
브라우저에서 https://api.whiplace.com/docs 접속
```

- [ ] "Credits" API 섹션 표시
- [ ] "Subscriptions" API 섹션 표시
- [ ] "Payments" API 섹션 표시

#### ③ 크레딧 패키지 조회 (공개 API)
```bash
curl https://api.whiplace.com/api/v1/payments/packages
```

---

## 🌐 Step 5: Vercel Frontend 테스트

### 5.1 자동 배포 확인

```
1. GitHub에 push 후 자동 배포 시작
2. https://vercel.com/your-project 에서 배포 상태 확인
3. 배포 완료 후 https://whiplace.com/pricing 접속
```

### 5.2 프로덕션 Pricing Page 테스트

```
https://whiplace.com/pricing
```

**체크리스트:**
- [ ] 모든 컨텐츠 정상 표시
- [ ] 이미지/아이콘 로딩
- [ ] 반응형 디자인 동작
- [ ] 버튼 disabled 상태

---

## 🧪 Step 6: 통합 테스트

### 6.1 기존 기능 회귀 테스트

**필수 테스트 (기존 기능 영향 확인):**

#### ① 인증
```
1. https://whiplace.com/login 접속
2. 이메일/비밀번호로 로그인
3. 대시보드 접근 확인
```
- [ ] 로그인 성공
- [ ] 토큰 저장
- [ ] 대시보드 리다이렉트

#### ② 매장 관리
```
1. 대시보드 → "매장 연결"
2. 네이버 플레이스 ID 입력
3. 매장 등록
```
- [ ] 매장 등록 성공
- [ ] 매장 목록 표시

#### ③ 순위 조회
```
1. 대시보드 → 네이버 → 순위조회
2. 키워드 입력 후 조회
```
- [ ] 순위 조회 성공
- [ ] 결과 표시
- [ ] **크레딧 차감 안 됨** (CREDIT_AUTO_DEDUCT=false)

#### ④ 리뷰 분석
```
1. 대시보드 → 네이버 → 리뷰 분석
2. 리뷰 추출 및 분석
```
- [ ] 리뷰 추출 성공
- [ ] 감정 분석 성공
- [ ] **크레딧 차감 안 됨**

#### ⑤ AI 답글
```
1. 대시보드 → 네이버 → AI 리뷰답글
2. AI 답글 생성
```
- [ ] AI 답글 생성 성공
- [ ] **크레딧 차감 안 됨**

**예상 결과:** 모든 기능이 기존과 동일하게 작동 ✅

### 6.2 크레딧 시스템 테스트 (비활성화 상태)

```http
# 크레딧 조회 API 테스트
GET https://api.whiplace.com/api/v1/credits/me
Authorization: Bearer YOUR_TOKEN
```

**예상 결과:**
- ✅ API 정상 작동
- ✅ 크레딧 정보 반환
- ✅ 실제 기능 사용 시 크레딧 차감 안 됨

---

## 🎯 Step 7: 점진적 활성화 테스트 (선택사항)

### 7.1 Admin 계정 테스트 모드

```bash
# EC2 서버에서 환경변수 업데이트
nano /home/ubuntu/egurado/.env

# 변경:
CREDIT_SYSTEM_ENABLED=true
CREDIT_CHECK_STRICT=false  # 경고만
CREDIT_AUTO_DEDUCT=false   # 차감 안 함

# 재시작
docker-compose restart backend
```

**테스트:**
```
1. Admin 계정(God tier)으로 로그인
2. 순위 조회 실행
3. Backend 로그 확인: "Credit check passed (God tier)"
```

### 7.2 크레딧 차감 테스트 (STRICT 모드)

```bash
# 환경변수 업데이트
CREDIT_SYSTEM_ENABLED=true
CREDIT_CHECK_STRICT=true
CREDIT_AUTO_DEDUCT=true

# 재시작
docker-compose restart backend
```

**테스트:**
```
1. Free tier 계정으로 로그인 (100 크레딧)
2. 순위 조회 20번 실행 (20 × 5 = 100 크레딧)
3. 21번째 시도 → "Insufficient credits" 에러 예상
```

---

## 📊 테스트 체크리스트 요약

### DB 마이그레이션
- [ ] 7개 마이그레이션 파일 실행
- [ ] 5개 테이블 생성 확인
- [ ] 10개 함수 생성 확인
- [ ] 기존 사용자 데이터 초기화

### Backend API
- [ ] 로컬 서버 실행
- [ ] Swagger UI 접근
- [ ] 크레딧 조회 API 테스트
- [ ] 크레딧 체크 API 테스트
- [ ] 패키지 조회 API 테스트
- [ ] EC2 배포 및 테스트

### Frontend
- [ ] 로컬 개발 서버 실행
- [ ] Pricing Page 레이아웃
- [ ] 4개 Tier 표시
- [ ] 반응형 디자인
- [ ] Vercel 배포 확인

### 회귀 테스트
- [ ] 로그인/로그아웃
- [ ] 매장 등록
- [ ] 순위 조회
- [ ] 리뷰 분석
- [ ] AI 답글
- [ ] **크레딧 차감 안 됨 확인**

---

## ❓ 문제 해결

### 문제 1: 마이그레이션 실행 시 에러
```
ERROR: relation "subscriptions" already exists
```

**해결:**
```sql
-- 테이블이 이미 존재하는 경우 DROP 후 재실행
DROP TABLE IF EXISTS subscriptions CASCADE;
-- 그 후 마이그레이션 재실행
```

### 문제 2: Backend 시작 실패
```
ModuleNotFoundError: No module named 'app.routers.credits'
```

**해결:**
```bash
# Python 캐시 삭제
cd backend
find . -type d -name __pycache__ -exec rm -r {} +
find . -type f -name "*.pyc" -delete

# 재시작
docker-compose restart backend
```

### 문제 3: API 403 Forbidden
```
{"detail": "Not authenticated"}
```

**해결:**
```
1. 로그인 API로 새 토큰 발급
2. Authorization 헤더에 "Bearer {token}" 형식으로 추가
3. 토큰 만료 시간 확인 (보통 24시간)
```

---

## 📞 지원

### 문제 발생 시
1. Backend 로그 확인: `docker-compose logs -f backend`
2. Supabase 로그 확인: Supabase Dashboard → Logs
3. 브라우저 콘솔 확인: F12 → Console

### 연락처
- GitHub Issues
- 이메일: dev@whiplace.com

---

**작성일**: 2026-01-29  
**버전**: 1.0  
**다음 업데이트**: Phase 2 활성화 시
