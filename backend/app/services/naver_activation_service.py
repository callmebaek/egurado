"""네이버 플레이스 활성화 서비스"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from app.services.naver_complete_diagnosis_service import complete_diagnosis_service
from app.services.naver_review_service import naver_review_service
from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)


class NaverActivationService:
    """네이버 플레이스 활성화 분석 서비스"""
    
    async def get_activation_info(self, store_id: str, place_id: str, store_name: str) -> Dict[str, Any]:
        """
        플레이스 활성화 정보 조회
        
        Args:
            store_id: 매장 ID (UUID)
            place_id: 네이버 플레이스 ID
            store_name: 매장명
            
        Returns:
            활성화 정보 딕셔너리
        """
        logger.info(f"[플레이스 활성화] 시작: store_id={store_id}, place_id={place_id}, store_name={store_name}")
        
        try:
            # 1. 플레이스 진단 정보 가져오기 (완전 진단 서비스 활용)
            place_details = await complete_diagnosis_service.diagnose_place(place_id, store_name)
            
            if not place_details:
                raise Exception("플레이스 정보를 가져올 수 없습니다")
            
            # 2. 리뷰 추이 분석 (진단 히스토리 활용)
            visitor_review_trend_30d = await self._analyze_review_trend(store_id, 'visitor', 30)
            visitor_review_trend_7d = await self._analyze_review_trend(store_id, 'visitor', 7)
            blog_review_trend_30d = await self._analyze_review_trend(store_id, 'blog', 30)
            blog_review_trend_7d = await self._analyze_review_trend(store_id, 'blog', 7)
            
            # 3. 답글 대기 수 계산 (최근 300개 리뷰 기준)
            pending_reply_info = await self._get_pending_reply_count(place_id)
            
            # 4. 공지사항 분석
            announcement_info = self._analyze_announcements(place_details.get('announcements', []))
            
            # 5. 프로모션 분석
            promotion_info = self._analyze_promotions(place_details.get('promotions', {}))
            
            # 6. SNS 및 웹사이트 분석
            sns_info = self._analyze_sns(place_details)
            
            # 7. 네이버 서비스 분석
            naver_services = self._analyze_naver_services(place_details)
            
            # 8. 이슈 분석 (부족한 항목 우선 표시)
            issues = self._analyze_issues(
                place_details,
                pending_reply_info,
                announcement_info,
                promotion_info,
                sns_info,
                naver_services,
                visitor_review_trend_7d,
                blog_review_trend_7d
            )
            
            # 9. 결과 반환
            result = {
                'store_name': store_name,
                'place_id': place_id,
                
                # 리뷰 관련
                'visitor_review_count': place_details.get('visitor_review_count', 0),
                'visitor_review_trend_30d': visitor_review_trend_30d,
                'visitor_review_trend_7d': visitor_review_trend_7d,
                
                'pending_reply_count': pending_reply_info['count'],
                'oldest_pending_review_date': pending_reply_info.get('oldest_date'),
                
                'blog_review_count': place_details.get('blog_review_count', 0),
                'blog_review_trend_30d': blog_review_trend_30d,
                'blog_review_trend_7d': blog_review_trend_7d,
                
                # 플레이스 정보
                'has_promotion': promotion_info['has_promotion'],
                'promotion_count': promotion_info['count'],
                
                'has_announcement': announcement_info['has_announcement'],
                'announcement_count': announcement_info['count'],
                'last_announcement_date': announcement_info.get('last_date'),
                'days_since_last_announcement': announcement_info.get('days_since_last'),
                
                'description': place_details.get('description'),
                'directions': place_details.get('directions'),
                
                # SNS 및 웹사이트
                'homepage': sns_info.get('homepage'),
                'instagram': sns_info.get('instagram'),
                'facebook': sns_info.get('facebook'),
                'blog': sns_info.get('blog'),
                
                # 네이버 서비스
                'has_smart_call': naver_services['smart_call'],
                'has_naver_pay': naver_services['naver_pay'],
                'has_naver_booking': naver_services['naver_booking'],
                'has_naver_talk': naver_services['naver_talk'],
                
                # 요약 정보
                'issues': issues,
            }
            
            logger.info(f"[플레이스 활성화] 완료: {len(issues)}개 이슈 발견")
            return result
            
        except Exception as e:
            logger.error(f"[플레이스 활성화] 오류: {str(e)}", exc_info=True)
            raise
    
    async def _analyze_review_trend(
        self, 
        store_id: str, 
        review_type: str,  # 'visitor' or 'blog'
        days: int
    ) -> Dict[str, Any]:
        """
        리뷰 추이 분석 (진단 히스토리 활용)
        
        Args:
            store_id: 매장 ID
            review_type: 리뷰 타입 ('visitor' 또는 'blog')
            days: 분석 기간 (일)
            
        Returns:
            추이 정보 (평균, 변화율, 방향)
        """
        try:
            supabase = get_supabase_client()
            
            # 진단 히스토리에서 최근 N일 데이터 조회
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            history_result = supabase.table("diagnosis_history").select(
                "diagnosed_at, place_details"
            ).eq(
                "store_id", store_id
            ).gte(
                "diagnosed_at", cutoff_date.isoformat()
            ).order(
                "diagnosed_at", desc=True
            ).execute()
            
            if not history_result.data or len(history_result.data) < 2:
                # 데이터 부족 시 기본값 반환
                return {
                    'average': 0,
                    'change_percentage': 0,
                    'direction': 'stable'
                }
            
            # 리뷰 수 추출
            review_counts = []
            field_name = 'visitor_review_count' if review_type == 'visitor' else 'blog_review_count'
            
            for record in history_result.data:
                place_details = record.get('place_details', {})
                count = place_details.get(field_name, 0)
                if count is not None:
                    review_counts.append(count)
            
            if len(review_counts) < 2:
                return {
                    'average': review_counts[0] if review_counts else 0,
                    'change_percentage': 0,
                    'direction': 'stable'
                }
            
            # 평균 계산
            average = sum(review_counts) / len(review_counts)
            
            # 변화율 계산 (최신 vs 가장 오래된)
            latest = review_counts[0]
            oldest = review_counts[-1]
            
            if oldest == 0:
                change_percentage = 0
                direction = 'stable'
            else:
                change_percentage = ((latest - oldest) / oldest) * 100
                
                if change_percentage > 5:
                    direction = 'up'
                elif change_percentage < -5:
                    direction = 'down'
                else:
                    direction = 'stable'
            
            return {
                'average': round(average, 1),
                'change_percentage': round(change_percentage, 1),
                'direction': direction
            }
            
        except Exception as e:
            logger.error(f"[리뷰 추이 분석] 오류: {str(e)}")
            return {
                'average': 0,
                'change_percentage': 0,
                'direction': 'stable'
            }
    
    async def _get_pending_reply_count(self, place_id: str) -> Dict[str, Any]:
        """
        답글 대기 수 계산 (최근 300개 리뷰 기준)
        
        Args:
            place_id: 네이버 플레이스 ID
            
        Returns:
            답글 대기 정보 (개수, 가장 오래된 날짜)
        """
        try:
            # 최근 300개 리뷰 조회
            reviews = await naver_review_service.get_visitor_reviews(place_id, size=300)
            
            if not reviews or not reviews.get('items'):
                return {'count': 0}
            
            pending_reviews = []
            
            for review in reviews['items']:
                # 답글이 없거나 비어있는 경우
                reply_text = review.get('reply', {}).get('replyText', '').strip()
                if not reply_text:
                    pending_reviews.append(review)
            
            if not pending_reviews:
                return {'count': 0}
            
            # 가장 오래된 답글 대기 리뷰 날짜 찾기
            oldest_review = pending_reviews[-1]  # 리뷰는 최신순으로 정렬되어 있음
            oldest_date = oldest_review.get('visitDate') or oldest_review.get('created')
            
            return {
                'count': len(pending_reviews),
                'oldest_date': oldest_date
            }
            
        except Exception as e:
            logger.error(f"[답글 대기 수 계산] 오류: {str(e)}")
            return {'count': 0}
    
    def _analyze_announcements(self, announcements: List[Any]) -> Dict[str, Any]:
        """공지사항 분석"""
        if not announcements:
            return {
                'has_announcement': False,
                'count': 0
            }
        
        count = len(announcements)
        
        # 최근 공지사항 날짜 확인
        try:
            # 공지사항은 보통 created_at 또는 date 필드를 가짐
            latest_announcement = announcements[0]
            last_date_str = latest_announcement.get('created_at') or latest_announcement.get('date')
            
            if last_date_str:
                last_date = datetime.fromisoformat(last_date_str.replace('Z', '+00:00'))
                days_since = (datetime.now(timezone.utc) - last_date).days
                
                return {
                    'has_announcement': True,
                    'count': count,
                    'last_date': last_date.strftime('%Y-%m-%d'),
                    'days_since_last': days_since
                }
        except Exception as e:
            logger.error(f"[공지사항 날짜 파싱] 오류: {str(e)}")
        
        return {
            'has_announcement': True,
            'count': count
        }
    
    def _analyze_promotions(self, promotions: Dict[str, Any]) -> Dict[str, Any]:
        """프로모션 분석"""
        if not promotions:
            return {
                'has_promotion': False,
                'count': 0
            }
        
        total_count = promotions.get('total', 0)
        coupons = promotions.get('coupons', [])
        
        count = total_count or len(coupons)
        
        return {
            'has_promotion': count > 0,
            'count': count
        }
    
    def _analyze_sns(self, place_details: Dict[str, Any]) -> Dict[str, Optional[str]]:
        """SNS 및 웹사이트 분석"""
        return {
            'homepage': place_details.get('homepage_url') or place_details.get('homepage'),
            'instagram': place_details.get('instagram'),
            'facebook': place_details.get('facebook'),
            'blog': place_details.get('blog')
        }
    
    def _analyze_naver_services(self, place_details: Dict[str, Any]) -> Dict[str, bool]:
        """네이버 서비스 사용 여부 분석"""
        return {
            'smart_call': bool(place_details.get('smart_call') or place_details.get('has_smart_call')),
            'naver_pay': bool(place_details.get('naver_pay') or place_details.get('has_naver_pay')),
            'naver_booking': bool(place_details.get('booking_available') or place_details.get('has_naver_booking')),
            'naver_talk': bool(place_details.get('naver_talk') or place_details.get('has_naver_talk'))
        }
    
    def _analyze_issues(
        self,
        place_details: Dict[str, Any],
        pending_reply_info: Dict[str, Any],
        announcement_info: Dict[str, Any],
        promotion_info: Dict[str, Any],
        sns_info: Dict[str, Optional[str]],
        naver_services: Dict[str, bool],
        visitor_review_trend_7d: Dict[str, Any],
        blog_review_trend_7d: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """이슈 분석 (부족한 항목 우선 표시)"""
        issues = []
        
        # 1. 답글 대기 (높은 우선순위)
        if pending_reply_info['count'] > 10:
            issues.append({
                'category': '답글 대기',
                'severity': 'high',
                'message': f"{pending_reply_info['count']}개의 리뷰에 답글이 없습니다",
                'action': 'AI 답글생성을 이용해서 빠르게 답글을 작성하세요'
            })
        elif pending_reply_info['count'] > 0:
            issues.append({
                'category': '답글 대기',
                'severity': 'medium',
                'message': f"{pending_reply_info['count']}개의 리뷰에 답글이 없습니다",
                'action': 'AI 답글생성을 이용해서 빠르게 답글을 작성하세요'
            })
        
        # 2. 리뷰 추이 하락
        if visitor_review_trend_7d['direction'] == 'down':
            issues.append({
                'category': '방문자 리뷰 감소',
                'severity': 'medium',
                'message': f"최근 7일간 방문자 리뷰가 {abs(visitor_review_trend_7d['change_percentage'])}% 감소했습니다",
                'action': '고객 리뷰 작성을 독려하는 이벤트를 진행해보세요'
            })
        
        if blog_review_trend_7d['direction'] == 'down':
            issues.append({
                'category': '블로그 리뷰 감소',
                'severity': 'low',
                'message': f"최근 7일간 블로그 리뷰가 {abs(blog_review_trend_7d['change_percentage'])}% 감소했습니다",
                'action': '블로거 초대 이벤트를 고려해보세요'
            })
        
        # 3. 공지사항 부족
        if not announcement_info['has_announcement']:
            issues.append({
                'category': '공지사항 없음',
                'severity': 'medium',
                'message': '등록된 공지사항이 없습니다',
                'action': '최소 주 1회 공지사항을 등록하여 고객과 소통하세요'
            })
        elif announcement_info.get('days_since_last', 0) > 7:
            issues.append({
                'category': '공지사항 업데이트 필요',
                'severity': 'low',
                'message': f"마지막 공지사항이 {announcement_info['days_since_last']}일 전입니다",
                'action': '새로운 소식이나 이벤트를 공지사항으로 등록하세요'
            })
        
        # 4. 프로모션 부족
        if not promotion_info['has_promotion']:
            issues.append({
                'category': '프로모션 없음',
                'severity': 'low',
                'message': '진행 중인 프로모션/쿠폰이 없습니다',
                'action': '스마트플레이스 센터에서 쿠폰을 등록하여 방문을 유도하세요'
            })
        
        # 5. 업체소개글 부족
        if not place_details.get('description'):
            issues.append({
                'category': '업체소개글 없음',
                'severity': 'medium',
                'message': '업체소개글이 등록되지 않았습니다',
                'action': 'SEO 최적화된 업체소개글을 작성하세요'
            })
        
        # 6. 찾아오는길 부족
        if not place_details.get('directions'):
            issues.append({
                'category': '찾아오는길 없음',
                'severity': 'low',
                'message': '찾아오는길이 등록되지 않았습니다',
                'action': '상세한 길 안내를 작성하여 방문 편의성을 높이세요'
            })
        
        # 7. SNS 미등록
        if not sns_info.get('instagram'):
            issues.append({
                'category': '인스타그램 미등록',
                'severity': 'medium',
                'message': '인스타그램이 등록되지 않았습니다',
                'action': '인스타그램 공식계정을 업체정보에 추가하세요'
            })
        
        if not sns_info.get('blog'):
            issues.append({
                'category': '블로그 미등록',
                'severity': 'low',
                'message': '네이버 블로그가 등록되지 않았습니다',
                'action': '운영 중인 네이버 블로그를 업체정보에 추가하세요'
            })
        
        # 8. 네이버 서비스 미사용
        if not naver_services['naver_pay']:
            issues.append({
                'category': '네이버페이 미사용',
                'severity': 'low',
                'message': '네이버페이를 사용하지 않고 있습니다',
                'action': '네이버페이를 도입하여 결제 편의성을 높이세요'
            })
        
        if not naver_services['smart_call']:
            issues.append({
                'category': '스마트콜 미사용',
                'severity': 'low',
                'message': '스마트콜을 사용하지 않고 있습니다',
                'action': '스마트콜을 설정하여 전화 문의를 효율적으로 관리하세요'
            })
        
        # 우선순위 정렬 (high > medium > low)
        severity_order = {'high': 0, 'medium': 1, 'low': 2}
        issues.sort(key=lambda x: severity_order[x['severity']])
        
        return issues


# 싱글톤 인스턴스
activation_service = NaverActivationService()
