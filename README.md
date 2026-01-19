# Egurado (이거라도)

네이버 플레이스 및 구글 비즈니스 프로필을 통합 관리하는 자영업자를 위한 SaaS 플랫폼

## 프로젝트 구조

```
egurado/
├── frontend/          # Next.js 14 (App Router) + TypeScript + Tailwind CSS
├── backend/           # FastAPI + Playwright + Python
├── supabase/          # Database migrations
└── README.md
```

## 기술 스택

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn UI
- TanStack Query
- Lucide React (아이콘)

### Backend
- Python 3.11+
- FastAPI
- Playwright (네이버 자동화)
- Supabase (PostgreSQL)
- OpenAI GPT-4
- Google Business Profile API

## 로컬 개발 환경 설정

### 1. Backend 설정

```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# 패키지 설치
pip install -r requirements.txt

# Playwright 브라우저 설치
playwright install chromium

# 환경변수 설정
cp .env.example .env
# .env 파일을 열어 실제 값으로 수정

# 서버 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend 설정

```bash
cd frontend

# 패키지 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local 파일을 열어 실제 값으로 수정

# 개발 서버 실행
npm run dev
```

### 3. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL 에디터에서 `supabase/migrations/` 폴더의 스크립트 실행
3. Project URL 및 API Key를 `.env` 파일에 추가

## 구독 티어

### Free
- 매장 등록: **1개**
- 키워드 등록: **1개**
- 기본 기능 이용 가능

### Basic
- 매장 등록: **3개**
- 키워드 등록: **10개**
- 기본 + 고급 분석 기능

### Pro
- 매장 등록: **10개**
- 키워드 등록: **50개**
- 모든 프리미엄 기능 이용 가능

### God (커스터마이징)
- 매장 등록: **무제한 (9999개)**
- 키워드 등록: **무제한 (9999개)**
- 엔터프라이즈 맞춤 설정
- 모든 기능 + 우선 지원

## 주요 기능

### 네이버 플레이스
- ✅ 방문자 리뷰 현황 및 AI 분석
- ✅ 블로그 리뷰 현황
- ✅ 소식 관리
- ✅ 플레이스 순위 확인
- ✅ AI 답글 생성
- ✅ 경쟁매장 분석 (LLM 기반)
- ✅ 플레이스 진단 (Pro)
- ⚙️ 키워드 검색량 조회

### 구글 비즈니스 프로필
- ✅ 리뷰 분석
- ⚙️ GBP Audit (Pro)
- ⚙️ Citation Boost (Pro)

## 배포

### Backend
- AWS EC2 (Seoul Region)
- Docker + Nginx

### Frontend
- Vercel (권장)
- 또는 AWS S3 + CloudFront

## 라이센스

Proprietary - All rights reserved

## 문의

개발 관련 문의: [이메일 주소]


