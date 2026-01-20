# ⚡ WhiPlace 인증 시스템 빠른 시작 가이드

> 5분 안에 시스템을 실행하세요!

---

## 🚀 1단계: 환경변수 설정 (2분)

### 백엔드 설정
```bash
cd backend
cp env.example .env
```

`.env` 파일을 열고 다음 값들을 **반드시** 설정하세요:
- `SUPABASE_URL` - Supabase 대시보드에서 확인
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 대시보드에서 확인
- `JWT_SECRET_KEY` - 랜덤한 긴 문자열로 변경 (예: `super-secret-key-12345-change-this-now`)

**카카오/네이버 키는 이미 설정되어 있습니다!**

### 프론트엔드 설정
```bash
cd frontend
cp env.example .env.local
```

`.env.local` 파일을 열고 다음 값들을 설정하세요:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 대시보드에서 확인
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 대시보드에서 확인

**카카오/네이버 키는 이미 설정되어 있습니다!**

---

## 🗄️ 2단계: 데이터베이스 마이그레이션 (1분)

1. https://supabase.com 로그인
2. 프로젝트 선택 → **SQL Editor** 클릭
3. 다음 파일의 내용을 복사 → 붙여넣기 → **Run** 클릭

```
supabase/migrations/006_add_auth_and_onboarding_fields.sql
```

"Success" 메시지 확인!

---

## 🏃‍♂️ 3단계: 서버 실행 (2분)

### 백엔드 실행
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

✅ 브라우저에서 확인: http://localhost:8000/docs

### 프론트엔드 실행 (새 터미널)
```bash
cd frontend
npm install
npm run dev
```

✅ 브라우저에서 확인: http://localhost:3000

---

## 🎉 완료! 테스트하기

### 회원가입 테스트
1. http://localhost:3000/signup 접속
2. 이메일/비밀번호 입력
3. 약관 동의 체크
4. **회원가입** 버튼 클릭
5. 온보딩 3단계 완료
6. 대시보드 접속 성공!

### 카카오 로그인 테스트
1. http://localhost:3000/login 접속
2. **카카오로 시작하기** 클릭
3. 카카오 로그인
4. 온보딩 완료
5. 대시보드 접속!

---

## 🐛 문제 해결

### "Invalid redirect_uri" 오류 (카카오/네이버)

**개발 환경에서는** Redirect URI를 `localhost`로 변경하세요:

**backend/.env**
```env
KAKAO_REDIRECT_URI=http://localhost:3000/auth/callback/kakao
NAVER_REDIRECT_URI=http://localhost:3000/auth/callback/naver
```

**frontend/.env.local**
```env
NEXT_PUBLIC_KAKAO_REDIRECT_URI=http://localhost:3000/auth/callback/kakao
NEXT_PUBLIC_NAVER_REDIRECT_URI=http://localhost:3000/auth/callback/naver
```

그리고 **카카오/네이버 개발자 콘솔**에서도 등록:
- 카카오: https://developers.kakao.com/console
- 네이버: https://developers.naver.com/apps

---

### CORS 오류

**backend/.env**
```env
ALLOWED_ORIGINS=http://localhost:3000
```

백엔드 재시작!

---

## 📚 더 자세한 정보

- 상세 가이드: `AUTH_SETUP_GUIDE.md`
- 구현 요약: `AUTH_IMPLEMENTATION_SUMMARY.md`
- API 문서: http://localhost:8000/docs

---

**즐거운 개발 되세요!** 🚀
