"""
OTP (One-Time Password) 서비스
- 인증코드 생성, 저장, 검증
- 카카오 알림톡을 통한 발송
"""
import logging
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.database import get_supabase_client
from app.core.config import settings
from app.services.nhn_kakao_service import nhn_kakao_service

logger = logging.getLogger(__name__)


class OTPService:
    """OTP 인증 서비스"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.otp_length = settings.OTP_LENGTH
        self.expire_minutes = settings.OTP_EXPIRE_MINUTES
    
    def _generate_code(self) -> str:
        """6자리 숫자 인증코드 생성"""
        return "".join(random.choices(string.digits, k=self.otp_length))
    
    def _normalize_phone(self, phone: str) -> str:
        """전화번호 정규화 (하이픈 제거, 공백 제거)"""
        return phone.replace("-", "").replace(" ", "").strip()
    
    async def send_otp(self, phone_number: str) -> dict:
        """
        OTP 인증코드 생성 및 카카오 알림톡으로 발송
        
        Args:
            phone_number: 수신자 전화번호
        
        Returns:
            dict: {success, message, ...}
        """
        try:
            normalized_phone = self._normalize_phone(phone_number)
            
            # 전화번호 유효성 검사
            if not normalized_phone.startswith("010") or len(normalized_phone) != 11:
                return {"success": False, "message": "올바른 전화번호 형식이 아닙니다 (010XXXXXXXX)"}
            
            # 연속 발송 방지: 최근 1분 내 발송 기록 확인
            one_minute_ago = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
            recent_check = self.supabase.table("phone_verifications")\
                .select("id")\
                .eq("phone_number", normalized_phone)\
                .gte("created_at", one_minute_ago)\
                .execute()
            
            if recent_check.data and len(recent_check.data) > 0:
                return {"success": False, "message": "1분 후 다시 시도해주세요"}
            
            # 인증코드 생성
            code = self._generate_code()
            expires_at = (datetime.now(timezone.utc) + timedelta(minutes=self.expire_minutes)).isoformat()
            
            # DB에 인증코드 저장
            self.supabase.table("phone_verifications").insert({
                "phone_number": normalized_phone,
                "code": code,
                "expires_at": expires_at,
                "is_verified": False,
                "attempts": 0,
            }).execute()
            
            # 카카오 알림톡으로 발송
            send_result = await nhn_kakao_service.send_auth_code(
                phone_number=normalized_phone,
                code=code,
            )
            
            if send_result["success"]:
                logger.info(f"[OTP] 인증코드 발송 성공: {normalized_phone[-4:].rjust(11, '*')}")
                return {
                    "success": True,
                    "message": "인증코드가 카카오톡으로 발송되었습니다",
                    "expires_in": self.expire_minutes * 60,  # 초 단위
                }
            else:
                logger.error(f"[OTP] 인증코드 발송 실패: {send_result.get('message')}")
                return {
                    "success": False,
                    "message": send_result.get("message", "인증코드 발송에 실패했습니다"),
                }
                
        except Exception as e:
            logger.error(f"[OTP] send_otp 오류: {str(e)}")
            return {"success": False, "message": "인증코드 발송 중 오류가 발생했습니다"}
    
    async def verify_otp(self, phone_number: str, code: str) -> dict:
        """
        OTP 인증코드 검증
        
        Args:
            phone_number: 전화번호
            code: 사용자가 입력한 인증코드
        
        Returns:
            dict: {success, message, user_id (optional), ...}
        """
        try:
            normalized_phone = self._normalize_phone(phone_number)
            now = datetime.now(timezone.utc).isoformat()
            
            # 최근 유효한 인증코드 조회 (만료되지 않은 것, 최신 순)
            result = self.supabase.table("phone_verifications")\
                .select("*")\
                .eq("phone_number", normalized_phone)\
                .eq("is_verified", False)\
                .gte("expires_at", now)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            if not result.data or len(result.data) == 0:
                return {"success": False, "message": "유효한 인증코드가 없습니다. 다시 요청해주세요."}
            
            verification = result.data[0]
            verification_id = verification["id"]
            attempts = verification.get("attempts", 0)
            
            # 시도 횟수 제한 (최대 5회)
            if attempts >= 5:
                # 인증코드 무효화
                self.supabase.table("phone_verifications")\
                    .update({"is_verified": False, "expires_at": now})\
                    .eq("id", verification_id)\
                    .execute()
                return {"success": False, "message": "인증 시도 횟수를 초과했습니다. 다시 요청해주세요."}
            
            # 시도 횟수 증가
            self.supabase.table("phone_verifications")\
                .update({"attempts": attempts + 1})\
                .eq("id", verification_id)\
                .execute()
            
            # 코드 검증
            if verification["code"] != code:
                remaining = 4 - attempts  # 남은 횟수
                return {
                    "success": False,
                    "message": f"인증코드가 일치하지 않습니다. ({remaining}회 남음)",
                }
            
            # 인증 성공 → 인증코드 사용 완료 처리
            self.supabase.table("phone_verifications")\
                .update({
                    "is_verified": True,
                    "verified_at": now,
                })\
                .eq("id", verification_id)\
                .execute()
            
            logger.info(f"[OTP] 인증 성공: {normalized_phone[-4:].rjust(11, '*')}")
            
            # 이 전화번호로 등록된 사용자 확인
            profile_result = self.supabase.table("profiles")\
                .select("id, email, display_name, phone_number, subscription_tier, onboarding_completed")\
                .eq("phone_number", normalized_phone)\
                .execute()
            
            if profile_result.data and len(profile_result.data) > 0:
                user_data = profile_result.data[0]
                return {
                    "success": True,
                    "message": "인증이 완료되었습니다",
                    "is_new_user": False,
                    "user_id": user_data["id"],
                    "user_data": user_data,
                }
            else:
                # 신규 사용자 (전화번호로 등록된 계정 없음)
                return {
                    "success": True,
                    "message": "인증이 완료되었습니다",
                    "is_new_user": True,
                    "phone_number": normalized_phone,
                }
                
        except Exception as e:
            logger.error(f"[OTP] verify_otp 오류: {str(e)}")
            return {"success": False, "message": "인증 확인 중 오류가 발생했습니다"}


# 싱글톤 인스턴스
otp_service = OTPService()
