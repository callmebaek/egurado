"""
문의하기 (Contact Us) API 라우터
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime

from app.core.database import get_supabase_client
from app.routers.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


class AttachmentInfo(BaseModel):
    """첨부파일 정보"""
    name: str
    url: str
    size: int
    type: str


class ContactMessageRequest(BaseModel):
    """문의하기 요청"""
    message: str
    attachments: List[AttachmentInfo] = []


class ContactMessageResponse(BaseModel):
    """문의하기 응답"""
    status: str
    message_id: str
    message: str


@router.post("/submit", response_model=ContactMessageResponse)
async def submit_contact_message(
    request: ContactMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    사용자 문의사항 제출
    
    Args:
        request: 문의 내용 및 첨부파일
        current_user: 현재 로그인한 사용자
        
    Returns:
        문의사항 저장 결과
    """
    try:
        user_id = current_user["id"]
        user_email = current_user.get("email", "")
        
        # 사용자 이름 가져오기
        supabase = get_supabase_client()
        profile_result = supabase.table("profiles")\
            .select("name")\
            .eq("id", user_id)\
            .single()\
            .execute()
        
        user_name = profile_result.data.get("name", "Unknown") if profile_result.data else "Unknown"
        
        logger.info(f"[문의하기] User {user_id} ({user_name}) 문의 제출 시작")
        
        # 첨부파일 정보를 JSONB 형태로 변환
        attachments_json = [att.dict() for att in request.attachments]
        
        # DB에 저장
        result = supabase.table("contact_messages").insert({
            "user_id": user_id,
            "user_email": user_email,
            "user_name": user_name,
            "message": request.message,
            "attachments": attachments_json,
            "status": "new"
        }).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="문의사항 저장 실패")
        
        message_id = result.data[0]["id"]
        logger.info(f"[문의하기] 문의 저장 완료: {message_id}")
        
        # TODO: Discord/Slack 웹훅 전송 (선택사항)
        # await send_discord_notification(user_name, request.message, message_id)
        
        return ContactMessageResponse(
            status="success",
            message_id=message_id,
            message="문의사항이 성공적으로 전달되었습니다."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[문의하기] 제출 실패: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"문의사항 제출 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/my-messages")
async def get_my_messages(
    current_user: dict = Depends(get_current_user)
):
    """
    내 문의사항 목록 조회
    
    Args:
        current_user: 현재 로그인한 사용자
        
    Returns:
        문의사항 목록
    """
    try:
        user_id = current_user["id"]
        
        supabase = get_supabase_client()
        result = supabase.table("contact_messages")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
        
        return {
            "status": "success",
            "messages": result.data if result.data else []
        }
        
    except Exception as e:
        logger.error(f"[문의하기] 목록 조회 실패: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"문의사항 조회 중 오류가 발생했습니다: {str(e)}"
        )


# Discord 웹훅 전송 함수 (선택사항)
async def send_discord_notification(user_name: str, message: str, message_id: str):
    """
    Discord로 새 문의사항 알림 전송
    
    환경변수에 DISCORD_WEBHOOK_URL이 설정되어 있으면 알림 전송
    """
    import os
    import httpx
    
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
    if not webhook_url:
        return
    
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                webhook_url,
                json={
                    "content": f"🔔 **새 문의사항**\n\n**보낸 사람:** {user_name}\n**내용:** {message[:200]}{'...' if len(message) > 200 else ''}\n**ID:** `{message_id}`"
                }
            )
        logger.info(f"[문의하기] Discord 알림 전송 완료: {message_id}")
    except Exception as e:
        logger.warning(f"[문의하기] Discord 알림 전송 실패: {e}")
