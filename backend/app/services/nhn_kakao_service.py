"""
NHN Cloud KakaoTalk Bizmessage (알림톡) 서비스
- 인증코드 발송
- 키워드 순위 알림 발송
- SMS fallback 지원

⚠️ 카카오 알림톡 템플릿 변수 값은 최대 14자까지만 허용됩니다.
   모든 templateParameter 값은 14자 이내로 잘라서 전송해야 합니다.
"""
import logging
from typing import Dict, List, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# 카카오 알림톡 템플릿 변수 최대 길이
MAX_TEMPLATE_VAR_LENGTH = 14


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
    
    @staticmethod
    def _truncate(value: str, max_len: int = MAX_TEMPLATE_VAR_LENGTH) -> str:
        """
        템플릿 변수 값을 최대 길이에 맞춰 자르기
        14자 초과 시 뒤를 잘라서 '…' 추가 (총 14자)
        """
        if len(value) <= max_len:
            return value
        return value[:max_len - 1] + "…"
    
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
        store_name: str,
        rank_results: str,
        collected_at: str,
        user_name: str = "",
    ) -> dict:
        """
        키워드 순위 알림 발송
        
        ⚠️ 모든 파라미터 값은 14자 이내여야 합니다!
        
        Args:
            phone_number: 수신자 전화번호
            store_name: 매장 이름 (14자 이내)
            rank_results: 순위 결과 텍스트 (14자 이내, 키워드 1개 분량)
            collected_at: 수집 시간 (14자 이내, "MM/DD HH:MM" 형식 권장)
            user_name: 사용자 이름 (미사용, 호환성 유지)
        
        Returns:
            발송 결과 dict
        """
        if not self._is_configured():
            logger.error("[NHN Kakao] API 설정이 완료되지 않았습니다")
            return {"success": False, "message": "카카오 알림톡 설정이 완료되지 않았습니다"}
        
        recipient_no = phone_number.replace("-", "").replace(" ", "")
        
        # ⚠️ 모든 변수값을 14자 이내로 자르기
        safe_store_name = self._truncate(store_name)
        safe_rank_results = self._truncate(rank_results)
        safe_collected_at = self._truncate(collected_at)
        
        logger.info(
            f"[NHN Kakao] 순위 알림 파라미터: "
            f"storeName='{safe_store_name}'({len(safe_store_name)}자), "
            f"rankResults='{safe_rank_results}'({len(safe_rank_results)}자), "
            f"collectedAt='{safe_collected_at}'({len(safe_collected_at)}자)"
        )
        
        payload = {
            "senderKey": self.sender_key,
            "templateCode": settings.KAKAO_TEMPLATE_RANK_ALERT,
            "recipientList": [
                {
                    "recipientNo": recipient_no,
                    "templateParameter": {
                        "storeName": safe_store_name,
                        "rankResults": safe_rank_results,
                        "collectedAt": safe_collected_at,
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
                    f"status: {response.status_code}, "
                    f"response: {result}"
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
                    error_code = header.get("resultCode")
                    logger.error(
                        f"[NHN Kakao] 순위 알림 발송 실패: {error_msg} "
                        f"(code={error_code}, full_response={result})"
                    )
                    return {
                        "success": False,
                        "message": f"알림톡 발송 실패: {error_msg}",
                        "error_code": error_code,
                    }
                    
        except httpx.TimeoutException:
            logger.error("[NHN Kakao] 요청 타임아웃")
            return {"success": False, "message": "요청 시간 초과"}
        except Exception as e:
            logger.error(f"[NHN Kakao] 순위 알림 발송 오류: {str(e)}")
            return {"success": False, "message": f"발송 오류: {str(e)}"}
    
    @staticmethod
    def format_rank_result_short(keyword: str, rank: Optional[int], rank_change: Optional[int]) -> str:
        """
        단일 키워드의 순위 결과를 14자 이내로 포맷
        
        카카오 알림톡 템플릿 변수 14자 제한에 맞춤
        
        형식: "keyword N위▲M" or "keyword N위"
        예시: "서울대일식 5위▲2" (9자)
              "종로맛집 12위▼3" (9자)
              "광화문룸식당 순위밖" (10자)
        
        Args:
            keyword: 키워드
            rank: 현재 순위 (None이면 순위권 밖)
            rank_change: 순위 변동 (+: 상승, -: 하락)
        
        Returns:
            14자 이내 포맷된 텍스트
        """
        MAX_LEN = MAX_TEMPLATE_VAR_LENGTH  # 14
        
        # 순위 텍스트 구성
        if rank is None:
            rank_text = "순위밖"
        else:
            rank_text = f"{rank}위"
        
        # 변동 텍스트 (괄호 포함)
        change_text = ""
        if rank is not None and rank_change is not None and rank_change != 0:
            if rank_change > 0:
                change_text = f"(▲{rank_change})"
            else:
                change_text = f"(▼{abs(rank_change)})"
        
        # 결과 조합: "keyword rank_text(change_text)"
        if change_text:
            suffix = f" {rank_text}{change_text}"
        else:
            suffix = f" {rank_text}"
        
        # 키워드를 남은 자리에 맞게 자르기
        remaining = MAX_LEN - len(suffix)
        if remaining <= 0:
            # suffix만으로도 14자 초과 시 (극단적 케이스)
            return f"{rank_text}{change_text}"[:MAX_LEN]
        
        if len(keyword) > remaining:
            # 키워드가 길면 자르기 + (..) 표시
            keyword = keyword[:remaining - 2] + ".."
        
        result = f"{keyword}{suffix}"
        return result[:MAX_LEN]
    
    @staticmethod
    def format_collected_at_short(collected_at_str: str) -> str:
        """
        수집 시간을 14자 이내 형식으로 변환
        
        "2026-02-12 20:00" → "02/12 20:00" (11자)
        "2026-02-12 21:30" → "02/12 21:30" (11자)
        
        Args:
            collected_at_str: 원본 시간 문자열
        
        Returns:
            14자 이내 시간 문자열
        """
        try:
            # "YYYY-MM-DD HH:MM" 형식 → "MM/DD HH:MM"
            if len(collected_at_str) >= 16 and collected_at_str[4] == '-':
                month = collected_at_str[5:7]
                day = collected_at_str[8:10]
                time_part = collected_at_str[11:16]
                return f"{month}/{day} {time_part}"
            
            # 이미 14자 이내이면 그대로
            if len(collected_at_str) <= MAX_TEMPLATE_VAR_LENGTH:
                return collected_at_str
            
            # 기타: 뒤에서 자르기
            return collected_at_str[:MAX_TEMPLATE_VAR_LENGTH]
        except Exception:
            return collected_at_str[:MAX_TEMPLATE_VAR_LENGTH]
    
    @staticmethod
    def format_rank_results(metrics_list: List[dict]) -> str:
        """
        여러 키워드의 수집 결과를 하나의 텍스트로 합침
        ⚠️ 이 함수는 이메일 알림용. 카카오 알림톡에서는 사용하지 않음!
        
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
