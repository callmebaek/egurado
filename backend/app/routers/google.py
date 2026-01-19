"""
구글 비즈니스 프로필 관련 API 라우터
"""
from fastapi import APIRouter, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
import httpx
import os

from app.services.google_api import GoogleBusinessAPI, sync_google_reviews
from app.core.database import get_supabase_client

router = APIRouter()


class GoogleTokenResponse(BaseModel):
    """구글 토큰 응답"""
    access_token: str
    refresh_token: str
    expires_in: int


@router.get("/oauth")
async def google_oauth_redirect(state: Optional[str] = None):
    """
    구글 OAuth 로그인 페이지로 리다이렉트
    
    Query Parameters:
        state: 사용자 식별 정보 (선택사항)
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    
    if not client_id or not redirect_uri:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth 설정이 누락되었습니다."
        )
    
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope=https://www.googleapis.com/auth/business.manage&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    
    if state:
        auth_url += f"&state={state}"
    
    return RedirectResponse(auth_url)


@router.get("/callback")
async def google_oauth_callback(code: str, state: Optional[str] = None):
    """
    OAuth 콜백 - Authorization Code를 토큰으로 교환
    
    Query Parameters:
        code: Authorization Code
        state: 사용자 식별 정보 (선택사항)
    """
    try:
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
        
        # Authorization Code를 토큰으로 교환
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=data)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="토큰 교환 실패"
                )
            
            tokens = response.json()
        
        # 프론트엔드로 리다이렉트 (토큰 전달)
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        callback_url = f"{frontend_url}/dashboard/google/oauth-success"
        
        # 토큰을 쿼리 파라미터로 전달 (프로덕션에서는 더 안전한 방법 사용 권장)
        return RedirectResponse(
            f"{callback_url}?access_token={tokens['access_token']}&"
            f"refresh_token={tokens.get('refresh_token', '')}&"
            f"state={state or ''}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth 콜백 처리 실패: {str(e)}"
        )


class GoogleConnectRequest(BaseModel):
    """구글 매장 연결 요청"""
    user_id: UUID
    store_id: UUID
    access_token: str
    refresh_token: str


@router.post("/connect")
async def connect_google_store(request: GoogleConnectRequest):
    """
    구글 비즈니스 프로필 연결 (토큰 저장)
    """
    try:
        supabase = get_supabase_client()
        
        # 매장 존재 확인
        store = supabase.table("stores").select("id, platform").eq(
            "id", str(request.store_id)
        ).eq("user_id", str(request.user_id)).single().execute()
        
        if not store.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없거나 권한이 없습니다."
            )
        
        if store.data["platform"] != "google":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="구글 비즈니스 프로필 매장이 아닙니다."
            )
        
        # 토큰 저장
        supabase.table("stores").update({
            "credentials": {
                "access_token": request.access_token,
                "refresh_token": request.refresh_token,
                "type": "google"
            },
            "status": "active"
        }).eq("id", str(request.store_id)).execute()
        
        return {
            "status": "success",
            "message": "구글 비즈니스 프로필이 성공적으로 연결되었습니다.",
            "store_id": request.store_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"연결 실패: {str(e)}"
        )


@router.post("/stores/{store_id}/sync-reviews")
async def sync_google_store_reviews(store_id: UUID):
    """
    구글 비즈니스 프로필 리뷰 동기화
    """
    try:
        supabase = get_supabase_client()
        
        # 매장 정보 조회
        store = supabase.table("stores").select("place_id, platform").eq(
            "id", str(store_id)
        ).single().execute()
        
        if not store.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다."
            )
        
        if store.data["platform"] != "google":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="구글 비즈니스 프로필 매장이 아닙니다."
            )
        
        location_id = store.data["place_id"]
        
        # 리뷰 동기화
        reviews = await sync_google_reviews(str(store_id), location_id)
        
        return {
            "status": "success",
            "message": f"{len(reviews)}개의 리뷰를 동기화했습니다.",
            "store_id": store_id,
            "review_count": len(reviews)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"리뷰 동기화 실패: {str(e)}"
        )


