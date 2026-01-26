"""네이버 플레이스 진단 엔진 (100점 만점)"""
from typing import Dict, Any, List, Tuple
from datetime import datetime, timedelta
import re
import logging
import hashlib

logger = logging.getLogger(__name__)


class NaverPlaceDiagnosisEngine:
    """네이버 플레이스 진단 및 개선 가이드 엔진"""
    
    # 가중치 정의 (TV방송, 플레이스플러스, 스마트콜은 보너스)
    WEIGHTS = {
        "visitor_reviews": 12,
        "blog_reviews": 8,
        "images": 10,
        "menus": 12,
        "conveniences": 6,
        "naverpay": 6,
        "coupons": 10,
        "announcements": 8,
        "description_seo": 12,
        "directions_seo": 8,
        "sns_web": 4,
        "tv_program": 2,  # 보너스
        "place_plus": 2,   # 보너스
        "smart_call": 2,   # 보너스
    }
    
    # 항목명 한글 매핑
    CATEGORY_NAMES = {
        "visitor_reviews": "방문자 리뷰",
        "blog_reviews": "블로그 리뷰",
        "images": "이미지",
        "menus": "메뉴",
        "conveniences": "편의시설",
        "naverpay": "네이버페이",
        "coupons": "쿠폰",
        "announcements": "공지사항",
        "description_seo": "업체소개 SEO",
        "directions_seo": "찾아오는길 SEO",
        "sns_web": "SNS/웹",
        "tv_program": "TV방송",
        "place_plus": "플레이스플러스",
        "smart_call": "스마트콜",
    }
    
    def _is_food_cafe_category(self, category: str) -> bool:
        """식당, 카페, 베이커리 업종인지 판단"""
        if not category:
            return False
        
        category_lower = category.lower()
        food_cafe_keywords = [
            "식당", "음식점", "레스토랑", "카페", "커피", "베이커리", "빵집",
            "한식", "중식", "일식", "양식", "분식", "치킨", "피자", "햄버거",
            "디저트", "아이스크림", "케이크", "브런치", "bar", "바", "술집",
            "고기", "회", "초밥", "파스타", "스테이크", "뷔페", "맛집",
            "칼국수", "국밥", "찌개", "전골", "족발", "보쌈", "삼겹살",
            "갈비", "곱창", "닭갈비", "떡볶이", "김밥", "도시락"
        ]
        return any(kw in category_lower for kw in food_cafe_keywords)
    
    def _get_review_target(self, category: str, review_type: str = "visitor") -> int:
        """업종에 따른 리뷰 목표 개수 반환"""
        is_food_cafe = self._is_food_cafe_category(category)
        
        if is_food_cafe:
            # 식당, 카페, 베이커리: 1000개 기준
            return 1000
        else:
            # 다른 업종: 599개 기준
            return 599
    
    def _get_message_variant(self, place_id: str, category: str, variants: List[str]) -> str:
        """place_id와 category 기반으로 일관된 메시지 선택
        
        같은 매장의 같은 카테고리는 항상 같은 메시지를 반환하여
        사용자 혼란을 방지하면서도, 다른 매장에는 다양한 메시지 제공
        
        Args:
            place_id: 플레이스 ID
            category: 평가 카테고리 (visitor_reviews, images 등)
            variants: 메시지 변형 리스트
            
        Returns:
            선택된 메시지
        """
        if not variants:
            return ""
        
        if len(variants) == 1:
            return variants[0]
        
        # place_id와 category를 조합하여 Hash 생성
        hash_input = f"{place_id}_{category}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        index = hash_value % len(variants)
        
        return variants[index]
    
    def diagnose(self, place_data: Dict[str, Any]) -> Dict[str, Any]:
        """플레이스 데이터를 진단하고 평가 결과 반환
        
        Args:
            place_data: 플레이스 상세 정보
            
        Returns:
            진단 결과 (점수, 등급, 항목별 평가, 우선순위 액션)
        """
        logger.info(f"[진단엔진] 시작: {place_data.get('name')}")
        
        # 각 항목 평가
        evaluations = {
            "visitor_reviews": self._eval_visitor_reviews(place_data),
            "blog_reviews": self._eval_blog_reviews(place_data),
            "images": self._eval_images(place_data),
            "menus": self._eval_menus(place_data),
            "conveniences": self._eval_conveniences(place_data),
            "naverpay": self._eval_naverpay(place_data),
            "coupons": self._eval_coupons(place_data),
            "announcements": self._eval_announcements(place_data),
            "description_seo": self._eval_description_seo(place_data),
            "directions_seo": self._eval_directions_seo(place_data),
            "sns_web": self._eval_sns_web(place_data),
            "tv_program": self._eval_tv_program(place_data),
            "place_plus": self._eval_place_plus(place_data),
            "smart_call": self._eval_smart_call(place_data),
        }
        
        # 각 항목에 등급 추가
        for key, eval_data in evaluations.items():
            eval_data["grade"] = self._calculate_item_grade(eval_data["score"], eval_data["max_score"])
            eval_data["category_name"] = self.CATEGORY_NAMES.get(key, key)
        
        # 총점 계산 (TV방송, 플레이스플러스, 스마트콜은 보너스로 별도 처리)
        raw_base_score = sum(
            item["score"] for key, item in evaluations.items() 
            if key not in ["tv_program", "place_plus", "smart_call"]
        )
        bonus_score = sum(
            item["score"] for key, item in evaluations.items() 
            if key in ["tv_program", "place_plus", "smart_call"]
        )
        
        # 기본 15점 추가
        base_bonus = 15
        base_score = raw_base_score + base_bonus
        total_score = base_score + bonus_score
        
        # 기본 만점은 100점 (보너스 제외)
        base_max_score = sum(
            item["max_score"] for key, item in evaluations.items() 
            if key not in ["tv_program", "place_plus", "smart_call"]
        )
        total_max_score = 100  # 고정 100점
        
        # 등급 산정 (기본 점수 기준, 보너스는 등급에 영향 안 줌)
        grade = self._calculate_grade(base_score)
        
        # 보너스 포함 실제 점수 (최대 121점 가능: 85점 최대 평가 + 15점 기본 + 6점 보너스)
        actual_score = base_score + bonus_score
        
        # 우선순위 액션 생성
        priority_actions = self._generate_priority_actions(evaluations)
        
        result = {
            "total_score": round(actual_score, 1),  # 보너스 포함 실제 점수
            "base_score": round(base_score, 1),  # 기본 점수 (기본 15점 포함)
            "bonus_score": round(bonus_score, 1),  # 보너스 점수
            "max_score": total_max_score,  # 100점 고정
            "grade": grade,
            "evaluations": evaluations,
            "priority_actions": priority_actions[:5],  # Top 5만
            "diagnosis_date": datetime.now().isoformat(),
            "place_name": place_data.get("name", ""),
            "place_id": place_data.get("place_id", ""),
        }
        
        logger.info(f"[진단엔진] 완료: {base_score:.1f}점(기본15점 포함) + 보너스 {bonus_score:.1f}점 = {actual_score:.1f}점 ({grade}등급)")
        
        return result
    
    def _eval_visitor_reviews(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """방문자 리뷰 수 평가 (12점) - 업종별 차등 기준"""
        count = data.get("visitor_review_count", 0) or 0
        category = data.get("category", "")
        max_score = self.WEIGHTS["visitor_reviews"]
        
        # 업종에 따른 목표 개수
        target = self._get_review_target(category)
        is_food_cafe = self._is_food_cafe_category(category)
        
        # 점수 계산 (업종별 차등)
        if is_food_cafe:
            # 식당/카페/베이커리: 1000개 기준
            if count >= 3000:
                score = 12
                status = "PASS"
            elif count >= 1500:
                score = 10
                status = "PASS"
            elif count >= 1000:
                score = 8
                status = "PASS"
            elif count >= 500:
                score = 6
                status = "WARN"
            elif count >= 200:
                score = 4
                status = "WARN"
            elif count >= 50:
                score = 2
                status = "FAIL"
            else:
                score = 0
                status = "FAIL"
        else:
            # 다른 업종: 599개 기준
            if count >= 1500:
                score = 12
                status = "PASS"
            elif count >= 1000:
                score = 10
                status = "PASS"
            elif count >= 599:
                score = 8
                status = "PASS"
            elif count >= 300:
                score = 6
                status = "WARN"
            elif count >= 100:
                score = 4
                status = "WARN"
            elif count >= 30:
                score = 2
                status = "FAIL"
            else:
                score = 0
                status = "FAIL"
        
        # 권장사항 (메시지 다양화 - Hash 기반)
        recommendations = []
        place_id = data.get("place_id", "")
        
        # 점수 구간 세분화 및 메시지 다양화
        if count >= target * 2:
            # 목표의 2배 이상 (탁월)
            messages = [
                "훌륭합니다! 🎉 방문자 리뷰가 매우 풍부합니다. 이 수준을 계속 유지하면서, 최근 리뷰에 적극 답글을 달아 고객과의 소통을 이어가세요.",
                "완벽합니다! 🌟 방문자 리뷰 관리를 탁월하게 하고 계십니다. 이제는 리뷰 답글로 고객 충성도를 높이는 데 집중하세요.",
                "최상위 수준입니다! 🏆 방문자 리뷰가 매우 많습니다. 이 모멘텀을 유지하면서 고객과의 소통(답글)도 적극적으로 해주세요."
            ]
            message = self._get_message_variant(place_id, "visitor_reviews_excellent", messages)
            estimated_gain = 0.5
            priority = "low"
            action = "방문자 리뷰 관리 우수"
            
        elif count >= target * 1.5:
            # 목표의 1.5배 이상 (우수)
            messages = [
                "아주 잘 하고 계십니다! 👍 방문자 리뷰가 풍부합니다. 이 수준을 유지하면서 신규 고객 유입에 집중하세요.",
                "훌륭한 성과입니다! 🎯 방문자 리뷰 관리를 잘 하고 계십니다. 계속 이 페이스를 유지해주세요.",
                "매우 좋습니다! ✨ 방문자 리뷰가 충분히 쌓여 있습니다. 일관된 서비스로 이 수준을 계속 유지하세요."
            ]
            message = self._get_message_variant(place_id, "visitor_reviews_great", messages)
            estimated_gain = 1.0
            priority = "low"
            action = "방문자 리뷰 관리 전략"
            
        elif count >= target:
            # 목표 달성
            messages = [
                "잘 하고 계십니다! 👍 방문자 리뷰는 고객들이 우리 매장을 방문할 때 전환율에 가장 큰 영향을 주는 지표입니다. Keep up the great work!",
                f"목표({target}개)를 달성했습니다! 🎉 방문자 리뷰는 플레이스 점수의 핵심입니다. 이 수준을 꾸준히 유지해주세요.",
                f"좋은 수준입니다! 💪 현재 {count}개로 목표를 충족했습니다. 일별 목표를 유지하면서 지속적으로 관리하세요."
            ]
            message = self._get_message_variant(place_id, "visitor_reviews_target", messages)
            estimated_gain = 1.5
            priority = "low"
            action = "방문자 리뷰 유지 전략"
            
        elif count >= target * 0.7:
            # 목표의 70% (목표 근접)
            messages = [
                f"목표({target}개)가 곧 보입니다! 조금만 더 힘내세요. 방문자 리뷰는 고객 전환율에 가장 큰 영향을 줍니다. 일별 목표를 유지하면서 리뷰를 올려주세요.",
                f"거의 다 왔습니다! 🚀 현재 {count}개, 목표 {target}개까지 얼마 남지 않았습니다. 만족한 고객에게 리뷰 작성을 적극 안내하세요.",
                f"좋은 진전입니다! 📈 목표({target}개)까지 {target - count}개 남았습니다. 결제 시 QR 코드 안내가 효과적입니다."
            ]
            message = self._get_message_variant(place_id, "visitor_reviews_near", messages)
            estimated_gain = 2.0
            priority = "medium"
            action = "방문자 리뷰 목표 근접"
            
        elif count >= target * 0.4:
            # 목표의 40-70% (중위권)
            messages = [
                f"방문자 리뷰는 고객 전환율에 가장 큰 영향을 주는 지표입니다. 좋은 진전이 있습니다! 목표({target}개)까지 일별 목표를 잡아서 리뷰를 올려주세요.",
                f"중간 지점을 지나고 있습니다! 💫 리뷰 이벤트(대가 제공 X)를 고려하고, 서비스 품질을 높여 자연스러운 리뷰 유입을 늘리세요.",
                f"순조롭게 진행 중입니다! 현재 {count}개, 목표 {target}개까지 꾸준히 리뷰를 모아가세요. 일별 2-3개 목표를 추천합니다."
            ]
            message = self._get_message_variant(place_id, "visitor_reviews_mid", messages)
            estimated_gain = 3.0
            priority = "high"
            action = "방문자 리뷰 중위권 개선"
            
        elif count >= target * 0.2:
            # 목표의 20-40% (하위권)
            messages = [
                "방문자 리뷰는 고객 전환율에 가장 큰 영향을 주는 지표입니다. 서비스 품질을 개선하고, 결제 시 QR 코드 안내를 통해 리뷰 작성을 유도하세요. 일별 목표(예: 하루 2-3개)를 잡아서 꾸준히 늘려주세요.",
                f"리뷰 수가 부족합니다. 현재 {count}개, 목표 {target}개까지 체계적인 관리가 필요합니다. 만족한 고객에게 자연스럽게 리뷰 작성을 안내하세요.",
                "아직 초기 단계입니다. 리뷰는 신규 고객의 방문 결정에 가장 큰 영향을 줍니다. QR 코드, 테이블 안내문 등을 활용해 리뷰 요청을 시작하세요."
            ]
            message = self._get_message_variant(place_id, "visitor_reviews_low", messages)
            estimated_gain = 4.0
            priority = "high"
            action = "방문자 리뷰 확보 전략"
            
        else:
            # 목표의 20% 미만 (초기 단계)
            messages = [
                "방문자 리뷰는 고객 전환율에 가장 큰 영향을 주는 지표입니다. 아직 초기 단계이니, 만족도 높은 고객에게 자연스럽게 리뷰 작성을 안내해보세요. 일별 목표 개수를 잡아서 방문자 리뷰를 늘려주세요.",
                "이제 막 시작하셨네요! 리뷰는 온라인 신뢰도의 시작입니다. 서비스 품질을 높이고, 만족한 고객에게 적극적으로 리뷰를 요청하세요. 리뷰 이벤트(대가 제공 X)도 효과적입니다.",
                f"리뷰가 매우 부족합니다. 현재 {count}개로는 신규 고객 유입이 어렵습니다. 테이블 QR 코드, 카운터 안내문 등을 활용해 즉시 리뷰 수집을 시작하세요."
            ]
            message = self._get_message_variant(place_id, "visitor_reviews_start", messages)
            estimated_gain = 6.0
            priority = "critical"
            action = "방문자 리뷰 초기 확보"
        
        recommendations.append({
            "action": action,
            "method": message,
            "estimated_gain": estimated_gain,
            "priority": priority,
        })
        
        return {
            "score": round(score, 1),
            "max_score": max_score,
            "status": status,
            "evidence": {
                "count": count,
                "target": target,
                "is_food_cafe": is_food_cafe,
                "tier": "상위권" if count >= target * 1.5 else ("중위권" if count >= target * 0.5 else "하위권")
            },
            "recommendations": recommendations,
        }
    
    def _eval_blog_reviews(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """블로그 리뷰 평가 (8점) - 최근 90일 기준, 업종별 차등"""
        total_count = data.get("blog_review_count", 0) or 0
        category = data.get("category", "")
        max_score = self.WEIGHTS["blog_reviews"]
        
        # TODO: 최근 90일 데이터가 없으므로 전체 수로 임시 계산
        recent_count = total_count  # 임시
        accuracy_warning = True
        
        # 점수 계산 (최근 90일 기준으로 추정, 전체의 1/3 정도)
        estimated_recent = min(recent_count, total_count // 3)
        
        # 업종에 따른 목표
        is_food_cafe = self._is_food_cafe_category(category)
        target = 30 if is_food_cafe else 20  # 90일 기준
        
        if estimated_recent >= target * 1.5:
            score = 8.0
            status = "PASS"
        elif estimated_recent >= target:
            score = 6.0
            status = "PASS"
        elif estimated_recent >= target * 0.5:
            score = 4.0
            status = "WARN"
        elif estimated_recent >= target * 0.2:
            score = 2.0
            status = "WARN"
        else:
            score = 0
            status = "FAIL"
        
        recommendations = []
        place_id = data.get("place_id", "")
        
        # 점수 구간 세분화 및 메시지 다양화 (Hash 기반)
        if estimated_recent >= target * 1.8:
            # 목표의 1.8배 이상 (탁월)
            messages = [
                "블로그 리뷰가 매우 활발합니다! 🎉 온라인 노출과 브랜드 신뢰도가 탁월합니다. 인플루언서와의 관계를 지속적으로 관리하세요.",
                "완벽합니다! 🌟 블로그 마케팅을 최상으로 하고 계십니다. 이 수준을 유지하면서 신규 인플루언서 발굴도 계속하세요.",
                "최고 수준입니다! 🏆 블로그 리뷰가 풍부하여 온라인 인지도가 매우 높습니다. 이 모멘텀을 계속 유지하세요."
            ]
            message = self._get_message_variant(place_id, "blog_reviews_excellent", messages)
            estimated_gain = 0.5
            priority = "low"
            action = "블로그 리뷰 관리 우수"
            
        elif estimated_recent >= target:
            # 목표 달성
            messages = [
                "블로그 리뷰 관리를 잘 하고 계십니다! 👍 온라인 마케팅이 효과적으로 이루어지고 있습니다. 이 페이스를 유지하세요!",
                f"목표({target}개/90일)를 달성했습니다! 🎯 블로그는 신규 고객 유입의 핵심 채널입니다. 이 수준을 꾸준히 유지하세요.",
                f"훌륭합니다! 💪 현재 약 {estimated_recent}개로 목표를 충족했습니다. 인플루언서와의 협업을 계속 이어가세요."
            ]
            message = self._get_message_variant(place_id, "blog_reviews_target", messages)
            estimated_gain = 1.0
            priority = "low"
            action = "블로그 리뷰 관리 전략"
            
        elif estimated_recent >= target * 0.6:
            # 목표의 60% (목표 근접)
            messages = [
                f"블로그 리뷰가 점점 증가하고 있습니다! 목표({target}개/90일)까지 조금만 더 힘내세요. 인플루언서와의 협업을 확대하고, 매력적인 콘텐츠를 제공하세요.",
                f"거의 다 왔습니다! 🚀 현재 약 {estimated_recent}개, 목표 {target}개까지 얼마 남지 않았습니다. 블로그 체험단을 한 번 더 진행해보세요.",
                f"좋은 진전입니다! 📈 블로그 마케팅이 효과를 보고 있습니다. SNS 해시태그와 포토존 활용도 병행하세요."
            ]
            message = self._get_message_variant(place_id, "blog_reviews_near", messages)
            estimated_gain = 2.0
            priority = "medium"
            action = "블로그 리뷰 목표 근접"
            
        elif estimated_recent >= target * 0.3:
            # 목표의 30-60% (중위권)
            messages = [
                "블로그 리뷰는 온라인 노출과 브랜드 인지도 향상에 중요합니다. 인플루언서를 초대하거나, 블로그 체험단을 정기적으로 진행해보세요. 월별 목표를 잡아서 꾸준히 늘려주세요.",
                f"중간 수준입니다. 현재 약 {estimated_recent}개, 목표 {target}개까지 블로그 마케팅을 강화하세요. 레뷰, 서울오빠 등 플랫폼을 활용하세요.",
                "순조롭게 진행 중입니다! 💫 블로그 체험단을 월 1-2회 진행하고, 시즌 메뉴 출시 시 적극 홍보하세요."
            ]
            message = self._get_message_variant(place_id, "blog_reviews_mid", messages)
            estimated_gain = 3.0
            priority = "high"
            action = "블로그 리뷰 중위권 개선"
            
        else:
            # 목표의 30% 미만 (초기 단계)
            messages = [
                "블로그 리뷰는 신규 고객 유입과 온라인 노출에 매우 중요합니다. 블로그 체험단 플랫폼(레뷰, 서울오빠 등)을 활용하거나, SNS 해시태그를 적극 활용해보세요. 포토존 설치와 시즌 메뉴 출시도 효과적입니다.",
                f"블로그 리뷰가 매우 부족합니다. 현재 약 {estimated_recent}개로는 온라인 노출이 어렵습니다. 인플루언서를 초대하고, 블로그 체험단을 즉시 시작하세요.",
                "이제 막 시작 단계입니다. 블로그는 검색 노출의 핵심입니다. 소규모라도 블로그 체험단을 진행하고, SNS에서 우리 매장 태그를 적극 유도하세요."
            ]
            message = self._get_message_variant(place_id, "blog_reviews_start", messages)
            estimated_gain = 4.0
            priority = "high"
            action = "블로그 리뷰 초기 확보"
        
        recommendations.append({
            "action": action,
            "method": message,
            "estimated_gain": estimated_gain,
            "priority": priority,
        })
        
        return {
            "score": round(score, 1),
            "max_score": max_score,
            "status": status,
            "evidence": {
                "total_count": total_count,
                "estimated_recent_90d": estimated_recent,
                "target": target,
                "is_food_cafe": is_food_cafe,
                "accuracy_warning": accuracy_warning,
                "note": "실제 최근 90일 데이터 수집 필요"
            },
            "recommendations": recommendations,
        }
    
    def _eval_images(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """이미지 평가 (10점) - 수량(7점) + 최신성(3점)"""
        image_count = data.get("image_count", 0) or 0
        category = data.get("category", "")
        max_score = self.WEIGHTS["images"]
        
        # 수량 점수 (최대 7점, 목표 120장)
        quantity_score = min(image_count / 120 * 7, 7)
        
        # 최신성 점수 (최대 3점) - 임시로 3점 만점 가정
        # TODO: last_image_upload_date 필드 추가 필요
        freshness_score = 3  # 임시
        
        score = quantity_score + freshness_score
        
        if score >= 9:
            status = "PASS"
        elif score >= 6:
            status = "WARN"
        else:
            status = "FAIL"
        
        recommendations = []
        place_id = data.get("place_id", "")
        is_food = self._is_food_cafe_category(category)
        product_type = "메뉴 사진" if is_food else "상품 사진"
        example = "메뉴별로 3장 이상, 음식 스타일링" if is_food else "상품별로 다양한 각도"
        
        # 점수 구간 세분화 및 메시지 다양화 (Hash 기반)
        if image_count >= 120:
            # 목표 달성
            messages = [
                "이미지가 충분합니다! 👍 네이버는 120장까지 업로드할 수 있는데, 이미 목표를 달성했습니다. 이제는 정기적으로 새로운 사진으로 업데이트하면서 신선도를 유지하세요.",
                "완벽합니다! 🌟 이미지 120장을 모두 채웠습니다. 이제는 계절별, 시즌별로 새로운 사진을 추가하면서 매장의 활력을 보여주세요.",
                "최고입니다! 🏆 이미지 관리를 탁월하게 하고 계십니다. 신메뉴나 인테리어 변경 시 즉시 사진을 업데이트하세요."
            ]
            message = self._get_message_variant(place_id, "images_perfect", messages)
            estimated_gain = 0.5
            priority = "low"
            action = "이미지 관리 우수"
            
        elif image_count >= 90:
            # 90-119장 (목표 근접)
            gap = 120 - image_count
            messages = [
                f"거의 다 왔습니다! 🚀 현재 {image_count}장, 목표 120장까지 {gap}장만 더 추가하면 됩니다. 우리 매장에서 강조하고 싶은 포인트를 멋지게 찍어서 채워보세요!",
                f"네이버는 120장까지 업로드 가능합니다. 현재 {image_count}장으로 목표에 매우 가깝습니다! {product_type}, 외부 전경, 메뉴판 등 {gap}장만 더 추가하세요.",
                f"아주 잘 하고 계십니다! 💪 {gap}장만 더 추가하면 120장 만점입니다. 다양한 각도와 시간대의 사진으로 채워보세요."
            ]
            message = self._get_message_variant(place_id, "images_near", messages)
            estimated_gain = round(gap / 120 * 7, 1)
            priority = "medium"
            action = f"이미지 {gap}장 추가 (목표 근접)"
            
        elif image_count >= 60:
            # 60-89장 (중상위)
            gap = 120 - image_count
            messages = [
                f"네이버는 120장까지 직접 업로드할 수 있습니다. 현재 {image_count}장으로 잘 관리하고 계시네요! 목표까지 {gap}장을 더 추가해보세요. {product_type}, 외부 전경, 내부 전경, 메뉴판 및 강조하고 싶은 곳을 찍어서 업데이트합시다.",
                f"좋은 수준입니다! 📸 현재 {image_count}장, 120장까지 {gap}장 남았습니다. 고품질 사진으로 우리 매장의 매력을 더 보여주세요.",
                f"순조롭게 진행 중입니다! 💫 {gap}장을 더 추가하면 만점입니다. 시간대별(오전/오후), 계절별 사진도 다양하게 준비하세요."
            ]
            message = self._get_message_variant(place_id, "images_good", messages)
            estimated_gain = round(gap / 120 * 7, 1)
            priority = "medium"
            action = f"이미지 {gap}장 추가 업로드"
            
        elif image_count >= 40:
            # 40-59장 (중위권)
            gap = 120 - image_count
            messages = [
                f"네이버는 120장까지 업로드 가능합니다. 우리 {product_type}, 외부 전경, 내부 전경, 메뉴판 및 강조하고 싶은 곳을 멋지게 찍어서 업데이트합시다. 현재 {image_count}장이니 {gap}장을 더 추가하면 만점입니다!",
                f"이미지가 부족합니다. 현재 {image_count}장, 목표 120장의 절반 수준입니다. {example}, 인테리어 다양한 각도, 외부 전경, 주차장 등을 추가하세요.",
                f"중간 수준입니다. {gap}장의 고품질 이미지가 더 필요합니다. 자연광을 활용하고, 고객의 시선을 사로잡을 사진을 준비하세요."
            ]
            message = self._get_message_variant(place_id, "images_mid", messages)
            estimated_gain = round(gap / 120 * 7, 1)
            priority = "high"
            action = f"이미지 {gap}장 추가 업로드"
            
        else:
            # 40장 미만 (초기 단계)
            gap = 120 - image_count
            messages = [
                f"이미지는 고객의 첫인상을 결정합니다! 네이버는 120장까지 업로드 가능합니다. 현재 {image_count}장은 매우 부족합니다. {product_type}({example}), 외부 전경, 내부 전경, 메뉴판 등을 멋지게 찍어서 업데이트해봅시다. 자연광을 활용하고, 필요하면 전문 촬영도 고려하세요.",
                f"이미지가 심각하게 부족합니다! 현재 {image_count}장으로는 고객 유입이 어렵습니다. 최소 60장 이상을 즉시 업로드하세요. {example} 위주로 시작하세요.",
                f"이제 막 시작 단계입니다. {gap}장의 이미지가 필요합니다! 스마트폰으로도 충분하니, 다양한 각도에서 우리 매장의 매력을 담아내세요. 조명과 구도를 신경 쓰세요."
            ]
            message = self._get_message_variant(place_id, "images_start", messages)
            estimated_gain = round(gap / 120 * 7, 1)
            priority = "critical"
            action = f"이미지 대폭 추가 (현재 {image_count}장 → 목표 120장)"
        
        recommendations.append({
            "action": action,
            "method": message,
            "estimated_gain": estimated_gain,
            "priority": priority,
        })
        
        return {
            "score": round(score, 1),
            "max_score": max_score,
            "status": status,
            "evidence": {
                "image_count": image_count,
                "target": 120,
                "quantity_score": round(quantity_score, 1),
                "freshness_score": freshness_score,
                "last_upload": "정보 없음",  # TODO
            },
            "recommendations": recommendations,
        }
    
    def _eval_menus(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """메뉴 평가 (12점) - 완성도(8점) + SEO(4점)"""
        menus = data.get("menus", []) or []
        menu_count = len(menus)
        category = data.get("category", "")
        max_score = self.WEIGHTS["menus"]
        
        # 업종 구분
        is_food_cafe = self._is_food_cafe_category(category)
        
        if menu_count == 0:
            # 업종별 다른 가이드
            if is_food_cafe:
                # 식당/카페: 메뉴 등록 가이드
                recommendations = [
                    {
                        "action": "메뉴 최소 5개 이상 등록",
                        "method": "대표메뉴, 시즌메뉴, 세트메뉴 포함하여 구성",
                        "estimated_gain": 8,
                        "priority": "critical",
                    },
                    {
                        "action": "메뉴별 상세 설명 작성",
                        "method": "재료, 맛, 추천 대상 등 구체적으로 기술",
                        "estimated_gain": 4,
                        "priority": "critical",
                    },
                ]
            else:
                # 기타 업종: 상품/서비스/가격표 등록 가이드
                recommendations = [
                    {
                        "action": "상품/서비스 최소 5개 이상 등록",
                        "method": "대표 상품, 인기 상품, 패키지 상품 포함하여 구성. 가격표가 있다면 네이버 플레이스 메뉴 섹션에 등록해주세요.",
                        "estimated_gain": 8,
                        "priority": "critical",
                    },
                    {
                        "action": "상품/서비스별 상세 설명 작성",
                        "method": "특징, 구성, 장점, 추천 대상 등 구체적으로 기술",
                        "estimated_gain": 4,
                        "priority": "critical",
                    },
                ]
            
            return {
                "score": 0,
                "max_score": max_score,
                "status": "FAIL",
                "evidence": {"menu_count": 0, "description_filled_rate": 0, "is_food_cafe": is_food_cafe},
                "recommendations": recommendations,
            }
        
        # 완성도 평가 (설명 채움률)
        described_count = sum(1 for m in menus if m.get("description"))
        description_filled_rate = described_count / menu_count if menu_count > 0 else 0
        
        # 가격정보에서 가져온 경우 판단 (모든 메뉴에 설명이 없음)
        # 가격정보는 설명을 추가할 수 없으므로 완성도 점수 만점 처리
        is_from_price_info = (described_count == 0) and (menu_count > 0)
        
        if is_from_price_info:
            # 가격정보에서 가져온 경우: 설명 없음이 정상이므로 만점 처리
            completeness_score = 8.0
            description_filled_rate_for_display = 1.0  # 화면 표시용
        else:
            # 메뉴 섹션에서 가져온 경우: 설명 채움률로 평가
            completeness_score = description_filled_rate * 8
            description_filled_rate_for_display = description_filled_rate
        
        # SEO 평가 (지역, 업종, 대표메뉴 키워드)
        category = data.get("category", "")
        address = data.get("address", "")
        menu_names = [m.get("name", "") for m in menus]
        
        seo_score = 0
        seo_checks = {
            "region_keyword": False,
            "category_keyword": False,
            "representative_menu": False,
            "no_keyword_stuffing": True,
        }
        
        # 지역 키워드 체크 (주소에서 추출)
        if any(region in " ".join(menu_names) for region in ["강남", "홍대", "명동", "이태원", "성수"]):
            seo_score += 1
            seo_checks["region_keyword"] = True
        
        # 업종 키워드 체크
        if category in " ".join(menu_names):
            seo_score += 1
            seo_checks["category_keyword"] = True
        
        # 대표 메뉴 2개 이상
        if menu_count >= 2:
            seo_score += 1
            seo_checks["representative_menu"] = True
        
        # 키워드 과다 반복 체크 (동일 단어 5회 이상 반복)
        all_text = " ".join(menu_names + [m.get("description", "") for m in menus])
        words = re.findall(r'\b\w+\b', all_text)
        if words:
            most_common_count = max([words.count(w) for w in set(words)])
            if most_common_count >= 5:
                seo_checks["no_keyword_stuffing"] = False
            else:
                seo_score += 1
        
        total_score = completeness_score + seo_score
        
        if total_score >= 10:
            status = "PASS"
        elif total_score >= 6:
            status = "WARN"
        else:
            status = "FAIL"
        
        recommendations = []
        # 가격정보에서 가져온 경우가 아니고, 설명이 부족한 경우에만 권장사항 추가
        if description_filled_rate < 1.0 and not is_from_price_info:
            gap = menu_count - described_count
            
            # 업종별 다른 가이드
            if is_food_cafe:
                # 식당/카페: 음식 관련 가이드
                method_text = "재료, 조리법, 맛의 특징, 추천 상황 포함"
                example_text = "💡 예시: 직접 만든 수제 소스로 맛을 낸 시그니처 파스타. 신선한 해산물과 크림의 조화가 일품입니다."
            else:
                # 기타 업종: 상품/서비스 관련 가이드
                method_text = "상품/서비스 특징, 구성, 장점, 추천 대상 포함"
                example_text = "💡 예시: 전문 장비로 촬영하는 프로필 사진. 자연스러운 표정과 배경 연출로 취업/입사에 최적화된 사진을 제공합니다."
            
            recommendations.append({
                "action": f"메뉴 설명 {gap}개 추가 작성 (완성도 {description_filled_rate*100:.0f}% → 100%)",
                "method": f"{method_text}\n\n{example_text}",
                "estimated_gain": (1 - description_filled_rate) * 8,
                "priority": "high" if description_filled_rate < 0.5 else "medium",
            })
        
        if not seo_checks["region_keyword"] or not seo_checks["category_keyword"]:
            recommendations.append({
                "action": "메뉴명에 지역/업종 키워드 자연스럽게 포함",
                "method": "예: '성수동 시그니처 파스타', '강남 프리미엄 스테이크'",
                "estimated_gain": 2,
                "priority": "medium",
            })
        
        return {
            "score": round(total_score, 1),
            "max_score": max_score,
            "status": status,
            "evidence": {
                "menu_count": menu_count,
                "description_filled_rate": round(description_filled_rate_for_display, 2),
                "completeness_score": round(completeness_score, 1),
                "seo_score": seo_score,
                "seo_checks": seo_checks,
                "is_from_price_info": is_from_price_info,
            },
            "recommendations": recommendations,
        }
    
    def _eval_conveniences(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """편의시설 평가 (6점)"""
        conveniences = data.get("conveniences", []) or []
        count = len(conveniences)
        max_score = self.WEIGHTS["conveniences"]
        
        if count >= 6:
            score = 6.0
            status = "PASS"
        elif count >= 3:
            score = 4.0
            status = "WARN"
        elif count >= 1:
            score = 2.0
            status = "WARN"
        else:
            score = 0
            status = "FAIL"
        
        recommendations = []
        place_id = data.get("place_id", "")
        available = ["주차", "무선 인터넷", "예약", "단체 이용 가능", "포장", "배달", "반려동물 동반", "콘센트", "노키즈존", "룸", "개별룸", "단독 공간"]
        missing = [c for c in available if c not in conveniences]
        
        # 점수 구간 세분화 및 메시지 다양화 (Hash 기반)
        if count >= 6:
            # 6개 이상 (만점)
            messages = [
                "편의시설 정보를 아주 잘 등록하고 계십니다! 👍 고객들이 방문 전에 필요한 정보를 충분히 확인할 수 있습니다. 계속 유지해주세요.",
                "완벽합니다! 🌟 편의시설 정보가 풍부하여 고객 만족도가 높을 것입니다. 새로운 편의시설 추가 시 즉시 업데이트하세요.",
                "최고 수준입니다! 🏆 편의시설 관리를 탁월하게 하고 계십니다. 이 수준을 계속 유지하세요."
            ]
            message = self._get_message_variant(place_id, "conveniences_perfect", messages)
            estimated_gain = 0
            priority = "low"
            action = "편의시설 관리 우수"
            
        elif count >= 4:
            # 4-5개 (우수)
            gap = 6 - count
            missing_examples = missing[:3]
            messages = [
                f"잘 하고 계십니다! 혹시 빠뜨린 부분이 없는지 한번 더 확인해서 업체 정보를 업데이트해주세요. 예: {', '.join(missing_examples)} 등",
                f"좋은 수준입니다! 💪 현재 {count}개 등록, 목표 6개까지 {gap}개만 더 확인하세요. 대부분의 업장에서 적용할 수 있는 옵션이 많습니다.",
                f"거의 다 왔습니다! 🚀 {gap}개만 더 체크하면 만점입니다: {', '.join(missing_examples)} 등을 확인해보세요."
            ]
            message = self._get_message_variant(place_id, "conveniences_good", messages)
            estimated_gain = float(gap)
            priority = "medium"
            action = f"편의시설 {gap}개 추가 확인"
            
        elif count >= 2:
            # 2-3개 (중위권)
            gap = 6 - count
            missing_examples = missing[:4]
            messages = [
                f"혹시 빠뜨린 부분이 없는지 한번 더 확인해서 업체 정보를 업데이트해주세요. 대부분의 업장에서 적용할 수 있는 옵션들이 많습니다. 예: {', '.join(missing_examples)} 등",
                f"편의시설 정보가 부족합니다. 현재 {count}개, 목표 6개까지 꼼꼼히 체크하세요: {', '.join(missing_examples)} 등",
                f"중간 수준입니다. {gap}개의 편의시설을 추가 확인하세요. 고객들이 방문 전에 이 정보를 자주 확인합니다."
            ]
            message = self._get_message_variant(place_id, "conveniences_mid", messages)
            estimated_gain = float(gap)
            priority = "high"
            action = f"편의시설 {gap}개 추가 확인"
            
        else:
            # 0-1개 (초기 단계)
            gap = 6 - count
            missing_examples = missing[:5]
            messages = [
                f"편의시설 정보가 매우 부족합니다. 혹시 빠뜨린 부분이 없는지 한번 더 확인해서 업체 정보를 업데이트해주세요. 대부분의 업장에서 적용할 수 있는 옵션: {', '.join(missing_examples)} 등",
                f"편의시설 등록이 거의 안 되어 있습니다! 현재 {count}개로는 고객이 방문을 망설일 수 있습니다. 즉시 체크하세요: {', '.join(missing_examples)} 등",
                f"편의시설 정보를 즉시 업데이트하세요! {gap}개를 확인해야 합니다. 이 정보는 고객 전환율에 직접적인 영향을 줍니다."
            ]
            message = self._get_message_variant(place_id, "conveniences_start", messages)
            estimated_gain = float(gap)
            priority = "critical"
            action = f"편의시설 정보 업데이트 필요 ({gap}개)"
        
        recommendations.append({
            "action": action,
            "method": message,
            "estimated_gain": estimated_gain,
            "priority": priority,
        })
        
        return {
            "score": round(score, 1),
            "max_score": max_score,
            "status": status,
            "evidence": {
                "count": count,
                "items": conveniences,
            },
            "recommendations": recommendations,
        }
    
    def _eval_naverpay(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """네이버페이 평가 (6점)
        
        ⭐ 개선: 검색 결과 HTML에서 실제 네이버페이 아이콘 확인
        - 사용중: S등급 (6점 만점)
        - 미사용: D등급 (0점)
        """
        # 검색 결과 HTML에서 확인한 네이버페이 사용 여부 (정확함) ⭐
        has_naverpay_in_search = data.get("has_naverpay_in_search", False)
        
        # 결제 수단 정보 (참고용)
        payment_methods = data.get("payment_methods", []) or []
        
        max_score = self.WEIGHTS["naverpay"]
        
        # Binary 판단: 사용중 = S등급 (6점), 미사용 = D등급 (0점) ⭐
        if has_naverpay_in_search:
            score = max_score  # 6점
            status = "PASS"
            grade = "S"  # ⭐ S등급
        else:
            score = 0  # 0점
            status = "FAIL"
            grade = "D"  # ⭐ D등급
        
        recommendations = []
        place_id = data.get("place_id", "")
        
        if not has_naverpay_in_search:
            # 네이버페이 미사용
            messages = [
                "네이버페이는 실제로 고객들이 우리 매장에 다녀갔다는 강한 신호를 주기 때문에 플레이스 점수에 긍정적인 영향을 줍니다. 또한 검색 결과에 네이버페이 아이콘이 표시되어 신뢰도가 높아지고, 네이버 플레이스 노출에도 우대 혜택이 있습니다.",
                "네이버페이를 도입하세요! 고객 신뢰도가 높아지고, 검색 결과에 네이버페이 배지가 표시됩니다. 플레이스 점수와 노출 순위에도 긍정적인 영향을 줍니다.",
                "네이버페이는 강력한 신뢰 신호입니다! 결제 데이터를 통해 실제 방문을 증명하므로 플레이스 알고리즘이 우리 매장을 더 신뢰합니다. 노출 우대 혜택도 있습니다."
            ]
            message = self._get_message_variant(place_id, "naverpay_none", messages)
            
            recommendations.append({
                "action": "네이버페이 결제 도입",
                "method": f"{message}\n\n구체적 방법: 네이버페이 가맹점 신청 → POS 연동 또는 QR 결제 도입",
                "estimated_gain": 6.0,
                "priority": "high",
                "note": "신뢰 신호 강화 + 노출 우대",
            })
        else:
            # 네이버페이 사용 중
            messages = [
                "네이버페이를 이미 사용 중이시군요! 👍 이는 고객들에게 신뢰 신호를 주고, 플레이스 점수에도 긍정적인 영향을 줍니다.",
                "완벽합니다! 🌟 네이버페이를 활용하고 계시네요. 고객 신뢰도와 플레이스 점수에 큰 도움이 됩니다.",
                "훌륭합니다! 💪 네이버페이 사용으로 플레이스 알고리즘이 우리 매장을 더 신뢰합니다. 계속 활용하세요!"
            ]
            message = self._get_message_variant(place_id, "naverpay_using", messages)
            
            recommendations.append({
                "action": "네이버페이 활용 중",
                "method": message,
                "estimated_gain": 0,
                "priority": "low",
            })
        
        return {
            "score": score,
            "max_score": max_score,
            "status": status,
            "grade": grade,  # ⭐ 등급 추가
            "evidence": {
                "has_naverpay_in_search": has_naverpay_in_search,  # ⭐ 새로운 필드
                "payment_methods": payment_methods,  # 참고용
            },
            "recommendations": recommendations,
        }
    
    def _eval_coupons(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """쿠폰 평가 (10점)"""
        promotions = data.get("promotions", {}) or {}
        coupons = promotions.get("coupons", []) or []
        coupon_count = len(coupons)
        max_score = self.WEIGHTS["coupons"]
        
        # 기본 점수 (2개 이상이면 만점)
        if coupon_count >= 2:
            score = 10
        elif coupon_count == 1:
            score = 6
        else:
            score = 0
        
        # 최신성 체크 (최근 90일 업데이트 없으면 -2)
        # TODO: 쿠폰 생성일 필드 추가 필요
        has_recent_update = True  # 임시
        if not has_recent_update and score > 0:
            score -= 2
        
        status = "PASS" if score >= 8 else ("WARN" if score >= 4 else "FAIL")
        
        recommendations = []
        if coupon_count < 2:
            gap = 2 - coupon_count
            recommendations.append({
                "action": f"쿠폰 {gap}개 생성 (현재 {coupon_count}개 → 목표 2개 이상)",
                "method": "웰컴 쿠폰(첫 방문 할인) + 재방문 쿠폰(리뷰 이벤트) 구성 권장",
                "copy_example": "첫 방문 고객 10% 할인 쿠폰 / 리뷰 작성 시 음료 1잔 무료",
                "estimated_gain": gap * 5,
                "priority": "high" if coupon_count == 0 else "medium",
            })
        
        if coupon_count == 0:
            recommendations.append({
                "action": "즉시 사용 가능한 쿠폰 1개 발행",
                "method": "플레이스 앱에서 직접 발행 (조건: 최소 주문 금액 설정)",
                "estimated_gain": 6,
                "priority": "critical",
            })
        
        return {
            "score": round(score, 1),
            "max_score": max_score,
            "status": status,
            "evidence": {
                "coupon_count": coupon_count,
                "has_recent_update": has_recent_update,
            },
            "recommendations": recommendations,
        }
    
    def _eval_announcements(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """최신 공지 평가 (8점)"""
        announcements = data.get("announcements", []) or []
        max_score = self.WEIGHTS["announcements"]
        
        # 최근 60일 공지 개수
        recent_60d_count = 0
        latest_days_ago = None
        
        for ann in announcements:
            # relativeCreated가 None일 수 있으므로 명시적으로 빈 문자열로 처리
            relative = ann.get("relativeCreated") or ""
            if relative and "일 전" in relative:
                days = int(re.search(r'(\d+)일', relative).group(1))
                if days <= 60:
                    recent_60d_count += 1
                if latest_days_ago is None or days < latest_days_ago:
                    latest_days_ago = days
            elif relative and relative.startswith("202"):  # 날짜 형식
                # 간단히 60일 이상으로 가정
                pass
        
        # 점수 계산
        if recent_60d_count >= 2:
            score = 8
        elif recent_60d_count == 1:
            score = 4
        else:
            score = 0
        
        # 최신 공지가 30일 넘으면 최대 6점 캡
        if latest_days_ago and latest_days_ago > 30:
            score = min(score, 6)
        
        status = "PASS" if score >= 6 else ("WARN" if score >= 4 else "FAIL")
        
        recommendations = []
        place_id = data.get("place_id", "")
        
        # 점수 구간 세분화 및 메시지 다양화 (Hash 기반)
        if recent_60d_count >= 4:
            # 4개 이상 (탁월)
            messages = [
                "공지사항을 매우 활발하게 운영하고 계십니다! 🎉 주별 2개가 만점인데, 이를 훨씬 초과하고 있습니다. 공지사항은 플레이스 가시성이 높기 때문에 고객 전환에도 큰 도움이 됩니다. Keep it up!",
                "완벽합니다! 🌟 공지사항 관리를 탁월하게 하고 계십니다. 매장의 활성도가 매우 높아 보입니다. 이 수준을 계속 유지하세요!",
                "최고 수준입니다! 🏆 공지사항을 통해 고객과의 소통이 활발합니다. 플레이스 가시성도 높아 신규 고객 유입에 큰 도움이 될 것입니다."
            ]
            message = self._get_message_variant(place_id, "announcements_excellent", messages)
            estimated_gain = 0.5
            priority = "low"
            action = "공지사항 관리 우수"
            
        elif recent_60d_count >= 2:
            # 2-3개 (우수)
            messages = [
                "공지사항을 잘 운영하고 계십니다! 👍 주별 2개가 만점입니다. 1개도 나쁘지 않지만, 2개 이상을 넣으면 더 활성화된 매장으로 간주됩니다. 공지사항은 플레이스 가시성이 높기 때문에 고객 전환에도 큰 도움이 됩니다.",
                f"좋습니다! 💪 현재 {recent_60d_count}개로 목표를 충족했습니다. 이 페이스를 유지하면서 월 1-2회 정기 업데이트를 계속하세요.",
                "훌륭합니다! ✨ 공지사항 관리를 잘 하고 계십니다. 신메뉴, 이벤트, 휴무일 등을 꾸준히 공지하세요."
            ]
            message = self._get_message_variant(place_id, "announcements_good", messages)
            estimated_gain = 1.0
            priority = "low"
            action = "공지사항 관리 양호"
            
        elif recent_60d_count == 1:
            # 1개 (중위권)
            messages = [
                "공지사항이 1개 있습니다. 주별 2개가 만점입니다. 1개도 나쁘지 않지만, 2개 이상을 넣으면 더 활성화된 매장으로 간주됩니다. 공지사항은 플레이스 가시성이 높기 때문에 고객 전환에도 큰 도움이 됩니다.\n\n추천: 신메뉴 출시, 이벤트, 시즌 프로모션 등을 월 1-2회 공지로 작성하세요.\n예시: '🎉 신메뉴 출시! 여름 한정 시그니처 빙수' / '📢 8월 한 달간 전 메뉴 10% 할인'",
                "공지사항 1개를 더 추가하면 만점입니다! 주별 2개가 목표입니다. 공지사항은 매장 활성도를 보여주고, 플레이스 가시성이 높아 신규 고객 전환에 큰 도움이 됩니다. 이번 주/월 소식을 공지하세요.",
                "거의 다 왔습니다! 🚀 1개만 더 작성하면 목표 달성입니다. 영업시간 변경, 휴무일 안내, 이벤트 등 고객에게 유용한 정보를 공유하세요."
            ]
            message = self._get_message_variant(place_id, "announcements_one", messages)
            estimated_gain = 4.0
            priority = "medium"
            action = "공지사항 1개 추가 권장"
            
        else:
            # 0개 (초기 단계)
            messages = [
                "공지사항이 없습니다! 주별 2개가 만점입니다. 공지사항은 플레이스 가시성이 높기 때문에 고객 전환에 큰 도움이 됩니다. 지금 바로 시작하세요!\n\n추천: 신메뉴 출시, 이벤트, 시즌 프로모션 등을 월 1-2회 공지로 작성하세요.\n예시: '🎉 신메뉴 출시! 여름 한정 시그니처 빙수' / '📢 8월 한 달간 전 메뉴 10% 할인' / '⏰ 2월 설 연휴 영업시간 안내'",
                "공지사항이 전혀 없습니다! 즉시 시작하세요. 공지사항은 매장의 활성도를 보여주고, 검색 결과에서 눈에 잘 띕니다. 신메뉴, 이벤트, 영업시간 등을 공지하세요.",
                "공지사항을 활용하지 않고 있습니다! 이는 매우 아쉽습니다. 주별 2개 목표로 월 1-2회 정기 업데이트를 시작하세요. 고객 전환율이 크게 향상될 것입니다."
            ]
            message = self._get_message_variant(place_id, "announcements_none", messages)
            estimated_gain = 8.0
            priority = "critical"
            action = "공지사항 정기 업데이트 시작"
        
        # 최신성 체크 (30일 넘으면 추가 권장)
        if latest_days_ago and latest_days_ago > 30 and recent_60d_count < 4:
            old_messages = [
                "최근 30일 이내에 신규 공지가 없습니다. 공지사항은 매장의 활성도를 보여주는 지표입니다. 이번 주/월 이벤트, 신메뉴 안내, 영업시간 변경 등 최신 소식을 공유하세요.",
                f"마지막 공지가 {latest_days_ago}일 전입니다. 너무 오래되었습니다! 최신 공지를 즉시 작성하세요. 매장이 활발히 운영 중임을 보여주는 것이 중요합니다.",
                "공지사항이 오래되었습니다. 신선한 소식으로 고객의 관심을 끌어보세요. 시즌 메뉴, 할인 이벤트, 영업 안내 등을 업데이트하세요."
            ]
            old_message = self._get_message_variant(place_id, "announcements_old", old_messages)
            recommendations.append({
                "action": "최신 공지사항 작성",
                "method": old_message,
                "estimated_gain": 2.0,
                "priority": "high",
            })
        else:
            recommendations.append({
                "action": action,
                "method": message,
                "estimated_gain": estimated_gain,
                "priority": priority,
            })
        
        return {
            "score": round(score, 1),
            "max_score": max_score,
            "status": status,
            "evidence": {
                "total_count": len(announcements),
                "recent_60d_count": recent_60d_count,
                "latest_days_ago": latest_days_ago,
            },
            "recommendations": recommendations,
        }
    
    def _eval_description_seo(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """업체소개글 SEO 평가 (12점) - 길이(4) + 키워드(6) + 신뢰성(2)"""
        description = data.get("description", "") or ""
        length = len(description)
        max_score = self.WEIGHTS["description_seo"]
        
        # 길이 점수 (최대 4점) - 더 후하게 수정
        if 200 <= length <= 2000:  # 범위 확대
            length_score = 4
        elif 100 <= length < 200:  # 하한선 낮춤
            length_score = 3  # 2점 -> 3점
        elif length > 2000:
            length_score = 3  # 2점 -> 3점
        elif 50 <= length < 100:  # 추가
            length_score = 2
        else:
            length_score = 0
        
        # 키워드 점수 (최대 6점)
        category = data.get("category", "")
        address = data.get("address", "")
        menus = data.get("menus", []) or []
        
        keyword_score = 0
        
        # 지역 키워드 분석 (2점)
        # 서울 주요 지역 + 전국 주요 도시/구
        regions = [
            "강남", "홍대", "명동", "이태원", "성수", "신촌", "건대", "잠실", "종로", "여의도", "마포", "용산",
            "역삼", "삼성", "신사", "압구정", "청담", "대치", "논현", "서초", "방배", "반포",
            "연남", "망원", "합정", "상수", "충정로", "신촌", "이대", "대흥",
            "종로", "인사동", "삼청동", "북촌", "을지로", "명동", "충무로", "동대문", "광화문",
            "영등포", "여의도", "당산", "신길", "구로",
            "송파", "잠실", "석촌", "방이", "문정",
            "강동", "천호", "길동", "둔촌",
            "노원", "중계", "상계", "월계",
            "강북", "수유", "미아", "번동",
            "관악", "신림", "봉천", "서울대입구",
            "동작", "사당", "이수", "흑석",
            "부산", "해운대", "광안리", "서면", "남포동", "중앙동",
            "대구", "동성로", "수성", "달서",
            "인천", "송도", "구월", "부평",
            "광주", "충장로", "상무", "첨단",
            "대전", "둔산", "유성", "은행",
            "수원", "인계", "영통", "광교",
            "성남", "분당", "판교", "정자", "서현", "야탑",
            "용인", "수지", "기흥", "동백",
            "고양", "일산", "킨텍스", "주엽"
        ]
        
        # 주소에서 지역명 추출 (동/구/시 단위)
        address_regions = []
        if address:
            # "서울 성동구 성수동2가" -> ["서울", "성동구", "성수동", "성수"]
            import re
            # 구 단위
            gu_match = re.findall(r'([가-힣]+구)', address)
            address_regions.extend(gu_match)
            # 동 단위
            dong_match = re.findall(r'([가-힣]+동)', address)
            address_regions.extend([d.replace('동', '') for d in dong_match])
            # 시 단위
            si_match = re.findall(r'([가-힣]+시)', address)
            address_regions.extend([s.replace('시', '') for s in si_match])
        
        # 소개글에 포함된 지역 키워드 카운트
        all_regions = regions + address_regions
        # 중복 제거 + 최소 2자 이상 필터링 (1자 키워드는 너무 모호함)
        found_regions = list(set([r for r in all_regions if r in description and len(r) >= 2]))
        # 긴 것부터 정렬 (예: "성수동" > "성수")
        found_regions.sort(key=len, reverse=True)
        region_count = len(found_regions)
        
        # 주소에서 추출한 지역 중 소개글에 없는 것
        missing_from_address = [r for r in address_regions if r not in description]
        
        if region_count > 0:
            keyword_score += 2
            region_check = True
        else:
            region_check = False
        
        # 업종 키워드 분석 (2점)
        category_keywords = category.split(",") if category else []
        category_count = sum(1 for kw in category_keywords if kw.strip() in description)
        
        if category_count > 0:
            keyword_score += 2
            category_check = True
        else:
            category_check = False
        
        # 대표 메뉴 키워드 분석 (2점)
        menu_names = [m.get("name", "") for m in menus[:5] if m.get("name")]
        menu_count = sum(1 for menu in menu_names if menu in description)
        
        if menu_count > 0:
            keyword_score += 2
            menu_check = True
        else:
            menu_check = False
        
        keyword_checks = {
            "region": region_check,
            "region_count": region_count,
            "found_regions": found_regions[:3],  # 최대 3개만 표시
            "missing_from_address": missing_from_address[:2] if missing_from_address else [],
            "category": category_check,
            "category_count": category_count,
            "category_keywords": category_keywords,
            "menu": menu_check,
            "menu_count": menu_count,
            "total_menu_names": len(menu_names),
        }
        
        # 신뢰성/가독성 (최대 2점)
        trust_keywords = ["좌석", "예약", "주차", "추천", "대표", "시그니처", "인기", "맛집"]
        trust_score = min(sum(1 for kw in trust_keywords if kw in description) // 3, 2)
        
        total_score = length_score + keyword_score + trust_score
        
        status = "PASS" if total_score >= 10 else ("WARN" if total_score >= 6 else "FAIL")
        
        recommendations = []
        if length < 300:
            recommendations.append({
                "action": f"업체소개글 {300 - length}자 추가 작성 (현재 {length}자 → 목표 300자)",
                "method": "매장 특징, 대표 메뉴, 추천 상황, 차별화 포인트 포함",
                "copy_example": f"{address.split()[0] if address else '우리 매장'}에서 정성스럽게 준비한 {category}를 경험하세요. 대표 메뉴인 [메뉴명]은 신선한 재료와 장인의 손길로 완성됩니다. 가족 모임, 데이트, 비즈니스 미팅 등 다양한 상황에 어울리는 공간입니다.",
                "estimated_gain": 4 - length_score,
                "priority": "high",
            })
        
        # 키워드 누락 상세 안내
        keyword_details = []
        
        # 지역 키워드
        if not keyword_checks["region"]:
            # 주소에서 추천 지역명 추출
            suggestions = keyword_checks["missing_from_address"]
            if not suggestions and address:
                suggestions = [address.split()[1] if len(address.split()) > 1 else address.split()[0]]
            suggestion_text = f"(예: {', '.join(suggestions[:2])})" if suggestions else ""
            keyword_details.append(f"지역명 0개 → 최소 2개 추가 권장 {suggestion_text}")
        elif keyword_checks["region_count"] == 1:
            found = keyword_checks["found_regions"]
            suggestions = keyword_checks["missing_from_address"]
            if suggestions:
                keyword_details.append(f"지역명 1개 포함 ('{found[0]}') → 1개 더 추가 권장 (예: {suggestions[0]})")
            else:
                keyword_details.append(f"지역명 1개 포함 ('{found[0]}') → 1개 더 추가하면 더 좋음")
        elif keyword_checks["region_count"] >= 2:
            found_str = "', '".join(keyword_checks["found_regions"])
            keyword_details.append(f"지역명 {keyword_checks['region_count']}개 포함 ('{found_str}') - 우수")
        
        # 업종 키워드
        if not keyword_checks["category"]:
            keyword_details.append(f"업종 키워드 0개 → 추가 필요 (예: {category})")
        elif keyword_checks["category_count"] > 0:
            keyword_details.append(f"업종 키워드 {keyword_checks['category_count']}개 포함 (양호)")
        
        # 메뉴 키워드
        if not keyword_checks["menu"]:
            if keyword_checks["total_menu_names"] > 0:
                keyword_details.append(f"대표 메뉴명 0개 → 최소 2개 추가 필요 (등록된 메뉴 {keyword_checks['total_menu_names']}개 중)")
            else:
                keyword_details.append("대표 메뉴명 0개 → 메뉴 등록 후 소개글에 추가")
        elif keyword_checks["menu_count"] > 0:
            if keyword_checks["menu_count"] < 2 and keyword_checks["total_menu_names"] >= 2:
                keyword_details.append(f"대표 메뉴명 {keyword_checks['menu_count']}개 → 1개 더 추가 권장 (등록된 메뉴 {keyword_checks['total_menu_names']}개 중)")
            else:
                keyword_details.append(f"대표 메뉴명 {keyword_checks['menu_count']}개 포함 (양호)")
        
        if keyword_details:
            recommendations.append({
                "action": "SEO 키워드 최적화",
                "method": "\n".join([f"• {detail}" for detail in keyword_details]),
                "estimated_gain": (3 - sum([keyword_checks["region"], keyword_checks["category"], keyword_checks["menu"]])) * 2,
                "priority": "high",
            })
        
        return {
            "score": round(total_score, 1),
            "max_score": max_score,
            "status": status,
            "evidence": {
                "length": length,
                "length_score": length_score,
                "keyword_score": keyword_score,
                "trust_score": trust_score,
                "keyword_details": {
                    "region_count": keyword_checks["region_count"],
                    "found_regions": keyword_checks["found_regions"],
                    "category_count": keyword_checks["category_count"],
                    "menu_count": keyword_checks["menu_count"],
                    "total_menu_names": keyword_checks["total_menu_names"],
                },
            },
            "recommendations": recommendations,
        }
    
    def _eval_directions_seo(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """찾아오는길 SEO 평가 (8점) - 길이(3) + 디테일(4) + 키워드(1)"""
        directions = data.get("directions", "") or ""
        length = len(directions)
        max_score = self.WEIGHTS["directions_seo"]
        
        # 길이/명확성 (최대 3점)
        length_score = 3 if length >= 200 else (1 if length >= 100 else 0)
        
        # 디테일 점수 (최대 4점) - 각 요소당 1점
        detail_checks = {
            "exit_walk": any(kw in directions for kw in ["번 출구", "도보", "분 거리"]),
            "landmark": any(kw in directions for kw in ["건물", "앞", "옆", "근처", "맞은편"]),
            "parking": "주차" in directions,
            "transport": any(kw in directions for kw in ["버스", "지하철", "택시"]),
        }
        detail_score = sum(detail_checks.values())
        
        # 키워드 (최대 1점)
        category = data.get("category", "")
        keyword_score = 1 if category and category in directions else 0
        
        total_score = length_score + detail_score + keyword_score
        
        status = "PASS" if total_score >= 7 else ("WARN" if total_score >= 4 else "FAIL")
        
        recommendations = []
        if length < 200:
            recommendations.append({
                "action": f"찾아오는길 상세 정보 추가 (현재 {length}자 → 목표 200자)",
                "method": "지하철 출구, 도보 시간, 주요 건물, 주차 안내 포함",
                "copy_example": "지하철 2호선 강남역 11번 출구에서 도보 5분. 강남파이낸스센터 건너편 골목 안쪽에 위치. 주차는 건물 지하 1층 (2시간 무료).",
                "estimated_gain": 3 - length_score,
                "priority": "medium",
            })
        
        # 누락된 정보 상세 안내
        missing_details_names = []
        if not detail_checks["exit_walk"]:
            missing_details_names.append("지하철 출구/도보 시간")
        if not detail_checks["landmark"]:
            missing_details_names.append("주변 랜드마크(건물명)")
        if not detail_checks["parking"]:
            missing_details_names.append("주차 정보")
        if not detail_checks["transport"]:
            missing_details_names.append("대중교통 팁")
        
        if missing_details_names:
            recommendations.append({
                "action": f"누락된 길찾기 정보 추가",
                "method": f"추가 필요: {', '.join(missing_details_names)}",
                "estimated_gain": len(missing_details_names),
                "priority": "medium",
            })
        
        return {
            "score": total_score,
            "max_score": max_score,
            "status": status,
            "evidence": {
                "length": length,
                "length_score": length_score,
                "detail_score": detail_score,
                "keyword_score": keyword_score,
                "detail_checks": detail_checks,
            },
            "recommendations": recommendations,
        }
    
    def _eval_sns_web(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """SNS/웹사이트 평가 (4점)"""
        homepage = data.get("homepage", "") or ""
        instagram = data.get("instagram", "") or ""
        blog = data.get("blog", "") or ""
        
        count = sum([bool(homepage), bool(instagram), bool(blog)])
        max_score = self.WEIGHTS["sns_web"]
        
        if count == 3:
            score = 4
            status = "PASS"
        elif count == 2:
            score = 3
            status = "WARN"
        elif count == 1:
            score = 1
            status = "WARN"
        else:
            score = 0
            status = "FAIL"
        
        recommendations = []
        if count < 3:
            missing = []
            if not homepage:
                missing.append("홈페이지")
            if not instagram:
                missing.append("인스타그램")
            if not blog:
                missing.append("블로그")
            
            recommendations.append({
                "action": f"SNS/웹 채널 추가 ({', '.join(missing)})",
                "method": "인스타그램 비즈니스 계정 개설 → 정기 포스팅 → 플레이스 연동",
                "estimated_gain": 4 - score,
                "priority": "medium" if count >= 1 else "high",
            })
        
        return {
            "score": round(score, 1),
            "max_score": max_score,
            "status": status,
            "evidence": {
                "count": count,
                "homepage": bool(homepage),
                "instagram": bool(instagram),
                "blog": bool(blog),
            },
            "recommendations": recommendations,
        }
    
    def _eval_tv_program(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """TV 방송 출연 평가 (2점 보너스)"""
        tv_program = data.get("tv_program", "") or ""
        has_tv = bool(tv_program)
        max_score = self.WEIGHTS["tv_program"]
        
        # 보너스 항목: 있으면 +2점, 없어도 0점 (감점 없음)
        score = max_score if has_tv else 0
        status = "PASS"  # 항상 PASS (보너스 항목)
        
        recommendations = []
        if not has_tv:
            recommendations.append({
                "action": "TV 프로그램 출연으로 브랜드 신뢰도 향상",
                "method": "지역 방송국 맛집 코너 제보, 유튜브 먹방 채널 협업",
                "estimated_gain": 2,
                "priority": "low",
                "note": "보너스 점수 항목 - 장기 브랜딩 전략",
            })
        
        return {
            "score": round(score, 1),
            "max_score": max_score,
            "status": status,
            "is_bonus": True,  # 보너스 항목 표시
            "evidence": {
                "has_tv_featured": has_tv,
                "program": tv_program if has_tv else None,
            },
            "recommendations": recommendations,
        }
    
    def _eval_place_plus(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """플레이스 플러스 평가 (2점 보너스)"""
        is_place_plus = data.get("is_place_plus", False) or False
        max_score = self.WEIGHTS["place_plus"]
        
        # 보너스 항목: 있으면 +2점, 없어도 0점 (감점 없음)
        score = max_score if is_place_plus else 0
        status = "PASS"  # 항상 PASS (보너스 항목)
        
        recommendations = []
        place_id = data.get("place_id", "")
        
        if not is_place_plus:
            # 플레이스 플러스 미가입
            messages = [
                "최근 네이버에서는 플레이스 플러스를 사용하는 업장들에게 신뢰 있는 데이터를 통해서 더 많은 고객에게 노출을 해주는 움직임을 보입니다. 또한 쿠폰, 공지, 예약 등 다양한 관리 기능을 사용할 수 있습니다.\n\n구체적 방법: 네이버 플레이스 앱에서 사업자 인증 → 플러스 기능 활성화",
                "플레이스 플러스를 가입하세요! 네이버는 플러스 업장에 더 많은 노출 기회를 제공합니다. 쿠폰, 공지, 예약 관리 등 강력한 기능도 사용할 수 있습니다.",
                "플레이스 플러스 미가입 시 불이익이 있을 수 있습니다! 네이버는 플러스 업장을 우대합니다. 즉시 가입하여 노출 증가와 관리 기능을 활용하세요."
            ]
            message = self._get_message_variant(place_id, "place_plus_none", messages)
            
            recommendations.append({
                "action": "플레이스 플러스 가입 권장",
                "method": message,
                "estimated_gain": 2.0,
                "priority": "high",
                "note": "보너스 점수 + 노출 증가 + 관리 기능 확대",
            })
        else:
            # 플레이스 플러스 가입 중
            messages = [
                "플레이스 플러스를 사용 중이시군요! 👍 최근 네이버는 플레이스 플러스 업장에 더 많은 노출 기회를 주고 있습니다. 쿠폰, 공지, 예약 등 다양한 기능을 적극 활용하세요!",
                "완벽합니다! 🌟 플레이스 플러스로 노출 우대를 받고 계십니다. 쿠폰과 공지사항 기능을 적극 활용하면 더 큰 효과를 볼 수 있습니다.",
                "훌륭합니다! 💪 플레이스 플러스 가입으로 관리 기능을 최대한 활용하고 계시군요. 네이버의 노출 우대 혜택도 누리세요!"
            ]
            message = self._get_message_variant(place_id, "place_plus_using", messages)
            
            recommendations.append({
                "action": "플레이스 플러스 활용 중",
                "method": message,
                "estimated_gain": 0,
                "priority": "low",
            })
        
        return {
            "score": round(score, 1),
            "max_score": max_score,
            "status": status,
            "is_bonus": True,  # 보너스 항목 표시
            "evidence": {
                "uses_place_plus": is_place_plus,
            },
            "recommendations": recommendations,
        }
    
    def _eval_smart_call(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """스마트콜 평가 (2점 보너스)"""
        phone_number = data.get("phone_number", "") or ""
        # 0507로 시작하면 스마트콜
        uses_smart_call = phone_number.startswith("0507")
        max_score = self.WEIGHTS["smart_call"]
        
        # 보너스 항목: 있으면 +2점, 없어도 0점 (감점 없음)
        score = max_score if uses_smart_call else 0
        status = "PASS"  # 항상 PASS (보너스 항목)
        
        recommendations = []
        place_id = data.get("place_id", "")
        
        if not uses_smart_call:
            # 스마트콜 미사용
            messages = [
                "네이버에서는 우리 매장이 얼마나 많은 스마트콜을 받고 있는지도 확인이 가능합니다. 스마트콜은 통화 자동 녹음, 예약 관리, 통계 제공 등 다양한 기능을 제공합니다. 최대한 스마트콜을 사용해주세요!\n\n구체적 방법: 네이버 스마트콜 신청 → 0507 번호 발급 → 통화 분석 및 예약 관리",
                "스마트콜을 도입하세요! 네이버는 스마트콜 사용 업장을 긍정적으로 평가합니다. 통화 녹음, 예약 관리, 통화 통계 등 편리한 기능도 사용할 수 있습니다.",
                "스마트콜 미사용은 아쉽습니다! 0507 번호를 발급받으면 네이버가 통화량을 확인하고, 예약 관리도 편리합니다. 적극 활용하세요!"
            ]
            message = self._get_message_variant(place_id, "smart_call_none", messages)
            
            recommendations.append({
                "action": "스마트콜 도입 권장",
                "method": message,
                "estimated_gain": 2.0,
                "priority": "medium",
                "note": "보너스 점수 + 통화 관리 + 통계 분석",
            })
        else:
            # 스마트콜 사용 중
            messages = [
                "스마트콜을 사용 중이시군요! 👍 네이버는 스마트콜 사용 여부와 통화량도 확인합니다. 통화 분석과 예약 관리 기능을 적극 활용하세요!",
                "완벽합니다! 🌟 스마트콜로 통화 관리를 효율적으로 하고 계시네요. 네이버도 이를 긍정적으로 평가합니다.",
                "훌륭합니다! 💪 스마트콜 활용으로 예약 관리가 편리하고, 플레이스 점수에도 도움이 됩니다. 계속 사용하세요!"
            ]
            message = self._get_message_variant(place_id, "smart_call_using", messages)
            
            recommendations.append({
                "action": "스마트콜 활용 중",
                "method": message,
                "estimated_gain": 0,
                "priority": "low",
            })
        
        return {
            "score": round(score, 1),
            "max_score": max_score,
            "status": status,
            "is_bonus": True,  # 보너스 항목 표시
            "evidence": {
                "uses_smart_call": uses_smart_call,
                "phone_number": phone_number,
            },
            "recommendations": recommendations,
        }
    
    def _calculate_grade(self, score: float) -> str:
        """점수로 등급 산정 (한 단계 상향 조정)"""
        if score >= 80:
            return "S"
        elif score >= 70:
            return "A"
        elif score >= 60:
            return "B"
        elif score >= 50:
            return "C"
        else:
            return "D"
    
    def _calculate_item_grade(self, score: float, max_score: float) -> str:
        """항목별 등급 산정 (백분율 기준, 한 단계 상향 조정)"""
        if max_score == 0:
            return "N/A"
        
        percentage = (score / max_score) * 100
        
        if percentage >= 80:
            return "S"
        elif percentage >= 70:
            return "A"
        elif percentage >= 60:
            return "B"
        elif percentage >= 50:
            return "C"
        else:
            return "D"
    
    def _generate_priority_actions(self, evaluations: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
        """우선순위 액션 생성 - category별 중복 방지 + estimated_gain 큰 순"""
        all_actions = []
        
        for category, eval_data in evaluations.items():
            for rec in eval_data.get("recommendations", []):
                all_actions.append({
                    "category": category,
                    "category_name": self.CATEGORY_NAMES.get(category, category),
                    "status": eval_data["status"],
                    **rec
                })
        
        # 정렬: priority(critical > high > medium > low) > estimated_gain 내림차순
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        all_actions.sort(
            key=lambda x: (
                priority_order.get(x.get("priority", "low"), 3),
                -x.get("estimated_gain", 0)
            )
        )
        
        # 같은 category의 액션이 중복되지 않도록 필터링
        # 각 category에서 가장 우선순위 높은 하나만 선택
        seen_categories = set()
        unique_actions = []
        
        for action in all_actions:
            category = action["category"]
            if category not in seen_categories:
                seen_categories.add(category)
                unique_actions.append(action)
        
        return unique_actions


# 싱글톤 인스턴스
diagnosis_engine = NaverPlaceDiagnosisEngine()
