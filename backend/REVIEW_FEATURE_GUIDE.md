# 리뷰 관리 기능 사용 가이드

## 📋 목차
1. [개요](#개요)
2. [환경 설정](#환경-설정)
3. [데이터베이스 설정](#데이터베이스-설정)
4. [API 엔드포인트](#api-엔드포인트)
5. [사용 방법](#사용-방법)
6. [트러블슈팅](#트러블슈팅)

---

## 개요

리뷰 관리 기능은 네이버 플레이스의 방문자 리뷰를 자동으로 수집하고, OpenAI GPT-4를 활용하여 감성을 분석하는 시스템입니다.

### 주요 기능
- ✅ 네이버 방문자 리뷰 조회 (GraphQL API)
- ✅ 블로그 리뷰 수 조회
- ✅ OpenAI 감성 분석 (긍정/중립/부정)
- ✅ 리뷰 온도 측정 (0-100)
- ✅ 영수증 리뷰/예약자 리뷰 필터
- ✅ 파워 리뷰어 탐지 (100개 이상 리뷰 작성자)
- ✅ AI 기반 일별 요약 생성
- ✅ 항목별 감성 분석 (맛/서비스/가격/청결/분위기 등)

---

## 환경 설정

### 1. 환경 변수 (.env 파일)

backend/.env 파일에 다음 환경 변수를 추가하세요:

```bash
# OpenAI API Key (필수)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Supabase (기존)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 2. OpenAI API Key 발급 방법

1. [OpenAI Platform](https://platform.openai.com/) 접속
2. 로그인 또는 회원가입
3. [API Keys](https://platform.openai.com/api-keys) 페이지로 이동
4. "Create new secret key" 버튼 클릭
5. 생성된 키를 복사하여 `.env` 파일에 추가

**주의사항:**
- API Key는 절대 공개 저장소에 커밋하지 마세요
- 사용량에 따라 과금되므로 [Usage](https://platform.openai.com/usage) 페이지에서 모니터링하세요
- 추천 모델: `gpt-4o-mini` (빠르고 저렴)

---

## 데이터베이스 설정

### 1. 테이블 생성

Supabase SQL Editor에서 다음 스크립트를 실행하세요:

```bash
# SQL 파일 위치
backend/db/migrations/create_review_tables.sql
```

이 스크립트는 다음 테이블을 생성합니다:
- `review_stats`: 일별 리뷰 통계
- `reviews`: 개별 리뷰 및 감성 분석 결과

### 2. 테이블 구조

#### review_stats (리뷰 통계)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | 기본 키 |
| store_id | UUID | 매장 ID (외래 키) |
| date | DATE | 조회 날짜 |
| visitor_review_count | INT | 방문자 리뷰 수 |
| visitor_positive_count | INT | 긍정 리뷰 수 |
| visitor_neutral_count | INT | 중립 리뷰 수 |
| visitor_negative_count | INT | 부정 리뷰 수 |
| visitor_receipt_count | INT | 영수증 리뷰 수 |
| visitor_reservation_count | INT | 예약자 리뷰 수 |
| blog_review_count | INT | 블로그 리뷰 수 |
| power_reviewer_count | INT | 파워 리뷰어 수 |
| summary | TEXT | AI 생성 요약 |
| checked_at | TIMESTAMPTZ | 조회 시간 |

#### reviews (개별 리뷰)
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | 기본 키 |
| store_id | UUID | 매장 ID |
| review_stats_id | UUID | 통계 ID (외래 키) |
| naver_review_id | VARCHAR | 네이버 리뷰 ID (유니크) |
| review_type | VARCHAR | 'visitor' 또는 'blog' |
| author_name | VARCHAR | 작성자 이름 |
| author_review_count | INT | 작성자 총 리뷰 수 |
| is_power_reviewer | BOOLEAN | 파워 리뷰어 여부 |
| is_receipt_review | BOOLEAN | 영수증 리뷰 여부 |
| is_reservation_review | BOOLEAN | 예약자 리뷰 여부 |
| rating | DECIMAL | 별점 (0.0-5.0) |
| content | TEXT | 리뷰 내용 |
| images | TEXT[] | 이미지 URL 배열 |
| sentiment | VARCHAR | 감성 (positive/neutral/negative) |
| temperature_score | INT | 리뷰 온도 (0-100) |
| confidence | DECIMAL | 확신도 (0.0-1.0) |
| evidence_quotes | TEXT[] | 감성 근거 인용구 |
| aspect_sentiments | JSONB | 항목별 감성 |
| review_date | TIMESTAMPTZ | 리뷰 작성 날짜 |

---

## API 엔드포인트

### 1. 리뷰 분석 (POST /api/v1/reviews/analyze)

네이버에서 리뷰를 조회하고 감성 분석을 수행합니다.

**요청:**
```json
{
  "store_id": "uuid",
  "target_date": "2026-01-09"  // null이면 오늘
}
```

**응답:**
```json
{
  "status": "success",
  "store_id": "uuid",
  "date": "2026-01-09",
  "checked_at": "2026-01-09T10:30:00+09:00",
  "visitor_review_count": 15,
  "visitor_positive_count": 10,
  "visitor_neutral_count": 3,
  "visitor_negative_count": 2,
  "visitor_receipt_count": 5,
  "visitor_reservation_count": 3,
  "blog_review_count": 230,
  "power_reviewer_count": 1,
  "summary": "오늘 총 15개의 리뷰가 등록되었습니다. 전반적으로 긍정적인 평가가 많으며..."
}
```

**소요 시간:**
- 리뷰 15개: 약 30-60초
- OpenAI API 호출 시간 포함

**비용 (OpenAI):**
- gpt-4o-mini 기준: 리뷰 1개당 약 $0.001-0.002
- 리뷰 100개 분석 시 약 $0.10-0.20

### 2. 통계 조회 (GET /api/v1/reviews/stats/{store_id})

저장된 리뷰 통계를 조회합니다.

**파라미터:**
- `store_id` (필수): 매장 ID
- `date` (선택): 날짜 (YYYY-MM-DD), 없으면 최신

**응답:**
```json
{
  "status": "success",
  "store_id": "uuid",
  "date": "2026-01-09",
  // ... (분석 API와 동일)
}
```

### 3. 리뷰 목록 조회 (GET /api/v1/reviews/list/{store_id})

개별 리뷰 목록을 조회합니다 (필터 지원).

**파라미터:**
- `store_id` (필수): 매장 ID
- `date` (선택): 날짜, 없으면 최신
- `sentiment` (선택): positive, neutral, negative
- `is_receipt` (선택): true, false
- `is_reservation` (선택): true, false

**응답:**
```json
[
  {
    "id": "uuid",
    "naver_review_id": "123456",
    "review_type": "visitor",
    "author_name": "홍길동",
    "is_power_reviewer": false,
    "is_receipt_review": true,
    "is_reservation_review": false,
    "rating": 4.5,
    "content": "맛있어요! 강추합니다.",
    "images": ["https://..."],
    "sentiment": "positive",
    "temperature_score": 85,
    "confidence": 0.92,
    "review_date": "2026-01-09T08:30:00+09:00",
    "like_count": 3
  }
]
```

---

## 사용 방법

### 프론트엔드에서 사용

1. **매장 선택**
   - 리뷰 관리 페이지에서 매장 선택

2. **리뷰 분석**
   - "리뷰 분석" 버튼 클릭
   - AI가 자동으로 리뷰 수집 및 분석

3. **결과 확인**
   - 상단: AI 요약 및 통계
   - 하단: 개별 리뷰 목록 (필터링 가능)

4. **필터 사용**
   - 감성 필터: 긍정/중립/부정
   - 리뷰 타입: 영수증/예약자

### CLI에서 테스트

```bash
# 백엔드 디렉토리로 이동
cd backend

# 리뷰 분석 (POST)
curl -X POST http://localhost:8000/api/v1/reviews/analyze \
  -H "Content-Type: application/json" \
  -d '{"store_id": "your-store-id", "target_date": null}'

# 통계 조회 (GET)
curl http://localhost:8000/api/v1/reviews/stats/your-store-id

# 리뷰 목록 조회 (GET)
curl http://localhost:8000/api/v1/reviews/list/your-store-id?sentiment=positive
```

---

## 트러블슈팅

### 1. OpenAI API Key 오류

**증상:**
```
ValueError: OPENAI_API_KEY 환경 변수가 설정되지 않았습니다
```

**해결:**
```bash
# .env 파일에 API Key 추가
OPENAI_API_KEY=sk-your-key-here

# 서버 재시작
```

### 2. 리뷰 조회 실패

**증상:**
```
리뷰 분석 중 오류가 발생했습니다
```

**원인:**
- 네이버 Place ID가 등록되지 않음
- 네이버 API Rate Limiting

**해결:**
1. 매장에 `naver_place_id`가 등록되어 있는지 확인
2. 잠시 후 재시도

### 3. OpenAI Rate Limit

**증상:**
```
Rate limit exceeded
```

**해결:**
1. [OpenAI Usage](https://platform.openai.com/usage) 페이지에서 한도 확인
2. API Key의 Rate Limit 확인
3. `gpt-4o-mini` 모델 사용 (더 높은 한도)

### 4. 데이터베이스 오류

**증상:**
```
테이블을 찾을 수 없습니다
```

**해결:**
1. `create_review_tables.sql` 스크립트 실행 확인
2. Supabase SQL Editor에서 테이블 존재 확인
```sql
SELECT * FROM review_stats LIMIT 1;
SELECT * FROM reviews LIMIT 1;
```

---

## 비용 예측

### OpenAI API 비용 (gpt-4o-mini)

| 작업 | 토큰 수 | 비용 |
|------|---------|------|
| 리뷰 1개 분석 | ~1,000 | $0.001 |
| 리뷰 100개 분석 | ~100,000 | $0.10 |
| 일별 요약 생성 | ~500 | $0.0005 |

**월간 예상 비용 (매일 리뷰 30개 분석):**
- 30일 × 30개 × $0.001 = $0.90/월
- 매우 저렴!

### 최적화 팁
- 같은 날짜에 여러 번 분석하지 않기 (DB에 저장됨)
- 필요한 리뷰만 필터링하여 조회

---

## 다음 단계

### 향후 추가 가능 기능
- [ ] AI 답글 생성 (두 번째 기능)
- [ ] 리뷰 트렌드 분석
- [ ] 감정 변화 차트
- [ ] 경쟁사 리뷰 비교
- [ ] 키워드 추출 및 워드 클라우드
- [ ] 자동 알림 (부정 리뷰 발생 시)

---

## 참고 자료

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [네이버 플레이스 GraphQL API](https://api.place.naver.com/graphql)
- [Supabase Documentation](https://supabase.com/docs)

---

## 문의

궁금한 점이나 문제가 있으면 개발팀에 문의하세요.
