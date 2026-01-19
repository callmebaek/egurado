"""
Supabase 데이터베이스 연결 설정
"""
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

# Supabase 클라이언트 인스턴스
_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    """
    Supabase 클라이언트 싱글톤 인스턴스 반환
    
    Returns:
        Client: Supabase 클라이언트
    """
    global _supabase_client
    
    if _supabase_client is None:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_KEY must be set in environment variables"
            )
        
        _supabase_client = create_client(supabase_url, supabase_key)
    
    return _supabase_client


async def check_database_connection() -> bool:
    """
    데이터베이스 연결 상태 확인
    
    Returns:
        bool: 연결 성공 여부
    """
    try:
        client = get_supabase_client()
        # profiles 테이블에 간단한 쿼리로 연결 테스트
        response = client.table("profiles").select("id").limit(1).execute()
        return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False


