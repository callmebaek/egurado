"""
AI 답글 생성 API (Selenium 기반)
- 기존 review-management-system의 로직 사용
- Selenium으로 리뷰 추출 및 3중 매칭 답글 포스팅
- PlaceAISettings 기반 AI 답글 생성
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.llm_reply_service import LLMReplyService
from app.services.naver_selenium_service import naver_selenium_service
from app.services.reply_queue_service import reply_queue_service
from app.core.database import get_supabase_client
from app.models.place_ai_settings import PlaceAISettings

logger = logging.getLogger(__name__)

router = APIRouter()

# ============================================
# Pydantic 모델
# ============================================

class GenerateReplyRequest(BaseModel):
    """AI 답글 생성 요청"""
    review_content: str
    rating: Optional[float] = None
    author_name: str = "고객"
    sentiment: Optional[str] = None
    store_name: str = "저희 매장"
    category: str = "일반"
    place_settings: Optional[dict] = None  # PlaceAISettings dict


class GenerateReplyResponse(BaseModel):
    """AI 답글 생성 응답"""
    reply_text: str
    success: bool
    error: Optional[str] = None


class GetReviewsForReplyRequest(BaseModel):
    """답글용 리뷰 조회 요청"""
    store_id: str
    limit: int = 50  # 50, 100, 200, 400


class ReviewForReply(BaseModel):
    """답글 작성용 리뷰 정보"""
    naver_review_id: str
    author: str  # author_name 대신 author 사용 (Selenium 결과와 일치)
    rating: Optional[float]
    content: str
    date: str  # review_date 대신 date 사용
    has_reply: bool = False
    reply_text: Optional[str] = None


class GetReviewsForReplyResponse(BaseModel):
    """답글용 리뷰 조회 응답"""
    status: str
    store_id: str
    total: int
    reviews: List[ReviewForReply]


class PostReplyRequest(BaseModel):
    """답글 게시 요청"""
    store_id: str
    naver_review_id: str
    author: str  # author_name 대신 author
    date: str  # review_date 대신 date
    content: str  # review_content 대신 content
    reply_text: str


class PostReplyResponse(BaseModel):
    """답글 게시 응답"""
    success: bool
    message: str
    job_id: Optional[str] = None  # 큐 시스템용 작업 ID


class QueueStatusResponse(BaseModel):
    """큐 상태 응답"""
    job_id: str
    status: str  # "queued", "processing", "completed", "failed"
    position_in_queue: int
    estimated_time: int
    started_at: Optional[str] = None  # 처리 시작 시간 (ISO format)
    error_message: Optional[str] = None
    naver_review_id: str
    author: str


# ============================================
# API 엔드포인트
# ============================================

@router.post("/generate", response_model=GenerateReplyResponse)
async def generate_reply(request: GenerateReplyRequest):
    """
    AI 답글 생성 (PlaceAISettings 지원)
    
    단일 리뷰에 대한 답글을 생성합니다.
    """
    try:
        llm_service = LLMReplyService()
        
        # PlaceAISettings 파싱
        place_settings_obj = None
        if request.place_settings:
            try:
                place_settings_obj = PlaceAISettings(**request.place_settings)
                logger.info(f"Using custom AI settings: friendliness={place_settings_obj.friendliness}, formality={place_settings_obj.formality}")
            except Exception as e:
                logger.warning(f"Failed to parse place_settings, using defaults: {e}")
        
        result = await llm_service.generate_reply(
            review_content=request.review_content,
            rating=request.rating,
            author_name=request.author_name,
            store_name=request.store_name,
            category=request.category,
            sentiment=request.sentiment,
            place_settings=place_settings_obj
        )
        
        return GenerateReplyResponse(**result)
        
    except Exception as e:
        logger.error(f"AI 답글 생성 실패: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI 답글 생성 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/settings/{store_id}")
async def get_store_ai_settings(store_id: str):
    """매장의 AI 설정 조회 (답글 생성 페이지용)"""
    try:
        supabase = get_supabase_client()
        
        # stores 테이블에서 ai_settings 조회
        result = supabase.table("stores").select("ai_settings").eq("id", store_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Store not found")
        
        ai_settings_data = result.data[0].get("ai_settings")
        
        if ai_settings_data:
            settings = PlaceAISettings(**ai_settings_data)
        else:
            settings = PlaceAISettings()  # 기본값
        
        return {
            "store_id": store_id,
            "settings": settings.model_dump()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting AI settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reviews", response_model=GetReviewsForReplyResponse)
async def get_reviews_for_reply(request: GetReviewsForReplyRequest):
    """
    답글 작성용 리뷰 조회 (GraphQL API 기반)
    
    네이버 GraphQL API로 리뷰와 답글을 함께 조회합니다.
    limit: 50, 100, 200, 400
    """
    try:
        from app.services.naver_review_service import naver_review_service
        
        store_id = request.store_id
        limit = request.limit
        
        logger.info(f"답글용 리뷰 조회 (GraphQL API): store_id={store_id}, limit={limit}")
        
        # 1. 매장 정보 조회
        supabase = get_supabase_client()
        store_result = supabase.table("stores").select("*").eq("id", store_id).execute()
        
        if not store_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다"
            )
        
        store = store_result.data[0]
        place_id = store.get("place_id")
        user_id = store.get("user_id")
        
        if not place_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="네이버 플레이스 ID가 등록되지 않은 매장입니다"
            )
        
        # 2. GraphQL API로 리뷰 조회 (페이지네이션)
        all_reviews = []
        cursor = None
        page_size = 20  # 네이버 API 권장 사이즈
        
        # limit 개수만큼 반복해서 가져오기
        while len(all_reviews) < limit:
            result = await naver_review_service.get_visitor_reviews(
                place_id=place_id,
                size=page_size,
                sort="recent",
                after=cursor
            )
            
            items = result.get("items", [])
            if not items:
                break
            
            all_reviews.extend(items)
            
            # 더 이상 페이지가 없으면 중단
            if not result.get("has_more"):
                break
            
            cursor = result.get("last_cursor")
            if not cursor:
                break
            
            # limit에 도달하면 중단
            if len(all_reviews) >= limit:
                all_reviews = all_reviews[:limit]
                break
        
        logger.info(f"GraphQL 리뷰 조회 완료: {len(all_reviews)}개")
        
        # 3. 리뷰 파싱 (GraphQL 결과를 API 응답 형식으로 변환)
        parsed_reviews = []
        for review in all_reviews:
            # 작성자 정보
            author = review.get("author", {})
            author_name = author.get("nickname", "익명")
            
            # 날짜: visited 필드를 그대로 사용 ("1.10.금" 형식)
            # Selenium 매칭을 위해 원본 형식 유지
            visited_str = review.get("visited", "")
            
            # 답글 정보 (엄격한 검증)
            reply_obj = review.get("reply")
            has_reply = False
            reply_text = None
            
            if reply_obj is not None and isinstance(reply_obj, dict):
                reply_body = reply_obj.get("body", "")
                if reply_body and reply_body.strip():  # 답글 내용이 실제로 있는지 확인
                    has_reply = True
                    reply_text = reply_body
            
            # 디버깅 로그 (처음 3개만)
            if len(parsed_reviews) < 3:
                logger.info(f"[DEBUG] Review {len(parsed_reviews)+1}: author={author_name}, has_reply={has_reply}, reply={reply_text[:50] if reply_text else 'None'}")
            
            parsed_reviews.append(ReviewForReply(
                naver_review_id=review.get("id", ""),
                author=author_name,
                rating=float(review.get("rating")) if review.get("rating") else None,
                content=review.get("body", ""),
                date=visited_str,  # 원본 날짜 형식 ("1.10.금")
                has_reply=has_reply,
                reply_text=reply_text
            ))
        
        return GetReviewsForReplyResponse(
            status="success",
            store_id=store_id,
            total=len(parsed_reviews),
            reviews=parsed_reviews
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"리뷰 조회 실패: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"리뷰 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/post", response_model=PostReplyResponse)
async def post_reply(request: PostReplyRequest):
    """
    답글 게시 (큐 시스템 사용)
    
    작업을 큐에 추가하고 job_id를 반환합니다.
    실제 처리는 백그라운드에서 순차적으로 진행됩니다.
    """
    try:
        store_id = request.store_id
        
        logger.info(f"답글 게시 요청: store_id={store_id}, author={request.author}")
        
        # 1. 매장 정보 조회
        supabase = get_supabase_client()
        store_result = supabase.table("stores").select("*").eq("id", store_id).execute()
        
        if not store_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다"
            )
        
        store = store_result.data[0]
        place_id = store.get("place_id")
        user_id = store.get("user_id")
        
        if not place_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="네이버 플레이스 ID가 등록되지 않은 매장입니다"
            )
        
        # 2. 큐에 작업 추가
        job_id = reply_queue_service.add_job(
            store_id=store_id,  # UUID for session loading
            place_id=place_id,  # Naver numeric ID
            naver_review_id=request.naver_review_id,
            author=request.author,
            date=request.date,
            content=request.content,
            reply_text=request.reply_text,
            user_id=user_id
        )
        
        logger.info(f"[QUEUE] 답글 게시 작업 추가: job_id={job_id}, author={request.author}")
        
        return PostReplyResponse(
            success=True,
            message="답글 게시 작업이 큐에 추가되었습니다",
            job_id=job_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"답글 게시 요청 실패: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"답글 게시 요청 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/queue-status/{job_id}", response_model=QueueStatusResponse)
async def get_queue_status(job_id: str):
    """
    답글 게시 작업 상태 조회
    
    job_id로 현재 작업의 상태, 큐 위치, 예상 시간 등을 확인합니다.
    """
    try:
        job_status = reply_queue_service.get_job_status(job_id)
        
        if not job_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="작업을 찾을 수 없습니다"
            )
        
        return QueueStatusResponse(
            job_id=job_status["job_id"],
            status=job_status["status"],
            position_in_queue=job_status["position_in_queue"],
            estimated_time=job_status["estimated_time"],
            started_at=job_status.get("started_at"),  # 처리 시작 시간 추가
            error_message=job_status.get("error_message"),
            naver_review_id=job_status["naver_review_id"],
            author=job_status["author"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"큐 상태 조회 실패: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"큐 상태 조회 중 오류가 발생했습니다: {str(e)}"
        )
