# 대시보드 구현 가이드

## 📊 구현 완료 사항

### 1. 데이터베이스 마이그레이션
**파일:** `supabase/migrations/017_add_credits_and_quotas.sql`

다음 필드가 `profiles` 테이블에 추가되었습니다:
- `total_credits`: 전체 할당 크레딧
- `used_credits`: 사용한 크레딧
- `max_stores`: 최대 등록 가능 매장 수
- `max_keywords`: 최대 등록 가능 키워드 수
- `max_trackers`: 최대 추적 가능 키워드 수

**Tier별 기본값:**
- **Free**: 크레딧 1,000 / 매장 1개 / 키워드 10개 / 추적 3개
- **Basic**: 크레딧 5,000 / 매장 3개 / 키워드 50개 / 추적 10개
- **Pro**: 크레딧 20,000 / 매장 10개 / 키워드 200개 / 추적 50개
- **God**: 모두 무제한 (-1)

### 2. 프론트엔드 대시보드 페이지
**파일:** `frontend/app/dashboard/page.tsx`

**구현된 기능:**
- ✅ 계정 정보 카드
  - 이메일 주소
  - Tier 등급 (배지 형태)
  - Credit 현황 (프로그레스 바 포함)
  - Quota 현황 (등록매장/키워드/추적)
- ✅ 등록 매장 리스트 (그리드 카드)
- ✅ 등록 키워드 리스트 (그리드 카드)
- ✅ 추적 키워드 리스트 (상세 정보 포함)
- ✅ 반응형 디자인 (모바일/태블릿/PC)
- ✅ 로딩 상태 처리
- ✅ 빈 데이터 처리

---

## 🔧 수동으로 해야 할 작업

### 1. Backend Profile 스키마 수정

**파일:** `backend/app/models/schemas.py`

`Profile` 클래스에 다음 필드를 추가하세요:

```python
class Profile(ProfileBase):
    id: UUID
    auth_provider: str
    user_position: Optional[str] = None
    marketing_experience: Optional[str] = None
    agency_experience: Optional[str] = None
    onboarding_completed: bool
    phone_number: Optional[str] = None
    profile_image_url: Optional[str] = None
    # 👇 아래 5줄 추가
    total_credits: Optional[int] = 1000
    used_credits: Optional[int] = 0
    max_stores: Optional[int] = 1
    max_keywords: Optional[int] = 10
    max_trackers: Optional[int] = 3
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
```

### 2. DB 마이그레이션 적용

**Supabase Dashboard에서 실행:**

1. Supabase Dashboard → SQL Editor 접속
2. `supabase/migrations/017_add_credits_and_quotas.sql` 파일 내용 복사
3. SQL Editor에 붙여넣기
4. "Run" 버튼 클릭

**또는 로컬에서 실행:**

```bash
# Supabase CLI 사용
supabase db push

# 또는 직접 SQL 실행
psql $DATABASE_URL < supabase/migrations/017_add_credits_and_quotas.sql
```

### 3. 백엔드 재배포

**EC2 서버에서 실행:**

```bash
# SSH 접속
ssh your-ec2-server

# 백엔드 디렉토리로 이동
cd ~/egurado/backend

# Git Pull (최신 코드 가져오기)
git pull origin main

# Docker 컨테이너 재빌드 및 재시작
docker-compose down
docker-compose up -d --build

# 로그 확인
docker-compose logs -f
```

### 4. 프론트엔드 배포

**GitHub Desktop 사용:**

1. GitHub Desktop 열기
2. 변경사항 확인:
   - `frontend/app/dashboard/page.tsx` (수정됨)
   - `supabase/migrations/017_add_credits_and_quotas.sql` (신규)
   - `DASHBOARD_IMPLEMENTATION_GUIDE.md` (신규)
3. Commit 메시지 작성:
   ```
   feat: 대시보드 페이지 재구축
   
   - 계정 정보 카드 추가 (이메일, Tier, Credit, Quota)
   - 등록 매장/키워드/추적 리스트 표시
   - 반응형 디자인 최적화
   - DB 마이그레이션: credit 및 quota 필드 추가
   ```
4. "Commit to main" 클릭
5. "Push origin" 클릭
6. Vercel이 자동으로 배포 (약 2-3분 소요)

---

## 🧪 테스트 체크리스트

### 1. 데이터베이스 확인

```sql
-- profiles 테이블 구조 확인
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('total_credits', 'used_credits', 'max_stores', 'max_keywords', 'max_trackers');

-- 기존 사용자 데이터 확인
SELECT email, subscription_tier, total_credits, used_credits, max_stores, max_keywords, max_trackers
FROM profiles
LIMIT 5;
```

### 2. 백엔드 API 테스트

```bash
# 사용자 프로필 조회 (credit 및 quota 필드 포함 확인)
curl -X GET "https://your-api-url.com/api/v1/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**예상 응답:**
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

### 3. 프론트엔드 UI 테스트

**브라우저에서 확인:**

1. **로그인 후 대시보드 접속**
   - URL: `https://your-domain.com/dashboard`

2. **계정 정보 카드 확인**
   - [ ] 이메일 주소가 표시되는가?
   - [ ] Tier 배지가 올바르게 표시되는가?
   - [ ] Credit 현황이 표시되는가?
   - [ ] 프로그레스 바가 작동하는가?
   - [ ] Quota 현황이 정확한가?

3. **등록 매장 리스트 확인**
   - [ ] 매장 목록이 표시되는가?
   - [ ] 매장 이름, 플랫폼, 상태가 올바른가?
   - [ ] 그리드 레이아웃이 반응형으로 작동하는가?

4. **등록 키워드 리스트 확인**
   - [ ] 키워드 목록이 표시되는가?
   - [ ] 순위 정보가 표시되는가?
   - [ ] 그리드 레이아웃이 반응형으로 작동하는가?

5. **추적 키워드 리스트 확인**
   - [ ] 추적 중인 키워드가 표시되는가?
   - [ ] 활성/비활성 상태가 올바른가?
   - [ ] 마지막 수집 시간이 표시되는가?

6. **반응형 디자인 테스트**
   - [ ] 모바일 (< 768px)
   - [ ] 태블릿 (768px ~ 1024px)
   - [ ] PC (> 1024px)

7. **로딩 상태 확인**
   - [ ] 페이지 로딩 시 스피너가 표시되는가?
   - [ ] 데이터 로드 후 스피너가 사라지는가?

8. **빈 데이터 처리**
   - [ ] 매장이 없을 때 EmptyStoreMessage가 표시되는가?
   - [ ] 키워드가 없을 때 "등록된 키워드가 없습니다" 메시지가 표시되는가?

---

## 🎨 UI/UX 특징

### 1. 디자인 시스템
- **기존 스택 활용**: Radix UI + Tailwind CSS
- **일관성**: 기존 페이지와 동일한 디자인 패턴
- **색상**: CSS 변수 사용 (`var(--primary)`, `var(--card)` 등)

### 2. 카드 레이아웃
- **그라디언트 배경**: 가독성 향상
- **호버 효과**: 카드에 마우스 오버 시 그림자 효과
- **아이콘**: lucide-react 아이콘 사용

### 3. Tier 배지
- **Free**: 회색 배경, 🆓 아이콘
- **Basic**: 파란색 배경, ⭐ 아이콘
- **Pro**: 보라색 배경, 💎 아이콘
- **God**: 그라디언트 배경, 👑 아이콘

### 4. 프로그레스 바
- **크레딧 잔여량**: 파란색 → 보라색 그라디언트
- **애니메이션**: 부드러운 전환 효과

### 5. Quota 표시
- **한도 도달**: 빨간색 경고
- **추가 가능**: 파란색 정보
- **무제한**: 초록색 표시

---

## 📝 추가 개선 사항 (선택)

### 1. 크레딧 사용 내역
- 크레딧 사용 히스토리 테이블 추가
- 사용 내역 조회 API 구현
- 대시보드에 최근 사용 내역 표시

### 2. Tier 업그레이드 버튼
- "플랜 업그레이드" 버튼 추가
- 가격 정책 페이지 연결
- 결제 시스템 연동

### 3. 실시간 업데이트
- WebSocket 또는 Server-Sent Events 사용
- 크레딧 사용 시 실시간 반영
- Quota 변경 시 자동 갱신

### 4. 통계 차트
- 크레딧 사용 추이 그래프
- 키워드 순위 변동 차트
- 매장별 성과 비교

---

## 🐛 트러블슈팅

### 문제 1: 크레딧 정보가 표시되지 않음

**원인:** 
- DB 마이그레이션이 적용되지 않음
- Backend 스키마가 업데이트되지 않음

**해결:**
1. Supabase에서 마이그레이션 실행 확인
2. `backend/app/models/schemas.py` 수정 확인
3. 백엔드 재배포

### 문제 2: API 호출 실패

**원인:**
- 인증 토큰 만료
- CORS 설정 문제

**해결:**
1. 브라우저 콘솔에서 에러 메시지 확인
2. 로그아웃 후 재로그인
3. 백엔드 로그 확인 (`docker-compose logs -f`)

### 문제 3: 반응형 레이아웃이 깨짐

**원인:**
- Tailwind CSS 클래스 충돌
- 브라우저 캐시

**해결:**
1. 브라우저 캐시 삭제 (Ctrl + Shift + R)
2. 개발자 도구에서 반응형 모드 테스트
3. Tailwind 설정 확인

---

## 📚 참고 자료

- **Radix UI 문서**: https://www.radix-ui.com/
- **Tailwind CSS 문서**: https://tailwindcss.com/
- **Lucide Icons**: https://lucide.dev/
- **Next.js 문서**: https://nextjs.org/docs

---

## ✅ 완료 체크리스트

- [ ] Backend Profile 스키마 수정
- [ ] DB 마이그레이션 적용
- [ ] 백엔드 재배포
- [ ] 프론트엔드 배포
- [ ] 데이터베이스 확인
- [ ] 백엔드 API 테스트
- [ ] 프론트엔드 UI 테스트
- [ ] 반응형 디자인 테스트
- [ ] 프로덕션 환경 테스트

---

**작성일:** 2026-01-21  
**작성자:** AI Assistant  
**상태:** 구현 완료 (배포 대기)
