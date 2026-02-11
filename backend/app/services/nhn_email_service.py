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
        self.sender_name = "Whiplace"
    
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
        
        title = f"📊 [{store_name}] 키워드 순위 알림 - {collected_at}"
        
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
        """순위 알림 HTML 이메일 본문 생성"""
        
        # 키워드별 순위 행 생성
        keyword_rows = ""
        for item in rank_results:
            keyword = item.get("keyword", "")
            rank = item.get("rank")
            rank_change = item.get("rank_change")
            
            # 순위 텍스트
            if rank is None:
                rank_text = '<span style="color: #9CA3AF;">순위권 밖</span>'
                rank_style = "color: #9CA3AF;"
            else:
                rank_text = f'<span style="color: #405D99; font-weight: 700; font-size: 18px;">{rank}위</span>'
                rank_style = "color: #405D99;"
            
            # 변동 텍스트
            if rank_change is not None and rank_change != 0:
                if rank_change > 0:
                    change_html = f'<span style="color: #22C55E; font-weight: 600; font-size: 13px;">▲ {rank_change}</span>'
                else:
                    change_html = f'<span style="color: #EF4444; font-weight: 600; font-size: 13px;">▼ {abs(rank_change)}</span>'
            else:
                change_html = '<span style="color: #9CA3AF; font-size: 13px;">-</span>'
            
            keyword_rows += f"""
            <tr>
                <td style="padding: 14px 16px; border-bottom: 1px solid #F3F4F6; font-size: 14px; font-weight: 500; color: #374151;">
                    {keyword}
                </td>
                <td style="padding: 14px 16px; border-bottom: 1px solid #F3F4F6; text-align: center;">
                    {rank_text}
                </td>
                <td style="padding: 14px 16px; border-bottom: 1px solid #F3F4F6; text-align: center;">
                    {change_html}
                </td>
            </tr>
            """
        
        html = f"""
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; line-height: 1.6; color: #212121; background-color: #F5F5F5;">
    <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
        <!-- Header -->
        <tr>
            <td style="padding: 32px 24px 20px; background: linear-gradient(135deg, #405D99 0%, #2E4577 100%); text-align: center;">
                <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px;">
                    📊 키워드 순위 알림
                </h1>
                <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">
                    {collected_at} 기준
                </p>
            </td>
        </tr>
        
        <!-- Body -->
        <tr>
            <td style="padding: 28px 24px;">
                <!-- 인사말 -->
                <p style="margin: 0 0 20px; font-size: 15px; color: #616161;">
                    안녕하세요, <strong style="color: #212121;">{user_name}</strong>님!<br>
                    <strong style="color: #405D99;">{store_name}</strong>의 키워드 순위가 업데이트되었습니다.
                </p>
                
                <!-- 순위 테이블 -->
                <table cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #E0E0E0; border-radius: 12px; overflow: hidden; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #FAFAFA;">
                            <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #757575; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E0E0E0;">
                                키워드
                            </th>
                            <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #757575; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E0E0E0;">
                                현재 순위
                            </th>
                            <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #757575; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E0E0E0;">
                                변동
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {keyword_rows}
                    </tbody>
                </table>
                
                <!-- CTA 버튼 -->
                <div style="text-align: center; margin-top: 28px;">
                    <a href="https://www.whiplace.com/dashboard/naver/metrics-tracker" 
                       style="display: inline-block; background: #405D99; color: #FFFFFF; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(64,93,153,0.2);">
                        자세히 보기 →
                    </a>
                </div>
                
                <!-- 안내 -->
                <p style="margin: 24px 0 0; font-size: 12px; color: #9E9E9E; text-align: center; line-height: 1.5;">
                    이 알림은 키워드 순위 추적 설정에 의해 자동 발송되었습니다.<br>
                    알림 설정은 <a href="https://www.whiplace.com/dashboard/naver/metrics-tracker" style="color: #405D99;">순위 추적 페이지</a>에서 변경할 수 있습니다.
                </p>
            </td>
        </tr>
        
        <!-- Footer -->
        <tr>
            <td style="padding: 20px 24px; background-color: #FAFAFA; border-top: 1px solid #E0E0E0; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #BDBDBD;">
                    &copy; 2026 Whiplace. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
        """
        return html


# 싱글톤 인스턴스
nhn_email_service = NHNEmailService()
