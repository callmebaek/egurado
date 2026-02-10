"""
Supabase 데이터베이스 연결 설정

⚠️ 중요: 세션 안전 정책
- get_supabase_client(): 데이터 조회/수정 전용 (Service Role Key, 세션 없음)
  → 절대 .auth.sign_in(), .auth.sign_up() 등을 호출하지 마세요!
  → auth 세션이 설정되면 PostgREST 헤더가 오염되어 다른 사용자 데이터 접근 불가
  
- create_auth_client(): 인증 작업 전용 (일회용 클라이언트)
  → sign_in, sign_up, update_user 등 auth 작업 시 반드시 사용
  → 사용 후 자동 폐기되므로 글로벌 상태에 영향 없음
"""
from supabase import create_client, Client
from contextlib import contextmanager
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Supabase 데이터 클라이언트 인스턴스 (auth 작업 절대 금지!)
_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    """
    Supabase 데이터 전용 싱글톤 클라이언트 반환 (Service Role Key 사용)
    
    ⚠️ 이 클라이언트에서 auth.sign_in/sign_up/update_user 등을 호출하면
    내부 세션이 오염되어 모든 DB 쿼리가 특정 사용자 권한으로 실행됩니다.
    인증 작업에는 반드시 create_auth_client()를 사용하세요.
    
    Returns:
        Client: Supabase 데이터 전용 클라이언트
    """
    global _supabase_client
    
    if _supabase_client is None:
        supabase_url = os.getenv("SUPABASE_URL")
        # Service Role Key를 우선 사용 (Admin API 호출 가능, RLS 우회)
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables"
            )
        
        _supabase_client = create_client(supabase_url, supabase_key)
        logger.info("[Database] 데이터 전용 Supabase 클라이언트 생성 (Service Role Key)")
    
    return _supabase_client


def create_auth_client() -> Client:
    """
    인증 작업 전용 일회용 Supabase 클라이언트 생성
    
    sign_in, sign_up, update_user 등 auth 작업 시 사용합니다.
    사용 후 반드시 del 또는 스코프 종료로 폐기해야 합니다.
    
    Returns:
        Client: 일회용 Supabase 클라이언트
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables"
        )
    
    client = create_client(supabase_url, supabase_key)
    logger.debug("[Database] 인증 전용 일회용 클라이언트 생성")
    return client


@contextmanager
def auth_client_context():
    """
    인증 작업용 일회용 클라이언트를 컨텍스트 매니저로 제공
    
    사용법:
        with auth_client_context() as auth_client:
            auth_client.auth.sign_in_with_password(...)
        # 자동으로 클라이언트 폐기됨
    """
    client = create_auth_client()
    try:
        yield client
    finally:
        try:
            # GoTrue 세션 정리
            client.auth.sign_out()
        except Exception:
            pass
        del client
        logger.debug("[Database] 인증 전용 클라이언트 폐기 완료")


def verify_client_integrity() -> bool:
    """
    글로벌 Supabase 클라이언트의 세션 무결성 검증
    
    auth 세션이 설정되어 있으면 (누군가가 sign_in/sign_up을 글로벌 클라이언트에서 호출한 경우)
    클라이언트를 재생성하여 Service Role Key 상태로 복구합니다.
    
    Returns:
        bool: True if client was healthy, False if it was reset
    """
    global _supabase_client
    
    if _supabase_client is None:
        return True
    
    try:
        # GoTrue 세션이 설정되어 있는지 확인
        session = _supabase_client.auth.get_session()
        if session:
            # ⚠️ 세션이 오염됨! 클라이언트를 재생성
            logger.warning(
                f"[Database] 글로벌 클라이언트 세션 오염 감지! "
                f"user_id={session.user.id if session.user else 'unknown'} "
                f"→ 클라이언트 재생성"
            )
            try:
                _supabase_client.auth.sign_out()
            except Exception:
                pass
            _supabase_client = None
            get_supabase_client()  # 새 클라이언트 생성
            return False
    except Exception:
        # get_session() 실패 = 세션 없음 = 정상 상태
        pass
    
    return True


async def check_database_connection() -> bool:
    """
    데이터베이스 연결 상태 확인
    
    Returns:
        bool: 연결 성공 여부
    """
    try:
        # 글로벌 클라이언트 무결성 먼저 검증
        verify_client_integrity()
        
        client = get_supabase_client()
        # profiles 테이블에 간단한 쿼리로 연결 테스트
        response = client.table("profiles").select("id").limit(1).execute()
        return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False


