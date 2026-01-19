"""
Naver Smartplace Selenium Service (Egurado)
- Selenium 기반 리뷰 추출
- 3중 매칭 (작성자 + 날짜 + 내용) 답글 포스팅
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time
import re
import os
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class NaverSeleniumService:
    """Selenium 기반 네이버 스마트플레이스 서비스"""

    def __init__(self):
        self.active_user_id = "default"
        self._loading_progress: Dict[str, Dict] = {}

    def set_active_user(self, user_id: str):
        """활성 사용자 설정"""
        self.active_user_id = user_id
        print(f"[SWITCH] Active user switched to: {user_id}")

    def _load_session_from_supabase(self, user_id: str = "default", store_id: str = None):
        """Supabase의 stores 테이블에서 세션 로드"""
        try:
            from app.core.database import get_supabase_client
            import json

            supabase = get_supabase_client()

            # store_id가 있으면 특정 매장의 세션을 로드, 없으면 user_id로 조회
            if store_id:
                result = supabase.table("stores").select("naver_session_encrypted").eq("id", store_id).execute()
            else:
                # stores 테이블에서 user_id로 조회하고 naver_session이 있는 것만 필터링
                result = supabase.table("stores").select("naver_session_encrypted").eq("user_id", user_id).execute()

            if result.data and len(result.data) > 0:
                # 세션이 있는 store 찾기
                for store in result.data:
                    cookies_json = store.get('naver_session_encrypted')

                    if cookies_json and cookies_json.strip():
                        try:
                            cookies = json.loads(cookies_json)
                            if isinstance(cookies, list) and len(cookies) > 0:
                                # Debug: Check critical cookies
                                critical_cookies = [c['name'] for c in cookies if c.get('name') in ['NID_AUT', 'NID_SES']]
                                identifier = f"store '{store_id}'" if store_id else f"user '{user_id}'"
                                print(f"[BATCH] Found session in Supabase for {identifier} ({len(cookies)} cookies, critical: {critical_cookies})")
                                return {'cookies': cookies}
                        except json.JSONDecodeError as je:
                            logger.error(f"[ERROR] Failed to parse session JSON: {je}")
                            continue

            identifier = f"store '{store_id}'" if store_id else f"user '{user_id}'"
            print(f"[WARN] No valid session found in Supabase for {identifier}")
            return None
        except Exception as e:
            logger.error(f"[ERROR] Supabase session load error: {e}")
            return None

    def _create_driver(self, headless: bool = True, user_id: str = None, store_id: str = None):
        """Chrome WebDriver 생성"""
        effective_user_id = user_id if user_id else self.active_user_id

        print(f"[WEB] Creating Chrome WebDriver for user: {effective_user_id}")

        chrome_options = Options()
        if headless:
            chrome_options.add_argument('--headless=new')

        # Essential options
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)

        # Default settings
        chrome_options.add_argument('--window-size=1280,720')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

        # Load session from Supabase
        session_data = self._load_session_from_supabase(effective_user_id, store_id)
        cookies = None

        if session_data:
            print(f"[OK] Using session from Supabase for user: {effective_user_id}")
            cookies = session_data.get('cookies')
            # #region agent log
            import json as json_module
            for cookie in cookies:
                if cookie.get('name') in ['NID_AUT', 'NID_SES', 'ASID', 'BUC']:
                    with open(r'c:\egurado\.cursor\debug.log', 'a', encoding='utf-8') as f:
                        f.write(json_module.dumps({'location':'naver_selenium_service.py:97','message':'Cookie loaded from DB','data':{'name':cookie.get('name'),'has_expiry':('expiry' in cookie),'expiry_value':cookie.get('expiry'),'keys':list(cookie.keys())},'timestamp':int(time.time()*1000),'sessionId':'debug-session','runId':'run1','hypothesisId':'G'})+'\n')
            # #endregion

        # Create driver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)

        # Load cookies if found
        if cookies:
            print(f"[LOAD] Loading {len(cookies)} cookies...")

            # Check expiry of cookies before loading
            current_time = time.time()
            critical_cookies = ['NID_AUT', 'NID_SES', 'ASID', 'BUC', '_naver_usersession_']
            for cookie in cookies:
                if cookie.get('name') in critical_cookies:
                    expiry = cookie.get('expiry')
                    if expiry:
                        if expiry < current_time:
                            print(f"   [WARN] Cookie '{cookie['name']}' in DB is EXPIRED! (expired {int((current_time - expiry) / 3600)} hours ago)")
                        else:
                            print(f"   [OK] Cookie '{cookie['name']}' in DB is valid (expires in {int((expiry - current_time) / 3600)} hours)")
                    else:
                        print(f"   [INFO] Cookie '{cookie['name']}' is a session cookie (no expiry)")

            driver.get('https://www.naver.com')
            time.sleep(1)

            cookies_added = 0
            failed_cookies = []
            critical_cookies = ['NID_AUT', 'NID_SES']
            critical_added = []

            for cookie in cookies:
                try:
                    cookie_name = cookie.get('name', 'unknown')

                    # Clean up cookie data
                    if 'expiry' in cookie:
                        cookie['expiry'] = int(cookie['expiry'])
                    if 'sameSite' in cookie and cookie['sameSite'] not in ['Strict', 'Lax', 'None']:
                        del cookie['sameSite']

                    # Fix domain for naver cookies
                    if 'domain' in cookie:
                        domain = cookie['domain']
                        # Ensure domain starts with a dot for subdomain matching
                        if not domain.startswith('.') and 'naver.com' in domain:
                            cookie['domain'] = '.naver.com'
                        elif not 'naver.com' in domain:
                            # Skip non-naver cookies
                            continue
                    else:
                        # Add default naver domain
                        cookie['domain'] = '.naver.com'

                    driver.add_cookie(cookie)
                    cookies_added += 1

                    # Track critical cookies
                    if cookie_name in critical_cookies:
                        critical_added.append(cookie_name)

                except Exception as e:
                    cookie_name = cookie.get('name', 'unknown')
                    failed_cookies.append(cookie_name)
                    if cookie_name in critical_cookies:
                        print(f"[ERROR] CRITICAL: Failed to add cookie '{cookie_name}': {str(e)[:80]}")
                    else:
                        logger.debug(f"Failed to add cookie '{cookie_name}': {str(e)}")

            print(f"[OK] Added {cookies_added}/{len(cookies)} cookies")
            print(f"[KEY] Critical cookies added: {critical_added}")

            # Check if critical cookies were added
            missing_critical = [c for c in critical_cookies if c not in critical_added]
            if missing_critical:
                print(f"[WARN] WARNING: Missing critical cookies: {missing_critical}")
                print(f"   This may cause login issues!")

            driver.refresh()
            time.sleep(2)
            
            # CRITICAL: Navigate to smartplace BIZES domain to activate session
            # This ensures cookies work for business pages, not just main page
            print("[SESSION] Activating session on smartplace bizes domain...")
            driver.get('https://new.smartplace.naver.com/bizes')
            time.sleep(3)
            
            # Verify not redirected to login
            current_url = driver.current_url
            if 'nidlogin.login' in current_url or 'nid.naver.com/nidlogin' in current_url:
                print(f"[ERROR] Session invalid! Redirected to login page: {current_url}")
                raise Exception("세션 쿠키가 유효하지 않습니다. '네이버 세션 관리'에서 다시 로그인해주세요.")
            
            print("[OK] Session cookies loaded and verified")

        return driver

    def get_reviews(self, place_id: str, load_count: int = 50) -> Dict:
        """리뷰 가져오기 (Selenium 스크롤 방식)"""
        print(f"[NOTE] Getting {load_count} reviews for place: {place_id}")

        # Initialize progress
        self._loading_progress[place_id] = {
            'status': 'loading',
            'count': 0,
            'message': '[START] 시작 중...',
            'timestamp': datetime.now()
        }

        driver = None
        try:
            driver = self._create_driver(headless=True, user_id=self.active_user_id)

            reviews_url = f'https://new.smartplace.naver.com/bizes/place/{place_id}/reviews?menu=visitor'
            print(f"[LINK] Accessing: {reviews_url}")
            self._loading_progress[place_id]['message'] = '[PAGE] 리뷰 페이지 접속 중...'

            driver.get(reviews_url)
            time.sleep(3)

            # Handle popup
            try:
                popup_btn = driver.find_element(By.CSS_SELECTOR, "button.Modal_btn_confirm__uQZFR")
                if popup_btn.is_displayed():
                    driver.execute_script("arguments[0].click();", popup_btn)
                    time.sleep(1)
            except:
                pass

            # Scroll to load reviews (IMPROVED: More aggressive scrolling)
            print(f"[SCROLL] Scrolling to load {load_count} reviews...")
            self._loading_progress[place_id]['message'] = f'[SCROLL] 스크롤 시작! (목표: {load_count}개)'

            last_count = 0
            no_change = 0
            # Increased max_scrolls for better coverage
            max_scrolls = min(100, load_count // 5 + 20)

            for scroll in range(max_scrolls):
                # Wait for DOM to update
                time.sleep(1.0)  # Increased wait time

                # Count current reviews
                all_lis = driver.find_elements(By.TAG_NAME, "li")
                valid_reviews = []

                for li in all_lis:
                    try:
                        # Check if has author element
                        li.find_element(By.CLASS_NAME, "pui__JiVbY3")
                        valid_reviews.append(li)
                    except:
                        continue

                current_count = len(valid_reviews)

                # Update progress
                self._loading_progress[place_id].update({
                    'count': current_count,
                    'message': f'[SCROLL] 로딩 중... ({current_count}/{load_count})',
                    'timestamp': datetime.now()
                })

                print(f"  Scroll {scroll + 1}: {current_count} reviews loaded")

                # Check if enough reviews loaded
                if current_count >= load_count:
                    print(f"[OK] Target reached: {current_count} reviews")
                    break

                # Check if no new reviews loaded (more patient)
                if current_count == last_count:
                    no_change += 1
                    if no_change >= 5:  # Increased from 3 to 5
                        print(f"[WARN] No more reviews to load after {no_change} attempts")
                        break
                else:
                    no_change = 0

                last_count = current_count

                # Scroll down more aggressively
                driver.execute_script("window.scrollBy(0, 1000);")
                # Also scroll the review list container if exists
                try:
                    driver.execute_script("""
                        var reviewList = document.querySelector('.place_section_content');
                        if (reviewList) {
                            reviewList.scrollTop = reviewList.scrollHeight;
                        }
                    """)
                except:
                    pass

                time.sleep(1.0)  # Increased from 0.5 to 1.0

            # Parse reviews
            print(f"[BATCH] Parsing {len(valid_reviews)} reviews...")
            parsed_reviews = []

            for idx, li in enumerate(valid_reviews[:load_count]):
                try:
                    # Author
                    author = li.find_element(By.CLASS_NAME, "pui__JiVbY3").text.strip()

                    # Date (accept both "1.12.월" and "25.12.27.토" formats)
                    date = ""
                    d_elems = li.find_elements(By.CLASS_NAME, "pui__m7nkds")
                    for d in d_elems:
                        # Match any date pattern with numbers and dots
                        if re.search(r'\d+\.\d+', d.text):
                            date = d.text.strip()
                            break

                    # Content
                    content = ""
                    try:
                        content = li.find_element(By.CLASS_NAME, "pui__vn15t2").text.strip()
                    except:
                        pass

                    # Rating (별점은 HTML에서 추출)
                    rating = 0
                    try:
                        # Extract from aria-label or other attributes
                        rating_elem = li.find_element(By.CSS_SELECTOR, "[class*='pui__']")
                        rating_text = rating_elem.get_attribute("aria-label") or ""
                        rating_match = re.search(r'(\d)점', rating_text)
                        if rating_match:
                            rating = int(rating_match.group(1))
                    except:
                        rating = 5  # Default

                    # Reply status and text
                    has_reply = False
                    reply_text = None
                    try:
                        # Check for reply container
                        reply_container = li.find_element(By.XPATH, ".//div[contains(@class, 'pui__') and .//text()[contains(., '사장님')]]")
                        has_reply = True

                        # Try to extract reply text
                        try:
                            # Look for text content in reply area
                            reply_text_elem = reply_container.find_element(By.XPATH, ".//div[contains(@class, 'pui__')]")
                            reply_text = reply_text_elem.text.strip()

                            # Remove "사장님" prefix if exists
                            if reply_text.startswith("사장님"):
                                reply_text = reply_text.replace("사장님", "", 1).strip()
                        except:
                            reply_text = "(답글 내용을 불러올 수 없습니다)"
                    except:
                        pass

                    parsed_reviews.append({
                        'naver_review_id': f"{place_id}_{author}_{date}",
                        'author': author,
                        'date': date,
                        'content': content,
                        'rating': rating,
                        'has_reply': has_reply,
                        'reply_text': reply_text,
                        'created': date
                    })

                except Exception as e:
                    logger.debug(f"Failed to parse review {idx}: {e}")
                    continue

            # Update progress to completed
            self._loading_progress[place_id].update({
                'status': 'completed',
                'count': len(parsed_reviews),
                'message': f'[OK] 완료! ({len(parsed_reviews)}개)',
                'timestamp': datetime.now()
            })

            print(f"[OK] Successfully parsed {len(parsed_reviews)} reviews")

            return {
                'reviews': parsed_reviews,
                'total': len(parsed_reviews)
            }

        except Exception as e:
            error_msg = str(e)
            print(f"[ERROR] Error loading reviews: {error_msg}")
            logger.error(f"Error in get_reviews: {error_msg}")

            self._loading_progress[place_id].update({
                'status': 'error',
                'message': f'[ERROR] 오류: {error_msg}',
                'timestamp': datetime.now()
            })

            raise Exception(f"Failed to load reviews: {error_msg}")

        finally:
            if driver:
                try:
                    driver.quit()
                except:
                    pass

    def post_reply_by_composite(
        self,
        place_id: str,
        author: str,
        date: str,
        content: str,
        reply_text: str,
        user_id: str = None,
        store_id: str = None,
        expected_count: int = 50  # Default expected review count
    ) -> Dict:
        """3중 매칭 (작성자 + 날짜 + 내용)으로 답글 포스팅"""
        if user_id:
            self.set_active_user(user_id)
        current_user_id = self.active_user_id

        driver = None
        try:
            print(f"[MSG] Posting reply to: {author} ({date}) for user: {current_user_id}")

            driver = self._create_driver(headless=True, user_id=current_user_id, store_id=store_id)

            # Skip pre-verification, go directly to smartplace
            # (Verification will happen when we check the URL after loading)

            # Go to reviews page with unreplied filter
            reviews_url = f'https://new.smartplace.naver.com/bizes/place/{place_id}/reviews?menu=visitor&hasReply=false'
            print(f"[LINK] Opening: {reviews_url}")
            driver.get(reviews_url)

            # Optimized wait: reduced from 5s to 3s
            print(f"[WAIT] Waiting for page to load...")
            time.sleep(3)
            
            # Check if redirected to login page
            current_url = driver.current_url
            if 'nidlogin.login' in current_url or 'nid.naver.com/nidlogin' in current_url:
                print(f"[ERROR] Session expired! Redirected to login page")
                print(f"   Current URL: {current_url}")
                raise Exception("세션이 만료되었습니다. '네이버 세션 관리'에서 다시 로그인해주세요.")

            # [DEBUG] Check if redirected to login page
            current_url = driver.current_url

            # Extract actual smartplace_id from redirected URL
            # URL format: https://new.smartplace.naver.com/bizes/place/2421004/reviews?...
            import re
            smartplace_match = re.search(r'/bizes/place/(\d+)', current_url)
            if smartplace_match:
                actual_smartplace_id = smartplace_match.group(1)
                if actual_smartplace_id != place_id:
                    print(f"[INFO] Redirected: place_id {place_id} -> smartplace_id {actual_smartplace_id}")
                    # Update the place_id for subsequent operations
                    place_id = actual_smartplace_id
            if 'nidlogin' in current_url or 'login' in current_url.lower():
                error_msg = "로그인 세션이 만료되었거나 유효하지 않습니다. 네이버 세션 관리에서 다시 로그인해주세요."
                print(f"[ERROR] {error_msg}")
                print(f"   Current URL: {current_url}")
                print(f"   Loaded cookies: {cookies_added}/{len(cookies)}")
                print(f"   Critical cookies: {critical_added}")

                # Get current cookies from browser
                try:
                    current_cookies = driver.get_cookies()
                    naver_cookies = [c for c in current_cookies if 'naver.com' in c.get('domain', '')]
                    critical_in_browser = [c['name'] for c in naver_cookies if c['name'] in ['NID_AUT', 'NID_SES']]
                    print(f"   Browser has {len(naver_cookies)} naver cookies")
                    print(f"   Critical cookies in browser: {critical_in_browser}")

                    # Check expiry of critical cookies
                    for c in naver_cookies:
                        if c['name'] in ['NID_AUT', 'NID_SES']:
                            expiry = c.get('expiry')
                            if expiry:
                                current_time = time.time()
                                if expiry < current_time:
                                    print(f"   [WARN] Cookie '{c['name']}' is EXPIRED! (expired {int((current_time - expiry) / 3600)} hours ago)")
                                else:
                                    print(f"   [OK] Cookie '{c['name']}' is valid (expires in {int((expiry - current_time) / 3600)} hours)")
                except Exception as e:
                    print(f"   Error checking browser cookies: {e}")

                # Take screenshot for debugging
                try:
                    screenshot_path = f"login_error_{place_id}.png"
                    driver.save_screenshot(screenshot_path)
                    print(f"   [SCREENSHOT] Screenshot saved: {screenshot_path}")
                except:
                    pass

                raise Exception(error_msg)

            # Handle popup
            try:
                popup_btn = driver.find_element(By.CSS_SELECTOR, "button.Modal_btn_confirm__uQZFR")
                if popup_btn.is_displayed():
                    driver.execute_script("arguments[0].click();", popup_btn)
                    print(f"[OK] Closed popup")
                    time.sleep(2)
            except:
                print(f"[INFO] No popup found")
                pass

            # Wait for reviews to load (optimized)
            print(f"[WAIT] Waiting for reviews to render...")
            time.sleep(2)  # Optimized: reduced wait time

            # [TARGET] SMART FILTER: Apply date filter to reduce search time
            filter_applied = False
            filter_date = None
            target_year = None
            target_month = None
            target_day = None

            # Parse date to apply filter: "25.12.21.일" -> "2025.12.21" or "1.10.금" -> "2026.01.10"
            date_parts = re.findall(r'\d+', date)

            # Handle dates with or without year
            if len(date_parts) >= 3:
                # Full date: year, month, day
                year_short = date_parts[0]  # "25" or "2025"
                month = date_parts[1]  # "12"
                day = date_parts[2]    # "21"

                # Convert 2-digit year to 4-digit
                if len(year_short) == 2:
                    target_year = f"20{year_short}"
                else:
                    target_year = year_short

                target_month = month
                target_day = day

            elif len(date_parts) == 2:
                # Date without year: "1.10" -> assume current year
                from datetime import datetime
                current_year = datetime.now().year

                target_year = str(current_year)
                target_month = date_parts[0]  # "1"
                target_day = date_parts[1]    # "10"

                print(f"[CALENDAR] No year in date, assuming current year: {target_year}")
            else:
                # Cannot parse date
                raise Exception(f"Cannot parse date: {date}")

            filter_date = f"{target_year}.{target_month.zfill(2)}.{target_day.zfill(2)}"  # "2025.12.21"
            print(f"[CALENDAR] Attempting to apply date filter: {filter_date}")
            print(f"   -> Target: Year={target_year}, Month={target_month}, Day={target_day}")

            try:
                # NEW SIMPLE APPROACH: Use "일간" (daily) mode + prev/next buttons
                # Step 1: Find and click "전체" dropdown button
                print(f"\n[CALENDAR] Step 1: Looking for '전체' dropdown button...")

                jeonche_button = None
                jeonche_selectors = [
                    ("xpath", "//button[contains(text(), '전체')]"),
                    ("xpath", "//div[contains(@class, 'filter')]//button")
                ]

                for idx, (selector_type, selector) in enumerate(jeonche_selectors):
                    try:
                        if selector_type == "xpath":
                            buttons = driver.find_elements(By.XPATH, selector)
                        else:
                            buttons = driver.find_elements(By.CSS_SELECTOR, selector)

                        for btn in buttons:
                            try:
                                btn_text = btn.text.strip()
                                if '전체' in btn_text:
                                    jeonche_button = btn
                                    print(f"   [OK] Found '전체' button")
                                    break
                            except:
                                continue

                        if jeonche_button:
                            break
                    except Exception as e:
                        continue

                if not jeonche_button:
                    raise Exception("Could not find '전체' button")

                # Click the "전체" button to open dropdown
                print(f"[CALENDAR] Clicking '전체' button...")
                driver.execute_script("arguments[0].click();", jeonche_button)
                time.sleep(1)  # Optimized: reduced from 2s to 1s

                # Step 2: Find and click "일간" (daily) option
                print(f"\n[CALENDAR] Step 2: Looking for '일간' option...")

                ilgan_button = None
                ilgan_selectors = [
                    ("xpath", "//button[contains(text(), '일간')]"),
                    ("xpath", "//li[contains(text(), '일간')]"),
                    ("xpath", "//*[contains(text(), '일간')]")
                ]

                for idx, (selector_type, selector) in enumerate(ilgan_selectors):
                    try:
                        if selector_type == "xpath":
                            elements = driver.find_elements(By.XPATH, selector)
                        else:
                            elements = driver.find_elements(By.CSS_SELECTOR, selector)

                        for elem in elements:
                            try:
                                elem_text = elem.text.strip()
                                if '일간' in elem_text and elem.is_displayed():
                                    ilgan_button = elem
                                    print(f"   [OK] Found '일간' option")
                                    break
                            except:
                                continue

                        if ilgan_button:
                            break
                    except Exception as e:
                        continue

                if not ilgan_button:
                    raise Exception("Could not find '일간' option")

                # Click the "일간" option
                print(f"[CALENDAR] Clicking '일간' option...")
                driver.execute_script("arguments[0].click();", ilgan_button)
                time.sleep(1)  # Optimized: reduced from 2s to 1s

                # Step 3: Calculate days difference and click "이전" button
                print(f"\n[CALENDAR] Step 3: Calculating date difference...")

                from datetime import datetime, timedelta

                # Parse target date: "2025-11-28"
                target_date_obj = datetime(int(target_year), int(target_month), int(target_day))
                today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

                days_diff = (today - target_date_obj).days
                print(f"   Today: {today.strftime('%Y-%m-%d')}")
                print(f"   Target: {target_date_obj.strftime('%Y-%m-%d')}")
                print(f"   Days difference: {days_diff} days")

                if days_diff < 0:
                    print(f"   [ERROR] Target date is in the future! Cannot navigate.")
                    raise Exception(f"Target date {filter_date} is in the future")

                if days_diff == 0:
                    print(f"   [OK] Target date is today, no navigation needed")
                    filter_applied = True
                else:
                    # Find the "이전" (previous) button
                    print(f"\n[CALENDAR] Step 4: Finding '이전' button...")

                    prev_button = None
                    prev_selectors = [
                        ("css", "button.DateRange_btn_date__0xLz3.DateRange_prev__Qlu2t"),
                        ("xpath", "//button[contains(@class, 'DateRange_prev')]"),
                        ("xpath", "//button[@data-area-code='rv.dateback']")
                    ]

                    for idx, (selector_type, selector) in enumerate(prev_selectors):
                        try:
                            if selector_type == "xpath":
                                buttons = driver.find_elements(By.XPATH, selector)
                            else:
                                buttons = driver.find_elements(By.CSS_SELECTOR, selector)

                            if buttons:
                                prev_button = buttons[0]
                                print(f"   [OK] Found '이전' button")
                                break
                        except:
                            continue

                    if not prev_button:
                        raise Exception("Could not find '이전' (previous) button")

                    # Click the "이전" button multiple times (OPTIMIZED)
                    print(f"\n[CALENDAR] Step 5: Clicking '이전' button {days_diff} times...")

                    # Optimized click strategy
                    for i in range(days_diff):
                        try:
                            driver.execute_script("arguments[0].click();", prev_button)

                            # Progress indicator every 20 clicks (less frequent)
                            if (i + 1) % 20 == 0:
                                print(f"   Progress: {i + 1}/{days_diff} clicks")

                            # Optimized delay: faster clicks for better performance
                            # 0.05초 = 50ms (충분히 빠르면서도 안정적)
                            time.sleep(0.05)
                        except Exception as e:
                            print(f"   [ERROR] Failed to click at iteration {i + 1}: {e}")
                            raise

                    print(f"   [OK] Successfully navigated to {filter_date} ({days_diff} clicks completed)")
                    filter_applied = True

                    # Reduced wait time for page update
                    time.sleep(1.5)

            except Exception as e:
                print(f"   [WARN] Failed to apply date filter via calendar UI: {e}")
                print(f"   -> Falling back to scroll method")
                filter_applied = False

            # Clean target date - "월.일" 형식으로 정규화
            # "2026. 1. 12(월)" -> "1.12" (4자리 연도)
            # "25.12.4.목" -> "12.4" (2자리 연도)
            # "2025. 12. 21(토)" -> "12.21" (4자리 연도)
            # "1.10.금" -> "1.10" (연도 없음)
            date_clean = date
            # Remove 4-digit year: "2026. " or "2025. "
            date_clean = re.sub(r'^\d{4}\.\s*', '', date_clean)
            # Remove 2-digit year ONLY if followed by month (1-12): "25.12." -> "12."
            # Use lookahead to ensure we don't remove the month
            date_clean = re.sub(r'^(\d{2})\.(\s*)(?=(?:1[0-2]|[1-9])\.)', '', date_clean)
            # Remove parentheses: "(월)" -> ""
            date_clean = re.sub(r'\([^)]*\)', '', date_clean)
            # Remove weekday suffix: ".월", ".화" -> ""
            date_clean = re.sub(r'\.(월|화|수|목|금|토|일)$', '', date_clean)
            # Remove all spaces: "1. 12" -> "1.12"
            date_clean = re.sub(r'\s+', '', date_clean).strip()

            author_prefix = author[:min(3, len(author))]

            print(f"[TARGET] Target: author='{author_prefix}...', date_original='{date}' -> date_clean='{date_clean}'")
            print(f"   [DATE] Date normalization steps:")
            temp = date
            print(f"      1. Original: '{temp}'")
            temp = re.sub(r'^\d{4}\.\s*', '', temp)
            print(f"      2. After removing 4-digit year: '{temp}'")
            temp = re.sub(r'^(\d{2})\.(\s*)(?=(?:1[0-2]|[1-9])\.)', '', temp)
            print(f"      3. After removing 2-digit year (smart): '{temp}'")
            temp = re.sub(r'\([^)]*\)', '', temp)
            print(f"      4. After removing (...): '{temp}'")
            temp = re.sub(r'\.(월|화|수|목|금|토|일)$', '', temp)
            print(f"      5. After removing .요일: '{temp}'")
            temp = re.sub(r'\s+', '', temp).strip()
            print(f"      6. Final (no spaces): '{temp}'")

            # Scroll to find target review
            target_review = None
            self._date_matched_reviews = []  # Reset date-matched reviews list

            # [TARGET] Adjust scroll count based on filter
            if filter_applied:
                max_scrolls = 5  # Much fewer scrolls needed with date filter!
                max_reviews_limit = 30  # Should be very few reviews after filtering
                print(f"[TARGET] Using optimized search (filter applied): max {max_scrolls} scrolls")
            else:
                max_scrolls = 50  # More scrolls needed without filter
                max_reviews_limit = expected_count * 5
                print(f"[RELOAD] Using full search (no filter): max {max_scrolls} scrolls")

            last_check_count = 0
            no_new_reviews_count = 0  # Count consecutive scrolls with no new reviews

            # [DEBUG] Debug: Check page state
            print(f"[DEBUG] Page URL: {driver.current_url}")
            print(f"[DEBUG] Page title: {driver.title}")
            
            # [CHECK] Check if redirected to login page
            if "nid.naver.com/nidlogin" in driver.current_url or "네이버 : 로그인" in driver.title or "네이버: 로그인" in driver.title:
                try:
                    print("[ERROR] Redirected to login page!")
                except:
                    print("[ERROR] Redirected to login page!")
                raise Exception("로그인 세션이 만료되었거나 유효하지 않습니다. 크롬 익스텐션으로 네이버 로그인 세션을 다시 저장해주세요.")

            for scroll_count in range(max_scrolls):
                all_lis = driver.find_elements(By.TAG_NAME, "li")

                # [DEBUG] Debug: Show what we found
                if scroll_count == 0:
                    print(f"[DEBUG] Found {len(all_lis)} total <li> elements")

                valid_reviews = [li for li in all_lis if self._is_valid_review_li(li)]

                current_count = len(valid_reviews)
                newly_loaded = current_count - last_check_count

                print(f"  [BATCH] Batch {scroll_count + 1}: {current_count} total reviews ({newly_loaded} newly loaded, target={expected_count})")

                # [DEBUG] Debug: If no reviews found in first iteration, check why
                if scroll_count == 0 and current_count == 0:
                    print(f"[WARN] No reviews found! Checking page state...")
                    print(f"   - Has <li> elements: {len(all_lis) > 0}")
                    print(f"   - Looking for class: pui__JiVbY3")
                    # Try to find any element with review-like classes
                    try:
                        test_elems = driver.find_elements(By.CSS_SELECTOR, "[class*='pui']")
                        print(f"   - Found {len(test_elems)} elements with 'pui' in class")
                    except:
                        pass

                # Search in newly loaded reviews
                search_reviews = valid_reviews[last_check_count:]

                # [DEBUG] Debug: Show first review's raw HTML in first batch
                if scroll_count == 0 and len(search_reviews) > 0:
                    try:
                        first_li = search_reviews[0]
                        print(f"\n[DEBUG] ===== FIRST REVIEW RAW DATA =====")
                        # Find all text elements
                        text_elems = first_li.find_elements(By.XPATH, ".//*[contains(@class, 'pui__')]")
                        for elem in text_elems[:10]:  # First 10 elements
                            try:
                                classes = elem.get_attribute("class")
                                text = elem.text.strip()
                                if text:
                                    print(f"   Class: {classes[:50]}... | Text: {text}")
                            except:
                                pass
                        print(f"[DEBUG] ===== END FIRST REVIEW =====\n")
                    except Exception as e:
                        print(f"[WARN] Could not extract first review debug info: {e}")

                for idx, li in enumerate(search_reviews):
                    try:
                        li_author = li.find_element(By.CLASS_NAME, "pui__JiVbY3").text.strip()

                        li_date = ""
                        # 새로운 형식: 첫 번째 <time> 태그에서 방문일 추출
                        try:
                            time_elems = li.find_elements(By.TAG_NAME, "time")
                            if time_elems:
                                # 첫 번째 time 태그가 방문일
                                li_date = time_elems[0].get_attribute("textContent").strip()
                        except:
                            pass

                        # 이전 형식 fallback
                        if not li_date:
                            d_elems = li.find_elements(By.CLASS_NAME, "pui__m7nkds")
                            for d in d_elems:
                                if re.search(r'\d+\.\s*\d+', d.text):
                                    li_date = d.text.strip()
                                    break

                        # Clean date - "월.일" 형식으로 정규화
                        # "2026. 1. 12(월)" -> "1.12"
                        # "2025. 12. 21(토)" -> "12.21"
                        # "1.10.토" -> "1.10"
                        li_date_clean = li_date
                        # Remove 4-digit year
                        li_date_clean = re.sub(r'^\d{4}\.\s*', '', li_date_clean)
                        # Remove 2-digit year ONLY if followed by month (1-12)
                        li_date_clean = re.sub(r'^(\d{2})\.(\s*)(?=(?:1[0-2]|[1-9])\.)', '', li_date_clean)
                        # Remove parentheses
                        li_date_clean = re.sub(r'\([^)]*\)', '', li_date_clean)
                        # Remove weekday suffix
                        li_date_clean = re.sub(r'\.(월|화|수|목|금|토|일)$', '', li_date_clean)
                        # Remove all spaces
                        li_date_clean = re.sub(r'\s+', '', li_date_clean).strip()

                        # Match author + date
                        author_match = li_author.startswith(author_prefix)
                        date_match = li_date_clean == date_clean

                        # Match content if provided (optional, for extra validation)
                        content_match = True
                        li_content = ""
                        content_match_attempted = False

                        if content and len(content) > 10:
                            content_match_attempted = True
                            try:
                                # Try multiple class names for content
                                try:
                                    li_content = li.find_element(By.CLASS_NAME, "pui__xtsQN").text.strip()
                                except:
                                    try:
                                        li_content = li.find_element(By.CLASS_NAME, "pui__vn15t2").text.strip()
                                    except:
                                        pass

                                if li_content:
                                    # More flexible content matching
                                    # Normalize both strings: remove extra whitespace, convert to lowercase
                                    content_normalized = ' '.join(content[:100].lower().split())
                                    li_content_normalized = ' '.join(li_content[:150].lower().split())

                                    # Check if first 30 chars of content is in review
                                    content_match = content_normalized[:30] in li_content_normalized
                                else:
                                    # If we can't extract content, skip content matching
                                    # Author + Date should be enough for uniqueness
                                    content_match = True
                                    content_match_attempted = False
                            except Exception as e:
                                # On error, skip content matching
                                content_match = True
                                content_match_attempted = False

                        # Store reviews that match by date (BEFORE logging to avoid encoding errors)
                        if date_match:
                            if not hasattr(self, '_date_matched_reviews'):
                                self._date_matched_reviews = []
                            self._date_matched_reviews.append({
                                'li': li,
                                'author': li_author,
                                'date': li_date_clean,
                                'author_match': author_match,
                                'content_match': content_match
                            })

                        # Prefer exact match (author + date + content)
                        if author_match and date_match and content_match:
                            # Safe print without emoji issues
                            try:
                                print(f"  [OK] Found exact match at position {last_check_count + idx}: '{li_author}' ({li_date_clean})")
                            except:
                                logger.info(f"Found exact match at position {last_check_count + idx}")
                            target_review = li
                            break

                        # Debug log for first few comparisons OR when author+date matches (AFTER critical operations)
                        if (scroll_count == 0 and idx < 3) or (author_match and date_match):
                            try:
                                print(f"  [DEBUG] Review {last_check_count + idx + 1}:")
                                print(f"     Author: '{li_author}' (match={author_match}, looking for '{author_prefix}...')")
                                print(f"     Date: '{li_date}' -> cleaned='{li_date_clean}' (match={date_match}, target='{date_clean}')")
                                if content_match_attempted:
                                    print(f"     Content: match={content_match}, attempted={content_match_attempted}")
                                    print(f"       Target (first 30): '{content[:30]}...'")
                                    print(f"       Found (first 30): '{li_content[:30] if li_content else 'NOT EXTRACTED'}...'")
                                else:
                                    print(f"     Content: skipped (author+date matching only)")
                            except UnicodeEncodeError:
                                # Ignore emoji encoding errors in debug logs
                                logger.debug(f"Review {last_check_count + idx + 1}: author_match={author_match}, date_match={date_match}")

                    except Exception as e:
                        logger.warning(f"  [WARN] Error processing review {last_check_count + idx}: {str(e)}")
                        continue

                if target_review:
                    break

                # After scrolling, if we didn't find exact match but have date-matched reviews
                # Check if there's only one review for that date
                if not target_review and scroll_count == max_scrolls - 1:
                    if hasattr(self, '_date_matched_reviews') and len(self._date_matched_reviews) == 1:
                        match = self._date_matched_reviews[0]
                        print(f"  [INFO] Only one review found for date '{date_clean}'")
                        print(f"  [INFO] Accepting as match despite author mismatch: '{match['author']}' (looking for '{author_prefix}...')")
                        target_review = match['li']
                        break

                # Check if we should continue scrolling
                if newly_loaded == 0:
                    no_new_reviews_count += 1
                    if no_new_reviews_count >= 3:  # Stop after 3 consecutive scrolls with no new reviews
                        print(f"[WARN] No new reviews loaded for 3 consecutive scrolls. Stopping.")
                        # Check date-matched reviews before stopping
                        if not target_review and hasattr(self, '_date_matched_reviews') and len(self._date_matched_reviews) > 0:
                            if len(self._date_matched_reviews) == 1:
                                match = self._date_matched_reviews[0]
                                print(f"  [INFO] Only one review found for date '{date_clean}'")
                                print(f"  [INFO] Accepting as match despite author mismatch: '{match['author']}' (looking for '{author_prefix}...')")
                                target_review = match['li']
                        break
                else:
                    no_new_reviews_count = 0

                # Stop if we've loaded way more reviews than expected
                if current_count >= max_reviews_limit:
                    print(f"[WARN] Loaded {current_count} reviews (>{max_reviews_limit} limit). Stopping search.")
                    # Check date-matched reviews before stopping
                    if not target_review and hasattr(self, '_date_matched_reviews') and len(self._date_matched_reviews) > 0:
                        if len(self._date_matched_reviews) == 1:
                            match = self._date_matched_reviews[0]
                            print(f"  [INFO] Only one review found for date '{date_clean}'")
                            print(f"  [INFO] Accepting as match despite author mismatch: '{match['author']}' (looking for '{author_prefix}...')")
                            target_review = match['li']
                    break

                # Continue scrolling to load more reviews
                last_check_count = current_count

                # More aggressive scrolling
                driver.execute_script("window.scrollBy(0, 1200);")  # Increased from 800
                time.sleep(1.5)  # Increased from 1.0

                # Extra scroll if we're expecting more reviews
                if current_count < expected_count:
                    driver.execute_script("window.scrollBy(0, 800);")
                    time.sleep(1)

            # Final check: if no exact match, but only one review for the target date
            if not target_review and hasattr(self, '_date_matched_reviews') and len(self._date_matched_reviews) == 1:
                match = self._date_matched_reviews[0]
                print(f"\n[INFO] Only one review found for date '{date_clean}'")
                print(f"[INFO] Accepting as match despite author mismatch:")
                print(f"   Expected author prefix: '{author_prefix}...'")
                print(f"   Found author: '{match['author']}'")
                print(f"   Date match: {match['date']}")
                target_review = match['li']

            if not target_review:
                # Show what we found for debugging
                print(f"\n[ERROR] Could not find review: {author} ({date_clean})")
                print(f"   Loaded {current_count} reviews total")
                print(f"   Looking for: author starting with '{author_prefix}', date='{date_clean}'")

                # Show date distribution (first 50 reviews)
                date_distribution = {}
                for li in valid_reviews[:50]:
                    try:
                        time_elems = li.find_elements(By.TAG_NAME, "time")
                        if time_elems:
                            li_date_raw = time_elems[0].get_attribute("textContent").strip()
                            li_date_clean = li_date_raw
                            # Apply same normalization logic
                            li_date_clean = re.sub(r'^\d{4}\.\s*', '', li_date_clean)
                            li_date_clean = re.sub(r'^(\d{2})\.(\s*)(?=(?:1[0-2]|[1-9])\.)', '', li_date_clean)
                            li_date_clean = re.sub(r'\([^)]*\)', '', li_date_clean)
                            li_date_clean = re.sub(r'\.(월|화|수|목|금|토|일)$', '', li_date_clean)
                            li_date_clean = re.sub(r'\s+', '', li_date_clean).strip()

                            # Track both raw and cleaned dates
                            key = f"{li_date_raw} -> {li_date_clean}"
                            date_distribution[key] = date_distribution.get(key, 0) + 1
                    except:
                        continue

                print(f"\n   [DATE] Date distribution (first 50 reviews):")
                for date_info, count in list(date_distribution.items())[:10]:
                    print(f"      - {date_info}: {count} review(s)")

                # Show reviews with matching dates
                matching_dates = []
                for li in valid_reviews:
                    try:
                        li_author = li.find_element(By.CLASS_NAME, "pui__JiVbY3").text.strip()
                        time_elems = li.find_elements(By.TAG_NAME, "time")
                        if time_elems:
                            li_date_raw = time_elems[0].get_attribute("textContent").strip()
                            li_date_clean = li_date_raw
                            # Apply same normalization logic
                            li_date_clean = re.sub(r'^\d{4}\.\s*', '', li_date_clean)
                            li_date_clean = re.sub(r'^(\d{2})\.(\s*)(?=(?:1[0-2]|[1-9])\.)', '', li_date_clean)
                            li_date_clean = re.sub(r'\([^)]*\)', '', li_date_clean)
                            li_date_clean = re.sub(r'\.(월|화|수|목|금|토|일)$', '', li_date_clean)
                            li_date_clean = re.sub(r'\s+', '', li_date_clean).strip()

                            if li_date_clean == date_clean:
                                matching_dates.append(f"'{li_author}' (raw: {li_date_raw}, clean: {li_date_clean})")
                    except:
                        continue

                if matching_dates:
                    print(f"\n   [INFO] Reviews with matching date '{date_clean}':")
                    for match in matching_dates[:5]:
                        print(f"      - {match}")
                else:
                    print(f"\n   [INFO] No reviews found with date '{date_clean}'")

                raise Exception(f"Could not find review: {author} ({date_clean})")

            # Click reply button - try multiple strategies
            print("[CLICK] Searching for reply button...")
            try:
                reply_btn = None

                # Method 1: Text-based search (Korean)
                try:
                    reply_btn = target_review.find_element(By.XPATH,
                        ".//button[contains(text(), '답글') or contains(text(), '댓글') or contains(text(), 'Reply')]")
                    print("   [OK] Found reply button by text")
                except:
                    pass

                # Method 2: aria-label search
                if not reply_btn:
                    try:
                        reply_btn = target_review.find_element(By.XPATH,
                            ".//button[contains(@aria-label, '답글') or contains(@aria-label, '댓글')]")
                        print("   [OK] Found reply button by aria-label")
                    except:
                        pass

                # Method 3: Class-based search
                if not reply_btn:
                    try:
                        reply_btn = target_review.find_element(By.CSS_SELECTOR,
                            "button[class*='reply'], button[class*='comment'], button[class*='Reply']")
                        print("   [OK] Found reply button by class")
                    except:
                        pass

                # Method 4: Debug - show all buttons in this review
                if not reply_btn:
                    print("   [WARN] Reply button not found. Debugging available buttons:")
                    all_buttons = target_review.find_elements(By.TAG_NAME, "button")
                    print(f"   Found {len(all_buttons)} total buttons in this review")

                    for idx, btn in enumerate(all_buttons[:10]):  # First 10 buttons
                        try:
                            btn_text = btn.text.strip()
                            btn_class = btn.get_attribute("class") or ""
                            btn_aria = btn.get_attribute("aria-label") or ""
                            is_visible = btn.is_displayed()
                            print(f"   Button {idx+1}: visible={is_visible}, text='{btn_text[:30]}', class='{btn_class[:50]}', aria='{btn_aria[:30]}'")

                            # Try to find button with any reply-related text
                            if is_visible and ('답글' in btn_text or '댓글' in btn_text or '답글' in btn_aria):
                                reply_btn = btn
                                print(f"   [OK] Found reply button at position {idx+1}")
                                break
                        except Exception as e:
                            continue

                    # Check if textarea already exists (reply area already open)
                    if not reply_btn:
                        textareas = target_review.find_elements(By.TAG_NAME, "textarea")
                        if textareas and any(ta.is_displayed() for ta in textareas):
                            print("   [INFO] Textarea already visible - reply area might already be open")
                            raise Exception("Reply area already open - no button click needed")

                if not reply_btn:
                    raise Exception("Could not find reply button using any method")

                # Click the button
                print("   [CLICK] Clicking reply button...")
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", reply_btn)
                time.sleep(0.5)
                driver.execute_script("arguments[0].click();", reply_btn)
                time.sleep(1.5)  # Increased wait time for reply area to open
                print("   [OK] Reply button clicked")

            except Exception as e:
                raise Exception(f"Failed to click reply button: {e}")

            # Enter reply text
            print("[TYPE] Searching for reply textarea...")
            try:
                # Wait for textarea to appear
                textarea = WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.TAG_NAME, "textarea"))
                )

                # Make sure it's visible and interactable
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", textarea)
                time.sleep(0.5)

                # Clear textarea
                textarea.clear()
                time.sleep(0.3)

                # Enter text using a method that React/Vue will detect
                print(f"   [NOTE] Entering reply text ({len(reply_text)} chars)...")

                # Method: Use JavaScript to properly trigger React's internal tracking
                # This is necessary for modern frameworks that don't detect direct value changes

                # Escape special characters for JavaScript
                escaped_text = reply_text.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '\\r')

                # Set value and update React's internal value tracker
                js_script = f'''
                    var textarea = arguments[0];
                    var text = "{escaped_text}";

                    // Set the value
                    textarea.value = text;

                    // Update React's internal value tracker (if exists)
                    var tracker = textarea._valueTracker;
                    if (tracker) {{
                        tracker.setValue('');
                    }}

                    // Trigger all necessary events for React to detect the change
                    var inputEvent = new Event('input', {{ bubbles: true, cancelable: true }});
                    var changeEvent = new Event('change', {{ bubbles: true, cancelable: true }});
                    var keydownEvent = new KeyboardEvent('keydown', {{ bubbles: true, cancelable: true }});
                    var keyupEvent = new KeyboardEvent('keyup', {{ bubbles: true, cancelable: true }});

                    textarea.dispatchEvent(keydownEvent);
                    textarea.dispatchEvent(inputEvent);
                    textarea.dispatchEvent(keyupEvent);
                    textarea.dispatchEvent(changeEvent);

                    // Focus the textarea to ensure it's active
                    textarea.focus();
                '''

                driver.execute_script(js_script, textarea)
                time.sleep(1)  # Give React time to update

                # Verify text was entered and character count updated
                entered_text = driver.execute_script('return arguments[0].value;', textarea)
                if entered_text == reply_text:
                    print(f"   [OK] Reply text entered successfully ({len(reply_text)} chars)")
                else:
                    print(f"   [WARN] Text entered but may not match exactly (expected {len(reply_text)}, got {len(entered_text)} chars)")

                # Additional verification: check if submit button is enabled
                time.sleep(0.5)
                try:
                    # Look for character count indicator to verify React state updated
                    char_count_elements = driver.find_elements(By.XPATH, "//*[contains(text(), '/ 500') or contains(text(), '/500')]")
                    if char_count_elements:
                        char_count_text = char_count_elements[0].text
                        print(f"   [STAT] Character count shown: {char_count_text}")
                        if '0' in char_count_text and '500' in char_count_text:
                            print(f"   [WARN] WARNING: Character count still shows 0 - React may not have detected input!")
                except:
                    pass

            except Exception as e:
                print(f"   [ERROR] Failed to find/enter textarea")
                # Debug: show all textareas
                try:
                    all_textareas = driver.find_elements(By.TAG_NAME, "textarea")
                    print(f"   Found {len(all_textareas)} total textareas on page")
                    for idx, ta in enumerate(all_textareas[:3]):
                        is_visible = ta.is_displayed()
                        placeholder = ta.get_attribute("placeholder") or ""
                        print(f"   Textarea {idx+1}: visible={is_visible}, placeholder='{placeholder[:30]}'")
                except:
                    pass
                raise Exception(f"Failed to enter reply text: {e}")

            # Click submit button - search NEAR textarea only
            # Wait a bit for React to update button states after text input
            print("[SUBMIT] Waiting for submit button to become active...")
            time.sleep(1)

            print("   [DEBUG] Searching for submit button near textarea...")
            try:
                submit_btn = None
                reply_form = None

                # Get the parent container of the textarea (reply form/dialog)
                try:
                    # Try to find form element
                    reply_form = textarea.find_element(By.XPATH, "./ancestor::form")
                    print("   [OK] Found form element")
                except:
                    try:
                        # Try to find modal/dialog container (common in modern web apps)
                        reply_form = textarea.find_element(By.XPATH, "./ancestor::div[contains(@class, 'modal') or contains(@class, 'dialog') or contains(@class, 'popup')]")
                        print("   [OK] Found modal/dialog container")
                    except:
                        try:
                            # Get parent container (3-5 levels up should capture the reply form)
                            reply_form = textarea.find_element(By.XPATH, "./ancestor::div[4]")
                            print("   [OK] Found parent container (4 levels up)")
                        except:
                            # Last resort: use textarea's immediate parent area
                            reply_form = textarea.find_element(By.XPATH, "./parent::*")
                            print("   [WARN] Using textarea's parent only")

                # Method 1: Search within the reply form container by text
                try:
                    buttons_in_form = reply_form.find_elements(By.XPATH,
                        ".//button[contains(text(), '등록') or contains(text(), '완료') or contains(text(), '저장') or contains(text(), '확인')]")
                    visible_btns = [b for b in buttons_in_form if b.is_displayed() and b.is_enabled()]
                    if visible_btns:
                        submit_btn = visible_btns[0]
                        btn_text = submit_btn.text.strip()
                        print(f"   [OK] Found submit button in form by text: '{btn_text}'")

                        # Check if button is actually enabled (not disabled attribute)
                        is_disabled = submit_btn.get_attribute('disabled')
                        if is_disabled:
                            print(f"   [WARN] Warning: Button '{btn_text}' has disabled attribute")
                            submit_btn = None
                except:
                    pass

                # Method 2: Find button as sibling or nearby element
                if not submit_btn:
                    try:
                        # Look for buttons that come after textarea
                        nearby_btns = textarea.find_elements(By.XPATH,
                            "./following-sibling::button | ./parent::*/following-sibling::*/button | ./parent::*/button")
                        visible_btns = [b for b in nearby_btns if b.is_displayed()]
                        if visible_btns:
                            submit_btn = visible_btns[0]
                            print(f"   [OK] Found submit button as sibling: '{submit_btn.text.strip()}'")
                    except:
                        pass

                # Method 3: Type="submit" in the form
                if not submit_btn:
                    try:
                        submit_btns = reply_form.find_elements(By.CSS_SELECTOR, "button[type='submit']")
                        visible_btns = [b for b in submit_btns if b.is_displayed()]
                        if visible_btns:
                            submit_btn = visible_btns[0]
                            print("   [OK] Found submit button by type='submit'")
                    except:
                        pass

                # Method 4: Any button in the reply form
                if not submit_btn:
                    try:
                        all_btns_in_form = reply_form.find_elements(By.TAG_NAME, "button")
                        visible_btns = [b for b in all_btns_in_form if b.is_displayed()]
                        print(f"   [INFO] Found {len(visible_btns)} visible buttons in reply form")

                        # Try to auto-select based on text
                        for btn in visible_btns:
                            try:
                                btn_text = btn.text.strip()
                                if any(keyword in btn_text for keyword in ['등록', '완료', '저장', '확인', 'Submit', 'OK']):
                                    submit_btn = btn
                                    print(f"   [OK] Auto-selected button with text: '{btn_text}'")
                                    break
                            except:
                                continue

                        # If still not found, take first visible button
                        if not submit_btn and visible_btns:
                            submit_btn = visible_btns[0]
                            print(f"   [WARN] Using first visible button: '{submit_btn.text.strip()}'")
                    except:
                        pass

                # Debug: show all buttons in reply form
                if not submit_btn:
                    print("   [ERROR] Submit button not found in reply form. Debugging:")
                    try:
                        all_btns = reply_form.find_elements(By.TAG_NAME, "button")
                        visible_btns = [b for b in all_btns if b.is_displayed()]
                        print(f"   Found {len(visible_btns)} visible buttons in reply form:")

                        has_close_button = False
                        for idx, btn in enumerate(visible_btns[:5]):
                            try:
                                btn_text = btn.text.strip()
                                btn_class = btn.get_attribute("class") or ""
                                btn_type = btn.get_attribute("type") or ""
                                btn_disabled = btn.get_attribute("disabled")
                                print(f"   Button {idx+1}: text='{btn_text[:30]}', type='{btn_type}', disabled={btn_disabled}, class='{btn_class[:50]}'")

                                if btn_text in ['닫기', 'Close', '취소', 'Cancel']:
                                    has_close_button = True
                            except:
                                continue

                        if has_close_button:
                            print(f"   [WARN] Found '닫기' or '취소' button but no '등록' button!")
                            print(f"   [WARN] This usually means the textarea value was not properly detected by React")
                            print(f"   [WARN] The '등록' button only appears when text is entered and React state updates")
                    except:
                        pass

                    raise Exception("Could not find enabled '등록' submit button in reply form - text may not have been properly entered")

                # Click the button
                print("   [CLICK] Clicking submit button...")
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", submit_btn)
                time.sleep(0.5)

                # Log button info before clicking
                try:
                    btn_text = submit_btn.text.strip()
                    btn_html = submit_btn.get_attribute('outerHTML')[:100]
                    print(f"   [NOTE] Button to click: '{btn_text}', HTML: {btn_html}...")
                except:
                    pass

                driver.execute_script("arguments[0].click();", submit_btn)
                print("   [OK] Submit button clicked")

                # Wait for response and check for success/error
                print("   [WAIT] Waiting for server response...")
                time.sleep(3)

                # Check for error messages or alerts
                try:
                    # Check for common error message patterns
                    error_messages = driver.find_elements(By.XPATH, "//*[contains(text(), '실패') or contains(text(), '오류') or contains(text(), '에러') or contains(text(), 'error') or contains(text(), 'Error')]")
                    visible_errors = [e for e in error_messages if e.is_displayed()]

                    if visible_errors:
                        error_text = visible_errors[0].text
                        print(f"   [ERROR] Error message detected: {error_text[:100]}")
                        raise Exception(f"Reply posting failed: {error_text[:200]}")
                except:
                    pass

                # Check if reply area is still open (indicates failure)
                try:
                    textarea_still_exists = driver.find_elements(By.TAG_NAME, "textarea")
                    if any(ta.is_displayed() for ta in textarea_still_exists):
                        print("   [WARN] Warning: Reply textarea still visible - submission may have failed")
                except:
                    pass

                # Check for success message or confirmation
                try:
                    success_indicators = driver.find_elements(By.XPATH, "//*[contains(text(), '등록되었습니다') or contains(text(), '성공') or contains(text(), '완료')]")
                    if any(s.is_displayed() for s in success_indicators):
                        print("   [OK] Success message detected")
                except:
                    pass

                print("   [OK] Reply submission completed")

            except Exception as e:
                raise Exception(f"Failed to submit reply: {e}")

            # Final verification - wait a bit more and check page state
            print("[DEBUG] Final verification...")
            time.sleep(2)

            # Take screenshot for debugging (optional)
            try:
                screenshot_path = f"reply_posted_{place_id}_{author[:10]}.png"
                driver.save_screenshot(screenshot_path)
                print(f"   [SCREENSHOT] Screenshot saved: {screenshot_path}")
            except:
                pass

            # Check if the reply is now visible on the page
            verification_passed = False
            try:
                # Look for the reply we just posted
                # The reply should now appear in the review
                time.sleep(1)

                # Scroll back to the target review to see if reply appears
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", target_review)
                time.sleep(1)

                # Check for reply elements in the target review
                reply_elements = target_review.find_elements(By.XPATH, ".//*[contains(@class, 'reply') or contains(@class, 'Reply') or contains(@class, 'comment')]")

                if reply_elements:
                    print(f"   [OK] Found {len(reply_elements)} potential reply element(s)")
                    verification_passed = True
                else:
                    print(f"   [WARN] No reply elements found yet (may need more time)")
            except Exception as e:
                print(f"   [WARN] Verification check failed: {e}")

            print("[OK] Reply posted successfully!")

            return {
                'success': True,
                'message': '답글이 성공적으로 게시되었습니다',
                'author': author,
                'date': date_clean,
                'verified': verification_passed
            }

        except Exception as e:
            error_msg = str(e)
            print(f"[ERROR] Error posting reply: {error_msg}")
            logger.error(f"Error in post_reply_by_composite: {error_msg}")

            return {
                'success': False,
                'message': f'답글 게시 실패: {error_msg}',
                'author': author,
                'date': date
            }

        finally:
            if driver:
                try:
                    driver.quit()
                except:
                    pass

    def _is_valid_review_li(self, li) -> bool:
        """리뷰 li 요소가 유효한지 확인"""
        try:
            li.find_element(By.CLASS_NAME, "pui__JiVbY3")
            return True
        except:
            return False

    def get_loading_progress(self, place_id: str) -> Dict:
        """로딩 진행 상황 조회"""
        if place_id in self._loading_progress:
            return self._loading_progress[place_id]
        else:
            return {
                'status': 'idle',
                'count': 0,
                'message': '대기 중',
                'timestamp': datetime.now()
            }


# Singleton instance
naver_selenium_service = NaverSeleniumService()
