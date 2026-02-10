"""
Egurado Backend API
네이버 플레이스 및 구글 비즈니스 프로필 통합 관리 서비스
Updated: 2026-01-12 - 매장명 검색량 기능 업데이트
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import sys
import asyncio
import logging
from contextlib import asynccontextmanager

# Windows에서 Playwright async subprocess 지원을 위한 이벤트 루프 정책 설정
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# 환경변수 로드
load_dotenv()

# 로깅 설정 (모든 로거에 적용)
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s:     %(name)s - %(message)s'
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 시작/종료 시 실행"""
    # 시작 시
    from app.core.scheduler import start_scheduler
    start_scheduler()
    print("[OK] Egurado API started")
    
    yield
    
    # 종료 시
    from app.core.scheduler import stop_scheduler
    stop_scheduler()
    print("[OK] Egurado API stopped")


app = FastAPI(
    title="Egurado API",
    description="네이버 플레이스 및 구글 비즈니스 프로필 관리 API",
    version="1.0.1",
    lifespan=lifespan
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 글로벌 Supabase 클라이언트 세션 무결성 보호 미들웨어
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class SessionIntegrityMiddleware(BaseHTTPMiddleware):
    """
    모든 요청 전에 글로벌 Supabase 클라이언트의 세션 무결성을 검증합니다.
    
    만약 누군가 실수로 글로벌 클라이언트에서 auth.sign_in()을 호출하여
    세션이 오염되더라도, 다음 요청에서 자동으로 감지하고 복구합니다.
    """
    _check_counter = 0
    _check_interval = 10  # 매 10번째 요청마다 검증 (성능 최적화)
    
    async def dispatch(self, request: Request, call_next):
        # 매 N번째 요청마다 세션 무결성 검증 (성능과 안전성 균형)
        SessionIntegrityMiddleware._check_counter += 1
        if SessionIntegrityMiddleware._check_counter >= SessionIntegrityMiddleware._check_interval:
            SessionIntegrityMiddleware._check_counter = 0
            from app.core.database import verify_client_integrity
            verify_client_integrity()
        
        response = await call_next(request)
        return response

app.add_middleware(SessionIntegrityMiddleware)


@app.get("/")
async def root():
    """헬스체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "Egurado API",
        "version": "1.0.0"
    }


@app.get("/api/health")
async def health_check():
    """API 상태 확인"""
    from app.core.database import check_database_connection, verify_client_integrity
    
    # 글로벌 Supabase 클라이언트 세션 무결성 검증
    client_healthy = verify_client_integrity()
    db_connected = await check_database_connection()
    
    return {
        "status": "ok" if db_connected else "warning",
        "message": "Egurado API is running",
        "database_connected": db_connected,
        "client_session_healthy": client_healthy
    }


@app.get("/api/v1/system/proxy-status")
async def proxy_status():
    """
    프록시 상태 실시간 모니터링
    
    브라우저에서 https://api.whiplace.com/api/v1/system/proxy-status 로 접속하여 확인 가능
    
    Returns:
        - proxy: 프록시 설정 및 활성 상태
        - stats: 요청 통계 (프록시/직접 성공률)
        - recent_requests: 최근 50건의 요청 이력
    """
    from app.core.proxy import get_proxy_status
    return get_proxy_status()


# 라우터 등록
# 라우터 import
from app.routers.auth import router as auth_router
from app.routers.naver import router as naver_router
from app.routers.reviews import router as reviews_router
from app.routers.keywords import router as keywords_router
from app.routers.keyword_search_volume import router as keyword_search_volume_router
from app.routers.target_keywords import router as target_keywords_router
from app.routers.google import router as google_router
from app.routers.stores import router as stores_router
from app.routers.ai_reply import router as ai_reply_router
from app.routers.naver_session import router as naver_session_router
from app.routers.ai_settings import router as ai_settings_router
from app.routers.metric_tracker import router as metric_tracker_router
from app.routers.votes import router as votes_router
from app.routers.onboarding import router as onboarding_router
from app.routers.contact import router as contact_router

# Credit System Routers (NEW)
from app.routers.credits import router as credits_router
from app.routers.subscriptions import router as subscriptions_router
from app.routers.payments import router as payments_router

# New Dashboard Feature Routers (2026-02-04)
from app.routers.notifications import router as notifications_router
from app.routers.support import router as support_router
from app.routers.admin import router as admin_router
from app.routers.user_settings import router as user_settings_router

# 라우터 등록
app.include_router(auth_router, prefix="/api/v1", tags=["Auth"])
app.include_router(stores_router, prefix="/api/v1/stores", tags=["Stores"])
app.include_router(naver_router, prefix="/api/v1/naver", tags=["Naver"])
app.include_router(google_router, prefix="/api/v1/google", tags=["Google"])
app.include_router(reviews_router, prefix="/api/v1/reviews", tags=["Reviews"])
app.include_router(keywords_router, prefix="/api/v1/keywords", tags=["Keywords"])
app.include_router(keyword_search_volume_router, prefix="/api/v1/keyword-search-volume", tags=["Keyword Search Volume"])
app.include_router(target_keywords_router, prefix="/api/v1/target-keywords", tags=["Target Keywords"])
app.include_router(ai_reply_router, prefix="/api/v1/ai-reply", tags=["AI Reply"])
app.include_router(naver_session_router, prefix="/api/v1/naver-session", tags=["Naver Session"])
app.include_router(ai_settings_router, tags=["AI Settings"])
app.include_router(metric_tracker_router, prefix="/api/v1/metrics", tags=["Metric Tracker"])
app.include_router(votes_router, tags=["Feature Voting"])
app.include_router(onboarding_router, prefix="/api/v1", tags=["Onboarding"])
app.include_router(contact_router, prefix="/api/v1/contact", tags=["Contact"])

# Credit System Routers (NEW)
app.include_router(credits_router, tags=["Credits"])
app.include_router(subscriptions_router, tags=["Subscriptions"])
app.include_router(payments_router, tags=["Payments"])

# New Dashboard Feature Routers (2026-02-04)
app.include_router(notifications_router)
app.include_router(support_router)
app.include_router(admin_router)
app.include_router(user_settings_router)