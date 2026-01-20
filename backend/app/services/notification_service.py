"""
알림 서비스
카카오톡, SMS, 이메일 알림 전송
"""
import logging
from typing import Dict, Optional
import os
import requests
from datetime import datetime

logger = logging.getLogger(__name__)


class NotificationService:
    """알림 서비스 (카카오톡, SMS, 이메일)"""
    
    def __init__(self):
        # 카카오톡 비즈메시지 API 설정
        self.kakao_api_key = os.getenv("KAKAO_MESSAGE_API_KEY")
        self.kakao_sender_key = os.getenv("KAKAO_SENDER_KEY")
        
        # SMS API 설정 (예: Twilio, NCP SENS 등)
        self.sms_api_key = os.getenv("SMS_API_KEY")
        self.sms_api_secret = os.getenv("SMS_API_SECRET")
        self.sms_sender_number = os.getenv("SMS_SENDER_NUMBER")
        
        # 이메일 설정 (SMTP)
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.email_from = os.getenv("EMAIL_FROM", "noreply@whiplace.com")
    
    async def send_metric_notification(
        self,
        notification_type: str,
        recipient: str,
        data: Dict
    ) -> bool:
        """
        주요지표 변동 알림 전송
        
        Args:
            notification_type: 'kakao', 'sms', 'email'
            recipient: 수신자 (전화번호 또는 이메일)
            data: 알림 데이터
                {
                    'store_name': str,
                    'keyword': str,
                    'rank': int,
                    'rank_change': int,
                    'visitor_review_count': int,
                    'blog_review_count': int,
                    'collection_date': str
                }
        
        Returns:
            전송 성공 여부
        """
        try:
            if notification_type == 'kakao':
                return await self._send_kakao_message(recipient, data)
            elif notification_type == 'sms':
                return await self._send_sms(recipient, data)
            elif notification_type == 'email':
                return await self._send_email(recipient, data)
            else:
                logger.error(f"Unknown notification type: {notification_type}")
                return False
        except Exception as e:
            logger.error(f"Error sending notification: {str(e)}")
            return False
    
    async def _send_kakao_message(self, phone: str, data: Dict) -> bool:
        """
        카카오톡 비즈메시지 전송
        
        참고: 카카오톡 비즈메시지 API는 사전에 템플릿 승인이 필요합니다.
        https://business.kakao.com/dashboard/
        """
        try:
            if not self.kakao_api_key or not self.kakao_sender_key:
                logger.warning("Kakao API credentials not configured")
                return False
            
            # 메시지 내용 구성
            message = self._format_message(data)
            
            # 카카오톡 비즈메시지 API 호출 (예시)
            # 실제 구현 시 카카오톡 비즈메시지 API 문서 참고
            url = "https://api.kakao.com/v2/api/talk/memo/default/send"  # 예시 URL
            headers = {
                "Authorization": f"Bearer {self.kakao_api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "receiver": phone,
                "message": message,
                "sender_key": self.kakao_sender_key
            }
            
            # TODO: 실제 API 호출 구현
            logger.info(f"[KAKAO] Would send message to {phone}: {message}")
            
            # 개발 중에는 로그만 출력
            return True
            
        except Exception as e:
            logger.error(f"Error sending Kakao message: {str(e)}")
            return False
    
    async def _send_sms(self, phone: str, data: Dict) -> bool:
        """
        SMS 전송
        
        참고: 실제 구현 시 NCP SENS, Twilio 등의 SMS API 사용
        https://docs.ncloud.com/ko/sens/sens-1-3.html (NCP SENS)
        https://www.twilio.com/docs/sms (Twilio)
        """
        try:
            if not self.sms_api_key or not self.sms_sender_number:
                logger.warning("SMS API credentials not configured")
                return False
            
            # 메시지 내용 구성 (SMS는 90바이트 제한)
            message = self._format_sms_message(data)
            
            # SMS API 호출 (예시)
            # TODO: 실제 API 호출 구현
            logger.info(f"[SMS] Would send message to {phone}: {message}")
            
            # 개발 중에는 로그만 출력
            return True
            
        except Exception as e:
            logger.error(f"Error sending SMS: {str(e)}")
            return False
    
    async def _send_email(self, email: str, data: Dict) -> bool:
        """
        이메일 전송
        """
        try:
            if not self.smtp_username or not self.smtp_password:
                logger.warning("SMTP credentials not configured")
                return False
            
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            # 이메일 내용 구성
            subject = f"[위플레이스] {data['store_name']} - {data['keyword']} 순위 업데이트"
            html_body = self._format_email_html(data)
            
            # 이메일 메시지 생성
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.email_from
            msg['To'] = email
            
            # HTML 본문 추가
            html_part = MIMEText(html_body, 'html', 'utf-8')
            msg.attach(html_part)
            
            # SMTP 서버 연결 및 전송
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"[EMAIL] Message sent to {email}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
            return False
    
    def _format_message(self, data: Dict) -> str:
        """알림 메시지 포맷팅 (카카오톡용)"""
        rank_change_text = ""
        if data.get('rank_change'):
            change = data['rank_change']
            if change > 0:
                rank_change_text = f" (↑{change})"
            elif change < 0:
                rank_change_text = f" (↓{abs(change)})"
        
        message = f"""
📊 주요지표 업데이트

매장: {data['store_name']}
키워드: {data['keyword']}

📍 순위: {data['rank']}위{rank_change_text}
👥 방문자리뷰: {data['visitor_review_count']:,}개
📝 블로그리뷰: {data['blog_review_count']:,}개

업데이트 시간: {data['collection_date']}

위플레이스에서 자세히 보기 →
        """.strip()
        
        return message
    
    def _format_sms_message(self, data: Dict) -> str:
        """SMS 메시지 포맷팅 (90바이트 제한)"""
        rank_change_text = ""
        if data.get('rank_change'):
            change = data['rank_change']
            if change > 0:
                rank_change_text = f"↑{change}"
            elif change < 0:
                rank_change_text = f"↓{abs(change)}"
        
        message = f"[위플레이스] {data['store_name']} - {data['keyword']}: {data['rank']}위{rank_change_text} / 방문자리뷰 {data['visitor_review_count']}개"
        return message[:90]  # 90바이트 제한
    
    def _format_email_html(self, data: Dict) -> str:
        """이메일 HTML 본문 포맷팅"""
        rank_change_html = ""
        if data.get('rank_change'):
            change = data['rank_change']
            if change > 0:
                rank_change_html = f'<span style="color: #22c55e; font-weight: bold;">↑ {change}</span>'
            elif change < 0:
                rank_change_html = f'<span style="color: #ef4444; font-weight: bold;">↓ {abs(change)}</span>'
        
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">📊 주요지표 업데이트</h1>
    </div>
    
    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="margin-top: 0; color: #667eea; font-size: 20px;">{data['store_name']}</h2>
            <p style="color: #666; margin: 5px 0 20px 0;">키워드: <strong>{data['keyword']}</strong></p>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                            <span style="color: #6b7280;">📍 순위</span>
                        </td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
                            <strong style="font-size: 20px; color: #667eea;">{data['rank']}위</strong>
                            {rank_change_html}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                            <span style="color: #6b7280;">👥 방문자리뷰</span>
                        </td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
                            <strong>{data['visitor_review_count']:,}개</strong>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0;">
                            <span style="color: #6b7280;">📝 블로그리뷰</span>
                        </td>
                        <td style="padding: 12px 0; text-align: right;">
                            <strong>{data['blog_review_count']:,}개</strong>
                        </td>
                    </tr>
                </table>
            </div>
            
            <p style="color: #9ca3af; font-size: 14px; margin-top: 20px;">
                업데이트 시간: {data['collection_date']}
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="https://whiplace.com/dashboard/metrics" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                    위플레이스에서 자세히 보기 →
                </a>
            </div>
        </div>
        
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
            © 2026 Whiplace. All rights reserved.
        </p>
    </div>
</body>
</html>
        """
        
        return html


# 싱글톤 인스턴스
notification_service = NotificationService()
