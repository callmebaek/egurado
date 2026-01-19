# AI 설정 기능 수정 완료 요약

## 📌 문제 상황

**사용자 보고**: AI 답글 생성 기능에서 우측 상단의 AI 설정이 정상적으로 작동하지 않음

**근본 원인**: 
- `stores` 테이블에 `ai_settings` JSONB 컬럼이 없어서 설정을 저장할 수 없었음
- Migration 파일이 누락되어 있었음

---

## ✅ 해결 완료 사항

### 1. 데이터베이스 Migration 생성

**파일**: `supabase/migrations/005_add_ai_settings_and_session.sql`

**추가된 컬럼**:
- `ai_settings` (JSONB): 매장별 AI 답글 생성 설정 저장
- `naver_session_encrypted` (TEXT): 네이버 세션 쿠키 저장
- `session_saved_at` (TIMESTAMP): 세션 저장 시각

**적용 방법**: 
```sql
-- Supabase Dashboard → SQL Editor에서 실행
ALTER TABLE stores 
  ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS naver_session_encrypted TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS session_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_stores_ai_settings ON stores USING GIN (ai_settings);
```

### 2. 코드 검토 및 검증

#### 프론트엔드 (frontend/app/dashboard/naver/reviews/ai-reply/page.tsx)
- ✅ Line 198-209: `loadAISettings()` 함수 올바르게 구현
- ✅ Line 145: 매장 변경 시 AI 설정 자동 로드
- ✅ Line 271: AI 답글 생성 시 `aiSettings`를 `place_settings`로 전달
- ✅ Line 572-579: 우측 상단 "AI 설정" 버튼 정상 작동

#### 프론트엔드 (frontend/app/dashboard/naver/ai-settings/page.tsx)
- ✅ Line 70-92: `loadSettings()` 함수 - 설정 로드
- ✅ Line 94-124: `saveSettings()` 함수 - 설정 저장
- ✅ Line 126-130: `resetToDefault()` 함수 - 초기화

#### 백엔드 (backend/app/routers/ai_settings.py)
- ✅ Line 21-52: GET `/api/v1/ai-settings/{store_id}` - AI 설정 조회
- ✅ Line 55-78: PUT `/api/v1/ai-settings/{store_id}` - AI 설정 저장
- ✅ Line 81-101: DELETE `/api/v1/ai-settings/{store_id}` - AI 설정 삭제

#### 백엔드 (backend/app/routers/ai_reply.py)
- ✅ Line 103-138: POST `/api/v1/ai-reply/generate` - AI 답글 생성 (설정 적용)
- ✅ Line 141-169: GET `/api/v1/ai-reply/settings/{store_id}` - 설정 조회 (답글 페이지용)
- ✅ Line 114-119: `place_settings` 파싱 및 로깅

#### 백엔드 (backend/app/services/llm_reply_service.py)
- ✅ Line 186-293: `generate_reply()` - PlaceAISettings 기반 답글 생성
- ✅ Line 26-128: `_build_custom_system_prompt()` - 맞춤형 프롬프트 생성
- ✅ Line 130-156: `_build_custom_system_prompt_negative()` - 부정 리뷰 프롬프트
- ✅ Line 226-246: PlaceAISettings 파라미터 적용 (temperature, length, penalty 등)

---

## 📊 주요 기능 확인

### AI 설정 항목

| 설정 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| friendliness | 1-10 | 7 | 친절함 정도 (1=사무적, 10=열정적) |
| formality | 1-10 | 7 | 격식 수준 (1=반말, 10=격식) |
| reply_length_min | 50-1200 | 100 | 최소 답글 길이 (자) |
| reply_length_max | 50-1200 | 450 | 최대 답글 길이 (자) |
| diversity | 0.5-1.0 | 0.9 | 다양성 (temperature) |
| use_text_emoticons | boolean | true | 텍스트 이모티콘 사용 (^^, ㅎㅎ) |
| mention_specifics | boolean | true | 리뷰 구체 내용 언급 |
| brand_voice | string | "warm" | 브랜드 톤 (warm/professional/casual/friendly) |
| response_style | string | "quick_thanks" | 응답 스타일 (quick_thanks/empathy/solution) |
| custom_instructions | string | null | 일반 리뷰 추가 요청사항 |
| custom_instructions_negative | string | null | 부정 리뷰 추가 요청사항 |

### 데이터 흐름

```
1. AI 설정 페이지
   ↓
   GET /api/v1/ai-settings/{store_id}
   ↓
   stores.ai_settings (JSONB) 조회
   ↓
   설정 변경 후 저장
   ↓
   PUT /api/v1/ai-settings/{store_id}
   ↓
   stores.ai_settings 업데이트

2. AI 답글 생성 페이지
   ↓
   매장 선택 시 loadAISettings()
   ↓
   GET /api/v1/ai-reply/settings/{store_id}
   ↓
   aiSettings 상태에 저장
   ↓
   AI 답글 생성 버튼 클릭
   ↓
   POST /api/v1/ai-reply/generate
   (place_settings: aiSettings 전달)
   ↓
   LLMReplyService.generate_reply()
   (PlaceAISettings 파라미터 적용)
   ↓
   맞춤형 프롬프트 생성
   ↓
   OpenAI API 호출
   ↓
   답글 반환
```

---

## 📁 생성/수정된 파일

### 생성된 파일
1. `supabase/migrations/005_add_ai_settings_and_session.sql` - Migration 파일
2. `AI_SETTINGS_FIX.md` - 문제 분석 및 해결 가이드
3. `TEST_GUIDE_AI_SETTINGS.md` - 상세 테스트 가이드
4. `AI_SETTINGS_FIX_SUMMARY.md` - 이 문서

### 검토된 파일 (수정 없음)
1. `frontend/app/dashboard/naver/reviews/ai-reply/page.tsx` ✅
2. `frontend/app/dashboard/naver/ai-settings/page.tsx` ✅
3. `backend/app/routers/ai_settings.py` ✅
4. `backend/app/routers/ai_reply.py` ✅
5. `backend/app/services/llm_reply_service.py` ✅
6. `backend/app/models/place_ai_settings.py` ✅

**결론**: 모든 코드가 올바르게 구현되어 있었으며, 문제는 DB 컬럼 누락이었음

---

## 🚀 다음 단계 (사용자 작업 필요)

### 1단계: Migration 적용 (필수)

```sql
-- Supabase Dashboard (https://supabase.com) 접속
-- SQL Editor에서 다음 실행:

ALTER TABLE stores 
  ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS naver_session_encrypted TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS session_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_stores_ai_settings ON stores USING GIN (ai_settings);

COMMENT ON COLUMN stores.ai_settings IS '매장별 AI 답글 생성 설정 (PlaceAISettings JSON)';
COMMENT ON COLUMN stores.naver_session_encrypted IS '네이버 로그인 세션 쿠키 (암호화된 JSON)';
COMMENT ON COLUMN stores.session_saved_at IS '세션 저장 시각';
```

### 2단계: 서버 재시작 (권장)

```bash
# 백엔드
cd backend
uvicorn app.main:app --reload

# 프론트엔드
cd frontend
npm run dev
```

### 3단계: 테스트

`TEST_GUIDE_AI_SETTINGS.md` 파일을 참고하여 다음을 테스트하세요:

1. ✅ AI 설정 페이지 접속
2. ✅ 설정 저장 및 로드
3. ✅ 매장별 다른 설정
4. ✅ AI 답글 생성 시 설정 반영
5. ✅ 친절함/격식 차이 확인

---

## 🎯 예상 결과

### Migration 적용 전
- ❌ AI 설정 저장 불가능
- ❌ 모든 매장이 기본 설정 사용
- ❌ 답글 톤 커스터마이징 불가능

### Migration 적용 후
- ✅ AI 설정 페이지에서 설정 저장 가능
- ✅ 매장별로 다른 설정 적용
- ✅ 답글 톤이 설정에 따라 명확히 변경됨
- ✅ 친절함 10, 격식 9 → 매우 정중하고 따뜻한 답글
- ✅ 친절함 3, 격식 2 → 간결하고 캐주얼한 답글

---

## 📞 문제 발생 시

### 체크리스트
1. [ ] Migration이 정상 적용되었는가?
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'stores' AND column_name = 'ai_settings';
   ```
2. [ ] 백엔드 서버가 실행 중인가?
3. [ ] 프론트엔드 서버가 실행 중인가?
4. [ ] 브라우저 콘솔에 에러가 있는가? (F12)
5. [ ] 백엔드 로그에 에러가 있는가?

### 디버깅 방법
1. **브라우저 개발자 도구 (F12)**
   - Network 탭: API 호출 확인
   - Console 탭: 에러 메시지 확인
   ```javascript
   console.log('aiSettings:', aiSettings)
   ```

2. **백엔드 로그 확인**
   ```
   Using custom AI settings: friendliness=X, formality=Y
   ```

3. **Supabase 데이터 직접 확인**
   ```sql
   SELECT id, store_name, ai_settings FROM stores;
   ```

---

## 📝 결론

**문제**: `stores` 테이블에 `ai_settings` 컬럼 누락

**해결**: Migration 파일 생성 및 적용

**상태**: 
- ✅ Migration 파일 생성 완료
- ✅ 코드 검토 및 검증 완료
- ✅ 테스트 가이드 작성 완료
- ⏳ **사용자의 Migration 적용 대기 중**

**Migration 적용 후 모든 기능이 정상 작동할 것으로 예상됩니다.**

---

**작성일**: 2026-01-14
**작성자**: AI Assistant
**버전**: v1.0
