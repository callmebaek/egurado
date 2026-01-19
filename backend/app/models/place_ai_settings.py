"""
Place AI Settings Model
매장별 AI 답글 생성 설정
"""

from pydantic import BaseModel, Field
from typing import Optional


class PlaceAISettings(BaseModel):
    """매장별 AI 답글 생성 설정"""
    
    friendliness: int = Field(default=7, ge=1, le=10, description="친절함 정도 (1-10)")
    formality: int = Field(default=7, ge=1, le=10, description="격식 수준 (1=반말, 10=격식)")
    reply_length_min: int = Field(default=100, ge=50, le=1200, description="최소 답글 길이")
    reply_length_max: int = Field(default=450, ge=50, le=1200, description="최대 답글 길이")
    diversity: float = Field(default=0.9, ge=0.5, le=1.0, description="다양성 (temperature)")
    use_text_emoticons: bool = Field(default=True, description="텍스트 이모티콘 사용 (^^, ㅎㅎ 등)")
    mention_specifics: bool = Field(default=True, description="리뷰 구체 내용 언급")
    brand_voice: str = Field(default="warm", description="브랜드 톤 (warm/professional/casual/friendly)")
    response_style: str = Field(default="quick_thanks", description="응답 스타일 (quick_thanks/empathy/solution)")
    custom_instructions: Optional[str] = Field(default=None, description="일반 리뷰 추가 요청사항")
    custom_instructions_negative: Optional[str] = Field(default=None, description="부정 리뷰 추가 요청사항")
