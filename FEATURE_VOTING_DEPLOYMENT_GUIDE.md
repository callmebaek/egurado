# 신규 기능 투표 시스템 배포 가이드

## 📋 개요

사용자들이 원하는 신규 기능에 투표할 수 있는 시스템입니다.
- 투표 결과는 모든 사용자에게 공개
- 각 기능당 1번만 투표 가능
- 투표 수는 실시간으로 집계

---

## 🗂️ 구현 파일

### 1. 데이터베이스 (Supabase)
- `supabase/migrations/032_create_feature_votes.sql`

### 2. 백엔드 (FastAPI)
- `backend/app/routers/votes.py` (신규)
- `backend/app/main.py` (수정: 라우터 등록)

### 3. 프론트엔드 (Next.js)
- `frontend/app/dashboard/feature-voting/page.tsx` (신규)
- `frontend/lib/config.ts` (수정: API 엔드포인트 추가)
- `frontend/components/layout/Sidebar.tsx` (수정: 투표 배지 및 링크)

---

## 🚀 배포 순서

### 1단계: Supabase 마이그레이션 적용

1. Supabase Dashboard 접속
2. SQL Editor 열기
3. `supabase/migrations/032_create_feature_votes.sql` 파일 내용 복사
4. SQL Editor에 붙여넣기
5. **Run** 버튼 클릭

**확인 쿼리:**
```sql
-- 테이블 생성 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'feature_votes';

-- RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'feature_votes';
```

**예상 결과:**
- `feature_votes` 테이블 존재
- 3개의 RLS 정책 존재 (SELECT, INSERT)

---

### 2단계: 백엔드 배포 (EC2)

#### 2-1. GitHub에 커밋 & 푸시

```bash
# GitHub Desktop 사용
# 또는 터미널에서:
git add .
git commit -m "feat: 신규 기능 투표 시스템 구현

- feature_votes 테이블 생성 (RLS 적용)
- 투표 API 구현 (GET /api/v1/votes/features, POST /api/v1/votes/features/{feature_key})
- 투표 페이지 구현 (카드 기반 그리드 레이아웃)
- 사이드바 메뉴 수정 (준비중 → 투표 배지)
- 독립적인 기능으로 다른 기능에 영향 없음"

git push origin main
```

#### 2-2. EC2 서버 배포

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

# 5. 로그 확인
docker-compose logs -f

# 정상 로그 예시:
# ✅ [OK] Egurado API started
# ✅ INFO: Application startup complete.
```

#### 2-3. API 테스트

```bash
# 헬스체크
curl https://api.whiplace.com/

# 투표 API 테스트 (인증 필요)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.whiplace.com/api/v1/votes/features
```

---

### 3단계: 프론트엔드 배포 (Vercel)

#### 자동 배포
GitHub에 푸시하면 Vercel이 자동으로 배포합니다.

```bash
# GitHub Desktop에서 커밋 & 푸시
# 또는 터미널에서:
git push origin main
```

#### 배포 확인
1. Vercel Dashboard 접속
2. 배포 상태 확인 (Building → Ready)
3. 배포 완료 후 사이트 접속

---

## ✅ 테스트 체크리스트

### 데이터베이스
- [ ] `feature_votes` 테이블 생성 확인
- [ ] RLS 정책 적용 확인
- [ ] 인덱스 생성 확인
- [ ] UNIQUE 제약 조건 확인

### 백엔드 API
- [ ] GET `/api/v1/votes/features` - 투표 현황 조회
- [ ] POST `/api/v1/votes/features/{feature_key}` - 투표하기
- [ ] GET `/api/v1/votes/my-votes` - 내 투표 목록
- [ ] 중복 투표 방지 (409 Conflict)
- [ ] 인증 없이 접근 시 401 에러

### 프론트엔드
- [ ] 사이드바에서 "투표" 배지 표시 확인
- [ ] "투표" 메뉴 클릭 시 `/dashboard/feature-voting` 페이지 이동
- [ ] 투표 페이지 로드 (14개 기능 표시)
- [ ] 카테고리 필터 작동 (전체/네이버/카카오/구글)
- [ ] 투표 버튼 클릭 → 투표 완료
- [ ] 투표 후 "참여함" 표시
- [ ] 투표 수 실시간 업데이트
- [ ] 중복 투표 시 "이미 투표하신 기능입니다" 알림
- [ ] 반응형 디자인 (모바일/태블릿/PC)

### 다른 기능 영향 확인
- [ ] 대시보드 정상 작동
- [ ] 플레이스 순위조회 정상 작동
- [ ] 주요지표 추적 정상 작동
- [ ] 리뷰 분석 정상 작동
- [ ] 모든 기존 기능 정상 작동

---

## 🎨 UI/UX 특징

### 투표 페이지
- **그라디언트 배경**: 블루-화이트-퍼플 그라디언트
- **카드 기반 레이아웃**: 반응형 그리드 (1열/2열/3열)
- **카테고리 배지**: 네이버(초록), 카카오(노랑), 구글(파랑)
- **투표 현황**: 프로그레스 바로 시각화
- **투표 버튼**: "빨리 만들어주세요" (초록), "별로 필요없다" (회색)
- **참여 표시**: 투표 후 "참여함" 배지

### 사이드바
- **투표 배지**: 파란색 배경, 파란색 테두리
- **메뉴명 크기**: 하위 메뉴는 작은 폰트 (text-xs)
- **클릭 동작**: 모든 "투표" 메뉴는 `/dashboard/feature-voting`로 이동

---

## 🔒 보안 고려사항

### RLS (Row Level Security)
- **SELECT**: 모든 인증된 사용자가 투표 결과 조회 가능
- **INSERT**: 인증된 사용자만 자신의 투표 등록 가능
- **UPDATE/DELETE**: 불가 (투표는 최초 1회만 유효)

### 중복 투표 방지
- **UNIQUE 제약**: (feature_key, user_id) 조합으로 중복 방지
- **백엔드 검증**: 409 Conflict 에러 반환
- **프론트엔드 처리**: 이미 투표한 경우 "참여함" 표시

---

## 📊 데이터베이스 스키마

```sql
CREATE TABLE feature_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    vote_type TEXT NOT NULL CHECK (vote_type IN ('want', 'not_needed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_user_feature_vote UNIQUE (feature_key, user_id)
);
```

---

## 🐛 트러블슈팅

### 문제 1: 투표 페이지가 로드되지 않음
**원인**: 인증 토큰 없음
**해결**: 로그인 후 다시 시도

### 문제 2: "이미 투표하신 기능입니다" 알림
**원인**: 중복 투표 시도
**해결**: 정상 동작 (각 기능당 1번만 투표 가능)

### 문제 3: 투표 수가 업데이트되지 않음
**원인**: 캐시 문제
**해결**: 페이지 새로고침 (F5)

### 문제 4: 백엔드 API 에러
**원인**: Docker 컨테이너 미재시작
**해결**:
```bash
cd ~/egurado/backend
docker-compose down
docker-compose up -d --build
```

---

## 📝 API 엔드포인트

### 1. 투표 현황 조회
```
GET /api/v1/votes/features
Authorization: Bearer {token}

Response:
[
  {
    "feature_key": "naver-kpi-dashboard",
    "want_count": 15,
    "not_needed_count": 2,
    "total_votes": 17,
    "user_voted": "want"
  },
  ...
]
```

### 2. 투표하기
```
POST /api/v1/votes/features/{feature_key}
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "vote_type": "want"  // 'want' | 'not_needed'
}

Response:
{
  "status": "success",
  "message": "투표가 완료되었습니다!",
  "vote": { ... }
}
```

### 3. 내 투표 목록
```
GET /api/v1/votes/my-votes
Authorization: Bearer {token}

Response:
{
  "votes": [ ... ],
  "total_count": 5
}
```

---

## 🎯 기대 효과

### 사용자 참여
- 사용자들이 원하는 기능을 직접 선택
- 투표 결과를 통해 개발 우선순위 결정
- 커뮤니티 중심의 제품 개발

### 개발 효율성
- 수요가 높은 기능 우선 개발
- 리소스 효율적 배분
- 사용자 만족도 향상

### 투명성
- 투표 결과 실시간 공개
- 개발 방향성 공유
- 신뢰도 향상

---

## 📌 주의사항

1. **독립적인 기능**: 다른 기능에 영향 없음
2. **RLS 적용**: 보안 고려
3. **중복 투표 방지**: UNIQUE 제약 + 백엔드 검증
4. **반응형 디자인**: 모든 디바이스 지원
5. **실시간 업데이트**: 투표 후 즉시 반영

---

**작성일**: 2026-01-28  
**작성자**: AI Assistant  
**버전**: 1.0.0  
**상태**: 배포 대기 ⏳
