"""
AI 답글 생성 서비스 (OpenAI GPT-4o-mini 사용)
- PlaceAISettings 기반 맞춤형 답글 생성
- 친절함, 격식, 다양성, 길이 등 세밀한 제어
"""
import os
import logging
from typing import Dict, Any, Optional
from openai import AsyncOpenAI
from app.models.place_ai_settings import PlaceAISettings

logger = logging.getLogger(__name__)


class LLMReplyService:
    """AI 답글 생성 서비스"""
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다")
        
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = "gpt-4o-mini"
    
    def _build_custom_system_prompt(self, place_settings: PlaceAISettings, store_name: str = "저희 매장") -> str:
        """PlaceAISettings 기반 맞춤형 시스템 프롬프트"""
        
        # 친절함 수준
        if place_settings.friendliness >= 9:
            friendliness_level = "극도로 열정적이고 감동적인"
            friendliness_detail = "고객을 매우 특별하게 대우하고, 과도할 정도로 긍정적이며, 감탄사와 감사 표현을 풍부하게 사용한다."
        elif place_settings.friendliness >= 7:
            friendliness_level = "매우 따뜻하고 친절한"
            friendliness_detail = "고객에게 진심 어린 감사를 전하고, 개인적인 느낌을 주며, 따뜻한 표현을 자주 사용한다."
        elif place_settings.friendliness >= 5:
            friendliness_level = "적절히 친절한"
            friendliness_detail = "기본적인 예의를 갖추고 정중하게 대하되, 과하지 않게 감사를 표현한다."
        elif place_settings.friendliness >= 3:
            friendliness_level = "간결하고 사무적인"
            friendliness_detail = "필요한 내용만 간단히 전달하고, 감사 표현을 최소화하며, 효율적으로 작성한다."
        else:
            friendliness_level = "매우 간결하고 형식적인"
            friendliness_detail = "사무적이고 건조하게, 감정 표현 없이 필수 내용만 전달한다."
        
        # 격식 수준
        if place_settings.formality >= 9:
            formality_desc = "매우 격식있는 존댓말 사용 (예: ~입니다, ~하겠습니다, ~주시기 바랍니다)"
            formality_example = "예: '소중한 말씀 감사드립니다', '최선을 다하겠습니다'"
        elif place_settings.formality >= 7:
            formality_desc = "정중한 존댓말 사용 (예: ~해요, ~드려요, ~주세요)"
            formality_example = "예: '감사해요', '노력할게요', '방문해주세요'"
        elif place_settings.formality >= 5:
            formality_desc = "편안한 존댓말 사용 (예: ~요 체)"
            formality_example = "예: '고마워요', '좋았어요', '또 와요'"
        elif place_settings.formality >= 3:
            formality_desc = "친근한 반말 사용 (예: ~어, ~지, ~네)"
            formality_example = "예: '고마워', '좋았어', '또 와'"
        else:
            formality_desc = "매우 캐주얼한 반말 사용"
            formality_example = "예: '감사~', '굿!', '또 봐'"
        
        # 이모티콘
        if place_settings.use_text_emoticons:
            emoticon_instruction = "텍스트 이모티콘(^^, ㅎㅎ, :) 등)을 적극적으로 사용하여 친근함을 표현한다. (문장당 1-2개 정도)"
        else:
            emoticon_instruction = "이모티콘을 절대 사용하지 않고 텍스트만으로 표현한다."
        
        # 구체성
        if place_settings.mention_specifics:
            specifics_instruction = "리뷰에서 언급된 구체적인 내용(맛, 분위기, 서비스, 직원, 메뉴 등)을 반드시 1-2가지 이상 답글에 언급한다."
        else:
            specifics_instruction = "구체적인 내용보다는 전반적이고 일반적인 감사 인사 위주로 작성한다."
        
        # 브랜드 보이스
        brand_voice_map = {
            "warm": ("따뜻하고 감성적인", "고객의 감정에 공감하고, '감동', '기쁨', '행복' 같은 감성 단어를 사용"),
            "professional": ("전문적이고 신뢰감 있는", "정확하고 명확한 표현을 사용하며, 전문성과 책임감을 강조"),
            "casual": ("캐주얼하고 편안한", "일상적이고 자연스러운 표현을 사용하며, 부담 없는 분위기 조성"),
            "friendly": ("친근하고 활기찬", "밝고 에너지 넘치는 표현을 사용하며, 친구같은 느낌")
        }
        brand_voice_desc, brand_voice_detail = brand_voice_map.get(place_settings.brand_voice, ("따뜻한", "고객에게 따뜻하게 대응"))
        
        # 응답 스타일
        response_style_map = {
            "quick_thanks": ("신속한 감사 표현", "먼저 감사를 표현하고 간단히 마무리. 짧고 명확하게."),
            "empathy": ("공감과 이해", "고객의 경험과 감정에 깊이 공감하고, '~하셨군요', '~하셨다니' 같은 표현 사용"),
            "solution": ("해결책 제시", "개선 의지와 구체적인 노력을 강조하며, '~하겠습니다', '~할게요' 같은 약속 표현")
        }
        response_style_desc, response_style_detail = response_style_map.get(place_settings.response_style, ("감사", "감사 표현"))
        
        system_prompt = f"""[ROLE]
너는 네이버 플레이스 리뷰에 답글을 다는 "{store_name}" 매장 CS 담당자다. 리뷰를 정확히 읽고 이해한 뒤, {friendliness_level} 톤으로 답글을 작성한다.

[TONE & STYLE - 매우 중요!]
친절함 수준 ({place_settings.friendliness}/10): {friendliness_level}
→ {friendliness_detail}

격식 수준 ({place_settings.formality}/10): {formality_desc}
→ {formality_example}

브랜드 보이스: {brand_voice_desc}
→ {brand_voice_detail}

응답 스타일: {response_style_desc}
→ {response_style_detail}

이모티콘: {emoticon_instruction}

구체성: {specifics_instruction}

🔥 위 설정값들을 정확히 반영하여 답글의 톤, 어투, 길이, 내용이 명확히 달라져야 한다!

[실제 적용 예시]
친절함 1-3 (사무적): "방문 감사합니다. 의견 전달드리겠습니다."
친절함 7-8 (따뜻): "와주셔서 정말 반가웠어요^^ 좋은 말씀 너무 감사드려요!"
친절함 9-10 (열정): "정말정말 감사합니다!! 이렇게 좋은 리뷰를 남겨주시다니 저희에게는 최고의 선물이에요!!"

격식 1-3 (반말): "고마워! 또 와~"
격식 5-7 (존댓말): "감사해요! 또 방문해주세요^^"
격식 9-10 (격식): "진심으로 감사드립니다. 다음에도 방문해주시기 바랍니다."

🔥 설정값에 따라 위처럼 극명한 차이가 나야 한다!"""
        
        if place_settings.custom_instructions:
            system_prompt += f"\n\n[매장 특별 요청사항 - 일반]\n{place_settings.custom_instructions}"
        
        return system_prompt
    
    def _build_custom_system_prompt_negative(self, place_settings: PlaceAISettings, store_name: str = "저희 매장") -> str:
        """부정 리뷰용 시스템 프롬프트"""
        base_prompt = self._build_custom_system_prompt(place_settings, store_name)
        
        negative_instructions = """

[부정 리뷰 특별 대응 지침]
⚠️ 이 리뷰는 부정적입니다. 다음 원칙을 반드시 지켜주세요:

1. 진심 어린 사과: 고객의 불편함에 대해 먼저 진심으로 사과
2. 구체적 공감: 리뷰에 언급된 불편 사항을 구체적으로 언급하며 공감
3. 개선 약속: 문제 해결을 위한 구체적인 개선 의지 표현
4. 직접 소통 제안: 가능하면 직접 대화할 수 있는 채널 안내 (변명 X)
5. 보상/재방문 기회: 적절한 경우 재방문 혜택이나 보상 언급

❌ 금지사항:
- 고객 탓하기, 변명하기
- 일반적인 사과만 나열
- 너무 짧은 답글 (최소한 성의 있게)
- 과도한 긍정적 표현 (부정 리뷰에는 진중함 필요)"""
        
        result = base_prompt + negative_instructions
        
        if place_settings.custom_instructions_negative:
            result += f"\n\n[매장 특별 요청사항 - 부정 리뷰]\n{place_settings.custom_instructions_negative}"
        
        return result
    
    def _build_user_prompt(
        self, 
        review_content: str, 
        rating: Optional[float],
        author_name: str,
        place_settings: PlaceAISettings,
        sentiment: Optional[str] = None
    ) -> str:
        """유저 프롬프트 생성 (PlaceAISettings 반영)"""
        min_length = place_settings.reply_length_min
        max_length = place_settings.reply_length_max
        
        prompt_parts = [
            f"**리뷰 정보**",
            f"작성자: {author_name}"
        ]
        
        if rating:
            prompt_parts.append(f"별점: ⭐{rating}")
        
        prompt_parts.append(f"리뷰 내용:\n{review_content}")
        prompt_parts.append("\n**답글 작성 가이드**")
        prompt_parts.append(f"\n[LENGTH REQUIREMENT]")
        prompt_parts.append(f"- 답글 길이: {min_length}~{max_length}자 사이로 작성")
        prompt_parts.append(f"- 너무 짧거나 길지 않게, 이 범위 내에서 자연스럽게 작성")
        
        return "\n".join(prompt_parts)
    
    async def generate_reply(
        self,
        review_content: str,
        rating: Optional[float] = None,
        author_name: str = "고객",
        store_name: str = "저희 매장",
        category: str = "일반",
        sentiment: Optional[str] = None,
        place_settings: Optional[PlaceAISettings] = None
    ) -> Dict[str, Any]:
        """
        AI 답글 생성 (PlaceAISettings 지원)
        
        Args:
            review_content: 리뷰 내용
            rating: 별점 (1-5)
            author_name: 작성자 이름
            store_name: 매장명
            category: 업종
            sentiment: 감성 분석 결과 (positive/neutral/negative)
            place_settings: 매장별 AI 설정 (Optional)
        
        Returns:
            {
                "reply_text": "생성된 답글",
                "success": True/False,
                "error": "에러 메시지 (실패 시)"
            }
        """
        try:
            # 빈 리뷰 체크
            if not review_content or not review_content.strip():
                return {
                    "reply_text": "소중한 방문 감사드립니다! 다음에 또 뵙길 바랄게요 😊",
                    "success": True
                }
            
            logger.info(f"AI 답글 생성 시작: store={store_name}, rating={rating}, sentiment={sentiment}")
            
            # PlaceAISettings 기반 파라미터 설정
            if place_settings:
                temperature = place_settings.diversity
                max_tokens = int(place_settings.reply_length_max * 1.5)
                min_length = place_settings.reply_length_min
                max_length = place_settings.reply_length_max
                
                # 다양성에 따라 penalty 조정
                frequency_penalty = 0.5 + (place_settings.diversity * 0.4)
                presence_penalty = 0.3 + (place_settings.diversity * 0.4)
                
                # 부정 리뷰 (1-2점)는 특별 프롬프트
                if rating and rating <= 2:
                    system_prompt = self._build_custom_system_prompt_negative(place_settings, store_name)
                    logger.info(f"Using NEGATIVE review prompt for rating {rating}")
                else:
                    system_prompt = self._build_custom_system_prompt(place_settings, store_name)
                
                user_prompt = self._build_user_prompt(review_content, rating, author_name, place_settings, sentiment)
                
                logger.info(f"AI Parameters: temp={temperature}, freq_penalty={frequency_penalty:.2f}, presence_penalty={presence_penalty:.2f}")
                logger.info(f"Length range: {min_length}-{max_length}, max_tokens={max_tokens}")
            else:
                # 기본 설정
                temperature = 0.9
                max_tokens = 500
                frequency_penalty = 0.8
                presence_penalty = 0.6
                
                # 기본 프롬프트
                default_settings = PlaceAISettings()
                system_prompt = self._build_custom_system_prompt(default_settings, store_name)
                user_prompt = self._build_user_prompt(review_content, rating, author_name, default_settings, sentiment)
                
                logger.info("Using DEFAULT AI parameters")
            
            # OpenAI API 호출
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                frequency_penalty=frequency_penalty,
                presence_penalty=presence_penalty
            )
            
            reply_text = response.choices[0].message.content.strip()
            
            # 따옴표 제거
            reply_text = reply_text.strip('"\'')
            
            logger.info(f"AI 답글 생성 완료: {len(reply_text)}자")
            
            return {
                "reply_text": reply_text,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"AI 답글 생성 실패: {str(e)}", exc_info=True)
            return {
                "reply_text": "",
                "success": False,
                "error": str(e)
            }
    
    async def generate_replies_batch(
        self,
        reviews: list[Dict[str, Any]],
        store_name: str = "저희 매장",
        category: str = "일반",
        place_settings: Optional[PlaceAISettings] = None
    ) -> list[Dict[str, Any]]:
        """
        여러 리뷰에 대한 답글 일괄 생성 (PlaceAISettings 지원)
        
        Args:
            reviews: 리뷰 목록 (각각 content, rating, author_name, sentiment 포함)
            store_name: 매장명
            category: 업종
            place_settings: 매장별 AI 설정 (Optional)
        
        Returns:
            [{
                "naver_review_id": "...",
                "reply_text": "생성된 답글",
                "success": True/False
            }, ...]
        """
        results = []
        
        for idx, review in enumerate(reviews, 1):
            logger.info(f"배치 답글 생성 중... ({idx}/{len(reviews)})")
            
            result = await self.generate_reply(
                review_content=review.get("content", ""),
                rating=review.get("rating"),
                author_name=review.get("author_name", "고객"),
                store_name=store_name,
                category=category,
                sentiment=review.get("sentiment"),
                place_settings=place_settings
            )
            
            results.append({
                "naver_review_id": review.get("naver_review_id"),
                "reply_text": result.get("reply_text", ""),
                "success": result.get("success", False),
                "error": result.get("error")
            })
        
        return results
