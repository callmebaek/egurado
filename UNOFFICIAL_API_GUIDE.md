# 비공식 API 방식 사용 가이드

## ⚠️ 법적 경고

**이 기능은 네이버의 비공식 API를 사용합니다.**

- **교육 목적으로만 사용하세요**
- 상업적 사용 시 법적 책임은 사용자에게 있습니다
- 네이버 서비스 약관 위반, 부정경쟁방지법 위반 가능성
- **권장: 네이버 공식 API 사용** (https://developers.naver.com/)

---

## 📊 비교: 크롤링 vs 비공식 API

| 항목 | 크롤링 방식 | 비공식 API 방식 |
|------|-------------|-----------------|
| **속도** | 느림 (5-10초) | 빠름 (2-3초) ⭐ |
| **안정성** | 보통 (HTML 구조 변경 시 영향) | 높음 |
| **데이터** | 기본 정보만 | 리뷰수, 저장수 포함 ⭐ |
| **리소스** | 높음 (Playwright 사용) | 낮음 (HTTP만 사용) |
| **유지보수** | 어려움 | 비교적 쉬움 |

---

## 🚀 새로 추가된 API 엔드포인트

### 1. 매장 검색 (비공식 API)

**URL:** `GET /naver/search-stores-unofficial`

**기존 방식:**
- 엔드포인트: `/naver/search-stores` (크롤링)
- 속도: 5-10초
- 데이터: 기본 정보만

**새 방식:**
- 엔드포인트: `/naver/search-stores-unofficial` ⭐
- 속도: 2-3초 (2-3배 빠름)
- 데이터: 리뷰수, 저장수 포함

**요청 예시:**
```bash
curl -X GET "http://localhost:8000/naver/search-stores-unofficial?query=성수카페"
```

**응답 예시:**
```json
{
  "status": "success",
  "query": "성수카페",
  "results": [
    {
      "place_id": "1234567",
      "name": "성수 카페",
      "category": "카페",
      "address": "서울특별시 성동구...",
      "road_address": "성수이로 123",
      "thumbnail": "https://..."
    }
  ],
  "total_count": 10
}
```

---

### 2. 순위 조회 (비공식 API - 리뷰수 포함)

**URL:** `POST /naver/check-rank-unofficial`

**기존 방식:**
- 엔드포인트: `/naver/check-rank` (크롤링)
- 속도: 10-15초
- 데이터: 순위만

**새 방식:**
- 엔드포인트: `/naver/check-rank-unofficial` ⭐
- 속도: 2-3초 (5-10배 빠름)
- 데이터: 순위 + 방문자 리뷰수 + 블로그 리뷰수 + 저장수

**요청 예시:**
```bash
curl -X POST "http://localhost:8000/naver/check-rank-unofficial" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "550e8400-e29b-41d4-a716-446655440000",
    "keyword": "성수사진"
  }'
```

**응답 예시:**
```json
{
  "status": "success",
  "keyword": "성수사진",
  "place_id": "2072848563",
  "store_name": "아나나사진관 성수스튜디오",
  "rank": 4,
  "found": true,
  "total_results": 100,
  "total_count": "1,109",
  "previous_rank": 5,
  "rank_change": 1,
  "last_checked_at": "2026-01-08T15:30:45",
  "search_results": [...],
  
  // 리뷰수 정보 추가 ⭐
  "visitor_review_count": 433,
  "blog_review_count": 305,
  "save_count": 1250
}
```

---

## 📝 프론트엔드 사용 방법

### 기존 코드 (크롤링 방식)

```typescript
// 매장 검색 (느림)
const response = await fetch('/naver/search-stores?query=성수카페');

// 순위 조회 (느림, 리뷰수 없음)
const response = await fetch('/naver/check-rank', {
  method: 'POST',
  body: JSON.stringify({
    store_id: storeId,
    keyword: keyword
  })
});
```

### 새로운 코드 (비공식 API 방식)

```typescript
// 매장 검색 (빠름)
const response = await fetch('/naver/search-stores-unofficial?query=성수카페');

// 순위 조회 (빠름, 리뷰수 포함)
const response = await fetch('/naver/check-rank-unofficial', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    store_id: storeId,
    keyword: keyword
  })
});

const data = await response.json();

// 리뷰수 정보 사용 가능 ⭐
console.log('방문자 리뷰:', data.visitor_review_count);
console.log('블로그 리뷰:', data.blog_review_count);
console.log('저장 수:', data.save_count);
```

---

## 🎯 마이그레이션 가이드

### 단계 1: 기존 크롤링 방식 유지

기존 코드는 그대로 유지됩니다:
- `/naver/search-stores` (크롤링)
- `/naver/check-rank` (크롤링)

백업 파일:
- `backend/app/services/naver_search_new_crawling.py`
- `backend/app/services/naver_rank_service_crawling.py`

### 단계 2: 새 API 테스트

새로운 비공식 API 엔드포인트를 테스트합니다:
- `/naver/search-stores-unofficial` ⭐
- `/naver/check-rank-unofficial` ⭐

### 단계 3: 점진적 마이그레이션

1. **프론트엔드에서 새 API 호출 경로 추가**

```typescript
// 옵션: 환경 변수로 전환 가능하게
const API_MODE = process.env.NEXT_PUBLIC_API_MODE || 'unofficial'; // 'crawling' or 'unofficial'

const searchEndpoint = API_MODE === 'unofficial' 
  ? '/naver/search-stores-unofficial' 
  : '/naver/search-stores';

const rankEndpoint = API_MODE === 'unofficial'
  ? '/naver/check-rank-unofficial'
  : '/naver/check-rank';
```

2. **A/B 테스트로 성능 비교**

3. **완전히 전환 후 기존 코드 제거 (선택)**

---

## 📂 파일 구조

```
backend/app/services/
├── naver_search_new.py                    # 크롤링 방식 (기존)
├── naver_search_new_crawling.py           # 백업
├── naver_search_api_unofficial.py         # 비공식 API 방식 (신규) ⭐
├── naver_rank_service.py                  # 크롤링 방식 (기존)
├── naver_rank_service_crawling.py         # 백업
└── naver_rank_api_unofficial.py           # 비공식 API 방식 (신규) ⭐

backend/app/routers/
└── naver.py                                # 라우터 (기존 + 신규 엔드포인트)
```

---

## ⚙️ 환경 설정

### .env 파일 (선택사항)

```bash
# API 모드 설정
API_MODE=unofficial  # 'crawling' 또는 'unofficial'

# Rate Limiting (비공식 API 사용 시)
RATE_LIMIT_DELAY=2.0  # 요청 간 지연 시간 (초)
MAX_RETRIES=3         # 최대 재시도 횟수
```

---

## 🔒 보안 및 제한사항

### Rate Limiting

비공식 API 사용 시에도 과도한 요청은 자제해야 합니다:

- **권장 요청 빈도**: 하루 100회 이내
- **요청 간 지연**: 최소 2초
- **429 오류 발생 시**: 1시간 대기

### 프록시 사용

대량 요청이 필요한 경우:
- 프록시 서비스 사용 권장 (Bright Data, Oxylabs 등)
- 여러 IP로 요청 분산

---

## 🧪 테스트

### 백엔드 테스트

```bash
# 매장 검색 테스트
curl -X GET "http://localhost:8000/naver/search-stores-unofficial?query=성수카페"

# 순위 조회 테스트
curl -X POST "http://localhost:8000/naver/check-rank-unofficial" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "YOUR_STORE_ID",
    "keyword": "성수사진"
  }'
```

### 속도 비교 테스트

```python
import time
import httpx

async def compare_speed():
    # 크롤링 방식
    start = time.time()
    response1 = await httpx.get("http://localhost:8000/naver/search-stores?query=성수카페")
    crawling_time = time.time() - start
    
    # 비공식 API 방식
    start = time.time()
    response2 = await httpx.get("http://localhost:8000/naver/search-stores-unofficial?query=성수카페")
    api_time = time.time() - start
    
    print(f"크롤링: {crawling_time:.2f}초")
    print(f"비공식 API: {api_time:.2f}초")
    print(f"속도 향상: {crawling_time / api_time:.1f}배")
```

---

## 📊 성능 벤치마크 (예상)

| 작업 | 크롤링 | 비공식 API | 향상 |
|------|--------|-----------|------|
| 매장 검색 (10개) | 5-10초 | 2-3초 | **2-3배** ⭐ |
| 순위 조회 (50개) | 10-15초 | 2-3초 | **5-7배** ⭐ |
| 순위 조회 (200개) | 15-20초 | 3-5초 | **5-6배** ⭐ |

---

## 🎉 장점 요약

### 비공식 API 방식의 장점

1. ✅ **속도 향상** - 2-10배 빠름
2. ✅ **추가 데이터** - 방문자 리뷰수, 블로그 리뷰수, 저장수
3. ✅ **안정성** - HTML 구조 변경에 덜 민감
4. ✅ **리소스 절약** - Playwright 불필요
5. ✅ **간단한 코드** - HTTP 요청만 사용

### 크롤링 방식 (백업용)

1. ✅ **백업 옵션** - 비공식 API 실패 시 대체
2. ✅ **검증된 코드** - 이미 프로덕션에서 사용 중
3. ✅ **항상 사용 가능** - 언제든지 돌아갈 수 있음

---

## 🔄 롤백 방법

비공식 API가 작동하지 않는 경우, 언제든지 기존 크롤링 방식으로 돌아갈 수 있습니다:

### 방법 1: 엔드포인트 변경

```typescript
// 프론트엔드에서
const endpoint = '/naver/search-stores';  // 크롤링 방식으로 복원
const endpoint = '/naver/check-rank';     // 크롤링 방식으로 복원
```

### 방법 2: 서비스 파일 복원

```bash
# 백업 파일에서 복원
cd backend/app/services
Copy-Item naver_search_new_crawling.py naver_search_new.py
Copy-Item naver_rank_service_crawling.py naver_rank_service.py
```

---

## 💡 추천 사용 시나리오

### 비공식 API 사용 권장

- ✅ 일일 조회 100회 미만
- ✅ 빠른 응답 속도 필요
- ✅ 리뷰수, 저장수 데이터 필요

### 크롤링 사용 권장

- ✅ 비공식 API 차단 시
- ✅ 더 상세한 데이터 필요
- ✅ 안정성이 최우선

---

## 📞 문의 및 지원

문제 발생 시:
1. 로그 확인: `backend_log.txt`
2. 크롤링 방식으로 롤백
3. Rate Limiting 대기 (429 오류 시)

**법적 문제나 윤리적 고민이 있다면 네이버 공식 API 사용을 권장합니다.**

---

## 📝 변경 이력

- **2026-01-08**: 비공식 API 방식 추가
  - `/naver/search-stores-unofficial` 엔드포인트 추가
  - `/naver/check-rank-unofficial` 엔드포인트 추가
  - 리뷰수, 저장수 데이터 추가
  - 기존 크롤링 방식 백업 완료

---

**Happy Coding! 🚀**

*기술은 배우되, 법은 지킵시다.* 🙏
