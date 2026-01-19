"""
답글 게시 큐 관리 서비스
- 여러 답글 게시 요청을 순차적으로 처리
- 각 작업의 상태를 추적하고 프론트엔드에 제공
"""
import asyncio
import uuid
import time
from typing import Dict, Optional, List
from datetime import datetime, timezone
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    """작업 상태"""
    QUEUED = "queued"  # 대기 중
    PROCESSING = "processing"  # 처리 중
    COMPLETED = "completed"  # 완료
    FAILED = "failed"  # 실패


class ReplyJob:
    """답글 게시 작업"""
    def __init__(
        self,
        job_id: str,
        store_id: str,
        place_id: str,
        naver_review_id: str,
        author: str,
        date: str,
        content: str,
        reply_text: str,
        user_id: str
    ):
        self.job_id = job_id
        self.store_id = store_id
        self.place_id = place_id
        self.naver_review_id = naver_review_id
        self.author = author
        self.date = date
        self.content = content
        self.reply_text = reply_text
        self.user_id = user_id
        self.status = JobStatus.QUEUED
        self.created_at = datetime.now(timezone.utc)
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.error_message: Optional[str] = None
        self.estimated_time: int = 15  # 기본 예상 시간 (초)
        self.position_in_queue: int = 0
        self.last_poll_time: datetime = datetime.now(timezone.utc)  # 마지막 폴링 시간
        self.is_cancelled: bool = False  # 취소 플래그

    def to_dict(self) -> dict:
        """딕셔너리로 변환"""
        return {
            "job_id": self.job_id,
            "store_id": self.store_id,
            "naver_review_id": self.naver_review_id,
            "author": self.author,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error_message": self.error_message,
            "estimated_time": self.estimated_time,
            "position_in_queue": self.position_in_queue
        }


class ReplyQueueService:
    """답글 게시 큐 관리 서비스 (싱글톤)"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self.jobs: Dict[str, ReplyJob] = {}  # job_id -> ReplyJob
        self.queue: List[str] = []  # job_id 리스트 (FIFO)
        self.current_job_id: Optional[str] = None
        self.is_processing = False
        self._worker_task: Optional[asyncio.Task] = None
        logger.info("[QUEUE] ReplyQueueService initialized")
    
    def calculate_estimated_time(self, date_string: str) -> int:
        """리뷰 날짜 기반 예상 처리 시간 계산"""
        from datetime import datetime
        import re
        
        today = datetime.now(timezone.utc)
        
        # "25.12.4.목" 또는 "1.10.금" 또는 "2025. 12. 21(토)" 형식 파싱
        date_parts = re.findall(r'\d+', date_string)
        if not date_parts or len(date_parts) < 2:
            return 15  # 기본값: 15초
        
        try:
            if len(date_parts) >= 3:
                # 연도 포함: "25.12.28.목" 또는 "2025. 12. 28(목)"
                year_part = date_parts[0]
                year = int(f"20{year_part}") if len(year_part) == 2 else int(year_part)
                month = int(date_parts[1])
                day = int(date_parts[2])
            else:
                # 연도 없음 - 현재 연도 가정: "1.9.금"
                year = today.year
                month = int(date_parts[0])
                day = int(date_parts[1])
            
            review_date = datetime(year, month, day)
            days_diff = (today - review_date).days
            
            # 날짜 차이에 따른 예상 처리 시간 (초)
            # 최근 리뷰일수록 빠르게 찾을 수 있음
            if days_diff <= 3:
                return 8
            if days_diff <= 14:
                return 12
            if days_diff <= 60:
                return 18
            return 25
        except Exception as e:
            logger.warning(f"[QUEUE] Failed to calculate estimated time: {e}")
            return 15
    
    def add_job(
        self,
        store_id: str,
        place_id: str,
        naver_review_id: str,
        author: str,
        date: str,
        content: str,
        reply_text: str,
        user_id: str
    ) -> str:
        """작업을 큐에 추가"""
        job_id = str(uuid.uuid4())
        
        job = ReplyJob(
            job_id=job_id,
            store_id=store_id,
            place_id=place_id,
            naver_review_id=naver_review_id,
            author=author,
            date=date,
            content=content,
            reply_text=reply_text,
            user_id=user_id
        )
        
        # 예상 시간 계산
        job.estimated_time = self.calculate_estimated_time(date)
        
        self.jobs[job_id] = job
        self.queue.append(job_id)
        
        # 큐 위치 업데이트
        self._update_queue_positions()
        
        logger.info(f"[QUEUE] Job added: {job_id} (author: {author}, queue position: {job.position_in_queue})")
        
        # 워커가 실행 중이 아니면 시작
        if not self.is_processing:
            asyncio.create_task(self._process_queue())
        
        return job_id
    
    def get_job_status(self, job_id: str) -> Optional[dict]:
        """작업 상태 조회 (폴링 시간 업데이트)"""
        job = self.jobs.get(job_id)
        if not job:
            return None
        
        # 폴링 시간 업데이트 (프론트엔드가 아직 연결되어 있음을 확인)
        job.last_poll_time = datetime.now(timezone.utc)
        
        return job.to_dict()
    
    def get_all_jobs(self, user_id: Optional[str] = None) -> List[dict]:
        """모든 작업 조회 (선택적으로 user_id 필터링)"""
        jobs = [job for job in self.jobs.values() if not user_id or job.user_id == user_id]
        return [job.to_dict() for job in jobs]
    
    def _update_queue_positions(self):
        """큐 내 모든 작업의 위치 업데이트"""
        # position_in_queue = 앞에 있는 작업 수 (processing 포함)
        for idx, job_id in enumerate(self.queue):
            job = self.jobs.get(job_id)
            if job:
                # idx=0: position=0 (처리 중), idx=1: position=1 (앞에 1개), idx=2: position=2 (앞에 2개)
                job.position_in_queue = idx
    
    async def _process_queue(self):
        """큐를 순차적으로 처리하는 워커"""
        if self.is_processing:
            logger.info("[QUEUE] Worker already running")
            return
        
        self.is_processing = True
        logger.info("[QUEUE] Worker started")
        
        try:
            while self.queue:
                # 오래된 작업 정리 (대기 중인 작업 중 폴링이 60초 이상 없는 것)
                now = datetime.now(timezone.utc)
                to_remove = []
                for job_id in list(self.queue):
                    job = self.jobs.get(job_id)
                    if job and job.status == JobStatus.QUEUED:
                        time_since_poll = (now - job.last_poll_time).total_seconds()
                        if time_since_poll > 60:  # 60초 동안 폴링 없음
                            logger.warning(f"[QUEUE] Removing stale job: {job_id} (author: {job.author})")
                            to_remove.append(job_id)
                
                for job_id in to_remove:
                    if job_id in self.queue:
                        self.queue.remove(job_id)
                    if job_id in self.jobs:
                        self.jobs[job_id].status = JobStatus.FAILED
                        self.jobs[job_id].error_message = "프론트엔드 연결 끊김"
                        self.jobs[job_id].is_cancelled = True
                        self.jobs[job_id].completed_at = datetime.now(timezone.utc)
                
                if not self.queue:
                    break
                
                job_id = self.queue[0]
                job = self.jobs.get(job_id)
                
                if not job:
                    logger.warning(f"[QUEUE] Job not found: {job_id}")
                    self.queue.pop(0)
                    continue
                
                # 작업 시작 전 폴링 확인 (프론트엔드가 여전히 연결되어 있는지)
                time_since_poll = (datetime.now(timezone.utc) - job.last_poll_time).total_seconds()
                if time_since_poll > 30:  # 30초 동안 폴링 없음
                    logger.warning(f"[QUEUE] Job cancelled (no polling): {job_id} (author: {job.author})")
                    job.status = JobStatus.FAILED
                    job.error_message = "프론트엔드 연결 끊김 (새로고침 또는 페이지 이동)"
                    job.is_cancelled = True
                    job.completed_at = datetime.now(timezone.utc)
                    self.queue.pop(0)
                    self.current_job_id = None
                    self._update_queue_positions()
                    continue
                
                # 작업 시작
                self.current_job_id = job_id
                job.status = JobStatus.PROCESSING
                job.started_at = datetime.now(timezone.utc)
                logger.info(f"[QUEUE] Processing job: {job_id} (author: {job.author})")
                
                # 큐 위치 업데이트
                self._update_queue_positions()
                
                try:
                    # 실제 답글 게시 작업 수행
                    from app.services.naver_selenium_service import naver_selenium_service
                    
                    result = await asyncio.to_thread(
                        naver_selenium_service.post_reply_by_composite,
                        place_id=job.place_id,  # 네이버 숫자 ID
                        author=job.author,
                        date=job.date,
                        content=job.content,
                        reply_text=job.reply_text,
                        user_id=job.user_id,
                        store_id=job.store_id  # 세션 로드를 위한 UUID
                    )
                    
                    if result.get("success"):
                        job.status = JobStatus.COMPLETED
                        logger.info(f"[QUEUE] Job completed: {job_id}")
                    else:
                        job.status = JobStatus.FAILED
                        job.error_message = result.get("message", "알 수 없는 오류")
                        logger.error(f"[QUEUE] Job failed: {job_id} - {job.error_message}")
                
                except Exception as e:
                    job.status = JobStatus.FAILED
                    job.error_message = str(e)
                    logger.error(f"[QUEUE] Job error: {job_id} - {e}", exc_info=True)
                
                finally:
                    job.completed_at = datetime.now(timezone.utc)
                    self.queue.pop(0)
                    self.current_job_id = None
                    
                    # 큐 위치 업데이트
                    self._update_queue_positions()
                    
                    # 다음 작업 전 짧은 대기
                    await asyncio.sleep(1)
        
        finally:
            self.is_processing = False
            logger.info("[QUEUE] Worker stopped")
    
    def clear_completed_jobs(self, older_than_minutes: int = 30):
        """완료된 작업 정리 (N분 이전 작업)"""
        now = datetime.now(timezone.utc)
        to_remove = []
        
        for job_id, job in self.jobs.items():
            if job.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                if job.completed_at:
                    age_minutes = (now - job.completed_at).total_seconds() / 60
                    if age_minutes > older_than_minutes:
                        to_remove.append(job_id)
        
        for job_id in to_remove:
            del self.jobs[job_id]
        
        if to_remove:
            logger.info(f"[QUEUE] Cleared {len(to_remove)} old jobs")


# 싱글톤 인스턴스
reply_queue_service = ReplyQueueService()
