# 🔐 네이버 세션 저장 Chrome 확장 프로그램 - 완벽 가이드

## 📋 개요

Chrome 확장 프로그램을 사용하여 네이버 스마트플레이스 로그인 세션을 안전하게 저장하는 솔루션입니다.

### 왜 Chrome 확장 프로그램인가?

- ✅ **사용자 친화적**: 버튼 클릭 한 번으로 세션 저장
- ✅ **서버 부하 Zero**: 모든 처리가 사용자 브라우저에서 진행
- ✅ **안정성**: 서버 크래시 위험 없음
- ✅ **확장성**: 사용자 수 제한 없음
- ✅ **보안**: 사용자 브라우저에서 직접 쿠키 추출

## 📁 파일 구조

```
chrome-extension/
├── manifest.json           # 확장 프로그램 설정
├── popup.html             # 팝업 UI
├── popup.js               # 팝업 로직
├── background.js          # 백그라운드 서비스 워커
├── README.md              # 사용자 가이드
└── icons/
    ├── create-icons.html  # 아이콘 생성기
    ├── icon16.png         # 16x16 아이콘
    ├── icon48.png         # 48x48 아이콘
    └── icon128.png        # 128x128 아이콘
```

## 🚀 배포 전 준비사항

### 1. 아이콘 생성

```bash
# 1. 브라우저로 아이콘 생성기 열기
open chrome-extension/icons/create-icons.html

# 2. 각 크기별로 다운로드
# - icon16.png 다운로드
# - icon48.png 다운로드
# - icon128.png 다운로드

# 3. icons 폴더에 저장
```

### 2. API URL 설정

**개발 환경:**
```javascript
// chrome-extension/popup.js
const CONFIG = {
  API_BASE_URL: 'http://localhost:8000',
  FRONTEND_URL: 'http://localhost:3000'
}
```

**프로덕션 환경:**
```javascript
// chrome-extension/popup.js
const CONFIG = {
  API_BASE_URL: 'https://your-api-domain.com',
  FRONTEND_URL: 'https://your-frontend-domain.com'
}
```

### 3. manifest.json 업데이트

프로덕션 배포 시 `host_permissions`를 업데이트하세요:

```json
{
  "host_permissions": [
    "https://*.naver.com/*",
    "https://your-api-domain.com/*",
    "https://your-frontend-domain.com/*"
  ]
}
```

## 📦 배포 방법

### 방법 1: 직접 배포 (zip 파일)

#### 1단계: zip 파일 생성

```bash
# Windows
cd chrome-extension
Compress-Archive -Path * -DestinationPath chrome-extension.zip

# Mac/Linux
cd chrome-extension
zip -r chrome-extension.zip * -x "*.DS_Store" -x "__MACOSX/*"
```

#### 2단계: 웹사이트에 업로드

```bash
# 프론트엔드 public 폴더에 복사
cp chrome-extension.zip ../frontend/public/

# 또는 CDN에 업로드
aws s3 cp chrome-extension.zip s3://your-bucket/downloads/
```

#### 3단계: 다운로드 링크 업데이트

```typescript
// frontend/app/dashboard/naver/session/page.tsx
<Button 
  onClick={() => {
    window.open('/chrome-extension.zip', '_blank')
    // 또는
    // window.open('https://your-cdn.com/chrome-extension.zip', '_blank')
  }}
>
  <Download className="mr-2 h-4 w-4" />
  chrome-extension.zip 다운로드
</Button>
```

### 방법 2: Chrome 웹 스토어 배포 (추천, 나중에)

#### 사전 준비

1. **Google 개발자 계정 등록**
   - https://chrome.google.com/webstore/devconsole
   - 등록 비용: $5 (평생 1회)

2. **프로모션 이미지 준비**
   - 작은 타일: 440x280
   - 마키: 1280x800
   - 스크린샷: 1280x800 또는 640x400 (최소 1개)

#### 배포 단계

1. **zip 파일 생성** (위와 동일)

2. **Chrome 웹 스토어 개발자 콘솔 접속**
   - https://chrome.google.com/webstore/devconsole

3. **새 항목 추가**
   - "새 항목" 버튼 클릭
   - zip 파일 업로드

4. **스토어 등록 정보 작성**
   ```
   이름: 네이버 세션 저장
   
   짧은 설명 (132자):
   네이버 스마트플레이스 로그인 세션을 안전하게 저장하여 
   AI 답글 생성 기능을 사용할 수 있게 해주는 확장 프로그램입니다.
   
   자세한 설명:
   [chrome-extension/README.md 내용 참고]
   
   카테고리: 생산성
   
   언어: 한국어
   ```

5. **스크린샷 업로드**
   - 확장 프로그램 팝업 스크린샷
   - 사용 예시 스크린샷

6. **개인정보 보호 정책**
   ```
   본 확장 프로그램은:
   - 네이버 쿠키만 수집합니다
   - 수집된 데이터는 암호화하여 사용자 서버에 저장됩니다
   - 비밀번호는 절대 수집하지 않습니다
   - 제3자와 데이터를 공유하지 않습니다
   ```

7. **심사 제출**
   - "심사 제출" 버튼 클릭
   - 심사 기간: 1-3일

8. **승인 후 배포**
   - 승인되면 자동으로 Chrome 웹 스토어에 게시됨

#### 사용자 설치 (웹 스토어 버전)

```
1. Chrome 웹 스토어 링크 공유
   https://chrome.google.com/webstore/detail/[your-extension-id]

2. 사용자가 "Chrome에 추가" 버튼 클릭

3. 완료! (10초)
```

## 👥 사용자 가이드

### 설치 방법 (개발자 모드)

#### 1단계: 다운로드
1. 웹사이트에서 `chrome-extension.zip` 다운로드
2. 파일을 압축 해제

#### 2단계: Chrome에 설치
1. Chrome 브라우저 열기
2. 주소창에 `chrome://extensions/` 입력 후 Enter
3. 우측 상단 "개발자 모드" 토글 켜기
4. "압축해제된 확장 프로그램을 로드합니다" 버튼 클릭
5. 압축 해제한 `chrome-extension` 폴더 선택
6. 완료!

#### 3단계: 아이콘 고정 (선택사항)
1. 브라우저 우측 상단 퍼즐 모양(🧩) 아이콘 클릭
2. "네이버 세션 저장" 찾기
3. 📌 아이콘 클릭하여 고정

### 사용 방법

#### 1단계: 네이버 로그인
1. [네이버 스마트플레이스](https://new.smartplace.naver.com) 접속
2. 네이버 계정으로 로그인

#### 2단계: 세션 저장
1. 브라우저 우측 상단 🔐 아이콘 클릭
2. 팝업 창에서 매장 선택
3. "세션 저장하기" 버튼 클릭
4. 완료! (약 10초 소요)

#### 3단계: AI 답글 생성 사용
1. 웹사이트의 "AI 답글 생성" 메뉴로 이동
2. 리뷰 조회 및 AI 답글 생성
3. 자동으로 네이버에 포스팅됨

## 🐛 문제 해결

### 확장 프로그램 관련

#### "로그인이 필요합니다" 오류
**원인:** 웹사이트에 로그인하지 않음

**해결:**
1. 웹사이트(localhost:3000)에 접속
2. Supabase 계정으로 로그인
3. 확장 프로그램 다시 열기

#### "네이버 로그인 필요" 경고
**원인:** 네이버 스마트플레이스에 로그인하지 않음

**해결:**
1. 네이버 스마트플레이스에 로그인
2. 확장 프로그램 다시 열기

#### 확장 프로그램 아이콘이 안 보임
**원인:** 아이콘이 숨겨져 있음

**해결:**
1. 퍼즐 모양(🧩) 아이콘 클릭
2. "네이버 세션 저장" 옆의 📌 아이콘 클릭하여 고정

#### "매장 목록을 불러올 수 없습니다" 오류
**원인:** 백엔드 서버가 실행되지 않음 또는 API URL 오류

**해결:**
1. 백엔드 서버 실행 확인
2. `popup.js`의 API_BASE_URL 확인
3. CORS 설정 확인

### 백엔드 관련

#### CORS 오류
**원인:** 백엔드가 확장 프로그램의 요청을 차단

**해결:**
```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "chrome-extension://*"  # 확장 프로그램 허용
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 🔄 업데이트 방법

### 방법 1: 개발자 모드 (수동)

1. 코드 수정
2. `manifest.json`의 `version` 증가
3. Chrome 확장 프로그램 페이지(`chrome://extensions/`)에서 새로고침 버튼 클릭

### 방법 2: 웹 스토어 (자동)

1. 코드 수정
2. `manifest.json`의 `version` 증가
3. 새 zip 파일 생성
4. Chrome 웹 스토어 개발자 콘솔에서 업데이트 제출
5. 심사 후 승인되면 자동으로 모든 사용자에게 배포

## 📊 사용 통계 수집 (선택사항)

### Google Analytics 연동

```javascript
// background.js
const GA_TRACKING_ID = 'UA-XXXXXXXXX-X'

chrome.runtime.onInstalled.addListener(() => {
  // 설치 이벤트
  sendGAEvent('install', 'extension')
})

function sendGAEvent(action, label) {
  fetch(`https://www.google-analytics.com/collect?v=1&t=event&tid=${GA_TRACKING_ID}&cid=${userId}&ea=${action}&el=${label}`)
}
```

## 🔒 보안 고려사항

### 1. 쿠키 처리
- HttpOnly 쿠키는 JavaScript로 접근 불가 (정상)
- 네이버 도메인의 쿠키만 수집
- HTTPS를 통해 암호화 전송

### 2. 권한 최소화
```json
{
  "permissions": [
    "cookies",     // 쿠키 읽기만 가능
    "storage",     // 로컬 저장소
    "tabs"         // 탭 정보 (URL만)
  ]
}
```

### 3. 민감 정보 저장 금지
- 비밀번호 절대 수집 안 함
- 쿠키는 서버에 암호화 저장
- 확장 프로그램 내부에 저장 안 함

## 📈 성능 최적화

### 1. 번들 크기 최소화
- 외부 라이브러리 최소화
- 순수 JavaScript 사용
- 현재 크기: ~20KB

### 2. 메모리 사용량
- 팝업 닫으면 메모리 해제
- Background Service Worker는 필요시만 실행
- 평균 메모리 사용량: ~5MB

## 🎯 향후 개선 사항

### Phase 1 (현재)
- [x] 기본 세션 저장 기능
- [x] 매장 선택
- [x] 에러 처리

### Phase 2 (향후)
- [ ] 자동 세션 갱신
- [ ] 만료 알림
- [ ] 다중 계정 지원

### Phase 3 (향후)
- [ ] Edge 브라우저 지원
- [ ] Firefox 확장 프로그램 버전
- [ ] 세션 동기화

## 📞 지원

문제가 발생하거나 질문이 있으시면:
- 📧 이메일: support@yourcompany.com
- 💬 Discord: https://discord.gg/your-server
- 🌐 웹사이트: http://localhost:3000

## 📄 라이센스

Copyright © 2026. All rights reserved.
