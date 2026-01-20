# 🔐 WhiPlace 인증 시스템 배포 환경변수 가이드

## 📋 배포 구조
- **백엔드**: AWS EC2 (Seoul)
- **프론트엔드**: Vercel
- **데이터베이스**: Supabase

---

## 🖥️ 백엔드 환경변수 설정 (AWS EC2)

### 1단계: EC2 SSH 접속

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 2단계: 백엔드 디렉토리로 이동

```bash
cd /home/ubuntu/egurado/backend
```

### 3단계: .env 파일 편집

```bash
nano .env
```

### 4단계: 환경변수 추가/수정

기존 환경변수에 **다음 내용을 추가**하세요:

```bash
# ==================== 기존 환경변수 (유지) ====================
SUPABASE_URL=https://bwpswxeyisagamzpvznv.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3cHN3eGV5aXNhZ2FtenB2em52Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5NjA0NSwiZXhwIjoyMDgzMzcyMDQ1fQ.rm4Z23X-wmg34NasLJTMw65k1S8cu5ECrhjBcfILP0c

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# 암호화 키
ENCRYPTION_KEY=your-existing-encryption-key

# 서버 설정
HEADLESS=true
ALLOWED_ORIGINS=https://whiplace.com,https://www.whiplace.com
FRONTEND_URL=https://whiplace.com
ENVIRONMENT=production

# ==================== 새로 추가할 인증 환경변수 ====================

# JWT 설정
JWT_SECRET_KEY=22e3d029-5119-4721-8918-76ed0214afd9
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# 카카오 로그인
KAKAO_REST_API_KEY=23a16753e4f7f0b2351c47875259b1e4
KAKAO_REDIRECT_URI=https://whiplace.com/auth/callback/kakao

# 네이버 로그인
NAVER_CLIENT_ID=78wCqlIfDBB4IPPkCbwu
NAVER_CLIENT_SECRET=XLLtlHL4jN
NAVER_REDIRECT_URI=https://whiplace.com/auth/callback/naver
```

**⚠️ 주의:**
- `ALLOWED_ORIGINS`에 실제 도메인 입력
- `KAKAO_REDIRECT_URI`, `NAVER_REDIRECT_URI`에 실제 도메인 사용

### 5단계: 저장 및 종료

- `Ctrl + O` → Enter (저장)
- `Ctrl + X` (종료)

### 6단계: 패키지 재설치 (새 패키지 추가됨)

```bash
cd /home/ubuntu/egurado/backend
source venv/bin/activate
pip install -r requirements.txt
```

**새로 설치될 패키지:**
- `email-validator`
- `python-jose[cryptography]`
- `passlib[bcrypt]`

### 7단계: 백엔드 재시작

```bash
sudo systemctl restart egurado-backend
sudo systemctl status egurado-backend
```

**정상 실행 확인:**
```
● egurado-backend.service - Egurado Backend API
   Active: active (running)
```

### 8단계: 로그 확인

```bash
sudo journalctl -u egurado-backend -f
```

**정상 실행 시:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

---

## 🌐 프론트엔드 환경변수 설정 (Vercel)

### 방법 1: Vercel Dashboard (권장)

#### 1단계: Vercel 로그인
1. https://vercel.com 접속
2. 로그인
3. `egurado` 또는 `whiplace` 프로젝트 선택

#### 2단계: Settings → Environment Variables
1. 프로젝트 선택
2. 상단 **Settings** 탭 클릭
3. 왼쪽 **Environment Variables** 클릭

#### 3단계: 기존 환경변수 확인

**이미 있어야 하는 변수:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`

#### 4단계: 새 환경변수 추가

**Add New** 버튼을 클릭하고 다음을 하나씩 추가:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_KAKAO_JS_KEY` | `00abd2fc051806d97b2d7a29857e7a7b` | Production, Preview, Development |
| `NEXT_PUBLIC_KAKAO_REDIRECT_URI` | `https://whiplace.com/auth/callback/kakao` | Production |
| `NEXT_PUBLIC_KAKAO_REDIRECT_URI` | `http://localhost:3000/auth/callback/kakao` | Development |
| `NEXT_PUBLIC_NAVER_CLIENT_ID` | `78wCqlIfDBB4IPPkCbwu` | Production, Preview, Development |
| `NEXT_PUBLIC_NAVER_REDIRECT_URI` | `https://whiplace.com/auth/callback/naver` | Production |
| `NEXT_PUBLIC_NAVER_REDIRECT_URI` | `http://localhost:3000/auth/callback/naver` | Development |

**Environment 선택 시:**
- ✅ **Production** - 실제 배포용
- ✅ **Preview** - PR 미리보기용 (선택)
- ✅ **Development** - 로컬 개발용 (선택)

#### 5단계: 재배포
1. 상단 **Deployments** 탭 클릭
2. 최신 배포 선택
3. 우측 메뉴 (**⋮**) → **Redeploy** 클릭
4. "Redeploy to Production" 확인

---

### 방법 2: Vercel CLI (터미널)

```bash
cd C:\egurado\frontend

# 카카오 JS 키
vercel env add NEXT_PUBLIC_KAKAO_JS_KEY production
# 입력: 00abd2fc051806d97b2d7a29857e7a7b

# 카카오 Redirect URI
vercel env add NEXT_PUBLIC_KAKAO_REDIRECT_URI production
# 입력: https://whiplace.com/auth/callback/kakao

# 네이버 Client ID
vercel env add NEXT_PUBLIC_NAVER_CLIENT_ID production
# 입력: 78wCqlIfDBB4IPPkCbwu

# 네이버 Redirect URI
vercel env add NEXT_PUBLIC_NAVER_REDIRECT_URI production
# 입력: https://whiplace.com/auth/callback/naver

# 재배포
vercel --prod
```

---

## 🔗 OAuth Redirect URI 업데이트

### 1. 카카오 개발자 콘솔

#### 접속
https://developers.kakao.com/console

#### 설정
1. 애플리케이션 선택
2. **플랫폼** → Web 플랫폼 설정
3. **사이트 도메인** 추가:
   ```
   https://whiplace.com
   ```

4. **JavaScript 키** → Redirect URI 추가:
   ```
   https://whiplace.com/auth/callback/kakao
   ```

5. **REST API 키** → Redirect URI 추가:
   ```
   https://whiplace.com/auth/callback/kakao
   ```

6. **저장** 클릭

---

### 2. 네이버 개발자 센터

#### 접속
https://developers.naver.com/apps

#### 설정
1. 애플리케이션 선택
2. **API 설정** 탭

3. **서비스 URL** 추가:
   ```
   https://whiplace.com
   ```

4. **Callback URL** 추가:
   ```
   https://whiplace.com/auth/callback/naver
   ```

5. **수정** 버튼 클릭

---

## 🗄️ Supabase 마이그레이션 확인

### 1. Supabase Dashboard 접속
https://supabase.com

### 2. SQL Editor 실행
1. 프로젝트 선택 (`bwpswxeyisagamzpvznv`)
2. 왼쪽 메뉴 **SQL Editor** 클릭
3. 다음 SQL 실행:

```sql
-- 마이그레이션 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

**확인할 컬럼:**
- ✅ `auth_provider`
- ✅ `user_position`
- ✅ `marketing_experience`
- ✅ `agency_experience`
- ✅ `onboarding_completed`
- ✅ `phone_number`
- ✅ `profile_image_url`

**없으면 마이그레이션 실행:**
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email' CHECK (auth_provider IN ('email', 'kakao', 'naver')),
ADD COLUMN IF NOT EXISTS user_position TEXT CHECK (user_position IN ('advertiser', 'agency')),
ADD COLUMN IF NOT EXISTS marketing_experience TEXT CHECK (marketing_experience IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN IF NOT EXISTS agency_experience TEXT CHECK (agency_experience IN ('past_used', 'currently_using', 'considering', 'doing_alone')),
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider ON profiles(auth_provider);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);
```

---

## ✅ 배포 완료 체크리스트

### 백엔드 (AWS EC2)
- [ ] SSH 접속 확인
- [ ] `.env` 파일에 인증 환경변수 추가
- [ ] 새 패키지 설치 (`pip install -r requirements.txt`)
- [ ] 백엔드 재시작 (`sudo systemctl restart egurado-backend`)
- [ ] 로그 확인 (에러 없음)
- [ ] API 엔드포인트 테스트: `https://api.whiplace.com/docs`
  - `/api/v1/auth/signup`
  - `/api/v1/auth/login`
  - `/api/v1/auth/kakao`
  - `/api/v1/auth/naver`

### 프론트엔드 (Vercel)
- [ ] Vercel Dashboard 접속
- [ ] 환경변수 4개 추가 (카카오 2개, 네이버 2개)
- [ ] Redeploy 실행
- [ ] 배포 완료 확인 (Build Successful)

### OAuth 설정
- [ ] 카카오 개발자 콘솔 Redirect URI 업데이트
- [ ] 네이버 개발자 센터 Callback URL 업데이트

### 데이터베이스
- [ ] Supabase 마이그레이션 실행
- [ ] profiles 테이블 컬럼 확인

---

## 🧪 배포 후 테스트

### 1. 백엔드 API 테스트
```bash
# Health Check
curl https://api.whiplace.com/api/health

# API Docs
https://api.whiplace.com/docs
```

### 2. 프론트엔드 테스트

#### 회원가입
1. https://whiplace.com/signup 접속
2. 이메일/비밀번호 입력
3. 회원가입 → 온보딩 → 대시보드

#### 카카오 로그인
1. https://whiplace.com/login 접속
2. "카카오로 시작하기" 클릭
3. 카카오 로그인
4. 온보딩 → 대시보드

#### 네이버 로그인
1. https://whiplace.com/login 접속
2. "네이버로 시작하기" 클릭
3. 네이버 로그인
4. 온보딩 → 대시보드

---

## 🐛 문제 해결

### 백엔드 에러: "ModuleNotFoundError"
```bash
cd /home/ubuntu/egurado/backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart egurado-backend
```

### 카카오/네이버 로그인 "Invalid redirect_uri"
→ 개발자 콘솔에서 Redirect URI 재확인

### Vercel 배포 실패
→ Environment Variables에 `NEXT_PUBLIC_` 접두사 확인

### CORS 에러
→ 백엔드 `.env`의 `ALLOWED_ORIGINS` 확인

---

## 📞 지원

문제 발생 시:
1. 백엔드 로그: `sudo journalctl -u egurado-backend -f`
2. Vercel 배포 로그: Vercel Dashboard → Deployments → 로그 확인
3. GitHub Issues

---

**배포 완료! 🎉**

이제 WhiPlace의 완전한 인증 시스템이 프로덕션에서 작동합니다!
