# 매장 조회 문제 수정 검증 체크리스트

## 📋 수정 완료 항목

### ✅ 프론트엔드 수정
- [x] `frontend/app/dashboard/naver/reviews/page.tsx` - useAuth 훅 사용
- [x] `frontend/app/dashboard/naver/rank/page.tsx` - useAuth 훅 사용  
- [x] `frontend/app/dashboard/naver/competitors/page.tsx` - useAuth 훅 사용 + 백엔드 API 호출
- [x] 모든 `supabase.auth.getUser()` 호출 제거
- [x] Supabase 직접 조회를 백엔드 API 호출로 변경

### ✅ 백엔드 검증
- [x] `backend/app/core/database.py` - Service Role Key 사용 확인
- [x] `backend/app/routers/auth.py` - 소셜 로그인 Service Role Key 사용 확인
- [x] `backend/app/routers/stores.py` - Service Role Key 사용 확인

### ✅ 데이터베이스
- [x] RLS 정책 유지 (백엔드가 우회)
- [x] profiles 테이블 외래 키 제약 조건 제거 상태 유지
- [x] 마이그레이션 문서화 (`008_fix_rls_for_jwt_auth.sql`)

## 🧪 테스트 시나리오

### 시나리오 1: 이메일 로그인 (test@example.com)

**목적:** 기존 이메일 로그인 사용자의 매장 조회 확인

1. [ ] https://whiplace.com/login 접속
2. [ ] test@example.com / 비밀번호 입력
3. [ ] 로그인 성공 확인
4. [ ] 대시보드로 리다이렉트 확인
5. [ ] "네이버 플레이스 순위" 메뉴 클릭
6. [ ] **매장 목록이 표시되는지 확인** ⭐
7. [ ] 매장 선택 후 키워드 조회 확인
8. [ ] "리뷰 관리" 메뉴에서도 매장 목록 확인
9. [ ] "경쟁사 분석" 메뉴에서도 매장 목록 확인

**예상 결과:**
- ✅ 등록된 매장이 모두 표시됨
- ✅ 매장 선택 시 관련 데이터 정상 조회
- ✅ 콘솔에 에러 없음

---

### 시나리오 2: 카카오 로그인 (신규 사용자)

**목적:** 카카오 소셜 로그인 및 온보딩 플로우 확인

1. [ ] https://whiplace.com/login 접속
2. [ ] "카카오로 시작하기" 버튼 클릭
3. [ ] 카카오 로그인 페이지로 리다이렉트 확인
4. [ ] 카카오 계정으로 로그인
5. [ ] 동의 항목 확인 후 동의
6. [ ] 콜백 페이지 처리 확인 (`/auth/callback/kakao`)
7. [ ] 온보딩 페이지로 리다이렉트 확인 (`/onboarding`)
8. [ ] 온보딩 3단계 완료
   - [ ] 포지션 선택 (사장님/대행사)
   - [ ] 마케팅 경험 선택
   - [ ] 대행사 경험 선택 (사장님인 경우)
9. [ ] 대시보드로 리다이렉트 확인
10. [ ] "매장 연결" 메뉴에서 매장 등록
11. [ ] 등록한 매장이 다른 메뉴에서 표시되는지 확인

**예상 결과:**
- ✅ 카카오 로그인 성공
- ✅ 온보딩 페이지 표시
- ✅ 온보딩 완료 후 대시보드 이동
- ✅ 매장 등록 및 조회 정상 작동

---

### 시나리오 3: 카카오 로그인 (기존 사용자)

**목적:** 재로그인 시 온보딩 건너뛰기 확인

1. [ ] 로그아웃
2. [ ] 다시 카카오 로그인
3. [ ] **온보딩 페이지를 건너뛰고 대시보드로 바로 이동하는지 확인** ⭐
4. [ ] 이전에 등록한 매장이 표시되는지 확인

**예상 결과:**
- ✅ 온보딩 건너뛰기
- ✅ 대시보드 직접 이동
- ✅ 기존 매장 데이터 유지

---

### 시나리오 4: 네이버 로그인 (신규 사용자)

**목적:** 네이버 소셜 로그인 및 온보딩 플로우 확인

1. [ ] https://whiplace.com/login 접속
2. [ ] "네이버로 시작하기" 버튼 클릭
3. [ ] 네이버 로그인 페이지로 리다이렉트 확인
4. [ ] 네이버 계정으로 로그인
5. [ ] 동의 항목 확인 후 동의
6. [ ] 콜백 페이지 처리 확인 (`/auth/callback/naver`)
7. [ ] 온보딩 페이지로 리다이렉트 확인
8. [ ] 온보딩 3단계 완료
9. [ ] 대시보드로 리다이렉트 확인
10. [ ] 매장 등록 및 조회 확인

**예상 결과:**
- ✅ 네이버 로그인 성공
- ✅ 온보딩 페이지 표시
- ✅ 온보딩 완료 후 대시보드 이동
- ✅ 매장 등록 및 조회 정상 작동

---

### 시나리오 5: 네이버 로그인 (기존 사용자)

**목적:** 재로그인 시 온보딩 건너뛰기 확인

1. [ ] 로그아웃
2. [ ] 다시 네이버 로그인
3. [ ] 온보딩 페이지를 건너뛰고 대시보드로 바로 이동하는지 확인
4. [ ] 이전에 등록한 매장이 표시되는지 확인

**예상 결과:**
- ✅ 온보딩 건너뛰기
- ✅ 대시보드 직접 이동
- ✅ 기존 매장 데이터 유지

---

## 🔍 디버깅 가이드

### 매장이 표시되지 않는 경우

1. **브라우저 콘솔 확인**
   ```
   F12 → Console 탭
   ```
   - API 호출 에러 확인
   - 네트워크 요청 상태 확인

2. **네트워크 탭 확인**
   ```
   F12 → Network 탭
   ```
   - `/api/v1/stores/?user_id=...` 요청 확인
   - 응답 상태 코드 확인 (200이어야 함)
   - 응답 데이터 확인

3. **localStorage 확인**
   ```javascript
   // 브라우저 콘솔에서 실행
   console.log('Token:', localStorage.getItem('access_token'))
   ```
   - JWT 토큰이 저장되어 있는지 확인

4. **백엔드 로그 확인**
   ```bash
   # EC2에서 실행
   docker-compose logs -f backend
   ```
   - API 요청 로그 확인
   - 에러 메시지 확인

### 소셜 로그인이 작동하지 않는 경우

1. **카카오 개발자 콘솔 확인**
   - https://developers.kakao.com/console/app
   - Redirect URI 설정 확인
   - JavaScript SDK 도메인 설정 확인

2. **네이버 개발자 센터 확인**
   - https://developers.naver.com/apps
   - Callback URL 설정 확인

3. **환경 변수 확인**
   ```bash
   # 백엔드 (EC2)
   docker-compose exec backend printenv | grep KAKAO
   docker-compose exec backend printenv | grep NAVER
   
   # 프론트엔드 (Vercel)
   # Vercel Dashboard → Settings → Environment Variables
   ```

## 📊 예상 API 응답

### 매장 목록 조회 성공
```json
{
  "status": "success",
  "stores": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "place_id": "1234567890",
      "name": "성수 카페",
      "category": "카페",
      "address": "서울시 성동구...",
      "platform": "naver",
      "status": "active",
      "created_at": "2026-01-20T..."
    }
  ],
  "total_count": 1
}
```

### 카카오 로그인 성공
```json
{
  "access_token": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "user@kakao.com",
    "display_name": "홍길동",
    "auth_provider": "kakao",
    "subscription_tier": "free",
    "onboarding_completed": false
  },
  "onboarding_required": true
}
```

## ✅ 최종 확인 사항

- [ ] test@example.com 로그인 후 매장 조회 정상
- [ ] 카카오 신규 로그인 → 온보딩 → 매장 등록 → 매장 조회 정상
- [ ] 카카오 재로그인 → 온보딩 건너뛰기 → 매장 조회 정상
- [ ] 네이버 신규 로그인 → 온보딩 → 매장 등록 → 매장 조회 정상
- [ ] 네이버 재로그인 → 온보딩 건너뛰기 → 매장 조회 정상
- [ ] 브라우저 콘솔에 에러 없음
- [ ] 백엔드 로그에 에러 없음

## 🎉 성공 기준

모든 시나리오에서:
1. ✅ 로그인 성공
2. ✅ 매장 목록 정상 표시
3. ✅ 매장 선택 후 데이터 조회 정상
4. ✅ 에러 없음

---

**작성일:** 2026-01-20  
**작성자:** AI Assistant  
**관련 문서:** FIX_AUTH_STORES_ISSUE.md
