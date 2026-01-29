# 크레딧 시스템 구조 분석 및 제안

## 📌 분석 날짜: 2026-01-29

---

## 1. 기능별 리소스 사용량 분석

### 1.1 플레이스 진단 (Place Diagnosis)
**위치**: `backend/app/routers/naver.py` - `/place-details/{place_id}`

**API 호출 패턴**:
- 네이버 GraphQL API 호출: 1회 (플레이스 기본 정보)
- 네이버 비공식 HTML Parsing: 1-2회 (NaverPay, 예약, 기타 정보)
- 내부 진단 엔진: 1회 (CPU/메모리 사용)

**주요 변수**:
- 고정 호출: 진단 모드에 관계없이 동일
- OpenAI API: 사용 안 함

**제안 크레딧**: **5 크레딧**
- 외부 API: 네이버 비공식 API 2-3회
- 서버 리소스: 낮음
- 평균 소요 시간: 3-5초

---

### 1.2 플레이스 순위조회 (Rank Check)
**위치**: `backend/app/routers/naver.py` - `/check-rank-unofficial`

**API 호출 패턴**:
- 네이버 비공식 검색 API: 최대 15회 (300개 매장 확인, 20개씩 페이지네이션)
- Supabase DB: INSERT/UPDATE 2-3회
- 순위 발견 시 조기 종료 (최적화됨)

**주요 변수**:
- 순위가 높을수록 (1-20위): 1-2회 API 호출
- 순위가 낮을수록 (200-300위): 최대 15회 API 호출
- 300위 밖: 15회 API 호출 + 추가 place_info API 1회

**제안 크레딧**: **동적 차감**
- 1-20위: **3 크레딧** (API 1-2회)
- 21-100위: **5 크레딧** (API 3-5회)
- 101-300위: **8 크레딧** (API 6-15회)
- 300위 밖: **10 크레딧** (API 15회 + place_info 1회)

---

### 1.3 타겟 키워드 추출 (Target Keyword Extraction)
**위치**: `backend/app/routers/target_keywords.py` - `/analyze`

**API 호출 패턴**:
- 키워드 조합 생성: 내부 로직 (regions × landmarks × menus × industries × others)
- 네이버 검색량 API: 조합 수 ÷ 5 (배치 처리)
- 네이버 순위 조회 API: 상위 20개 키워드 × 15회 (최대)
- Supabase DB: 다수 INSERT

**주요 변수**:
- **지역 키워드**: 3개
- **상품 키워드**: 5개
- **기타 키워드**: 2개
- **조합 수**: 3 × 5 × 2 = 30개
- **API 호출**: 30 ÷ 5 = 6회 (검색량) + 20 × 15 = 300회 (순위 조회)

**제안 크레딧**: **조합 수 기반 동적 차감**
```
기본 크레딧 = 10 크레딧
추가 크레딧 = Math.ceil(조합 수 / 10) × 2 크레딧

예시:
- 10개 조합: 10 + 2 = 12 크레딧
- 30개 조합: 10 + 6 = 16 크레딧
- 50개 조합: 10 + 10 = 20 크레딧
- 100개 조합: 10 + 20 = 30 크레딧
```

---

### 1.4 키워드 순위 추적 (자동수집)
**위치**: `backend/app/services/metric_tracker_service.py` (스케줄러)

**API 호출 패턴**:
- 하루 1-3회 자동 실행 (사용자 설정)
- 각 실행마다 "순위조회"와 동일한 API 호출

**제안 크레딧**: **순위조회와 동일**
- 자동수집 1회 = 순위조회 1회
- 하루 3회 설정 시: 3 × (3-10 크레딧) = 9-30 크레딧/일

---

### 1.5 키워드 순위 추적 (일반설정)
**제안 크레딧**: **수동 실행**
- 키워드 등록 자체는 무료
- "수집" 버튼 클릭 시만 크레딧 차감 (순위조회와 동일)

---

### 1.6 플레이스 순위조회 (일반)
**제안 크레딧**: **1.2와 동일 (순위조회)**

---

### 1.7 대표키워드 분석 (Representative Keyword Analysis)
**위치**: `backend/app/routers/naver.py` - `/analyze-main-keywords`

**API 호출 패턴**:
- 네이버 검색 API: 1회 (상위 15개 매장 검색)
- 각 매장별 GraphQL API: 15회 (대표 키워드 추출)

**제안 크레딧**: **15 크레딧**
- 외부 API: 16회 (검색 1회 + GraphQL 15회)
- 서버 리소스: 중간
- 평균 소요 시간: 5-10초

---

### 1.8 리뷰 분석 (Review Analysis)
**위치**: `backend/app/routers/reviews.py` - `/analyze-stream`

**API 호출 패턴**:
- 네이버 GraphQL API: 페이지네이션 (리뷰 수 ÷ 20)
- **OpenAI API (GPT-4o-mini)**: **리뷰 개수만큼 호출**
- OpenAI API (요약): 1회

**주요 변수**:
- **리뷰 개수**: 가장 중요한 변수
- 10개 리뷰: OpenAI 11회 (분석 10회 + 요약 1회)
- 100개 리뷰: OpenAI 101회 (분석 100회 + 요약 1회)

**OpenAI 비용 추정** (GPT-4o-mini, 2026년 1월 기준):
- Input: $0.150 / 1M tokens
- Output: $0.600 / 1M tokens
- 평균 리뷰 분석: ~500 tokens (input) + ~200 tokens (output)
- 리뷰 1개당 비용: ~$0.0002 (약 0.3원)

**제안 크레딧**: **리뷰 수 기반 동적 차감**
```
크레딧 = Math.ceil(리뷰 수 / 5) + 5 (기본)

예시:
- 10개 리뷰: 5 + 5 = 10 크레딧
- 50개 리뷰: 10 + 5 = 15 크레딧
- 100개 리뷰: 20 + 5 = 25 크레딧
- 500개 리뷰: 100 + 5 = 105 크레딧
```

---

### 1.9 AI 리뷰답글 생성 (AI Reply Generation)
**위치**: `backend/app/routers/ai_reply.py` - `/generate`, `/post`

**API 호출 패턴**:
- **OpenAI API (GPT-4o-mini)**: 답글 1개당 1회
- Selenium (답글 게시): 1회 (큐 시스템, 15-30초 소요)

**주요 변수**:
- **답글 개수**: 리뷰 분석과 유사
- **답글 길이**: PlaceAISettings에 따라 100-500자

**OpenAI 비용 추정**:
- 평균 답글 생성: ~1000 tokens (input) + ~300 tokens (output)
- 답글 1개당 비용: ~$0.0003 (약 0.5원)

**제안 크레딧**: **답글 개수 기반**
```
AI 답글 생성: 1 크레딧 / 1개
AI 답글 게시 (Selenium): 2 크레딧 / 1개

예시:
- 10개 답글 생성만: 10 크레딧
- 10개 답글 생성 + 게시: 10 + 20 = 30 크레딧
```

**중요**: 답글 게시는 Selenium을 사용하므로 서버 부하가 크고 실패 위험이 있음. 따라서 게시는 생성보다 높은 크레딧 책정.

---

### 1.10 경쟁매장 분석 (Competitor Analysis)
**위치**: `backend/app/routers/naver.py` - `/competitor/analyze`

**API 호출 패턴**:
- 네이버 검색 API: 1회 (경쟁매장 검색)
- 각 경쟁매장별 GraphQL API: limit개 (기본 20개)
- 우리 매장 GraphQL API: 1회
- **OpenAI API (GPT-4o-mini)**: 1회 (비교 분석)

**주요 변수**:
- **경쟁매장 수**: 사용자 설정 (5-20개)
- 20개 경쟁매장: 22회 API (검색 1 + 경쟁사 20 + 우리 1) + OpenAI 1회

**OpenAI 비용 추정**:
- 경쟁사 비교: ~3000 tokens (input) + ~1000 tokens (output)
- 비교 1회당 비용: ~$0.001 (약 1.5원)

**제안 크레딧**: **경쟁매장 수 기반**
```
크레딧 = Math.ceil(경쟁매장 수 / 2) + 10 (기본)

예시:
- 5개 경쟁매장: 3 + 10 = 13 크레딧
- 10개 경쟁매장: 5 + 10 = 15 크레딧
- 20개 경쟁매장: 10 + 10 = 20 크레딧
```

---

### 1.11 키워드 검색량조회
**위치**: `backend/app/services/naver_keyword_search_volume_service.py`

**API 호출 패턴**:
- 네이버 공식 검색도구 API: 1회 (무료, 하루 1000건 제한)

**제안 크레딧**: **무료 (0 크레딧)**
- 현재 무료 API 사용 중
- 추후 유료 전환 시 재검토

---

### 1.12 업체소개글 생성 (Store Description)
**위치**: `backend/app/routers/naver.py` - `/activation/generate-description`

**API 호출 패턴**:
- **OpenAI API (GPT-4o-mini)**: 1회
- max_tokens: 3000 (최대 1950자 생성)

**OpenAI 비용 추정**:
- 평균: ~2000 tokens (input) + ~2000 tokens (output)
- 생성 1회당 비용: ~$0.0015 (약 2원)

**제안 크레딧**: **5 크레딧 / 1회**

---

### 1.13 찾아오는길 생성 (Directions)
**위치**: `backend/app/routers/naver.py` - `/activation/generate-directions`

**API 호출 패턴**:
- **OpenAI API (GPT-4o-mini)**: 1회
- max_tokens: 1500 (최대 390자 생성)

**OpenAI 비용 추정**:
- 평균: ~1500 tokens (input) + ~500 tokens (output)
- 생성 1회당 비용: ~$0.0005 (약 0.7원)

**제안 크레딧**: **3 크레딧 / 1회**

---

## 2. 크레딧 소비 구조 요약표

| 기능 | 크레딧 차감 방식 | 기준 크레딧 | 최대 크레딧 | 변수 |
|------|-----------------|------------|------------|------|
| **플레이스진단** | 고정 | 5 | 5 | - |
| **플레이스 순위조회** | 동적 (순위) | 3 | 10 | 순위 (1-300+) |
| **순위조회** | 동적 (순위) | 3 | 10 | 순위 (1-300+) |
| **타겟키워드 추출** | 동적 (조합 수) | 12 | 50+ | 조합 수 (10-200+) |
| **키워드 순위 추적 (자동)** | 동적 (순위 × 수집 횟수) | 9/일 | 90/일 | 하루 수집 횟수 (1-3) |
| **키워드 순위 추적 (일반)** | 수동 실행 시만 차감 | 3 | 10 | 순위 |
| **대표키워드 분석** | 고정 | 15 | 15 | - |
| **리뷰 분석** | 동적 (리뷰 수) | 10 | 무제한 | 리뷰 수 (10-1000+) |
| **AI 리뷰답글 생성** | 답글 수 | 1 | 무제한 | 답글 수 |
| **AI 리뷰답글 게시** | 답글 수 | 2 | 무제한 | 게시 수 |
| **경쟁매장 분석** | 동적 (경쟁사 수) | 13 | 30 | 경쟁사 수 (5-20) |
| **업체소개글 생성** | 고정 | 5 | 5 | - |
| **찾아오는길 생성** | 고정 | 3 | 3 | - |
| **키워드 검색량조회** | 무료 | 0 | 0 | - |

---

## 3. 구현 우선순위 제안

### Phase 1: 기본 크레딧 시스템 구축 (1-2주)
1. **DB 스키마 설계**
   - `user_credits` 테이블: user_id, total_credits, used_credits, tier
   - `credit_transactions` 테이블: user_id, feature, amount, timestamp, metadata
   
2. **크레딧 차감 미들웨어 개발**
   - 기능 실행 전 크레딧 체크
   - API 호출 성공 후 차감
   - 실패 시 롤백

3. **고정 크레딧 기능부터 적용** (테스트 용이)
   - 플레이스 진단: 5 크레딧
   - 대표키워드 분석: 15 크레딧
   - 업체소개글 생성: 5 크레딧
   - 찾아오는길 생성: 3 크레딧

### Phase 2: 동적 크레딧 시스템 (2-3주)
1. **순위 기반 차감**
   - 순위조회: 결과 기반 동적 차감
   - 키워드 자동수집: 순위 × 수집 횟수

2. **수량 기반 차감**
   - 타겟키워드 추출: 조합 수 기반
   - 리뷰 분석: 리뷰 수 기반
   - AI 답글: 답글 수 기반
   - 경쟁매장 분석: 경쟁사 수 기반

### Phase 3: UI 및 모니터링 (1-2주)
1. **크레딧 잔액 표시**
   - Header/Sidebar에 실시간 크레딧 표시
   - 크레딧 부족 경고 모달

2. **크레딧 사용 히스토리**
   - 기능별 사용 내역
   - 일별/월별 통계

3. **크레딧 리셋 스케줄러**
   - 결제일 또는 월초 기준
   - 자동 충전 로직

### Phase 4: Tier 시스템 통합 (1주)
1. **Tier별 기능 제한**
   - X 표시 기능: 크레딧 있어도 사용 불가
   - Tier 업그레이드 유도 UI

2. **매장/키워드 제한 독립 관리**
   - 크레딧과 별개로 tier별 등록 수 제한

---

## 4. 추가 확인 필요 사항

### Q1. OpenAI 토큰 사용량 실측
- **현재 상태**: 추정치만 제공 (response 객체에서 usage 확인 가능)
- **제안**: 각 기능 실행 시 `response.usage.total_tokens` 로깅 후 1주일 데이터 수집
- **목적**: 더 정확한 크레딧 책정

### Q2. 서버 리소스 모니터링
- **현재 상태**: CPU/메모리 사용량 미측정
- **제안**: Docker 컨테이너 모니터링 (cAdvisor, Prometheus)
- **목적**: 서버 부하 큰 기능 식별 후 크레딧 조정

### Q3. 네이버 API Rate Limit 확인
- **현재 상태**: 비공식 API 사용 중, 제한 불명확
- **리스크**: 과도한 호출 시 IP 차단 가능성
- **제안**: API 호출 빈도 제한 (rate limiting) 추가

### Q4. 크레딧 리셋 주기
- **질문**: 결제일 vs 월초, 어느 것이 일반적인가?
- **답변 대기 중**: 사용자께서 확인 후 회신 예정
- **참고**: 한국 SaaS 서비스 대부분 "결제일 기준" 사용 (예: Netflix, Notion)

### Q5. 수동 충전 옵션
- **요청사항**: 수동 충전 기능 유지
- **구현 필요**: 관리자 페이지 또는 결제 API 연동

---

## 5. 기술적 구현 세부사항

### 5.1 크레딧 차감 로직 (Pseudocode)

```python
async def check_and_deduct_credits(
    user_id: str,
    feature: str,
    estimated_credits: int,
    metadata: dict = None
) -> bool:
    """
    크레딧 체크 및 차감
    
    Args:
        user_id: 사용자 ID
        feature: 기능명
        estimated_credits: 예상 크레딧 (동적인 경우 최대치)
        metadata: 추가 정보 (순위, 리뷰 수 등)
    
    Returns:
        크레딧 충분 여부
    """
    # 1. 현재 크레딧 조회
    user_credits = get_user_credits(user_id)
    
    # 2. 크레딧 부족 시 에러
    if user_credits.remaining < estimated_credits:
        raise InsufficientCreditsError(
            required=estimated_credits,
            remaining=user_credits.remaining
        )
    
    # 3. 임시 예약 (실패 시 롤백용)
    transaction_id = create_pending_transaction(
        user_id=user_id,
        feature=feature,
        amount=estimated_credits,
        metadata=metadata
    )
    
    return transaction_id


async def finalize_credit_deduction(
    transaction_id: str,
    actual_credits: int = None,
    success: bool = True
):
    """
    크레딧 차감 확정
    
    Args:
        transaction_id: 거래 ID
        actual_credits: 실제 사용 크레딧 (None이면 예상치 사용)
        success: 성공 여부
    """
    if success:
        # 성공: 크레딧 차감
        confirm_transaction(transaction_id, actual_credits)
    else:
        # 실패: 롤백
        rollback_transaction(transaction_id)
```

### 5.2 동적 크레딧 계산 예시 (타겟 키워드 추출)

```python
async def calculate_target_keyword_credits(
    regions: List[str],
    landmarks: List[str],
    menus: List[str],
    industries: List[str],
    others: List[str]
) -> int:
    """타겟 키워드 추출 크레딧 계산"""
    # 조합 수 계산
    combination_count = len(regions) * len(landmarks) * len(menus) * len(industries) * len(others)
    
    # 빈 리스트 처리
    if combination_count == 0:
        combination_count = len(regions) + len(landmarks) + len(menus) + len(industries) + len(others)
    
    # 크레딧 계산
    base_credits = 10
    additional_credits = math.ceil(combination_count / 10) * 2
    
    total_credits = base_credits + additional_credits
    
    # 최대 크레딧 제한 (200개 조합까지)
    max_credits = 50
    return min(total_credits, max_credits)
```

### 5.3 크레딧 잔액 표시 (Frontend)

```typescript
// components/layout/CreditBadge.tsx
export function CreditBadge() {
  const { data: credits } = useQuery({
    queryKey: ['user', 'credits'],
    queryFn: async () => {
      const res = await api.users.getCredits();
      return res.data;
    },
    refetchInterval: 30000 // 30초마다 갱신
  });

  const remaining = credits?.remaining || 0;
  const total = credits?.total || 0;
  const percentage = (remaining / total) * 100;

  return (
    <div className="flex items-center gap-2">
      <Badge variant={percentage < 20 ? 'destructive' : 'default'}>
        💎 {remaining.toLocaleString()} / {total.toLocaleString()}
      </Badge>
      {percentage < 20 && (
        <Button size="sm" variant="outline">
          충전하기
        </Button>
      )}
    </div>
  );
}
```

---

## 6. 예상 크레딧 소비 시나리오

### 시나리오 1: Free 유저 (월 100 크레딧)
- 플레이스 진단: 5회 (25 크레딧)
- 순위조회: 10회 (30-50 크레딧)
- 업체소개글 생성: 2회 (10 크레딧)
- AI 답글 생성: 10개 (10 크레딧)
- **총 사용**: 75-95 크레딧
- **결론**: 기본 기능 위주 사용 가능

### 시나리오 2: Basic 유저 (월 500 크레딧)
- 플레이스 진단: 10회 (50 크레딧)
- 순위조회: 30회 (90-150 크레딧)
- 타겟 키워드 추출: 3회 (36-60 크레딧)
- 리뷰 분석: 5회, 평균 30개 리뷰 (75 크레딧)
- AI 답글 생성 + 게시: 50개 (150 크레딧)
- **총 사용**: 401-535 크레딧
- **결론**: AI 기능까지 활용 가능

### 시나리오 3: Pro 유저 (월 2000 크레딧)
- 자동 순위 추적: 10개 키워드 × 하루 2회 × 30일 (600-1800 크레딧)
- 리뷰 분석: 월 10회, 평균 100개 (250 크레딧)
- 경쟁매장 분석: 월 5회 (75 크레딧)
- 타겟 키워드 추출: 월 5회 (80 크레딧)
- **총 사용**: 1005-2205 크레딧
- **결론**: 자동화 기능 적극 활용, 때때로 부족

### 시나리오 4: God 유저 (무제한)
- 제한 없음, 모든 기능 자유 사용

---

## 7. 최종 권장사항

### 7.1 Tier별 월 크레딧 제안
- **Free**: 100 크레딧
- **Basic**: 500 크레딧
- **Pro**: 2,000 크레딧
- **Custom**: 협의
- **God**: 무제한

### 7.2 크레딧 단가 설정 (수동 충전 시)
- 100 크레딧: 5,000원 (50원/크레딧)
- 500 크레딧: 20,000원 (40원/크레딧)
- 1,000 크레딧: 35,000원 (35원/크레딧)

### 7.3 주의사항
1. **OpenAI API 비용 모니터링 필수**
   - 리뷰 분석, AI 답글이 비용의 90% 차지
   - 월별 OpenAI 지출 추적 후 크레딧 조정

2. **자동 수집 기능 주의**
   - 하루 3회 × 30일 = 월 90회 API 호출
   - 크레딧 소진 속도 빠름, 사용자 교육 필요

3. **크레딧 부족 시 UX**
   - 기능 실행 전 예상 크레딧 표시
   - 부족 시 명확한 안내 및 충전 유도

4. **서버 리소스 확장 계획**
   - Pro 유저 증가 시 EC2 인스턴스 업그레이드 필요
   - 비용 대비 효율 계산 필수

---

## 8. 다음 단계

1. **사용자 확인 필요 사항**
   - Q4: 크레딧 리셋 주기 (결제일 vs 월초)
   - Tier별 월 크레딧 수 최종 결정
   - 크레딧 단가 (수동 충전 시)

2. **개발 착수 전 준비**
   - DB 스키마 설계 확정
   - API 응답에 크레딧 정보 추가 (예상 차감, 잔액)
   - 프론트엔드 UI 목업 확인

3. **파일럿 테스트**
   - God tier(관리자)로 1-2주 테스트
   - 실제 크레딧 소비 패턴 분석
   - 필요 시 크레딧 조정

---

**작성일**: 2026-01-29  
**작성자**: AI Assistant (Claude Sonnet 4.5)  
**검토 필요**: 사용자 확인 후 구현 착수
