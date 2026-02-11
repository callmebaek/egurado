"""
NHN Cloud KakaoTalk Bizmessage (알림톡) 서비스
- 인증코드 발송
- 키워드 순위 알림 발송
- SMS fallback 지원
"""
import logging
from typing import Dict, List, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class NHNKakaoService:
    """NHN Cloud 카카오 알림톡 서비스"""
    
    def __init__(self):
        self.base_url = settings.NHN_KAKAO_URL
        self.appkey = settings.NHN_KAKAO_APPKEY
        self.secret_key = settings.NHN_KAKAO_SECRET_KEY
        self.sender_key = settings.NHN_KAKAO_SENDER_KEY
    
    def _get_headers(self) -> dict:
        """API 요청 헤더 생성"""
        return {
            "Content-Type": "application/json;charset=UTF-8",
            "X-Secret-Key": self.secret_key,
        }
    
    def _get_send_url(self) -> str:
        """알림톡 발송 API URL"""
        return f"{self.base_url}/alimtalk/v2.3/appkeys/{self.appkey}/messages"
    
    def _is_configured(self) -> bool:
        """NHN Cloud 카카오 설정이 완료되었는지 확인"""
        return bool(self.appkey and self.secret_key and self.sender_key)
    
    async def send_auth_code(self, phone_number: str, code: str) -> dict:
        """
        인증코드 알림톡 발송
        
        Args:
            phone_number: 수신자 전화번호 (010-1234-5678 또는 01012345678)
            code: 인증코드 (6자리)
        
        Returns:
            발송 결과 dict
        """
        if not self._is_configured():
            logger.error("[NHN Kakao] API 설정이 완료되지 않았습니다")
            return {"success": False, "message": "카카오 알림톡 설정이 완료되지 않았습니다"}
        
        # 전화번호 형식 통일 (하이픈 제거)
        recipient_no = phone_number.replace("-", "").replace(" ", "")
        
        payload = {
            "senderKey": self.sender_key,
            "templateCode": settings.KAKAO_TEMPLATE_AUTH_CODE,
            "recipientList": [
                {
                    "recipientNo": recipient_no,
                    "templateParameter": {
                        "code": code,
                    },
                }
            ],
            # SMS fallback: 카카오톡 미수신 시 SMS로 발송
            "resendParameter": {
                "isResend": True if settings.NHN_SMS_APPKEY else False,
                "resendType": "SMS",
                "resendContent": f"[Whiplace] 인증코드: {code} (3분간 유효)",
                "resendSendNo": settings.NHN_SMS_SENDER_NUMBER or "",
            },
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self._get_send_url(),
                    headers=self._get_headers(),
                    json=payload,
                )
                
                result = response.json()
                
                logger.info(
                    f"[NHN Kakao] 인증코드 발송 - "
                    f"수신자: {recipient_no[-4:].rjust(len(recipient_no), '*')}, "
                    f"status: {response.status_code}, "
                    f"result: {result.get('header', {}).get('resultCode')}"
                )
                
                # NHN Cloud 응답 처리
                header = result.get("header", {})
                if header.get("isSuccessful"):
                    return {
                        "success": True,
                        "message": "인증코드가 발송되었습니다",
                        "request_id": result.get("message", {}).get("requestId"),
                    }
                else:
                    error_msg = header.get("resultMessage", "알 수 없는 오류")
                    logger.error(f"[NHN Kakao] 발송 실패: {error_msg}")
                    return {
                        "success": False,
                        "message": f"알림톡 발송 실패: {error_msg}",
                        "error_code": header.get("resultCode"),
                    }
                    
        except httpx.TimeoutException:
            logger.error("[NHN Kakao] 요청 타임아웃")
            return {"success": False, "message": "요청 시간 초과"}
        except Exception as e:
            logger.error(f"[NHN Kakao] 인증코드 발송 오류: {str(e)}")
            return {"success": False, "message": f"발송 오류: {str(e)}"}
    
    async def send_rank_alert(
        self,
        phone_number: str,
        user_name: str,
        store_name: str,
        rank_results: str,
        collected_at: str,
    ) -> dict:
        """
        키워드 순위 알림 발송
        
        Args:
            phone_number: 수신자 전화번호
            user_name: 사용자 이름
            store_name: 매장 이름
            rank_results: 순위 결과 텍스트 (여러 키워드 합산)
            collected_at: 수집 시간
        
        Returns:
            발송 결과 dict
        """
        if not self._is_configured():
            logger.error("[NHN Kakao] API 설정이 완료되지 않았습니다")
            return {"success": False, "message": "카카오 알림톡 설정이 완료되지 않았습니다"}
        
        recipient_no = phone_number.replace("-", "").replace(" ", "")
        
        payload = {
            "senderKey": self.sender_key,
            "templateCode": settings.KAKAO_TEMPLATE_RANK_ALERT,
            "recipientList": [
                {
                    "recipientNo": recipient_no,
                    "templateParameter": {
                        "userName": user_name,
                        "storeName": store_name,
                        "rankResults": rank_results,
                        "collectedAt": collected_at,
                    },
                }
            ],
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self._get_send_url(),
                    headers=self._get_headers(),
                    json=payload,
                )
                
                result = response.json()
                
                logger.info(
                    f"[NHN Kakao] 순위 알림 발송 - "
                    f"매장: {store_name}, "
                    f"수신자: {recipient_no[-4:].rjust(len(recipient_no), '*')}, "
                    f"status: {response.status_code}"
                )
                
                header = result.get("header", {})
                if header.get("isSuccessful"):
                    return {
                        "success": True,
                        "message": "순위 알림이 발송되었습니다",
                        "request_id": result.get("message", {}).get("requestId"),
                    }
                else:
                    error_msg = header.get("resultMessage", "알 수 없는 오류")
                    logger.error(f"[NHN Kakao] 순위 알림 발송 실패: {error_msg}")
                    return {
                        "success": False,
                        "message": f"알림톡 발송 실패: {error_msg}",
                        "error_code": header.get("resultCode"),
                    }
                    
        except httpx.TimeoutException:
            logger.error("[NHN Kakao] 요청 타임아웃")
            return {"success": False, "message": "요청 시간 초과"}
        except Exception as e:
            logger.error(f"[NHN Kakao] 순위 알림 발송 오류: {str(e)}")
            return {"success": False, "message": f"발송 오류: {str(e)}"}
    
    @staticmethod
    def format_rank_results(metrics_list: List[dict]) -> str:
        """
        여러 키워드의 수집 결과를 하나의 텍스트로 합침
        
        Args:
            metrics_list: [{keyword, rank, rank_change}, ...]
        
        Returns:
            포맷된 텍스트 (예: ▶ 맛집 추천: 3위 (▲2))
        """
        lines = []
        for m in metrics_list:
            keyword = m.get("keyword", "")
            rank = m.get("rank")
            rank_change = m.get("rank_change")
            
            if rank is None:
                rank_text = "순위권 밖"
            else:
                rank_text = f"{rank}위"
            
            if rank_change is not None and rank_change != 0:
                if rank_change > 0:
                    change_text = f" (▲{rank_change})"
                else:
                    change_text = f" (▼{abs(rank_change)})"
            else:
                change_text = " (-)"
            
            lines.append(f"▶ {keyword}: {rank_text}{change_text}")
        
        return "\n".join(lines)


# 싱글톤 인스턴스
nhn_kakao_service = NHNKakaoService()
