# 🔄 확장 프로그램 업데이트 안내

## 변경 사항

Content Script를 추가하여 웹사이트의 인증 정보에 접근할 수 있도록 수정했습니다.

## 📌 업데이트 방법

### 1. Chrome 확장 프로그램 페이지 열기

```
chrome://extensions/
```

### 2. "네이버 세션 저장" 확장 프로그램 찾기

### 3. 새로고침 버튼 클릭 (🔄)

또는 확장 프로그램을 제거하고 다시 설치:

1. "제거" 버튼 클릭
2. "압축해제된 확장 프로그램을 로드합니다" 클릭
3. `chrome-extension` 폴더 선택

## ✅ 새로운 사용 방법

### **중요: 순서를 지켜주세요!**

#### 1️⃣ 웹사이트 로그인 (필수)

```
1. http://localhost:3000 접속
2. Supabase 계정으로 로그인
3. 대시보드 페이지 확인
```

이 단계에서 웹사이트가 인증 정보를 확장 프로그램에 전달합니다.

#### 2️⃣ 네이버 로그인

```
1. https://new.smartplace.naver.com 접속
2. 네이버 계정으로 로그인
```

#### 3️⃣ 확장 프로그램 사용

```
1. 브라우저 우측 상단 🔐 아이콘 클릭
2. 매장 선택
3. "세션 저장하기" 버튼 클릭
4. 완료!
```

## 🐛 문제 해결

### "로그인이 필요합니다" 오류

**원인:** 웹사이트에 로그인하지 않았거나, Content Script가 실행되지 않음

**해결:**

1. **웹사이트 로그인 확인**
   ```
   http://localhost:3000 접속 → 로그인
   ```

2. **웹사이트 새로고침**
   ```
   F5 또는 Ctrl + R
   ```

3. **Console 확인** (F12)
   ```
   다음 메시지가 보여야 합니다:
   🌐 Content Script 로드됨
   ✅ Content Script 초기화 완료
   ✅ 인증 정보 Chrome Storage에 저장됨
   ```

4. **확장 프로그램 다시 열기**
   ```
   🔐 아이콘 클릭 → 매장 목록 확인
   ```

### Content Script가 실행되지 않음

**원인:** manifest.json의 `matches` 패턴과 URL이 일치하지 않음

**해결:**

1. **현재 웹사이트 URL 확인**
   ```
   예: http://localhost:3000
   예: https://your-app.vercel.app
   ```

2. **manifest.json 수정**
   ```json
   "content_scripts": [
     {
       "matches": [
         "http://localhost:3000/*",
         "https://your-app.vercel.app/*"
       ],
       "js": ["content.js"],
       "run_at": "document_idle"
     }
   ]
   ```

3. **확장 프로그램 새로고침**
   ```
   chrome://extensions/ → 🔄 버튼 클릭
   ```

4. **웹사이트 새로고침**
   ```
   F5
   ```

### "매장 목록을 불러올 수 없습니다" 오류

**원인:** 백엔드 서버가 실행되지 않음

**해결:**

```bash
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Console에서 디버깅

#### 1. 웹사이트 Console (F12)

```javascript
// Content Script가 로드되었는지 확인
// 다음 메시지가 보여야 함:
🌐 Content Script 로드됨
✅ Content Script 초기화 완료
✅ 인증 정보 Chrome Storage에 저장됨

// Chrome Storage 확인
chrome.storage.local.get(['userId', 'lastUpdated'], (result) => {
  console.log('Chrome Storage:', result)
})
```

#### 2. 확장 프로그램 Popup Console

```javascript
// 확장 프로그램 팝업에서 우클릭 → "검사"
// Console에서 다음 확인:
🚀 팝업 로드됨
📦 Chrome Storage: { userId: "...", lastUpdated: ... }
✅ 사용자 인증 확인: ...
✅ 매장 목록 로드 완료: X개
```

## 📊 작동 원리

```
┌─────────────────────────────────────────────────┐
│  1. 웹사이트 (localhost:3000)                    │
│     ↓                                            │
│  2. Content Script 실행                          │
│     → localStorage에서 인증 정보 추출            │
│     → Chrome Storage에 저장                      │
│     ↓                                            │
│  3. 확장 프로그램 Popup                          │
│     → Chrome Storage에서 인증 정보 읽기          │
│     → 백엔드 API로 매장 목록 요청                │
│     → 사용자에게 표시                            │
│     ↓                                            │
│  4. 세션 저장                                    │
│     → 네이버 쿠키 추출                           │
│     → 백엔드 API로 전송                          │
│     → DB에 저장                                  │
└─────────────────────────────────────────────────┘
```

## ✅ 체크리스트

업데이트 후 다음을 확인하세요:

- [ ] Chrome에서 확장 프로그램 새로고침 완료
- [ ] 웹사이트(localhost:3000)에 로그인 완료
- [ ] 웹사이트 새로고침 (F5)
- [ ] Console에 "Content Script 로드됨" 메시지 확인
- [ ] 확장 프로그램 팝업에서 매장 목록 보임
- [ ] 네이버 스마트플레이스 로그인 완료
- [ ] 세션 저장 성공

## 🚀 프로덕션 배포 시

manifest.json의 `matches`를 프로덕션 URL로 업데이트하세요:

```json
"content_scripts": [
  {
    "matches": [
      "http://localhost:3000/*",
      "https://your-production-domain.com/*"
    ],
    "js": ["content.js"],
    "run_at": "document_idle"
  }
]
```

## 💡 팁

1. **웹사이트를 먼저 여세요**
   - 확장 프로그램보다 웹사이트를 먼저 열어야 Content Script가 실행됩니다

2. **웹사이트를 자주 새로고침하세요**
   - 인증 정보가 1시간마다 자동 갱신됩니다
   - 문제 발생 시 웹사이트를 새로고침하면 대부분 해결됩니다

3. **Console을 활용하세요**
   - F12를 눌러 Console을 열면 자세한 로그를 볼 수 있습니다
