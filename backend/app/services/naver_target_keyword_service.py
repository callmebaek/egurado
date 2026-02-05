"""
타겟 키워드 추출 및 진단 서비스
매장의 최적 키워드를 추천하고 SEO 최적화 상태를 분석
"""
import re
import logging
import asyncio
from typing import List, Dict, Any, Optional
from itertools import product

from app.services.naver_keyword_search_volume_service import NaverKeywordSearchVolumeService
from app.services.naver_html_parser_service import NaverHtmlParserService
from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)


class NaverTargetKeywordService:
    """타겟 키워드 추출 및 진단 서비스"""
    
    def __init__(self):
        self.keyword_service = NaverKeywordSearchVolumeService()
        self.html_parser = NaverHtmlParserService()
    
    async def analyze_target_keywords(
        self,
        store_id: str,
        user_id: str,
        regions: List[str],
        landmarks: List[str],
        menus: List[str],
        industries: List[str],
        others: List[str]
    ) -> Dict[str, Any]:
        """
        타겟 키워드 분석 메인 함수
        
        Args:
            store_id: 매장 ID
            user_id: 사용자 ID
            regions: 지역명 리스트
            landmarks: 랜드마크 리스트
            menus: 메뉴/상품명 리스트
            industries: 업종 리스트
            others: 기타 키워드 리스트
        
        Returns:
            분석 결과
        """
        try:
            logger.info(f"[타겟 키워드] 분석 시작: store_id={store_id}")
            
            # 1. 매장 정보 조회
            store_info = await self._get_store_info(store_id)
            if not store_info:
                return {
                    "status": "error",
                    "message": "매장 정보를 찾을 수 없습니다."
                }
            
            place_id = store_info.get("place_id")
            if not place_id:
                return {
                    "status": "error",
                    "message": "Place ID가 없습니다."
                }
            
            # 2. 키워드 조합 생성
            logger.info("[타겟 키워드] 키워드 조합 생성")
            combinations = self._generate_keyword_combinations(
                regions=regions,
                landmarks=landmarks,
                menus=menus,
                industries=industries,
                others=others
            )
            
            logger.info(f"[타겟 키워드] 총 {len(combinations)}개 조합 생성")
            
            # 3. 검색량 조회 (최대 5개씩 배치 처리)
            logger.info("[타겟 키워드] 검색량 조회 시작")
            keyword_volumes = await self._get_keyword_volumes_batch(combinations)
            
            # 4. 상위 20개 키워드 선정
            logger.info("[타겟 키워드] 상위 키워드 선정")
            top_keywords = self._select_top_keywords(keyword_volumes, limit=20)
            
            # 5. 플레이스 상세 정보 조회
            logger.info("[타겟 키워드] 플레이스 정보 조회")
            place_details = await self._get_place_details(place_id)
            
            # 6. 플레이스 순위 조회 (에러가 발생해도 계속 진행)
            logger.info("[타겟 키워드] 플레이스 순위 조회 시작")
            try:
                rank_data = await self._get_place_ranks(place_id, top_keywords)
                logger.info(f"[타겟 키워드] 순위 조회 완료: {len(rank_data)}개")
            except Exception as e:
                logger.error(f"[타겟 키워드] 순위 조회 실패 (계속 진행): {str(e)}")
                rank_data = {}
            
            # 7. 리뷰 데이터 조회 (블로그 + 방문자 리뷰, 에러가 발생해도 계속 진행)
            logger.info("[타겟 키워드] 리뷰 데이터 조회 시작")
            try:
                review_data = await self._get_reviews_data(place_id)
                logger.info(f"[타겟 키워드] 리뷰 조회 완료: 방문자 리뷰 {len(review_data.get('visitor_reviews', ''))}자")
            except Exception as e:
                logger.error(f"[타겟 키워드] 리뷰 조회 실패 (계속 진행): {str(e)}")
                review_data = {"visitor_reviews": ""}
            
            # 8. SEO 분석 (키워드 매칭)
            logger.info("[타겟 키워드] SEO 분석 시작")
            seo_analysis = self._analyze_seo(
                top_keywords=top_keywords,
                place_details=place_details,
                review_data=review_data,
                input_keywords={
                    "regions": regions,
                    "landmarks": landmarks,
                    "menus": menus,
                    "industries": industries,
                    "others": others
                }
            )
            
            logger.info("[타겟 키워드] 분석 완료")
            
            return {
                "status": "success",
                "data": {
                    "store_info": {
                        "store_id": store_id,
                        "place_id": place_id,
                        "store_name": store_info.get("store_name"),
                        "address": store_info.get("address")
                    },
                    "input_keywords": {
                        "regions": regions,
                        "landmarks": landmarks,
                        "menus": menus,
                        "industries": industries,
                        "others": others
                    },
                    "total_combinations": len(combinations),
                    "top_keywords": top_keywords,
                    "rank_data": rank_data,
                    "seo_analysis": seo_analysis,
                    "place_details": place_details
                }
            }
            
        except Exception as e:
            logger.error(f"[타겟 키워드] 분석 실패: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "status": "error",
                "message": f"분석 중 오류가 발생했습니다: {str(e)}"
            }
    
    async def _get_store_info(self, store_id: str) -> Optional[Dict[str, Any]]:
        """매장 정보 조회"""
        try:
            logger.info(f"[타겟 키워드] 매장 정보 조회 시도: store_id={store_id}, type={type(store_id)}")
            supabase = get_supabase_client()
            
            # .single() 대신 .execute() 사용하여 에러 방지
            result = supabase.table("stores").select("*").eq("id", store_id).execute()
            
            logger.info(f"[타겟 키워드] Supabase 응답: data_count={len(result.data) if result.data else 0}")
            
            if not result.data or len(result.data) == 0:
                logger.warning(f"[타겟 키워드] 매장 {store_id}를 DB에서 찾을 수 없음")
                return None
            
            if len(result.data) > 1:
                logger.warning(f"[타겟 키워드] 매장 {store_id}가 여러 개 존재: {len(result.data)}개 (첫 번째 사용)")
            
            store_data = result.data[0]
            logger.info(f"[타겟 키워드] 매장 정보 조회 성공: name={store_data.get('name')}, place_id={store_data.get('place_id')}")
            return store_data
            
        except Exception as e:
            logger.error(f"[타겟 키워드] 매장 정보 조회 실패: {str(e)}")
            import traceback
            logger.error(f"[타겟 키워드] Traceback:\n{traceback.format_exc()}")
            return None
    
    def _generate_keyword_combinations(
        self,
        regions: List[str],
        landmarks: List[str],
        menus: List[str],
        industries: List[str],
        others: List[str]
    ) -> List[Dict[str, Any]]:
        """
        키워드 조합 생성
        
        조합 로직:
        - 지역명 X 업종
        - 지역명 X 메뉴/상품명
        - 랜드마크 X 업종
        - 랜드마크 X 메뉴/상품명
        - 지역명 X 기타
        - 랜드마크 X 기타
        """
        combinations = []
        
        # 1. 지역명 X 업종
        for region, industry in product(regions, industries):
            combinations.append({
                "keyword": f"{region}{industry}",
                "type": "region_industry",
                "components": {
                    "region": region,
                    "industry": industry
                }
            })
        
        # 2. 지역명 X 메뉴/상품명
        for region, menu in product(regions, menus):
            combinations.append({
                "keyword": f"{region}{menu}",
                "type": "region_menu",
                "components": {
                    "region": region,
                    "menu": menu
                }
            })
        
        # 3. 랜드마크 X 업종
        for landmark, industry in product(landmarks, industries):
            combinations.append({
                "keyword": f"{landmark}{industry}",
                "type": "landmark_industry",
                "components": {
                    "landmark": landmark,
                    "industry": industry
                }
            })
        
        # 4. 랜드마크 X 메뉴/상품명
        for landmark, menu in product(landmarks, menus):
            combinations.append({
                "keyword": f"{landmark}{menu}",
                "type": "landmark_menu",
                "components": {
                    "landmark": landmark,
                    "menu": menu
                }
            })
        
        # 5. 지역명 X 기타
        for region, other in product(regions, others):
            combinations.append({
                "keyword": f"{region}{other}",
                "type": "region_other",
                "components": {
                    "region": region,
                    "other": other
                }
            })
        
        # 6. 랜드마크 X 기타
        for landmark, other in product(landmarks, others):
            combinations.append({
                "keyword": f"{landmark}{other}",
                "type": "landmark_other",
                "components": {
                    "landmark": landmark,
                    "other": other
                }
            })
        
        return combinations
    
    async def _get_keyword_volumes_batch(
        self,
        combinations: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        키워드 검색량 조회 (배치 처리 - 병렬 처리로 성능 최적화)
        네이버 API는 한 번에 최대 5개까지 조회 가능
        """
        results = []
        keywords = [combo["keyword"] for combo in combinations]
        
        # 5개씩 배치 준비
        batch_size = 5
        batches = []
        for i in range(0, len(keywords), batch_size):
            batch_keywords = keywords[i:i+batch_size]
            batches.append(batch_keywords)
        
        logger.info(f"[타겟 키워드] 총 {len(batches)}개 배치를 병렬 처리합니다")
        
        # ⚡ 성능 최적화: 모든 배치를 병렬로 처리
        async def fetch_batch(batch_keywords):
            try:
                # 비동기 API 호출
                result = await self.keyword_service.get_keyword_search_volume_async(batch_keywords)
                return result
            except Exception as e:
                logger.error(f"[타겟 키워드] 배치 검색량 조회 실패: {str(e)}")
                return {"status": "error"}
        
        # 모든 배치를 동시에 처리
        batch_results = await asyncio.gather(*[fetch_batch(batch) for batch in batches], return_exceptions=True)
        
        # 결과 처리
        for batch_result in batch_results:
            if isinstance(batch_result, Exception):
                logger.error(f"[타겟 키워드] 배치 처리 중 예외: {batch_result}")
                continue
                
            if batch_result.get("status") == "success":
                keyword_list = batch_result.get("data", {}).get("keywordList", [])
                
                # 각 키워드별로 검색량 매핑
                for keyword_data in keyword_list:
                    keyword = keyword_data.get("relKeyword")
                    
                    # 원본 조합 정보 찾기
                    combo_info = next(
                        (c for c in combinations if c["keyword"] == keyword),
                        None
                    )
                    
                    if combo_info:
                        # PC + Mobile 검색량 합산
                        pc_volume = keyword_data.get("monthlyPcQcCnt", 0)
                        mobile_volume = keyword_data.get("monthlyMobileQcCnt", 0)
                        
                        # '<10' 같은 문자열 처리
                        if isinstance(pc_volume, str):
                            pc_volume = 5 if '<' in pc_volume else 0
                        if isinstance(mobile_volume, str):
                            mobile_volume = 5 if '<' in mobile_volume else 0
                        
                        total_volume = pc_volume + mobile_volume
                        
                        results.append({
                            "keyword": keyword,
                            "type": combo_info["type"],
                            "components": combo_info["components"],
                            "monthly_pc_qc_cnt": pc_volume,
                            "monthly_mobile_qc_cnt": mobile_volume,
                            "total_volume": total_volume,
                            "comp_idx": keyword_data.get("compIdx", "-"),
                            "raw_data": keyword_data
                        })
        
        logger.info(f"[타겟 키워드] 병렬 처리 완료: {len(results)}개 키워드 조회")
        
        return results
    
    def _select_top_keywords(
        self,
        keyword_volumes: List[Dict[str, Any]],
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """상위 N개 키워드 선정 (검색량 기준, 중복 제거)"""
        # 중복 제거: 동일한 키워드가 있으면 검색량이 높은 것만 유지
        unique_keywords = {}
        for kw in keyword_volumes:
            keyword_text = kw["keyword"]
            if keyword_text not in unique_keywords:
                unique_keywords[keyword_text] = kw
            else:
                # 기존 검색량과 비교하여 더 높은 것 유지
                if kw["total_volume"] > unique_keywords[keyword_text]["total_volume"]:
                    unique_keywords[keyword_text] = kw
        
        # 검색량으로 정렬
        sorted_keywords = sorted(
            unique_keywords.values(),
            key=lambda x: x.get("total_volume", 0),
            reverse=True
        )
        
        logger.info(f"[타겟 키워드] 중복 제거 후: {len(keyword_volumes)}개 → {len(sorted_keywords)}개")
        
        return sorted_keywords[:limit]
    
    async def _get_place_ranks(self, place_id: str, top_keywords: List[Dict[str, Any]]) -> Dict[str, Dict[str, int]]:
        """각 타겟 키워드별 플레이스 순위 및 전체 업체수 조회 (안전한 병렬 처리)"""
        rank_data = {}
        
        try:
            from app.services.naver_rank_api_unofficial import NaverRankNewAPIService
            rank_service = NaverRankNewAPIService()
            
            # 동시 실행 제한 (최대 3개)
            semaphore = asyncio.Semaphore(3)
            
            async def check_single_rank(keyword_data):
                keyword = keyword_data["keyword"]
                async with semaphore:  # 동시 3개 제한
                    try:
                        # 개별 키워드 타임아웃 30초
                        result = await asyncio.wait_for(
                            rank_service.check_rank(keyword, place_id),
                            timeout=30
                        )
                        
                        if result and result.get("found"):
                            rank = result.get("rank")
                            total_count = result.get("total_count", 0)
                            logger.info(f"[순위 조회] {keyword}: {rank if rank is not None else 0}위 / 전체 {total_count}개")
                            return (keyword, {
                                "rank": rank if rank is not None else 0,
                                "total_count": total_count
                            })
                        else:
                            total_count = result.get("total_count", 0) if result else 0
                            logger.warning(f"[순위 조회] {keyword}: 매장 발견 안됨 / 전체 {total_count}개")
                            return (keyword, {"rank": 0, "total_count": total_count})
                            
                    except asyncio.TimeoutError:
                        logger.warning(f"[순위 조회] {keyword}: 타임아웃 (30초 초과)")
                        return (keyword, {"rank": 0, "total_count": 0})
                    except Exception as e:
                        logger.error(f"[순위 조회] {keyword} 실패: {str(e)}")
                        return (keyword, {"rank": 0, "total_count": 0})
            
            # 병렬 처리 (에러 발생 시에도 계속)
            results = await asyncio.gather(
                *[check_single_rank(kw) for kw in top_keywords],
                return_exceptions=True  # 에러 발생 시에도 계속
            )
            
            # 결과를 딕셔너리로 변환
            for res in results:
                if not isinstance(res, Exception):  # 에러가 아닌 경우만 처리
                    keyword, data = res
                    rank_data[keyword] = data
                else:
                    logger.error(f"[순위 조회] 병렬 처리 중 예외 발생: {res}")
            
            logger.info(f"[순위 조회] 완료: {len(rank_data)}개 키워드 (병렬 처리)")
            return rank_data
            
        except Exception as e:
            logger.error(f"[순위 조회] 전체 실패: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {}
    
    async def _get_reviews_data(self, place_id: str) -> Dict[str, Any]:
        """블로그 리뷰 + 방문자 리뷰 데이터 조회"""
        try:
            from app.services.naver_review_service import naver_review_service
            
            # 블로그 리뷰는 네이버 API에서 더 이상 지원하지 않음
            logger.info(f"[리뷰 조회] 블로그 리뷰는 네이버 API 제한으로 수집하지 않습니다")
            
            # 방문자 리뷰 50개 조회 (커서 페이지네이션)
            visitor_reviews_text = ""
            try:
                visitor_contents = []
                cursor = None
                
                while len(visitor_contents) < 50:
                    visitor_result = await naver_review_service.get_visitor_reviews(
                        place_id=place_id,
                        size=20,
                        sort="popular",  # 추천순
                        after=cursor
                    )
                    
                    if visitor_result and visitor_result.get("items"):
                        reviews = visitor_result.get("items", [])
                        for review in reviews:
                            # 방문자 리뷰는 'body' 필드 사용
                            content = review.get("body", "") or review.get("content", "")
                            if content:
                                visitor_contents.append(content)
                        
                        # 다음 페이지 확인
                        if not visitor_result.get("has_more"):
                            break
                        cursor = visitor_result.get("last_cursor")
                    else:
                        break
                
                visitor_reviews_text = " ".join(visitor_contents[:50])
                logger.info(f"[리뷰 조회] 방문자 리뷰 {len(visitor_contents)}개, 총 {len(visitor_reviews_text)}자")
                if visitor_reviews_text:
                    logger.info(f"[리뷰 조회] 방문자 리뷰 샘플: {visitor_reviews_text[:200]}...")
            except Exception as e:
                logger.error(f"[리뷰 조회] 방문자 리뷰 실패: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
            
            return {
                "visitor_reviews": visitor_reviews_text
            }
            
        except Exception as e:
            logger.error(f"[리뷰 조회] 전체 실패: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                "visitor_reviews": ""
            }
    
    async def _get_place_details(self, place_id: str) -> Dict[str, Any]:
        """플레이스 상세 정보 조회"""
        try:
            # HTML 파서 사용 (실제로 작동하는 서비스)
            details = await self.html_parser.parse_place_html(place_id)
            logger.info(f"[타겟 키워드] 플레이스 정보 조회 완료: {len(details)} 필드")
            logger.info(f"[타겟 키워드] 사용 가능한 필드: {list(details.keys())}")
            return details if details else {}
        except Exception as e:
            logger.error(f"[타겟 키워드] 플레이스 정보 조회 실패: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {}
    
    def _analyze_seo(
        self,
        top_keywords: List[Dict[str, Any]],
        place_details: Dict[str, Any],
        review_data: Dict[str, Any],
        input_keywords: Dict[str, List[str]]
    ) -> Dict[str, Any]:
        """
        SEO 분석: 키워드가 플레이스 정보에 얼마나 포함되어 있는지 분석
        
        분석 대상:
        - 메뉴 (menus)
        - 편의시설 (conveniences)
        - 대표한줄평 (micro_reviews)
        - 업체소개글 (description)
        - AI브리핑 (ai_briefing)
        - 찾아오는길 (directions/road)
        - 블로그 리뷰 (상위 50개)
        - 방문자 리뷰 (상위 50개)
        """
        
        # SEO 분석 대상 필드 (HTML 파서가 반환하는 실제 필드명 사용)
        seo_fields = {
            "menu": self._extract_text(place_details.get("menus", [])),  # menu_list → menus
            "conveniences": self._extract_text(place_details.get("conveniences", [])),
            "microReviews": self._extract_text(place_details.get("micro_reviews", [])),  # microReviews → micro_reviews
            "description": place_details.get("description", ""),
            "ai_briefing": place_details.get("ai_briefing", "") or place_details.get("briefing", ""),
            "road": place_details.get("directions", "") or place_details.get("road", ""),  # road → directions
            "visitor_reviews": review_data.get("visitor_reviews", "")  # 블로그 리뷰는 네이버 API에서 지원 안함
        }
        
        # 디버깅용 로그
        logger.info("[타겟 키워드] SEO 분석 대상 필드:")
        for field_name, field_text in seo_fields.items():
            text_len = len(field_text) if field_text else 0
            logger.info(f"  - {field_name}: {text_len}자")
            if field_text and text_len > 0:
                preview = field_text[:100] if text_len > 100 else field_text
                logger.info(f"    미리보기: {preview}...")
        
        # 모든 키워드 수집 (타겟 키워드 + 입력 키워드)
        all_keywords = []
        
        # 타겟 키워드
        for kw in top_keywords:
            all_keywords.append(kw["keyword"])
        
        # 입력 키워드
        for key, values in input_keywords.items():
            all_keywords.extend(values)
        
        # 중복 제거
        all_keywords = list(set(all_keywords))
        
        # 각 필드별 키워드 매칭 카운트 (띄어쓰기 버전 포함)
        field_analysis = {}
        for field_name, field_text in seo_fields.items():
            keyword_counts = {}
            for keyword in all_keywords:
                # 기본 매칭
                count = self._count_keyword_in_text(keyword, field_text)
                
                # 띄어쓰기 버전도 체크 (2단어 이상 키워드인 경우)
                if " " not in keyword and len(keyword) > 2:
                    # 간단한 휴리스틱: 2글자씩 나눠서 띄어쓰기 버전 생성
                    # 예: "종로맛집" → "종로 맛집"
                    for i in range(1, len(keyword)):
                        spaced_version = keyword[:i] + " " + keyword[i:]
                        count += self._count_keyword_in_text(spaced_version, field_text)
                
                if count > 0:
                    keyword_counts[keyword] = count
            
            field_analysis[field_name] = {
                "total_matches": sum(keyword_counts.values()),
                "keyword_counts": keyword_counts
            }
            
            # 필드별 매칭 로그
            logger.info(f"[SEO 분석] {field_name}: {field_analysis[field_name]['total_matches']}회 매칭")
        
        # 전체 키워드별 매칭 횟수
        keyword_total_counts = {}
        for keyword in all_keywords:
            total_count = 0
            for field_text in seo_fields.values():
                total_count += self._count_keyword_in_text(keyword, field_text)
            keyword_total_counts[keyword] = total_count
        
        # 타겟 키워드별 각 필드 매칭 횟수 (띄어쓰기 버전 포함)
        keyword_field_matches = {}
        for kw in top_keywords:
            keyword_text = kw["keyword"]
            
            # 띄어쓰기 버전 생성 (구성요소 사이에 띄어쓰기)
            keyword_with_space = self._add_space_to_keyword(keyword_text, kw.get("components", {}))
            
            keyword_field_matches[keyword_text] = {
                "menu": self._count_keyword_with_variants(keyword_text, keyword_with_space, seo_fields["menu"]),
                "conveniences": self._count_keyword_with_variants(keyword_text, keyword_with_space, seo_fields["conveniences"]),
                "microReviews": self._count_keyword_with_variants(keyword_text, keyword_with_space, seo_fields["microReviews"]),
                "description": self._count_keyword_with_variants(keyword_text, keyword_with_space, seo_fields["description"]),
                "ai_briefing": self._count_keyword_with_variants(keyword_text, keyword_with_space, seo_fields["ai_briefing"]),
                "road": self._count_keyword_with_variants(keyword_text, keyword_with_space, seo_fields["road"]),
                "visitor_reviews": self._count_keyword_with_variants(keyword_text, keyword_with_space, seo_fields["visitor_reviews"]),
                "total": 0  # 나중에 계산
            }
            
            # 전체 합계 계산
            keyword_field_matches[keyword_text]["total"] = sum([
                keyword_field_matches[keyword_text]["menu"],
                keyword_field_matches[keyword_text]["conveniences"],
                keyword_field_matches[keyword_text]["microReviews"],
                keyword_field_matches[keyword_text]["description"],
                keyword_field_matches[keyword_text]["ai_briefing"],
                keyword_field_matches[keyword_text]["road"],
                keyword_field_matches[keyword_text]["visitor_reviews"]
            ])
        
        logger.info(f"[타겟 키워드] SEO 분석 완료: {len(keyword_field_matches)}개 키워드")
        
        return {
            "field_analysis": field_analysis,
            "keyword_total_counts": keyword_total_counts,
            "keyword_field_matches": keyword_field_matches,
            "all_keywords": all_keywords,
            "seo_fields_text": seo_fields  # 디버깅용
        }
    
    def _extract_text(self, data: Any) -> str:
        """데이터에서 텍스트 추출"""
        if isinstance(data, str):
            return data
        elif isinstance(data, list):
            texts = []
            for item in data:
                if isinstance(item, str):
                    texts.append(item)
                elif isinstance(item, dict):
                    # 딕셔너리의 모든 값을 텍스트로 변환
                    texts.append(" ".join(str(v) for v in item.values()))
            return " ".join(texts)
        elif isinstance(data, dict):
            return " ".join(str(v) for v in data.values())
        return ""
    
    def _add_space_to_keyword(self, keyword: str, components: Dict[str, str]) -> str:
        """키워드 구성요소 사이에 띄어쓰기 추가"""
        if not components:
            return keyword
        
        # 구성요소들을 띄어쓰기로 연결
        parts = list(components.values())
        return " ".join(parts) if len(parts) > 1 else keyword
    
    def _count_keyword_with_variants(self, keyword: str, keyword_with_space: str, text: str) -> int:
        """키워드 매칭 (띄어쓰기 버전 포함)"""
        if not text:
            return 0
        
        text_lower = text.lower()
        count = 0
        
        # 1. 원본 키워드 매칭 (예: "종로맛집")
        if keyword:
            count += text_lower.count(keyword.lower())
        
        # 2. 띄어쓰기 버전 매칭 (예: "종로 맛집")
        if keyword_with_space and keyword_with_space != keyword:
            count += text_lower.count(keyword_with_space.lower())
        
        return count
    
    def _count_keyword_in_text(self, keyword: str, text: str) -> int:
        """텍스트에서 키워드 출현 횟수 카운트 (대소문자 무시)"""
        if not keyword or not text:
            return 0
        
        # 대소문자 무시하고 카운트
        return text.lower().count(keyword.lower())
