# 🚀 GitHub Desktop을 활용한 배포 가이드

GitHub Desktop을 사용하여 처음부터 배포까지 진행하는 상세 가이드입니다.

---

## 📋 STEP 0: 사전 준비

### 필요한 계정 및 정보

- [ ] **GitHub 계정** (없다면 https://github.com 가입)
- [ ] **Vercel 계정** (없다면 https://vercel.com 가입 - GitHub로 가입 권장)
- [ ] **AWS 계정** (없다면 https://aws.amazon.com 가입)
- [ ] **Supabase 정보**
  - URL: `https://your-project.supabase.co`
  - Anon Key: (Supabase Dashboard → Settings → API)
  - Service Role Key: (Supabase Dashboard → Settings → API)
- [ ] **OpenAI API 키** (https://platform.openai.com/api-keys)

---

## 📝 STEP 1: GitHub Desktop 설치 및 설정

### 1-1. GitHub Desktop 설치

1. https://desktop.github.com 접속
2. "Download for Windows" 클릭
3. 설치 파일 실행 및 설치
4. GitHub Desktop 실행

### 1-2. GitHub 계정 로그인

1. GitHub Desktop 실행
2. "Sign in to GitHub.com" 클릭
3. 브라우저에서 GitHub 로그인
4. GitHub Desktop에서 "Authorize GitHub Desktop" 클릭

**✅ 체크리스트:**
- [ ] GitHub Desktop 설치 완료
- [ ] GitHub 계정 로그인 완료

---

## 📝 STEP 2: GitHub에 신규 저장소 생성

### 2-1. GitHub 웹사이트에서 저장소 생성

1. 브라우저에서 https://github.com 접속
2. 우측 상단 "+" 아이콘 클릭 → "New repository" 선택
3. 저장소 설정:
   - **Repository name**: `egurado` (또는 원하는 이름)
   - **Description**: (선택) "Egurado - 네이버 플레이스 관리 서비스"
   - **Visibility**: 
     - 🔒 **Private** (비공개, 추천) - 코드가 비공개로 유지됨
     - 🌐 **Public** (공개) - 누구나 볼 수 있음
   - **⚠️ 중요**: 아래 체크박스들은 모두 **체크 해제**하세요:
     - ❌ Add a README file
     - ❌ Add .gitignore
     - ❌ Choose a license
4. "Create repository" 클릭

### 2-2. 저장소 URL 확인

저장소 생성 후 나타나는 페이지에서 URL을 복사하세요:
- 예: `https://github.com/YOUR_USERNAME/egurado.git`
- 또는: `git@github.com:YOUR_USERNAME/egurado.git`

**✅ 체크리스트:**
- [ ] GitHub에 저장소 생성 완료
- [ ] 저장소 URL 확인 및 복사 완료

---

## 📝 STEP 3: GitHub Desktop으로 프로젝트 연결

### 3-1. 로컬 프로젝트를 GitHub Desktop에 추가

1. GitHub Desktop 실행
2. 상단 메뉴: **File** → **Add Local Repository** 클릭
3. "Choose..." 버튼 클릭
4. 프로젝트 폴더 선택: `C:\egurado`
5. "Add repository" 클릭

### 3-2. Git 저장소 초기화 (필요한 경우)

만약 "This directory does not appear to be a Git repository" 메시지가 나타나면:

1. "create a repository" 링크 클릭
2. 또는 터미널에서:
```bash
cd C:\egurado
git init
```

그 후 GitHub Desktop에서 다시 "Add Local Repository" 시도

### 3-3. 원격 저장소 연결

1. GitHub Desktop에서 상단 메뉴: **Repository** → **Repository Settings** 클릭
2. "Remote" 탭 클릭
3. "Primary remote repository" 섹션에서:
   - **Remote name**: `origin` (기본값)
   - **Primary remote URL**: 위에서 복사한 저장소 URL 입력
     - 예: `https://github.com/YOUR_USERNAME/egurado.git`
4. "Save" 클릭

**✅ 체크리스트:**
- [ ] GitHub Desktop에 프로젝트 추가 완료
- [ ] 원격 저장소 연결 완료

---

## 📝 STEP 4: .env 파일 확인 및 커밋 준비

### 4-1. 민감한 정보 확인

`.env` 파일은 **절대 GitHub에 올리면 안 됩니다!**

GitHub Desktop에서 확인:
1. 왼쪽 패널에서 변경된 파일 목록 확인
2. `backend/.env` 파일이 목록에 있다면:
   - 해당 파일을 **체크 해제** (커밋에서 제외)
   - 또는 `.gitignore`에 이미 포함되어 있는지 확인

### 4-2. .gitignore 확인

프로젝트 루트의 `.gitignore` 파일에 다음이 포함되어 있는지 확인:
```
.env
.env.local
backend/.env
frontend/.env
```

**✅ 체크리스트:**
- [ ] `.env` 파일이 커밋 목록에 없는지 확인
- [ ] `.gitignore`에 `.env` 포함 확인

---

## 📝 STEP 5: 첫 커밋 및 푸시

### 5-1. 변경사항 확인

GitHub Desktop 왼쪽 패널에서:
- 변경된 파일 목록 확인
- 각 파일의 변경 내용 확인 (오른쪽 패널)

### 5-2. 커밋 메시지 작성 및 커밋

1. 왼쪽 하단 "Summary" 입력란에 커밋 메시지 입력:
   ```
   Initial commit: Ready for deployment
   ```
2. (선택) "Description"에 추가 설명 입력:
   ```
   - Add Vercel deployment config
   - Add AWS Docker deployment config
   - Add deployment guides
   ```
3. 왼쪽 하단 **"Commit to main"** 버튼 클릭

### 5-3. GitHub에 푸시

1. 상단 메뉴: **Repository** → **Push origin** 클릭
   - 또는 상단의 **"Push origin"** 버튼 클릭
2. GitHub 인증이 필요하면 브라우저에서 인증
3. 푸시 완료 대기

**✅ 체크리스트:**
- [ ] 첫 커밋 완료
- [ ] GitHub에 푸시 완료
- [ ] GitHub 웹사이트에서 파일이 올라간 것 확인

---

## 📝 STEP 6: Vercel 프론트엔드 배포

### 6-1. Vercel 계정 생성 및 로그인

1. https://vercel.com 접속
2. "Sign Up" 클릭
3. "Continue with GitHub" 클릭 (GitHub 계정으로 가입 권장)
4. GitHub 인증 완료

### 6-2. 프로젝트 Import

1. Vercel Dashboard에서 **"Add New..."** → **"Project"** 클릭
2. GitHub 저장소 목록에서 **`egurado`** 선택
3. **"Import"** 클릭

### 6-3. 프로젝트 설정 (중요!)

**프로젝트 설정 화면에서:**

1. **Root Directory 설정:**
   - "Root Directory" 옆 **"Edit"** 클릭
   - `frontend` 입력 또는 선택
   - **"Continue"** 클릭

2. **Framework Preset:**
   - 자동으로 "Next.js"로 감지됨 (확인만)

3. **Build and Output Settings:**
   - Build Command: `npm run build` (자동 설정)
   - Output Directory: `.next` (자동 설정)
   - Install Command: `npm install` (자동 설정)

### 6-4. 환경 변수 설정

**"Environment Variables" 섹션에서:**

다음 변수들을 하나씩 추가하세요:

1. **첫 번째 변수:**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://your-project.supabase.co` (실제 Supabase URL)
   - Environment: 모든 환경 체크 (Production, Preview, Development)
   - "Save" 클릭

2. **두 번째 변수:**
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: (실제 Supabase Anon Key)
   - Environment: 모든 환경 체크
   - "Save" 클릭

3. **세 번째 변수:**
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `http://localhost:8000` (임시, 나중에 EC2 IP로 업데이트)
   - Environment: 모든 환경 체크
   - "Save" 클릭

### 6-5. 배포 실행

1. 모든 설정 완료 후 **"Deploy"** 버튼 클릭
2. 배포 진행 상황 확인 (약 2-3분 소요)
3. 배포 완료 후 제공되는 URL 확인:
   - 예: `https://egurado.vercel.app`
   - 또는: `https://egurado-xxxxx.vercel.app`

### 6-6. 배포 확인

1. 제공된 URL 클릭하여 접속
2. 에러가 나도 정상 (백엔드가 아직 없으므로)
3. 브라우저 개발자 도구(F12) → Console에서 에러 확인

**✅ 체크리스트:**
- [ ] Vercel 계정 생성 완료
- [ ] 프로젝트 Import 완료
- [ ] Root Directory를 `frontend`로 설정 완료
- [ ] 환경 변수 3개 모두 추가 완료
- [ ] 배포 성공 확인
- [ ] 배포 URL 확인 및 저장

---

## 📝 STEP 7: AWS EC2 백엔드 배포

### 7-1. AWS EC2 인스턴스 생성

1. **AWS Console 접속:**
   - https://console.aws.amazon.com 접속
   - AWS 계정으로 로그인

2. **EC2 서비스로 이동:**
   - 검색창에 "EC2" 입력
   - "EC2" 서비스 클릭

3. **인스턴스 시작:**
   - 좌측 메뉴에서 "Instances" 클릭
   - "Launch Instance" 버튼 클릭

4. **인스턴스 설정:**

   **Name and tags:**
   - Name: `egurado-backend`

   **Application and OS Images:**
   - Ubuntu 선택
   - Ubuntu Server 22.04 LTS 선택

   **Instance type:**
   - `t3.small` 이상 선택 (최소 2GB RAM 권장)
   - 비용: 약 $0.02/시간

   **Key pair:**
   - "Create new key pair" 클릭
   - Key pair name: `egurado-key`
   - Key pair type: RSA
   - Private key file format: `.pem`
   - "Create key pair" 클릭
   - **⚠️ 중요**: `.pem` 파일이 자동으로 다운로드됨. 안전한 곳에 보관!

   **Network settings:**
   - "Edit" 클릭
   - Security group: "Create security group" 선택
   - Security group name: `egurado-backend-sg`
   - Inbound security group rules 추가:
     - Type: SSH, Port: 22, Source: My IP
     - Type: HTTP, Port: 80, Source: Anywhere-IPv4
     - Type: HTTPS, Port: 443, Source: Anywhere-IPv4
     - Type: Custom TCP, Port: 8000, Source: Anywhere-IPv4

   **Configure storage:**
   - Size: 20 GB (기본값)

5. **인스턴스 시작:**
   - "Launch Instance" 클릭
   - "View Instances" 클릭

### 7-2. EC2 인스턴스 정보 확인

1. 인스턴스 목록에서 `egurado-backend` 선택
2. 아래 "Details" 탭에서 다음 정보 확인:
   - **Public IPv4 address**: (예: `54.123.45.67`) ← 이게 중요!
   - **Instance ID**: (예: `i-0123456789abcdef0`)
   - **State**: `running` 확인

**✅ 체크리스트:**
- [ ] EC2 인스턴스 생성 완료
- [ ] Public IPv4 address 확인 및 저장
- [ ] Key pair 파일(.pem) 다운로드 완료

---

## 📝 STEP 8: EC2 서버 설정

### 8-1. EC2에 SSH 접속 (Windows PowerShell)

1. **PowerShell 실행** (관리자 권한 불필요)

2. **Key 파일 권한 설정** (첫 실행 시만):
```powershell
# 다운로드한 .pem 파일 경로로 변경
icacls "C:\Users\YOUR_USERNAME\Downloads\egurado-key.pem" /inheritance:r
icacls "C:\Users\YOUR_USERNAME\Downloads\egurado-key.pem" /grant:r "$env:USERNAME:R"
```

3. **SSH 접속:**
```powershell
# YOUR_EC2_IP를 실제 Public IPv4 address로 변경
ssh -i "C:\Users\YOUR_USERNAME\Downloads\egurado-key.pem" ubuntu@YOUR_EC2_IP
```

4. **첫 접속 시:**
   - "Are you sure you want to continue connecting?" → `yes` 입력

**✅ 체크리스트:**
- [ ] SSH 접속 성공

### 8-2. 서버 초기 설정

EC2에 접속한 후 다음 명령어를 순서대로 실행:

```bash
# 1. 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 2. 필수 패키지 설치
sudo apt install -y python3.11 python3-pip python3.11-venv git docker.io docker-compose

# 3. Docker 서비스 시작
sudo systemctl start docker
sudo systemctl enable docker

# 4. 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker ubuntu

# 5. 로그아웃 (docker 그룹 적용을 위해)
exit
```

**✅ 체크리스트:**
- [ ] 시스템 업데이트 완료
- [ ] Docker 설치 완료
- [ ] 로그아웃 완료

### 8-3. 다시 SSH 접속

```powershell
ssh -i "C:\Users\YOUR_USERNAME\Downloads\egurado-key.pem" ubuntu@YOUR_EC2_IP
```

### 8-4. 프로젝트 클론

```bash
# 홈 디렉토리로 이동
cd ~

# 프로젝트 클론 (YOUR_USERNAME을 실제 GitHub 사용자명으로 변경)
git clone https://github.com/YOUR_USERNAME/egurado.git

# 프로젝트 디렉토리로 이동
cd egurado/backend
```

**✅ 체크리스트:**
- [ ] 프로젝트 클론 완료

### 8-5. 환경 변수 설정

```bash
# .env 파일 생성
nano .env
```

다음 내용을 입력 (실제 값으로 변경):

```bash
# Supabase 설정
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI API
OPENAI_API_KEY=your-openai-api-key-here

# CORS 설정 (Vercel URL 포함)
ALLOWED_ORIGINS=https://egurado.vercel.app,http://localhost:3000

# 서버 설정
PORT=8000
HOST=0.0.0.0
```

**Nano 에디터 사용법:**
- 입력: 그냥 타이핑
- 저장: `Ctrl + O`, `Enter`
- 종료: `Ctrl + X`

**✅ 체크리스트:**
- [ ] .env 파일 생성 완료
- [ ] 모든 환경 변수 입력 완료

### 8-6. Docker로 백엔드 실행

```bash
# Docker 이미지 빌드 (약 5-10분 소요)
docker build -t egurado-api .

# Docker 컨테이너 실행
docker run -d \
  --name egurado-api \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file .env \
  egurado-api

# 로그 확인
docker logs -f egurado-api
```

**로그 확인 중:**
- `[OK] Egurado API started` 메시지가 보이면 성공!
- `Ctrl + C`로 로그 보기 종료

**✅ 체크리스트:**
- [ ] Docker 이미지 빌드 완료
- [ ] Docker 컨테이너 실행 완료
- [ ] API 시작 메시지 확인

### 8-7. API 테스트

새 PowerShell 창을 열어서 (또는 브라우저에서):

```powershell
# YOUR_EC2_IP를 실제 IP로 변경
curl http://YOUR_EC2_IP:8000/api/health
```

또는 브라우저에서:
```
http://YOUR_EC2_IP:8000/api/health
```

**예상 응답:**
```json
{"status":"ok","message":"Egurado API is running","database_connected":true}
```

**✅ 체크리스트:**
- [ ] API 헬스체크 성공
- [ ] 응답 확인 완료

---

## 📝 STEP 9: 프론트엔드와 백엔드 연결

### 9-1. Vercel 환경 변수 업데이트

1. Vercel Dashboard 접속
2. 프로젝트 선택
3. **Settings** → **Environment Variables** 클릭
4. `NEXT_PUBLIC_API_URL` 찾기
5. "Edit" 클릭
6. Value를 EC2 IP로 변경:
   ```
   http://YOUR_EC2_IP:8000
   ```
   (예: `http://54.123.45.67:8000`)
7. "Save" 클릭

### 9-2. Vercel 재배포

1. Vercel Dashboard에서 프로젝트 선택
2. 상단 **"Deployments"** 탭 클릭
3. 가장 최근 배포 옆 **"..."** 메뉴 클릭
4. **"Redeploy"** 클릭
5. "Redeploy" 확인

**✅ 체크리스트:**
- [ ] Vercel 환경 변수 업데이트 완료
- [ ] Vercel 재배포 완료

### 9-3. 백엔드 CORS 확인

EC2에서 `.env` 파일의 `ALLOWED_ORIGINS`에 Vercel URL이 포함되어 있는지 확인:

```bash
# EC2에서
nano ~/egurado/backend/.env
```

다음과 같이 설정되어 있는지 확인:
```bash
ALLOWED_ORIGINS=https://egurado.vercel.app,http://localhost:3000
```

변경했다면 Docker 컨테이너 재시작:

```bash
docker restart egurado-api
```

**✅ 체크리스트:**
- [ ] 백엔드 CORS 설정 확인
- [ ] Docker 컨테이너 재시작 완료

---

## 📝 STEP 10: 최종 테스트

### 10-1. 프론트엔드 접속

1. Vercel에서 제공한 URL 접속 (예: `https://egurado.vercel.app`)
2. 브라우저 개발자 도구(F12) 열기
3. **Console** 탭에서 에러 확인
4. **Network** 탭에서 API 호출 확인

### 10-2. 백엔드 API 직접 테스트

브라우저에서:
```
http://YOUR_EC2_IP:8000/api/health
```

### 10-3. 통합 테스트

1. 프론트엔드에서 로그인 시도
2. 매장 등록 시도
3. 주요 기능 테스트

**✅ 체크리스트:**
- [ ] 프론트엔드 정상 로드
- [ ] 백엔드 API 응답 확인
- [ ] 로그인 기능 테스트
- [ ] 주요 기능 테스트

---

## 🎉 배포 완료!

축하합니다! 웹 배포가 완료되었습니다! 🎊

---

## 🔧 로컬 개발 환경

배포 후에도 로컬에서 개발할 수 있습니다:

### 프론트엔드 로컬 실행

```bash
cd C:\egurado\frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 백엔드 로컬 실행

```bash
cd C:\egurado\backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# env.example을 참고하여 .env 파일 생성
# (backend/env.example 참고)

uvicorn app.main:app --reload
```

브라우저에서 `http://localhost:8000` 접속

**로컬 개발 시:**
- 프론트엔드는 자동으로 `http://localhost:8000`을 백엔드로 사용
- `lib/config.ts`가 환경에 따라 자동으로 URL 선택

---

## 🚨 문제 해결

### CORS 오류

**증상**: 프론트엔드에서 API 호출 시 CORS 에러

**해결**:
1. EC2에서 `.env` 파일의 `ALLOWED_ORIGINS` 확인
2. Vercel URL이 포함되어 있는지 확인
3. Docker 컨테이너 재시작: `docker restart egurado-api`

### API 연결 실패

**증상**: 프론트엔드에서 백엔드 API를 호출할 수 없음

**해결**:
1. EC2 보안 그룹에서 포트 8000이 열려있는지 확인
2. Vercel의 `NEXT_PUBLIC_API_URL`이 올바른지 확인
3. 백엔드 로그 확인: `docker logs egurado-api`

### SSH 접속 실패

**증상**: EC2에 SSH 접속이 안 됨

**해결**:
1. EC2 보안 그룹에서 SSH(22) 포트가 열려있는지 확인
2. Key 파일 경로가 올바른지 확인
3. Key 파일 권한 설정 확인

---

## 📞 다음 단계

1. **프록시 서비스 연결** (추후)
   - 도메인 구매 및 설정
   - 프록시 서비스 구독
   - Vercel과 EC2에 도메인 연결

2. **모니터링 설정**
   - Vercel Analytics
   - AWS CloudWatch

3. **자동 배포 설정**
   - GitHub Actions (선택)
   - Vercel 자동 배포 (이미 설정됨)

---

**자세한 내용은 `DEPLOYMENT_STEP_BY_STEP.md` 참고하세요!**
