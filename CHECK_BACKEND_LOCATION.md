# 🔍 백엔드 API 위치 확인 가이드

## 방법 1: Vercel Dashboard 확인 (가장 쉬움) ⭐

### 단계:
1. https://vercel.com 접속 → 로그인
2. `egurado` 또는 `whiplace` 프로젝트 선택
3. **Settings** 탭 클릭
4. **Environment Variables** 클릭
5. `NEXT_PUBLIC_API_URL` 찾기

**이 값이 백엔드 주소입니다!**
- 예: `https://api.whiplace.com`
- 예: `http://13.125.xxx.xxx:8000`

---

## 방법 2: 배포된 프론트엔드에서 확인

### 단계:
1. https://whiplace.com 접속
2. 브라우저 개발자 도구 열기 (F12)
3. **Console** 탭
4. 다음 입력:
```javascript
console.log(process.env.NEXT_PUBLIC_API_URL)
```

또는 **Network** 탭에서:
- 아무 API 호출 확인
- Request URL 확인 → 백엔드 주소

---

## 방법 3: GitHub 레포지토리 확인

### 단계:
1. GitHub 레포지토리 접속
2. **Settings** → **Secrets and variables** → **Actions**
3. 또는 **Environments** 확인

---

## 방법 4: 현재 실행 중인 서버 확인

### 로컬 서버인지 확인:
```powershell
# PowerShell에서
netstat -ano | findstr :8000
```

**출력이 있으면**: 로컬에서 실행 중 (localhost:8000)
**출력이 없으면**: 외부 서버에서 실행 중

---

## 방법 5: 도메인 확인

### whiplace.com의 DNS 설정 확인:

```powershell
# PowerShell에서
nslookup api.whiplace.com
```

또는

```powershell
nslookup whiplace.com
```

**A 레코드 확인** → IP 주소 확인

---

## 💡 가장 가능성 높은 시나리오

### 1. 아직 프로덕션 배포 안 함
- 현재: localhost:8000에서만 실행 중
- 필요: AWS EC2 또는 다른 클라우드에 배포

### 2. 이미 배포되어 있음
- Vercel Environment Variables에서 확인
- 또는 api.whiplace.com으로 접속 가능

---

## 🚀 배포 상태 확인 명령어

```powershell
# 1. 로컬 백엔드 실행 중?
Get-Process | Where-Object {$_.ProcessName -like "*python*"}

# 2. 포트 8000 사용 중?
netstat -ano | findstr :8000

# 3. API 접속 테스트 (로컬)
curl http://localhost:8000/api/health

# 4. API 접속 테스트 (프로덕션)
curl https://api.whiplace.com/api/health
```

---

## 📝 결과에 따른 다음 단계

### 시나리오 A: 백엔드가 로컬에서만 실행 중
→ **프로덕션 배포가 필요합니다**
- AWS EC2
- Railway
- Render
- DigitalOcean 등

### 시나리오 B: 백엔드가 이미 배포되어 있음
→ **SSH 접속해서 환경변수만 추가하면 됩니다**
- EC2 IP 주소 확인 필요
- SSH 키 파일 위치 확인 필요

---

## 🆘 모르겠으면?

다음 정보를 확인해주세요:
1. **Vercel Dashboard** → Environment Variables → `NEXT_PUBLIC_API_URL` 값
2. **터미널 출력 결과** 공유:
```powershell
netstat -ano | findstr :8000
curl http://localhost:8000/api/health
```

이 정보를 알려주시면 정확한 가이드를 드리겠습니다! 😊
