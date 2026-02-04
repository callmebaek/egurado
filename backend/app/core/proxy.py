"""프록시 관리 유틸리티"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def get_proxy() -> Optional[str]:
    """
    프록시 URL 가져오기
    
    Returns:
        프록시 URL 문자열 또는 None
    """
    proxy_url = os.getenv("PROXY_URL")
    
    if proxy_url:
        logger.info(f"[PROXY] ✅ 프록시 활성화: {proxy_url[:60]}...")
        return proxy_url
    
    logger.info("[PROXY] ⚠️ 프록시 비활성화 (PROXY_URL 환경변수 없음)")
    return None
