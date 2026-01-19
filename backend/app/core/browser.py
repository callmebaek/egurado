"""
Playwright 브라우저 매니저
네이버 보안 우회를 위한 스텔스 브라우저 설정
"""
from playwright.async_api import async_playwright, Browser, BrowserContext, Playwright
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


class BrowserManager:
    """브라우저 인스턴스 관리 클래스"""
    
    def __init__(self):
        self.playwright: Optional[Playwright] = None
        self.browser: Optional[Browser] = None
        
    async def start(self):
        """Playwright 및 브라우저 시작"""
        if self.playwright is None:
            self.playwright = await async_playwright().start()
        
        if self.browser is None:
            self.browser = await self.launch_stealth_browser()
        
        return self.browser
    
    async def launch_stealth_browser(self) -> Browser:
        """
        네이버 탐지를 우회하는 스텔스 브라우저 실행
        
        Returns:
            Browser: Playwright 브라우저 인스턴스
        """
        if self.playwright is None:
            raise RuntimeError("Playwright가 시작되지 않았습니다. start()를 먼저 호출하세요.")
        
        headless = os.getenv("HEADLESS", "true").lower() == "true"
        
        browser = await self.playwright.chromium.launch(
            headless=headless,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
            ]
        )
        
        return browser
    
    async def create_korean_context(
        self,
        browser: Optional[Browser] = None,
        viewport_width: int = 1920,
        viewport_height: int = 1080
    ) -> BrowserContext:
        """
        한국 환경 브라우저 컨텍스트 생성
        
        Args:
            browser: 브라우저 인스턴스 (None이면 기본 브라우저 사용)
            viewport_width: 뷰포트 너비
            viewport_height: 뷰포트 높이
            
        Returns:
            BrowserContext: 한국 환경이 설정된 브라우저 컨텍스트
        """
        if browser is None:
            browser = self.browser
        
        if browser is None:
            raise RuntimeError("브라우저가 시작되지 않았습니다.")
        
        # 한국 Windows 환경의 최신 Chrome User-Agent
        user_agent = (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/120.0.0.0 Safari/537.36'
        )
        
        context = await browser.new_context(
            locale='ko-KR',
            timezone_id='Asia/Seoul',
            user_agent=user_agent,
            viewport={'width': viewport_width, 'height': viewport_height},
            color_scheme='light',
            # 추가 권한 설정
            permissions=['geolocation'],
            geolocation={'latitude': 37.5665, 'longitude': 126.9780},  # 서울 좌표
        )
        
        # WebDriver 탐지 제거 스크립트
        await context.add_init_script("""
            // WebDriver 속성 제거
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            // Chrome 객체 추가 (자동화 탐지 우회)
            window.chrome = {
                runtime: {}
            };
            
            // Permissions 객체 수정
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            
            // Plugin 배열 수정 (실제 브라우저처럼)
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            
            // Languages 설정
            Object.defineProperty(navigator, 'languages', {
                get: () => ['ko-KR', 'ko', 'en-US', 'en']
            });
        """)
        
        return context
    
    async def close(self):
        """브라우저 및 Playwright 종료"""
        if self.browser:
            await self.browser.close()
            self.browser = None
        
        if self.playwright:
            await self.playwright.stop()
            self.playwright = None


# 글로벌 브라우저 매니저 인스턴스
_browser_manager: Optional[BrowserManager] = None


async def get_browser_manager() -> BrowserManager:
    """
    브라우저 매니저 싱글톤 인스턴스 반환
    
    Returns:
        BrowserManager: 브라우저 매니저 인스턴스
    """
    global _browser_manager
    
    if _browser_manager is None:
        _browser_manager = BrowserManager()
        await _browser_manager.start()
    
    return _browser_manager


async def create_stealth_page(url: Optional[str] = None):
    """
    스텔스 모드 페이지 생성 (간편 함수)
    
    Args:
        url: 이동할 URL (선택사항)
        
    Returns:
        Page: Playwright 페이지 인스턴스
    """
    manager = await get_browser_manager()
    context = await manager.create_korean_context()
    page = await context.new_page()
    
    if url:
        await page.goto(url, wait_until='networkidle', timeout=30000)
    
    return page


