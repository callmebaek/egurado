"""프록시 관리 유틸리티 - 자동 폴백 메커니즘 포함"""
import os
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)

# 프록시 상태 추적 (모듈 레벨 싱글톤)
_proxy_state = {
    "url": None,
    "initialized": False,
    "fail_count": 0,
    "last_fail_time": 0,
    "disabled_until": 0,  # 임시 비활성화 종료 시간
}

# 프록시 실패 임계값
MAX_CONSECUTIVE_FAILS = 3  # 연속 3회 실패 시 임시 비활성화
DISABLE_DURATION_SECONDS = 300  # 5분간 프록시 비활성화 후 재시도


def _init_proxy():
    """프록시 초기화 (최초 1회)"""
    if _proxy_state["initialized"]:
        return
    
    proxy_url = os.getenv("PROXY_URL")
    _proxy_state["url"] = proxy_url
    _proxy_state["initialized"] = True
    
    if proxy_url:
        logger.info(f"[PROXY] ✅ 프록시 설정됨: {proxy_url[:60]}...")
    else:
        logger.info("[PROXY] ⚠️ 프록시 미설정 (PROXY_URL 환경변수 없음)")


def get_proxy() -> Optional[str]:
    """
    프록시 URL 가져오기 (상태 기반)
    
    - 프록시가 설정되어 있고 정상이면 프록시 URL 반환
    - 연속 실패 시 일정 시간 동안 프록시 비활성화 (직접 연결 사용)
    - 비활성화 시간이 지나면 자동으로 프록시 재활성화
    
    Returns:
        프록시 URL 문자열 또는 None
    """
    _init_proxy()
    
    if not _proxy_state["url"]:
        return None
    
    now = time.time()
    
    # 프록시가 임시 비활성화 중인지 확인
    if _proxy_state["disabled_until"] > now:
        remaining = int(_proxy_state["disabled_until"] - now)
        logger.debug(f"[PROXY] ⏸️ 프록시 임시 비활성화 중 (잔여 {remaining}초)")
        return None
    
    # 비활성화 시간이 지났으면 리셋
    if _proxy_state["disabled_until"] > 0 and _proxy_state["disabled_until"] <= now:
        logger.info("[PROXY] 🔄 프록시 재활성화 시도")
        _proxy_state["fail_count"] = 0
        _proxy_state["disabled_until"] = 0
    
    return _proxy_state["url"]


def report_proxy_success():
    """프록시 요청 성공 보고 - 실패 카운트 리셋"""
    if _proxy_state["fail_count"] > 0:
        logger.info(f"[PROXY] ✅ 프록시 복구됨 (이전 실패 {_proxy_state['fail_count']}회)")
    _proxy_state["fail_count"] = 0
    _proxy_state["disabled_until"] = 0


def report_proxy_failure(error: str = ""):
    """
    프록시 요청 실패 보고
    
    연속 MAX_CONSECUTIVE_FAILS회 실패 시 DISABLE_DURATION_SECONDS 동안 프록시 비활성화
    """
    _proxy_state["fail_count"] += 1
    _proxy_state["last_fail_time"] = time.time()
    
    logger.warning(
        f"[PROXY] ❌ 프록시 실패 ({_proxy_state['fail_count']}/{MAX_CONSECUTIVE_FAILS}): {error[:100]}"
    )
    
    if _proxy_state["fail_count"] >= MAX_CONSECUTIVE_FAILS:
        _proxy_state["disabled_until"] = time.time() + DISABLE_DURATION_SECONDS
        logger.error(
            f"[PROXY] 🚫 프록시 연속 {MAX_CONSECUTIVE_FAILS}회 실패 → "
            f"{DISABLE_DURATION_SECONDS}초간 비활성화 (직접 연결 사용)"
        )


def is_proxy_available() -> bool:
    """프록시가 현재 사용 가능한 상태인지 확인"""
    _init_proxy()
    if not _proxy_state["url"]:
        return False
    return _proxy_state["disabled_until"] <= time.time()


def get_proxy_status() -> dict:
    """현재 프록시 상태 조회 (디버깅/관리용)"""
    _init_proxy()
    now = time.time()
    return {
        "configured": bool(_proxy_state["url"]),
        "active": get_proxy() is not None,
        "fail_count": _proxy_state["fail_count"],
        "disabled_until": _proxy_state["disabled_until"],
        "disabled_remaining": max(0, int(_proxy_state["disabled_until"] - now)),
    }
