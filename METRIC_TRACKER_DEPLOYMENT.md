# 주요지표 추적 기능 배포 가이드 (Step-by-Step)

## 📋 배포 체크리스트

- [ ] Step 1: 데이터베이스 마이그레이션
- [ ] Step 2: 백엔드 환경 변수 설정
- [ ] Step 3: 백엔드 의존성 설치
- [ ] Step 4: 백엔드 서버 재시작
- [ ] Step 5: 프론트엔드 확인
- [ ] Step 6: 기능 테스트
- [ ] Step 7: 스케줄러 동작 확인

---

## Step 1: 데이터베이스 마이그레이션 🗄️

### 방법 1: Supabase 대시보드 (추천)

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭
   - "New query" 버튼 클릭

3. **마이그레이션 파일 실행**
   ```
   파일 위치: supabase/migrations/011_add_metric_tracker.sql
   
   - 파일 내용 전체 복사
   - SQL Editor에 붙여넣기
   - "RUN" 버튼 클릭 (또는 Ctrl+Enter)
   ```

4. **성공 확인**
   ```
   ✅ "Success. No rows returned" 메시지 확인
   ```

5. **테이블 생성 확인**
   - 왼쪽 메뉴 "Table Editor" 클릭
   - `metric_trackers` 테이블 확인
   - `daily_metrics` 테이블 확인

### 방법 2: Supabase CLI

```bash
# Supabase CLI가 설치되어 있다면
cd supabase
supabase db push
```

---

## Step 2: 백엔드 환경 변수 설정 🔐

### 필수 환경 변수 (이미 설정됨)

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

### 선택적 환경 변수 (알림 기능용)

`backend/.env` 파일에 추가:

```env
# 카카오톡 비즈메시지 (선택)
KAKAO_MESSAGE_API_KEY=your_kakao_api_key
KAKAO_SENDER_KEY=your_sender_key

# SMS API - NCP SENS 또는 Twilio (선택)
SMS_API_KEY=your_sms_api_key
SMS_API_SECRET=your_sms_api_secret
SMS_SENDER_NUMBER=01012345678

# 이메일 SMTP (선택)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@whiplace.com
```

**⚠️ 참고**: 알림 기능은 선택사항입니다. 환경 변수가 없어도 추적 기능은 정상 작동합니다.

---

## Step 3: 백엔드 의존성 설치 📦

```bash
cd backend

# pytz 설치 (타임존 처리용)
pip install pytz

# 또는 requirements.txt에 추가 후
pip install -r requirements.txt
```

**의존성 확인**:
```bash
pip list | grep pytz
# pytz 2024.x 출력되면 OK
```

---

## Step 4: 백엔드 서버 재시작 🔄

### 로컬 개발 환경

```bash
cd backend

# 서버 재시작
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**성공 확인**:
```
✅ [OK] Egurado API started
✅ [OK] Scheduler started
✅   - Rank check: 3 AM daily (KST)
✅   - Review sync: 6 AM daily (KST)
✅   - Metric tracking: Every hour (KST)
```

### 프로덕션 환경 (Vercel, Railway 등)

```bash
# Git commit & push
git add .
git commit -m "feat: 주요지표 추적 기능 추가"
git push origin main

# 자동으로 재배포됨
```

---

## Step 5: 프론트엔드 확인 🎨

### 개발 환경

```bash
cd frontend

# 의존성 확인 (recharts)
npm list recharts
# recharts@2.x.x 출력되면 OK

# 없다면 설치
npm install recharts

# 개발 서버 시작
npm run dev
```

### 프론트엔드 접속

```
http://localhost:3000/dashboard/naver/metrics-tracker
```

**확인 사항**:
- ✅ 사이드바에 "주요지표 추적" 메뉴가 보임 (플레이스 순위 아래)
- ✅ 페이지가 정상적으로 로드됨
- ✅ Tier 정보가 표시됨 (Free/Basic/Pro/God)
- ✅ "추적 설정 추가" 버튼이 보임

---

## Step 6: 기능 테스트 🧪

### 6-1. 추적 설정 생성 테스트

1. **"추적 설정 추가" 버튼 클릭**

2. **매장 선택**
   - 드롭다운에서 네이버 플레이스 매장 선택
   - (없으면 먼저 "내 매장 등록"에서 매장 등록)

3. **키워드 선택**
   - 기존 키워드 선택
   - 또는 "키워드 추가" 클릭하여 새 키워드 입력

4. **생성하기 클릭**
   - 성공 메시지: "추적 설정이 생성되었습니다"
   - 추적 목록에 새 항목 표시됨

### 6-2. 즉시 지표 수집 테스트 (API 직접 호출)

```bash
# 1. 인증 토큰 가져오기 (브라우저 개발자 도구 > Application > Local Storage)
TOKEN="your_access_token"

# 2. 추적 설정 ID 확인 (브라우저에서 생성된 추적의 ID 복사)
TRACKER_ID="tracker_uuid"

# 3. 즉시 수집 API 호출
curl -X POST "http://localhost:8000/api/v1/metrics/trackers/$TRACKER_ID/collect" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**성공 응답 예시**:
```json
{
  "id": "...",
  "tracker_id": "...",
  "rank": 3,
  "visitor_review_count": 125,
  "blog_review_count": 48,
  "collection_date": "2026-01-21",
  "collected_at": "2026-01-21T13:30:00+09:00"
}
```

### 6-3. 지표 확인 테스트

1. **추적 목록에서 "지표 보기" 버튼 클릭**

2. **차트 확인**
   - 순위 변동 라인 차트 표시
   - 방문자리뷰 라인 차트 표시
   - 블로그리뷰 라인 차트 표시

3. **테이블 확인**
   - 날짜별 데이터 표시
   - 순위, 순위 변동, 리뷰수 표시

### 6-4. 삭제 테스트

1. **추적 항목의 휴지통 아이콘 클릭**
2. **확인 대화상자에서 "확인" 클릭**
3. **성공 메시지**: "추적 설정이 삭제되었습니다"

---

## Step 7: 스케줄러 동작 확인 ⏰

### 백엔드 로그 확인

```bash
# 백엔드 터미널에서 확인
# 매 시간 정각에 다음 로그가 출력되어야 함:

[2026-01-21 14:00:00] 📊 주요지표 자동 수집 시작
[INFO] 3 trackers scheduled for metric collection
📊 '강남 카페' (매장: 스타벅스 강남점) 지표 수집 중...
[OK] '강남 카페' (매장: 스타벅스 강남점) 지표 수집 완료
[2026-01-21 14:00:15] [COLLECT] 주요지표 수집 완료 - 성공: 3, 실패: 0
```

### 다음 수집 시간 확인

**Supabase 대시보드**에서:
```sql
SELECT 
  id,
  keyword_id,
  next_collection_at,
  last_collected_at,
  is_active
FROM metric_trackers
ORDER BY next_collection_at;
```

**확인 사항**:
- ✅ `next_collection_at`이 미래 시간으로 설정됨
- ✅ `last_collected_at`이 최근 시간으로 업데이트됨
- ✅ `is_active`가 `true`임

---

## 🐛 트러블슈팅

### 문제 1: 테이블 생성 실패

**증상**:
```
ERROR: relation "metric_trackers" already exists
```

**해결**:
- 이미 생성되어 있음. 무시해도 됨.
- 완전히 새로 시작하려면:
  ```sql
  DROP TABLE IF EXISTS daily_metrics;
  DROP TABLE IF EXISTS metric_trackers;
  -- 그 다음 마이그레이션 재실행
  ```

### 문제 2: 백엔드 서버 시작 안 됨

**증상**:
```
ModuleNotFoundError: No module named 'pytz'
```

**해결**:
```bash
pip install pytz
```

### 문제 3: 프론트엔드에서 404 에러

**증상**:
```
POST http://localhost:8000/api/v1/metrics/trackers 404
```

**해결**:
1. 백엔드 서버가 실행 중인지 확인
2. `backend/app/main.py`에 라우터가 등록되어 있는지 확인:
   ```python
   from app.routers.metric_tracker import router as metric_tracker_router
   app.include_router(metric_tracker_router, prefix="/api/v1/metrics", tags=["Metric Tracker"])
   ```
3. 백엔드 서버 재시작

### 문제 4: 차트가 안 보임

**증상**:
- 데이터는 있는데 차트가 빈 화면

**해결**:
```bash
cd frontend
npm install recharts
npm run dev
```

### 문제 5: Tier 제한이 안 먹힘

**증상**:
- Free 플랜인데 여러 개 추적 설정 가능

**해결**:
1. `profiles` 테이블에서 `subscription_tier` 확인:
   ```sql
   SELECT id, email, subscription_tier 
   FROM profiles 
   WHERE id = 'your_user_id';
   ```
2. 소문자로 저장되어 있는지 확인 (free, basic, pro, god)
3. 잘못되어 있다면 수정:
   ```sql
   UPDATE profiles 
   SET subscription_tier = 'pro' 
   WHERE id = 'your_user_id';
   ```

---

## ✅ 배포 완료 체크리스트

배포가 완료되었는지 최종 확인:

- [ ] 데이터베이스에 `metric_trackers`, `daily_metrics` 테이블 존재
- [ ] 백엔드 서버 정상 시작 (스케줄러 포함)
- [ ] 프론트엔드에서 "주요지표 추적" 메뉴 보임
- [ ] 추적 설정 생성 가능
- [ ] 즉시 수집 테스트 성공
- [ ] 차트 및 테이블 정상 표시
- [ ] Tier별 제한 정상 작동
- [ ] 백엔드 로그에 스케줄러 메시지 출력

---

## 🎉 다음 단계

배포가 완료되었다면:

1. **프로덕션 환경에 배포**
   ```bash
   git add .
   git commit -m "feat: 주요지표 추적 기능 추가"
   git push origin main
   ```

2. **사용자에게 공지**
   - 새 기능 안내
   - 사용 방법 가이드 제공

3. **모니터링**
   - 백엔드 로그 확인 (매 시간 정각)
   - 데이터베이스 용량 모니터링
   - 사용자 피드백 수집

4. **향후 개선**
   - 알림 기능 실제 연동
   - 알림 설정 UI 추가
   - 경쟁 매장 비교 기능
   - AI 인사이트 제공

---

**문의사항이나 문제가 발생하면 언제든 연락주세요!** 🚀
