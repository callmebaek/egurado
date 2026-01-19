"""
FastAPI 백엔드 서버
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
import asyncio
from loguru import logger

from core.proxy_manager import init_proxy_manager, get_proxy_manager
from core.naver_scraper import NaverPlaceScraper, PlaceRankResult
from database.db import get_db, init_db
from database.models import Place, Keyword, RankHistory


# ============================================
# FastAPI 앱 초기화
# ============================================

app = FastAPI(
    title="Place Rank Checker API",
    description="네이버 플레이스 순위 체크 시스템 (교육용)",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Pydantic 모델 (Request/Response)
# ============================================

class RankCheckRequest(BaseModel):
    """순위 체크 요청"""
    keyword: str = Field(..., min_length=1, max_length=100, description="검색 키워드")
    place_id: Optional[str] = Field(None, description="플레이스 ID")
    place_name: Optional[str] = Field(None, description="플레이스명")

    class Config:
        json_schema_extra = {
            "example": {
                "keyword": "성수사진",
                "place_id": "2072848563",
                "place_name": "아나나사진관 성수스튜디오"
            }
        }


class RankCheckResponse(BaseModel):
    """순위 체크 응답"""
    success: bool
    message: str
    data: Optional[dict] = None


class RankHistoryResponse(BaseModel):
    """순위 기록 응답"""
    keyword: str
    place_id: str
    place_name: str
    history: List[dict]


# ============================================
# 앱 시작/종료 이벤트
# ============================================

@app.on_event("startup")
async def startup_event():
    """앱 시작 시 실행"""
    logger.info("🚀 Place Rank Checker API 시작...")
    
    # 데이터베이스 초기화
    try:
        init_db()
        logger.success("✓ 데이터베이스 연결 성공")
    except Exception as e:
        logger.error(f"✗ 데이터베이스 연결 실패: {e}")
    
    # 프록시 매니저 초기화
    try:
        # 환경변수에서 프록시 목록 로드
        import os
        proxy_list_str = os.getenv("PROXY_LIST", "")
        proxy_list = [p.strip() for p in proxy_list_str.split(",") if p.strip()]
        
        if proxy_list:
            init_proxy_manager(proxy_list)
            logger.success(f"✓ 프록시 매니저 초기화 완료 ({len(proxy_list)}개)")
        else:
            logger.warning("⚠ 프록시 설정 없음 (PROXY_LIST 환경변수)")
            # 빈 프록시 리스트로 초기화 (프록시 없이 동작)
            init_proxy_manager([])
    except Exception as e:
        logger.error(f"✗ 프록시 매니저 초기화 실패: {e}")
        # 빈 프록시 리스트로 초기화
        init_proxy_manager([])


@app.on_event("shutdown")
async def shutdown_event():
    """앱 종료 시 실행"""
    logger.info("👋 Place Rank Checker API 종료...")


# ============================================
# API 엔드포인트
# ============================================

@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "Place Rank Checker API",
        "version": "1.0.0",
        "docs": "/docs",
        "warning": "⚠️ 교육 목적으로만 사용하세요"
    }


@app.get("/health")
async def health_check():
    """헬스 체크"""
    try:
        # 데이터베이스 연결 확인
        db = next(get_db())
        db.execute("SELECT 1")
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # 프록시 매니저 상태
    try:
        proxy_manager = get_proxy_manager()
        proxy_stats = proxy_manager.get_stats()
        proxy_status = "healthy"
    except Exception as e:
        proxy_stats = {}
        proxy_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "running",
        "database": db_status,
        "proxy": proxy_status,
        "proxy_stats": proxy_stats
    }


@app.post("/api/rank/check", response_model=RankCheckResponse)
async def check_rank(
    request: RankCheckRequest,
    background_tasks: BackgroundTasks
):
    """
    플레이스 순위 체크
    
    ⚠️ 이 엔드포인트는 네이버의 비공식 API를 사용합니다.
    """
    try:
        # 입력 검증
        if not request.place_id and not request.place_name:
            raise HTTPException(
                status_code=400,
                detail="place_id 또는 place_name 중 하나는 필수입니다"
            )
        
        logger.info(
            f"순위 체크 요청: 키워드={request.keyword}, "
            f"플레이스={request.place_id or request.place_name}"
        )
        
        # 스크래퍼 생성
        scraper = NaverPlaceScraper(
            use_proxy=True,  # 프록시 사용
            max_retries=3,
            rate_limit_delay=2.0
        )
        
        # 순위 체크 실행
        result: PlaceRankResult = await scraper.search_place(
            keyword=request.keyword,
            place_id=request.place_id,
            place_name=request.place_name
        )
        
        # 데이터베이스에 저장 (백그라운드)
        background_tasks.add_task(
            save_rank_result,
            result
        )
        
        # 응답 반환
        return RankCheckResponse(
            success=True,
            message="순위 체크 완료",
            data={
                "keyword": result.keyword,
                "place_id": result.place_id,
                "place_name": result.place_name,
                "rank": result.rank,
                "found": result.found,
                "total_count": result.total_count,
                "blog_review_count": result.blog_review_count,
                "visitor_review_count": result.visitor_review_count,
                "save_count": result.save_count,
                "category": result.category,
                "address": result.address,
                "checked_at": result.checked_at
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"순위 체크 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/rank/batch", response_model=RankCheckResponse)
async def batch_check_rank(
    requests: List[RankCheckRequest],
    background_tasks: BackgroundTasks
):
    """
    여러 플레이스 일괄 순위 체크
    """
    try:
        if len(requests) > 10:
            raise HTTPException(
                status_code=400,
                detail="한 번에 최대 10개까지만 체크 가능합니다"
            )
        
        logger.info(f"일괄 순위 체크 요청: {len(requests)}개")
        
        # 스크래퍼 생성
        scraper = NaverPlaceScraper(
            use_proxy=True,
            max_retries=3,
            rate_limit_delay=2.0
        )
        
        # 일괄 검색
        searches = [
            {
                "keyword": req.keyword,
                "place_id": req.place_id,
                "place_name": req.place_name
            }
            for req in requests
        ]
        
        results = await scraper.batch_search(searches)
        
        # 데이터베이스에 저장 (백그라운드)
        for result in results:
            background_tasks.add_task(save_rank_result, result)
        
        # 응답 반환
        return RankCheckResponse(
            success=True,
            message=f"{len(results)}개 순위 체크 완료",
            data={
                "results": [
                    {
                        "keyword": r.keyword,
                        "place_id": r.place_id,
                        "place_name": r.place_name,
                        "rank": r.rank,
                        "found": r.found
                    }
                    for r in results
                ]
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"일괄 순위 체크 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/rank/history/{place_id}", response_model=RankHistoryResponse)
async def get_rank_history(
    place_id: str,
    keyword: Optional[str] = None,
    period: int = 30
):
    """
    플레이스 순위 기록 조회
    
    Args:
        place_id: 플레이스 ID
        keyword: 검색 키워드 (선택)
        period: 조회 기간 (일) - 7, 30, 60, 90
    """
    try:
        if period not in [7, 30, 60, 90]:
            raise HTTPException(
                status_code=400,
                detail="period는 7, 30, 60, 90 중 하나여야 합니다"
            )
        
        db = next(get_db())
        
        # 플레이스 조회
        place = db.query(Place).filter(Place.place_id == place_id).first()
        if not place:
            raise HTTPException(status_code=404, detail="플레이스를 찾을 수 없습니다")
        
        # 키워드 조회
        keyword_query = db.query(Keyword).filter(Keyword.place_id == place.id)
        if keyword:
            keyword_query = keyword_query.filter(Keyword.keyword == keyword)
        
        keywords = keyword_query.all()
        if not keywords:
            raise HTTPException(status_code=404, detail="키워드를 찾을 수 없습니다")
        
        # 기간 계산
        start_date = datetime.now() - timedelta(days=period)
        
        # 순위 기록 조회
        history_list = []
        for kw in keywords:
            history = (
                db.query(RankHistory)
                .filter(
                    RankHistory.keyword_id == kw.id,
                    RankHistory.checked_at >= start_date
                )
                .order_by(RankHistory.checked_at.desc())
                .all()
            )
            
            for h in history:
                history_list.append({
                    "keyword": kw.keyword,
                    "rank": h.rank,
                    "blog_review_count": h.blog_review_count,
                    "visitor_review_count": h.visitor_review_count,
                    "save_count": h.save_count,
                    "checked_at": h.checked_at.isoformat()
                })
        
        return RankHistoryResponse(
            keyword=keywords[0].keyword if len(keywords) == 1 else "multiple",
            place_id=place.place_id,
            place_name=place.place_name,
            history=history_list
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"순위 기록 조회 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/proxy/stats")
async def get_proxy_stats():
    """프록시 통계"""
    try:
        proxy_manager = get_proxy_manager()
        stats = proxy_manager.get_stats()
        return stats
    except Exception as e:
        logger.error(f"프록시 통계 조회 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# 헬퍼 함수
# ============================================

def save_rank_result(result: PlaceRankResult):
    """순위 결과를 데이터베이스에 저장"""
    try:
        db = next(get_db())
        
        # 플레이스 생성 또는 조회
        place = db.query(Place).filter(Place.place_id == result.place_id).first()
        if not place:
            place = Place(
                place_id=result.place_id,
                place_name=result.place_name
            )
            db.add(place)
            db.commit()
            db.refresh(place)
        
        # 키워드 생성 또는 조회
        keyword = (
            db.query(Keyword)
            .filter(
                Keyword.place_id == place.id,
                Keyword.keyword == result.keyword
            )
            .first()
        )
        if not keyword:
            keyword = Keyword(
                place_id=place.id,
                keyword=result.keyword
            )
            db.add(keyword)
            db.commit()
            db.refresh(keyword)
        
        # 순위 기록 저장
        rank_history = RankHistory(
            keyword_id=keyword.id,
            rank=result.rank,
            blog_review_count=result.blog_review_count,
            visitor_review_count=result.visitor_review_count,
            save_count=result.save_count,
            checked_at=datetime.now()
        )
        db.add(rank_history)
        db.commit()
        
        logger.success(
            f"순위 기록 저장: {result.place_name} - {result.keyword} - {result.rank}위"
        )
    
    except Exception as e:
        logger.error(f"순위 결과 저장 오류: {e}")
        db.rollback()


# ============================================
# 서버 실행 (개발용)
# ============================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
