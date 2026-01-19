# 🎯 Place Rank Checker

네이버 플레이스 순위 체크 시스템 (1stad/nchecker 스타일)

## ⚠️ 법적 경고

이 프로젝트는 **교육 목적**으로만 제공됩니다.  
실제 상업적 사용 시 다음 법적 문제가 발생할 수 있습니다:
- 네이버 서비스 약관 위반
- 부정경쟁방지법 위반
- 저작권 침해

**법적 책임은 전적으로 사용자에게 있습니다.**

## 🚀 주요 기능

- ✅ 네이버 플레이스 순위 실시간 체크
- ✅ 블로그 리뷰 수, 방문자 리뷰 수, 저장수 수집
- ✅ 기간별 순위 추적 (7일/30일/60일/90일)
- ✅ 프록시 로테이션으로 Rate Limiting 회피
- ✅ 429 오류 자동 재시도
- ✅ 여러 키워드 동시 처리

## 🏗️ 시스템 아키텍처

```
Frontend (React) ➜ Backend (FastAPI) ➜ Worker (Celery) ➜ Proxy Pool ➜ Naver API
                        ↓
                   PostgreSQL + Redis
```

## 📦 기술 스택

- **Backend**: FastAPI, Python 3.11+
- **Database**: PostgreSQL 15, Redis 7
- **Task Queue**: Celery, RabbitMQ
- **Proxy**: Rotating Proxy Pool (Bright Data, Oxylabs 등)
- **Frontend**: React 18, TypeScript, TailwindCSS
- **Deployment**: Docker, Docker Compose

## 🔧 설치 및 실행

### 1. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일 수정 (DB, Redis, Proxy 설정)
```

### 2. Docker로 실행

```bash
docker-compose up -d
```

### 3. 데이터베이스 마이그레이션

```bash
docker-compose exec backend alembic upgrade head
```

### 4. 접속

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 📖 API 사용법

### 순위 체크 요청

```bash
curl -X POST "http://localhost:8000/api/rank/check" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "강남 맛집",
    "place_id": "1580429575",
    "place_name": "강남식당"
  }'
```

### 순위 기록 조회

```bash
curl "http://localhost:8000/api/rank/history?place_id=1580429575&period=30"
```

## 🔐 프록시 설정

### 무료 프록시 사용 (권장하지 않음)

```python
PROXIES = [
    "http://proxy1.example.com:8080",
    "http://proxy2.example.com:8080"
]
```

### 유료 프록시 서비스 (권장)

- [Bright Data](https://brightdata.com/)
- [Oxylabs](https://oxylabs.io/)
- [ScraperAPI](https://www.scraperapi.com/)

```python
# 예시: Bright Data
PROXY_URL = "http://username:password@brd.superproxy.io:22225"
```

## 📊 데이터베이스 스키마

```sql
-- 플레이스 정보
CREATE TABLE places (
    id SERIAL PRIMARY KEY,
    place_id VARCHAR(50) UNIQUE NOT NULL,
    place_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 키워드 정보
CREATE TABLE keywords (
    id SERIAL PRIMARY KEY,
    place_id INTEGER REFERENCES places(id),
    keyword VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 순위 기록
CREATE TABLE rank_history (
    id SERIAL PRIMARY KEY,
    keyword_id INTEGER REFERENCES keywords(id),
    rank INTEGER,
    blog_review_count INTEGER DEFAULT 0,
    visitor_review_count INTEGER DEFAULT 0,
    save_count INTEGER DEFAULT 0,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## ⚙️ 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL 연결 URL | `postgresql://user:pass@localhost/placerank` |
| `REDIS_URL` | Redis 연결 URL | `redis://localhost:6379/0` |
| `RABBITMQ_URL` | RabbitMQ 연결 URL | `amqp://guest:guest@localhost:5672//` |
| `PROXY_LIST` | 프록시 목록 (쉼표 구분) | `` |
| `MAX_WORKERS` | 동시 워커 수 | `5` |
| `RATE_LIMIT_DELAY` | 요청 간 지연 시간 (초) | `2` |

## 🧪 테스트

```bash
# 백엔드 테스트
docker-compose exec backend pytest

# 프론트엔드 테스트
docker-compose exec frontend npm test
```

## 📈 성능 최적화

1. **프록시 풀 크기**: 최소 10개 이상의 프록시 사용
2. **워커 수**: CPU 코어 수 × 2
3. **Redis 캐싱**: 동일 키워드는 1분간 캐시
4. **배치 처리**: 여러 키워드를 묶어서 처리

## 🐛 문제 해결

### 429 Too Many Requests 오류

```bash
# 프록시 추가 또는 지연 시간 증가
RATE_LIMIT_DELAY=5  # 5초로 증가
```

### 프록시 연결 실패

```bash
# 프록시 테스트
docker-compose exec backend python -m scripts.test_proxy
```

## 📝 라이센스

MIT License - 교육 목적으로만 사용하세요.

## 🙏 기여

이 프로젝트는 교육 목적이므로 PR은 받지 않습니다.

## 📞 문의

법적 문제나 윤리적 고민이 있다면 네이버 공식 API 사용을 권장합니다.
