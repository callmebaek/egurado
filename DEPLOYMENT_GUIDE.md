# 🚀 Egurado 클라우드 배포 가이드

이 문서는 Egurado 서비스를 클라우드 환경에 배포하는 방법을 안내합니다.

## 📋 목차

1. [사전 준비](#사전-준비)
2. [프론트엔드 배포 (Vercel 권장)](#프론트엔드-배포)
3. [백엔드 배포 (AWS/GCP/Azure/Heroku)](#백엔드-배포)
4. [데이터베이스 (Supabase)](#데이터베이스)
5. [환경 변수 설정](#환경-변수-설정)
6. [배포 후 확인사항](#배포-후-확인사항)
7. [문제 해결](#문제-해결)

---

## 사전 준비

### 1. 필수 계정 생성

- [ ] Vercel 계정 (프론트엔드 배포)
- [ ] AWS/GCP/Azure 또는 Heroku 계정 (백엔드 배포)
- [ ] Supabase 계정 (이미 생성됨)
- [ ] OpenAI 계정 (API 키 발급)

### 2. 도메인 준비 (선택)

- 프론트엔드: `yourdomain.com`
- 백엔드 API: `api.yourdomain.com`

---

## 프론트엔드 배포

### Vercel 배포 (권장)

Vercel은 Next.js에 최적화되어 있어 가장 간단합니다.

#### 1단계: GitHub 연동

```bash
# 프로젝트를 GitHub에 푸시
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### 2단계: Vercel에서 프로젝트 Import

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. "New Project" 클릭
3. GitHub 저장소 선택
4. Root Directory: `frontend` 설정
5. Framework Preset: `Next.js` (자동 감지됨)

#### 3단계: 환경 변수 설정

Vercel Dashboard → Project Settings → Environment Variables에 다음 추가:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://api.yourdomain.com  # 백엔드 URL
```

#### 4단계: 배포

"Deploy" 버튼 클릭하면 자동으로 배포됩니다.

#### 5단계: 커스텀 도메인 연결 (선택)

1. Vercel Dashboard → Project Settings → Domains
2. 도메인 추가 및 DNS 설정

### 기타 플랫폼 (Netlify, AWS Amplify)

`frontend` 디렉토리를 빌드 디렉토리로 설정하고 동일한 환경 변수를 설정하세요.

```bash
# 빌드 명령
npm run build

# 출력 디렉토리
.next
```

---

## 백엔드 배포

### 옵션 1: Heroku (가장 간단)

#### 1단계: Heroku CLI 설치

```bash
# Windows
choco install heroku-cli

# Mac
brew tap heroku/brew && brew install heroku
```

#### 2단계: 프로젝트 준비

```bash
cd backend

# Procfile 생성
echo "web: uvicorn app.main:app --host 0.0.0.0 --port $PORT" > Procfile

# runtime.txt 생성 (Python 버전 명시)
echo "python-3.11.0" > runtime.txt
```

#### 3단계: Heroku 앱 생성 및 배포

```bash
heroku login
heroku create your-app-name

# 환경 변수 설정
heroku config:set SUPABASE_URL=https://your-project.supabase.co
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
heroku config:set OPENAI_API_KEY=your-openai-key
heroku config:set ALLOWED_ORIGINS=https://yourdomain.com

# 배포
git subtree push --prefix backend heroku main
```

#### 4단계: Playwright 브라우저 설치

Heroku에서는 buildpack을 추가해야 합니다:

```bash
heroku buildpacks:add --index 1 https://github.com/mxschmitt/heroku-playwright-buildpack.git
heroku buildpacks:add --index 2 heroku/python
```

### 옵션 2: AWS EC2

#### 1단계: EC2 인스턴스 생성

- Ubuntu 22.04 LTS 권장
- t3.small 이상 (메모리 2GB+)
- 보안 그룹: 80, 443, 8000 포트 개방

#### 2단계: 서버 설정

```bash
# SSH 접속
ssh -i your-key.pem ubuntu@your-ec2-ip

# 필요한 패키지 설치
sudo apt update
sudo apt install -y python3.11 python3-pip nginx

# 프로젝트 클론
git clone https://github.com/your-username/egurado.git
cd egurado/backend

# 가상환경 생성 및 의존성 설치
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Playwright 브라우저 설치
playwright install --with-deps chromium

# 환경 변수 설정
nano .env
# (위의 ENV_SETUP.md 참고)
```

#### 3단계: Systemd 서비스 생성

```bash
sudo nano /etc/systemd/system/egurado-api.service
```

다음 내용 추가:

```ini
[Unit]
Description=Egurado FastAPI Application
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/egurado/backend
Environment="PATH=/home/ubuntu/egurado/backend/venv/bin"
ExecStart=/home/ubuntu/egurado/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

서비스 시작:

```bash
sudo systemctl enable egurado-api
sudo systemctl start egurado-api
sudo systemctl status egurado-api
```

#### 4단계: Nginx 리버스 프록시 설정

```bash
sudo nano /etc/nginx/sites-available/egurado-api
```

다음 내용 추가:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

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

#### 5단계: SSL 인증서 설치 (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### 옵션 3: Docker (모든 클라우드 플랫폼)

#### Dockerfile 생성

`backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Playwright 브라우저 설치
RUN playwright install --with-deps chromium

# 애플리케이션 코드 복사
COPY . .

# 포트 노출
EXPOSE 8000

# 서버 시작
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 빌드 및 실행

```bash
cd backend
docker build -t egurado-api .
docker run -d -p 8000:8000 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=your-key \
  -e OPENAI_API_KEY=your-key \
  -e ALLOWED_ORIGINS=https://yourdomain.com \
  egurado-api
```

---

## 데이터베이스

Supabase는 이미 클라우드에서 호스팅되므로 별도 배포가 필요 없습니다.

### 마이그레이션 실행

1. Supabase Dashboard 접속
2. SQL Editor 열기
3. `backend/db/migrations/` 폴더의 SQL 파일들을 순서대로 실행:
   - `create_stores_table.sql`
   - `create_keywords_table.sql`
   - `create_rank_history_table.sql`
   - `create_review_tables.sql`

---

## 환경 변수 설정

### 프론트엔드 (Vercel)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### 백엔드 (Heroku/AWS/Docker)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## 배포 후 확인사항

### 1. 헬스체크

```bash
# 백엔드 API 확인
curl https://api.yourdomain.com/

# 응답 예시:
# {"status":"healthy","service":"Egurado API","version":"1.0.0"}
```

### 2. 프론트엔드 접속

브라우저에서 `https://yourdomain.com` 접속하여 정상 작동 확인

### 3. 데이터베이스 연결 확인

```bash
curl https://api.yourdomain.com/api/health

# 응답 예시:
# {"status":"ok","message":"Egurado API is running","database_connected":true}
```

### 4. API 테스트

로그인 후 매장 조회 등 주요 기능 테스트

---

## 문제 해결

### CORS 오류

**증상**: 프론트엔드에서 API 호출 시 CORS 에러

**해결**:
```bash
# 백엔드 환경 변수에 프론트엔드 도메인 추가
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Playwright 브라우저 오류

**증상**: 순위 조회 시 `Executable doesn't exist` 오류

**해결**:
```bash
# 서버에서 Playwright 브라우저 재설치
playwright install --with-deps chromium
```

### 환경 변수 미설정 오류

**증상**: `ValueError: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되지 않았습니다`

**해결**: 모든 필수 환경 변수가 설정되었는지 확인

```bash
# Heroku
heroku config

# AWS/서버
cat .env
```

### OpenAI API 요금 초과

**증상**: 리뷰 분석 시 `insufficient_quota` 오류

**해결**:
- OpenAI Dashboard에서 결제 방법 추가
- 사용량 제한 설정
- 대안: Claude API 또는 다른 LLM 사용 고려

### 메모리 부족

**증상**: 서버가 랜덤하게 재시작되거나 느림

**해결**:
- 인스턴스 크기 업그레이드 (최소 2GB RAM 권장)
- Playwright 브라우저를 헤드리스 모드로 실행 (이미 설정됨)

---

## 모니터링 및 로깅

### Heroku

```bash
heroku logs --tail
```

### AWS EC2

```bash
# 애플리케이션 로그
sudo journalctl -u egurado-api -f

# Nginx 로그
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Docker

```bash
docker logs -f container-name
```

---

## 비용 예상

### 프론트엔드 (Vercel)

- Hobby: 무료 (개인 프로젝트)
- Pro: $20/월 (상용 서비스)

### 백엔드

- **Heroku**: $7-25/월 (Eco/Basic Dyno)
- **AWS EC2**: $10-30/월 (t3.small ~ t3.medium)
- **GCP Cloud Run**: 사용량 기반 (소규모: $5-20/월)

### 데이터베이스 (Supabase)

- Free: 무료 (2개 프로젝트, 500MB)
- Pro: $25/월 (무제한 프로젝트, 8GB)

### OpenAI API

- gpt-4o-mini: $0.15 / 1M input tokens
- 예상: 월 1,000건 리뷰 분석 시 약 $2-5

**총 예상 비용**: $20-80/월 (규모에 따라 다름)

---

## 추가 리소스

- [Vercel 배포 문서](https://vercel.com/docs)
- [Heroku Python 가이드](https://devcenter.heroku.com/articles/getting-started-with-python)
- [AWS EC2 시작하기](https://docs.aws.amazon.com/ec2/index.html)
- [Supabase 문서](https://supabase.com/docs)
- [FastAPI 배포 가이드](https://fastapi.tiangolo.com/deployment/)

---

## 지원

문제가 발생하면 다음을 확인하세요:

1. 모든 환경 변수가 올바르게 설정되었는지
2. 데이터베이스 마이그레이션이 완료되었는지
3. CORS 설정이 올바른지
4. 로그에서 구체적인 에러 메시지 확인

필요시 개발 히스토리(`DEVELOPMENT_HISTORY.txt`) 참고
