"""LLM 기반 경쟁 매장 분석 및 개선 권장사항 생성 서비스"""
import os
import logging
from typing import Dict, Any, List
from openai import AsyncOpenAI
import json

logger = logging.getLogger(__name__)


class LLMRecommendationService:
    """ChatGPT를 활용한 개선 권장사항 생성"""
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("[LLM] OPENAI_API_KEY 환경변수가 설정되지 않았습니다")
            self.client = None
        else:
            self.client = AsyncOpenAI(api_key=api_key)
    
    async def generate_detailed_recommendations(
        self,
        my_store: Dict[str, Any],
        competitors: List[Dict[str, Any]],
        gaps: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        LLM을 활용하여 상세한 개선 권장사항 생성
        
        Args:
            my_store: 우리 매장 정보
            competitors: 경쟁 매장 목록
            gaps: 비교 분석 결과
            
        Returns:
            상세 개선 권장사항 리스트
        """
        if not self.client:
            logger.warning("[LLM] OpenAI 클라이언트가 초기화되지 않아 기본 권장사항 반환")
            return self._generate_fallback_recommendations(gaps)
        
        try:
            # 새로오픈은 제외 (개선 불가능)
            new_business_count = sum(1 for c in competitors if c.get("is_new_business", False))
            new_business_rate = (new_business_count / len(competitors) * 100) if competitors else 0
            
            # LLM에게 전달할 요약 정보 구성
            analysis_summary = self._create_analysis_summary(my_store, competitors, gaps, new_business_rate)
            
            # ChatGPT 호출
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",  # gpt-4o-mini 사용
                messages=[
                    {
                        "role": "system",
                        "content": """당신은 네이버 플레이스 마케팅 전문가입니다. 
경쟁 매장 분석 데이터를 바탕으로 실행 가능한 개선 권장사항을 제시합니다.

권장사항은 다음 형식의 JSON 객체로 응답해주세요:
{
  "recommendations": [
    {
      "priority": "high|medium|low",
      "category": "카테고리명",
      "title": "개선 권장사항 제목",
      "description": "상세 설명 (구체적인 수치와 액션 포함)",
      "impact": "high|medium|low"
    }
  ]
}

주의사항:
- "새로오픈"은 신규 매장만 받을 수 있으므로 개선 권장사항에서 제외
- 상위 20위에 새로오픈 매장이 많으면 별도로 언급 (경쟁 요인으로 분석)
- 구체적인 수치와 실행 가능한 액션 제시
- 우선순위는 impact와 실행 난이도를 고려하여 설정"""
                    },
                    {
                        "role": "user",
                        "content": f"""다음 데이터를 분석하여 개선 권장사항을 생성해주세요:

{analysis_summary}

최대 7개의 실행 가능한 권장사항을 제시해주세요."""
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=2000,
            )
            
            # 응답 파싱
            content = response.choices[0].message.content
            logger.info(f"[LLM] 응답 받음: {len(content)}자")
            logger.info(f"[LLM] 응답 내용: {content[:500]}")  # 디버깅용
            
            result = json.loads(content)
            
            # JSON 구조 확인
            if "recommendations" in result:
                recommendations = result["recommendations"]
            elif isinstance(result, list):
                recommendations = result
            else:
                logger.warning(f"[LLM] 예상치 못한 JSON 구조: {result}")
                recommendations = [result]
            
            logger.info(f"[LLM] 파싱된 권장사항 개수: {len(recommendations)}")
            
            # 새로오픈 관련 별도 인사이트 추가
            if new_business_rate > 30:
                recommendations.insert(0, {
                    "priority": "medium",
                    "category": "market_insight",
                    "title": "경쟁 키워드에 신규 매장 다수 포함",
                    "description": f"상위 20위 중 {new_business_count}개({new_business_rate:.0f}%)가 새로오픈 매장입니다. "
                                   f"네이버는 신규 매장에 초기 노출 부스트를 제공하므로, 이들은 시간이 지나면 순위가 하락할 가능성이 있습니다. "
                                   f"우리 매장은 장기적 관점에서 꾸준한 리뷰 확보와 콘텐츠 업데이트에 집중하세요.",
                    "impact": "medium"
                })
            
            logger.info(f"[LLM] 개선 권장사항 {len(recommendations)}개 생성 완료")
            return recommendations[:7]  # 최대 7개
            
        except Exception as e:
            logger.error(f"[LLM] 개선 권장사항 생성 실패: {str(e)}")
            return self._generate_fallback_recommendations(gaps)
    
    def _create_analysis_summary(
        self,
        my_store: Dict[str, Any],
        competitors: List[Dict[str, Any]],
        gaps: Dict[str, Any],
        new_business_rate: float
    ) -> str:
        """분석 데이터를 LLM에게 전달할 요약 텍스트로 변환"""
        
        # 경쟁사 평균 (Top 5 & Top 20)
        comp_avg_score_top5 = gaps["diagnosis_score"]["competitor_avg_top5"]
        comp_avg_score_top20 = gaps["diagnosis_score"]["competitor_avg_top20"]
        comp_avg_visitor_top5 = gaps["visitor_reviews_7d_avg"]["competitor_avg_top5"]
        comp_avg_visitor_top20 = gaps["visitor_reviews_7d_avg"]["competitor_avg_top20"]
        comp_avg_blog_top5 = gaps["blog_reviews_7d_avg"]["competitor_avg_top5"]
        comp_avg_blog_top20 = gaps["blog_reviews_7d_avg"]["competitor_avg_top20"]
        comp_avg_announcements_top5 = gaps["announcements_7d"]["competitor_avg_top5"]
        comp_avg_announcements_top20 = gaps["announcements_7d"]["competitor_avg_top20"]
        
        # 우리 매장
        my_score = gaps["diagnosis_score"]["my_value"]
        my_visitor = gaps["visitor_reviews_7d_avg"]["my_value"]
        my_blog = gaps["blog_reviews_7d_avg"]["my_value"]
        my_announcements = gaps["announcements_7d"]["my_value"]
        
        # 비율
        coupon_rate = gaps["has_coupon"]["competitor_rate"]
        place_plus_rate = gaps["is_place_plus"]["competitor_rate"]
        naverpay_rate = gaps["supports_naverpay"]["competitor_rate"]
        
        # 우리 매장 상태
        my_coupon = gaps["has_coupon"]["my_value"]
        my_place_plus = gaps["is_place_plus"]["my_value"]
        my_naverpay = gaps["supports_naverpay"]["my_value"]
        
        summary = f"""
## 우리 매장 정보
- 매장명: {my_store.get('name', 'N/A')}
- 업종: {my_store.get('category', 'N/A')}
- 진단 점수: {my_score}점 (등급: {my_store.get('diagnosis_grade', 'N/A')})

## 경쟁사 비교
### 진단 점수
- 우리: {my_score}점
- 경쟁사 평균 (Top 5): {comp_avg_score_top5}점 (차이: {gaps['diagnosis_score']['gap_top5']:+.1f}점)
- 경쟁사 평균 (Top 20): {comp_avg_score_top20}점 (차이: {gaps['diagnosis_score']['gap_top20']:+.1f}점)

### 리뷰 활동 (7일 평균)
- 방문자 리뷰:
  * 우리: {my_visitor:.1f}개/일
  * 경쟁사 평균 (Top 5): {comp_avg_visitor_top5:.1f}개/일 (차이: {gaps['visitor_reviews_7d_avg']['gap_top5']:+.1f})
  * 경쟁사 평균 (Top 20): {comp_avg_visitor_top20:.1f}개/일 (차이: {gaps['visitor_reviews_7d_avg']['gap_top20']:+.1f})
- 블로그 리뷰:
  * 우리: {my_blog:.1f}개/일
  * 경쟁사 평균 (Top 5): {comp_avg_blog_top5:.1f}개/일 (차이: {gaps['blog_reviews_7d_avg']['gap_top5']:+.1f})
  * 경쟁사 평균 (Top 20): {comp_avg_blog_top20:.1f}개/일 (차이: {gaps['blog_reviews_7d_avg']['gap_top20']:+.1f})

### 운영 활동
- 공지사항 (7일):
  * 우리: {my_announcements}개
  * 경쟁사 평균 (Top 5): {comp_avg_announcements_top5:.1f}개 (차이: {gaps['announcements_7d']['gap_top5']:+.1f})
  * 경쟁사 평균 (Top 20): {comp_avg_announcements_top20:.1f}개 (차이: {gaps['announcements_7d']['gap_top20']:+.1f})

### 부가 서비스
- 쿠폰: 우리 {'있음' if my_coupon else '없음'} | 경쟁사 {coupon_rate:.0f}% 사용 중
- 플레이스 플러스: 우리 {'가입' if my_place_plus else '미가입'} | 경쟁사 {place_plus_rate:.0f}% 가입
- 네이버페이: 우리 {'지원' if my_naverpay else '미지원'} | 경쟁사 {naverpay_rate:.0f}% 지원

### 시장 인사이트
- 상위 20위 중 새로오픈 매장 비율: {new_business_rate:.0f}%
- 분석 대상: {len(competitors)}개 경쟁 매장
"""
        
        return summary
    
    def _generate_fallback_recommendations(self, gaps: Dict[str, Any]) -> List[Dict[str, Any]]:
        """LLM 사용 불가 시 기본 권장사항 생성"""
        recommendations = []
        
        # 진단 점수 (Top 20 기준)
        if gaps["diagnosis_score"]["status_top20"] == "bad":
            recommendations.append({
                "priority": "high",
                "category": "overall",
                "title": "전체 플레이스 진단 점수 개선 필요",
                "description": f"상위 20개 경쟁매장 평균({gaps['diagnosis_score']['competitor_avg_top20']:.1f}점) 대비 {abs(gaps['diagnosis_score']['gap_top20']):.1f}점 낮습니다.",
                "impact": "high"
            })
        
        # 방문자 리뷰 (Top 20 기준)
        if gaps["visitor_reviews_7d_avg"]["status_top20"] == "bad":
            recommendations.append({
                "priority": "high",
                "category": "reviews",
                "title": "방문자 리뷰 활성화 필요",
                "description": f"상위 20개 경쟁매장은 일평균 {gaps['visitor_reviews_7d_avg']['competitor_avg_top20']:.1f}개의 리뷰를 받고 있습니다.",
                "impact": "high"
            })
        
        # 쿠폰
        if not gaps["has_coupon"]["my_value"] and gaps["has_coupon"]["competitor_rate"] > 50:
            recommendations.append({
                "priority": "high",
                "category": "coupon",
                "title": "쿠폰 발행 권장",
                "description": f"경쟁매장의 {gaps['has_coupon']['competitor_rate']:.0f}%가 쿠폰을 사용하고 있습니다.",
                "impact": "high"
            })
        
        return recommendations


# 싱글톤 인스턴스
llm_recommendation_service = LLMRecommendationService()
