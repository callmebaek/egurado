"""
리뷰 감성 분석 서비스 (OpenAI GPT-4 사용)
- 긍정/중립/부정 판정
- 리뷰 온도 (0-100)
- 근거 추출
- 항목별 감성
"""
import os
import json
import logging
import asyncio
import re
from typing import Dict, Any, List, Optional
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


class ReviewSentimentService:
    """리뷰 감성 분석 서비스"""
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다")
        
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = "gpt-4o-mini"  # 빠르고 저렴한 모델
    
    def _build_system_prompt(self) -> str:
        """시스템 프롬프트 생성"""
        return """[ROLE / SYSTEM]
너는 한국 로컬 비즈니스(식당/카페/사진관/미용/병원 등) 리뷰를 분석하는 "감성(센티먼트) 판정 전문가"다.
목표는 리뷰 텍스트만으로 (1) 긍정/중립/부정 라벨, (2) 감정 강도(리뷰 온도), (3) 근거, (4) 항목별(맛/서비스/가격 등) 감성을 일관되게 산출하는 것이다.
절대 리뷰에 없는 사실을 지어내지 말고, 애매하면 중립 또는 혼합으로 처리하며 낮은 확신도로 표시하라.

[INPUT]
- review_text: 사용자가 작성한 원문 리뷰(이모지/줄바꿈/비속어/반말/영어 혼합 포함 가능)
- (선택) rating: 별점(0~5). 없으면 null.
- (선택) context: 업종(예: 사진관/카페/식당 등). 없으면 null.

[CORE TASK]
1) 리뷰 전체의 감성을 "positive / neutral / negative" 중 하나로 분류하라.
2) 리뷰 온도(temperature_score)를 0~100 정수로 산출하라.
   - 0에 가까울수록 매우 부정(격한 불만), 100에 가까울수록 매우 긍정(강한 만족)
   - 50은 중립/무감정/정보 전달
3) 감성 근거를 review_text에서 "짧은 인용구(evidence_quotes)"로 2~4개 추출하라. (원문 그대로, 짧게)
4) 가능하면 항목별(aspects) 감성을 추정하라:
   - taste_or_quality(품질/결과물/맛)
   - service(응대/친절)
   - price_value(가격/가성비)
   - cleanliness(청결)
   - ambience(분위기)
   - waiting_time(대기/시간)
   - accessibility(위치/접근성/주차)
   - others(기타)
   항목 언급이 없으면 "not_mentioned"로 둔다.

[DECISION RULES - VERY IMPORTANT]
A. 라벨(positive/neutral/negative) 기준
- positive: 명시적 칭찬, 재방문/추천, 만족 표현이 우세
- negative: 명시적 불만, 비추천/재방문 의사 없음, 불쾌/분노 표현이 우세
- neutral: 감정 표현이 약하거나, 정보 전달 중심이거나, 긍/부정이 비슷하게 섞여 전체 판단이 애매
- 혼합 리뷰(좋은 점+나쁜 점)가 있어도 "우세한 방향"으로 라벨을 1개만 고르되,
  우세 판단이 어려우면 neutral로 둔다.

B. 온도(0~100) 산출 가이드
1) 기본값 설정:
- positive 계열: 65에서 시작
- neutral 계열: 50에서 시작
- negative 계열: 35에서 시작

2) 강도 조정(가감점, 누적):
[긍정 강화]
- "최고/완벽/인생/미쳤다/감동/대만족/강추/무조건/또 갈게요" 등 강한 표현: +10~+25
- 재방문/재예약/주변 추천/단골 선언: +8~+15
- 느낌표, 반복 글자("진짜아아"), 강한 긍정 이모지(😍🥹🔥👍): +2~+8
- 구체적 칭찬(무엇이 어떻게 좋았는지): +3~+10

[부정 강화]
- "최악/다신 안 감/환불/사기/불친절/엉망/기분 나쁨/실망" 등 강한 표현: -10~-25
- 시간/돈/약속 관련 심각한 불만(지각, 노쇼 처리, 추가금 강요, 오배송/누락 등): -8~-18
- 강한 부정 이모지(😡🤬👎), 비속어, 대문자 강조, 느낌표 연속: -2~-10
- 구체적 피해/상세 불만(무엇이 어떻게 문제였는지): -3~-12

[중립/완화]
- "그냥/무난/보통/괜찮음"처럼 약한 표현: 45~60 근처로 수렴
- "좋긴 한데~", "아쉽지만~", "나쁘진 않음" 같은 완충/양가 표현: 강도를 중간으로 낮춤(50 근처로)
- 리뷰가 너무 짧아 판단 근거가 빈약: 45~55 + confidence 낮게

3) 별점(rating)이 있는 경우(선택 적용):
- rating이 4.5~5.0: 온도 최소 75 이상이 되도록 보정(단, 리뷰 내용이 명백히 부정이면 보정 금지)
- rating이 3.0: 45~60 근처로 보정
- rating이 1.0~2.0: 온도 최대 35 이하가 되도록 보정(단, 리뷰 내용이 명백히 긍정이면 보정 금지)
※ 텍스트가 별점과 충돌하면 "텍스트 우선"이며, conflict 플래그를 true로 표시

C. 빈정거림/반어/모순 처리
- "맛있네요^^(비꼼)", "친절하시더라고요 ㅎㅎ(불만 문맥)" 등 반어가 의심되면
  문맥(뒤 문장 불만, 부정 단어, 별점, 이모지)으로 재판단하고 confidence를 낮춰라.
- "좋았는데 …" 이후 부정이 길고 구체적이면 negative 쪽으로 우세 판단.

[OUTPUT FORMAT]
JSON 형태로 응답하라:
{
  "sentiment": "positive" | "neutral" | "negative",
  "temperature_score": 0-100 정수,
  "confidence": 0.0-1.0 실수,
  "evidence_quotes": ["인용구1", "인용구2", ...],
  "aspect_sentiments": {
    "taste_or_quality": "positive" | "neutral" | "negative" | "not_mentioned",
    "service": "positive" | "neutral" | "negative" | "not_mentioned",
    "price_value": "positive" | "neutral" | "negative" | "not_mentioned",
    "cleanliness": "positive" | "neutral" | "negative" | "not_mentioned",
    "ambience": "positive" | "neutral" | "negative" | "not_mentioned",
    "waiting_time": "positive" | "neutral" | "negative" | "not_mentioned",
    "accessibility": "positive" | "neutral" | "negative" | "not_mentioned",
    "others": "positive" | "neutral" | "negative" | "not_mentioned"
  },
  "reasoning": "판단 근거 1-2문장"
}
"""
    
    async def analyze_review(
        self,
        review_text: str,
        rating: Optional[float] = None,
        context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        단일 리뷰 감성 분석
        
        Args:
            review_text: 리뷰 본문
            rating: 별점 (선택)
            context: 업종 정보 (선택)
        
        Returns:
            {
                "sentiment": "positive/neutral/negative",
                "temperature_score": 0-100,
                "confidence": 0.0-1.0,
                "evidence_quotes": [...],
                "aspect_sentiments": {...}
            }
        """
        if not review_text or not review_text.strip():
            logger.warning("빈 리뷰 텍스트")
            return self._get_default_analysis()
        
        user_prompt = f"""리뷰 분석을 요청합니다:

리뷰 텍스트: "{review_text}"
별점: {rating if rating else "없음"}
업종: {context if context else "알 수 없음"}

위 리뷰를 분석하여 JSON 형태로 응답해주세요."""
        
        # Rate Limit 재시도 로직
        MAX_RETRIES = 5
        
        for attempt in range(MAX_RETRIES):
            try:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self._build_system_prompt()},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.3,  # 일관성을 위해 낮게 설정
                    response_format={"type": "json_object"}
                )
                
                content = response.choices[0].message.content
                result = json.loads(content)
                
                logger.info(f"감성 분석 완료: {result.get('sentiment')} ({result.get('temperature_score')})")
                return result
                
            except Exception as e:
                error_str = str(e).lower()
                
                # Rate Limit 에러인 경우
                if ("rate_limit" in error_str or "429" in error_str) and attempt < MAX_RETRIES - 1:
                    # 에러 메시지에서 대기 시간 추출
                    wait_time = self._extract_retry_time(str(e))
                    if wait_time is None:
                        wait_time = (2 ** attempt)  # Exponential backoff: 1, 2, 4, 8초
                    
                    logger.warning(f"[WARN] Rate Limit 감지, {wait_time}초 후 재시도 ({attempt + 1}/{MAX_RETRIES})")
                    await asyncio.sleep(wait_time)
                    continue
                elif attempt < MAX_RETRIES - 1:
                    # 다른 에러는 1초 대기 후 재시도
                    logger.warning(f"[WARN] 감성 분석 에러, 1초 후 재시도 ({attempt + 1}/{MAX_RETRIES}): {str(e)}")
                    await asyncio.sleep(1)
                    continue
                else:
                    # 최대 재시도 횟수 도달
                    logger.error(f"[ERROR] 감성 분석 실패 (재시도 {MAX_RETRIES}회 초과): {str(e)}")
                    return self._get_default_analysis()
        
        return self._get_default_analysis()
    
    def _extract_retry_time(self, error_message: str) -> Optional[float]:
        """
        에러 메시지에서 재시도 시간 추출
        예: "Please try again in 389ms" → 0.389초
        """
        match = re.search(r'try again in (\d+)ms', error_message)
        if match:
            return int(match.group(1)) / 1000  # ms를 초로 변환
        
        match = re.search(r'try again in ([\d.]+)s', error_message)
        if match:
            return float(match.group(1))
        
        return None
    
    async def analyze_reviews_batch(
        self,
        reviews: List[Dict[str, Any]],
        context: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        여러 리뷰 배치 분석 (안전한 병렬 처리)
        
        Args:
            reviews: 리뷰 목록 (각각 text, rating 포함)
            context: 업종 정보
        
        Returns:
            분석 결과 목록
        """
        async def analyze_single_review(review: Dict[str, Any]) -> Dict[str, Any]:
            """단일 리뷰 분석"""
            text = review.get("content", "")
            rating = review.get("rating")
            
            analysis = await self.analyze_review(text, rating, context)
            
            # 원본 리뷰 정보와 분석 결과 병합
            return {**review, **analysis}
        
        # 배치 크기 설정 (Rate Limit 회피를 위해 2개씩 처리)
        BATCH_SIZE = 2
        BATCH_DELAY = 1.5  # 배치 간 1.5초 대기 (Rate Limit 완화)
        results = []
        
        # 빈 리뷰 필터링
        valid_reviews = [r for r in reviews if r.get("content", "").strip()]
        if len(valid_reviews) < len(reviews):
            logger.info(f"[WARN] 빈 리뷰 {len(reviews) - len(valid_reviews)}개 제외")
        
        logger.info(f"[START] 리뷰 분석 시작: {len(valid_reviews)}개 (배치 크기: {BATCH_SIZE})")
        
        # 리뷰를 배치로 나눠서 처리
        for i in range(0, len(valid_reviews), BATCH_SIZE):
            batch = valid_reviews[i:i + BATCH_SIZE]
            batch_num = (i // BATCH_SIZE) + 1
            total_batches = (len(valid_reviews) + BATCH_SIZE - 1) // BATCH_SIZE
            
            logger.info(f"[BATCH] 배치 {batch_num}/{total_batches} 처리 중 ({len(batch)}개)...")
            
            # 배치 내에서만 병렬 처리 (최대 3개 동시 연결)
            batch_results = await asyncio.gather(*[analyze_single_review(review) for review in batch])
            results.extend(batch_results)
            
            progress_percent = int((len(results) / len(valid_reviews)) * 100)
            logger.info(f"[OK] 배치 {batch_num}/{total_batches} 완료 (진행률: {len(results)}/{len(valid_reviews)} = {progress_percent}%)")
            
            # Rate Limit 회피를 위한 짧은 대기 (마지막 배치 제외)
            if i + BATCH_SIZE < len(valid_reviews):
                logger.info(f"[WAIT] 다음 배치 전 {BATCH_DELAY}초 대기 (Rate Limit 회피)...")
                await asyncio.sleep(BATCH_DELAY)
        
        logger.info(f"[OK] 전체 분석 완료: {len(results)}개 리뷰")
        return results
    
    def _get_default_analysis(self) -> Dict[str, Any]:
        """기본 분석 결과 (오류 시 반환)"""
        return {
            "sentiment": "neutral",
            "temperature_score": 50,
            "confidence": 0.0,
            "evidence_quotes": [],
            "aspect_sentiments": {
                "taste_or_quality": "not_mentioned",
                "service": "not_mentioned",
                "price_value": "not_mentioned",
                "cleanliness": "not_mentioned",
                "ambience": "not_mentioned",
                "waiting_time": "not_mentioned",
                "accessibility": "not_mentioned",
                "others": "not_mentioned"
            },
            "reasoning": "분석 실패"
        }
    
    async def generate_daily_summary(
        self,
        reviews: List[Dict[str, Any]],
        stats: Dict[str, int],
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> str:
        """
        리뷰에 대한 2-3문장 요약 생성
        
        Args:
            reviews: 리뷰 목록 (감성 분석 완료)
            stats: 통계 정보 (긍정/부정/중립 수)
            start_date: 시작 날짜 (YYYY-MM-DD)
            end_date: 종료 날짜 (YYYY-MM-DD)
        
        Returns:
            2-3문장 요약
        """
        # 기간 텍스트 생성
        if start_date and end_date:
            if start_date == end_date:
                period_text = f"{start_date}에 등록된"
            else:
                period_text = f"{start_date} ~ {end_date} 기간 동안 등록된"
        else:
            period_text = "등록된"
        
        if not reviews:
            return f"{period_text} 리뷰가 없습니다."
        
        # 대표 리뷰 선택 (긍정/부정 각 최대 2개)
        positive_reviews = [r for r in reviews if r.get("sentiment") == "positive"]
        negative_reviews = [r for r in reviews if r.get("sentiment") == "negative"]
        neutral_reviews = [r for r in reviews if r.get("sentiment") == "neutral"]
        
        # 사진 리뷰 수 계산
        photo_reviews = [r for r in reviews if r.get("images") and len(r.get("images", [])) > 0]
        photo_review_count = len(photo_reviews)
        photo_review_pct = int((photo_review_count / len(reviews)) * 100) if reviews else 0
        
        # 리뷰 온도 평균 계산
        temperatures = [r.get("temperature_score", 50) for r in reviews if r.get("temperature_score") is not None]
        avg_temperature = int(sum(temperatures) / len(temperatures)) if temperatures else 50
        
        # 대표 리뷰 샘플 수집
        sample_texts = []
        if positive_reviews:
            sample_texts.extend([r.get("content", "")[:150] for r in positive_reviews[:2]])
        if negative_reviews:
            sample_texts.extend([r.get("content", "")[:150] for r in negative_reviews[:2]])
        if neutral_reviews and len(sample_texts) < 3:
            sample_texts.append(neutral_reviews[0].get("content", "")[:150])
        
        # 주요 키워드 추출 (간단한 빈도 분석)
        from collections import Counter
        all_content = " ".join([r.get("content", "") for r in reviews])
        # 간단한 키워드 추출 (추후 더 정교하게 개선 가능)
        
        prompt = f"""다음은 {period_text} 리뷰 분석 결과예요! 😊

[통계 데이터]
- 전체 리뷰: {len(reviews)}개
- 긍정 리뷰: {stats.get('positive', 0)}개 ({int(stats.get('positive', 0) / len(reviews) * 100)}%)
- 중립 리뷰: {stats.get('neutral', 0)}개 ({int(stats.get('neutral', 0) / len(reviews) * 100)}%)
- 부정 리뷰: {stats.get('negative', 0)}개 ({int(stats.get('negative', 0) / len(reviews) * 100)}%)
- 사진 포함 리뷰: {photo_review_count}개 ({photo_review_pct}%)
- 평균 리뷰 온도: {avg_temperature}도 (0=매우부정, 50=중립, 100=매우긍정)

[대표 리뷰 샘플]
{chr(10).join(['- ' + text for text in sample_texts])}

[요청사항]
위 데이터를 바탕으로 **친절하고 따뜻한 톤**으로 팩트 기반 분석을 3-4문장으로 작성해주세요:
1. 전반적인 고객 만족도 현황을 숫자와 함께 친절하게 설명 (예: "고객님들께서 ~해 주셨어요")
2. 사진 리뷰 비율 현황을 긍정적으로 표현 (예: "~의 고객님들이 사진을 남겨주셨네요")
3. 고객들이 자주 언급하는 내용을 자연스럽게 소개 (예: "특히 ~에 대한 이야기가 많았어요")

**중요 스타일 가이드**:
- 따뜻하고 친절한 말투 사용 (예: ~했어요, ~네요, ~주셨어요)
- 긍정적이고 격려하는 톤
- 향후 운영방향이나 개선 제안은 절대 포함하지 말 것
- 오직 현재 상황에 대한 팩트만 전달하되, 친근하게 표현"""
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "너는 친절하고 따뜻한 리뷰 분석 도우미야. 데이터를 객관적으로 전달하되, 친근하고 긍정적인 말투로 이야기해. 제안이나 조언은 하지 않고 오직 현재 상황만 친절하게 설명해줘."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=350
            )
            
            summary = response.choices[0].message.content.strip()
            logger.info(f"일별 요약 생성 완료: {len(summary)}자")
            return summary
            
        except Exception as e:
            logger.error(f"요약 생성 실패: {str(e)}")
            positive_pct = int(stats.get('positive', 0) / len(reviews) * 100) if reviews else 0
            negative_pct = int(stats.get('negative', 0) / len(reviews) * 100) if reviews else 0
            return f"오늘 총 {len(reviews)}개의 리뷰가 등록되었습니다. 긍정 {positive_pct}%, 부정 {negative_pct}%입니다."
