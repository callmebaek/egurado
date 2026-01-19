# Supabase 데이터베이스 설정

## 초기 설정 방법

1. **Supabase 프로젝트 생성**
   - https://supabase.com 접속
   - 새 프로젝트 생성
   - 리전: Northeast Asia (Seoul) - `ap-northeast-2` 권장

2. **데이터베이스 스키마 적용**
   - Supabase Dashboard → SQL Editor 이동
   - `migrations/001_initial_schema.sql` 파일의 내용을 복사하여 실행

3. **환경변수 설정**
   - Project Settings → API 메뉴에서 다음 정보 확인:
     - `Project URL`: `https://your-project.supabase.co`
     - `anon public` key: 프론트엔드용
     - `service_role` key: 백엔드용 (비공개)

4. **인증 설정**
   - Authentication → Providers 메뉴
   - Google Provider 활성화
   - Naver Provider 설정 (Custom OAuth)

## 마이그레이션 파일

### 001_initial_schema.sql
- 기본 테이블 생성 (profiles, stores, reviews, keywords, rank_history)
- RLS 정책 설정
- 인덱스 및 트리거 생성

## 보안 정책 (RLS)

모든 테이블에 Row Level Security가 적용되어 있습니다:
- 사용자는 본인의 데이터만 조회/수정 가능
- `auth.uid()`를 통한 사용자 식별
- JOIN을 통한 관계형 보안 정책

## 백업 및 복원

Supabase는 자동 백업을 제공하지만, 중요한 데이터는 별도로 백업하는 것을 권장합니다.

```bash
# 데이터베이스 덤프
pg_dump -h your-project.supabase.co -U postgres -d postgres > backup.sql

# 복원
psql -h your-project.supabase.co -U postgres -d postgres < backup.sql
```

## 주의사항

⚠️ **service_role key**는 모든 RLS 정책을 우회합니다. 절대 프론트엔드에 노출하지 마세요!

✅ 프론트엔드: `anon` key 사용
✅ 백엔드: `service_role` key 사용 (서버 환경변수로만 관리)


