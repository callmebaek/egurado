# 백엔드 환경 변수 설정 가이드

## 로컬 개발 환경

`backend/.env` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# Supabase 설정
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI API
OPENAI_API_KEY=your-openai-api-key-here

# CORS 설정 (로컬)
ALLOWED_ORIGINS=http://localhost:3000

# 서버 설정 (옵션)
PORT=8000
HOST=0.0.0.0
```

## 프로덕션 환경

### Docker/클라우드 배포 시

환경 변수를 다음과 같이 설정하세요:

```bash
# Supabase 설정
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI API
OPENAI_API_KEY=your-openai-api-key-here

# CORS 설정 (프로덕션)
# 프론트엔드 도메인을 허용해야 함
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com

# 서버 설정
PORT=8000
HOST=0.0.0.0
```

### 여러 도메인 허용

쉼표로 구분하여 여러 도메인을 허용할 수 있습니다:

```bash
ALLOWED_ORIGINS=http://localhost:3000,https://dev.yourdomain.com,https://yourdomain.com
```

## 주의사항

- ⚠️ `.env` 파일은 절대 Git에 커밋하지 마세요 (이미 `.gitignore`에 포함됨)
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY`는 서버 사이드에서만 사용하세요
- ⚠️ 프로덕션에서는 반드시 실제 도메인으로 `ALLOWED_ORIGINS`를 설정하세요
- ⚠️ OpenAI API 키는 비용이 발생하므로 안전하게 관리하세요

## 환경 변수 검증

서버 시작 시 필수 환경 변수가 설정되지 않으면 에러가 발생합니다:

```
ValueError: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되지 않았습니다
```

모든 환경 변수가 올바르게 설정되었는지 확인하세요.
