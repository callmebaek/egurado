"""프록시 관리 유틸리티"""
import os
import random
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)

def get_proxy_config() -> Optional[Dict[str, str]]:
    """
    프록시 설정 가져오기
    
    Returns:
        프록시 딕셔너리 또는 None (프록시 미사용)
    """
    proxy_url = os.getenv("PROXY_URL")
    
    if not proxy_url:
        logger.info("[PROXY] PROXY_URL 환경변수가 설정되지 않음")
        return None
    
    logger.info(f"[PROXY] 프록시 사용: {proxy_url[:50]}...")
    
    # httpx 프록시 형식 (all:// 스키마 사용)
    return {
        "all://": proxy_url
    }

def get_rotating_proxy() -> Optional[Dict[str, str]]:
    """
    랜덤 프록시 선택 (여러 프록시 사용 시)
    
    Returns:
        랜덤 프록시 딕셔너리
    """
    # 여러 프록시 URL이 있는 경우
    proxy_urls = os.getenv("PROXY_URLS", "").split(",")
    proxy_urls = [p.strip() for p in proxy_urls if p.strip()]
    
    if not proxy_urls:
        # 단일 프록시 사용
        return get_proxy_config()
    
    proxy_url = random.choice(proxy_urls)
    logger.info(f"[PROXY] 랜덤 프록시 선택: {proxy_url[:50]}...")
    
    return {
        "all://": proxy_url
    }
