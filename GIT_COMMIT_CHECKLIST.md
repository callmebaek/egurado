# 🚀 GitHub Desktop 커밋 & 푸시 가이드

## ⚠️ 커밋 전 필수 체크리스트

### 1. 환경변수 파일 확인 (매우 중요!)

다음 파일들이 **절대 커밋되면 안 됩니다**:
- ❌ `backend/.env`
- ❌ `frontend/.env.local`

이 파일들에는 **민감한 정보**가 포함되어 있습니다:
- Supabase Service Role Key
- JWT Secret Key
- OpenAI API Key
- 카카오/네이버 Client Secret

### 2. GitHub Desktop에서 확인하는 방법

GitHub Desktop을 열고 "Changes" 탭에서:
- ✅ `backend/.env` 파일이 **보이지 않아야** 합니다
- ✅ `frontend/.env.local` 파일이 **보이지 않아야** 합니다

**만약 보인다면:**
1. 해당 파일 체크 해제
2. 우클릭 → "Ignore file" 선택

---

## 📝 커밋할 파일 목록

### 새로 생성된 파일들:

#### 데이터베이스
- ✅ `supabase/migrations/006_add_auth_and_onboarding_fields.sql`

#### 백엔드
- ✅ `backend/app/services/auth_service.py`
- ✅ `backend/app/routers/auth.py`
- ✅ `backend/app/models/schemas.py` (수정됨)
- ✅ `backend/app/main.py` (수정됨)
- ✅ `backend/requirements.txt` (수정됨)
- ✅ `backend/env.example` (수정됨)

#### 프론트엔드
- ✅ `frontend/lib/auth-context.tsx`
- ✅ `frontend/lib/social-login.ts`
- ✅ `frontend/app/login/page.tsx` (수정됨)
- ✅ `frontend/app/signup/page.tsx`
- ✅ `frontend/app/onboarding/page.tsx`
- ✅ `frontend/app/auth/callback/kakao/page.tsx`
- ✅ `frontend/app/auth/callback/naver/page.tsx`
- ✅ `frontend/app/layout.tsx` (수정됨)
- ✅ `frontend/env.example` (수정됨)

#### 문서
- ✅ `AUTH_SETUP_GUIDE.md`
- ✅ `AUTH_IMPLEMENTATION_SUMMARY.md`
- ✅ `AUTH_QUICK_START.md`
- ✅ `MIGRATION_SQL.md`
- ✅ `SETUP_COMPLETE.md`
- ✅ `GIT_COMMIT_CHECKLIST.md` (이 파일)

#### 수정된 파일
- ✅ `backend/app/services/naver_auth.py` (인코딩 문제 수정)

---

## 🖥️ GitHub Desktop 사용 방법

### 1단계: GitHub Desktop 열기
1. GitHub Desktop 실행
2. 현재 레포지토리: `egurado` 선택 확인

### 2단계: 변경사항 확인
1. 왼쪽 "Changes" 탭 확인
2. 변경된 파일 목록 검토

### 3단계: 민감한 파일 제외 (중요!)
**다음 파일들이 보이면 체크 해제:**
- ❌ `backend/.env`
- ❌ `frontend/.env.local`
- ❌ `backend/.env.setup_template`
- ❌ `frontend/.env.local.setup_template`
- ❌ 기타 `.env*` 파일

### 4단계: 커밋 메시지 작성
**Summary (요약):**
```
feat: 이메일/카카오/네이버 로그인 및 온보딩 시스템 구축
```

**Description (상세 설명):**
```
✨ 새로운 기능
- 이메일 회원가입/로그인 (Supabase Auth + JWT)
- 카카오 소셜 로그인 (OAuth 2.0)
- 네이버 소셜 로그인 (OAuth 2.0)
- 3단계 온보딩 프로세스 (포지션, 마케팅 경험, 대행사 경험)

🗄️ 데이터베이스
- profiles 테이블에 인증 및 온보딩 필드 추가
- auth_provider, user_position, marketing_experience 등

🎨 프론트엔드
- 로그인/회원가입 페이지
- 온보딩 페이지 (3단계)
- OAuth 콜백 페이지 (카카오, 네이버)
- AuthProvider 컨텍스트

🔐 보안
- JWT 토큰 기반 인증
- Bcrypt 비밀번호 해싱
- CSRF 방어 (네이버 state)
- Row Level Security (RLS)

📚 문서
- 상세 설정 가이드
- 빠른 시작 가이드
- 구현 요약
- 트러블슈팅
```

### 5단계: 커밋
1. 왼쪽 하단 "Commit to main" 버튼 클릭
2. 커밋 완료 확인

### 6단계: 푸시
1. 상단 "Push origin" 버튼 클릭
2. GitHub에 업로드 완료!

---

## 🌐 배포 후 작업

### Vercel/Netlify 등 배포 플랫폼에서:

1. **환경변수 설정**
   - Supabase URL, Keys
   - JWT Secret Key
   - 카카오/네이버 API Keys
   - OpenAI API Key

2. **Redirect URI 변경**
   - 카카오 개발자 콘솔: `https://whiplace.com/auth/callback/kakao`
   - 네이버 개발자 센터: `https://whiplace.com/auth/callback/naver`

3. **백엔드 환경변수 업데이트**
   ```env
   KAKAO_REDIRECT_URI=https://whiplace.com/auth/callback/kakao
   NAVER_REDIRECT_URI=https://whiplace.com/auth/callback/naver
   ALLOWED_ORIGINS=https://whiplace.com
   ```

4. **프론트엔드 환경변수 업데이트**
   ```env
   NEXT_PUBLIC_API_URL=https://api.whiplace.com
   NEXT_PUBLIC_KAKAO_REDIRECT_URI=https://whiplace.com/auth/callback/kakao
   NEXT_PUBLIC_NAVER_REDIRECT_URI=https://whiplace.com/auth/callback/naver
   ```

---

## ✅ 최종 체크리스트

커밋 & 푸시 전에 확인:
- [ ] `.env` 파일들이 커밋 목록에 없음
- [ ] `env.example` 파일만 커밋됨
- [ ] 민감한 키가 코드에 하드코딩되지 않음
- [ ] 커밋 메시지 작성 완료
- [ ] 변경사항 검토 완료

푸시 후:
- [ ] GitHub에서 커밋 확인
- [ ] `.env` 파일이 GitHub에 없는지 확인
- [ ] 배포 플랫폼에서 환경변수 설정
- [ ] 카카오/네이버 Redirect URI 업데이트

---

## 🆘 문제 해결

### .env 파일이 커밋 목록에 보임
1. GitHub Desktop에서 체크 해제
2. 우클릭 → "Ignore file"
3. `.gitignore` 파일 확인

### 이미 .env를 커밋해버림
```bash
git rm --cached backend/.env
git rm --cached frontend/.env.local
git commit -m "Remove sensitive files"
git push
```

그 다음:
1. GitHub에서 모든 API 키 재발급
2. 새 키로 `.env` 파일 업데이트

---

## 🎉 완료!

커밋 & 푸시가 완료되면:
1. GitHub 레포지토리에서 확인
2. 배포 플랫폼에서 배포 시작
3. 환경변수 설정
4. 테스트!

궁금한 점이 있으면 언제든지 문의하세요! 😊
