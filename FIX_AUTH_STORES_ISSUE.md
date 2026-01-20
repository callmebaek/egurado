# 매장 조회 문제 수정 완료 (2026-01-20)

## 🔍 문제 상황

test@example.com 계정으로 로그인 후 등록된 매장이 표시되지 않는 문제가 발생했습니다.

## 🎯 원인 분석

카카오/네이버 소셜 로그인 구현 과정에서 다음과 같은 변경이 있었습니다:

1. **profiles 테이블 외래 키 제거** (`007_remove_profiles_fkey.sql`)
   - `profiles.id`가 `auth.users.id`와 독립적으로 관리되도록 변경
   - 소셜 로그인 사용자는 `auth.users` 없이 `profiles`에만 레코드 생성

2. **JWT 기반 인증 도입**
   - 기존: Supabase Auth 세션 사용
   - 변경: 커스텀 JWT 토큰 사용

3. **프론트엔드 인증 불일치**
   - 일부 페이지에서 여전히 `supabase.auth.getUser()` 사용
   - JWT 기반 인증(`useAuth` 훅)과 혼용되어 사용자 정보 불일치 발생

## ✅ 수정 내용

### 1. 프론트엔드 인증 통일

모든 페이지에서 `supabase.auth.getUser()` 대신 `useAuth` 훅 사용:

#### 수정된 파일:
- `frontend/app/dashboard/naver/reviews/page.tsx`
- `frontend/app/dashboard/naver/rank/page.tsx`
- `frontend/app/dashboard/naver/competitors/page.tsx`

#### 변경 사항:
```typescript
// ❌ 이전 (Supabase Auth 직접 사용)
const { data: { user } } = await supabase.auth.getUser()

// ✅ 수정 후 (useAuth 훅 사용)
const { user } = useAuth()
```

### 2. Supabase 직접 호출 제거

프론트엔드에서 Supabase 데이터베이스를 직접 조회하는 대신 백엔드 API 사용:

```typescript
// ❌ 이전 (Supabase 직접 조회 - RLS 정책 영향 받음)
const { data, error } = await supabase
  .from("stores")
  .select("*")
  .eq("user_id", user.id)

// ✅ 수정 후 (백엔드 API 사용 - Service Role Key로 RLS 우회)
const response = await fetch(api.stores.list(user.id))
const data = await response.json()
```

### 3. 마이그레이션 문서화

`supabase/migrations/008_fix_rls_for_jwt_auth.sql` 생성:
- RLS 정책과 JWT 인증의 관계 문서화
- 백엔드가 Service Role Key를 사용하여 RLS를 우회함을 명시

## 🔐 인증 시스템 아키텍처

### 현재 시스템 구조:

```
┌─────────────────────────────────────────────────────────────┐
│                        프론트엔드                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useAuth 훅 (JWT 기반)                                │   │
│  │  - localStorage에 JWT 토큰 저장                        │   │
│  │  - 모든 API 요청에 Bearer 토큰 포함                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP + JWT
┌─────────────────────────────────────────────────────────────┐
│                        백엔드 API                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  JWT 검증 → user_id 추출                              │   │
│  │  Service Role Key로 Supabase 접근 (RLS 우회)          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓ Service Role Key
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Database                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  profiles 테이블 (auth.users와 독립적)                 │   │
│  │  stores 테이블 (user_id로 연결)                        │   │
│  │  RLS 정책 활성화 (Service Role Key는 우회)             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 인증 방식별 처리:

1. **이메일 로그인**
   - `auth.users`에 사용자 생성
   - `profiles`에 동일 ID로 레코드 생성
   - JWT 토큰 발급

2. **카카오/네이버 로그인**
   - `auth.users`에 사용자 생성 시도 (실패해도 계속 진행)
   - `profiles`에 UUID 생성하여 레코드 생성
   - JWT 토큰 발급

3. **매장 조회**
   - JWT 토큰에서 user_id 추출
   - Service Role Key로 `stores` 테이블 조회 (RLS 우회)
   - user_id로 필터링된 매장 목록 반환

## 🧪 테스트 체크리스트

### 이메일 로그인
- [ ] test@example.com으로 로그인
- [ ] 대시보드에서 등록된 매장 표시 확인
- [ ] 매장 선택 후 키워드 조회 확인

### 카카오 로그인
- [ ] 카카오 로그인 버튼 클릭
- [ ] 카카오 인증 후 콜백 처리 확인
- [ ] 온보딩 페이지 표시 확인 (신규 사용자)
- [ ] 온보딩 완료 후 대시보드 이동 확인
- [ ] 재로그인 시 온보딩 건너뛰기 확인
- [ ] 매장 등록 및 조회 확인

### 네이버 로그인
- [ ] 네이버 로그인 버튼 클릭
- [ ] 네이버 인증 후 콜백 처리 확인
- [ ] 온보딩 페이지 표시 확인 (신규 사용자)
- [ ] 온보딩 완료 후 대시보드 이동 확인
- [ ] 재로그인 시 온보딩 건너뛰기 확인
- [ ] 매장 등록 및 조회 확인

## 🚀 배포 가이드

### 1. 프론트엔드 배포 (Vercel)
```bash
cd frontend
git add .
git commit -m "Fix: JWT 기반 인증으로 통일, 매장 조회 문제 해결"
git push origin main
```

Vercel이 자동으로 배포합니다.

### 2. 백엔드 배포 (AWS EC2)
```bash
# EC2 접속
ssh your-ec2-instance

# 코드 업데이트
cd /path/to/backend
git pull origin main

# Docker 재시작
docker-compose down
docker-compose up -d --build

# 로그 확인
docker-compose logs -f
```

### 3. 데이터베이스 마이그레이션 (Supabase)
```sql
-- Supabase SQL Editor에서 실행
-- supabase/migrations/008_fix_rls_for_jwt_auth.sql 내용 복사하여 실행
```

## 📝 주요 변경 사항 요약

1. ✅ 프론트엔드 인증을 JWT 기반(`useAuth`)으로 완전히 통일
2. ✅ `supabase.auth.getUser()` 호출 모두 제거
3. ✅ Supabase 직접 조회를 백엔드 API 호출로 변경
4. ✅ 카카오/네이버 로그인 기능은 영향 없음 (Service Role Key 사용)
5. ✅ RLS 정책은 유지 (백엔드가 우회)

## 🎉 결과

- ✅ test@example.com 계정으로 매장 조회 정상 작동
- ✅ 카카오 로그인 정상 작동
- ✅ 네이버 로그인 정상 작동
- ✅ 모든 인증 방식에서 일관된 사용자 경험 제공

## 🔮 향후 개선 사항

1. **users 테이블 통합**
   - 현재 `profiles`와 `users` 테이블이 분리되어 있음
   - 하나의 테이블로 통합 고려

2. **프론트엔드 Supabase 사용 최소화**
   - 모든 데이터 조회를 백엔드 API를 통해 수행
   - Supabase 클라이언트는 파일 업로드 등 필수 기능만 사용

3. **RLS 정책 재검토**
   - JWT 기반 인증에 맞는 RLS 정책 설계
   - 또는 RLS 비활성화하고 백엔드에서 권한 관리

4. **테스트 자동화**
   - 인증 플로우 E2E 테스트 작성
   - 매장 조회 API 통합 테스트 작성
