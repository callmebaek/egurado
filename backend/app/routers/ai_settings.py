"""
AI Settings Router - 매장별 AI 답글 생성 설정 관리
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.models.place_ai_settings import PlaceAISettings
from app.core.database import get_supabase_client
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ai-settings", tags=["ai-settings"])


class AISettingsResponse(BaseModel):
    store_id: str
    settings: PlaceAISettings


@router.get("/{store_id}", response_model=AISettingsResponse)
async def get_ai_settings(store_id: str):
    """매장의 AI 설정 조회"""
    try:
        supabase = get_supabase_client()
        
        # stores 테이블에서 ai_settings 컬럼 조회
        result = supabase.table("stores").select("ai_settings").eq("id", store_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Store not found")
        
        store_data = result.data[0]
        ai_settings_data = store_data.get("ai_settings")
        
        if ai_settings_data:
            # JSON을 PlaceAISettings로 변환
            settings = PlaceAISettings(**ai_settings_data)
        else:
            # 기본 설정 반환
            settings = PlaceAISettings()
        
        return AISettingsResponse(
            store_id=store_id,
            settings=settings
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting AI settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{store_id}", response_model=AISettingsResponse)
async def update_ai_settings(store_id: str, settings: PlaceAISettings):
    """매장의 AI 설정 업데이트"""
    try:
        supabase = get_supabase_client()
        
        # stores 테이블의 ai_settings 컬럼 업데이트
        result = supabase.table("stores").update({
            "ai_settings": settings.model_dump()
        }).eq("id", store_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Store not found")
        
        return AISettingsResponse(
            store_id=store_id,
            settings=settings
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating AI settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{store_id}")
async def delete_ai_settings(store_id: str):
    """매장의 AI 설정 삭제 (기본값으로 초기화)"""
    try:
        supabase = get_supabase_client()
        
        # ai_settings를 null로 설정
        result = supabase.table("stores").update({
            "ai_settings": None
        }).eq("id", store_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Store not found")
        
        return {"message": "AI settings deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting AI settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))
