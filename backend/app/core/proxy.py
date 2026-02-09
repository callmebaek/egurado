"""프록시 관리 유틸리티 - 자동 폴백 메커니즘 + 실시간 모니터링"""
import os
import logging
import time
from typing import Optional
from collections import deque
from datetime import datetime

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

# ========== 요청 통계 및 이력 추적 ==========
_proxy_stats = {
    "proxy_requests": 0,
    "proxy_successes": 0,
    "proxy_failures": 0,
    "direct_requests": 0,
    "direct_successes": 0,
    "direct_failures": 0,
    "started_at": None,
}

# 최근 요청 이력 (최대 50개)
_recent_requests: deque = deque(maxlen=50)


def _init_proxy():
    """프록시 초기화 (최초 1회)"""
    if _proxy_state["initialized"]:
        return
    
    proxy_url = os.getenv("PROXY_URL")
    _proxy_state["url"] = proxy_url
    _proxy_state["initialized"] = True
    _proxy_stats["started_at"] = datetime.now().isoformat()
    
    if proxy_url:
        logger.info(f"[PROXY] 프록시 설정됨: {proxy_url[:60]}...")
    else:
        logger.info("[PROXY] 프록시 미설정 (PROXY_URL 환경변수 없음)")


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
        logger.debug(f"[PROXY] 프록시 임시 비활성화 중 (잔여 {remaining}초)")
        return None
    
    # 비활성화 시간이 지났으면 리셋
    if _proxy_state["disabled_until"] > 0 and _proxy_state["disabled_until"] <= now:
        logger.info("[PROXY] 프록시 재활성화 시도")
        _proxy_state["fail_count"] = 0
        _proxy_state["disabled_until"] = 0
    
    return _proxy_state["url"]


def report_proxy_success():
    """프록시 요청 성공 보고 - 실패 카운트 리셋"""
    if _proxy_state["fail_count"] > 0:
        logger.info(f"[PROXY] 프록시 복구됨 (이전 실패 {_proxy_state['fail_count']}회)")
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
        f"[PROXY] 프록시 실패 ({_proxy_state['fail_count']}/{MAX_CONSECUTIVE_FAILS}): {error[:100]}"
    )
    
    if _proxy_state["fail_count"] >= MAX_CONSECUTIVE_FAILS:
        _proxy_state["disabled_until"] = time.time() + DISABLE_DURATION_SECONDS
        logger.error(
            f"[PROXY] 프록시 연속 {MAX_CONSECUTIVE_FAILS}회 실패 -> "
            f"{DISABLE_DURATION_SECONDS}초간 비활성화 (직접 연결 사용)"
        )


def record_request(connection_type: str, success: bool, page: int = 0, error: str = ""):
    """
    개별 요청 기록 (통계 + 이력)
    
    Args:
        connection_type: "proxy" 또는 "direct"
        success: 요청 성공 여부
        page: 페이지 번호 (0이면 미지정)
        error: 실패 시 에러 메시지
    """
    now = datetime.now()
    
    if _proxy_stats["started_at"] is None:
        _proxy_stats["started_at"] = now.isoformat()
    
    # 통계 업데이트
    if connection_type == "proxy":
        _proxy_stats["proxy_requests"] += 1
        if success:
            _proxy_stats["proxy_successes"] += 1
        else:
            _proxy_stats["proxy_failures"] += 1
    else:
        _proxy_stats["direct_requests"] += 1
        if success:
            _proxy_stats["direct_successes"] += 1
        else:
            _proxy_stats["direct_failures"] += 1
    
    # 이력 저장
    _recent_requests.append({
        "time": now.strftime("%Y-%m-%d %H:%M:%S"),
        "type": connection_type,
        "success": success,
        "page": page,
        "error": error[:80] if error else ""
    })


def is_proxy_available() -> bool:
    """프록시가 현재 사용 가능한 상태인지 확인"""
    _init_proxy()
    if not _proxy_state["url"]:
        return False
    return _proxy_state["disabled_until"] <= time.time()


def get_proxy_status() -> dict:
    """
    현재 프록시 상태 + 통계 + 최근 이력 조회
    
    브라우저에서 /api/v1/system/proxy-status 로 확인 가능
    """
    _init_proxy()
    now = time.time()
    
    # 프록시 URL 마스킹 (비밀번호 숨김)
    proxy_url = _proxy_state["url"]
    masked_url = None
    if proxy_url:
        if "@" in proxy_url:
            parts = proxy_url.split("@")
            masked_url = f"***@{parts[-1]}"
        else:
            masked_url = proxy_url[:30] + "..."
    
    # 프록시 성공률 계산
    total_proxy = _proxy_stats["proxy_requests"]
    proxy_success_rate = (
        round(_proxy_stats["proxy_successes"] / total_proxy * 100, 1) 
        if total_proxy > 0 else 0
    )
    
    total_direct = _proxy_stats["direct_requests"]
    direct_success_rate = (
        round(_proxy_stats["direct_successes"] / total_direct * 100, 1) 
        if total_direct > 0 else 0
    )
    
    return {
        "proxy": {
            "configured": bool(proxy_url),
            "masked_url": masked_url,
            "active": get_proxy() is not None,
            "fail_count": _proxy_state["fail_count"],
            "max_consecutive_fails": MAX_CONSECUTIVE_FAILS,
            "disabled_remaining_sec": max(0, int(_proxy_state["disabled_until"] - now)),
        },
        "stats": {
            "started_at": _proxy_stats["started_at"],
            "proxy_requests": _proxy_stats["proxy_requests"],
            "proxy_successes": _proxy_stats["proxy_successes"],
            "proxy_failures": _proxy_stats["proxy_failures"],
            "proxy_success_rate": f"{proxy_success_rate}%",
            "direct_requests": _proxy_stats["direct_requests"],
            "direct_successes": _proxy_stats["direct_successes"],
            "direct_failures": _proxy_stats["direct_failures"],
            "direct_success_rate": f"{direct_success_rate}%",
        },
        "recent_requests": list(_recent_requests),
    }
