# Python 3.11 기반 이미지
FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
    && rm -rf /var/lib/apt/lists/*

# Google Chrome 설치 (Selenium용)
RUN wget -q -O /tmp/google-chrome-stable_current_amd64.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get update \
    && apt-get install -y /tmp/google-chrome-stable_current_amd64.deb \
    && rm /tmp/google-chrome-stable_current_amd64.deb \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 파일 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Playwright 브라우저 설치 (Chromium만)
RUN playwright install --with-deps chromium

# 애플리케이션 코드 복사
COPY . .

# 포트 노출
EXPOSE 8000

# 환경 변수 설정 (기본값)
ENV PORT=8000
ENV HOST=0.0.0.0

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/api/health')" || exit 1

# 서버 시작
# 🛡️ Uvicorn 최적화 설정 (100+ 동시 유저 대응)
# --workers 1: APScheduler와 인메모리 레이트 리밋의 정합성을 위해 단일 워커 유지
#              (async FastAPI는 단일 워커로도 수백 개 동시 I/O 요청 처리 가능)
# --limit-concurrency 200: 최대 동시 접속 200개 (100명 × 유저당 2개 커넥션)
# --timeout-keep-alive 30: Keep-alive 30초 (기본 5초 → 연결 재사용 효율 향상)
# --backlog 200: TCP 백로그 200 (대기 큐 크기)
CMD ["sh", "-c", "uvicorn app.main:app --host ${HOST} --port ${PORT} --workers 1 --limit-concurrency 200 --timeout-keep-alive 30 --backlog 200"]
