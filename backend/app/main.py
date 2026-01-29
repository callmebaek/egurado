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
    from app.core.database import check_database_connection
    
    db_connected = await check_database_connection()
    
    return {
        "status": "ok" if db_connected else "warning",
        "message": "Egurado API is running",
        "database_connected": db_connected
    }


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

