"""네이버 플레이스 추가 정보 조회 서비스 (프로모션, 공지사항 등)"""
import httpx
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class NaverAdditionalInfoService:
    """네이버 플레이스 추가 정보 조회 서비스"""
    
    def __init__(self):
        self.api_url = "https://api.place.naver.com/graphql"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Origin": "https://m.place.naver.com",
            "Referer": "https://m.place.naver.com/",
        }
    
    async def get_all_additional_info(self, place_id: str) -> Dict[str, Any]:
        """모든 추가 정보를 한 번에 가져오기"""
        result = {}
        
        # 프로모션 정보
        promotions = await self.get_promotions(place_id)
        if promotions:
            result["promotions"] = promotions
        
        # 공지사항
        announcements = await self.get_announcements(place_id)
        if announcements:
            result["announcements"] = announcements
        
        # AI 브리핑 (업체소개글로 사용)
        ai_briefing = await self.get_ai_briefing(place_id)
        if ai_briefing:
            result["ai_briefing"] = ai_briefing
        
        return result
    
    async def get_promotions(self, place_id: str) -> Dict[str, Any]:
        """프로모션/쿠폰 정보 조회"""
        try:
            query = {
                "operationName": "getPromotions",
                "variables": {
                    "channelId": place_id,
                    "input": {
                        "channelId": place_id
                    },
                    "isBooking": False
                },
                "query": """
                query getPromotions($channelId: String, $input: PromotionInput, $isBooking: Boolean!) {
                  naverTalk @skip(if: $isBooking) {
                    alarm(channelId: $channelId) {
                      friendYn
                      validation
                    }
                  }
                  promotionCoupons(input: $input) {
                    total
                    coupons {
                      promotionSeq
                      placeSeq
                      couponSeq
                      userCouponSeq
                      promotionTitle
                      conditionType
                      couponUseType
                      title
                      description
                      type
                      expiredDateDescription
                      status
                      downloadableCountInfo
                      expiredPeriodInfo
                      subExpiredPeriodInfo
                      usedConditionInfos
                      couponButtonText
                      daysBeforeCouponStartDate
                    }
                  }
                }
                """
            }
            
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    self.api_url,
                    json=query,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if "errors" not in data:
                        promotion_data = data.get("data", {}).get("promotionCoupons", {})
                        total = promotion_data.get("total", 0)
                        coupons = promotion_data.get("coupons", [])
                        
                        logger.info(f"[추가정보] 프로모션: {total}개")
                        
                        return {
                            "total": total,
                            "coupons": coupons,
                            "has_naver_talk": data.get("data", {}).get("naverTalk", {}).get("alarm", {}).get("friendYn", False)
                        }
            
            return {"total": 0, "coupons": []}
            
        except Exception as e:
            logger.error(f"[추가정보] 프로모션 조회 실패: {str(e)}")
            return {"total": 0, "coupons": []}
    
    async def get_announcements(self, place_id: str, business_type: str = "restaurant") -> List[Dict[str, Any]]:
        """공지사항 조회"""
        try:
            query = {
                "operationName": "getAnnouncements",
                "variables": {
                    "businessId": place_id,
                    "businessType": business_type,
                    "deviceType": "mobile"
                },
                "query": """
                query getAnnouncements($businessId: String!, $businessType: String!, $deviceType: String!) {
                  announcements: announcementsViaCP0(
                    businessId: $businessId
                    businessType: $businessType
                    deviceType: $deviceType
                  ) {
                    feedId
                    category
                    categoryI18n
                    title
                    relativeCreated
                    period
                    thumbnail {
                      url
                      count
                      isVideo
                    }
                    url
                    isNews
                  }
                }
                """
            }
            
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    self.api_url,
                    json=query,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if "errors" not in data:
                        announcements = data.get("data", {}).get("announcements", [])
                        logger.info(f"[추가정보] 공지사항: {len(announcements)}개")
                        return announcements
            
            return []
            
        except Exception as e:
            logger.error(f"[추가정보] 공지사항 조회 실패: {str(e)}")
            return []
    
    async def get_ai_briefing(self, place_id: str) -> Dict[str, Any]:
        """AI 브리핑 조회 (업체소개글로 사용)"""
        try:
            query = {
                "operationName": "getAiBriefing",
                "variables": {
                    "input": {
                        "businessId": place_id
                    }
                },
                "query": """
                query getAiBriefing($input: AiBriefingInput) {
                  aiBriefing(input: $input) {
                    textSummaries {
                      sentence
                    }
                    imageSummaries {
                      code
                      caption
                      imageUrl
                    }
                    relatedQueries {
                      category
                      query
                    }
                  }
                }
                """
            }
            
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    self.api_url,
                    json=query,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if "errors" not in data:
                        data_obj = data.get("data") or {}
                        briefing = data_obj.get("aiBriefing") or {}
                        
                        # 텍스트 요약들을 하나의 문자열로 합치기
                        text_summaries = briefing.get("textSummaries") or []
                        description = " ".join([s.get("sentence", "") for s in text_summaries if s and s.get("sentence")])
                        
                        image_summaries = briefing.get("imageSummaries") or []
                        related_queries = briefing.get("relatedQueries") or []
                        
                        logger.info(f"[추가정보] AI 브리핑: 텍스트 {len(text_summaries)}개, 이미지 {len(image_summaries)}개")
                        
                        return {
                            "description": description,
                            "text_summaries": text_summaries,
                            "image_summaries": image_summaries,
                            "related_queries": related_queries
                        }
            
            return {}
            
        except Exception as e:
            logger.error(f"[추가정보] AI 브리핑 조회 실패: {str(e)}")
            return {}


# 싱글톤 인스턴스
additional_info_service = NaverAdditionalInfoService()
