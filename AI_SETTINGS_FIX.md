# AI 설정 기능 수정 가이드

## 문제 분석

AI 답글 생성 기능에서 우측 상단의 AI 설정이 정상적으로 작동하지 않는 문제가 발생했습니다.

**근본 원인**: `stores` 테이블에 `ai_settings` 컬럼이 없어서 설정을 저장할 수 없었습니다.

## 해결 방법

### 1️⃣ 데이터베이스 Migration 적용 (필수)

Supabase Dashboard에서 다음 SQL을 실행하세요:

```sql
-- Add AI settings and Naver session columns to stores table
-- AI 답글 생성 설정 및 네이버 세션 저장 기능 추가

ALTER TABLE stores 
  ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS naver_session_encrypted TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS session_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_stores_ai_settings ON stores USING GIN (ai_settings);

-- Add comments
COMMENT ON COLUMN stores.ai_settings IS '매장별 AI 답글 생성 설정 (PlaceAISettings JSON)';
COMMENT ON COLUMN stores.naver_session_encrypted IS '네이버 로그인 세션 쿠키 (암호화된 JSON)';
COMMENT ON COLUMN stores.session_saved_at IS '세션 저장 시각';
```

#### Supabase Dashboard에서 실행하는 방법:

1. https://supabase.com 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 **SQL Editor** 클릭
4. **New query** 버튼 클릭
5. 위의 SQL 코드를 복사하여 붙여넣기
6. **Run** 버튼 클릭 (또는 Ctrl/Cmd + Enter)
7. "Success. No rows returned" 메시지 확인

### 2️⃣ 기능 동작 방식

#### AI 설정 저장 흐름

```
1. 사용자가 AI 설정 페이지 접속
   ↓
2. 매장 선택
   ↓
3. 기존 설정 로드 (GET /api/v1/ai-settings/{store_id})
   - stores.ai_settings 컬럼에서 조회
   - 설정이 없으면 기본값 반환
   ↓
4. 설정 수정
   ↓
5. 저장 버튼 클릭 (PUT /api/v1/ai-settings/{store_id})
   - stores.ai_settings 컬럼에 JSONB로 저장
   ↓
6. 성공 메시지 표시
```

#### AI 답글 생성 시 설정 적용 흐름

```
1. AI 답글 생성 페이지 로드
   ↓
2. 매장 선택 시 AI 설정 로드 (GET /api/v1/ai-reply/settings/{store_id})
   - stores.ai_settings 컬럼에서 조회
   ↓
3. 사용자가 "AI 답글 생성" 버튼 클릭
   ↓
4. AI 답글 생성 API 호출 (POST /api/v1/ai-reply/generate)
   - place_settings 파라미터에 AI 설정 전달
   ↓
5. LLMReplyService에서 설정을 적용하여 답글 생성
   - friendliness, formality, reply_length 등 반영
   ↓
6. 생성된 답글 표시
```

### 3️⃣ AI 설정 항목

매장별로 다음 설정을 커스터마이징할 수 있습니다:

#### 기본 설정
- **친절함 정도** (friendliness: 1-10)
- **격식 수준** (formality: 1-10, 1=반말, 10=격식)
- **답글 길이** (reply_length_min, reply_length_max)
- **다양성** (diversity: 0.5-1.0, temperature 값)

#### 스타일 설정
- **텍스트 이모티콘 사용** (use_text_emoticons: boolean)
  - ^^, ㅎㅎ, ^^ 등
- **리뷰 구체 내용 언급** (mention_specifics: boolean)
- **브랜드 톤** (brand_voice: "warm" | "professional" | "casual" | "friendly")
- **응답 스타일** (response_style: "quick_thanks" | "empathy" | "solution")

#### 커스텀 지시사항
- **일반 리뷰 추가 요청사항** (custom_instructions)
- **부정 리뷰 추가 요청사항** (custom_instructions_negative)

### 4️⃣ 검증 방법

Migration 적용 후 다음을 확인하세요:

#### 1. AI 설정 페이지 테스트

```
1. 대시보드 → AI 답글 설정 페이지 접속
2. 매장 선택
3. 설정 변경 (예: 친절함 정도를 9로 변경)
4. "저장" 버튼 클릭
5. "✅ AI 답글 설정이 저장되었습니다!" 메시지 확인
6. 페이지 새로고침
7. 같은 매장 선택 시 저장된 설정이 로드되는지 확인
```

#### 2. AI 답글 생성 테스트

```
1. 대시보드 → AI 답글 생성 페이지 접속
2. 우측 상단 "AI 설정" 버튼으로 설정 페이지 이동
3. 매장별로 다른 설정 저장
   - 매장 A: 친절함 10, 격식 9 (매우 정중)
   - 매장 B: 친절함 5, 격식 3 (캐주얼)
4. AI 답글 생성 페이지로 돌아가기
5. 각 매장 선택하여 리뷰 불러오기
6. AI 답글 생성 시 설정이 반영되는지 확인
   - 매장 A: 정중하고 격식있는 답글
   - 매장 B: 편안하고 캐주얼한 답글
```

#### 3. 데이터베이스 직접 확인 (선택사항)

```sql
-- Supabase SQL Editor에서 실행
SELECT id, store_name, ai_settings 
FROM stores 
WHERE ai_settings IS NOT NULL;
```

### 5️⃣ API 엔드포인트

#### AI 설정 관리 (/api/v1/ai-settings)

- `GET /api/v1/ai-settings/{store_id}` - AI 설정 조회
- `PUT /api/v1/ai-settings/{store_id}` - AI 설정 저장
- `DELETE /api/v1/ai-settings/{store_id}` - AI 설정 삭제 (기본값으로 초기화)

#### AI 답글 생성 (/api/v1/ai-reply)

- `GET /api/v1/ai-reply/settings/{store_id}` - AI 설정 조회 (답글 생성 페이지용)
- `POST /api/v1/ai-reply/generate` - AI 답글 생성 (설정 적용)

### 6️⃣ 트러블슈팅

#### 설정이 저장되지 않는 경우

1. **Migration 확인**
   ```sql
   -- stores 테이블 구조 확인
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'stores';
   
   -- ai_settings 컬럼이 있어야 함
   ```

2. **백엔드 로그 확인**
   ```bash
   # backend 서버 콘솔에서 에러 확인
   # "Error updating AI settings:" 메시지 확인
   ```

3. **브라우저 개발자 도구 확인**
   ```
   F12 → Network 탭 → ai-settings API 호출 확인
   - 상태 코드가 200 OK인지 확인
   - 응답 데이터 확인
   ```

#### 설정이 AI 답글에 반영되지 않는 경우

1. **설정 로드 확인**
   ```javascript
   // 브라우저 콘솔 (F12)에서 확인
   console.log(aiSettings)
   ```

2. **백엔드 로그 확인**
   ```bash
   # "Using custom AI settings: friendliness=X, formality=Y" 메시지 확인
   ```

## 완료 체크리스트

- [ ] Migration SQL 실행 완료
- [ ] AI 설정 페이지에서 설정 저장 테스트 완료
- [ ] 페이지 새로고침 후 설정 로드 확인
- [ ] 매장별로 다른 설정 저장 확인
- [ ] AI 답글 생성 시 설정 반영 확인
- [ ] 우측 상단 "AI 설정" 버튼 동작 확인

## 추가 개선 사항 (향후)

1. **설정 프리셋**: 자주 사용하는 설정 조합을 프리셋으로 저장
2. **설정 복사**: 한 매장의 설정을 다른 매장으로 복사
3. **A/B 테스트**: 서로 다른 설정으로 답글 생성 후 비교
4. **설정 히스토리**: 설정 변경 이력 추적
