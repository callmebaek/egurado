# 🚀 Egurado 웹 배포 단계별 가이드

이 가이드는 Vercel(프론트엔드), AWS(백엔드), GitHub를 통한 초기 웹 배포를 안내합니다.

---

## 📋 사전 준비사항

### 1. 필요한 계정
- [ ] GitHub 계정
- [ ] Vercel 계정 (https://vercel.com)
- [ ] AWS 계정 (https://aws.amazon.com)
- [ ] Supabase 계정 (이미 있음)
- [ ] OpenAI API 키

### 2. 필요한 정보 수집
- Supabase URL 및 키
- OpenAI API 키
- (선택) 도메인 (나중에 프록시 서비스 연결 시 사용)

---

## 📝 STEP 1: GitHub 저장소 준비

### 1-1. 현재 프로젝트를 GitHub에 푸시

터미널에서 다음 명령어를 실행하세요:

```bash
# 현재 디렉토리 확인
cd C:\egurado

# Git 저장소 초기화 (이미 되어있다면 스킵)
git init

# 모든 파일 추가
git add .

# 첫 커밋 (아직 커밋이 없다면)
git commit -m "Initial commit: Ready for deployment"

# GitHub에서 새 저장소 생성 후 아래 명령어 실행
# (GitHub에서 저장소 URL을 복사하세요)
git remote add origin https://github.com/YOUR_USERNAME/egurado.git
git branch -M main
git push -u origin main
```

**✅ 체크리스트:**
- [ ] GitHub에 저장소 생성 완료
- [ ] 코드 푸시 완료
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인

---

## 📝 STEP 2: Vercel 프론트엔드 배포

### 2-1. Vercel 계정 생성 및 로그인

1. https://vercel.com 접속
2. "Sign Up" 클릭
3. GitHub 계정으로 로그인 (권장)

### 2-2. 프로젝트 Import

1. Vercel Dashboard에서 "Add New..." → "Project" 클릭
2. GitHub 저장소 목록에서 `egurado` 선택
3. **중요 설정:**
   - **Root Directory**: `frontend` 선택
   - **Framework Preset**: Next.js (자동 감지됨)
   - **Build Command**: `npm run build` (자동 설정됨)
   - **Output Directory**: `.next` (자동 설정됨)

### 2-3. 환경 변수 설정

프로젝트 Import 후 "Environment Variables" 섹션에서 다음 변수들을 추가하세요:

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key-here
NEXT_PUBLIC_API_URL = http://localhost:8000
```

**⚠️ 주의:** 
- `NEXT_PUBLIC_API_URL`은 아직 로컬 주소로 설정합니다. 백엔드 배포 후 업데이트할 예정입니다.
- 모든 환경(Production, Preview, Development)에 적용하도록 설정하세요.

### 2-4. 배포 실행

1. "Deploy" 버튼 클릭
2. 배포 완료까지 대기 (약 2-3분)
3. 배포 완료 후 제공되는 URL 확인 (예: `https://egurado.vercel.app`)

**✅ 체크리스트:**
- [ ] Vercel 프로젝트 생성 완료
- [ ] 환경 변수 설정 완료
- [ ] 배포 성공 확인
- [ ] 배포된 URL 접속 테스트 (에러가 나도 정상, 백엔드가 아직 없으므로)

---

## 📝 STEP 3: AWS 백엔드 배포

### 3-1. AWS EC2 인스턴스 생성

1. AWS Console (https://console.aws.amazon.com) 접속
2. EC2 서비스로 이동
3. "Launch Instance" 클릭
4. 설정:
   - **Name**: `egurado-backend`
   - **AMI**: Ubuntu 22.04 LTS 선택
   - **Instance Type**: `t3.small` 이상 (최소 2GB RAM 권장)
   - **Key Pair**: 새로 생성하거나 기존 키 사용 (`.pem` 파일 다운로드)
   - **Network Settings**: 
     - SSH (22), HTTP (80), HTTPS (443) 포트 열기
     - Custom TCP 8000 포트 열기 (임시, 나중에 프록시로 대체)
   - **Storage**: 20GB 이상
5. "Launch Instance" 클릭

### 3-2. EC2 인스턴스 접속

Windows PowerShell에서:

```powershell
# 키 파일 권한 설정 (첫 실행 시)
icacls "C:\path\to\your-key.pem" /inheritance:r
icacls "C:\path\to\your-key.pem" /grant:r "%username%:R"

# SSH 접속
ssh -i "C:\path\to\your-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

### 3-3. 서버 초기 설정

EC2에 접속한 후 다음 명령어를 실행하세요:

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y python3.11 python3-pip python3.11-venv git docker.io docker-compose

# Docker 서비스 시작
sudo systemctl start docker
sudo systemctl enable docker

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker ubuntu

# 로그아웃 후 다시 로그인 (docker 그룹 적용)
exit
```

다시 SSH 접속:

```powershell
ssh -i "C:\path\to\your-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

### 3-4. 프로젝트 클론 및 설정

```bash
# 프로젝트 클론
cd ~
git clone https://github.com/YOUR_USERNAME/egurado.git
cd egurado/backend

# 환경 변수 파일 생성
nano .env
```

`.env` 파일에 다음 내용 입력 (실제 값으로 변경):

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
OPENAI_API_KEY=your-openai-api-key-here
ALLOWED_ORIGINS=https://egurado.vercel.app,http://localhost:3000
PORT=8000
HOST=0.0.0.0
```

저장: `Ctrl+O`, `Enter`, `Ctrl+X`

### 3-5. Docker를 사용한 배포

```bash
# Docker 이미지 빌드
cd ~/egurado/backend
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

### 3-6. Nginx 리버스 프록시 설정 (선택, 추후 프록시 서비스로 대체 예정)

```bash
# Nginx 설치
sudo apt install -y nginx

# 설정 파일 생성
sudo nano /etc/nginx/sites-available/egurado-api
```

다음 내용 입력:

```nginx
server {
    listen 80;
    server_name YOUR_EC2_PUBLIC_IP;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

활성화:

```bash
sudo ln -s /etc/nginx/sites-available/egurado-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**✅ 체크리스트:**
- [ ] EC2 인스턴스 생성 완료
- [ ] SSH 접속 성공
- [ ] Docker 설치 완료
- [ ] 환경 변수 설정 완료
- [ ] Docker 컨테이너 실행 완료
- [ ] API 테스트: `curl http://YOUR_EC2_IP:8000/api/health`

---

## 📝 STEP 4: 환경 변수 업데이트 및 연결

### 4-1. Vercel 환경 변수 업데이트

1. Vercel Dashboard → 프로젝트 → Settings → Environment Variables
2. `NEXT_PUBLIC_API_URL` 값을 업데이트:
   ```
   NEXT_PUBLIC_API_URL = http://YOUR_EC2_PUBLIC_IP:8000
   ```
   또는 Nginx를 설정했다면:
   ```
   NEXT_PUBLIC_API_URL = http://YOUR_EC2_PUBLIC_IP
   ```

3. "Redeploy" 클릭하여 재배포

### 4-2. 백엔드 CORS 설정 확인

EC2에서 `.env` 파일의 `ALLOWED_ORIGINS`에 Vercel URL이 포함되어 있는지 확인:

```bash
# EC2에서
nano ~/egurado/backend/.env
```

다음과 같이 설정:

```bash
ALLOWED_ORIGINS=https://egurado.vercel.app,http://localhost:3000
```

Docker 컨테이너 재시작:

```bash
docker restart egurado-api
```

**✅ 체크리스트:**
- [ ] Vercel 환경 변수 업데이트 완료
- [ ] Vercel 재배포 완료
- [ ] 백엔드 CORS 설정 확인
- [ ] 전체 시스템 연결 테스트

---

## 📝 STEP 5: 배포 확인 및 테스트

### 5-1. 프론트엔드 확인

1. Vercel에서 제공하는 URL 접속
2. 브라우저 개발자 도구(F12) → Console 탭에서 에러 확인
3. Network 탭에서 API 호출 확인

### 5-2. 백엔드 API 확인

브라우저 또는 터미널에서:

```bash
# 헬스체크
curl http://YOUR_EC2_IP:8000/api/health

# 루트 엔드포인트
curl http://YOUR_EC2_IP:8000/
```

### 5-3. 통합 테스트

1. 프론트엔드에서 로그인 시도
2. 매장 등록 시도
3. 주요 기능 테스트

**✅ 체크리스트:**
- [ ] 프론트엔드 정상 로드
- [ ] 백엔드 API 응답 확인
- [ ] 로그인 기능 테스트
- [ ] 주요 기능 테스트

---

## 🔧 로컬 개발 환경 유지하기

배포 후에도 로컬에서 개발할 수 있도록 설정이 되어 있습니다.

### 프론트엔드 로컬 개발

```bash
cd frontend
npm install
npm run dev
```

프론트엔드는 `http://localhost:3000`에서 실행되며, `lib/config.ts`에서 자동으로 로컬 백엔드(`http://localhost:8000`)를 사용합니다.

### 백엔드 로컬 개발

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# .env 파일 생성 (backend/.env.example 참고)
# 환경 변수 설정

uvicorn app.main:app --reload
```

백엔드는 `http://localhost:8000`에서 실행됩니다.

### 환경 변수 분리

- **로컬**: `.env` 파일 사용 (Git에 커밋하지 않음)
- **프로덕션**: Vercel/AWS 환경 변수 사용

`lib/config.ts`가 자동으로 환경에 맞는 설정을 사용합니다:
- `NEXT_PUBLIC_API_URL`이 설정되어 있으면 프로덕션 URL 사용
- 없으면 기본값 `http://localhost:8000` 사용

---

## 🚨 문제 해결

### CORS 오류

**증상**: 프론트엔드에서 API 호출 시 CORS 에러

**해결**:
1. 백엔드 `.env`의 `ALLOWED_ORIGINS`에 프론트엔드 URL이 포함되어 있는지 확인
2. Docker 컨테이너 재시작: `docker restart egurado-api`

### API 연결 실패

**증상**: 프론트엔드에서 백엔드 API를 호출할 수 없음

**해결**:
1. EC2 보안 그룹에서 포트 8000이 열려있는지 확인
2. Vercel의 `NEXT_PUBLIC_API_URL`이 올바른지 확인
3. 백엔드 로그 확인: `docker logs egurado-api`

### Playwright 오류

**증상**: 순위 조회 시 브라우저 오류

**해결**:
```bash
# Docker 컨테이너 내부에서
docker exec -it egurado-api bash
playwright install --with-deps chromium
exit
docker restart egurado-api
```

---

## 📝 다음 단계: 프록시 서비스 연결

현재는 EC2의 공개 IP를 직접 사용하고 있지만, 추후 프록시 서비스를 구독하면:

1. 프록시 서비스에서 도메인 설정 (예: `api.yourdomain.com`)
2. Vercel의 `NEXT_PUBLIC_API_URL`을 프록시 도메인으로 업데이트
3. 백엔드 `ALLOWED_ORIGINS`에 새 도메인 추가

---

## 📞 지원

문제가 발생하면:
1. 로그 확인 (Vercel Dashboard, `docker logs egurado-api`)
2. 환경 변수 확인
3. 네트워크 설정 확인 (보안 그룹, 포트)

---

**축하합니다! 🎉 웹 배포가 완료되었습니다!**
