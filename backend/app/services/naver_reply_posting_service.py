"""
네이버 스마트플레이스 답글 포스팅 서비스
- Selenium 기반 자동화 (클라우드 서버 최적화)
- 세션 관리 (Supabase)
- 답글 게시 및 검증
"""
import os
import time
import logging
import json
import re
from typing import Dict, Any, Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class NaverReplyPostingService:
    """네이버 스마트플레이스 답글 포스팅 서비스"""
    
    def __init__(self):
        self.driver = None
        self.session_loaded = False
    
    def _create_driver(self, headless: bool = True) -> webdriver.Chrome:
        """Chrome WebDriver 생성 (클라우드 서버 최적화)"""
        chrome_options = Options()
        
        if headless:
            chrome_options.add_argument('--headless=new')
        
        # 클라우드 서버 필수 옵션
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--disable-software-rasterizer')
        chrome_options.add_argument('--disable-extensions')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_argument('--window-size=1280,720')
        
        # 메모리 최적화
        chrome_options.add_argument('--single-process')
        chrome_options.add_argument('--disable-setuid-sandbox')
        chrome_options.add_argument('--disable-background-networking')
        chrome_options.add_argument('--disable-background-timer-throttling')
        chrome_options.add_argument('--disable-backgrounding-occluded-windows')
        chrome_options.add_argument('--disable-breakpad')
        chrome_options.add_argument('--disable-features=TranslateUI')
        chrome_options.add_argument('--mute-audio')
        
        # User-Agent
        chrome_options.add_argument(
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        try:
            driver = webdriver.Chrome(
                service=Service(ChromeDriverManager().install()),
                options=chrome_options
            )
            logger.info("Chrome WebDriver 생성 완료")
            return driver
        except Exception as e:
            logger.error(f"Chrome WebDriver 생성 실패: {e}")
            raise
    
    def _load_session(self, user_id: str) -> bool:
        """
        Supabase에서 네이버 세션 로드
        
        Args:
            user_id: 사용자 ID
        
        Returns:
            세션 로드 성공 여부
        """
        try:
            from app.core.database import get_supabase_client
            
            supabase = get_supabase_client()
            
            # stores 테이블에서 naver_session_encrypted 가져오기
            result = supabase.table("stores").select("naver_session_encrypted").eq("user_id", user_id).execute()
            
            if not result.data or not result.data[0].get("naver_session_encrypted"):
                logger.error(f"네이버 세션을 찾을 수 없습니다: user_id={user_id}")
                return False
            
            session_data = result.data[0]["naver_session_encrypted"]
            
            # JSON 파싱
            cookies = json.loads(session_data)
            
            if not cookies:
                logger.error("쿠키가 비어있습니다")
                return False
            
            logger.info(f"세션 로드 성공: {len(cookies)}개 쿠키")
            
            # 쿠키 주입
            self.driver.get("https://new.smartplace.naver.com")
            time.sleep(2)
            
            for cookie in cookies:
                try:
                    # Selenium이 필요로 하는 형식으로 변환
                    cookie_dict = {
                        'name': cookie.get('name'),
                        'value': cookie.get('value'),
                        'domain': cookie.get('domain', '.naver.com'),
                        'path': cookie.get('path', '/'),
                        'secure': cookie.get('secure', False),
                        'httpOnly': cookie.get('httpOnly', False)
                    }
                    
                    # sameSite는 Selenium 4+에서만 지원
                    if 'sameSite' in cookie:
                        cookie_dict['sameSite'] = cookie['sameSite']
                    
                    self.driver.add_cookie(cookie_dict)
                except Exception as e:
                    logger.warning(f"쿠키 추가 실패: {e}")
            
            logger.info("쿠키 주입 완료")
            self.session_loaded = True
            return True
            
        except Exception as e:
            logger.error(f"세션 로드 실패: {e}", exc_info=True)
            return False
    
    def post_reply(
        self,
        place_id: str,
        author: str,
        date: str,
        content: str,
        reply_text: str,
        user_id: str,
        expected_count: int = 50
    ) -> Dict[str, Any]:
        """
        답글 게시 (작성자 + 날짜 + 내용 매칭 방식)
        
        Args:
            place_id: 네이버 플레이스 ID
            author: 리뷰 작성자
            date: 리뷰 작성 날짜 (예: "2025.01.12.")
            content: 리뷰 내용 (처음 50자)
            reply_text: 답글 내용
            user_id: 사용자 ID
            expected_count: 렌더링할 리뷰 개수
        
        Returns:
            {
                "success": True/False,
                "message": "성공/실패 메시지"
            }
        """
        try:
            logger.info(f"답글 게시 시작: place_id={place_id}, author={author}, date={date}")
            
            # 1. WebDriver 생성
            self.driver = self._create_driver(headless=True)
            
            # 2. 세션 로드
            if not self._load_session(user_id):
                raise Exception("네이버 로그인 세션이 만료되었습니다. 세션 관리 페이지에서 다시 로그인해주세요.")
            
            # 3. 미답글 리뷰 페이지로 이동
            reviews_url = f'https://new.smartplace.naver.com/bizes/place/{place_id}/reviews?menu=visitor&hasReply=false'
            logger.info(f"페이지 이동: {reviews_url}")
            self.driver.get(reviews_url)
            time.sleep(3)
            
            # 팝업 처리
            try:
                popup_btn = self.driver.find_element(By.CSS_SELECTOR, "button.Modal_btn_confirm__uQZFR")
                if popup_btn.is_displayed():
                    self.driver.execute_script("arguments[0].click();", popup_btn)
                    time.sleep(1)
            except:
                pass
            
            # 4. 타겟 리뷰 찾기 (점진적 로딩)
            logger.info(f"타겟 리뷰 검색 시작: author={author}, date={date}")
            
            # 날짜에서 요일 제거
            date_clean = re.sub(r'\([^)]*\)', '', date).strip()
            author_prefix = author[:min(3, len(author))]
            
            scroll_count = 0
            max_scrolls = 20
            target_review = None
            last_check_count = 0
            consecutive_no_load = 0
            
            while scroll_count < max_scrolls and not target_review:
                all_lis = self.driver.find_elements(By.TAG_NAME, "li")
                
                # 유효한 리뷰만 필터링
                valid_reviews = []
                for li in all_lis:
                    try:
                        li.find_element(By.CLASS_NAME, "pui__JiVbY3")
                        valid_reviews.append(li)
                    except:
                        continue
                
                current_count = len(valid_reviews)
                newly_loaded = current_count - last_check_count
                
                logger.info(f"검색 중... ({current_count}개 리뷰 로드됨, 새로 로드: {newly_loaded}개)")
                
                if newly_loaded == 0:
                    consecutive_no_load += 1
                else:
                    consecutive_no_load = 0
                
                # 새로 로드된 리뷰에서 검색
                search_start_idx = max(0, last_check_count)
                search_reviews = valid_reviews[search_start_idx:]
                
                for idx, li in enumerate(search_reviews):
                    try:
                        # 작성자 확인
                        li_author = li.find_element(By.CLASS_NAME, "pui__JiVbY3").text.strip()
                        
                        # 날짜 확인
                        li_date = ""
                        d_elems = li.find_elements(By.CLASS_NAME, "pui__m7nkds")
                        for d in d_elems:
                            if re.search(r'20\d{2}\.', d.text):
                                li_date = d.text.strip()
                                break
                        
                        li_date_clean = re.sub(r'\([^)]*\)', '', li_date).strip()
                        
                        # 매칭 확인
                        author_match = li_author.startswith(author_prefix)
                        date_match = li_date_clean == date_clean
                        
                        # 내용 매칭 (있으면)
                        content_match = True
                        if content and len(content) > 10:
                            try:
                                li_content = li.find_element(By.CLASS_NAME, "pui__vn15t2").text.strip()
                                content_match = content[:50] in li_content[:100]
                            except:
                                content_match = True
                        
                        if author_match and date_match and content_match:
                            logger.info(f"[OK] 타겟 리뷰 발견: {li_author} ({li_date_clean})")
                            target_review = li
                            break
                    except:
                        continue
                
                if target_review:
                    break
                
                # 충분히 로드했거나 더 이상 로드할 것이 없으면 중단
                if current_count >= expected_count or consecutive_no_load >= 3:
                    logger.info(f"스크롤 중단: count={current_count}, no_load={consecutive_no_load}")
                    break
                
                # 스크롤
                last_check_count = current_count
                self.driver.execute_script("window.scrollBy(0, 1500);")
                time.sleep(1.5)
                scroll_count += 1
            
            if not target_review:
                raise Exception(f"해당 리뷰를 찾을 수 없습니다: {author} ({date_clean})")
            
            # 5. 리뷰로 스크롤
            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", target_review)
            time.sleep(1)
            
            # 6. 기존 답글 확인
            try:
                existing_reply = target_review.find_element(By.CLASS_NAME, "pui__GbW8H7")
                if existing_reply:
                    raise Exception("이미 답글이 존재하는 리뷰입니다.")
            except Exception as e:
                if "이미 답글이 존재" in str(e):
                    raise
            
            # 7. "답글" 버튼 클릭
            logger.info("답글 버튼 클릭...")
            reply_btn = target_review.find_element(By.XPATH, ".//button[contains(., '답글')]")
            self.driver.execute_script("arguments[0].click();", reply_btn)
            time.sleep(2)
            
            # 8. Textarea 입력
            logger.info("답글 입력...")
            textarea = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "textarea"))
            )
            
            # BMP 문자 필터링 (이모지 제거)
            def remove_non_bmp(text):
                return ''.join(c for c in text if ord(c) <= 0xFFFF)
            
            reply_text_safe = remove_non_bmp(reply_text)
            
            self.driver.execute_script("arguments[0].focus();", textarea)
            self.driver.execute_script("arguments[0].click();", textarea)
            time.sleep(0.3)
            
            textarea.clear()
            time.sleep(0.5)
            
            # 실제 키 입력 (React 이벤트 트리거)
            textarea.send_keys(reply_text_safe)
            time.sleep(1)
            
            # 입력 검증
            actual_value = self.driver.execute_script("return arguments[0].value;", textarea)
            if len(actual_value) < 10:
                logger.warning("send_keys 실패, JavaScript로 재시도...")
                self.driver.execute_script("""
                    const textarea = arguments[0];
                    const text = arguments[1];
                    textarea.value = text;
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    textarea.dispatchEvent(new Event('change', { bubbles: true }));
                """, textarea, reply_text_safe)
                time.sleep(1)
            
            # 9. "등록" 버튼 클릭
            logger.info("등록 버튼 클릭...")
            submit_btn = target_review.find_element(By.XPATH, ".//button[contains(text(), '등록')]")
            
            # 버튼 활성화 확인
            is_disabled = submit_btn.get_attribute("disabled")
            if is_disabled:
                raise Exception("등록 버튼이 비활성화 상태입니다")
            
            self.driver.execute_script("arguments[0].click();", submit_btn)
            time.sleep(5)
            
            # 10. 검증 (답글이 실제로 게시되었는지)
            logger.info("답글 게시 검증 중...")
            time.sleep(3)
            
            reply_verified = False
            for retry in range(3):
                try:
                    all_lis = self.driver.find_elements(By.TAG_NAME, "li")
                    for li in all_lis:
                        try:
                            li_author = li.find_element(By.CLASS_NAME, "pui__JiVbY3").text.strip()
                            if not li_author.startswith(author_prefix):
                                continue
                            
                            li_date = ""
                            d_elems = li.find_elements(By.CLASS_NAME, "pui__m7nkds")
                            for d in d_elems:
                                if re.search(r'20\d{2}\.', d.text):
                                    li_date = d.text.strip()
                                    break
                            
                            li_date_clean = re.sub(r'\([^)]*\)', '', li_date).strip()
                            
                            if li_date_clean == date_clean:
                                reply_elem = li.find_element(By.CLASS_NAME, "pui__GbW8H7")
                                logger.info(f"[OK] 답글 게시 확인: {reply_elem.text[:30]}...")
                                reply_verified = True
                                break
                        except:
                            continue
                    
                    if reply_verified:
                        break
                    
                    if retry < 2:
                        time.sleep(2)
                except:
                    pass
            
            if not reply_verified:
                raise Exception("답글 게시 검증 실패 - 답글이 실제로 게시되지 않았습니다")
            
            logger.info("[OK] 답글 게시 완료!")
            return {
                "success": True,
                "message": "답글이 성공적으로 게시되었습니다"
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"답글 게시 실패: {error_msg}", exc_info=True)
            return {
                "success": False,
                "message": f"답글 게시 실패: {error_msg}"
            }
        
        finally:
            if self.driver:
                try:
                    self.driver.quit()
                    logger.info("WebDriver 종료 완료")
                except:
                    pass
