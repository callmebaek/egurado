# ⚡ Quick Start Guide

## 🚀 5분 안에 시작하기

### 1단계: 환경 설정

```bash
# 프로젝트 이동
cd place-rank-checker

# 환경변수 파일 복사
cp env.example .env

# .env 파일 편집 (프록시 설정)
nano .env
```

**최소 설정 (.env 파일):**

```bash
# 데이터베이스 (기본값 사용)
DATABASE_URL=postgresql://placerank:placerank123@postgres:5432/placerank

# 프록시 (선택사항, 하지만 권장)
PROXY_LIST=

# 스크래퍼 설정
RATE_LIMIT_DELAY=2.0
MAX_RETRIES=3
```

### 2단계: Docker로 실행

```bash
# 모든 서비스 시작
docker-compose up -d

# 로그 확인 (Ctrl+C로 종료)
docker-compose logs -f backend
```

**기대 출력:**
```
✓ 데이터베이스 연결 성공
✓ 프록시 매니저 초기화 완료
🚀 Place Rank Checker API 시작...
```

### 3단계: 접속 확인

1. **프론트엔드**: http://localhost:3000
2. **백엔드 API**: http://localhost:8000
3. **API 문서**: http://localhost:8000/docs

### 4단계: 첫 순위 체크!

**방법 1: 웹 UI 사용**

1. http://localhost:3000 접속
2. 키워드 입력: `성수사진`
3. 플레이스 ID 입력: `2072848563`
4. "순위 확인" 클릭

**방법 2: curl 사용**

```bash
curl -X POST "http://localhost:8000/api/rank/check" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "성수사진",
    "place_id": "2072848563",
    "place_name": "아나나사진관 성수스튜디오"
  }'
```

---

## 🎯 실전 예제

### 예제 1: 내 플레이스 순위 확인

```bash
curl -X POST "http://localhost:8000/api/rank/check" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "강남 맛집",
    "place_id": "YOUR_PLACE_ID"
  }'
```

### 예제 2: 여러 키워드 동시 체크

```bash
curl -X POST "http://localhost:8000/api/rank/batch" \
  -H "Content-Type: application/json" \
  -d '[
    {"keyword": "강남 맛집", "place_id": "123456"},
    {"keyword": "강남 카페", "place_id": "123456"},
    {"keyword": "강남 술집", "place_id": "123456"}
  ]'
```

### 예제 3: 순위 기록 조회 (최근 30일)

```bash
curl "http://localhost:8000/api/rank/history/YOUR_PLACE_ID?period=30"
```

---

## 🔧 문제 해결

### 429 오류 (Too Many Requests)

**원인**: Rate Limiting에 걸림

**해결**:
```bash
# .env 파일 수정
RATE_LIMIT_DELAY=5.0  # 5초로 증가

# Docker 재시작
docker-compose restart backend
```

### 프록시 연결 실패

**원인**: 프록시 설정 오류

**해결**:
```bash
# 프록시 없이 테스트 (개발용)
PROXY_LIST=

# 또는 유료 프록시 서비스 사용
PROXY_LIST=http://user:pass@proxy.example.com:8080
```

### 서비스가 시작되지 않음

**확인**:
```bash
# 모든 컨테이너 상태 확인
docker-compose ps

# 특정 서비스 로그 확인
docker-compose logs postgres
docker-compose logs backend
docker-compose logs redis

# 모든 서비스 재시작
docker-compose restart
```

---

## 📊 시스템 상태 확인

### 헬스 체크

```bash
# API 상태
curl http://localhost:8000/health

# 프록시 통계
curl http://localhost:8000/api/proxy/stats
```

### 데이터베이스 확인

```bash
# PostgreSQL 접속
docker-compose exec postgres psql -U placerank -d placerank

# 테이블 확인
\dt

# 데이터 확인
SELECT * FROM places LIMIT 10;
SELECT * FROM rank_history ORDER BY checked_at DESC LIMIT 10;
```

---

## 🛑 서비스 중지

```bash
# 모든 서비스 중지
docker-compose down

# 데이터까지 모두 삭제
docker-compose down -v
```

---

## 🎓 다음 단계

1. **상세 가이드 읽기**: [USAGE_GUIDE.md](USAGE_GUIDE.md)
2. **프록시 설정**: 안정적인 순위 체크를 위해 필수
3. **API 문서 확인**: http://localhost:8000/docs
4. **모니터링 설정**: Grafana, Prometheus 연동

---

## ⚠️ 주의사항

- 교육 목적으로만 사용하세요
- 과도한 요청은 자제해 주세요
- 네이버 서비스 약관을 준수하세요
- 법적 책임은 사용자에게 있습니다

---

## 📞 도움이 필요하신가요?

- 📖 상세 가이드: [USAGE_GUIDE.md](USAGE_GUIDE.md)
- 🐛 문제 해결: [USAGE_GUIDE.md#문제-해결](USAGE_GUIDE.md#문제-해결)
- 🔒 법적 경고: [README.md#법적-경고](README.md#법적-경고)

**Happy Ranking! 🚀**
