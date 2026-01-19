# Egurado 개발 가이드

## 🛠️ 로컬 개발 환경 설정

### 사전 요구사항

- Node.js 18+ 및 npm
- Python 3.11+
- Git

### 1. 프로젝트 클론

```bash
git clone https://github.com/your-repo/egurado.git
cd egurado
```

---

## Backend 설정

### 1. 가상환경 생성 및 패키지 설치

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

# 패키지 설치
pip install -r requirements.txt

# Playwright 브라우저 설치
playwright install chromium
```

### 2. 환경변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# .env 파일 편집
# 필수 환경변수 입력
```

**암호화 키 생성:**
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 3. Backend 실행

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**API 문서 확인:** http://localhost:8000/docs

---

## Frontend 설정

### 1. 패키지 설치

```bash
cd frontend
npm install
```

### 2. 환경변수 설정

```bash
# .env.local 파일 생성
cp .env.example .env.local

# .env.local 파일 편집
```

### 3. Frontend 실행

```bash
npm run dev
```

**브라우저 열기:** http://localhost:3000

---

## 📁 프로젝트 구조 상세

```
egurado/
├── frontend/                  # Next.js 프론트엔드
│   ├── app/                   # App Router
│   │   ├── dashboard/         # 대시보드 페이지
│   │   ├── layout.tsx         # 루트 레이아웃
│   │   └── page.tsx           # 홈 페이지
│   ├── components/            # React 컴포넌트
│   │   ├── layout/            # 레이아웃 컴포넌트
│   │   │   ├── Sidebar.tsx    # 사이드바
│   │   │   └── TopMenu.tsx    # 상단 메뉴
│   │   └── ui/                # UI 컴포넌트
│   ├── lib/                   # 유틸리티 함수
│   │   ├── utils.ts           # 공통 함수
│   │   └── supabase.ts        # Supabase 클라이언트
│   └── package.json
│
├── backend/                   # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py            # FastAPI 앱
│   │   ├── core/              # 핵심 모듈
│   │   │   ├── browser.py     # Playwright 브라우저 매니저
│   │   │   ├── database.py    # Supabase 연결
│   │   │   └── scheduler.py   # 백그라운드 스케줄러
│   │   ├── services/          # 비즈니스 로직
│   │   │   ├── naver_auth.py  # 네이버 인증
│   │   │   ├── naver_crawler.py # 네이버 크롤러
│   │   │   ├── naver_rank.py  # 순위 추적
│   │   │   ├── ai_agent.py    # AI 서비스
│   │   │   └── google_api.py  # 구글 API
│   │   ├── routers/           # API 라우터
│   │   │   ├── naver.py       # 네이버 엔드포인트
│   │   │   ├── google.py      # 구글 엔드포인트
│   │   │   ├── reviews.py     # 리뷰 엔드포인트
│   │   │   └── keywords.py    # 키워드 엔드포인트
│   │   └── models/            # 데이터 모델
│   │       └── schemas.py     # Pydantic 스키마
│   ├── requirements.txt
│   └── .env.example
│
└── supabase/                  # 데이터베이스
    ├── migrations/            # SQL 마이그레이션
    │   └── 001_initial_schema.sql
    └── README.md
```

---

## 🔧 주요 개발 작업

### 새 API 엔드포인트 추가

1. **라우터 파일 생성** (`backend/app/routers/`)
2. **Pydantic 스키마 정의** (`backend/app/models/schemas.py`)
3. **서비스 로직 구현** (`backend/app/services/`)
4. **main.py에 라우터 등록**

**예시:**
```python
# backend/app/routers/new_feature.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/example")
async def example_endpoint():
    return {"message": "Hello"}

# backend/app/main.py
from app.routers import new_feature
app.include_router(new_feature.router, prefix="/api/v1/feature", tags=["Feature"])
```

### 새 프론트엔드 페이지 추가

1. **페이지 파일 생성** (`frontend/app/dashboard/`)
2. **컴포넌트 작성** (`frontend/components/`)
3. **Sidebar에 메뉴 추가** (`frontend/components/layout/Sidebar.tsx`)

---

## 🧪 테스트

### Backend 테스트

```bash
cd backend
source venv/bin/activate

# FastAPI 실행 후 브라우저에서 테스트
# http://localhost:8000/docs
```

### Playwright 크롤러 테스트

```bash
cd backend
source venv/bin/activate
python -m pytest tests/
```

---

## 🐛 디버깅

### Backend 디버깅

```bash
# 환경변수 확인
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print(os.getenv('SUPABASE_URL'))"

# Supabase 연결 테스트
python -c "from app.core.database import get_supabase_client; client = get_supabase_client(); print(client)"

# Playwright 브라우저 테스트
playwright open https://naver.com
```

### 로그 확인

```bash
# Backend 로그 (콘솔 출력)
# uvicorn 실행 중인 터미널 확인

# Playwright 스크린샷 저장 (디버깅)
# browser.py에서 await page.screenshot(path="debug.png")
```

---

## 📦 패키지 추가

### Backend

```bash
cd backend
source venv/bin/activate
pip install new-package
pip freeze > requirements.txt
```

### Frontend

```bash
cd frontend
npm install new-package
```

---

## 🔄 Git 워크플로우

```bash
# 새 기능 브랜치 생성
git checkout -b feature/new-feature

# 작업 후 커밋
git add .
git commit -m "feat: Add new feature"

# 원격 저장소에 푸시
git push origin feature/new-feature

# Pull Request 생성
```

**커밋 컨벤션:**
- `feat:` 새 기능
- `fix:` 버그 수정
- `docs:` 문서 변경
- `style:` 코드 포맷팅
- `refactor:` 리팩토링
- `test:` 테스트 추가

---

## 💡 개발 팁

### 1. Playwright 크롤링 디버깅

```python
# headless=False로 브라우저 보기
browser = await playwright.chromium.launch(headless=False)

# 느리게 실행 (밀리초)
browser = await playwright.chromium.launch(slow_mo=500)

# 스크린샷 저장
await page.screenshot(path="debug.png")
```

### 2. API 빠른 테스트

```bash
# curl로 API 테스트
curl http://localhost:8000/api/health

# httpie 사용 (더 읽기 쉬움)
pip install httpie
http GET http://localhost:8000/api/health
```

### 3. 환경변수 로드 확인

```python
from dotenv import load_dotenv
import os

load_dotenv()
print("SUPABASE_URL:", os.getenv("SUPABASE_URL"))
```

---

## 🤝 기여 가이드

1. Fork 프로젝트
2. 새 기능 브랜치 생성
3. 변경 사항 커밋
4. 브랜치에 푸시
5. Pull Request 생성

---

## 📚 참고 자료

- [FastAPI 문서](https://fastapi.tiangolo.com/)
- [Next.js 문서](https://nextjs.org/docs)
- [Playwright 문서](https://playwright.dev/python/)
- [Supabase 문서](https://supabase.com/docs)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)


