# 🧪 Egurado 결제 시스템 테스트 가이드

## 📋 목차
1. [사전 준비](#1-사전-준비)
2. [서버 실행](#2-서버-실행)
3. [테스트 시나리오](#3-테스트-시나리오)
4. [토스페이먼츠 테스트 카드](#4-토스페이먼츠-테스트-카드)
5. [트러블슈팅](#5-트러블슈팅)

---

## 1️⃣ 사전 준비

### ✅ 환경 변수 확인

**backend/.env**
```env
TOSS_SECRET_KEY=test_gsk_26DlbXAaV0Oneg21YGax3qY50Q9R
TOSS_CLIENT_KEY=test_gck_d46qopOB89dDoN1LYk95rZmM75y0
TOSS_API_URL=https://api.tosspayments.com
```

**frontend/.env.local**
```env
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_gck_d46qopOB89dDoN1LYk95rZmM75y0
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### ✅ 데이터베이스 마이그레이션 적용

```bash
# Supabase CLI로 마이그레이션 적용
cd c:\egurado
supabase db push

# 또는 Supabase Dashboard에서 수동 실행:
# 1. https://app.supabase.com 로그인
# 2. 프로젝트 선택
# 3. SQL Editor 열기
# 4. 아래 파일들을 순서대로 실행:
#    - supabase/migrations/050_create_billing_keys.sql
#    - supabase/migrations/051_create_coupons.sql
```

### ✅ 백엔드 의존성 설치

```bash
cd c:\egurado\backend
pip install -r requirements.txt
```

### ✅ 프론트엔드 의존성 확인

```bash
cd c:\egurado\frontend
npm install
# @tosspayments/tosspayments-sdk가 설치되어 있는지 확인
npm list @tosspayments/tosspayments-sdk
```

---

## 2️⃣ 서버 실행

### 백엔드 서버 시작

```bash
cd c:\egurado\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**확인사항:**
- 콘솔에 `Application startup complete` 메시지가 뜨는지 확인
- http://localhost:8000/docs 접속 → Swagger UI가 보이는지 확인

### 프론트엔드 서버 시작

**새 터미널 열고:**
```bash
cd c:\egurado\frontend
npm run dev
```

**확인사항:**
- http://localhost:3000 접속 → 사이트가 로드되는지 확인
- 브라우저 콘솔에 에러가 없는지 확인

---

## 3️⃣ 테스트 시나리오

### 🧪 시나리오 1: 신규 유료 구독 (Basic 플랜)

1. **로그인**
   - http://localhost:3000/login 접속
   - 테스트 계정으로 로그인 (또는 신규 회원가입)

2. **멤버십 페이지 접속**
   - 좌측 사이드바에서 "멤버십 관리" 클릭
   - 또는 직접 http://localhost:3000/dashboard/membership 접속

3. **현재 구독 정보 확인**
   - "현재 요금제" 섹션에서 Free 플랜이 표시되는지 확인
   - 월간 크레딧: 100, 매장: 1개, 키워드: 1개가 표시되는지 확인

4. **Basic 플랜 선택**
   - "Basic" 카드에서 "구독하기" 버튼 클릭
   - 체크아웃 페이지로 이동 확인

5. **쿠폰 적용 (선택)**
   - 쿠폰 코드 입력란에 테스트 쿠폰 입력
   - "적용" 버튼 클릭
   - 할인이 적용되었는지 확인

6. **약관 동의**
   - "전체 동의" 체크박스 클릭
   - 모든 필수 약관이 체크되었는지 확인

7. **결제 진행**
   - "₩29,000 결제하기" 버튼 클릭
   - 토스페이먼츠 결제창이 팝업되는지 확인

8. **테스트 결제**
   - **카드번호:** `4242-4242-4242-4242` (또는 아래 테스트 카드 참고)
   - **유효기간:** 미래 날짜 아무거나 (예: 12/25)
   - **CVC:** 아무 3자리 숫자 (예: 123)
   - **생년월일:** 6자리 (예: 900101)
   - **비밀번호 앞 2자리:** 아무거나 (예: 12)
   - "결제하기" 클릭

9. **결제 성공 확인**
   - `/dashboard/membership/success` 페이지로 리다이렉트 확인
   - "결제가 완료되었습니다!" 메시지 확인

10. **구독 상태 확인**
    - 대시보드로 돌아가기
    - 멤버십 페이지 재접속
    - 현재 요금제가 "Basic"으로 변경되었는지 확인
    - 다음 결제일이 표시되는지 확인

11. **크레딧 확인**
    - 대시보드 또는 프로필에서 크레딧 잔액 확인
    - Basic 플랜 크레딧 (600)이 부여되었는지 확인

---

### 🧪 시나리오 2: 플랜 업그레이드 (Basic → Pro)

1. **멤버십 페이지 접속**
   - 현재 Basic 플랜 상태에서 접속

2. **Pro 플랜 선택**
   - "Pro" 카드에서 "업그레이드" 버튼 클릭

3. **차액 결제 확인**
   - 결제 금액이 전체 금액이 아닌 차액만 표시되는지 확인
   - (Pro: ₩89,000 - Basic: ₩29,000 = ₩60,000 차액)

4. **약관 동의 및 결제**
   - 약관 동의 후 결제 진행
   - 테스트 카드로 결제

5. **업그레이드 확인**
   - 현재 요금제가 "Pro"로 변경되었는지 확인
   - 크레딧이 Pro 플랜 크레딧 (3,000)으로 업데이트되었는지 확인

---

### 🧪 시나리오 3: 쿠폰 생성 및 적용

#### Admin 쿠폰 생성 (God Tier 계정 필요)

1. **God Tier 계정 설정**
   ```sql
   -- Supabase SQL Editor에서 실행
   UPDATE profiles 
   SET subscription_tier = 'god' 
   WHERE email = 'your-admin-email@example.com';
   ```

2. **Admin 페이지 접속**
   - http://localhost:3000/dashboard/admin 접속
   - "쿠폰 관리" 탭 클릭

3. **새 쿠폰 만들기**
   - "새 쿠폰 만들기" 버튼 클릭
   - **쿠폰 코드:** `WELCOME50` (또는 자동 생성)
   - **쿠폰 이름:** `첫 구매 50% 할인`
   - **할인 유형:** `정률 할인 (%)`
   - **할인 값:** `50`
   - **적용 가능 요금제:** Basic, Basic+, Pro 체크
   - **총 사용 가능 횟수:** `10`
   - **사용자당 사용 횟수:** `1`
   - **할인 적용 기간:** `영구 할인` 선택
   - "생성" 버튼 클릭

4. **쿠폰 활성화 확인**
   - 쿠폰 목록에 "WELCOME50"이 표시되는지 확인
   - 활성 상태(녹색 뱃지)인지 확인

#### 사용자 쿠폰 적용

1. **일반 계정으로 로그아웃/로그인**
   - God Tier가 아닌 일반 계정으로 로그인

2. **멤버십 페이지에서 결제**
   - 원하는 플랜 선택 (예: Basic+)
   - 체크아웃 페이지로 이동

3. **쿠폰 적용**
   - 쿠폰 코드 입력란에 `WELCOME50` 입력
   - "적용" 버튼 클릭
   - ✅ "영구 50% 할인이 적용됩니다." 메시지 확인
   - 결제 금액이 50% 할인된 것 확인 (Basic+: ₩49,000 → ₩24,500)

4. **결제 진행**
   - 약관 동의 후 결제
   - 할인된 금액으로 결제되는지 확인

5. **영구 할인 확인**
   - 다음 달 자동 결제 시에도 50% 할인이 유지되는지 확인
   - (실제로는 스케줄러가 실행되어야 확인 가능)

---

### 🧪 시나리오 4: 구독 취소 및 Free Tier 전환

1. **유료 구독 상태에서 멤버십 페이지 접속**
   - 현재 Basic 또는 Pro 플랜 구독 중

2. **구독 취소 섹션 확인**
   - 페이지 하단에 빨간색 "구독 취소" 카드가 보이는지 확인
   - 경고 메시지가 표시되는지 확인

3. **구독 취소 버튼 클릭**
   - "구독 취소" 버튼 클릭
   - 구독 취소 다이얼로그가 팝업되는지 확인

4. **데이터 선택**
   - **유지할 매장 선택:** 최대 1개 선택
   - **유지할 키워드 선택:** 최대 1개 선택
   - 선택하지 않은 항목은 서비스 종료 시 삭제된다는 경고 확인

5. **취소 사유 입력 (선택)**
   - 취소 사유를 입력 (예: "더 이상 필요 없음")

6. **구독 취소 확인**
   - "구독 취소 확인" 버튼 클릭
   - "구독이 취소되었습니다" 메시지 확인

7. **서비스 종료일까지 이용 확인**
   - 현재 요금제 섹션에 "⚠️ 취소됨 - YYYY년 MM월 DD일까지 이용 가능" 표시 확인
   - 서비스 종료일까지 모든 유료 기능 이용 가능한지 확인

8. **만료 시뮬레이션 (개발자)**
   ```sql
   -- Supabase SQL Editor에서 실행 (테스트용)
   UPDATE subscriptions 
   SET expires_at = NOW() - INTERVAL '1 day'
   WHERE user_id = 'your-user-id' AND status = 'cancelled';
   
   -- 스케줄러 수동 실행 (또는 백엔드 코드에서 함수 호출)
   ```

9. **Free Tier 전환 확인**
   - 만료 후 자동으로 Free Tier로 전환되는지 확인
   - 선택하지 않은 매장/키워드가 삭제되었는지 확인
   - 크레딧이 Free Tier (100)로 초기화되었는지 확인

---

### 🧪 시나리오 5: Admin 회원 관리

1. **God Tier 계정으로 Admin 페이지 접속**

2. **회원 관리 탭 클릭**

3. **회원 목록 확인**
   - 모든 회원이 표시되는지 확인
   - **Tier:** 각 회원의 구독 등급 (Free, Basic, Pro 등)
   - **구독 상태:** 활성/취소됨/무료 뱃지
   - **다음 결제일:** 유료 회원의 경우 날짜 표시
   - **서비스 종료일:** 취소된 구독의 경우 종료일 표시
   - **크레딧:** 월간/수동/사용/잔여 크레딧 표시

4. **필터링 테스트**
   - 검색창에 이메일/이름 입력하여 검색
   - Tier 필터 드롭다운으로 특정 Tier만 표시

5. **크레딧 지급**
   - 특정 회원의 "크레딧 지급" 버튼 클릭
   - 크레딧 양 입력 (예: 500)
   - "지급" 버튼 클릭
   - 회원의 수동 크레딧이 증가했는지 확인

---

## 4️⃣ 토스페이먼츠 테스트 카드

### ✅ 일반 성공 케이스

| 항목 | 값 |
|------|-----|
| **카드번호** | `4242-4242-4242-4242` |
| **유효기간** | 미래 날짜 (예: 12/25) |
| **CVC** | 아무 3자리 (예: 123) |
| **생년월일** | 6자리 (예: 900101) |
| **비밀번호** | 앞 2자리 (예: 12) |

### ✅ 특정 시나리오 테스트 카드

| 시나리오 | 카드번호 |
|----------|---------|
| **승인 성공** | `4242-4242-4242-4242` |
| **잔액 부족** | `4000-0000-0000-0002` |
| **도난/분실 카드** | `4000-0000-0000-0069` |
| **유효기간 만료** | `4000-0000-0000-0127` |
| **CVC 오류** | `4000-0000-0000-0101` |

> **참고:** 토스페이먼츠 테스트 환경에서는 실제 결제가 이루어지지 않습니다.

---

## 5️⃣ 트러블슈팅

### ❌ 결제창이 뜨지 않는 경우

**원인:**
- 프론트엔드 환경 변수 미설정
- @tosspayments/tosspayments-sdk 미설치

**해결:**
```bash
# frontend/.env.local 확인
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_gck_d46qopOB89dDoN1LYk95rZmM75y0

# SDK 재설치
cd c:\egurado\frontend
npm install @tosspayments/tosspayments-sdk --save
npm run dev
```

### ❌ 결제 승인 실패 (500 에러)

**원인:**
- 백엔드 환경 변수 미설정
- Toss API 통신 오류

**해결:**
```bash
# backend/.env 확인
TOSS_SECRET_KEY=test_gsk_26DlbXAaV0Oneg21YGax3qY50Q9R
TOSS_CLIENT_KEY=test_gck_d46qopOB89dDoN1LYk95rZmM75y0
TOSS_API_URL=https://api.tosspayments.com

# 백엔드 서버 재시작
python -m uvicorn app.main:app --reload
```

### ❌ 쿠폰 적용 안됨

**원인:**
- 쿠폰이 비활성화 상태
- 적용 가능 Tier가 맞지 않음
- 유효기간 만료
- 사용 횟수 초과

**해결:**
- Admin 페이지 → 쿠폰 관리에서 쿠폰 상태 확인
- 쿠폰 코드 대소문자 구분 없음 (자동으로 대문자 변환)

### ❌ Admin 페이지 접근 거부

**원인:**
- God Tier가 아닌 계정

**해결:**
```sql
-- Supabase SQL Editor에서 실행
UPDATE profiles 
SET subscription_tier = 'god' 
WHERE email = 'your-email@example.com';
```

### ❌ 데이터베이스 에러

**원인:**
- 마이그레이션 미적용
- 테이블/함수 누락

**해결:**
```bash
# Supabase CLI로 마이그레이션 확인
supabase db push

# 또는 Supabase Dashboard에서 수동 실행:
# SQL Editor → supabase/migrations/050_create_billing_keys.sql 실행
# SQL Editor → supabase/migrations/051_create_coupons.sql 실행
```

---

## 6️⃣ 테스트 체크리스트

### 결제 시스템
- [ ] 신규 유료 구독 (Free → Basic)
- [ ] 플랜 업그레이드 (Basic → Pro)
- [ ] 플랜 다운그레이드 (Pro → Basic)
- [ ] 쿠폰 적용 및 할인
- [ ] 영구 쿠폰 유지 확인
- [ ] 구독 취소
- [ ] 서비스 종료일까지 이용
- [ ] Free Tier 전환 및 데이터 정리

### Admin 기능
- [ ] 쿠폰 생성
- [ ] 쿠폰 수정
- [ ] 쿠폰 활성화/비활성화
- [ ] 쿠폰 삭제
- [ ] 쿠폰 코드 일괄 생성
- [ ] 회원 목록 조회
- [ ] 회원 검색 및 필터링
- [ ] 다음 결제일 표시
- [ ] 서비스 종료일 표시
- [ ] 크레딧 수동 지급

### 자동화 기능 (개발자)
- [ ] 정기결제 스케줄러 (매일 실행)
- [ ] 크레딧 리셋 (매월 결제일)
- [ ] 구독 만료 처리
- [ ] 데이터 자동 정리

---

## 7️⃣ 추가 테스트 (선택)

### API 테스트 (Swagger UI)

1. http://localhost:8000/docs 접속
2. "Authorize" 버튼 클릭 → JWT 토큰 입력
3. 각 API 엔드포인트 테스트:
   - `POST /api/v1/payments/checkout` - 체크아웃 생성
   - `POST /api/v1/coupons/validate` - 쿠폰 검증
   - `GET /api/v1/subscriptions/me` - 내 구독 조회
   - `POST /api/v1/subscriptions/cancel` - 구독 취소
   - `GET /api/v1/coupons/admin/list` - 쿠폰 목록 (Admin)

### 브라우저 개발자 도구

- **Network 탭:** API 요청/응답 확인
- **Console 탭:** JavaScript 에러 확인
- **Application 탭:** LocalStorage에 토큰 저장 확인

---

## 🎉 테스트 완료!

모든 시나리오가 정상 작동하면 결제 시스템이 준비된 것입니다.

**실제 운영 환경 배포 전 확인사항:**
- [ ] 실제 토스페이먼츠 API 키로 교체
- [ ] 환경 변수 `.env` 파일 Git에 커밋되지 않았는지 확인
- [ ] 프로덕션 데이터베이스에 마이그레이션 적용
- [ ] 이용약관/환불정책/개인정보처리방침 법적 검토
- [ ] 사업자등록증 및 통신판매업 신고 완료
- [ ] SSL 인증서 설정
- [ ] 로그 및 모니터링 설정

---

**문의사항이 있으시면 언제든 알려주세요!** 🚀
