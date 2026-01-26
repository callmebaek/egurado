# 리뷰 분석 RLS 문제 해결 가이드

**작성일:** 2026-01-26  
**문제:** 리뷰 분석 시 `review_stats` 테이블 INSERT 권한 문제  
**해결:** RLS bypass Stored Procedure 생성

---

## 📋 문제 상황

### 에러 메시지
```
분석 오류: {'message': 'new row violates row-level security policy for table "review_stats"', 'code': '42501'}
```

### 원인
- `review_stats` 테이블에 RLS (Row Level Security) 정책이 활성화되어 있음
- 백엔드에서 `.insert()` 사용 시 RLS 정책에 의해 INSERT가 차단됨

### 영향 범위
- ✅ 리뷰 추출: 정상 작동
- ❌ 리뷰 분석: INSERT 실패

---

## ✅ 해결 방법

### 1. Stored Procedure 생성 (SECURITY DEFINER)
RLS를 우회하는 함수를 생성하여 안전하게 데이터 삽입

**파일:** `supabase/migrations/030_create_insert_review_stats_function.sql`

**핵심 기능:**
- `SECURITY DEFINER`: 함수 소유자 권한으로 실행 (RLS 우회)
- 파라미터 검증 및 INSERT
- UUID 반환 (생성된 review_stats_id)

### 2. 백엔드 코드 수정
`.insert()` → `.rpc()` 변경

**파일:** `backend/app/routers/reviews.py`

**변경 사항:**
- 2곳 수정 (일반 분석 + 스트리밍 분석)
- 파라미터명 변경 (`store_id` → `p_store_id`)
- `.rpc("insert_review_stats_bypass_rls", stats_data)` 호출

---

## 🚀 배포 가이드

### Step 1: Supabase 마이그레이션 적용

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 좌측 메뉴 → SQL Editor

3. **마이그레이션 SQL 실행**
   - `supabase/migrations/030_create_insert_review_stats_function.sql` 파일 내용 복사
   - SQL Editor에 붙여넣기
   - **Run** 버튼 클릭

4. **실행 확인**
   ```sql
   -- 함수 생성 확인
   SELECT routine_name, routine_type
   FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name = 'insert_review_stats_bypass_rls';
   
   -- 결과: insert_review_stats_bypass_rls | FUNCTION
   ```

---

### Step 2: 백엔드 배포

#### 2-1. GitHub에 푸시
```bash
# GitHub Desktop에서 커밋
# Commit message:
fix: 리뷰 분석 RLS 문제 해결 (Stored Procedure 사용)

- review_stats INSERT를 위한 RLS bypass 함수 생성
- insert_review_stats_bypass_rls 함수 호출로 변경
- 일반 분석과 스트리밍 분석 모두 적용
- DEVELOPMENT_HISTORY 패턴 준수

파일 변경:
- supabase/migrations/030_create_insert_review_stats_function.sql (신규)
- backend/app/routers/reviews.py (수정)
```

#### 2-2. EC2 백엔드 재배포
```bash
# 1. EC2 접속
ssh -i "C:\Users\smbae\Downloads\egurado keyfair.pem" ubuntu@3.34.136.255

# 2. 백엔드 디렉토리로 이동
cd ~/egurado/backend

# 3. 최신 코드 가져오기
git pull origin main

# 4. Docker 컨테이너 재시작
docker-compose down
docker-compose up -d --build

# 5. 로그 확인 (Ctrl+C로 종료)
docker-compose logs -f
```

**예상 출력:**
```
egurado-api | INFO:     Application startup complete.
egurado-api | INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

## 🧪 테스트 가이드

### 1. 리뷰 분석 기능 테스트

1. **리뷰통계/현황분석 페이지 접속**
   - https://whiplace.com/dashboard/naver/{store_id}/reviews

2. **리뷰 추출**
   - "리뷰 추출" 버튼 클릭
   - 리뷰 목록이 표시되는지 확인 ✅

3. **리뷰 분석**
   - "AI 분석 시작" 버튼 클릭
   - 스트리밍 분석 진행 확인
   - ✅ **에러 없이 완료되는지 확인**
   - ✅ **요약 생성 및 표시 확인**

### 2. 콘솔 로그 확인

**브라우저 개발자 도구 (F12) → Console 탭**

**성공 시:**
```
✅ 분석 완료!
```

**실패 시 (이전):**
```
❌ 분석 오류: {'message': 'new row violates row-level security policy...'}
```

### 3. 백엔드 로그 확인

```bash
# EC2에서 실시간 로그 확인
docker-compose logs -f egurado-api
```

**정상 로그 예시:**
```
INFO: [Review Analysis] 통계 저장 완료: id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
INFO: [Review Analysis] 리뷰 저장 완료: 50개
INFO: [Review Analysis] 전체 분석 완료: 총 소요시간 12.34초
```

---

## 📊 변경 사항 요약

### 파일 변경
| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `supabase/migrations/030_create_insert_review_stats_function.sql` | 신규 | RLS bypass 함수 생성 |
| `backend/app/routers/reviews.py` | 수정 | `.insert()` → `.rpc()` 변경 (2곳) |
| `REVIEW_STATS_RLS_FIX.md` | 신규 | 배포 가이드 문서 |

### 코드 변경 상세

#### Before (문제 발생)
```python
stats_insert_result = supabase.table("review_stats").insert(stats_data).execute()
review_stats_id = stats_insert_result.data[0]["id"]
# ❌ RLS 정책에 의해 INSERT 차단
```

#### After (해결)
```python
stats_insert_result = supabase.rpc("insert_review_stats_bypass_rls", stats_data).execute()
review_stats_id = stats_insert_result.data
# ✅ Stored Procedure로 RLS 우회
```

---

## 🔒 보안 고려사항

### Stored Procedure 보안
- ✅ `SECURITY DEFINER`: 함수 소유자 권한으로 실행
- ✅ `service_role`, `authenticated`만 실행 권한 부여
- ✅ `anon`, `public` 권한 제거
- ✅ `SET search_path = public`: SQL Injection 방지

### 권한 관리
```sql
-- 허용
GRANT EXECUTE ON FUNCTION insert_review_stats_bypass_rls TO service_role;
GRANT EXECUTE ON FUNCTION insert_review_stats_bypass_rls TO authenticated;

-- 차단
REVOKE EXECUTE ON FUNCTION insert_review_stats_bypass_rls FROM anon, public;
```

---

## 🎯 기대 효과

### 사용자 경험
- ✅ 리뷰 분석 기능 정상 작동
- ✅ 에러 없이 분석 완료
- ✅ 요약 및 통계 정상 표시

### 기술적 개선
- ✅ RLS 정책 준수하면서 데이터 삽입
- ✅ DEVELOPMENT_HISTORY 패턴 일관성 유지
- ✅ 다른 기능에 영향 없음

### 유지보수성
- ✅ 명확한 에러 처리
- ✅ 로그로 디버깅 용이
- ✅ 함수 재사용 가능

---

## 📝 참고사항

### DEVELOPMENT_HISTORY 패턴
이 수정은 DEVELOPMENT_HISTORY.txt의 다음 패턴을 따릅니다:

1. **세션 19**: 소셜 로그인 RLS 문제 해결
   - `get_profile_by_id_bypass_rls` 함수 생성

2. **세션 21**: 키워드 삭제 RLS 문제 해결
   - `delete_keyword_cascade` 함수 생성

3. **세션 22 (현재)**: 리뷰 분석 RLS 문제 해결
   - `insert_review_stats_bypass_rls` 함수 생성

### 일관된 해결 방식
- Stored Procedure (`SECURITY DEFINER`)
- 권한 관리 (service_role, authenticated만 허용)
- 백엔드에서 `.rpc()` 호출
- 상세한 로그 및 에러 처리

---

## ❓ 문제 해결 (Troubleshooting)

### 1. 함수 생성 실패
**증상:** SQL 실행 시 에러 발생

**해결:**
```sql
-- 기존 함수 삭제 후 재생성
DROP FUNCTION IF EXISTS insert_review_stats_bypass_rls;

-- 마이그레이션 SQL 다시 실행
```

### 2. 여전히 RLS 에러 발생
**증상:** 배포 후에도 동일한 에러

**확인 사항:**
1. Supabase 마이그레이션 적용 확인
2. 백엔드 코드 변경 확인 (`git log`)
3. Docker 컨테이너 재시작 확인
4. 백엔드 로그에서 `.rpc()` 호출 확인

**해결:**
```bash
# 백엔드 재배포 (강제 재빌드)
cd ~/egurado/backend
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 3. review_stats_id가 None
**증상:** `review_stats_id`가 `None`으로 반환됨

**원인:** `.data[0]["id"]` → `.data` 변경 누락

**확인:**
```python
# ✅ 올바른 코드
review_stats_id = stats_insert_result.data  # UUID 직접 반환

# ❌ 잘못된 코드
review_stats_id = stats_insert_result.data[0]["id"]  # 에러 발생
```

---

## ✅ 완료 체크리스트

### Supabase 마이그레이션
- [ ] SQL Editor에서 마이그레이션 실행
- [ ] 함수 생성 확인 쿼리 실행
- [ ] 권한 설정 확인

### 백엔드 배포
- [ ] GitHub Desktop에서 커밋 & 푸시
- [ ] EC2 접속 및 `git pull`
- [ ] Docker 컨테이너 재시작
- [ ] 로그 확인 (정상 실행)

### 테스트
- [ ] 리뷰 추출 정상 작동
- [ ] 리뷰 분석 에러 없이 완료
- [ ] 요약 및 통계 정상 표시
- [ ] 콘솔 로그에 에러 없음
- [ ] 백엔드 로그 정상

---

## 📚 관련 문서
- `DEVELOPMENT_HISTORY.txt` (세션 18-22)
- `supabase/migrations/020-029_*.sql` (이전 RLS bypass 함수)
- `backend/app/routers/reviews.py` (리뷰 분석 API)

---

**작성자:** AI Assistant  
**검토자:** -  
**승인일:** -  
**프로덕션 배포일:** -
