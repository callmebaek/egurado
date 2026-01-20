# 주요지표 추적 기능 구현 가이드

## 📋 개요

"주요지표 추적" 기능은 매장 x 키워드 조합의 순위, 방문자리뷰, 블로그리뷰를 매일 자동으로 추적하고 알림을 제공하는 서비스입니다.

## ✨ 주요 기능

### 1. 자동 지표 수집
- 매일 설정된 시간에 자동으로 순위, 방문자리뷰, 블로그리뷰 수집
- 업데이트 주기: 일 1회 / 일 2회 / 일 3회 선택 가능
- 업데이트 시간 커스터마이징

### 2. 알림 서비스
- 카카오톡 알림 (비즈메시지)
- SMS 알림
- 이메일 알림

### 3. 데이터 시각화
- 일별 순위 변동 차트
- 리뷰수 추이 그래프
- 상세 데이터 테이블

### 4. Tier별 제한
- **Free**: 1개
- **Basic**: 3개
- **Pro**: 10개
- **God**: 무제한

## 🗂️ 구현된 파일 목록

### 데이터베이스
- `supabase/migrations/011_add_metric_tracker.sql`
  - `metric_trackers` 테이블: 추적 설정
  - `daily_metrics` 테이블: 일별 수집 데이터

### 백엔드 (Python/FastAPI)

#### 스키마
- `backend/app/models/schemas.py`
  - MetricTrackerBase, MetricTrackerCreate, MetricTrackerUpdate
  - MetricTracker, MetricTrackerWithDetails
  - DailyMetric, DailyMetricWithKeyword
  - 관련 Response 스키마

#### 서비스
- `backend/app/services/metric_tracker_service.py`
  - MetricTrackerService: 추적 설정 CRUD 및 지표 수집 로직
  - Tier별 제한 확인
  - 다음 수집 시간 계산

- `backend/app/services/notification_service.py`
  - NotificationService: 카카오톡/SMS/이메일 알림 전송
  - 메시지 포맷팅 (텍스트/HTML)

#### API 라우터
- `backend/app/routers/metric_tracker.py`
  - POST `/api/v1/metrics/trackers` - 추적 설정 생성
  - GET `/api/v1/metrics/trackers` - 추적 설정 목록 조회
  - GET `/api/v1/metrics/trackers/{id}` - 특정 추적 설정 조회
  - PATCH `/api/v1/metrics/trackers/{id}` - 추적 설정 수정
  - DELETE `/api/v1/metrics/trackers/{id}` - 추적 설정 삭제
  - POST `/api/v1/metrics/trackers/{id}/collect` - 즉시 지표 수집
  - GET `/api/v1/metrics/trackers/{id}/metrics` - 일별 지표 조회

#### 스케줄러
- `backend/app/core/scheduler.py`
  - `collect_all_metrics()`: 매 시간 정각에 실행
  - next_collection_at이 현재 시간보다 이전인 추적만 수집

#### 메인 앱
- `backend/app/main.py`
  - 라우터 등록: `/api/v1/metrics`

### 프론트엔드 (Next.js/React)

#### 페이지
- `frontend/app/dashboard/naver/metrics-tracker/page.tsx`
  - 추적 설정 생성 UI
  - 추적 목록 표시
  - 일별 지표 차트 및 테이블
  - Tier별 제한 표시

#### 레이아웃
- `frontend/components/layout/Sidebar.tsx`
  - "주요지표 추적" 메뉴 추가 (플레이스 순위 바로 아래)

#### 설정
- `frontend/lib/config.ts`
  - metrics API 엔드포인트 추가

## 🚀 배포 가이드

### 1. 데이터베이스 마이그레이션

Supabase 대시보드에서 SQL 에디터를 열고 다음 파일을 실행:

```bash
supabase/migrations/011_add_metric_tracker.sql
```

또는 Supabase CLI 사용:

```bash
cd supabase
supabase db push
```

### 2. 백엔드 배포

#### 환경 변수 추가 (.env)

```env
# 카카오톡 비즈메시지 (선택)
KAKAO_MESSAGE_API_KEY=your_kakao_api_key
KAKAO_SENDER_KEY=your_sender_key

# SMS API (선택) - NCP SENS, Twilio 등
SMS_API_KEY=your_sms_api_key
SMS_API_SECRET=your_sms_api_secret
SMS_SENDER_NUMBER=your_sender_number

# 이메일 SMTP (선택)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@whiplace.com
```

#### 의존성 설치

```bash
cd backend
pip install pytz
```

#### 서버 재시작

```bash
# 개발 환경
python -m uvicorn app.main:app --reload

# 프로덕션 환경 (Vercel, Railway 등)
# 자동으로 재배포됨
```

### 3. 프론트엔드 배포

```bash
cd frontend
npm install
npm run build

# 또는 Vercel로 자동 배포
```

## 📝 사용 방법

### 1. 추적 설정 생성

1. **네이버 플레이스 > 주요지표 추적** 메뉴 클릭
2. **"추적 설정 추가"** 버튼 클릭
3. 매장 선택
4. 키워드 선택 (없으면 추가)
5. **"생성하기"** 버튼 클릭

### 2. 지표 확인

1. 추적 목록에서 **"지표 보기"** 버튼 클릭
2. 일별 순위 변동 차트 확인
3. 방문자리뷰, 블로그리뷰 추이 확인
4. 상세 데이터 테이블 확인

### 3. 알림 설정 (향후 구현)

1. 추적 설정에서 **설정 버튼** 클릭
2. 알림 타입 선택 (카카오톡/SMS/이메일)
3. 수신 정보 입력
4. 동의 체크박스 선택
5. 저장

## 🔧 커스터마이징

### 업데이트 주기 변경

기본값:
- `daily_once`: 오후 4시 (16:00)
- `daily_twice`: 오전 6시, 오후 4시 (6:00, 16:00)
- `daily_thrice`: 오전 6시, 정오, 오후 6시 (6:00, 12:00, 18:00)

변경 방법: `backend/app/services/metric_tracker_service.py`의 `DEFAULT_UPDATE_TIMES` 수정

### Tier별 제한 변경

기본값:
- Free: 1개
- Basic: 3개
- Pro: 10개
- God: 9999개

변경 방법: `backend/app/services/metric_tracker_service.py`의 `TRACKER_LIMITS` 수정

### 스케줄러 실행 주기 변경

기본값: 매 시간 정각

변경 방법: `backend/app/core/scheduler.py`의 `CronTrigger(minute=0)` 수정

예시:
```python
# 30분마다
CronTrigger(minute="*/30")

# 매 15분마다
CronTrigger(minute="*/15")
```

## 🐛 트러블슈팅

### 1. 지표 수집이 안 됨

**증상**: 추적 설정을 만들었는데 데이터가 수집되지 않음

**해결방법**:
1. 백엔드 로그 확인
2. 스케줄러가 실행 중인지 확인
3. `next_collection_at` 시간 확인
4. 수동 수집 테스트: POST `/api/v1/metrics/trackers/{id}/collect`

### 2. Tier 제한이 적용 안 됨

**증상**: Free 플랜인데 여러 개 추적 설정을 만들 수 있음

**해결방법**:
1. `profiles` 테이블의 `subscription_tier` 확인
2. 대소문자 확인 (소문자로 저장되어야 함)
3. 프론트엔드에서 tier를 다시 로드

### 3. 알림이 안 옴

**증상**: 알림 설정을 했는데 메시지가 안 옴

**해결방법**:
1. 환경 변수 확인 (KAKAO_API_KEY, SMS_API_KEY 등)
2. 알림 서비스 로그 확인
3. 카카오톡: 템플릿 승인 확인
4. SMS: API 크레딧 확인
5. 이메일: SMTP 설정 확인

### 4. 차트가 안 보임

**증상**: 지표 데이터가 있는데 차트가 안 그려짐

**해결방법**:
1. 브라우저 콘솔 확인
2. recharts 라이브러리 설치 확인: `npm install recharts`
3. 데이터 형식 확인

## 📊 데이터베이스 스키마

### metric_trackers

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 기본 키 |
| user_id | UUID | 사용자 ID |
| store_id | UUID | 매장 ID (FK) |
| keyword_id | UUID | 키워드 ID (FK) |
| update_frequency | TEXT | 업데이트 주기 |
| update_times | INTEGER[] | 업데이트 시간 배열 |
| notification_enabled | BOOLEAN | 알림 활성화 |
| notification_type | TEXT | 알림 타입 |
| notification_consent | BOOLEAN | 알림 동의 |
| notification_phone | TEXT | 전화번호 |
| notification_email | TEXT | 이메일 |
| is_active | BOOLEAN | 활성 상태 |
| last_collected_at | TIMESTAMP | 마지막 수집 시간 |
| next_collection_at | TIMESTAMP | 다음 수집 시간 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

### daily_metrics

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 기본 키 |
| tracker_id | UUID | 추적 설정 ID (FK) |
| keyword_id | UUID | 키워드 ID (FK) |
| store_id | UUID | 매장 ID (FK) |
| collection_date | DATE | 수집 날짜 |
| rank | INTEGER | 순위 |
| visitor_review_count | INTEGER | 방문자 리뷰 수 |
| blog_review_count | INTEGER | 블로그 리뷰 수 |
| rank_change | INTEGER | 순위 변동 |
| previous_rank | INTEGER | 전일 순위 |
| collected_at | TIMESTAMP | 수집 시간 |

## 🔗 관련 기능 연동

### 플레이스 순위 기능과의 연동

- **공통 데이터**: `keywords` 테이블, `rank_history` 테이블 공유
- **데이터 저장**: 주요지표 추적에서 수집한 데이터도 `rank_history`에 저장
- **차트 공유**: 순위 변화 차트 동일한 데이터 소스 사용

### 향후 확장 계획

1. **경쟁 매장 추적**: 경쟁 매장의 지표도 함께 추적
2. **AI 분석**: 수집된 데이터를 기반으로 AI 인사이트 제공
3. **리포트 생성**: 주간/월간 리포트 자동 생성
4. **슬랙 연동**: Slack으로 알림 전송
5. **웹훅 지원**: 외부 시스템과 연동

## 📞 문의

기능 관련 문의나 버그 리포트는 개발팀에 연락주세요.

---

**작성일**: 2026-01-21  
**버전**: 1.0.0  
**작성자**: AI Development Team
