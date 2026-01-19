# ⚡ 빠른 배포 체크리스트

배포 전 빠르게 확인할 수 있는 체크리스트입니다.

## 📋 사전 준비

- [ ] GitHub 저장소 생성 및 코드 푸시 완료
- [ ] Vercel 계정 생성 완료
- [ ] AWS 계정 생성 및 EC2 인스턴스 생성 완료
- [ ] Supabase URL 및 키 준비
- [ ] OpenAI API 키 준비

## 🎯 STEP 1: GitHub

```bash
cd C:\egurado
git add .
git commit -m "Ready for deployment"
git push origin main
```

- [ ] 코드 푸시 완료

## 🎯 STEP 2: Vercel (프론트엔드)

1. Vercel Dashboard → New Project
2. GitHub 저장소 선택
3. **Root Directory: `frontend`** 설정
4. 환경 변수 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` (임시: `http://localhost:8000`)
5. Deploy 클릭

- [ ] Vercel 배포 완료
- [ ] 배포 URL 확인 (예: `https://egurado.vercel.app`)

## 🎯 STEP 3: AWS EC2 (백엔드)

### 3-1. EC2 생성
- [ ] Ubuntu 22.04 LTS 선택
- [ ] t3.small 이상 선택
- [ ] 보안 그룹: SSH(22), HTTP(80), HTTPS(443), Custom TCP(8000) 열기
- [ ] Key Pair 다운로드

### 3-2. 서버 설정

```bash
# SSH 접속
ssh -i "key.pem" ubuntu@EC2_IP

# 시스템 업데이트 및 Docker 설치
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo usermod -aG docker ubuntu
exit

# 다시 접속
ssh -i "key.pem" ubuntu@EC2_IP

# 프로젝트 클론
cd ~
git clone https://github.com/YOUR_USERNAME/egurado.git
cd egurado/backend

# 환경 변수 설정
nano .env
# (env.example 참고하여 실제 값 입력)

# Docker 빌드 및 실행
docker build -t egurado-api .
docker run -d --name egurado-api --restart unless-stopped -p 8000:8000 --env-file .env egurado-api

# 로그 확인
docker logs -f egurado-api
```

- [ ] EC2 접속 성공
- [ ] Docker 설치 완료
- [ ] 환경 변수 설정 완료
- [ ] Docker 컨테이너 실행 완료
- [ ] API 테스트: `curl http://EC2_IP:8000/api/health`

## 🎯 STEP 4: 연결

### 4-1. Vercel 환경 변수 업데이트

Vercel Dashboard → Settings → Environment Variables:
- `NEXT_PUBLIC_API_URL` = `http://EC2_IP:8000`
- Redeploy 클릭

### 4-2. 백엔드 CORS 업데이트

EC2에서:
```bash
nano ~/egurado/backend/.env
# ALLOWED_ORIGINS에 Vercel URL 추가
docker restart egurado-api
```

- [ ] Vercel 환경 변수 업데이트
- [ ] Vercel 재배포 완료
- [ ] 백엔드 CORS 설정 완료

## 🎯 STEP 5: 테스트

- [ ] 프론트엔드 접속: `https://egurado.vercel.app`
- [ ] 백엔드 헬스체크: `http://EC2_IP:8000/api/health`
- [ ] 로그인 테스트
- [ ] 주요 기능 테스트

## ✅ 완료!

배포가 완료되었습니다! 🎉

---

## 🔧 로컬 개발

배포 후에도 로컬 개발 가능:

**프론트엔드:**
```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

**백엔드:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
# .env 파일 생성 (env.example 참고)
uvicorn app.main:app --reload
# http://localhost:8000
```

---

자세한 내용은 `DEPLOYMENT_STEP_BY_STEP.md` 참고
