"""
네이버 플레이스 대표 키워드 분석 서비스

상위 매장들의 대표 키워드를 분석하여 제공합니다.
"""
import logging
import httpx
import re
import json
from typing import List, Dict, Optional, Any
import asyncio
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class NaverKeywordsAnalyzerService:
    """네이버 플레이스 대표 키워드 분석 서비스"""
    
    def __init__(self):
        self.timeout = 15.0
        self.base_headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": "https://m.place.naver.com/",
        }
    
    async def get_place_keywords(self, place_id: str) -> List[str]:
        """
        특정 매장의 대표 키워드 추출 (HTML 페이지 소스에서 추출)
        
        Args:
            place_id: 네이버 플레이스 ID
            
        Returns:
            대표 키워드 리스트 (최대 5개)
        """
        try:
            url = f"https://m.place.naver.com/place/{place_id}/home"
            
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(url, headers=self.base_headers)
                response.raise_for_status()
                
                html = response.text
                
                # 방법 1: window.__APOLLO_STATE__ = {...}; 형태 추출 (중괄호 카운팅)
                apollo_start_marker = "window.__APOLLO_STATE__ = "
                apollo_start_idx = html.find(apollo_start_marker)
                
                if apollo_start_idx >= 0:
                    # JSON 시작 위치
                    json_start = apollo_start_idx + len(apollo_start_marker)
                    
                    # 중괄호 개수를 세면서 JSON 끝 찾기
                    brace_count = 0
                    json_end = json_start
                    in_string = False
                    escape_next = False
                    
                    for i in range(json_start, len(html)):
                        char = html[i]
                        
                        if escape_next:
                            escape_next = False
                            continue
                        
                        if char == '\\':
                            escape_next = True
                            continue
                        
                        if char == '"' and not escape_next:
                            in_string = not in_string
                            continue
                        
                        if not in_string:
                            if char == '{':
                                brace_count += 1
                            elif char == '}':
                                brace_count -= 1
                                if brace_count == 0:
                                    json_end = i + 1
                                    break
                    
                    if brace_count == 0:
                        try:
                            apollo_json = html[json_start:json_end]
                            apollo_data = json.loads(apollo_json)
                            logger.info(f"[HTML] Apollo State extracted successfully")
                        except json.JSONDecodeError as e:
                            logger.warning(f"[HTML] JSON decode failed: {str(e)}")
                            apollo_data = None
                    else:
                        logger.warning(f"[HTML] Failed to find matching braces")
                        apollo_data = None
                else:
                    apollo_data = None
                
                if apollo_data:
                    # Place:플레이스ID 또는 PlaceDetailBase:플레이스ID 형태의 키 찾기
                    place_keys = [f"Place:{place_id}", f"PlaceDetailBase:{place_id}"]
                    
                    for place_key in place_keys:
                        if place_key in apollo_data:
                            keyword_list = apollo_data[place_key].get("keywordList", [])
                            if keyword_list:
                                logger.info(f"[HTML-Apollo] 매장 {place_id}의 키워드: {keyword_list[:5]}")
                                return keyword_list[:5]
                    
                    # ROOT_QUERY 내부에서도 찾아보기
                    if "ROOT_QUERY" in apollo_data:
                        keywords = self._find_keyword_list_in_dict(apollo_data["ROOT_QUERY"])
                        if keywords:
                            logger.info(f"[HTML-Apollo-Root] 매장 {place_id}의 키워드: {keywords[:5]}")
                            return keywords[:5]
                    
                    # 전체 apollo_data에서 재귀 검색
                    keywords = self._find_keyword_list_in_dict(apollo_data)
                    if keywords:
                        logger.info(f"[HTML-Apollo-Deep] 매장 {place_id}의 키워드: {keywords[:5]}")
                        return keywords[:5]
                
                # 방법 2: window.__PLACE_STATE__ 찾기
                place_state_patterns = [
                    r'window\.__PLACE_STATE__\s*=\s*({.*?});',
                    r'window\.place\s*=\s*({.*?});',
                    r'var\s+place\s*=\s*({.*?});'
                ]
                
                for pattern in place_state_patterns:
                    place_state_match = re.search(pattern, html, re.DOTALL)
                    if place_state_match:
                        try:
                            place_data = json.loads(place_state_match.group(1))
                            keywords = self._find_keyword_list_in_dict(place_data)
                            if keywords:
                                logger.info(f"[HTML-PlaceState] 매장 {place_id}의 키워드: {keywords[:5]}")
                                return keywords[:5]
                        except json.JSONDecodeError:
                            continue
                
                # 방법 3: 모든 JSON 스크립트 태그 검색
                script_patterns = [
                    r'<script[^>]*type="application/json"[^>]*>(.*?)</script>',
                    r'<script[^>]*>(.*?var\s+.*?=\s*{.*?keywordList.*?}.*?)</script>'
                ]
                
                for script_pattern in script_patterns:
                    script_matches = re.findall(script_pattern, html, re.DOTALL)
                    for script_content in script_matches:
                        try:
                            data = json.loads(script_content)
                            keywords = self._find_keyword_list_in_dict(data)
                            if keywords:
                                logger.info(f"[HTML-Script] 매장 {place_id}의 키워드: {keywords[:5]}")
                                return keywords[:5]
                        except json.JSONDecodeError:
                            continue
                
                logger.warning(f"[HTML] 매장 {place_id}의 keywordList를 찾을 수 없음")
                return []
                
        except Exception as e:
            logger.error(f"[HTML] 매장 {place_id} 키워드 추출 실패: {str(e)}")
            return []
    
    def _find_keyword_list_in_dict(self, data: Any, max_depth: int = 10, current_depth: int = 0) -> Optional[List[str]]:
        """재귀적으로 keywordList 찾기"""
        if current_depth > max_depth:
            return None
        
        if isinstance(data, dict):
            # 직접 keywordList가 있는지 확인
            if "keywordList" in data:
                keyword_list = data["keywordList"]
                if isinstance(keyword_list, list) and keyword_list:
                    return keyword_list
            
            # 자식 요소들을 재귀 탐색
            for value in data.values():
                result = self._find_keyword_list_in_dict(value, max_depth, current_depth + 1)
                if result:
                    return result
        
        elif isinstance(data, list):
            for item in data:
                result = self._find_keyword_list_in_dict(item, max_depth, current_depth + 1)
                if result:
                    return result
        
        return None
    
    async def analyze_top_stores_keywords(
        self, 
        query: str, 
        top_n: int = 15
    ) -> Dict:
        """
        검색 키워드로 상위 N개 매장의 대표 키워드 분석
        
        Args:
            query: 검색 키워드
            top_n: 분석할 상위 매장 수 (기본 15개)
            
        Returns:
            분석 결과 딕셔너리
        """
        try:
            # 1. 매장 검색
            from .naver_search_api_unofficial import search_service_api_unofficial
            
            logger.info(f"[키워드 분석] 검색 시작: '{query}' (상위 {top_n}개)")
            
            stores = await search_service_api_unofficial.search_stores(query, max_results=top_n)
            
            if not stores:
                logger.warning(f"[키워드 분석] 검색 결과 없음: {query}")
                return {
                    "status": "success",
                    "query": query,
                    "total_stores": 0,
                    "stores_analyzed": [],
                }
            
            # 상위 N개만 선택
            top_stores = stores[:top_n]
            logger.info(f"[키워드 분석] {len(top_stores)}개 매장 발견")
            
            # 2. 각 매장의 키워드 추출 (병렬 처리)
            tasks = []
            for idx, store in enumerate(top_stores, 1):
                task = self._analyze_store_with_rank(idx, store)
                tasks.append(task)
            
            # 병렬 실행
            analyzed_stores = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 에러 제거
            analyzed_stores = [
                store for store in analyzed_stores 
                if not isinstance(store, Exception) and store is not None
            ]
            
            logger.info(f"[키워드 분석] {len(analyzed_stores)}개 매장 분석 완료")
            
            return {
                "status": "success",
                "query": query,
                "total_stores": len(stores),
                "stores_analyzed": analyzed_stores,
            }
            
        except Exception as e:
            logger.error(f"[키워드 분석] 오류: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"키워드 분석 중 오류 발생: {str(e)}"
            )
    
    async def _analyze_store_with_rank(self, rank: int, store: Dict) -> Optional[Dict]:
        """매장 정보와 키워드 분석"""
        try:
            place_id = store.get("place_id", "")
            store_name = store.get("name", "")
            
            # GraphQL API로 대표 키워드 추출
            keywords = await self.get_place_keywords(place_id)
            
            # 키워드가 없으면 빈 리스트로 (카테고리 사용 안함)
            if not keywords:
                logger.info(f"[순위 {rank}] {store_name} ({place_id}): keywordList 없음")
                keywords = []
            else:
                logger.info(f"[순위 {rank}] {store_name} ({place_id}): {len(keywords)}개 키워드")
            
            return {
                "rank": rank,
                "place_id": place_id,
                "name": store_name,
                "category": store.get("category", ""),
                "address": store.get("address", ""),
                "thumbnail": store.get("thumbnail", ""),
                "rating": store.get("rating"),
                "review_count": store.get("visitor_review_count", "0"),
                "keywords": keywords[:5],  # 최대 5개
            }
            
        except Exception as e:
            logger.error(f"[순위 {rank}] 매장 분석 오류: {str(e)}")
            return None


# 싱글톤 인스턴스
keywords_analyzer_service = NaverKeywordsAnalyzerService()
