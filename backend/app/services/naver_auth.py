"""
네이버 인증 및 세션 관리
쿠키 암호화 저장 및 브라우저 세션 주입
"""
from cryptography.fernet import Fernet
import json
import os
from typing import Optional, List, Dict
from dotenv import load_dotenv
from playwright.async_api import BrowserContext, Page

from app.core.database import get_supabase_client

load_dotenv()

# 암호화 키 로드 또는 생성
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    # 개발 환경에서 키가 없으면 새로 생성 (프로덕션에서는 반드시 설정 필요)
    ENCRYPTION_KEY = Fernet.generate_key().decode()
    print(f"⚠️ ENCRYPTION_KEY가 설정되지 않았습니다. 생성된 키: {ENCRYPTION_KEY}")
    print("이 키를 .env 파일에 저장하세요!")

cipher = Fernet(ENCRYPTION_KEY.encode())


class NaverAuthService:
    """네이버 인증 서비스"""
    
    @staticmethod
    def encrypt_cookies(cookies: List[Dict]) -> str:
        """
        쿠키 목록을 암호화
        
        Args:
            cookies: 쿠키 딕셔너리 리스트
            
        Returns:
            str: 암호화된 문자열
        """
        cookies_json = json.dumps(cookies)
        encrypted = cipher.encrypt(cookies_json.encode()).decode()
        return encrypted
    
    @staticmethod
    def decrypt_cookies(encrypted_cookies: str) -> List[Dict]:
        """
        암호화된 쿠키를 복호화
        
        Args:
            encrypted_cookies: 암호화된 쿠키 문자열
            
        Returns:
            List[Dict]: 쿠키 딕셔너리 리스트
        """
        decrypted = cipher.decrypt(encrypted_cookies.encode()).decode()
        cookies = json.loads(decrypted)
        return cookies
    
    @staticmethod
    async def store_naver_session(
        user_id: str,
        store_id: str,
        cookies: List[Dict]
    ) -> bool:
        """
        네이버 세션 쿠키를 암호화하여 Supabase에 저장
        
        Args:
            user_id: 사용자 ID
            store_id: 매장 ID
            cookies: 네이버 쿠키 리스트
            
        Returns:
            bool: 저장 성공 여부
        """
        try:
            supabase = get_supabase_client()
            
            # 쿠키 암호화
            encrypted = NaverAuthService.encrypt_cookies(cookies)
            
            # DB 업데이트
            response = supabase.table("stores").update({
                "credentials": {"cookies": encrypted, "type": "naver"},
                "status": "active"
            }).eq("id", store_id).eq("user_id", user_id).execute()
            
            return len(response.data) > 0
        except Exception as e:
            print(f"❌ 네이버 세션 저장 실패: {e}")
            return False
    
    @staticmethod
    async def load_naver_session(
        context: BrowserContext,
        store_id: str
    ) -> bool:
        """
        저장된 네이버 세션을 브라우저 컨텍스트에 주입
        
        Args:
            context: Playwright 브라우저 컨텍스트
            store_id: 매장 ID
            
        Returns:
            bool: 로그인 성공 여부
        """
        try:
            supabase = get_supabase_client()
            
            # DB에서 credentials 조회
            response = supabase.table("stores").select("credentials").eq("id", store_id).single().execute()
            
            if not response.data or "credentials" not in response.data:
                print(f"⚠️ 매장 {store_id}의 인증 정보를 찾을 수 없습니다.")
                return False
            
            credentials = response.data["credentials"]
            if "cookies" not in credentials:
                print(f"⚠️ 매장 {store_id}의 쿠키 정보를 찾을 수 없습니다.")
                return False
            
            # 쿠키 복호화
            encrypted_cookies = credentials["cookies"]
            cookies = NaverAuthService.decrypt_cookies(encrypted_cookies)
            
            # 쿠키를 Playwright 형식으로 변환 및 주입
            await context.add_cookies(cookies)
            
            # 로그인 상태 확인
            page = await context.new_page()
            await page.goto("https://new.smartplace.naver.com", timeout=30000, wait_until="networkidle")
            await page.wait_for_timeout(2000)
            
            # 로그인 페이지가 표시되지 않으면 로그인 성공
            is_logged_in = await page.locator("text=로그인").count() == 0
            
            if is_logged_in:
                print(f"✅ 매장 {store_id} 네이버 로그인 성공")
            else:
                print(f"❌ 매장 {store_id} 네이버 로그인 실패 - 세션 만료 가능성")
                # 상태 업데이트
                supabase.table("stores").update({
                    "status": "disconnected"
                }).eq("id", store_id).execute()
            
            await page.close()
            return is_logged_in
            
        except Exception as e:
            print(f"❌ 네이버 세션 로드 실패: {e}")
            return False
    
    @staticmethod
    async def verify_naver_login(page: Page) -> Dict[str, any]:
        """
        네이버 로그인 상태 확인
        
        Args:
            page: Playwright 페이지
            
        Returns:
            Dict: 로그인 정보 (is_logged_in, user_name 등)
        """
        try:
            await page.goto("https://new.smartplace.naver.com", timeout=30000)
            await page.wait_for_timeout(2000)
            
            # 로그인 버튼 유무 확인
            login_button = await page.locator("text=로그인").count()
            is_logged_in = login_button == 0
            
            user_name = None
            if is_logged_in:
                # 사용자 이름 추출 시도
                try:
                    user_name_element = await page.locator(".user_name, .profile_name").first
                    user_name = await user_name_element.text_content() if user_name_element else None
                except:
                    pass
            
            return {
                "is_logged_in": is_logged_in,
                "user_name": user_name,
                "url": page.url
            }
        except Exception as e:
            print(f"❌ 네이버 로그인 확인 실패: {e}")
            return {
                "is_logged_in": False,
                "error": str(e)
            }


# 간편 함수
async def store_naver_cookies(user_id: str, store_id: str, cookies: List[Dict]) -> bool:
    """네이버 쿠키 저장 (간편 함수)"""
    return await NaverAuthService.store_naver_session(user_id, store_id, cookies)


async def inject_naver_session(context: BrowserContext, store_id: str) -> bool:
    """네이버 세션 주입 (간편 함수)"""
    return await NaverAuthService.load_naver_session(context, store_id)


