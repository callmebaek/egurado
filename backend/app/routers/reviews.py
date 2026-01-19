"""
리뷰 관리 API 엔드포인트
- 리뷰 조회 및 분석
- 통계 저장/조회
"""
import logging
import time
from datetime import datetime, date
from typing import List, Optional
from uuid import UUID
import pytz

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import asyncio

from app.services.naver_review_service import NaverReviewService
from app.services.review_sentiment_service import ReviewSentimentService
from app.core.database import get_supabase_client

# 한국 시간대
KST = pytz.timezone('Asia/Seoul')

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================
# Pydantic 모델
# ============================================

class AnalyzeReviewsRequest(BaseModel):
    """리뷰 분석 요청"""
    store_id: str
    start_date: Optional[str] = None  # YYYY-MM-DD, None이면 오늘
    end_date: Optional[str] = None    # YYYY-MM-DD, None이면 오늘


class ExtractReviewsRequest(BaseModel):
    """리뷰 추출 요청 (분석 없이)"""
    store_id: str
    start_date: Optional[str] = None  # YYYY-MM-DD, None이면 오늘
    end_date: Optional[str] = None    # YYYY-MM-DD, None이면 오늘


class ExtractedReviewResponse(BaseModel):
    """추출된 리뷰 응답"""
    naver_review_id: str
    review_type: str
    author_name: str
    rating: Optional[float]
    content: str
    review_date: str
    images: List[str]


class ExtractReviewsResponse(BaseModel):
    """리뷰 추출 응답"""
    status: str
    store_id: str
    total_reviews: int
    reviews: List[ExtractedReviewResponse]
    start_date: str
    end_date: str


class ReviewStatsResponse(BaseModel):
    """리뷰 통계 응답"""
    status: str
    store_id: str
    date: str
    checked_at: str
    
    # 방문자 리뷰 통계
    visitor_review_count: int
    visitor_positive_count: int
    visitor_neutral_count: int
    visitor_negative_count: int
    visitor_receipt_count: int
    visitor_reservation_count: int
    photo_review_count: int  # 사진 포함 리뷰 수
    average_temperature: float  # 평균 리뷰 온도
    
    # 블로그 리뷰 통계
    blog_review_count: int
    
    # 요약
    summary: str


class ReviewItemResponse(BaseModel):
    """개별 리뷰 응답"""
    id: str
    naver_review_id: str
    review_type: str
    author_name: str
    is_receipt_review: bool
    is_reservation_review: bool
    rating: Optional[float]
    content: str
    images: List[str]
    sentiment: str
    temperature_score: int
    confidence: float
    review_date: str
    like_count: int


# ============================================
# API 엔드포인트
# ============================================

@router.post("/extract", response_model=ExtractReviewsResponse)
async def extract_reviews(request: ExtractReviewsRequest):
    """
    리뷰 추출 (분석 없이)
    
    빠르게 리뷰만 추출하여 반환합니다.
    이후 analyze-stream으로 실시간 분석을 진행합니다.
    """
    print("=" * 80, flush=True)
    print("EXTRACT_REVIEWS FUNCTION CALLED!", flush=True)
    print("=" * 80, flush=True)
    try:
        print("1. try 블록 진입", flush=True)
        store_id = request.store_id
        print(f"2. store_id = {store_id}", flush=True)
        kst_now = datetime.now(KST)
        today_str = kst_now.strftime("%Y-%m-%d")
        
        start_date_str = request.start_date or today_str
        end_date_str = request.end_date or today_str
        print(f"3. Period = {start_date_str} ~ {end_date_str}", flush=True)
        
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
        
        # 날짜 범위 계산 (디버깅용)
        date_diff = (end_date - start_date).days + 1  # +1은 시작일 포함
        print(f"   -> Total days in range: {date_diff} days (including both start and end dates)", flush=True)
        print(f"   -> Today (KST): {today_str}", flush=True)
        
        print(f"4. 매장 정보 조회 시작", flush=True)
        
        # 1. 매장 정보 조회
        supabase = get_supabase_client()
        print(f"5. Supabase 클라이언트 생성 완료", flush=True)
        store_result = supabase.table("stores").select("*").eq("id", store_id).single().execute()
        print(f"6. 매장 정보 조회 완료", flush=True)
        if not store_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다"
            )
        
        store = store_result.data
        naver_place_id = store.get("place_id")
        print(f"7. naver_place_id = {naver_place_id}", flush=True)
        
        if not naver_place_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="네이버 플레이스 ID가 등록되지 않은 매장입니다"
            )
        
        # 2. 네이버에서 리뷰 추출 (분석 없이)
        review_service = NaverReviewService()
        print(f"8. get_reviews_by_date_range 호출 시작", flush=True)
        visitor_reviews = await review_service.get_reviews_by_date_range(
            naver_place_id,
            start_date,
            end_date
        )
        
        print(f"9. 리뷰 추출 완료: {len(visitor_reviews)}개", flush=True)
        
        # 3. 리뷰 데이터 파싱
        parsed_reviews = []
        for review in visitor_reviews:
            parsed = review_service.parse_review_data(review, "visitor")
            parsed_reviews.append(ExtractedReviewResponse(
                naver_review_id=parsed["naver_review_id"],
                review_type=parsed["review_type"],
                author_name=parsed["author_name"],
                rating=parsed["rating"],
                content=parsed["content"],
                review_date=parsed["review_date"],
                images=parsed["images"]
            ))
        
        return ExtractReviewsResponse(
            status="success",
            store_id=store_id,
            total_reviews=len(parsed_reviews),
            reviews=parsed_reviews,
            start_date=start_date_str,
            end_date=end_date_str
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"리뷰 추출 실패: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"리뷰 추출 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/analyze", response_model=ReviewStatsResponse)
async def analyze_store_reviews(request: AnalyzeReviewsRequest):
    """
    매장의 리뷰를 분석하여 통계 생성
    
    1. 네이버에서 리뷰 조회 (방문자 + 블로그)
    2. OpenAI로 감성 분석
    3. DB에 저장 (일별 통계 + 개별 리뷰)
    4. 통계 반환
    """
    try:
        store_id = request.store_id
        # 한국 시간 기준으로 오늘 날짜 계산
        kst_now = datetime.now(KST)
        today_str = kst_now.strftime("%Y-%m-%d")
        
        # 날짜 범위 설정
        start_date_str = request.start_date or today_str
        end_date_str = request.end_date or today_str
        
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
        
        logger.info(f"리뷰 분석 시작: store_id={store_id}, 기간={start_date_str} ~ {end_date_str}")
        start_time = time.time()
        
        # 1. 매장 정보 조회
        supabase = get_supabase_client()
        store_result = supabase.table("stores").select("*").eq("id", store_id).single().execute()
        if not store_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다"
            )
        
        store = store_result.data
        naver_place_id = store.get("place_id")
        category = store.get("category", "")
        
        if not naver_place_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="네이버 플레이스 ID가 등록되지 않은 매장입니다"
            )
        
        # 2. 네이버 리뷰 조회
        step_start = time.time()
        review_service = NaverReviewService()
        
        # 방문자 리뷰 (기간 내 작성된 것)
        visitor_reviews = await review_service.get_reviews_by_date_range(
            naver_place_id, 
            start_date,
            end_date
        )
        fetch_time = time.time() - step_start
        logger.info(f"⏱️ 방문자 리뷰 조회 완료: {len(visitor_reviews)}개 (소요시간: {fetch_time:.2f}초)")
        
        # 블로그 리뷰 (총 개수만)
        blog_result = await review_service.get_blog_reviews(naver_place_id, page=1, size=1)
        blog_review_count = blog_result.get("total", 0)
        logger.info(f"블로그 리뷰 수: {blog_review_count}개")
        
        # 3. 방문자 리뷰 파싱
        parsed_reviews = []
        for review in visitor_reviews:
            parsed = review_service.parse_review_data(review, "visitor")
            parsed_reviews.append(parsed)
        
        # 4. OpenAI 감성 분석
        step_start = time.time()
        sentiment_service = ReviewSentimentService()
        analyzed_reviews = await sentiment_service.analyze_reviews_batch(
            parsed_reviews,
            context=category
        )
        analysis_time = time.time() - step_start
        logger.info(f"⏱️ 감성 분석 완료: {len(analyzed_reviews)}개 (소요시간: {analysis_time:.2f}초)")
        
        # 5. 통계 계산
        stats = {
            "positive": len([r for r in analyzed_reviews if r.get("sentiment") == "positive"]),
            "neutral": len([r for r in analyzed_reviews if r.get("sentiment") == "neutral"]),
            "negative": len([r for r in analyzed_reviews if r.get("sentiment") == "negative"]),
            "receipt": len([r for r in analyzed_reviews if r.get("is_receipt_review")]),
            "reservation": len([r for r in analyzed_reviews if r.get("is_reservation_review")])
        }
        
        # 6. 일별 요약 생성
        summary = await sentiment_service.generate_daily_summary(
            analyzed_reviews, 
            stats,
            start_date_str,
            end_date_str
        )
        
        # 7. DB 저장
        # 7-1. 기존 통계 삭제 (같은 조회일, 같은 매장)
        today_date = datetime.now(KST).strftime("%Y-%m-%d")
        supabase.table("review_stats").delete().eq("store_id", store_id).eq("date", today_date).execute()
        
        # 7-2. 통계 저장
        stats_data = {
            "store_id": store_id,
            "date": today_date,  # 조회 시점 날짜
            "visitor_review_count": len(analyzed_reviews),
            "visitor_positive_count": stats["positive"],
            "visitor_neutral_count": stats["neutral"],
            "visitor_negative_count": stats["negative"],
            "visitor_receipt_count": stats["receipt"],
            "visitor_reservation_count": stats["reservation"],
            "blog_review_count": blog_review_count,
            "summary": summary,
            "checked_at": datetime.now(KST).isoformat()
        }
        
        stats_insert_result = supabase.table("review_stats").insert(stats_data).execute()
        review_stats_id = stats_insert_result.data[0]["id"]
        logger.info(f"통계 저장 완료: id={review_stats_id}")
        
        # 7-3. 개별 리뷰 저장
        for review in analyzed_reviews:
            review_data = {
                "store_id": store_id,
                "review_stats_id": review_stats_id,
                "naver_review_id": review.get("naver_review_id"),
                "review_type": review.get("review_type"),
                "author_name": review.get("author_name"),
                "author_id": review.get("author_id"),
                "author_review_count": review.get("author_review_count", 0),
                "is_receipt_review": review.get("is_receipt_review", False),
                "is_reservation_review": review.get("is_reservation_review", False),
                "rating": review.get("rating"),
                "content": review.get("content"),
                "images": review.get("images", []),
                "sentiment": review.get("sentiment"),
                "temperature_score": review.get("temperature_score"),
                "confidence": review.get("confidence"),
                "evidence_quotes": review.get("evidence_quotes", []),
                "aspect_sentiments": review.get("aspect_sentiments", {}),
                "review_date": review.get("review_date"),
                "like_count": review.get("like_count", 0),
                "comment_count": review.get("comment_count", 0)
            }
            
            # 중복 체크 후 삽입 (upsert)
            existing = supabase.table("reviews").select("id").eq(
                "naver_review_id", review_data["naver_review_id"]
            ).execute()
            
            if existing.data:
                # 업데이트
                supabase.table("reviews").update(review_data).eq(
                    "id", existing.data[0]["id"]
                ).execute()
            else:
                # 삽입
                supabase.table("reviews").insert(review_data).execute()
        
        logger.info(f"리뷰 저장 완료: {len(analyzed_reviews)}개")
        
        total_time = time.time() - start_time
        logger.info(f"⏱️ 전체 분석 완료: 총 소요시간 {total_time:.2f}초 (리뷰 조회: {fetch_time:.2f}초, AI 분석: {analysis_time:.2f}초)")
        
        # 8. 응답 반환
        return ReviewStatsResponse(
            status="success",
            store_id=store_id,
            date=today_date,
            checked_at=datetime.now(KST).isoformat(),
            visitor_review_count=len(analyzed_reviews),
            visitor_positive_count=stats["positive"],
            visitor_neutral_count=stats["neutral"],
            visitor_negative_count=stats["negative"],
            visitor_receipt_count=stats["receipt"],
            visitor_reservation_count=stats["reservation"],
            blog_review_count=blog_review_count,
            summary=summary
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"리뷰 분석 실패: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"리뷰 분석 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/analyze-stream")
async def analyze_reviews_stream(store_id: str, start_date: str, end_date: str):
    """
    리뷰 실시간 스트리밍 분석 (SSE)
    
    추출된 리뷰를 하나씩 분석하면서 진행 상황을 실시간으로 전송합니다.
    """
    async def event_generator():
        try:
            logger.info(f"스트리밍 분석 시작: store_id={store_id}, 기간={start_date} ~ {end_date}")
            
            # 1. 매장 정보 조회
            supabase = get_supabase_client()
            store_result = supabase.table("stores").select("*").eq("id", store_id).single().execute()
            if not store_result.data:
                yield f"data: {json.dumps({'type': 'error', 'message': '매장을 찾을 수 없습니다'})}\n\n"
                return
            
            store = store_result.data
            naver_place_id = store.get("place_id")
            category = store.get("category", "")
            
            if not naver_place_id:
                yield f"data: {json.dumps({'type': 'error', 'message': '네이버 플레이스 ID가 없습니다'})}\n\n"
                return
            
            # 2. 리뷰 추출
            review_service = NaverReviewService()
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            
            visitor_reviews = await review_service.get_reviews_by_date_range(
                naver_place_id,
                start_dt,
                end_dt
            )
            
            total_reviews = len(visitor_reviews)
            logger.info(f"추출된 리뷰 수: {total_reviews}개")
            
            # 진행 상황 초기화
            yield f"data: {json.dumps({'type': 'init', 'total': total_reviews})}\n\n"
            
            # 3. 리뷰 파싱
            parsed_reviews = []
            for review in visitor_reviews:
                parsed = review_service.parse_review_data(review, "visitor")
                parsed_reviews.append(parsed)
            
            # 4. 하나씩 분석 (실시간 스트리밍)
            sentiment_service = ReviewSentimentService()
            analyzed_reviews = []
            stats = {"positive": 0, "neutral": 0, "negative": 0}
            
            for idx, review in enumerate(parsed_reviews, 1):
                # 진행 상황 전송
                yield f"data: {json.dumps({'type': 'progress', 'current': idx, 'total': total_reviews})}\n\n"
                
                # 빈 리뷰 처리
                if not review.get("content", "").strip():
                    # 빈 리뷰도 기본값으로 추가
                    analyzed_review = {
                        **review,
                        "sentiment": "neutral",
                        "temperature_score": 50,
                        "confidence": 0.0,
                        "evidence_quotes": [],
                        "aspect_sentiments": {}
                    }
                    analyzed_reviews.append(analyzed_review)
                    stats["neutral"] = stats.get("neutral", 0) + 1
                    print(f"Empty review included as neutral (idx={idx}): naver_id={review.get('naver_review_id')}", flush=True)
                    
                    # 빈 리뷰도 전송
                    yield f"data: {json.dumps({
                        'type': 'review_analyzed',
                        'review': {
                            'id': review.get('naver_review_id'),
                            'author': review.get('author_name'),
                            'content': '(빈 리뷰)',
                            'sentiment': 'neutral',
                            'temperature_score': 50,
                            'rating': review.get('rating')
                        }
                    })}\n\n"
                    
                    # 통계 전송
                    yield f"data: {json.dumps({'type': 'stats_update', **stats})}\n\n"
                    
                    continue
                
                # 리뷰 분석
                try:
                    analysis = await sentiment_service.analyze_review(
                        review.get("content", ""),
                        review.get("rating"),
                        category
                    )
                    
                    # 분석 결과 병합
                    analyzed_review = {**review, **analysis}
                    analyzed_reviews.append(analyzed_review)
                    
                    # 통계 업데이트
                    sentiment = analysis.get("sentiment", "neutral")
                    stats[sentiment] = stats.get(sentiment, 0) + 1
                    
                    # 분석된 리뷰 전송
                    yield f"data: {json.dumps({
                        'type': 'review_analyzed',
                        'review': {
                            'id': review.get('naver_review_id'),
                            'author': review.get('author_name'),
                            'content': review.get('content')[:100] + '...' if len(review.get('content', '')) > 100 else review.get('content'),
                            'sentiment': sentiment,
                            'temperature_score': analysis.get('temperature_score'),
                            'rating': review.get('rating')
                        }
                    })}\n\n"
                    
                    # 통계 전송
                    yield f"data: {json.dumps({'type': 'stats_update', **stats})}\n\n"
                    
                    # Rate limit 회피를 위한 짧은 대기
                    await asyncio.sleep(0.1)
                    
                except Exception as e:
                    # 분석 실패 시에도 기본값으로 추가
                    print(f"Review analysis failed, included as neutral (idx={idx}): {str(e)}", flush=True)
                    analyzed_review = {
                        **review,
                        "sentiment": "neutral",
                        "temperature_score": 50,
                        "confidence": 0.0,
                        "evidence_quotes": [],
                        "aspect_sentiments": {}
                    }
                    analyzed_reviews.append(analyzed_review)
                    stats["neutral"] = stats.get("neutral", 0) + 1
                    
                    # 실패한 리뷰도 전송
                    yield f"data: {json.dumps({
                        'type': 'review_analyzed',
                        'review': {
                            'id': review.get('naver_review_id'),
                            'author': review.get('author_name'),
                            'content': review.get('content', '')[:100] + '...' if len(review.get('content', '')) > 100 else review.get('content', ''),
                            'sentiment': 'neutral',
                            'temperature_score': 50,
                            'rating': review.get('rating')
                        }
                    })}\n\n"
                    
                    # 통계 전송
                    yield f"data: {json.dumps({'type': 'stats_update', **stats})}\n\n"
            
            # 5. 요약 생성
            logger.info(f"요약 생성 시작...")
            summary = await sentiment_service.generate_daily_summary(
                analyzed_reviews,
                stats,
                start_date,
                end_date
            )
            
            # 6. DB 저장
            today_date = datetime.now(KST).strftime("%Y-%m-%d")
            supabase.table("review_stats").delete().eq("store_id", store_id).eq("date", today_date).execute()
            
            blog_result = await review_service.get_blog_reviews(naver_place_id, page=1, size=1)
            blog_review_count = blog_result.get("total", 0)
            
            # 사진 포함 리뷰 수 계산
            photo_review_count = sum(1 for r in analyzed_reviews if r.get("images") and len(r.get("images", [])) > 0)
            
            # 평균 리뷰 온도 계산
            temperature_scores = [r.get("temperature_score", 0) for r in analyzed_reviews if r.get("temperature_score") is not None]
            average_temperature = round(sum(temperature_scores) / len(temperature_scores), 1) if temperature_scores else 0.0
            
            stats_data = {
                "store_id": store_id,
                "date": today_date,
                "visitor_review_count": len(analyzed_reviews),
                "visitor_positive_count": stats["positive"],
                "visitor_neutral_count": stats["neutral"],
                "visitor_negative_count": stats["negative"],
                "visitor_receipt_count": sum(1 for r in analyzed_reviews if r.get("is_receipt_review")),
                "visitor_reservation_count": sum(1 for r in analyzed_reviews if r.get("is_reservation_review")),
                "photo_review_count": photo_review_count,
                "average_temperature": average_temperature,
                "blog_review_count": blog_review_count,
                "summary": summary,
                "checked_at": datetime.now(KST).isoformat()
            }
            
            stats_insert_result = supabase.table("review_stats").insert(stats_data).execute()
            review_stats_id = stats_insert_result.data[0]["id"]
            
            # 개별 리뷰 저장
            saved_count = 0
            failed_count = 0
            skipped_count = 0
            
            for idx, review in enumerate(analyzed_reviews, 1):
                try:
                    naver_review_id = review.get("naver_review_id")
                    
                    # 기존 리뷰 존재 여부 확인
                    existing = supabase.table("reviews").select("id").eq("naver_review_id", naver_review_id).execute()
                    
                    if existing.data:
                        # 기존 리뷰가 있으면 업데이트
                        review_data = {
                            "store_id": store_id,
                            "review_stats_id": review_stats_id,
                            "review_type": review.get("review_type"),
                            "author_name": review.get("author_name"),
                            "author_id": review.get("author_id"),
                            "author_review_count": review.get("author_review_count", 0),
                            "is_receipt_review": review.get("is_receipt_review", False),
                            "is_reservation_review": review.get("is_reservation_review", False),
                            "rating": review.get("rating"),
                            "content": review.get("content"),
                            "images": review.get("images", []),
                            "sentiment": review.get("sentiment"),
                            "temperature_score": review.get("temperature_score"),
                            "confidence": review.get("confidence"),
                            "evidence_quotes": review.get("evidence_quotes", []),
                            "aspect_sentiments": review.get("aspect_sentiments", {}),
                            "review_date": review.get("review_date"),
                            "like_count": review.get("like_count", 0),
                            "comment_count": review.get("comment_count", 0),
                            "created_at": datetime.now(KST).isoformat()
                        }
                        supabase.table("reviews").update(review_data).eq("naver_review_id", naver_review_id).execute()
                        skipped_count += 1
                    else:
                        # 새 리뷰 삽입
                        review_data = {
                            "store_id": store_id,
                            "review_stats_id": review_stats_id,
                            "naver_review_id": naver_review_id,
                            "review_type": review.get("review_type"),
                            "author_name": review.get("author_name"),
                            "author_id": review.get("author_id"),
                            "author_review_count": review.get("author_review_count", 0),
                            "is_receipt_review": review.get("is_receipt_review", False),
                            "is_reservation_review": review.get("is_reservation_review", False),
                            "rating": review.get("rating"),
                            "content": review.get("content"),
                            "images": review.get("images", []),
                            "sentiment": review.get("sentiment"),
                            "temperature_score": review.get("temperature_score"),
                            "confidence": review.get("confidence"),
                            "evidence_quotes": review.get("evidence_quotes", []),
                            "aspect_sentiments": review.get("aspect_sentiments", {}),
                            "review_date": review.get("review_date"),
                            "like_count": review.get("like_count", 0),
                            "comment_count": review.get("comment_count", 0),
                            "created_at": datetime.now(KST).isoformat()
                        }
                        supabase.table("reviews").insert(review_data).execute()
                    
                    saved_count += 1
                except Exception as insert_error:
                    failed_count += 1
                    print(f"Review {idx}/{len(analyzed_reviews)} save failed - naver_id={review.get('naver_review_id')}: {str(insert_error)}", flush=True)
            
            print(f"Review save summary: {saved_count} saved ({skipped_count} updated), {failed_count} failed out of {len(analyzed_reviews)} total", flush=True)
            
            # 7. 완료 전송
            yield f"data: {json.dumps({
                'type': 'complete',
                'summary': summary,
                'total_analyzed': len(analyzed_reviews),
                'stats': stats
            })}\n\n"
            
            logger.info(f"✅ 스트리밍 분석 완료: {len(analyzed_reviews)}개")
            
        except Exception as e:
            logger.error(f"스트리밍 분석 오류: {str(e)}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Nginx 버퍼링 비활성화
        }
    )


@router.get("/stats/{store_id}", response_model=ReviewStatsResponse)
async def get_review_stats(store_id: str, date: Optional[str] = None):
    """
    저장된 리뷰 통계 조회
    
    Args:
        store_id: 매장 ID
        date: 날짜 (YYYY-MM-DD), None이면 최신
    """
    try:
        supabase = get_supabase_client()
        query = supabase.table("review_stats").select("*").eq("store_id", store_id)
        
        if date:
            query = query.eq("date", date)
        else:
            query = query.order("date", desc=True).limit(1)
        
        result = query.execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="리뷰 통계를 찾을 수 없습니다"
            )
        
        stats = result.data[0]
        
        return ReviewStatsResponse(
            status="success",
            store_id=stats["store_id"],
            date=stats["date"],
            checked_at=stats["checked_at"],
            visitor_review_count=stats["visitor_review_count"],
            visitor_positive_count=stats["visitor_positive_count"],
            visitor_neutral_count=stats["visitor_neutral_count"],
            visitor_negative_count=stats["visitor_negative_count"],
            visitor_receipt_count=stats["visitor_receipt_count"],
            visitor_reservation_count=stats["visitor_reservation_count"],
            photo_review_count=stats["photo_review_count"],
            average_temperature=stats.get("average_temperature", 0.0),
            blog_review_count=stats["blog_review_count"],
            summary=stats["summary"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"통계 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="통계 조회 중 오류가 발생했습니다"
        )


@router.get("/list/{store_id}", response_model=List[ReviewItemResponse])
async def get_reviews_list(
    store_id: str,
    date: Optional[str] = None,
    sentiment: Optional[str] = None,  # positive, neutral, negative
    is_receipt: Optional[bool] = None,
    is_reservation: Optional[bool] = None
):
    """
    개별 리뷰 목록 조회 (필터 지원)
    
    Args:
        store_id: 매장 ID
        date: 날짜 (YYYY-MM-DD), None이면 최신
        sentiment: 감성 필터
        is_receipt: 영수증 리뷰 필터
        is_reservation: 예약자 리뷰 필터
    """
    try:
        supabase = get_supabase_client()
        
        # 1. 통계 ID 조회
        stats_query = supabase.table("review_stats").select("id").eq("store_id", store_id)
        
        if date:
            stats_query = stats_query.eq("date", date)
        else:
            stats_query = stats_query.order("date", desc=True).limit(1)
        
        stats_result = stats_query.execute()
        
        if not stats_result.data:
            return []
        
        review_stats_id = stats_result.data[0]["id"]
        
        # 2. 리뷰 조회
        query = supabase.table("reviews").select("*").eq("review_stats_id", review_stats_id)
        
        # 필터 적용
        if sentiment:
            query = query.eq("sentiment", sentiment)
        if is_receipt is not None:
            query = query.eq("is_receipt_review", is_receipt)
        if is_reservation is not None:
            query = query.eq("is_reservation_review", is_reservation)
        
        query = query.order("review_date", desc=True)
        
        result = query.execute()
        
        # 3. 응답 변환
        reviews = []
        for review in result.data:
            reviews.append(ReviewItemResponse(
                id=review["id"],
                naver_review_id=review["naver_review_id"],
                review_type=review["review_type"],
                author_name=review["author_name"],
                is_receipt_review=review["is_receipt_review"],
                is_reservation_review=review["is_reservation_review"],
                rating=review["rating"],
                content=review["content"],
                images=review["images"] or [],
                sentiment=review["sentiment"],
                temperature_score=review["temperature_score"],
                confidence=review["confidence"],
                review_date=review["review_date"],
                like_count=review["like_count"]
            ))
        
        logger.info(f"리뷰 목록 조회 완료: {len(reviews)}개")
        return reviews
        
    except Exception as e:
        logger.error(f"리뷰 목록 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="리뷰 목록 조회 중 오류가 발생했습니다"
        )


@router.get("/place-info/{store_id}")
async def get_place_info(store_id: str):
    """
    특정 매장의 네이버 플레이스 정보 조회
    - 매장명, 방문자 리뷰 수, 블로그 리뷰 수, 평점, 한줄평
    """
    try:
        print(f"[DEBUG] 매장 정보 조회 시작: store_id={store_id}", flush=True)
        logger.info(f"[DEBUG] 매장 정보 조회 시작: store_id={store_id}")
        
        # Supabase에서 매장 정보 조회
        supabase = get_supabase_client()
        result = supabase.table("stores").select("*").eq("id", store_id).execute()
        
        print(f"[DEBUG] Supabase 조회 결과: found={len(result.data) if result.data else 0} rows", flush=True)
        logger.info(f"[DEBUG] Supabase 조회 결과: found={len(result.data) if result.data else 0} rows")
        if result.data:
            print(f"[DEBUG] 매장 데이터: {result.data[0]}", flush=True)
            logger.info(f"[DEBUG] 매장 데이터: {result.data[0]}")
        else:
            print(f"[DEBUG] Supabase에서 해당 store_id를 찾을 수 없음", flush=True)
            logger.info(f"[DEBUG] Supabase에서 해당 store_id를 찾을 수 없음")
        
        if not result.data:
            print(f"[DEBUG] 매장을 찾을 수 없음: store_id={store_id}", flush=True)
            logger.error(f"[DEBUG] 매장을 찾을 수 없음: store_id={store_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다"
            )
        
        store = result.data[0]
        place_id = store.get("place_id")
        store_name = store.get("store_name", "") or store.get("name", "")  # store_name 또는 name 컬럼
        business_type = store.get("business_type", "restaurant")  # 기본값은 restaurant
        
        print(f"[DEBUG] place_id={place_id}, store_name='{store_name}', business_type='{business_type}'", flush=True)
        logger.info(f"📋 매장 정보: id={store_id}, name='{store_name}', place_id={place_id}, business_type='{business_type}'")
        
        if not place_id:
            print(f"[DEBUG] place_id가 없어서 400 에러", flush=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="네이버 플레이스 ID가 등록되지 않은 매장입니다"
            )
        
        # 네이버 API에서 매장 정보 조회 (매장명, 좌표 전달)
        review_service = NaverReviewService()
        
        # 매장명이 없으면 리뷰에서 가져오기 시도
        if not store_name:
            print(f"[DEBUG] 매장명 없음. 리뷰에서 추출 시도", flush=True)
            logger.warning(f"⚠️ 매장명 없음. 리뷰에서 매장명 추출 시도: place_id={place_id}")
            try:
                visitor_result = await review_service.get_visitor_reviews(place_id, size=1, business_type=business_type)
                if visitor_result and visitor_result.get("items"):
                    store_name = visitor_result["items"][0].get("businessName", "")
                    print(f"[DEBUG] 리뷰에서 매장명 추출: '{store_name}'", flush=True)
                    logger.info(f"✅ 리뷰에서 매장명 추출: '{store_name}'")
            except Exception as e:
                print(f"[DEBUG] 리뷰에서 매장명 추출 실패: {e}", flush=True)
                logger.error(f"리뷰에서 매장명 추출 실패: {str(e)}")
        
        x = store.get("x")
        y = store.get("y")
        print(f"[DEBUG] get_place_info 호출 전: place_id={place_id}, store_name='{store_name}', x={x}, y={y}", flush=True)
        place_info = await review_service.get_place_info(place_id, store_name, x, y)
        print(f"[DEBUG] get_place_info 호출 후: place_info={place_info}", flush=True)
        
        if not place_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="네이버 플레이스 정보를 찾을 수 없습니다"
            )
        
        # 매장명이 없으면 stores 테이블의 name 사용
        if not place_info.get("name"):
            place_info["name"] = store.get("name", "")
        
        logger.info(f"매장 정보 조회 완료: {place_info}")
        return {
            "status": "success",
            "store_id": store_id,
            "place_info": place_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"매장 정보 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="매장 정보 조회 중 오류가 발생했습니다"
        )
