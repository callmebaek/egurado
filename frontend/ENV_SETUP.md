# 환경 변수 설정 가이드

## 로컬 개발 환경

`frontend/.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# 백엔드 API URL (로컬)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 프로덕션 환경

### Vercel 배포 시

1. Vercel Dashboard → Project Settings → Environment Variables
2. 다음 변수 추가:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_API_URL=https://your-api-domain.com  # 백엔드 API URL
```

### 기타 클라우드 (AWS, GCP, Azure)

환경 변수 설정 방법은 각 플랫폼의 문서를 참고하세요.

## 주의사항

- ⚠️ `.env.local` 파일은 절대 Git에 커밋하지 마세요
- ⚠️ `NEXT_PUBLIC_` 접두사가 있는 변수만 브라우저에서 접근 가능합니다
- ⚠️ 환경 변수 변경 후에는 개발 서버를 재시작해야 합니다
