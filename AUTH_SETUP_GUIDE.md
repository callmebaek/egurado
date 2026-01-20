# 🔐 WhiPlace 인증 시스템 설정 가이드

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [환경변수 설정](#환경변수-설정)
3. [데이터베이스 마이그레이션](#데이터베이스-마이그레이션)
4. [백엔드 실행](#백엔드-실행)
5. [프론트엔드 실행](#프론트엔드-실행)
6. [기능 테스트](#기능-테스트)
7. [트러블슈팅](#트러블슈팅)

---

## 🎯 시스템 개요

WhiPlace의 인증 시스템은 다음 3가지 회원가입/로그인 방법을 지원합니다:

### ✅ 구현된 기능

1. **이메일 인증 회원가입**
   - 이메일 + 비밀번호 방식
   - Supabase Auth 사용
   - 개인정보보호법 준수 (동의 절차)
   - 이메일 인증 메일 발송

2. **카카오 로그인**
   - OAuth 2.0 방식
   - 즉시 가입 및 로그인
   - 이메일 인증 불필요

3. **네이버 로그인**
   - OAuth 2.0 방식
   - 즉시 가입 및 로그인
   - 이메일 인증 불필요

4. **온보딩 프로세스**
   - 최초 로그인 시 필수
   - 3단계 질문 (포지션, 마케팅 경험, 대행사 경험)
   - 온보딩 완료 전 서비스 접근 제한

---

## ⚙️ 환경변수 설정

### 1. 백엔드 환경변수 설정

`backend/.env` 파일을 생성하고 다음 내용을 입력하세요:

```env
# Supabase 설정
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI API
OPENAI_API_KEY=your-openai-api-key-here

# 카카오 로그인 설정
KAKAO_REST_API_KEY=23a16753e4f7f0b2351c47875259b1e4
KAKAO_REDIRECT_URI=https://whiplace.com/auth/callback/kakao

# 네이버 로그인 설정
NAVER_CLIENT_ID=78wCqlIfDBB4IPPkCbwu
NAVER_CLIENT_SECRET=XLLtlHL4jN
NAVER_REDIRECT_URI=https://whiplace.com/auth/callback/naver

# JWT 설정 (회원가입/로그인용)
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production-make-it-long-and-random
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS 설정
ALLOWED_ORIGINS=http://localhost:3000,https://whiplace.com

# 서버 설정
PORT=8000
HOST=0.0.0.0
```

**⚠️ 중요:**
- `JWT_SECRET_KEY`: 반드시 변경하세요! 최소 32자 이상의 랜덤 문자열 권장
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: Supabase 대시보드에서 확인
- **개발 환경**에서는 `KAKAO_REDIRECT_URI`, `NAVER_REDIRECT_URI`를 `http://localhost:3000`으로 변경

**개발 환경 예시:**
```env
KAKAO_REDIRECT_URI=http://localhost:3000/auth/callback/kakao
NAVER_REDIRECT_URI=http://localhost:3000/auth/callback/naver
ALLOWED_ORIGINS=http://localhost:3000
```

---

### 2. 프론트엔드 환경변수 설정

`frontend/.env.local` 파일을 생성하고 다음 내용을 입력하세요:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# 백엔드 API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# 카카오 로그인 설정 (클라이언트 사이드)
NEXT_PUBLIC_KAKAO_JS_KEY=00abd2fc051806d97b2d7a29857e7a7b
NEXT_PUBLIC_KAKAO_REDIRECT_URI=http://localhost:3000/auth/callback/kakao

# 네이버 로그인 설정 (클라이언트 사이드)
NEXT_PUBLIC_NAVER_CLIENT_ID=78wCqlIfDBB4IPPkCbwu
NEXT_PUBLIC_NAVER_REDIRECT_URI=http://localhost:3000/auth/callback/naver
```

**프로덕션 배포 시:**
```env
NEXT_PUBLIC_API_URL=https://api.whiplace.com
NEXT_PUBLIC_KAKAO_REDIRECT_URI=https://whiplace.com/auth/callback/kakao
NEXT_PUBLIC_NAVER_REDIRECT_URI=https://whiplace.com/auth/callback/naver
```

---

## 🗄️ 데이터베이스 마이그레이션

### 1. Supabase Dashboard 접속

1. https://supabase.com 로그인
2. 프로젝트 선택
3. **SQL Editor** 메뉴로 이동

### 2. 마이그레이션 실행

다음 SQL 파일들을 **순서대로** 실행하세요:

#### Step 1: 기본 스키마 (이미 실행했다면 건너뛰기)
```bash
supabase/migrations/001_initial_schema.sql
```

#### Step 2: 인증 및 온보딩 필드 추가 ⭐ 새로운 마이그레이션
```bash
supabase/migrations/006_add_auth_and_onboarding_fields.sql
```

**SQL Editor에서 실행 방법:**
1. SQL Editor 열기
2. 파일 내용 복사 → 붙여넣기
3. `Run` 버튼 클릭
4. "Success" 메시지 확인

### 3. 마이그레이션 확인

SQL Editor에서 다음 쿼리로 확인:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';
```

**확인할 컬럼들:**
- `auth_provider`
- `user_position`
- `marketing_experience`
- `agency_experience`
- `onboarding_completed`
- `phone_number`
- `profile_image_url`

---

## 🚀 백엔드 실행

### 1. 패키지 설치

```bash
cd backend
pip install -r requirements.txt
```

### 2. 백엔드 서버 실행

```bash
# 개발 모드 (핫 리로드)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 또는
python -m uvicorn app.main:app --reload
```

### 3. API 문서 확인

브라우저에서 열기:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

**확인할 엔드포인트:**
- `POST /api/v1/auth/signup` - 이메일 회원가입
- `POST /api/v1/auth/login` - 이메일 로그인
- `POST /api/v1/auth/kakao` - 카카오 로그인
- `POST /api/v1/auth/naver` - 네이버 로그인
- `POST /api/v1/auth/onboarding` - 온보딩 제출
- `GET /api/v1/auth/me` - 현재 사용자 정보

---

## 🎨 프론트엔드 실행

### 1. 패키지 설치

```bash
cd frontend
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

### 3. 브라우저에서 확인

http://localhost:3000 접속

**주요 페이지:**
- `/login` - 로그인
- `/signup` - 회원가입
- `/onboarding` - 온보딩
- `/auth/callback/kakao` - 카카오 콜백
- `/auth/callback/naver` - 네이버 콜백
- `/dashboard` - 대시보드 (로그인 후)

---

## 🧪 기능 테스트

### 테스트 시나리오 1: 이메일 회원가입

1. http://localhost:3000/signup 접속
2. 이메일, 비밀번호 입력
3. 약관 동의 체크
4. **회원가입** 버튼 클릭
5. → 온보딩 페이지로 자동 이동
6. 3단계 질문에 답변
7. → 대시보드로 이동

### 테스트 시나리오 2: 카카오 로그인

1. http://localhost:3000/login 접속
2. **카카오로 시작하기** 버튼 클릭
3. 카카오 로그인 페이지에서 로그인
4. → 콜백 페이지 → 온보딩 페이지
5. 3단계 질문에 답변
6. → 대시보드로 이동

### 테스트 시나리오 3: 네이버 로그인

1. http://localhost:3000/login 접속
2. **네이버로 시작하기** 버튼 클릭
3. 네이버 로그인 페이지에서 로그인
4. → 콜백 페이지 → 온보딩 페이지
5. 3단계 질문에 답변
6. → 대시보드로 이동

### 테스트 시나리오 4: 이메일 로그인

1. http://localhost:3000/login 접속
2. 기존 계정 이메일, 비밀번호 입력
3. **로그인** 버튼 클릭
4. → 대시보드로 이동 (온보딩 완료 시)
   또는 → 온보딩 페이지로 이동 (온보딩 미완료 시)

---

## 🐛 트러블슈팅

### 문제 1: 카카오 로그인 "Invalid redirect_uri" 오류

**원인:** Redirect URI가 카카오 개발자 콘솔에 등록되지 않음

**해결:**
1. https://developers.kakao.com/console 접속
2. 애플리케이션 선택
3. **JavaScript 키 설정** → Redirect URI에 추가:
   ```
   http://localhost:3000/auth/callback/kakao
   https://whiplace.com/auth/callback/kakao
   ```

---

### 문제 2: 네이버 로그인 "Invalid client_id" 오류

**원인:** Client ID가 잘못됨 또는 환경변수 로드 실패

**해결:**
1. `.env.local` 파일에서 `NEXT_PUBLIC_NAVER_CLIENT_ID` 확인
2. 네이버 개발자 센터에서 Client ID 재확인
3. 개발 서버 재시작: `npm run dev`

---

### 문제 3: JWT 토큰 "Invalid token" 오류

**원인:** JWT Secret Key 불일치

**해결:**
1. `backend/.env` 파일에서 `JWT_SECRET_KEY` 확인
2. 32자 이상의 랜덤 문자열로 변경
3. 백엔드 서버 재시작

---

### 문제 4: CORS 오류

**원인:** CORS 설정 누락

**해결:**
1. `backend/.env` 파일 확인:
   ```env
   ALLOWED_ORIGINS=http://localhost:3000,https://whiplace.com
   ```
2. 백엔드 서버 재시작
3. 브라우저 캐시 삭제

---

### 문제 5: Supabase 연결 오류

**원인:** Supabase URL 또는 Key가 잘못됨

**해결:**
1. Supabase Dashboard → Settings → API
2. `Project URL` 확인
3. `anon public` key (프론트엔드용)
4. `service_role` key (백엔드용)
5. 환경변수 파일에 정확히 입력
6. 서버 재시작

---

### 문제 6: 온보딩 페이지가 무한 루프

**원인:** 온보딩 완료 상태가 제대로 저장되지 않음

**해결:**
1. Supabase Dashboard → Table Editor → `profiles` 테이블
2. 해당 사용자의 `onboarding_completed` 필드 확인
3. SQL Editor에서 수동 업데이트:
   ```sql
   UPDATE profiles 
   SET onboarding_completed = true 
   WHERE email = 'your-email@example.com';
   ```

---

## 🎉 배포 체크리스트

프로덕션 배포 전 확인사항:

### 백엔드
- [ ] `JWT_SECRET_KEY`를 강력한 랜덤 문자열로 변경
- [ ] `ALLOWED_ORIGINS`에 프로덕션 도메인 추가
- [ ] `KAKAO_REDIRECT_URI`, `NAVER_REDIRECT_URI`를 프로덕션 URL로 변경
- [ ] HTTPS 적용

### 프론트엔드
- [ ] `NEXT_PUBLIC_API_URL`을 프로덕션 백엔드 URL로 변경
- [ ] `NEXT_PUBLIC_KAKAO_REDIRECT_URI`를 프로덕션 URL로 변경
- [ ] `NEXT_PUBLIC_NAVER_REDIRECT_URI`를 프로덕션 URL로 변경
- [ ] 카카오 개발자 콘솔에 프로덕션 도메인 등록
- [ ] 네이버 개발자 센터에 프로덕션 도메인 등록

### 데이터베이스
- [ ] Supabase 마이그레이션 모두 실행
- [ ] RLS (Row Level Security) 정책 활성화 확인
- [ ] 백업 설정

---

## 📞 지원

문제가 해결되지 않으면:
1. GitHub Issues 등록
2. 개발팀 Slack 채널 문의
3. 로그 파일 확인: `backend/backend_log.txt`

---

## 🔒 보안 주의사항

**절대 공개하면 안 되는 정보:**
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET_KEY`
- `NAVER_CLIENT_SECRET`
- `OPENAI_API_KEY`

**GitHub에 커밋하지 마세요:**
- `.env` 파일
- `.env.local` 파일

**`.gitignore`에 추가되어 있는지 확인:**
```
.env
.env.local
.env*.local
```

---

완료! 🎉 WhiPlace 인증 시스템이 정상적으로 작동합니다.
