# Egurado 배포 가이드

## 📋 배포 전 체크리스트

### 1. 환경변수 설정

#### Backend (.env)
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# 암호화 키 (Python에서 생성)
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=your-generated-fernet-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/v1/google/callback

# 서버 설정
HEADLESS=true
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
FRONTEND_URL=https://yourdomain.com
ENVIRONMENT=production
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## 🚀 한국 서버 배포 (AWS Seoul)

### Backend 배포 (AWS EC2)

#### 1. EC2 인스턴스 생성
- **리전**: ap-northeast-2 (Seoul)
- **AMI**: Ubuntu 22.04 LTS
- **인스턴스 타입**: t3.medium 이상 (Playwright 브라우저 실행 고려)
- **스토리지**: 30GB 이상
- **보안 그룹**: 
  - SSH (22) - 본인 IP만
  - HTTP (80)
  - HTTPS (443)
  - Custom TCP (8000) - 백엔드 API

#### 2. 서버 초기 설정

```bash
# SSH 접속
ssh -i your-key.pem ubuntu@your-ec2-ip

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Python 3.11 설치
sudo apt install python3.11 python3.11-venv python3-pip -y

# Playwright 브라우저 의존성 설치
sudo apt install -y \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm1

# Git 설치
sudo apt install git -y

# Nginx 설치 (리버스 프록시)
sudo apt install nginx -y
```

#### 3. 프로젝트 클론 및 설정

```bash
# 프로젝트 클론
cd /home/ubuntu
git clone https://github.com/your-repo/egurado.git
cd egurado/backend

# 가상환경 생성
python3.11 -m venv venv
source venv/bin/activate

# 패키지 설치
pip install -r requirements.txt

# Playwright 브라우저 설치
playwright install chromium

# 환경변수 설정
nano .env
# (위의 Backend 환경변수 입력)
```

#### 4. Systemd 서비스 설정

```bash
sudo nano /etc/systemd/system/egurado-backend.service
```

```ini
[Unit]
Description=Egurado Backend API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/egurado/backend
Environment="PATH=/home/ubuntu/egurado/backend/venv/bin"
ExecStart=/home/ubuntu/egurado/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# 서비스 활성화 및 시작
sudo systemctl daemon-reload
sudo systemctl enable egurado-backend
sudo systemctl start egurado-backend
sudo systemctl status egurado-backend
```

#### 5. Nginx 리버스 프록시 설정

```bash
sudo nano /etc/nginx/sites-available/egurado-backend
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 타임아웃 설정 (Playwright 크롤링 고려)
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

```bash
# 심볼릭 링크 생성 및 Nginx 재시작
sudo ln -s /etc/nginx/sites-available/egurado-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. SSL 인증서 설치 (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.yourdomain.com
```

---

### Frontend 배포 (Vercel)

#### 1. Vercel CLI 설치 및 로그인

```bash
npm install -g vercel
vercel login
```

#### 2. 프로젝트 배포

```bash
cd frontend
vercel --prod
```

#### 3. 환경변수 설정 (Vercel Dashboard)

Vercel 대시보드에서 Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`

#### 4. 자동 배포 설정

GitHub 연동 시 `main` 브랜치에 푸시하면 자동 배포됩니다.

---

## 🔒 보안 체크리스트

- [ ] Supabase RLS 정책 활성화 확인
- [ ] `service_role` 키는 절대 프론트엔드에 노출 금지
- [ ] 모든 환경변수 암호화 저장
- [ ] EC2 보안 그룹에서 불필요한 포트 차단
- [ ] Nginx rate limiting 설정
- [ ] SSL 인증서 자동 갱신 설정 확인
- [ ] 백엔드 CORS 설정에 프로덕션 도메인만 허용

---

## 📊 모니터링

### Backend 로그 확인

```bash
# Systemd 로그
sudo journalctl -u egurado-backend -f

# Nginx 로그
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 서비스 상태 확인

```bash
# Backend 상태
sudo systemctl status egurado-backend

# Nginx 상태
sudo systemctl status nginx

# 디스크 사용량
df -h

# 메모리 사용량
free -h
```

---

## 🔄 업데이트 배포

### Backend 업데이트

```bash
cd /home/ubuntu/egurado
git pull origin main
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart egurado-backend
```

### Frontend 업데이트

GitHub에 푸시하면 Vercel이 자동으로 배포합니다.

---

## 🆘 문제 해결

### Playwright 브라우저 실행 오류

```bash
# 의존성 재설치
cd /home/ubuntu/egurado/backend
source venv/bin/activate
playwright install-deps chromium
playwright install chromium
```

### 메모리 부족 오류

```bash
# 스왑 메모리 추가
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 네이버 크롤링 차단

- `HEADLESS=true`로 설정
- User-Agent 최신 버전으로 업데이트
- 요청 간 대기 시간 증가

---

## 📞 지원

문제 발생 시:
1. 로그 확인 (`journalctl -u egurado-backend`)
2. GitHub Issues 등록
3. 긴급: [이메일 주소]

---

**배포 완료 후 API 문서 확인:**
- Backend API: https://api.yourdomain.com/docs
- Health Check: https://api.yourdomain.com/api/health


