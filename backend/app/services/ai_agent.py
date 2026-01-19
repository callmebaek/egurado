"""
AI Agent - OpenAI 기반 리뷰 분석 및 답글 생성
"""
import os
from typing import Literal, Optional
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

# OpenAI 클라이언트
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class AIAgent:
    """AI 에이전트 클래스"""
    
    @staticmethod
    async def analyze_review_sentiment(
        review_text: str
    ) -> Literal['positive', 'neutral', 'negative']:
        """
        리뷰 감정 분석
        
        Args:
            review_text: 리뷰 내용
            
        Returns:
            str: 'positive', 'neutral', 'negative' 중 하나
        """
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "당신은 고객 리뷰 감정 분석 전문가입니다. "
                            "리뷰를 읽고 긍정(positive), 중립(neutral), 부정(negative) 중 하나로 분류하세요. "
                            "오직 'positive', 'neutral', 'negative' 단어만 응답하세요."
                        )
                    },
                    {
                        "role": "user",
                        "content": f"다음 리뷰의 감정을 분석하세요:\n\n{review_text}"
                    }
                ],
                temperature=0.3,
                max_tokens=10
            )
            
            sentiment = response.choices[0].message.content.strip().lower()
            
            # 유효성 검증
            if sentiment not in ['positive', 'neutral', 'negative']:
                # 기본값으로 neutral 반환
                print(f"⚠️ 예상치 못한 감정 분류 결과: {sentiment}, 기본값 'neutral' 사용")
                return 'neutral'
            
            return sentiment
            
        except Exception as e:
            print(f"❌ 감정 분석 실패: {e}")
            return 'neutral'
    
    @staticmethod
    async def generate_review_reply(
        review_text: str,
        rating: int,
        store_name: str,
        sentiment: Optional[str] = None
    ) -> str:
        """
        AI 답글 생성
        
        Args:
            review_text: 리뷰 내용
            rating: 평점 (1-5)
            store_name: 매장명
            sentiment: 감정 분류 (선택사항)
            
        Returns:
            str: 생성된 답글
        """
        try:
            # 감정이 제공되지 않으면 자동 분석
            if sentiment is None:
                sentiment = await AIAgent.analyze_review_sentiment(review_text)
            
            # 감정에 따른 프롬프트 조정
            if sentiment == 'negative':
                tone_guide = (
                    "부정적인 리뷰이므로, 고객의 불편함을 진심으로 공감하고 사과하며, "
                    "구체적인 개선 의지를 표명하세요."
                )
            elif sentiment == 'positive':
                tone_guide = (
                    "긍정적인 리뷰이므로, 고객의 칭찬에 감사하며, "
                    "리뷰에서 언급된 긍정적인 부분을 구체적으로 언급하세요."
                )
            else:
                tone_guide = (
                    "중립적인 리뷰이므로, 방문에 감사하며, "
                    "다음 방문 시 더 나은 경험을 제공하겠다는 의지를 보여주세요."
                )
            
            prompt = f"""
당신은 '{store_name}' 매장의 사장님입니다. 10년 경력의 베테랑 마케터이자 고객 응대 전문가입니다.

고객 리뷰:
평점: {rating}/5
내용: {review_text}

위 리뷰에 대해 다음 원칙으로 답글을 작성해주세요:

1. {tone_guide}
2. 진심 어린 감사 표현
3. 리뷰 내용 중 구체적인 부분 언급
4. 2-3문장, 친근하지만 정중한 말투 (존댓말 사용)
5. 이모지 1-2개를 자연스럽게 사용
6. 과도한 사과나 변명은 피하고, 진정성 있는 응답

답글만 작성하세요. 다른 설명은 불필요합니다.
"""
            
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=250
            )
            
            reply = response.choices[0].message.content.strip()
            return reply
            
        except Exception as e:
            print(f"❌ AI 답글 생성 실패: {e}")
            # 기본 답글 반환
            return f"소중한 리뷰 감사합니다. 더 나은 서비스로 보답하겠습니다. 😊"
    
    @staticmethod
    async def batch_analyze_sentiments(reviews: list[str]) -> list[str]:
        """
        여러 리뷰의 감정 일괄 분석
        
        Args:
            reviews: 리뷰 텍스트 리스트
            
        Returns:
            list[str]: 감정 분류 결과 리스트
        """
        import asyncio
        
        tasks = [AIAgent.analyze_review_sentiment(review) for review in reviews]
        sentiments = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 예외 처리
        results = []
        for sentiment in sentiments:
            if isinstance(sentiment, Exception):
                results.append('neutral')
            else:
                results.append(sentiment)
        
        return results
    
    @staticmethod
    async def generate_keyword_insights(
        keyword: str,
        rank: int,
        competitors: list[str]
    ) -> str:
        """
        키워드 순위 분석 인사이트 생성
        
        Args:
            keyword: 검색 키워드
            rank: 현재 순위
            competitors: 경쟁 매장 목록
            
        Returns:
            str: 분석 인사이트
        """
        try:
            prompt = f"""
당신은 네이버 플레이스 SEO 전문가입니다.

키워드: "{keyword}"
현재 순위: {rank}위
경쟁 매장: {', '.join(competitors[:5]) if competitors else '정보 없음'}

위 정보를 바탕으로:
1. 현재 순위에 대한 평가
2. 순위 개선을 위한 구체적인 실행 방안 3가지
3. 경쟁 매장 대비 차별화 전략

한국어로 간결하게 작성하세요 (300자 이내).
"""
            
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=400
            )
            
            insight = response.choices[0].message.content.strip()
            return insight
            
        except Exception as e:
            print(f"❌ 키워드 인사이트 생성 실패: {e}")
            return "순위 개선을 위해 리뷰 관리, 소식 업데이트, 사진 등록을 꾸준히 진행하세요."


# 간편 함수
async def analyze_sentiment(review_text: str) -> str:
    """리뷰 감정 분석 (간편 함수)"""
    return await AIAgent.analyze_review_sentiment(review_text)


async def generate_reply(review_text: str, rating: int, store_name: str) -> str:
    """AI 답글 생성 (간편 함수)"""
    return await AIAgent.generate_review_reply(review_text, rating, store_name)


