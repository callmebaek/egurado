"""
알림 서비스 (NHN Cloud 기반)
카카오 알림톡, SMS, 이메일 알림 전송
- 자동수집 후 키워드 순위 알림

카카오 알림톡 (rank_alert_v2):
  - 매장 단위 합산 발송
  - 최대 5개 키워드 개별 순위 표시 (result1~result5)
  - 각 변수 값 최대 14자 제한
이메일: 매장 단위로 합산하여 1건 발송
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime
from zoneinfo import ZoneInfo
from collections import defaultdict

from app.core.database import get_supabase_client
from app.services.nhn_kakao_service import nhn_kakao_service, NHNKakaoService
from app.services.nhn_email_service import nhn_email_service

logger = logging.getLogger(__name__)

KST = ZoneInfo("Asia/Seoul")


class NotificationService:
    """알림 서비스 (카카오톡 알림톡 / SMS / 이메일)"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    async def send_rank_notifications_after_collection(
        self,
        collected_trackers: List[dict],
    ) -> dict:
        """
        자동수집 완료 후, 알림 설정된 tracker들에 대해 순위 알림 발송
        
        카카오 알림톡: 매장 단위 합산 발송 (1건: 상세, 2건+: 요약)
        이메일: 매장 단위로 합산하여 1건 발송
        
        Args:
            collected_trackers: 수집 완료된 tracker 목록
                각 항목: {
                    tracker_id, user_id, store_id, keyword,
                    rank, rank_change, notification_enabled,
                    notification_type, notification_phone, notification_email
                }
        
        Returns:
            dict: {sent: int, failed: int, skipped: int}
        """
        stats = {"sent": 0, "failed": 0, "skipped": 0}
        
        # 알림 설정된 tracker만 필터링
        notifiable = [t for t in collected_trackers if t.get("notification_enabled")]
        
        if not notifiable:
            logger.info("[Notification] 알림 설정된 tracker 없음")
            return stats
        
        # 알림 타입별로 분리
        kakao_trackers = [t for t in notifiable if t.get("notification_type") == "kakao"]
        email_trackers = [t for t in notifiable if t.get("notification_type") == "email"]
        sms_trackers = [t for t in notifiable if t.get("notification_type") == "sms"]
        other_trackers = [t for t in notifiable if t.get("notification_type") not in ("kakao", "email", "sms")]
        
        logger.info(
            f"[Notification] 알림 발송 대상: "
            f"총 {len(notifiable)}개 tracker "
            f"(kakao={len(kakao_trackers)}, email={len(email_trackers)}, "
            f"sms={len(sms_trackers)}, other={len(other_trackers)})"
        )
        
        # ============================================
        # 1. 카카오 알림톡 (rank_alert_v2): 매장 단위 합산, 최대 5개 키워드 상세
        # ============================================
        if kakao_trackers:
            # 매장(store_id) + 사용자(user_id) 기준으로 그룹화
            kakao_grouped = defaultdict(list)
            for t in kakao_trackers:
                key = (t["user_id"], t["store_id"])
                kakao_grouped[key].append(t)
            
            for (user_id, store_id), trackers in kakao_grouped.items():
                try:
                    first_tracker = trackers[0]
                    user_info = self._get_user_info(user_id)
                    if not user_info:
                        logger.warning(f"[Notification] 사용자 정보 없음: {user_id}")
                        stats["skipped"] += len(trackers)
                        continue
                    
                    phone = (
                        first_tracker.get("notification_phone")
                        or user_info.get("phone_number")
                    )
                    if not phone:
                        logger.warning(
                            f"[Notification] 전화번호 없음 (카카오): "
                            f"user={user_id}, store={store_id}"
                        )
                        stats["skipped"] += len(trackers)
                        continue
                    
                    # 매장 정보
                    store_info = self._get_store_info(store_id)
                    store_name = store_info.get("store_name", "매장") if store_info else "매장"
                    
                    # 키워드별 순위 정보 목록
                    metrics_list = []
                    for t in trackers:
                        metrics_list.append({
                            "keyword": t.get("keyword", ""),
                            "rank": t.get("rank"),
                            "rank_change": t.get("rank_change"),
                        })
                    
                    collected_at = datetime.now(KST).strftime("%Y-%m-%d %H:%M")
                    collected_at_short = NHNKakaoService.format_collected_at_short(collected_at)
                    
                    result = await nhn_kakao_service.send_rank_alert(
                        phone_number=phone,
                        store_name=store_name,
                        metrics_list=metrics_list,
                        collected_at=collected_at_short,
                    )
                    
                    keywords_str = ", ".join(t.get("keyword", "") for t in trackers)
                    if result["success"]:
                        stats["sent"] += 1
                        logger.info(
                            f"[Notification] 카카오 알림 v2 발송 성공: "
                            f"{store_name} ({len(trackers)}개 키워드: {keywords_str}) "
                            f"→ {phone[-4:].rjust(11, '*')}"
                        )
                    else:
                        stats["failed"] += 1
                        logger.error(
                            f"[Notification] 카카오 알림 v2 발송 실패: "
                            f"{store_name} ({len(trackers)}개 키워드) - {result.get('message')}"
                        )
                        
                except Exception as e:
                    stats["failed"] += 1
                    logger.error(
                        f"[Notification] 카카오 알림 발송 오류: "
                        f"user={user_id}, store={store_id}, error={str(e)}"
                    )
        
        # ============================================
        # 2. 이메일: 매장 단위로 합산하여 발송
        # ============================================
        if email_trackers:
            # 매장(store_id) + 사용자(user_id) 기준으로 그룹화
            email_grouped = defaultdict(list)
            for t in email_trackers:
                key = (t["user_id"], t["store_id"])
                email_grouped[key].append(t)
            
            for (user_id, store_id), trackers in email_grouped.items():
                try:
                    first_tracker = trackers[0]
                    user_info = self._get_user_info(user_id)
                    if not user_info:
                        stats["skipped"] += 1
                        continue
                    
                    email = (
                        first_tracker.get("notification_email")
                        or user_info.get("email")
                    )
                    if not email:
                        logger.warning(
                            f"[Notification] 이메일 없음: user={user_id}"
                        )
                        stats["skipped"] += 1
                        continue
                    
                    store_info = self._get_store_info(store_id)
                    store_name = store_info.get("store_name", "매장") if store_info else "매장"
                    user_name = user_info.get("display_name", "고객")
                    collected_at = datetime.now(KST).strftime("%Y-%m-%d %H:%M")
                    
                    metrics_list = []
                    for t in trackers:
                        metrics_list.append({
                            "keyword": t.get("keyword", ""),
                            "rank": t.get("rank"),
                            "rank_change": t.get("rank_change"),
                        })
                    
                    result = await nhn_email_service.send_rank_alert_email(
                        to_email=email,
                        user_name=user_name,
                        store_name=store_name,
                        rank_results=metrics_list,
                        collected_at=collected_at,
                    )
                    
                    if result["success"]:
                        stats["sent"] += 1
                        logger.info(
                            f"[Notification] 이메일 알림 발송 성공: "
                            f"{store_name} ({len(trackers)}개 키워드) → {email}"
                        )
                    else:
                        stats["failed"] += 1
                        logger.error(
                            f"[Notification] 이메일 알림 발송 실패: "
                            f"{store_name} - {result.get('message')}"
                        )
                        
                except Exception as e:
                    stats["failed"] += 1
                    logger.error(
                        f"[Notification] 이메일 알림 발송 오류: "
                        f"user={user_id}, store={store_id}, error={str(e)}"
                    )
        
        # ============================================
        # 3. SMS: 미구현 (스킵)
        # ============================================
        for t in sms_trackers:
            logger.info(
                f"[Notification] SMS 알림 미구현 (스킵): "
                f"keyword={t.get('keyword')}"
            )
            stats["skipped"] += 1
        
        for t in other_trackers:
            stats["skipped"] += 1
        
        logger.info(
            f"[Notification] 알림 발송 완료: "
            f"성공={stats['sent']}, 실패={stats['failed']}, 건너뜀={stats['skipped']}"
        )
        return stats
    
    def _get_user_info(self, user_id: str) -> Optional[dict]:
        """사용자 정보 조회"""
        try:
            result = self.supabase.table("profiles")\
                .select("id, email, display_name, phone_number")\
                .eq("id", str(user_id))\
                .execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            logger.error(f"[Notification] 사용자 조회 오류: {e}")
            return None
    
    def _get_store_info(self, store_id: str) -> Optional[dict]:
        """매장 정보 조회"""
        try:
            result = self.supabase.table("stores")\
                .select("id, store_name, place_id")\
                .eq("id", str(store_id))\
                .execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            logger.error(f"[Notification] 매장 조회 오류: {e}")
            return None


# 싱글톤 인스턴스
notification_service = NotificationService()
