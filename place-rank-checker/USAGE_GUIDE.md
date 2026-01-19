# 🚀 Place Rank Checker - 사용 가이드

## ⚠️ 시작하기 전에 반드시 읽어주세요!

### 법적 경고

이 시스템은 **네이버의 비공식 API**를 사용합니다.

**실제 상업적 사용 시 발생할 수 있는 법적 문제:**
1. 네이버 서비스 약관 위반
2. 부정경쟁방지법 위반 (제2조 제1호 카목)
3. 저작권법 위반 가능성
4. 개인정보보호법 관련 이슈

**권장 사항:**
- 학습 및 연구 목적으로만 사용
- 실제 서비스는 네이버 공식 API 사용
- 과도한 요청으로 네이버 서버에 부하를 주지 않기
- Rate Limiting 준수

**법적 책임은 전적으로 사용자에게 있습니다.**

---

## 📦 설치 및 실행

### 1. 사전 요구사항

- Docker & Docker Compose
- (선택) 프록시 서비스 계정

### 2. 환경 설정

```bash
# 1. 프로젝트 클론
cd place-rank-checker

# 2. 환경변수 설정
cp env.example .env

# 3. .env 파일 수정
nano .env
```

**중요한 환경변수:**

```bash
# 프록시 설정 (쉼표로 구분)
PROXY_LIST=http://user:pass@proxy1.com:8080,http://user:pass@proxy2.com:8080

# 요청 간 지연 시간 (초) - 클수록 안전
RATE_LIMIT_DELAY=2.0

# 최대 재시도 횟수
MAX_RETRIES=3
```

### 3. Docker로 실행

```bash
# 전체 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f backend

# 서비스 중지
docker-compose down
```

### 4. 접속

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs
- **RabbitMQ 관리**: http://localhost:15672 (guest/guest)

---

## 🔑 프록시 설정 (중요!)

### 왜 프록시가 필요한가?

네이버는 동일 IP에서 반복적인 요청을 감지하면 **429 Too Many Requests** 오류를 반환합니다.

프록시를 사용하면:
- 여러 IP로 요청을 분산
- Rate Limiting 회피
- 안정적인 데이터 수집

### 무료 프록시 vs 유료 프록시

| 구분 | 무료 프록시 | 유료 프록시 |
|------|-------------|-------------|
| 가격 | 무료 | $50~300/월 |
| 안정성 | ❌ 매우 낮음 | ✅ 높음 |
| 속도 | ❌ 느림 | ✅ 빠름 |
| IP 개수 | 10~100개 | 수천~수만 개 |
| 사용 추천 | 테스트용 | 실제 운영용 |

### 추천 유료 프록시 서비스

#### 1. **Bright Data** (강력 추천)

```bash
# .env 파일
PROXY_LIST=http://username:password@brd.superproxy.io:22225
```

- 가격: $500/월부터 (40GB)
- 특징: 가장 안정적, 주거용 IP 지원
- 웹사이트: https://brightdata.com/

#### 2. **Oxylabs**

```bash
# .env 파일
PROXY_LIST=http://username:password@pr.oxylabs.io:7777
```

- 가격: $300/월부터
- 특징: 빠른 속도, 좋은 지원
- 웹사이트: https://oxylabs.io/

#### 3. **ScraperAPI**

```bash
# .env 파일
PROXY_LIST=http://scraperapi:YOUR_API_KEY@proxy-server.scraperapi.com:8001
```

- 가격: $49/월부터 (1000 requests)
- 특징: 간단한 설정
- 웹사이트: https://www.scraperapi.com/

### 무료 프록시 (테스트용)

```python
# 무료 프록시 리스트 예시
PROXY_LIST=http://proxy1.example.com:8080,http://proxy2.example.com:8080
```

⚠️ **주의**: 무료 프록시는 매우 불안정하므로 테스트용으로만 사용하세요.

---

## 💻 API 사용법

### 1. 단일 순위 체크

```bash
curl -X POST "http://localhost:8000/api/rank/check" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "성수사진",
    "place_id": "2072848563",
    "place_name": "아나나사진관 성수스튜디오"
  }'
```

**응답 예시:**

```json
{
  "success": true,
  "message": "순위 체크 완료",
  "data": {
    "keyword": "성수사진",
    "place_id": "2072848563",
    "place_name": "아나나사진관 성수스튜디오",
    "rank": 4,
    "found": true,
    "total_count": 1109,
    "blog_review_count": 305,
    "visitor_review_count": 433,
    "save_count": 1250,
    "category": "사진,스튜디오",
    "address": "서울특별시 성동구 뚝섬로9길 16 4층",
    "checked_at": "2026-01-08 15:30:45"
  }
}
```

### 2. 일괄 순위 체크 (최대 10개)

```bash
curl -X POST "http://localhost:8000/api/rank/batch" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "keyword": "성수사진",
      "place_id": "2072848563"
    },
    {
      "keyword": "강남 맛집",
      "place_name": "강남식당"
    }
  ]'
```

### 3. 순위 기록 조회

```bash
curl "http://localhost:8000/api/rank/history/2072848563?period=30"
```

**파라미터:**
- `place_id`: 플레이스 ID (필수)
- `keyword`: 검색 키워드 (선택)
- `period`: 조회 기간 (7, 30, 60, 90일)

### 4. 프록시 통계

```bash
curl "http://localhost:8000/api/proxy/stats"
```

---

## 🛠️ 고급 설정

### Rate Limiting 조정

**보수적 설정 (안전, 느림):**

```bash
RATE_LIMIT_DELAY=5.0  # 요청 간 5초 대기
MAX_RETRIES=5
```

**적극적 설정 (빠름, 위험):**

```bash
RATE_LIMIT_DELAY=1.0  # 요청 간 1초 대기
MAX_RETRIES=3
```

### 프록시 풀 크기

최소 **10개 이상**의 프록시를 사용하는 것을 권장합니다.

```bash
# 프록시가 많을수록 안정적
PROXY_LIST=proxy1,proxy2,proxy3,...,proxy20
```

### 워커 수 조정

```bash
# CPU 코어 수 × 2
MAX_WORKERS=8
```

---

## 📊 모니터링

### 1. 백엔드 로그

```bash
docker-compose logs -f backend
```

### 2. Celery 워커 로그

```bash
docker-compose logs -f celery-worker
```

### 3. RabbitMQ 관리 콘솔

http://localhost:15672 (guest/guest)

### 4. 프록시 통계 확인

```bash
curl http://localhost:8000/api/proxy/stats | jq
```

---

## ⚠️ 문제 해결

### 1. 429 Too Many Requests 오류

**원인:** Rate Limiting에 걸림

**해결책:**
```bash
# .env 파일 수정
RATE_LIMIT_DELAY=10.0  # 지연 시간 증가
MAX_RETRIES=5

# 프록시 추가
PROXY_LIST=더많은프록시추가...
```

### 2. 프록시 연결 실패

**원인:** 프록시 서버 다운 또는 인증 오류

**해결책:**
```bash
# 프록시 테스트
docker-compose exec backend python -c "
from core.proxy_manager import init_proxy_manager
import asyncio

async def test():
    manager = init_proxy_manager(['YOUR_PROXY_URL'])
    await manager.test_all_proxies()

asyncio.run(test())
"
```

### 3. 데이터베이스 연결 실패

**원인:** PostgreSQL 컨테이너가 시작되지 않음

**해결책:**
```bash
# 컨테이너 상태 확인
docker-compose ps

# PostgreSQL 로그 확인
docker-compose logs postgres

# 재시작
docker-compose restart postgres
```

### 4. 순위를 찾을 수 없음

**원인:** 
- 플레이스 ID/이름이 잘못됨
- 검색 결과 100개 밖에 없음

**해결책:**
- 플레이스 ID/이름 재확인
- 더 구체적인 키워드 사용

---

## 🔒 보안 주의사항

### 1. API 키 보호

```bash
# .env 파일 (절대 Git에 커밋하지 않기!)
API_KEY=your-secret-api-key
```

### 2. CORS 설정

프로덕션에서는 특정 도메인만 허용:

```python
# main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # 특정 도메인만
    ...
)
```

### 3. Rate Limiting (API 레벨)

```python
# main.py에 추가
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/rank/check")
@limiter.limit("10/minute")  # 분당 10회 제한
async def check_rank(...):
    ...
```

---

## 📈 성능 최적화

### 1. Redis 캐싱 추가

동일한 키워드는 1분간 캐시:

```python
import redis

redis_client = redis.from_url(os.getenv("REDIS_URL"))

# 캐시 확인
cache_key = f"rank:{keyword}:{place_id}"
cached = redis_client.get(cache_key)
if cached:
    return json.loads(cached)

# 캐시 저장
redis_client.setex(cache_key, 60, json.dumps(result))
```

### 2. 데이터베이스 인덱스

```sql
-- 자주 조회하는 컬럼에 인덱스 추가
CREATE INDEX idx_place_id ON places(place_id);
CREATE INDEX idx_keyword ON keywords(keyword);
CREATE INDEX idx_checked_at ON rank_history(checked_at);
```

### 3. 배치 처리

여러 키워드를 묶어서 처리:

```python
# 10개씩 묶어서 처리
searches = [{"keyword": f"키워드{i}", ...} for i in range(100)]
results = await scraper.batch_search(searches[:10])
```

---

## 🎯 실전 사용 시나리오

### 시나리오 1: 내 플레이스 순위 모니터링

```bash
# 매일 오전 9시에 순위 체크 (cron)
0 9 * * * curl -X POST "http://localhost:8000/api/rank/check" \
  -H "Content-Type: application/json" \
  -d '{"keyword": "강남 맛집", "place_id": "123456"}'
```

### 시나리오 2: 경쟁사 순위 추적

```python
# 경쟁사 10곳의 순위를 동시에 체크
competitors = [
    {"keyword": "강남 맛집", "place_id": "111111"},
    {"keyword": "강남 맛집", "place_id": "222222"},
    # ... 10개
]

response = requests.post(
    "http://localhost:8000/api/rank/batch",
    json=competitors
)
```

### 시나리오 3: 키워드별 순위 변화 분석

```python
# 7일/30일/60일 데이터를 가져와서 차트로 시각화
history_7d = requests.get(
    f"http://localhost:8000/api/rank/history/{place_id}?period=7"
).json()

history_30d = requests.get(
    f"http://localhost:8000/api/rank/history/{place_id}?period=30"
).json()

# 차트 생성 (matplotlib, recharts 등)
```

---

## 🚫 하지 말아야 할 것

1. ❌ **초당 여러 요청 보내기**
   - Rate Limiting에 걸립니다
   - 프록시가 차단될 수 있습니다

2. ❌ **프록시 없이 대량 요청**
   - IP가 차단됩니다
   - 네이버에서 법적 조치를 취할 수 있습니다

3. ❌ **24시간 무중단 크롤링**
   - 네이버 서버에 부하를 줍니다
   - 윤리적으로 문제가 있습니다

4. ❌ **데이터 재판매**
   - 저작권 침해입니다
   - 부정경쟁방지법 위반입니다

---

## 📚 추가 자료

### 네이버 공식 API (권장)

- [Naver Developers](https://developers.naver.com/)
- 검색 API, 플레이스 API 등 제공
- 합법적이고 안정적

### 법적 참고자료

- [부정경쟁방지법](https://www.law.go.kr/)
- [저작권법](https://www.copyright.or.kr/)
- [개인정보보호법](https://www.privacy.go.kr/)

---

## 💡 마지막 당부

이 시스템은 **교육 및 연구 목적**으로 만들어졌습니다.

실제 비즈니스에 사용하려면:
1. 네이버 공식 API 사용
2. 법률 자문 받기
3. 윤리적 가이드라인 준수

**기술은 배우되, 법은 지킵시다.** 🙏

---

## 📞 문의

법적 문제나 윤리적 고민이 있다면:
- 네이버 고객센터에 문의
- 전문 변호사 상담
- 네이버 공식 API 사용 고려

**Happy Learning! 🚀**
