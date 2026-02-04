"""
네이버 검색도구 API를 사용한 키워드 검색량 조회 서비스
"""
import os
import json
import hashlib
import hmac
import base64
import requests
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.core.database import get_supabase_client


class NaverKeywordSearchVolumeService:
    """네이버 검색도구 API 서비스"""
    
    # 네이버 검색광고 API 기본 URL (2024년 변경됨)
    BASE_URL = "https://api.searchad.naver.com"
    
    def __init__(self):
        """서비스 초기화"""
        # 환경변수에서 API 키 로드 (추후 업데이트 예정)
        self.client_id = os.getenv("NAVER_SEARCH_AD_API_KEY", "")
        self.client_secret = os.getenv("NAVER_SEARCH_AD_SECRET", "")
        self.customer_id = os.getenv("NAVER_SEARCH_AD_CUSTOMER_ID", "")
        
    def _generate_signature(self, timestamp: str, method: str, uri: str) -> str:
        """
        API 서명 생성
        """
        message = f"{timestamp}.{method}.{uri}"
        signature = hmac.new(
            self.client_secret.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).digest()
        return base64.b64encode(signature).decode('utf-8')
    
    def get_keyword_search_volume(self, keywords: List[str]) -> Dict[str, Any]:
        """
        키워드 검색량 조회
        
        Args:
            keywords: 조회할 키워드 리스트 (최대 5개)
            
        Returns:
            검색량 데이터
        """
        print(f"[검색량 서비스] 원본 키워드: {keywords}")
        
        # 띄어쓰기 제거 (네이버 API는 띄어쓰기를 허용하지 않음)
        cleaned_keywords = [kw.replace(" ", "") for kw in keywords]
        print(f"[검색량 서비스] 정제된 키워드: {cleaned_keywords}")
        
        print(f"[검색량 서비스] API KEY 존재: {bool(self.client_id)}")
        print(f"[검색량 서비스] SECRET 존재: {bool(self.client_secret)}")
        print(f"[검색량 서비스] CUSTOMER ID 존재: {bool(self.customer_id)}")
        
        if not self.client_id or not self.client_secret:
            error_msg = "네이버 검색도구 API 인증 정보가 설정되지 않았습니다."
            print(f"[검색량 서비스] 에러: {error_msg}")
            return {
                "status": "error",
                "message": error_msg
            }
        
        if len(cleaned_keywords) > 5:
            return {
                "status": "error",
                "message": "한 번에 최대 5개의 키워드만 조회할 수 있습니다."
            }
        
        # 네이버 검색광고 API 엔드포인트 (정확한 경로)
        # 참고: https://naver.github.io/searchad-apidoc/
        timestamp = str(int(datetime.now().timestamp() * 1000))
        method = "GET"
        uri = "/keywordstool"
        
        # 서명 생성
        signature = self._generate_signature(timestamp, method, uri)
        
        # 헤더 설정
        headers = {
            "X-Timestamp": timestamp,
            "X-API-KEY": self.client_id,
            "X-Customer": self.customer_id,
            "X-Signature": signature,
            "Content-Type": "application/json"
        }
        
        # 요청 파라미터 (정제된 키워드 사용)
        params = {
            "hintKeywords": ",".join(cleaned_keywords),
            "showDetail": "1"
        }
        
        print(f"[검색량 서비스] URL: {self.BASE_URL}{uri}")
        print(f"[검색량 서비스] Params: {params}")
        
        try:
            # API 호출
            response = requests.get(
                f"{self.BASE_URL}{uri}",
                headers=headers,
                params=params,
                timeout=30
            )
            
            print(f"[검색량 서비스] 응답 상태 코드: {response.status_code}")
            print(f"[검색량 서비스] 응답 내용: {response.text[:500]}")
            
            response.raise_for_status()
            
            result_data = response.json()
            
            # 원본 키워드와 정제된 키워드 매핑 추가
            result_data["_keyword_mapping"] = {
                cleaned: original 
                for cleaned, original in zip(cleaned_keywords, keywords)
            }
            
            return {
                "status": "success",
                "data": result_data
            }
            
        except requests.exceptions.RequestException as e:
            error_msg = f"API 호출 실패: {str(e)}"
            print(f"[검색량 서비스] 예외 발생: {error_msg}")
            return {
                "status": "error",
                "message": error_msg
            }
    
    async def get_keyword_search_volume_async(self, keywords: List[str]) -> Dict[str, Any]:
        """
        키워드 검색량 조회 (비동기 버전)
        
        Args:
            keywords: 조회할 키워드 리스트 (최대 5개)
            
        Returns:
            검색량 데이터
        """
        print(f"[검색량 서비스 ASYNC] 원본 키워드: {keywords}")
        
        # 띄어쓰기 제거
        cleaned_keywords = [kw.replace(" ", "") for kw in keywords]
        print(f"[검색량 서비스 ASYNC] 정제된 키워드: {cleaned_keywords}")
        
        if not self.client_id or not self.client_secret:
            error_msg = "네이버 검색도구 API 인증 정보가 설정되지 않았습니다."
            print(f"[검색량 서비스 ASYNC] 에러: {error_msg}")
            return {
                "status": "error",
                "message": error_msg
            }
        
        if len(cleaned_keywords) > 5:
            return {
                "status": "error",
                "message": "한 번에 최대 5개의 키워드만 조회할 수 있습니다."
            }
        
        timestamp = str(int(datetime.now().timestamp() * 1000))
        method = "GET"
        uri = "/keywordstool"
        
        signature = self._generate_signature(timestamp, method, uri)
        
        headers = {
            "X-Timestamp": timestamp,
            "X-API-KEY": self.client_id,
            "X-Customer": self.customer_id,
            "X-Signature": signature,
            "Content-Type": "application/json"
        }
        
        params = {
            "hintKeywords": ",".join(cleaned_keywords),
            "showDetail": "1"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(
                    f"{self.BASE_URL}{uri}",
                    headers=headers,
                    params=params
                )
                
                print(f"[검색량 서비스 ASYNC] 응답 상태 코드: {response.status_code}")
                
                response.raise_for_status()
                
                result_data = response.json()
                
                result_data["_keyword_mapping"] = {
                    cleaned: original 
                    for cleaned, original in zip(cleaned_keywords, keywords)
                }
                
                return {
                    "status": "success",
                    "data": result_data
                }
                
        except Exception as e:
            error_msg = f"API 호출 실패: {str(e)}"
            print(f"[검색량 서비스 ASYNC] 예외 발생: {error_msg}")
            return {
                "status": "error",
                "message": error_msg
            }
    
    def save_search_volume_history(
        self,
        user_id: str,
        keyword: str,
        search_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        검색량 이력 저장
        
        Args:
            user_id: 사용자 ID
            keyword: 키워드
            search_result: 검색 결과 데이터
            
        Returns:
            저장 결과
        """
        try:
            print(f"[저장 서비스] user_id={user_id}, keyword={keyword}")
            supabase = get_supabase_client()
            
            # 검색 결과에서 필요한 데이터 추출
            keyword_list = search_result.get("keywordList", [])
            print(f"[저장 서비스] keywordList 개수: {len(keyword_list)}")
            
            # 띄어쓰기 제거된 키워드로 매칭
            cleaned_keyword = keyword.replace(" ", "")
            
            # 입력한 키워드와 일치하는 데이터 찾기
            keyword_data = None
            
            # 1. 정확히 일치하는 키워드 찾기
            for item in keyword_list:
                if item.get("relKeyword") == cleaned_keyword:
                    keyword_data = item
                    break
            
            # 2. 부분 일치 찾기 (네이버 API가 키워드를 자를 수 있음)
            if not keyword_data:
                for item in keyword_list:
                    rel_keyword = item.get("relKeyword", "")
                    # 앞부분이 일치하거나, relKeyword가 cleaned_keyword의 부분 문자열인 경우
                    if cleaned_keyword.startswith(rel_keyword) or rel_keyword.startswith(cleaned_keyword[:10]):
                        keyword_data = item
                        print(f"[저장 서비스] 부분 매칭 성공: {rel_keyword} ≈ {cleaned_keyword}")
                        break
            
            # 3. 일치하는 게 없으면 첫 번째 항목 사용
            if not keyword_data and keyword_list:
                keyword_data = keyword_list[0]
                print(f"[저장 서비스] 첫 번째 항목 사용: {keyword_data.get('relKeyword')}")
            
            if not keyword_data:
                print(f"[저장 서비스] 키워드 데이터를 찾을 수 없음")
                return {
                    "status": "error",
                    "message": "키워드 데이터를 찾을 수 없습니다."
                }
            
            print(f"[저장 서비스] 데이터 추출 완료: {keyword_data.get('relKeyword')}")
            
            # 검색량 데이터를 숫자로 변환 (< 10 같은 문자열 처리)
            def parse_count(value):
                if value is None:
                    return None
                if isinstance(value, str):
                    if '<' in value:
                        return 5  # < 10을 5로 처리
                    try:
                        return int(value)
                    except:
                        return None
                return value
            
            # DB에 저장
            insert_data = {
                "user_id": user_id,
                "keyword": keyword,  # 원본 키워드 저장
                "monthly_pc_qc_cnt": parse_count(keyword_data.get("monthlyPcQcCnt")),
                "monthly_mobile_qc_cnt": parse_count(keyword_data.get("monthlyMobileQcCnt")),
                "monthly_ave_pc_clk_cnt": keyword_data.get("monthlyAvePcClkCnt"),
                "monthly_ave_mobile_clk_cnt": keyword_data.get("monthlyAveMobileClkCnt"),
                "monthly_ave_pc_ctr": keyword_data.get("monthlyAvePcCtr"),
                "monthly_ave_mobile_ctr": keyword_data.get("monthlyAveMobileCtr"),
                "comp_idx": keyword_data.get("compIdx"),
                "search_result": keyword_data
            }
            
            print(f"[저장 서비스] 저장할 데이터: keyword={insert_data['keyword']}, pc={insert_data['monthly_pc_qc_cnt']}, mobile={insert_data['monthly_mobile_qc_cnt']}")
            
            print(f"[저장 서비스] DB INSERT 시도...")
            result = supabase.table("keyword_search_volumes").insert(insert_data).execute()
            
            print(f"[저장 서비스] DB INSERT 성공! 결과: {len(result.data) if result.data else 0}개")
            
            return {
                "status": "success",
                "data": result.data[0] if result.data else None
            }
            
        except Exception as e:
            error_msg = f"저장 실패: {str(e)}"
            print(f"[저장 서비스] 예외 발생: {error_msg}")
            import traceback
            print(traceback.format_exc())
            return {
                "status": "error",
                "message": error_msg
            }
    
    def get_search_volume_history(
        self,
        user_id: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        사용자의 검색량 이력 조회
        
        Args:
            user_id: 사용자 ID
            limit: 조회할 최대 개수
            
        Returns:
            검색 이력 리스트
        """
        try:
            supabase = get_supabase_client()
            
            result = supabase.table("keyword_search_volumes")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            print(f"검색 이력 조회 실패: {str(e)}")
            return []
    
    def delete_search_volume_history(
        self,
        user_id: str,
        history_id: str
    ) -> Dict[str, Any]:
        """
        검색량 이력 삭제
        
        Args:
            user_id: 사용자 ID
            history_id: 이력 ID
            
        Returns:
            삭제 결과
        """
        try:
            supabase = get_supabase_client()
            
            result = supabase.table("keyword_search_volumes")\
                .delete()\
                .eq("id", history_id)\
                .eq("user_id", user_id)\
                .execute()
            
            return {
                "status": "success",
                "message": "이력이 삭제되었습니다."
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"삭제 실패: {str(e)}"
            }
    
    def generate_keyword_combinations(
        self,
        location_keywords: List[str],
        product_keywords: List[str],
        industry_keywords: List[str]
    ) -> List[str]:
        """
        키워드 조합 생성
        
        Args:
            location_keywords: 지역 키워드 리스트
            product_keywords: 상품 키워드 리스트
            industry_keywords: 업종 키워드 리스트
            
        Returns:
            조합된 키워드 리스트
        """
        combinations = []
        
        # A + B (지역 + 상품)
        for loc in location_keywords:
            for prod in product_keywords:
                combinations.append(f"{loc} {prod}")
        
        # A + B + C (지역 + 상품 + 업종)
        for loc in location_keywords:
            for prod in product_keywords:
                for ind in industry_keywords:
                    combinations.append(f"{loc} {prod} {ind}")
        
        # A + C (지역 + 업종)
        for loc in location_keywords:
            for ind in industry_keywords:
                combinations.append(f"{loc} {ind}")
        
        # B + C (상품 + 업종)
        for prod in product_keywords:
            for ind in industry_keywords:
                combinations.append(f"{prod} {ind}")
        
        # 중복 제거
        return list(set(combinations))
