"""네이버 플레이스 HTML 파싱 서비스 - HTML 및 window.__APOLLO_STATE__ 추출"""
import re
import json
import httpx
import logging
from typing import Dict, Any, Optional, List
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class NaverHtmlParserService:
    """네이버 플레이스 HTML 파싱 서비스"""
    
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        }
    
    async def parse_place_html(self, place_id: str) -> Dict[str, Any]:
        """플레이스 HTML 페이지에서 정보 추출"""
        try:
            # 홈 페이지에서 기본 정보 추출 (/place/는 모든 업종 지원)
            url = f"https://m.place.naver.com/place/{place_id}/home"
            
            async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
                response = await client.get(url, headers=self.headers)
                
                if response.status_code != 200:
                    logger.warning(f"[HTML Parser] HTTP {response.status_code} for place_id {place_id}")
                    return {}
                
                html_content = response.text
                
                # HTML에서 직접 정보 추출 (우선순위 높음)
                html_data = self._parse_html_content(html_content)
                
                # window.__APOLLO_STATE__ 추출
                apollo_state = self._extract_apollo_state(html_content)
                
                if apollo_state:
                    # PlaceDetailBase에서 정보 추출
                    place_data = self._extract_place_detail(apollo_state, place_id)
                    
                    # 메뉴 정보 추출
                    menus = self._extract_menus(apollo_state, place_id)
                    if menus:
                        place_data["menus"] = menus
                    
                    # HTML에서 추출한 정보로 덮어쓰기 (HTML이 더 최신)
                    place_data.update(html_data)
                else:
                    logger.warning(f"[HTML Parser] APOLLO_STATE not found, using HTML only")
                    place_data = html_data
                
                # 정보 탭에서 업체소개글 추출 시도
                try:
                    info_url = f"https://m.place.naver.com/place/{place_id}/information"
                    info_response = await client.get(info_url, headers=self.headers)
                    if info_response.status_code == 200:
                        info_description = self._parse_description_from_info_page(info_response.text)
                        if info_description:
                            place_data["description"] = info_description
                            logger.info(f"[HTML Parser] 업체소개글 추출 성공: {len(info_description)}자")
                except Exception as e:
                    logger.warning(f"[HTML Parser] 정보 탭 파싱 실패: {str(e)}")
                
                logger.info(f"[HTML Parser] 성공: place_id={place_id}, fields={len(place_data)}")
                return place_data
                
        except Exception as e:
            logger.error(f"[HTML Parser] 오류: place_id={place_id}, error={str(e)}")
            return {}
    
    def _parse_html_content(self, html: str) -> Dict[str, Any]:
        """HTML 페이지에서 직접 정보 추출 (BeautifulSoup 사용)"""
        result = {}
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # 1. 전화번호 (class="xlx7Q")
            phone_elem = soup.find('span', class_='xlx7Q')
            if phone_elem:
                result["phone_number"] = phone_elem.get_text(strip=True)
                logger.info(f"[HTML Parser] 전화번호: {result['phone_number']}")
            
            # 2. 영업시간 및 영업상태
            business_status_elem = soup.find('div', class_='A_cdD')
            if business_status_elem:
                status_text = business_status_elem.get_text(strip=True)
                result["business_status_text"] = status_text
                result["is_open"] = "영업 중" in status_text
                logger.info(f"[HTML Parser] 영업 상태: {status_text}")
            
            # 3. 홈페이지 (class="CHmqa")
            homepage_elem = soup.find('a', class_='CHmqa')
            if homepage_elem and homepage_elem.get('href'):
                result["homepage"] = homepage_elem.get('href')
                logger.info(f"[HTML Parser] 홈페이지: {result['homepage']}")
            
            # 4. 블로그 및 인스타그램 (class="iBUwB")
            social_links = soup.find_all('a', class_='iBUwB')
            for link in social_links:
                href = link.get('href', '')
                text = link.get_text(strip=True)
                
                if '블로그' in text and href:
                    result["blog"] = href
                    logger.info(f"[HTML Parser] 블로그: {href}")
                elif '인스타그램' in text and href:
                    result["instagram"] = href
                    logger.info(f"[HTML Parser] 인스타그램: {href}")
            
            # 5. TV 방송 정보 (class="UFXr9")
            tv_elem = soup.find('div', class_='UFXr9')
            if tv_elem:
                tv_text = tv_elem.get_text(strip=True)
                result["tv_program"] = tv_text
                logger.info(f"[HTML Parser] TV 방송: {tv_text}")
            
            # 6. 편의시설 (class="xPvPE")
            convenience_elem = soup.find('div', class_='xPvPE')
            if convenience_elem:
                convenience_text = convenience_elem.get_text(strip=True)
                result["conveniences_text"] = convenience_text
                
                # 리스트로 변환
                conveniences_list = [item.strip() for item in convenience_text.split(',')]
                result["conveniences"] = conveniences_list
                
                # Boolean 매핑
                result["has_reservation"] = any("예약" in c for c in conveniences_list)
                result["group_seating"] = any("단체" in c for c in conveniences_list)
                result["has_takeout"] = any("포장" in c for c in conveniences_list)
                result["has_wifi"] = any("무선 인터넷" in c or "와이파이" in c for c in conveniences_list)
                result["has_delivery"] = any("배달" in c for c in conveniences_list)
                
                logger.info(f"[HTML Parser] 편의시설: {len(conveniences_list)}개")
            
            # 7. 업체소개글 (class="AX_W3 _6sPQ")
            description_elem = soup.find('div', class_='AX_W3')
            if description_elem:
                description_text = description_elem.get_text(strip=True)
                result["description"] = description_text
                logger.info(f"[HTML Parser] 업체소개글: {len(description_text)}자")
            
            # 8. 플레이스 플러스 (class="jpqsT" - 플레이스 플러스 로고)
            try:
                place_plus_elem = soup.find('span', class_='jpqsT')
                if place_plus_elem:
                    result["is_place_plus"] = True
                    logger.info(f"[HTML Parser] 플레이스 플러스: True")
                else:
                    result["is_place_plus"] = False
            except Exception as e:
                logger.warning(f"[HTML Parser] 플레이스 플러스 파싱 실패: {str(e)}")
                result["is_place_plus"] = False
            
            # 9. 새로오픈 (class="PXMot S6RhH" - "새로오픈" 텍스트)
            # dAsGb 클래스 내부의 모든 PXMot 스팬 확인
            try:
                badges_container = soup.find('div', class_='dAsGb')
                result["is_new_business"] = False
                
                if badges_container:
                    badge_spans = badges_container.find_all('span', class_='PXMot')
                    for span in badge_spans:
                        span_text = span.get_text(strip=True)
                        if '새로오픈' in span_text or '새로 오픈' in span_text:
                            result["is_new_business"] = True
                            logger.info(f"[HTML Parser] 새로오픈: True")
                            break
                
                if not result["is_new_business"]:
                    logger.info(f"[HTML Parser] 새로오픈: False")
            except Exception as e:
                logger.warning(f"[HTML Parser] 새로오픈 파싱 실패: {str(e)}")
                result["is_new_business"] = False
            
            logger.info(f"[HTML Parser] HTML 파싱 완료: {len(result)} fields")
            return result
            
        except Exception as e:
            logger.error(f"[HTML Parser] HTML 파싱 실패: {str(e)}")
            return result
    
    def _parse_description_from_info_page(self, html: str) -> Optional[str]:
        """정보 탭 페이지에서 업체소개글 추출"""
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # 업체소개글 (class="AX_W3 _6sPQ" 또는 "AX_W3")
            description_elem = soup.find('div', class_='AX_W3')
            if description_elem:
                description_text = description_elem.get_text(strip=True)
                return description_text
            
            return None
            
        except Exception as e:
            logger.error(f"[HTML Parser] 업체소개글 파싱 실패: {str(e)}")
            return None
    
    def _extract_apollo_state(self, html: str) -> Optional[Dict[str, Any]]:
        """HTML에서 window.__APOLLO_STATE__ 추출"""
        try:
            # 정규식으로 찾기
            pattern = r'window\.__APOLLO_STATE__\s*=\s*({.+?});(?:\s|</script>)'
            match = re.search(pattern, html, re.DOTALL)
            
            if match:
                json_str = match.group(1)
                return json.loads(json_str)
            
            return None
            
        except Exception as e:
            logger.error(f"[HTML Parser] APOLLO_STATE 파싱 실패: {str(e)}")
            return None
    
    def _extract_place_detail(self, apollo_state: Dict[str, Any], place_id: str) -> Dict[str, Any]:
        """PlaceDetailBase에서 정보 추출"""
        result = {}
        
        try:
            place_key = f"PlaceDetailBase:{place_id}"
            
            if place_key not in apollo_state:
                logger.warning(f"[HTML Parser] PlaceDetailBase not found for {place_id}")
                return result
            
            place_data = apollo_state[place_key]
            
            # 기본 정보
            result["name"] = place_data.get("name")
            result["category"] = place_data.get("category")
            result["category_code"] = place_data.get("categoryCode")
            result["address"] = place_data.get("address")
            result["road_address"] = place_data.get("roadAddress")
            
            # 좌표
            coordinate = place_data.get("coordinate", {})
            if coordinate:
                result["longitude"] = coordinate.get("x")
                result["latitude"] = coordinate.get("y")
            
            # 전화번호
            result["virtual_phone"] = place_data.get("virtualPhone")
            result["phone_number"] = place_data.get("virtualPhone")  # 호환성
            
            # 평점/리뷰
            result["visitor_reviews_total"] = place_data.get("visitorReviewsTotal")
            result["visitor_reviews_score"] = place_data.get("visitorReviewsScore")
            
            # 편의시설
            conveniences = place_data.get("conveniences", [])
            if conveniences:
                result["conveniences"] = conveniences
                
                # 편의시설을 boolean 필드로도 매핑
                result["has_parking"] = "주차" in conveniences
                result["has_wifi"] = "무선 인터넷" in conveniences or "와이파이" in conveniences
                result["has_delivery"] = "배달" in conveniences
                result["has_takeout"] = "포장" in conveniences
                result["has_reservation"] = "예약" in conveniences
                result["group_seating"] = "단체 이용 가능" in conveniences
            
            # 결제 수단
            payment_info = place_data.get("paymentInfo", [])
            if payment_info:
                result["payment_methods"] = payment_info
            
            # 마이크로 리뷰
            micro_reviews = place_data.get("microReviews", [])
            if micro_reviews:
                result["micro_reviews"] = micro_reviews
            
            # 길 안내
            road = place_data.get("road")
            if road:
                result["directions"] = road
            
            # missingInfo 먼저 추출
            missing_info = place_data.get("missingInfo", {})
            
            # 플레이스 플러스 (사장님 인증)
            # 여러 필드를 체크하여 플레이스 플러스 여부 확인
            result["is_boss"] = place_data.get("isBoss", False)
            result["is_place_plus"] = (
                place_data.get("isBoss", False) or 
                place_data.get("isPlacePlus", False) or
                place_data.get("placePlusYn", False)
            )
            
            # missingInfo에서도 확인
            if not result["is_place_plus"]:
                result["is_boss"] = missing_info.get("isBoss", False)
                result["is_place_plus"] = (
                    missing_info.get("isBoss", False) or
                    missing_info.get("isPlacePlus", False)
                )
            
            # 새로오픈 체크
            result["is_new_business"] = (
                place_data.get("isNewBusiness", False) or
                place_data.get("newYn", False) or
                place_data.get("isNew", False)
            )
            
            # 영업시간 누락 여부
            result["is_biz_hour_missing"] = missing_info.get("isBizHourMissing", True)
            result["is_description_missing"] = missing_info.get("isDescriptionMissing", True)
            
            # 영업시간 추출
            business_hours = self._extract_business_hours(apollo_state, place_id)
            if business_hours:
                result["business_hours"] = business_hours
            
            logger.info(f"[HTML Parser] PlaceDetail 추출 완료: {len(result)} fields")
            return result
            
        except Exception as e:
            logger.error(f"[HTML Parser] PlaceDetail 추출 실패: {str(e)}")
            return result
    
    def _extract_business_hours(self, apollo_state: Dict[str, Any], place_id: str) -> Optional[Dict[str, Any]]:
        """영업시간 정보 추출"""
        try:
            # ROOT_QUERY에서 businesses 찾기
            root_query = apollo_state.get("ROOT_QUERY", {})
            
            # businesses 관련 키 찾기
            business_keys = [k for k in root_query.keys() if "businesses" in k.lower()]
            
            for key in business_keys:
                business_data = root_query[key]
                
                if isinstance(business_data, dict):
                    items = business_data.get("items", [])
                    
                    for item_ref in items:
                        if isinstance(item_ref, dict) and "__ref" in item_ref:
                            ref_key = item_ref["__ref"]
                            ref_data = apollo_state.get(ref_key, {})
                            
                            # place_id 매칭 확인
                            if ref_data.get("id") == place_id:
                                business_status = ref_data.get("businessStatus", {})
                                
                                if isinstance(business_status, dict) and "__ref" in business_status:
                                    status_ref = business_status["__ref"]
                                    status_data = apollo_state.get(status_ref, {})
                                    
                                    hours_list = status_data.get("businessHours", [])
                                    
                                    if hours_list:
                                        # 요일별 영업시간 구조화
                                        formatted_hours = {}
                                        
                                        for hour_info in hours_list:
                                            if isinstance(hour_info, dict) and "__ref" in hour_info:
                                                hour_ref = hour_info["__ref"]
                                                hour_data = apollo_state.get(hour_ref, {})
                                                
                                                day = hour_data.get("day")
                                                biz_hours = hour_data.get("businessHours", {})
                                                break_hours = hour_data.get("breakHours", [])
                                                
                                                if day:
                                                    formatted_hours[day] = {
                                                        "open": None,
                                                        "close": None,
                                                        "break_times": []
                                                    }
                                                    
                                                    # 영업시간
                                                    if isinstance(biz_hours, dict) and "__ref" in biz_hours:
                                                        time_ref = biz_hours["__ref"]
                                                        time_data = apollo_state.get(time_ref, {})
                                                        formatted_hours[day]["open"] = time_data.get("start")
                                                        formatted_hours[day]["close"] = time_data.get("end")
                                                    
                                                    # 브레이크타임
                                                    for break_time in break_hours:
                                                        if isinstance(break_time, dict) and "__ref" in break_time:
                                                            break_ref = break_time["__ref"]
                                                            break_data = apollo_state.get(break_ref, {})
                                                            
                                                            if break_data.get("isBreaktime"):
                                                                formatted_hours[day]["break_times"].append({
                                                                    "start": break_data.get("start"),
                                                                    "end": break_data.get("end"),
                                                                    "description": break_data.get("description")
                                                                })
                                        
                                        return {
                                            "status": status_data.get("status"),
                                            "description": status_data.get("description"),
                                            "hours": formatted_hours
                                        }
            
            return None
            
        except Exception as e:
            logger.error(f"[HTML Parser] 영업시간 추출 실패: {str(e)}")
            return None
    
    def _extract_menus(self, apollo_state: Dict[str, Any], place_id: str) -> List[Dict[str, Any]]:
        """메뉴 정보 추출 (Menu, Price, Service 등 다양한 키 패턴 분석)"""
        menus = []
        
        try:
            # Menu:place_id_* 형태의 키 찾기
            menu_keys = [k for k in apollo_state.keys() if k.startswith(f"Menu:{place_id}_")]
            
            logger.info(f"[HTML Parser] place_id={place_id}, 발견된 메뉴 키: {len(menu_keys)}개")
            
            # 메뉴가 0개일 때 상세 분석 (다른 키 패턴 찾기)
            if len(menu_keys) == 0:
                logger.warning(f"[HTML Parser] ⚠️ place_id={place_id} 메뉴 0개! Apollo State 키 분석 시작")
                logger.info(f"[HTML Parser] Apollo State 전체 키 개수: {len(apollo_state)}")
                
                # 다양한 패턴으로 메뉴 관련 키 검색
                menu_related_keys = {
                    "Menu_any": [k for k in apollo_state.keys() if "Menu:" in k or "menu" in k.lower()],
                    "Price": [k for k in apollo_state.keys() if "Price" in k or "price" in k.lower()],
                    "Service": [k for k in apollo_state.keys() if "Service" in k or "service" in k.lower()],
                    "Product": [k for k in apollo_state.keys() if "Product" in k or "product" in k.lower()],
                    "Item": [k for k in apollo_state.keys() if "Item" in k or "item" in k.lower()],
                }
                
                for pattern, keys in menu_related_keys.items():
                    if keys:
                        logger.info(f"[HTML Parser] 패턴 '{pattern}' 발견: {len(keys)}개")
                        # 상위 5개 키 샘플 출력
                        for key in keys[:5]:
                            value_type = type(apollo_state[key]).__name__
                            if isinstance(apollo_state[key], dict):
                                sample_keys = list(apollo_state[key].keys())[:5]
                                logger.info(f"[HTML Parser]   - {key} (type={value_type}, keys={sample_keys})")
                            else:
                                logger.info(f"[HTML Parser]   - {key} (type={value_type})")
                
                # PlaceDetailBase 키 확인 (메뉴 정보가 여기 있을 수도)
                place_detail_key = f"PlaceDetailBase:{place_id}"
                if place_detail_key in apollo_state:
                    place_detail = apollo_state[place_detail_key]
                    if isinstance(place_detail, dict):
                        menu_fields = [k for k in place_detail.keys() if "menu" in k.lower() or "price" in k.lower()]
                        if menu_fields:
                            logger.info(f"[HTML Parser] PlaceDetailBase에서 메뉴 관련 필드 발견: {menu_fields}")
                
                # 전체 키 샘플 출력 (디버깅용, 상위 20개)
                all_keys = list(apollo_state.keys())[:20]
                logger.info(f"[HTML Parser] Apollo State 키 샘플 (상위 20개): {all_keys}")
            
            for menu_key in menu_keys:
                menu_data = apollo_state[menu_key]
                
                menu = {
                    "name": menu_data.get("name"),
                    "price": menu_data.get("price"),
                    "description": menu_data.get("description"),
                    "is_representative": menu_data.get("isRepresentative", False),
                    "images": []
                }
                
                # 이미지 정보
                images = menu_data.get("images", [])
                for img in images:
                    if isinstance(img, dict) and "__ref" in img:
                        img_ref = img["__ref"]
                        img_data = apollo_state.get(img_ref, {})
                        menu["images"].append({
                            "url": img_data.get("url"),
                            "is_representative": img_data.get("isRepresentative", False)
                        })
                
                menus.append(menu)
            
            # 가격 순으로 정렬 (타입 안전하게)
            def get_price_for_sort(menu):
                price = menu.get("price")
                if price is None:
                    return 0
                try:
                    return int(price) if isinstance(price, (int, float, str)) else 0
                except (ValueError, TypeError):
                    return 0
            
            menus.sort(key=get_price_for_sort)
            
            if menus:
                logger.info(f"[HTML Parser] ✅ place_id={place_id}, 메뉴 {len(menus)}개 추출 완료")
            
            return menus
            
        except Exception as e:
            logger.error(f"[HTML Parser] ❌ place_id={place_id}, 메뉴 추출 실패: {str(e)}")
            # 에러 시에도 Apollo State 키 샘플 출력
            try:
                all_keys = list(apollo_state.keys())[:10]
                logger.error(f"[HTML Parser] Apollo State 키 샘플 (에러 시): {all_keys}")
            except:
                pass
            return []


# 싱글톤 인스턴스
html_parser_service = NaverHtmlParserService()
