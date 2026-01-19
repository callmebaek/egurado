"""
Naver Local Search API Service
네이버 로컬 검색 API를 사용한 매장 검색 서비스
"""
import os
import logging
import re
from typing import List, Dict, Optional
import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class NaverLocalSearchService:
    """네이버 로컬 검색 API 서비스"""
    
    def __init__(self):
        self.client_id = os.getenv("NAVER_CLIENT_ID")
        self.client_secret = os.getenv("NAVER_CLIENT_SECRET")
        self.base_url = "https://openapi.naver.com/v1/search/local.json"
        
        if not self.client_id or not self.client_secret:
            logger.warning("Naver API credentials not found. API search will not work.")
    
    async def search_stores(self, query: str, display: int = 10) -> List[Dict[str, str]]:
        """
        네이버 로컬 검색 API로 매장 검색
        
        Args:
            query: 검색할 매장명
            display: 검색 결과 개수 (기본 10개, 최대 5개)
            
        Returns:
            매장 정보 리스트
        """
        if not self.client_id or not self.client_secret:
            raise ValueError("Naver API credentials are not configured")
        
        logger.info(f"[API Search] Starting search for: {query}")
        
        try:
            headers = {
                "X-Naver-Client-Id": self.client_id,
                "X-Naver-Client-Secret": self.client_secret,
            }
            
            params = {
                "query": query,
                "display": min(display, 5),  # 최대 5개
                "start": 1,
                "sort": "random"  # random 또는 comment (리뷰 많은 순)
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.base_url,
                    headers=headers,
                    params=params,
                    timeout=10.0
                )
                
                response.raise_for_status()
                data = response.json()
            
            logger.info(f"[API Search] API returned {data.get('total', 0)} total results")
            
            # 결과 파싱
            stores = []
            for idx, item in enumerate(data.get("items", [])):
                try:
                    # Place ID 추출 (link에서)
                    place_id = self._extract_place_id(item.get("link", ""))
                    
                    # HTML 태그 제거
                    name = self._remove_html_tags(item.get("title", ""))
                    category = item.get("category", "").split(">")[-1].strip()  # 마지막 카테고리만
                    address = item.get("address", "")
                    road_address = item.get("roadAddress", "")
                    
                    if place_id and name:
                        stores.append({
                            "place_id": place_id,
                            "name": name,
                            "category": category,
                            "address": address,
                            "road_address": road_address,
                            "thumbnail": "",  # API는 썸네일 제공 안 함
                        })
                        logger.info(f"[API Search] Parsed {idx + 1}: {name} (ID: {place_id})")
                    else:
                        logger.warning(f"[API Search] Could not extract place_id from: {item.get('link', '')}")
                        
                except Exception as e:
                    logger.warning(f"[API Search] Error parsing item {idx}: {str(e)}")
                    continue
            
            logger.info(f"[API Search] Successfully found {len(stores)} stores")
            return stores
            
        except httpx.HTTPStatusError as e:
            logger.error(f"[API Search] HTTP error: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=500,
                detail=f"네이버 API 오류: {e.response.status_code}"
            )
        except Exception as e:
            logger.error(f"[API Search] Error: {str(e)}", exc_info=True)
            raise
    
    def _extract_place_id(self, link: str) -> Optional[str]:
        """
        네이버 플레이스 링크에서 Place ID 추출
        
        예시 링크:
        - https://place.map.naver.com/place/1234567890
        - http://place.map.naver.com/restaurant/1234567890
        """
        if not link:
            return None
        
        # 패턴 1: /place/숫자
        match = re.search(r'/place/(\d+)', link)
        if match:
            return match.group(1)
        
        # 패턴 2: /restaurant/숫자 또는 /cafe/숫자 등
        match = re.search(r'/[a-z]+/(\d+)', link)
        if match:
            return match.group(1)
        
        # 패턴 3: ?id=숫자
        match = re.search(r'[?&]id=(\d+)', link)
        if match:
            return match.group(1)
        
        return None
    
    def _remove_html_tags(self, text: str) -> str:
        """HTML 태그 제거 (<b>, </b> 등)"""
        if not text:
            return ""
        return re.sub(r'<[^>]+>', '', text)


# 싱글톤 인스턴스
api_search_service = NaverLocalSearchService()
