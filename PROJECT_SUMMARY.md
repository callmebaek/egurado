# Egurado 프로젝트 완료 요약

## 🎉 프로젝트 개요

**Egurado (이거라도)**는 네이버 플레이스 및 구글 비즈니스 프로필을 통합 관리하는 자영업자를 위한 SaaS 플랫폼입니다.

---

## ✅ 완료된 기능

### Phase 1: 인프라 구축 (완료)

#### 1.1 프로젝트 초기화
- ✅ Next.js 14 (App Router) + TypeScript + Tailwind CSS
- ✅ FastAPI + Python 3.11+ 백엔드
- ✅ 모노레포 구조 (`frontend/`, `backend/`, `supabase/`)
- ✅ 기본 환경변수 설정 (.env.example)

#### 1.2 Supabase 데이터베이스 설계
- ✅ `profiles` 테이블: 사용자 프로필
- ✅ `stores` 테이블: 매장 정보 (네이버/구글)
- ✅ `reviews` 테이블: 수집된 리뷰
- ✅ `keywords` 테이블: 순위 추적 키워드
- ✅ `rank_history` 테이블: 순위 변동 기록
- ✅ RLS(Row Level Security) 정책 설정
- ✅ 인덱스 및 트리거 최적화

#### 1.3 프론트엔드 레이아웃
- ✅ Patreon 스타일 대시보드 UI
- ✅ 왼쪽 사이드바 네비게이션 (접이식 메뉴 지원)
- ✅ 상단 메뉴 (로고, 알림, 프로필)
- ✅ 반응형 디자인 (Tailwind CSS)
- ✅ Lucide React 아이콘 통합

---

### Phase 2: 네이버 자동화 엔진 (완료)

#### 2.1 Playwright 스텔스 브라우저
- ✅ 네이버 봇 탐지 우회 설정
- ✅ 한국 환경 (ko-KR, Asia/Seoul)
- ✅ User-Agent 위장
- ✅ WebDriver 속성 제거 스크립트

#### 2.2 네이버 세션 주입
- ✅ 쿠키 암호화 저장 (Fernet)
- ✅ Supabase에 안전하게 저장
- ✅ 브라우저 컨텍스트에 자동 주입
- ✅ 로그인 상태 자동 확인

#### 2.3 네이버 리뷰 크롤러
- ✅ 네트워크 인터셉션 방식 (HTML 파싱 X)
- ✅ JSON 응답 가로채기 및 파싱
- ✅ 리뷰 DB 자동 저장 (Upsert)
- ✅ 중복 리뷰 필터링

**API 엔드포인트:**
- `POST /api/v1/naver/connect` - 네이버 플레이스 연결
- `POST /api/v1/naver/stores/{store_id}/sync-reviews` - 리뷰 수집
- `GET /api/v1/naver/stores/{store_id}/status` - 연결 상태 확인

---

### Phase 3: AI 기능 통합 (완료)

#### 3.1 OpenAI 연동
- ✅ GPT-4o-mini 모델 사용
- ✅ 리뷰 감정 분석 (positive/neutral/negative)
- ✅ AI 답글 자동 생성
  - 감정에 따른 맞춤형 답글
  - 진정성 있는 응답
  - 2-3문장, 이모지 포함
- ✅ 일괄 감정 분석 기능

#### 3.2 키워드 순위 추적
- ✅ 모바일 네이버 검색 순위 확인
- ✅ 키워드별 순위 히스토리 기록
- ✅ 순위 변동 추적

#### 3.3 자동 스케줄러
- ✅ APScheduler 통합
- ✅ 매일 오전 6시: 전체 매장 리뷰 자동 수집
- ✅ 매일 오전 7시: 키워드 순위 자동 확인
- ✅ 백그라운드 작업 관리

**API 엔드포인트:**
- `GET /api/v1/reviews/stores/{store_id}/reviews` - 리뷰 목록 조회
- `POST /api/v1/reviews/reviews/{review_id}/generate-reply` - AI 답글 생성
- `POST /api/v1/reviews/stores/{store_id}/analyze-reviews` - 일괄 감정 분석
- `POST /api/v1/keywords/check-rank` - 실시간 순위 확인
- `GET /api/v1/keywords/stores/{store_id}/keywords` - 키워드 목록
- `GET /api/v1/keywords/keywords/{keyword_id}/history` - 순위 히스토리

---

### Phase 4: 구글 비즈니스 프로필 연동 (완료)

#### 4.1 Google OAuth 2.0
- ✅ OAuth 인증 플로우 구현
- ✅ Access Token & Refresh Token 관리
- ✅ 자동 토큰 갱신
- ✅ 안전한 토큰 저장 (Supabase)

#### 4.2 GBP API 연동
- ✅ Google Business Profile API 통합
- ✅ 리뷰 자동 동기화
- ✅ 리뷰 답글 등록 기능

**API 엔드포인트:**
- `GET /api/v1/google/oauth` - 구글 로그인 시작
- `GET /api/v1/google/callback` - OAuth 콜백
- `POST /api/v1/google/connect` - 구글 매장 연결
- `POST /api/v1/google/stores/{store_id}/sync-reviews` - 리뷰 동기화

---

## 📂 프로젝트 구조

```
egurado/
├── frontend/               # Next.js 14 프론트엔드
│   ├── app/
│   │   ├── dashboard/      # 대시보드 페이지
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── layout/         # Sidebar, TopMenu
│   │   └── ui/             # UI 컴포넌트
│   ├── lib/
│   │   ├── utils.ts
│   │   └── supabase.ts
│   └── package.json
│
├── backend/                # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py         # FastAPI 앱 (라우터, 스케줄러)
│   │   ├── core/
│   │   │   ├── browser.py      # Playwright 브라우저 매니저
│   │   │   ├── database.py     # Supabase 클라이언트
│   │   │   └── scheduler.py    # 백그라운드 스케줄러
│   │   ├── services/
│   │   │   ├── naver_auth.py   # 네이버 세션 관리
│   │   │   ├── naver_crawler.py # 네이버 크롤러
│   │   │   ├── naver_rank.py   # 순위 추적
│   │   │   ├── ai_agent.py     # OpenAI 통합
│   │   │   └── google_api.py   # 구글 API
│   │   ├── routers/
│   │   │   ├── naver.py        # 네이버 API
│   │   │   ├── google.py       # 구글 API
│   │   │   ├── reviews.py      # 리뷰 API
│   │   │   └── keywords.py     # 키워드 API
│   │   └── models/
│   │       └── schemas.py      # Pydantic 모델
│   ├── requirements.txt
│   └── .env.example
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── README.md
│
├── README.md               # 프로젝트 소개
├── DEVELOPMENT.md          # 개발 가이드
├── DEPLOYMENT.md           # 배포 가이드
└── .gitignore
```

---

## 🚀 시작 방법

### 1. 환경 설정

```bash
# 프로젝트 클론
git clone https://github.com/your-repo/egurado.git
cd egurado
```

### 2. Backend 실행

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium

# .env 파일 설정
cp .env.example .env
# 환경변수 입력

# 서버 실행
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**API 문서:** http://localhost:8000/docs

### 3. Frontend 실행

```bash
cd frontend
npm install

# .env.local 파일 설정
cp .env.example .env.local
# 환경변수 입력

# 개발 서버 실행
npm run dev
```

**브라우저:** http://localhost:3000

---

## 🔑 필수 환경변수

### Backend (.env)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
ENCRYPTION_KEY=your-fernet-key
OPENAI_API_KEY=sk-your-openai-key
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/google/callback
HEADLESS=false
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 📊 기술 스택

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn UI (Custom)
- **Icons:** Lucide React
- **Database Client:** Supabase JS

### Backend
- **Framework:** FastAPI
- **Language:** Python 3.11+
- **Automation:** Playwright
- **Database:** Supabase (PostgreSQL)
- **AI:** OpenAI GPT-4o-mini
- **Scheduler:** APScheduler
- **Security:** Cryptography (Fernet)

### Infrastructure
- **Database:** Supabase (PostgreSQL with RLS)
- **Backend Hosting:** AWS EC2 (Seoul)
- **Frontend Hosting:** Vercel
- **SSL:** Let's Encrypt

---

## 📖 문서

- **[README.md](./README.md)** - 프로젝트 개요 및 소개
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - 로컬 개발 가이드
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - 프로덕션 배포 가이드
- **[supabase/README.md](./supabase/README.md)** - 데이터베이스 스키마 설명

---

## 🎯 주요 기능 요약

| 기능 | 네이버 | 구글 | 상태 |
|------|--------|------|------|
| 매장 연결 | ✅ | ✅ | 완료 |
| 리뷰 수집 | ✅ | ✅ | 완료 |
| AI 감정 분석 | ✅ | ✅ | 완료 |
| AI 답글 생성 | ✅ | ✅ | 완료 |
| 순위 추적 | ✅ | ⏳ | 네이버만 |
| 자동 스케줄러 | ✅ | ✅ | 완료 |

---

## 🔐 보안 고려사항

- ✅ Supabase RLS로 사용자별 데이터 격리
- ✅ 네이버 쿠키 암호화 저장 (Fernet)
- ✅ 구글 OAuth Refresh Token 안전 보관
- ✅ 환경변수로 민감 정보 관리
- ✅ CORS 설정으로 허용된 도메인만 접근
- ✅ API Rate Limiting 준비

---

## 📈 성능 최적화

- ✅ 네트워크 인터셉션으로 빠른 데이터 수집
- ✅ DB 인덱스 최적화
- ✅ Playwright 브라우저 재사용
- ✅ 비동기 처리 (asyncio)
- ✅ 백그라운드 스케줄러로 부하 분산

---

## 🛠️ 다음 단계 (추가 개발 가능)

### 단기 (1-2주)
- [ ] 실제 네이버 답글 등록 기능 (Playwright 자동화)
- [ ] 리뷰 통계 대시보드 차트 추가
- [ ] 이메일 알림 기능 (부정 리뷰 발생 시)
- [ ] 사용자 인증 (Supabase Auth)

### 중기 (1개월)
- [ ] 블로그 리뷰 현황 크롤링
- [ ] 소식 자동 등록 기능
- [ ] 경쟁 매장 분석 리포트
- [ ] 플레이스 지수 관리 (Pro 기능)

### 장기 (3개월+)
- [ ] 카카오톡 비즈니스 연동
- [ ] 네이버 광고 현황 모니터링
- [ ] 모바일 앱 개발
- [ ] 구독 결제 시스템 (Stripe/Iamport)

---

## 🎓 학습 자료

- [FastAPI 튜토리얼](https://fastapi.tiangolo.com/tutorial/)
- [Next.js 공식 문서](https://nextjs.org/docs)
- [Playwright Python](https://playwright.dev/python/docs/intro)
- [Supabase 가이드](https://supabase.com/docs/guides)

---

## 📞 문의 및 지원

- **GitHub Issues:** [프로젝트 Issues](https://github.com/your-repo/egurado/issues)
- **이메일:** [support@egurado.com](mailto:support@egurado.com)
- **문서:** 각 폴더의 README.md 참조

---

## 🙏 감사의 말

이 프로젝트는 자영업자들의 디지털 마케팅 부담을 줄이고, 
최소한의 노력으로 온라인 플랫폼을 관리할 수 있도록 돕기 위해 만들어졌습니다.

**"이거라도 (Egurado)"** - 작은 시작이 큰 변화를 만듭니다! 🚀


