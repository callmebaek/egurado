# 🚀 빠른 시작 가이드

## 개발자용: 테스트 방법

### 1. 아이콘 생성

```bash
# 브라우저로 아이콘 생성기 열기
start chrome-extension/icons/create-icons.html  # Windows
open chrome-extension/icons/create-icons.html   # Mac

# 각 아이콘 다운로드 후 icons 폴더에 저장
# - icon16.png
# - icon48.png
# - icon128.png
```

### 2. 백엔드 서버 실행

```bash
cd backend
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 프론트엔드 서버 실행

```bash
cd frontend
npm run dev
```

### 4. Chrome 확장 프로그램 설치

1. Chrome 브라우저 열기
2. 주소창에 `chrome://extensions/` 입력
3. "개발자 모드" 켜기 (우측 상단)
4. "압축해제된 확장 프로그램을 로드합니다" 클릭
5. `chrome-extension` 폴더 선택
6. 완료!

### 5. 테스트

#### 5.1 프론트엔드 로그인
1. http://localhost:3000 접속
2. Supabase 계정으로 로그인
3. 매장 등록 (네이버 매장)

#### 5.2 네이버 로그인
1. https://new.smartplace.naver.com 접속
2. 네이버 계정으로 로그인

#### 5.3 확장 프로그램 사용
1. 브라우저 우측 상단 🔐 아이콘 클릭
2. 매장 선택
3. "세션 저장하기" 버튼 클릭
4. 성공 메시지 확인

#### 5.4 세션 상태 확인
1. http://localhost:3000/dashboard/naver/session 접속
2. 매장 선택
3. 로그인 상태 확인 (✅ 로그인됨)

#### 5.5 AI 답글 생성 테스트
1. http://localhost:3000/dashboard/naver/reviews/ai-reply 접속
2. 매장 선택
3. 리뷰 개수 선택
4. 리뷰 조회
5. AI 답글 생성 및 포스팅 테스트

## 프로덕션 배포

### 1. API URL 변경

```javascript
// chrome-extension/popup.js
const CONFIG = {
  API_BASE_URL: 'https://your-api-domain.com',
  FRONTEND_URL: 'https://your-frontend-domain.com'
}
```

### 2. manifest.json 업데이트

```json
{
  "host_permissions": [
    "https://*.naver.com/*",
    "https://your-api-domain.com/*",
    "https://your-frontend-domain.com/*"
  ]
}
```

### 3. zip 파일 생성

```bash
cd chrome-extension
zip -r chrome-extension.zip * -x "*.DS_Store" -x "__MACOSX/*"
```

### 4. 웹사이트에 배포

```bash
# 프론트엔드 public 폴더에 복사
cp chrome-extension.zip ../frontend/public/

# Vercel 재배포
cd ../frontend
vercel --prod
```

## 문제 해결

### "로그인이 필요합니다"
→ 웹사이트(localhost:3000)에 먼저 로그인하세요

### "네이버 로그인 필요"
→ 네이버 스마트플레이스에 로그인하세요

### "매장 목록을 불러올 수 없습니다"
→ 백엔드 서버가 실행 중인지 확인하세요

### CORS 오류
→ backend/app/main.py의 CORS 설정 확인

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "chrome-extension://*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 디버깅

### Chrome DevTools

```bash
# 팝업 디버깅
1. 확장 프로그램 아이콘 클릭
2. 팝업에서 우클릭 → "검사"
3. Console 확인

# Background Script 디버깅
1. chrome://extensions/ 접속
2. "네이버 세션 저장" → "Service Worker" 링크 클릭
3. Console 확인
```

### 로그 확인

```javascript
// popup.js에 이미 로그가 포함되어 있습니다
console.log('🚀 팝업 로드됨')
console.log('✅ 사용자 인증 확인:', userId)
console.log('🍪 네이버 쿠키 개수:', cookies.length)
console.log('💾 세션 저장 시작...')
```

## 체크리스트

### 개발 환경
- [ ] 백엔드 서버 실행 중 (port 8000)
- [ ] 프론트엔드 서버 실행 중 (port 3000)
- [ ] 아이콘 파일 생성됨
- [ ] 확장 프로그램 설치됨
- [ ] 웹사이트에 로그인됨
- [ ] 네이버에 로그인됨

### 프로덕션 배포
- [ ] API URL 프로덕션으로 변경
- [ ] manifest.json 업데이트
- [ ] zip 파일 생성
- [ ] public 폴더에 복사
- [ ] 프론트엔드 재배포
- [ ] 다운로드 링크 테스트
- [ ] 설치 및 사용 테스트

## 다음 단계

1. **Chrome 웹 스토어 배포** (선택사항)
   - Google 개발자 계정 등록 ($5)
   - 스토어 등록 정보 작성
   - 스크린샷 준비
   - 심사 제출

2. **기능 개선**
   - 자동 세션 갱신
   - 만료 알림
   - 다중 계정 지원

3. **다른 브라우저 지원**
   - Edge (Chromium 기반, 거의 동일)
   - Firefox (별도 개발 필요)
