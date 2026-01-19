"""
Google Business Profile API 연동
OAuth 2.0 인증 및 리뷰 관리
"""
import os
from typing import Optional, List, Dict
from datetime import datetime
from dotenv import load_dotenv

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.core.database import get_supabase_client

load_dotenv()


class GoogleBusinessAPI:
    """Google Business Profile API 클래스"""
    
    @staticmethod
    def create_credentials(access_token: str, refresh_token: str) -> Credentials:
        """
        OAuth 토큰으로 Credentials 객체 생성
        
        Args:
            access_token: 액세스 토큰
            refresh_token: 리프레시 토큰
            
        Returns:
            Credentials: 구글 인증 정보
        """
        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
            scopes=["https://www.googleapis.com/auth/business.manage"]
        )
        
        return creds
    
    @staticmethod
    async def get_service(store_id: str):
        """
        저장된 토큰으로 GBP API 서비스 생성
        
        Args:
            store_id: 매장 ID
            
        Returns:
            Service: Google API 서비스 객체
        """
        try:
            supabase = get_supabase_client()
            
            # credentials 조회
            result = supabase.table("stores").select("credentials").eq(
                "id", store_id
            ).eq("platform", "google").single().execute()
            
            if not result.data or "credentials" not in result.data:
                raise ValueError("구글 인증 정보를 찾을 수 없습니다.")
            
            creds_data = result.data["credentials"]
            
            # Credentials 객체 생성
            creds = GoogleBusinessAPI.create_credentials(
                creds_data["access_token"],
                creds_data["refresh_token"]
            )
            
            # 토큰 만료 시 자동 갱신
            if creds.expired and creds.refresh_token:
                creds.refresh(Request())
                
                # 새 토큰 저장
                supabase.table("stores").update({
                    "credentials": {
                        "access_token": creds.token,
                        "refresh_token": creds.refresh_token,
                        "type": "google"
                    }
                }).eq("id", store_id).execute()
                
                print(f"✅ 구글 토큰 갱신 완료")
            
            # API 서비스 생성
            service = build('mybusinessbusinessinformation', 'v1', credentials=creds)
            
            return service
            
        except Exception as e:
            print(f"❌ 구글 서비스 생성 실패: {e}")
            raise
    
    @staticmethod
    async def sync_google_reviews(store_id: str, location_id: str) -> List[Dict]:
        """
        구글 비즈니스 리뷰 동기화
        
        Args:
            store_id: 매장 ID
            location_id: 구글 Location ID
            
        Returns:
            List[Dict]: 수집된 리뷰 목록
        """
        try:
            service = await GoogleBusinessAPI.get_service(store_id)
            supabase = get_supabase_client()
            
            # 리뷰 조회
            # Note: GBP API의 실제 엔드포인트는 버전에 따라 다를 수 있음
            try:
                reviews_service = service.accounts().locations().reviews()
                reviews_response = reviews_service.list(
                    parent=f"locations/{location_id}"
                ).execute()
            except HttpError as e:
                print(f"⚠️ GBP API 호출 오류: {e}")
                # API 버전 또는 권한 문제일 수 있음
                return []
            
            reviews = reviews_response.get("reviews", [])
            saved_count = 0
            
            for review in reviews:
                try:
                    # 리뷰 데이터 파싱
                    review_id = review.get("reviewId") or review.get("name", "").split("/")[-1]
                    comment = review.get("comment", "")
                    
                    # 별점 파싱 (STAR_RATING_ONE ~ STAR_RATING_FIVE)
                    rating_str = review.get("starRating", "STAR_RATING_FIVE")
                    rating = int(rating_str.replace("STAR_RATING_", "")) if "STAR_RATING_" in rating_str else 5
                    
                    reviewer = review.get("reviewer", {})
                    author_name = reviewer.get("displayName", "Anonymous")
                    
                    create_time = review.get("createTime")
                    
                    # DB 저장 (Upsert)
                    supabase.table("reviews").upsert({
                        "store_id": store_id,
                        "platform": "google",
                        "external_review_id": review_id,
                        "review_text": comment,
                        "rating": rating,
                        "author_name": author_name,
                        "posted_date": create_time,
                        "sentiment": "neutral"  # AI 분석 전 기본값
                    }, on_conflict="store_id,platform,external_review_id").execute()
                    
                    saved_count += 1
                    
                except Exception as e:
                    print(f"⚠️ 개별 리뷰 저장 실패: {e}")
                    continue
            
            # 마지막 동기화 시간 업데이트
            supabase.table("stores").update({
                "last_synced_at": datetime.utcnow().isoformat()
            }).eq("id", store_id).execute()
            
            print(f"✅ 구글 리뷰 {saved_count}개 저장 완료")
            return reviews
            
        except Exception as e:
            print(f"❌ 구글 리뷰 동기화 실패: {e}")
            return []
    
    @staticmethod
    async def post_review_reply(
        store_id: str,
        location_id: str,
        review_id: str,
        reply_text: str
    ) -> bool:
        """
        구글 리뷰 답글 등록
        
        Args:
            store_id: 매장 ID
            location_id: 구글 Location ID
            review_id: 리뷰 ID
            reply_text: 답글 내용
            
        Returns:
            bool: 성공 여부
        """
        try:
            service = await GoogleBusinessAPI.get_service(store_id)
            
            # 답글 등록
            reviews_service = service.accounts().locations().reviews()
            
            reply_body = {
                "comment": reply_text
            }
            
            reviews_service.updateReply(
                name=f"locations/{location_id}/reviews/{review_id}/reply",
                body=reply_body
            ).execute()
            
            print(f"✅ 구글 리뷰 답글 등록 완료")
            return True
            
        except Exception as e:
            print(f"❌ 구글 답글 등록 실패: {e}")
            return False


# 간편 함수
async def sync_google_reviews(store_id: str, location_id: str) -> List[Dict]:
    """구글 리뷰 동기화 (간편 함수)"""
    return await GoogleBusinessAPI.sync_google_reviews(store_id, location_id)


