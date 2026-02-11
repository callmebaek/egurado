"""
서버 사이드 레이트 리밋 시스템

1단계: 유저당 동시 수집 요청 제한 (필수)
2단계: 글로벌 네이버 API 동시 호출 제한

설계 원칙:
- 프론트엔드 큐 시스템(매장 2 + 키워드 6 = 최대 8)과 연계
- 서버 제한은 프론트엔드보다 넉넉하게 설정 (정상 사용자는 절대 차단 안됨)
- 어뷰징/봇만 차단, 글로벌 네이버 API는 orderly 처리로 안정성 확보
"""
import asyncio
import logging
import time
from typing import Dict
from collections import defaultdict

logger = logging.getLogger(__name__)


# ============================================
# 1단계: 유저당 동시 수집 요청 제한
# ============================================

# 유저당 최대 동시 수집 요청 수
# 프론트엔드 큐: 매장 전체수집 2 + 키워드 개별수집 6 = 최대 8
# 서버 제한: 10 (여유분 포함) → 정상 사용자는 절대 차단 안됨
MAX_CONCURRENT_COLLECT_PER_USER = 10


class UserConcurrencyLimiter:
    """
    유저별 동시 요청 수 제한
    
    - 유저당 최대 동시 수집 요청 수를 제한
    - 초과 시 HTTP 429 반환 (프론트엔드에서 재시도)
    - 정상 사용 시 절대 제한에 걸리지 않음 (프론트 큐 < 서버 제한)
    """
    
    def __init__(self, max_concurrent: int = MAX_CONCURRENT_COLLECT_PER_USER):
        self.max_concurrent = max_concurrent
        self._user_counts: Dict[str, int] = defaultdict(int)
        self._lock = asyncio.Lock()
        self._total_rejected = 0
    
    async def try_acquire(self, user_id: str) -> bool:
        """
        유저의 슬롯 획득 시도 (Non-blocking)
        
        Args:
            user_id: 유저 ID
            
        Returns:
            True: 슬롯 획득 성공 → 요청 처리 진행
            False: 슬롯 부족 → HTTP 429 반환해야 함
        """
        async with self._lock:
            current = self._user_counts[user_id]
            if current >= self.max_concurrent:
                self._total_rejected += 1
                logger.warning(
                    f"[RateLimit] User {user_id[:8]}... 차단: "
                    f"{current}/{self.max_concurrent} (총 차단: {self._total_rejected})"
                )
                return False
            
            self._user_counts[user_id] += 1
            logger.debug(
                f"[RateLimit] User {user_id[:8]}... 슬롯 획득: "
                f"{self._user_counts[user_id]}/{self.max_concurrent}"
            )
            return True
    
    async def release(self, user_id: str):
        """유저의 슬롯 해제"""
        async with self._lock:
            if user_id in self._user_counts:
                self._user_counts[user_id] = max(0, self._user_counts[user_id] - 1)
                # 0이 되면 메모리 정리
                if self._user_counts[user_id] == 0:
                    del self._user_counts[user_id]
                logger.debug(
                    f"[RateLimit] User {user_id[:8]}... 슬롯 해제: "
                    f"{self._user_counts.get(user_id, 0)}/{self.max_concurrent}"
                )
    
    def get_user_active_count(self, user_id: str) -> int:
        """유저의 현재 활성 요청 수"""
        return self._user_counts.get(user_id, 0)
    
    def get_status(self) -> dict:
        """전체 상태 조회 (모니터링용)"""
        return {
            "max_per_user": self.max_concurrent,
            "active_users": len(self._user_counts),
            "total_active_requests": sum(self._user_counts.values()),
            "total_rejected": self._total_rejected,
            "per_user": {
                uid[:8] + "...": count 
                for uid, count in self._user_counts.items()
            }
        }


# ============================================
# 2단계: 글로벌 네이버 API 동시 호출 제한
# ============================================

# 전체 서버에서 동시에 수행할 수 있는 네이버 API 호출 수
# 20개 = 동시에 20개의 순위 조회 진행 가능
# 각 조회는 1~3페이지 × 1~5초 → 충분한 처리량
MAX_CONCURRENT_NAVER_API_CALLS = 20


class NaverAPIRateLimiter:
    """
    글로벌 네이버 API 동시 호출 제한 (세마포어 기반)
    
    - asyncio.Semaphore 사용 → 초과 시 자동 대기 (429 아님!)
    - 대기 중인 요청은 슬롯이 빌 때 자동으로 실행
    - Naver API/프록시 과부하 방지
    """
    
    def __init__(self, max_concurrent: int = MAX_CONCURRENT_NAVER_API_CALLS):
        self.max_concurrent = max_concurrent
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._active_count = 0
        self._total_requests = 0
        self._total_queued = 0
        self._lock = asyncio.Lock()
    
    @property
    def active_count(self) -> int:
        return self._active_count
    
    @property
    def available_slots(self) -> int:
        return self._semaphore._value
    
    async def acquire(self):
        """
        슬롯 획득 (대기 가능 - blocking)
        
        - 슬롯 여유 있으면 즉시 통과
        - 슬롯 부족하면 대기 (FIFO 순서로 자동 실행)
        """
        # 대기열 진입 여부 확인
        if self._semaphore._value == 0:
            async with self._lock:
                self._total_queued += 1
            logger.info(
                f"[NaverRL] ⏳ 대기열 진입: "
                f"active={self._active_count}/{self.max_concurrent}, "
                f"총 대기 누적={self._total_queued}"
            )
        
        await self._semaphore.acquire()
        
        async with self._lock:
            self._active_count += 1
            self._total_requests += 1
        
        logger.debug(
            f"[NaverRL] 슬롯 획득: {self._active_count}/{self.max_concurrent}"
        )
    
    async def release(self):
        """슬롯 해제 → 대기 중인 다음 요청이 자동 실행됨"""
        async with self._lock:
            self._active_count = max(0, self._active_count - 1)
        
        self._semaphore.release()
        
        logger.debug(
            f"[NaverRL] 슬롯 해제: {self._active_count}/{self.max_concurrent}"
        )
    
    def get_status(self) -> dict:
        """현재 상태 조회 (모니터링용)"""
        return {
            "max_concurrent": self.max_concurrent,
            "active": self._active_count,
            "available": self.available_slots,
            "total_requests_processed": self._total_requests,
            "total_queued_count": self._total_queued,
        }


# ============================================
# 싱글톤 인스턴스
# ============================================

# 유저당 동시 수집 요청 제한 (최대 10개)
user_collect_limiter = UserConcurrencyLimiter(MAX_CONCURRENT_COLLECT_PER_USER)

# 글로벌 네이버 API 동시 호출 제한 (최대 20개)
naver_api_limiter = NaverAPIRateLimiter(MAX_CONCURRENT_NAVER_API_CALLS)
