"""
프록시 로테이션 매니저
- 여러 프록시 IP를 관리하고 순환 사용
- 실패한 프록시 자동 제거
- Rate Limiting 회피
"""

import random
import time
from typing import List, Optional, Dict
from dataclasses import dataclass
from datetime import datetime, timedelta
import httpx
import asyncio
from loguru import logger


@dataclass
class ProxyInfo:
    """프록시 정보"""
    url: str
    success_count: int = 0
    fail_count: int = 0
    last_used: Optional[datetime] = None
    last_success: Optional[datetime] = None
    is_active: bool = True
    avg_response_time: float = 0.0


class ProxyRotationManager:
    """프록시 로테이션 관리자"""
    
    def __init__(
        self,
        proxy_list: List[str],
        max_failures: int = 5,
        cooldown_seconds: int = 60,
        test_on_init: bool = True
    ):
        """
        Args:
            proxy_list: 프록시 URL 리스트
            max_failures: 최대 실패 횟수 (초과 시 비활성화)
            cooldown_seconds: 프록시 재사용 대기 시간
            test_on_init: 초기화 시 프록시 테스트 여부
        """
        self.proxies: Dict[str, ProxyInfo] = {
            url: ProxyInfo(url=url) 
            for url in proxy_list
        }
        self.max_failures = max_failures
        self.cooldown_seconds = cooldown_seconds
        self._lock = asyncio.Lock()
        
        if test_on_init and proxy_list:
            logger.info(f"프록시 {len(proxy_list)}개 테스트 시작...")
            asyncio.run(self.test_all_proxies())
    
    async def test_all_proxies(self) -> None:
        """모든 프록시를 테스트"""
        tasks = [
            self.test_proxy(proxy_info)
            for proxy_info in self.proxies.values()
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        active_count = sum(1 for p in self.proxies.values() if p.is_active)
        logger.info(f"프록시 테스트 완료: {active_count}/{len(self.proxies)}개 사용 가능")
    
    async def test_proxy(self, proxy_info: ProxyInfo) -> bool:
        """개별 프록시 테스트"""
        test_url = "https://httpbin.org/ip"
        
        try:
            start_time = time.time()
            async with httpx.AsyncClient(proxies=proxy_info.url, timeout=10.0) as client:
                response = await client.get(test_url)
                response.raise_for_status()
            
            response_time = time.time() - start_time
            proxy_info.avg_response_time = response_time
            proxy_info.is_active = True
            proxy_info.last_success = datetime.now()
            
            logger.success(f"✓ {proxy_info.url} - {response_time:.2f}s")
            return True
            
        except Exception as e:
            proxy_info.is_active = False
            logger.error(f"✗ {proxy_info.url} - {str(e)}")
            return False
    
    async def get_proxy(self) -> Optional[str]:
        """
        사용 가능한 프록시 반환 (로테이션)
        
        전략:
        1. 활성화된 프록시만 선택
        2. Cooldown 시간이 지난 프록시 우선
        3. 성공률이 높은 프록시 우선
        4. 랜덤 선택으로 부하 분산
        """
        async with self._lock:
            # 활성화된 프록시 필터링
            active_proxies = [
                p for p in self.proxies.values()
                if p.is_active and p.fail_count < self.max_failures
            ]
            
            if not active_proxies:
                logger.warning("사용 가능한 프록시가 없습니다!")
                return None
            
            # Cooldown 체크
            now = datetime.now()
            available_proxies = [
                p for p in active_proxies
                if p.last_used is None or 
                   (now - p.last_used).total_seconds() >= self.cooldown_seconds
            ]
            
            # Cooldown 중인 프록시만 있으면 강제로 사용
            if not available_proxies:
                available_proxies = active_proxies
            
            # 성공률 기반 가중치 부여
            proxies_with_weights = []
            for proxy in available_proxies:
                # 성공률 계산
                total = proxy.success_count + proxy.fail_count
                success_rate = proxy.success_count / total if total > 0 else 0.5
                
                # 가중치 = 성공률 + 최근 성공 보너스
                weight = success_rate
                if proxy.last_success and (now - proxy.last_success).total_seconds() < 300:
                    weight += 0.2  # 최근 5분 내 성공 시 보너스
                
                proxies_with_weights.append((proxy, max(weight, 0.1)))
            
            # 가중치 기반 랜덤 선택
            total_weight = sum(w for _, w in proxies_with_weights)
            rand = random.uniform(0, total_weight)
            
            cumulative = 0
            for proxy, weight in proxies_with_weights:
                cumulative += weight
                if rand <= cumulative:
                    proxy.last_used = now
                    logger.debug(f"프록시 선택: {proxy.url}")
                    return proxy.url
            
            # Fallback: 첫 번째 프록시 반환
            proxy = available_proxies[0]
            proxy.last_used = now
            return proxy.url
    
    async def report_success(self, proxy_url: str, response_time: float = 0.0) -> None:
        """프록시 사용 성공 보고"""
        if proxy_url in self.proxies:
            proxy = self.proxies[proxy_url]
            proxy.success_count += 1
            proxy.last_success = datetime.now()
            
            # 평균 응답 시간 업데이트 (지수 이동 평균)
            if proxy.avg_response_time == 0:
                proxy.avg_response_time = response_time
            else:
                proxy.avg_response_time = (
                    0.7 * proxy.avg_response_time + 0.3 * response_time
                )
            
            # 성공 시 실패 카운트 감소 (회복 메커니즘)
            if proxy.fail_count > 0:
                proxy.fail_count = max(0, proxy.fail_count - 1)
            
            logger.debug(
                f"프록시 성공: {proxy_url} "
                f"(성공: {proxy.success_count}, 실패: {proxy.fail_count})"
            )
    
    async def report_failure(self, proxy_url: str, error: Exception) -> None:
        """프록시 사용 실패 보고"""
        if proxy_url in self.proxies:
            proxy = self.proxies[proxy_url]
            proxy.fail_count += 1
            
            # 최대 실패 횟수 초과 시 비활성화
            if proxy.fail_count >= self.max_failures:
                proxy.is_active = False
                logger.warning(
                    f"프록시 비활성화: {proxy_url} "
                    f"(실패 {proxy.fail_count}회 초과)"
                )
            else:
                logger.debug(
                    f"프록시 실패: {proxy_url} - {str(error)} "
                    f"(실패: {proxy.fail_count}/{self.max_failures})"
                )
    
    def get_stats(self) -> Dict:
        """프록시 통계 반환"""
        total = len(self.proxies)
        active = sum(1 for p in self.proxies.values() if p.is_active)
        
        total_success = sum(p.success_count for p in self.proxies.values())
        total_fail = sum(p.fail_count for p in self.proxies.values())
        total_requests = total_success + total_fail
        
        success_rate = (
            total_success / total_requests * 100 
            if total_requests > 0 else 0
        )
        
        avg_response = sum(
            p.avg_response_time for p in self.proxies.values() if p.avg_response_time > 0
        ) / active if active > 0 else 0
        
        return {
            "total_proxies": total,
            "active_proxies": active,
            "inactive_proxies": total - active,
            "total_requests": total_requests,
            "success_count": total_success,
            "fail_count": total_fail,
            "success_rate": round(success_rate, 2),
            "avg_response_time": round(avg_response, 2),
            "proxies": [
                {
                    "url": p.url,
                    "is_active": p.is_active,
                    "success": p.success_count,
                    "fail": p.fail_count,
                    "avg_time": round(p.avg_response_time, 2)
                }
                for p in self.proxies.values()
            ]
        }


# 싱글톤 인스턴스
_proxy_manager: Optional[ProxyRotationManager] = None


def init_proxy_manager(proxy_list: List[str]) -> ProxyRotationManager:
    """프록시 매니저 초기화"""
    global _proxy_manager
    _proxy_manager = ProxyRotationManager(proxy_list)
    return _proxy_manager


def get_proxy_manager() -> ProxyRotationManager:
    """프록시 매니저 인스턴스 반환"""
    if _proxy_manager is None:
        raise RuntimeError("프록시 매니저가 초기화되지 않았습니다!")
    return _proxy_manager
