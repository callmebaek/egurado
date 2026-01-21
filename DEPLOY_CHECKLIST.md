# 🚀 배포 체크리스트

## 📝 변경된 파일 목록

1. `frontend/app/dashboard/page.tsx` - 대시보드 페이지 재구축
2. `supabase/migrations/017_add_credits_and_quotas.sql` - DB 마이그레이션
3. `backend/app/models/schemas.py` - Profile 스키마 수정 (수동)
4. `DASHBOARD_IMPLEMENTATION_GUIDE.md` - 구현 가이드
5. `DEPLOY_CHECKLIST.md` - 이 파일

---

## 🔧 1단계: Backend Profile 스키마 수정 (필수!)

**파일:** `backend/app/models/schemas.py`

**수정할 위치:** 41번째 줄 다음

```python
    profile_image_url: Optional[str] = None
    # 👇 아래 5줄 추가
    total_credits: Optional[int] = 1000
    used_credits: Optional[int] = 0
    max_stores: Optional[int] = 1
    max_keywords: Optional[int] = 10
    max_trackers: Optional[int] = 3
    created_at: datetime
```

**확인 방법:**
- VSCode에서 `backend/app/models/schemas.py` 파일 열기
- Ctrl+G로 41번째 줄로 이동
- `profile_image_url: Optional[str] = None` 다음에 5줄 추가
- 저장 (Ctrl+S)

---

## 📤 2단계: GitHub Desktop으로 커밋 & 푸시

### GitHub Desktop 열기

1. **변경사항 확인** (왼쪽 패널)
   - ✅ `frontend/app/dashboard/page.tsx`
   - ✅ `supabase/migrations/017_add_credits_and_quotas.sql`
   - ✅ `backend/app/models/schemas.py`
   - ✅ `DASHBOARD_IMPLEMENTATION_GUIDE.md`
   - ✅ `DEPLOY_CHECKLIST.md`

2. **커밋 메시지 작성** (왼쪽 하단)
   ```
   feat: 대시보드 재구축 - 계정정보 및 Quota 표시

   - 대시보드 페이지 완전 재구축
   - 계정 정보 카드: 이메일, Tier, Credit, Quota
   - 등록 매장/키워드/추적 리스트 표시
   - 반응형 디자인 최적화
   - DB 마이그레이션: credit 및 quota 필드 추가
   - Backend: Profile 스키마에 credit/quota 필드 추가
   ```

3. **커밋** 버튼 클릭
   - "Commit to main" 클릭

4. **푸시** 버튼 클릭
   - "Push origin" 클릭

5. **Vercel 자동 배포 대기**
   - 약 2-3분 소요
   - Vercel 대시보드에서 배포 상태 확인 가능

---

## 🗄️ 3단계: Supabase DB 마이그레이션 적용

### Supabase Dashboard에서 실행

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard 로그인

2. **프로젝트 선택**
   - egurado 프로젝트 선택

3. **SQL Editor 열기**
   - 왼쪽 메뉴 → "SQL Editor" 클릭

4. **새 쿼리 생성**
   - "New query" 버튼 클릭

5. **마이그레이션 SQL 복사 & 붙여넣기**
   - `supabase/migrations/017_add_credits_and_quotas.sql` 파일 내용 전체 복사
   - SQL Editor에 붙여넣기

6. **실행**
   - "Run" 버튼 클릭 (또는 Ctrl+Enter)
   - ✅ "Success" 메시지 확인

7. **결과 확인**
   ```sql
   -- profiles 테이블 구조 확인
   SELECT column_name, data_type, column_default 
   FROM information_schema.columns 
   WHERE table_name = 'profiles' 
   AND column_name IN ('total_credits', 'used_credits', 'max_stores', 'max_keywords', 'max_trackers');
   ```
   - 5개 컬럼이 모두 표시되면 성공

---

## 🐳 4단계: EC2 백엔드 재배포

### SSH 접속

1. **터미널 열기** (PowerShell 또는 CMD)

2. **SSH 접속**
   ```bash
   ssh your-username@your-ec2-ip
   # 예: ssh ubuntu@13.125.123.456
   ```

3. **백엔드 디렉토리 이동**
   ```bash
   cd ~/egurado/backend
   ```

4. **Git Pull** (최신 코드 가져오기)
   ```bash
   git pull origin main
   ```

5. **변경사항 확인**
   ```bash
   git log -1
   # 최근 커밋 메시지에 "대시보드 재구축"이 있는지 확인
   ```

6. **Docker 컨테이너 재빌드 & 재시작**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

7. **로그 확인** (에러 없는지 체크)
   ```bash
   docker-compose logs -f
   # Ctrl+C로 종료
   ```

8. **백엔드 동작 확인**
   ```bash
   curl http://localhost:8000/health
   # {"status":"ok"} 응답이 오면 정상
   ```

---

## ✅ 5단계: 배포 확인 및 테스트

### 프론트엔드 배포 확인

1. **Vercel 대시보드**
   - https://vercel.com/dashboard
   - 최근 배포 상태가 "Ready" 인지 확인

2. **프로덕션 URL 접속**
   - https://your-domain.vercel.app
   - 정상적으로 로드되는지 확인

### 대시보드 기능 테스트

1. **로그인**
   - 이메일 로그인 또는 소셜 로그인

2. **대시보드 접속**
   - 좌측 메뉴 → "대시보드" 클릭

3. **계정 정보 카드 확인**
   - [ ] 이메일 주소가 표시되는가?
   - [ ] Tier 배지가 올바르게 표시되는가? (🆓 Free, ⭐ Basic, 💎 Pro, 👑 God)
   - [ ] Credit 현황이 표시되는가?
   - [ ] 프로그레스 바가 보이는가?
   - [ ] Quota 현황이 정확한가?
     - 등록 매장: X / Y
     - 등록 키워드: X / Y
     - 추적 키워드: X / Y

4. **등록 매장 리스트 확인**
   - [ ] 매장 목록이 표시되는가?
   - [ ] 매장 이름이 올바른가?
   - [ ] 플랫폼 배지가 표시되는가? (네이버/구글)
   - [ ] 상태가 올바른가? (활성/비활성)

5. **등록 키워드 리스트 확인**
   - [ ] 키워드 목록이 표시되는가?
   - [ ] 순위 정보가 표시되는가?

6. **추적 키워드 리스트 확인**
   - [ ] 추적 중인 키워드가 표시되는가?
   - [ ] 활성/비활성 아이콘이 올바른가?
   - [ ] 마지막 수집 시간이 표시되는가?

7. **반응형 테스트**
   - [ ] 브라우저 창 크기 조절 시 레이아웃이 적절히 변경되는가?
   - [ ] 모바일 화면에서도 잘 보이는가?

### API 테스트 (선택)

**브라우저 개발자 도구 열기** (F12)

1. **Console 탭에서 테스트**
   ```javascript
   // 사용자 프로필 조회
   fetch('/api/v1/auth/me', {
     headers: {
       'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
     }
   })
   .then(r => r.json())
   .then(data => console.log(data))
   ```

2. **응답 확인**
   ```json
   {
     "id": "...",
     "email": "user@example.com",
     "subscription_tier": "free",
     "total_credits": 1000,
     "used_credits": 0,
     "max_stores": 1,
     "max_keywords": 10,
     "max_trackers": 3,
     ...
   }
   ```

---

## 🐛 트러블슈팅

### 문제 1: 크레딧 정보가 null로 표시됨

**원인:** DB 마이그레이션이 적용되지 않음

**해결:**
1. Supabase Dashboard → SQL Editor
2. 마이그레이션 SQL 다시 실행
3. 브라우저 새로고침 (Ctrl+Shift+R)

### 문제 2: "Failed to fetch" 에러

**원인:** 백엔드 API가 실행되지 않음

**해결:**
1. EC2 서버에서 `docker-compose ps` 실행
2. 컨테이너가 실행 중인지 확인
3. 로그 확인: `docker-compose logs -f`

### 문제 3: Vercel 배포 실패

**원인:** 빌드 에러 또는 환경 변수 누락

**해결:**
1. Vercel Dashboard → Deployments
2. 실패한 배포 클릭 → Logs 확인
3. 에러 메시지 확인 후 수정
4. GitHub에 다시 푸시

### 문제 4: 대시보드가 빈 화면으로 표시됨

**원인:** 
- 매장이 등록되지 않음
- API 호출 실패

**해결:**
1. 브라우저 개발자 도구 (F12) → Console 탭
2. 에러 메시지 확인
3. Network 탭에서 API 호출 상태 확인
4. 매장 연결 페이지에서 매장 등록

---

## 📊 배포 완료 확인

모든 항목에 ✅ 체크하세요:

- [ ] Backend Profile 스키마 수정 완료
- [ ] GitHub Desktop 커밋 & 푸시 완료
- [ ] Vercel 배포 성공 (Ready 상태)
- [ ] Supabase DB 마이그레이션 적용 완료
- [ ] EC2 백엔드 재배포 완료
- [ ] 대시보드 페이지 정상 표시
- [ ] 계정 정보 카드 정상 작동
- [ ] 매장/키워드/추적 리스트 정상 표시
- [ ] 반응형 디자인 정상 작동
- [ ] 모바일에서도 정상 표시

---

## 🎉 배포 완료!

모든 단계를 완료하셨으면 배포가 성공적으로 완료되었습니다!

**다음 단계:**
- 실제 사용자 피드백 수집
- Tier별 기능 제한 테스트
- 크레딧 사용 로직 구현
- 결제 시스템 연동 (선택)

**문의 사항이 있으시면 DASHBOARD_IMPLEMENTATION_GUIDE.md 참고하세요.**

---

**작성일:** 2026-01-21  
**버전:** 1.0  
**상태:** 배포 준비 완료 ✅
