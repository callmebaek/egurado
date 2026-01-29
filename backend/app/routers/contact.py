"""
문의하기 (Contact Us) API 라우터
"""
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
import os

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


class FileUploadResponse(BaseModel):
    """파일 업로드 응답"""
    status: str
    name: str
    url: str
    size: int
    type: str


@router.post("/upload-file", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    파일 업로드 (service_role 사용)
    
    Args:
        file: 업로드할 파일
        current_user: 현재 로그인한 사용자
        
    Returns:
        업로드된 파일 정보 (URL 포함)
    """
    try:
        user_id = current_user["id"]
        
        # 파일 크기 검증 (10MB)
        max_size = 10 * 1024 * 1024
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"파일 크기는 최대 10MB까지 가능합니다. (현재: {file_size / 1024 / 1024:.1f}MB)"
            )
        
        # 파일 타입 검증
        allowed_types = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"지원하지 않는 파일 형식입니다: {file.content_type}"
            )
        
        logger.info(f"[파일 업로드] User {user_id} - {file.filename} ({file_size} bytes)")
        
        # 파일명 생성: {user_id}/{timestamp}_{filename}
        timestamp = int(datetime.now().timestamp() * 1000)
        safe_filename = file.filename.replace(' ', '_')
        file_path = f"{user_id}/{timestamp}_{safe_filename}"
        
        # Supabase Storage에 업로드 (service_role 사용)
        supabase = get_supabase_client()
        
        # 파일 내용을 다시 읽기 위해 seek
        result = supabase.storage.from_('contact-attachments').upload(
            file_path,
            file_content,
            {
                'content-type': file.content_type,
                'upsert': 'false'
            }
        )
        
        if hasattr(result, 'error') and result.error:
            raise HTTPException(
                status_code=500,
                detail=f"파일 업로드 실패: {result.error}"
            )
        
        # Public URL 생성
        public_url_data = supabase.storage.from_('contact-attachments').get_public_url(file_path)
        public_url = public_url_data
        
        logger.info(f"[파일 업로드] 성공: {file_path}")
        
        return FileUploadResponse(
            status="success",
            name=file.filename,
            url=public_url,
            size=file_size,
            type=file.content_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[파일 업로드] 실패: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"파일 업로드 중 오류가 발생했습니다: {str(e)}"
        )


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
