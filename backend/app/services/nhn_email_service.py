"""
NHN Cloud Email 서비스
- 키워드 순위 알림 이메일 발송
- 환영 이메일, 마케팅 이메일 등
"""
import logging
from typing import List, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class NHNEmailService:
    """NHN Cloud Email 발송 서비스"""
    
    def __init__(self):
        self.base_url = settings.NHN_EMAIL_URL
        self.appkey = settings.NHN_EMAIL_APPKEY
        self.secret_key = settings.NHN_EMAIL_SECRET_KEY
        self.sender_address = settings.NHN_EMAIL_SENDER
        self.sender_name = "윕플(Whiplace)"
    
    def _get_headers(self) -> dict:
        """API 요청 헤더"""
        return {
            "Content-Type": "application/json;charset=UTF-8",
            "X-Secret-Key": self.secret_key,
        }
    
    def _get_send_url(self) -> str:
        """이메일 발송 API URL"""
        return f"{self.base_url}/email/v2.0/appKeys/{self.appkey}/sender/mail"
    
    def _is_configured(self) -> bool:
        """NHN Cloud Email 설정 확인"""
        return bool(self.appkey and self.secret_key)
    
    async def send_rank_alert_email(
        self,
        to_email: str,
        user_name: str,
        store_name: str,
        rank_results: List[dict],
        collected_at: str,
    ) -> dict:
        """
        키워드 순위 알림 이메일 발송
        
        Args:
            to_email: 수신자 이메일
            user_name: 사용자 이름
            store_name: 매장 이름
            rank_results: [{keyword, rank, rank_change}, ...]
            collected_at: 수집 시간
        
        Returns:
            발송 결과 dict
        """
        if not self._is_configured():
            logger.error("[NHN Email] API 설정이 완료되지 않았습니다")
            return {"success": False, "message": "이메일 설정이 완료되지 않았습니다"}
        
        # HTML 이메일 본문 생성
        html_body = self._build_rank_alert_html(
            user_name=user_name,
            store_name=store_name,
            rank_results=rank_results,
            collected_at=collected_at,
        )
        
        title = f"[윕플] {store_name} 키워드 순위 알림 - {collected_at}"
        
        payload = {
            "senderAddress": self.sender_address,
            "senderName": self.sender_name,
            "title": title,
            "body": html_body,
            "receiverList": [
                {
                    "receiveMailAddr": to_email,
                    "receiveName": user_name,
                    "receiveType": "MRT0",  # 받는 사람
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
                    f"[NHN Email] 순위 알림 발송 - "
                    f"매장: {store_name}, 수신자: {to_email}, "
                    f"status: {response.status_code}"
                )
                
                header = result.get("header", {})
                if header.get("isSuccessful"):
                    return {
                        "success": True,
                        "message": "순위 알림 이메일이 발송되었습니다",
                        "request_id": result.get("body", {}).get("data", {}).get("requestId"),
                    }
                else:
                    error_msg = header.get("resultMessage", "알 수 없는 오류")
                    logger.error(f"[NHN Email] 발송 실패: {error_msg}")
                    return {
                        "success": False,
                        "message": f"이메일 발송 실패: {error_msg}",
                        "error_code": header.get("resultCode"),
                    }
                    
        except httpx.TimeoutException:
            logger.error("[NHN Email] 요청 타임아웃")
            return {"success": False, "message": "요청 시간 초과"}
        except Exception as e:
            logger.error(f"[NHN Email] 발송 오류: {str(e)}")
            return {"success": False, "message": f"발송 오류: {str(e)}"}
    
    def _build_rank_alert_html(
        self,
        user_name: str,
        store_name: str,
        rank_results: List[dict],
        collected_at: str,
    ) -> str:
        """순위 알림 HTML 이메일 본문 생성 (윕플 브랜드 디자인)"""
        
        # 키워드별 순위 카드 생성 (모바일 최적화)
        keyword_cards = ""
        for idx, item in enumerate(rank_results):
            keyword = item.get("keyword", "")
            rank = item.get("rank")
            rank_change = item.get("rank_change")
            
            # 순위 텍스트
            if rank is None:
                rank_text = '<span style="color: #9CA3AF; font-size: 16px; font-weight: 600;">순위권 밖</span>'
            else:
                rank_text = f'<span style="color: #0D9488; font-weight: 700; font-size: 22px;">{rank}</span><span style="color: #0D9488; font-weight: 500; font-size: 14px;">위</span>'
            
            # 변동 배지 (한국 주식 컨벤션: 상승=빨강, 하락=파랑)
            if rank_change is not None and rank_change != 0:
                if rank_change > 0:
                    change_html = f'<span style="display: inline-block; background: #FEF2F2; color: #DC2626; font-weight: 600; font-size: 12px; padding: 2px 8px; border-radius: 12px;">▲ {rank_change}</span>'
                else:
                    change_html = f'<span style="display: inline-block; background: #EFF6FF; color: #2563EB; font-weight: 600; font-size: 12px; padding: 2px 8px; border-radius: 12px;">▼ {abs(rank_change)}</span>'
            else:
                change_html = '<span style="display: inline-block; background: #F3F4F6; color: #9CA3AF; font-weight: 500; font-size: 12px; padding: 2px 8px; border-radius: 12px;">—</span>'
            
            # 짝수/홀수 행 배경색 구분
            row_bg = "#FFFFFF" if idx % 2 == 0 else "#F9FAFB"
            
            keyword_cards += f"""
            <tr>
                <td style="padding: 14px 16px; background: {row_bg}; border-bottom: 1px solid #F0F0F0;">
                    <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                        <tr>
                            <td style="font-size: 14px; font-weight: 500; color: #1F2937; padding-right: 8px; vertical-align: middle;">
                                {keyword}
                            </td>
                            <td style="text-align: right; white-space: nowrap; vertical-align: middle;" width="110">
                                {rank_text}
                                &nbsp;
                                {change_html}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            """
        
        # 키워드 개수
        keyword_count = len(rank_results)
        
        html = f"""
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>키워드 순위 알림 - 윕플</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {{ font-family: Arial, sans-serif !important; }}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif; line-height: 1.6; color: #212121; background-color: #F0F2F5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    <!-- Wrapper -->
    <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #F0F2F5;">
        <tr>
            <td align="center" style="padding: 24px 16px;">
                <!-- Main Container -->
                <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
                    
                    <!-- Logo Header -->
                    <tr>
                        <td style="padding: 28px 24px 0; text-align: center;">
                            <a href="https://www.whiplace.com" style="text-decoration: none;">
                                <img src="https://www.whiplace.com/whiplace%20logo%20v10.png" alt="윕플" width="140" height="auto" style="display: inline-block; max-width: 140px; height: auto; border: 0;" />
                            </a>
                        </td>
                    </tr>
                    
                    <!-- Gradient Divider -->
                    <tr>
                        <td style="padding: 16px 24px 0;">
                            <div style="height: 3px; border-radius: 2px; background: linear-gradient(90deg, #10B981 0%, #14B8A6 40%, #06B6D4 100%);"></div>
                        </td>
                    </tr>
                    
                    <!-- Title Section -->
                    <tr>
                        <td style="padding: 24px 24px 8px; text-align: center;">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #111827; letter-spacing: -0.5px; line-height: 1.3;">
                                📊 키워드 순위 알림
                            </h1>
                            <p style="margin: 8px 0 0; font-size: 13px; color: #9CA3AF; font-weight: 400;">
                                {collected_at} 기준 업데이트
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Greeting -->
                    <tr>
                        <td style="padding: 16px 24px 8px;">
                            <p style="margin: 0; font-size: 14px; color: #4B5563; line-height: 1.7;">
                                안녕하세요, <strong style="color: #111827;">{user_name}</strong>님!<br>
                                <strong style="color: #0D9488;">{store_name}</strong>의 키워드 순위가 업데이트되었습니다.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Store Badge -->
                    <tr>
                        <td style="padding: 12px 24px;">
                            <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #ECFDF5 0%, #F0FDFA 100%); border: 1px solid #A7F3D0; border-radius: 10px; padding: 12px 16px;">
                                        <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                            <tr>
                                                <td style="font-size: 13px; color: #6B7280;">매장</td>
                                                <td style="text-align: right; font-size: 14px; font-weight: 600; color: #065F46;">{store_name}</td>
                                            </tr>
                                            <tr>
                                                <td style="font-size: 13px; color: #6B7280; padding-top: 4px;">추적 키워드</td>
                                                <td style="text-align: right; font-size: 14px; font-weight: 600; color: #065F46; padding-top: 4px;">{keyword_count}개</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Rank Results -->
                    <tr>
                        <td style="padding: 4px 24px 16px;">
                            <table cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; border-collapse: collapse;">
                                <!-- Table Header -->
                                <tr>
                                    <td style="padding: 10px 16px; background: #F9FAFB; border-bottom: 2px solid #E5E7EB;">
                                        <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                            <tr>
                                                <td style="font-size: 11px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px;">
                                                    키워드
                                                </td>
                                                <td style="text-align: right; font-size: 11px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px;" width="110">
                                                    순위 / 변동
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <!-- Keyword Rows -->
                                {keyword_cards}
                            </table>
                        </td>
                    </tr>
                    
                    <!-- CTA Button -->
                    <tr>
                        <td style="padding: 8px 24px 24px; text-align: center;">
                            <a href="https://www.whiplace.com/dashboard/naver/metrics-tracker" 
                               style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #0D9488 100%); color: #FFFFFF; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 12px rgba(16,185,129,0.25); letter-spacing: -0.2px;">
                                대시보드에서 자세히 보기 →
                            </a>
                        </td>
                    </tr>
                    
                    <!-- Info Note -->
                    <tr>
                        <td style="padding: 0 24px 20px;">
                            <p style="margin: 0; font-size: 12px; color: #BDBDBD; text-align: center; line-height: 1.6;">
                                이 알림은 키워드 순위 추적 설정에 의해 자동 발송되었습니다.<br>
                                알림 설정은 <a href="https://www.whiplace.com/dashboard/naver/metrics-tracker" style="color: #0D9488; text-decoration: underline;">순위 추적 페이지</a>에서 변경할 수 있습니다.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 16px 24px; background-color: #F9FAFB; border-top: 1px solid #F0F0F0; text-align: center;">
                            <a href="https://www.whiplace.com" style="text-decoration: none;">
                                <img src="https://www.whiplace.com/whiplace%20logo%20v10.png" alt="윕플" width="72" height="auto" style="display: inline-block; max-width: 72px; height: auto; border: 0; opacity: 0.4;" />
                            </a>
                            <p style="margin: 8px 0 0; font-size: 11px; color: #BDBDBD; line-height: 1.5;">
                                &copy; 2026 윕플(Whiplace). All rights reserved.<br>
                                자영업자와 소상공인을 위한 매장 관리 솔루션
                            </p>
                        </td>
                    </tr>
                    
                </table>
                <!-- End Main Container -->
            </td>
        </tr>
    </table>
    <!-- End Wrapper -->
</body>
</html>
        """
        return html


# 싱글톤 인스턴스
nhn_email_service = NHNEmailService()
