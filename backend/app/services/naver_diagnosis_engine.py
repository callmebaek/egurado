"""네이버 플레이스 진단 엔진 (100점 만점)"""
from typing import Dict, Any, List, Tuple
from datetime import datetime, timedelta
import re
import logging

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
        """방문자 리뷰 수 평가 (12점)"""
        count = data.get("visitor_review_count", 0) or 0
        max_score = self.WEIGHTS["visitor_reviews"]
        
        # 점수 계산
        if count >= 3000:
            score = 12
            status = "PASS"
        elif count >= 1500:
            score = 10
            status = "PASS"
        elif count >= 1000:
            score = 8
            status = "WARN"
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
        
        # 권장사항
        recommendations = []
        if count < 3000:
            gap = 3000 - count if count >= 1500 else (1500 - count if count >= 1000 else 1000 - count)
            next_tier = 3000 if count >= 1500 else (1500 if count >= 1000 else 1000)
            recommendations.append({
                "action": f"방문자 리뷰 {gap}개 더 받기 (목표: {next_tier}개)",
                "method": "서비스 품질 개선, 리뷰 요청 프로세스 개선 (결제 시 QR 코드 안내 등)",
                "estimated_gain": 2 if gap <= 500 else 4,
                "priority": "high" if count < 500 else "medium",
            })
        
        if count < 200:
            recommendations.append({
                "action": "초기 신뢰도 확보를 위한 서비스 개선",
                "method": "만족도 높은 고객에게 자연스럽게 리뷰 작성 안내, 리뷰 이벤트 고지(단, 대가 제공 금지)",
                "estimated_gain": 4,
                "priority": "high",
            })
        
        return {
            "score": score,
            "max_score": max_score,
            "status": status,
            "evidence": {
                "count": count,
                "tier": "상위권" if count >= 1500 else ("중위권" if count >= 500 else "하위권")
            },
            "recommendations": recommendations,
        }
    
    def _eval_blog_reviews(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """블로그 리뷰 평가 (8점) - 최근 90일 기준"""
        total_count = data.get("blog_review_count", 0) or 0
        max_score = self.WEIGHTS["blog_reviews"]
        
        # TODO: 최근 90일 데이터가 없으므로 전체 수로 임시 계산
        # 실제로는 최근 90일 데이터를 별도로 수집해야 함
        recent_count = total_count  # 임시
        accuracy_warning = True
        
        # 점수 계산 (최근 90일 기준으로 추정)
        estimated_recent = min(recent_count, total_count // 3)  # 전체의 1/3 정도로 추정
        
        if estimated_recent >= 30:
            score = 8
            status = "PASS"
        elif estimated_recent >= 15:
            score = 6
            status = "PASS"
        elif estimated_recent >= 5:
            score = 4
            status = "WARN"
        elif estimated_recent >= 1:
            score = 2
            status = "WARN"
        else:
            score = 0
            status = "FAIL"
        
        recommendations = []
        if estimated_recent < 30:
            gap = 30 - estimated_recent
            recommendations.append({
                "action": f"블로그 체험단/협찬 진행하여 리뷰 {gap}개 확보",
                "method": "블로그 체험단 플랫폼 활용 (레뷰, 서울오빠 등), 인플루언서 초대",
                "estimated_gain": 2 if gap <= 10 else 4,
                "priority": "high" if estimated_recent < 15 else "medium",
            })
        
        if estimated_recent < 5:
            recommendations.append({
                "action": "온라인 노출 강화를 위한 콘텐츠 마케팅",
                "method": "SNS 해시태그 활용, 포토존 설치, 시즌 메뉴 출시",
                "estimated_gain": 2,
                "priority": "medium",
            })
        
        return {
            "score": score,
            "max_score": max_score,
            "status": status,
            "evidence": {
                "total_count": total_count,
                "estimated_recent_90d": estimated_recent,
                "accuracy_warning": accuracy_warning,
                "note": "실제 최근 90일 데이터 수집 필요"
            },
            "recommendations": recommendations,
        }
    
    def _eval_images(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """이미지 평가 (10점) - 수량(7점) + 최신성(3점)"""
        image_count = data.get("image_count", 0) or 0
        max_score = self.WEIGHTS["images"]
        
        # 수량 점수 (최대 7점)
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
        if image_count < 120:
            gap = 120 - image_count
            recommendations.append({
                "action": f"이미지 {gap}장 추가 업로드 (현재 {image_count}장 → 목표 120장)",
                "method": "메뉴별 3장 이상, 인테리어 다양한 각도, 외부 전경, 주차장 등",
                "estimated_gain": min(gap / 120 * 7, 7 - quantity_score),
                "priority": "high" if image_count < 40 else "medium",
            })
        
        if image_count < 40:
            recommendations.append({
                "action": "고품질 이미지로 첫인상 개선",
                "method": "자연광 활용, 음식 스타일링, 전문 촬영 고려",
                "estimated_gain": 2,
                "priority": "high",
            })
        
        return {
            "score": round(score, 1),
            "max_score": max_score,
            "status": status,
            "evidence": {
                "image_count": image_count,
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
        max_score = self.WEIGHTS["menus"]
        
        if menu_count == 0:
            return {
                "score": 0,
                "max_score": max_score,
                "status": "FAIL",
                "evidence": {"menu_count": 0, "description_filled_rate": 0},
                "recommendations": [
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
                ],
            }
        
        # 완성도 평가 (설명 채움률)
        described_count = sum(1 for m in menus if m.get("description"))
        description_filled_rate = described_count / menu_count if menu_count > 0 else 0
        completeness_score = description_filled_rate * 8
        
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
        if description_filled_rate < 1.0:
            gap = menu_count - described_count
            recommendations.append({
                "action": f"메뉴 설명 {gap}개 추가 작성 (완성도 {description_filled_rate*100:.0f}% → 100%)",
                "method": "재료, 조리법, 맛의 특징, 추천 상황 포함",
                "copy_example": "직접 만든 수제 소스로 맛을 낸 시그니처 파스타. 신선한 해산물과 크림의 조화가 일품입니다.",
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
                "description_filled_rate": round(description_filled_rate, 2),
                "completeness_score": round(completeness_score, 1),
                "seo_score": seo_score,
                "seo_checks": seo_checks,
            },
            "recommendations": recommendations,
        }
    
    def _eval_conveniences(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """편의시설 평가 (6점)"""
        conveniences = data.get("conveniences", []) or []
        count = len(conveniences)
        max_score = self.WEIGHTS["conveniences"]
        
        if count >= 6:
            score = 6
            status = "PASS"
        elif count >= 3:
            score = 4
            status = "WARN"
        elif count >= 1:
            score = 2
            status = "WARN"
        else:
            score = 0
            status = "FAIL"
        
        recommendations = []
        if count < 6:
            gap = 6 - count
            available = ["주차", "무선 인터넷", "예약", "단체 이용 가능", "포장", "배달", "반려동물 동반"]
            missing = [c for c in available if c not in conveniences][:gap]
            
            recommendations.append({
                "action": f"편의시설 {gap}개 추가 등록 (현재 {count}개 → 목표 6개)",
                "method": f"가능한 항목: {', '.join(missing)}",
                "estimated_gain": gap,
                "priority": "medium",
            })
        
        return {
            "score": score,
            "max_score": max_score,
            "status": status,
            "evidence": {
                "count": count,
                "items": conveniences,
            },
            "recommendations": recommendations,
        }
    
    def _eval_naverpay(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """네이버페이 평가 (6점)"""
        # 결제 수단에서 네이버페이 확인
        payment_methods = data.get("payment_methods", []) or []
        supports_naverpay = "네이버페이" in payment_methods or "NAVER PAY" in str(payment_methods).upper()
        
        max_score = self.WEIGHTS["naverpay"]
        score = max_score if supports_naverpay else 0
        status = "PASS" if supports_naverpay else "FAIL"
        
        recommendations = []
        if not supports_naverpay:
            recommendations.append({
                "action": "네이버페이 결제 도입",
                "method": "네이버페이 가맹점 신청 → POS 연동 또는 QR 결제 도입",
                "estimated_gain": 6,
                "priority": "high",
                "note": "네이버 플레이스 노출 우대 혜택",
            })
        
        return {
            "score": score,
            "max_score": max_score,
            "status": status,
            "evidence": {
                "supports_naverpay": supports_naverpay,
                "payment_methods": payment_methods,
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
            "score": score,
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
        if recent_60d_count < 2:
            gap = 2 - recent_60d_count
            target_frequency = "월 1회 이상" if gap == 1 else "월 1-2회"
            recommendations.append({
                "action": f"공지사항 정기 업데이트 시작 (목표: {target_frequency})",
                "method": "앞으로 신메뉴 출시, 이벤트, 시즌 프로모션 등 월 1-2회 공지 작성",
                "copy_example": "🎉 신메뉴 출시! 여름 한정 시그니처 빙수 / 📢 8월 한 달간 전 메뉴 10% 할인",
                "estimated_gain": gap * 4,
                "priority": "high" if recent_60d_count == 0 else "medium",
            })
        
        if latest_days_ago and latest_days_ago > 30:
            recommendations.append({
                "action": "30일 이내 신규 공지 작성으로 매장 활성도 표시",
                "method": "이번 주/월 이벤트, 신메뉴 안내, 영업시간 변경 등 최신 소식 공유",
                "estimated_gain": 2,
                "priority": "high",
            })
        
        return {
            "score": score,
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
        found_regions = [r for r in all_regions if r in description]
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
            "score": score,
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
            "score": score,
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
        if not is_place_plus:
            recommendations.append({
                "action": "플레이스 플러스 가입으로 관리 기능 확대",
                "method": "네이버 플레이스 앱에서 사업자 인증 → 플러스 기능 활성화",
                "estimated_gain": 2,
                "priority": "high",
                "note": "보너스 점수 항목 - 쿠폰, 공지, 예약 등 관리 기능 확대",
            })
        
        return {
            "score": score,
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
        if not uses_smart_call:
            recommendations.append({
                "action": "스마트콜 도입으로 통화 관리 기능 활용",
                "method": "네이버 스마트콜 신청 → 0507 번호 발급 → 통화 분석 및 예약 관리",
                "estimated_gain": 2,
                "priority": "medium",
                "note": "보너스 점수 항목 - 통화 자동 녹음, 예약 관리, 통계 제공",
            })
        
        return {
            "score": score,
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
        """우선순위 액션 생성 - estimated_gain 큰 순 + 의존성 낮은 순"""
        all_actions = []
        
        for category, eval_data in evaluations.items():
            for rec in eval_data.get("recommendations", []):
                all_actions.append({
                    "category": category,
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
        
        return all_actions


# 싱글톤 인스턴스
diagnosis_engine = NaverPlaceDiagnosisEngine()
