"""
백그라운드 작업 스케줄러
자동 리뷰 수집, 순위 확인 등
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, date
import logging

from app.core.database import get_supabase_client
from app.services.naver_crawler import crawl_naver_reviews
from app.services.naver_rank_service import rank_service
from app.services.metric_tracker_service import metric_tracker_service

logger = logging.getLogger(__name__)

# 스케줄러 인스턴스
scheduler = AsyncIOScheduler()


async def sync_all_stores_reviews():
    """
    모든 활성 매장의 리뷰 자동 수집
    매일 오전 6시 실행
    """
    try:
        print(f"[{datetime.now()}] [SYNC] Starting review collection for all stores")
        
        supabase = get_supabase_client()
        
        # 활성 상태의 네이버 매장 조회
        result = supabase.table("stores").select("id, place_id, store_name").eq(
            "platform", "naver"
        ).eq("status", "active").execute()
        
        if not result.data:
            print("[WARN] No active stores found")
            return
        
        stores = result.data
        print(f"[INFO] {len(stores)} stores scheduled for review collection")
        
        for store in stores:
            try:
                print(f"📍 매장 '{store['store_name']}' 리뷰 수집 중...")
                reviews = await crawl_naver_reviews(store["id"], store["place_id"])
                print(f"[OK] '{store['store_name']}': {len(reviews)} reviews collected")
            except Exception as e:
                print(f"[ERROR] '{store['store_name']}' review collection failed: {e}")
                continue
        
        print(f"[{datetime.now()}] [SYNC] Review collection completed")
        
    except Exception as e:
        print(f"[ERROR] Review collection scheduler error: {e}")


async def check_all_keywords_rank():
    """
    등록된 모든 키워드 순위 자동 확인
    매일 오전 7시 실행
    
    - 모든 등록된 키워드의 순위 체크
    - keywords 테이블 업데이트 (current_rank, previous_rank)
    - rank_history 테이블에 오늘 날짜 데이터만 유지
    """
    try:
        logger.info(f"[{datetime.now()}] 🔍 키워드 순위 자동 확인 시작")
        
        supabase = get_supabase_client()
        
        # 모든 키워드 조회 (store 정보 포함)
        result = supabase.table("keywords").select(
            "id, keyword, store_id, current_rank, stores(place_id, store_name)"
        ).execute()
        
        if not result.data:
            logger.warning("[WARN] No keywords registered")
            return
        
        keywords = result.data
        logger.info(f"[INFO] {len(keywords)} keywords scheduled for rank check")
        
        success_count = 0
        error_count = 0
        
        for kw in keywords:
            try:
                keyword_id = kw["id"]
                keyword_text = kw["keyword"]
                store_id = kw["store_id"]
                current_rank = kw.get("current_rank")
                
                # store 정보 추출
                if not kw.get("stores"):
                    logger.warning(f"[SKIP] '{keyword_text}': No store data found")
                    continue
                
                place_id = kw["stores"]["place_id"]
                store_name = kw["stores"]["store_name"]
                
                logger.info(f"🔍 '{keyword_text}' (매장: {store_name}) 순위 확인 중...")
                
                # 순위 체크 (최대 300개)
                rank_result = await rank_service.check_rank(
                    keyword=keyword_text,
                    target_place_id=place_id,
                    max_results=300
                )
                
                new_rank = rank_result["rank"]
                found = rank_result["found"]
                
                # keywords 테이블 업데이트
                supabase.table("keywords").update({
                    "previous_rank": current_rank,
                    "current_rank": new_rank,
                    "last_checked_at": datetime.utcnow().isoformat()
                }).eq("id", keyword_id).execute()
                
                # rank_history 처리 (오늘 날짜 데이터만 유지)
                today = date.today()
                
                # 1. 오늘 날짜의 기존 기록 삭제
                supabase.table("rank_history").delete().eq(
                    "keyword_id", keyword_id
                ).gte(
                    "checked_at", today.isoformat()
                ).lt(
                    "checked_at", (today.replace(day=today.day + 1)).isoformat() 
                    if today.day < 28 else today.isoformat()
                ).execute()
                
                # 2. 새로운 기록 추가
                supabase.table("rank_history").insert({
                    "keyword_id": keyword_id,
                    "rank": new_rank,
                    "checked_at": datetime.utcnow().isoformat()
                }).execute()
                
                if found and new_rank:
                    rank_change = ""
                    if current_rank and new_rank:
                        change = current_rank - new_rank
                        if change > 0:
                            rank_change = f" (↑{change})"
                        elif change < 0:
                            rank_change = f" (↓{abs(change)})"
                    
                    logger.info(
                        f"[OK] '{keyword_text}' (매장: {store_name}): "
                        f"Rank #{new_rank}{rank_change}"
                    )
                else:
                    logger.warning(
                        f"[NOT FOUND] '{keyword_text}' (매장: {store_name}): "
                        f"순위권 밖 (상위 40개 내 미포함)"
                    )
                
                success_count += 1
                    
            except Exception as e:
                error_count += 1
                logger.error(
                    f"[ERROR] '{kw.get('keyword', 'Unknown')}' rank check failed: {str(e)}",
                    exc_info=True
                )
                continue
        
        logger.info(
            f"[{datetime.now()}] [CHECK] 키워드 순위 확인 완료 - "
            f"성공: {success_count}, 실패: {error_count}"
        )
        
    except Exception as e:
        logger.error(f"[ERROR] Rank check scheduler error: {str(e)}", exc_info=True)


async def collect_all_metrics():
    """
    주요지표 추적 - 스케줄된 시간에 자동 수집
    매 시간마다 실행하여 수집이 필요한 추적 설정들을 처리
    """
    try:
        print(f"[{datetime.now()}] 📊 주요지표 자동 수집 시작")
        logger.info(f"[{datetime.now()}] 📊 주요지표 자동 수집 시작")
        
        # 수집이 필요한 활성 추적 설정 조회
        trackers = metric_tracker_service.get_all_active_trackers()
        
        if not trackers:
            print("[INFO] No trackers scheduled for collection at this time")
            logger.info("[INFO] No trackers scheduled for collection at this time")
            return
        
        print(f"[INFO] {len(trackers)} trackers scheduled for metric collection")
        logger.info(f"[INFO] {len(trackers)} trackers scheduled for metric collection")
        
        success_count = 0
        error_count = 0
        
        for tracker in trackers:
            try:
                tracker_id = tracker["id"]
                keyword_info = tracker.get("keywords", {})
                store_info = tracker.get("stores", {})
                
                keyword_text = keyword_info.get("keyword", "Unknown") if keyword_info else "Unknown"
                store_name = store_info.get("store_name", "Unknown") if store_info else "Unknown"
                
                logger.info(f"📊 '{keyword_text}' (매장: {store_name}) 지표 수집 중...")
                
                # 지표 수집
                await metric_tracker_service.collect_metrics(tracker_id)
                
                logger.info(f"[OK] '{keyword_text}' (매장: {store_name}) 지표 수집 완료")
                success_count += 1
                    
            except Exception as e:
                error_count += 1
                logger.error(
                    f"[ERROR] Tracker {tracker.get('id', 'Unknown')} metric collection failed: {str(e)}",
                    exc_info=True
                )
                continue
        
        print(
            f"[{datetime.now()}] [COLLECT] 주요지표 수집 완료 - "
            f"성공: {success_count}, 실패: {error_count}"
        )
        logger.info(
            f"[{datetime.now()}] [COLLECT] 주요지표 수집 완료 - "
            f"성공: {success_count}, 실패: {error_count}"
        )
        
    except Exception as e:
        print(f"[ERROR] Metric collection scheduler error: {str(e)}")
        logger.error(f"[ERROR] Metric collection scheduler error: {str(e)}", exc_info=True)


def start_scheduler():
    """스케줄러 시작"""
    # 매일 오전 6시: 리뷰 수집
    scheduler.add_job(
        sync_all_stores_reviews,
        CronTrigger(hour=6, minute=0),
        id="sync_reviews",
        name="전체 매장 리뷰 자동 수집",
        replace_existing=True
    )
    
    # 매일 오전 3시: 키워드 순위 확인 (리뷰 수집 전에 실행)
    scheduler.add_job(
        check_all_keywords_rank,
        CronTrigger(hour=3, minute=0),
        id="check_ranks",
        name="키워드 순위 자동 확인",
        replace_existing=True
    )
    
    # 매 시간마다: 주요지표 추적 자동 수집
    # 각 추적 설정의 next_collection_at을 확인하여 수집 시간이 된 항목만 처리
    scheduler.add_job(
        collect_all_metrics,
        CronTrigger(minute=0),  # 매 시간 정각
        id="collect_metrics",
        name="주요지표 추적 자동 수집",
        replace_existing=True
    )
    
    scheduler.start()
    print("[OK] Scheduler started")
    print("  - Rank check: 3 AM daily (KST)")
    print("  - Review sync: 6 AM daily (KST)")
    print("  - Metric tracking: Every hour (KST)")
    logger.info("[OK] Scheduler started")
    logger.info("  - Rank check: 3 AM daily (KST)")
    logger.info("  - Review sync: 6 AM daily (KST)")
    logger.info("  - Metric tracking: Every hour (KST)")


def stop_scheduler():
    """스케줄러 중지"""
    scheduler.shutdown()
    print("[OK] Scheduler stopped")


