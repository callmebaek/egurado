"""
인증 서비스
JWT 토큰 생성, 이메일 인증, OAuth 처리
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

# JWT 설정
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# 카카오 API 설정
KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")
KAKAO_REDIRECT_URI = os.getenv("KAKAO_REDIRECT_URI")

# 네이버 API 설정
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")
NAVER_REDIRECT_URI = os.getenv("NAVER_REDIRECT_URI")

# 비밀번호 해싱
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """비밀번호 해싱"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    JWT 액세스 토큰 생성
    
    Args:
        data: 토큰에 포함할 데이터 (user_id 등)
        expires_delta: 만료 시간
    
    Returns:
        JWT 토큰 문자열
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    JWT 토큰 디코딩
    
    Args:
        token: JWT 토큰
    
    Returns:
        디코딩된 데이터 또는 None
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_kakao_token(code: str) -> Optional[str]:
    """
    카카오 인증 코드로 액세스 토큰 받기
    
    Args:
        code: 카카오 인증 코드
    
    Returns:
        카카오 액세스 토큰
    """
    url = "https://kauth.kakao.com/oauth/token"
    
    # 클라이언트 시크릿 가져오기
    client_secret = os.getenv("KAKAO_CLIENT_SECRET")
    
    data = {
        "grant_type": "authorization_code",
        "client_id": KAKAO_REST_API_KEY,
        "redirect_uri": KAKAO_REDIRECT_URI,
        "code": code,
    }
    
    # 클라이언트 시크릿이 있으면 추가
    if client_secret:
        data["client_secret"] = client_secret
    
    async with httpx.AsyncClient() as client:
        try:
            print(f"[카카오 토큰 요청] client_id: {KAKAO_REST_API_KEY}")
            print(f"[카카오 토큰 요청] redirect_uri: {KAKAO_REDIRECT_URI}")
            print(f"[카카오 토큰 요청] code: {code[:20]}..." if len(code) > 20 else f"[카카오 토큰 요청] code: {code}")
            
            response = await client.post(url, data=data)
            print(f"[카카오 토큰 응답] status: {response.status_code}")
            print(f"[카카오 토큰 응답] body: {response.text}")
            
            response.raise_for_status()
            result = response.json()
            return result.get("access_token")
        except Exception as e:
            print(f"카카오 토큰 발급 실패: {e}")
            return None


async def get_kakao_user_info(access_token: str) -> Optional[Dict[str, Any]]:
    """
    카카오 액세스 토큰으로 사용자 정보 가져오기
    
    Args:
        access_token: 카카오 액세스 토큰
    
    Returns:
        사용자 정보 딕셔너리
    """
    url = "https://kapi.kakao.com/v2/user/me"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            user_info = response.json()
            
            # 필요한 정보 추출
            kakao_account = user_info.get("kakao_account", {})
            profile = kakao_account.get("profile", {})
            
            return {
                "id": str(user_info.get("id")),
                "email": kakao_account.get("email"),
                "display_name": profile.get("nickname"),
                "profile_image_url": profile.get("profile_image_url"),
            }
        except Exception as e:
            print(f"카카오 사용자 정보 조회 실패: {e}")
            return None


async def get_naver_token(code: str, state: str) -> Optional[str]:
    """
    네이버 인증 코드로 액세스 토큰 받기
    
    Args:
        code: 네이버 인증 코드
        state: 네이버 state 파라미터
    
    Returns:
        네이버 액세스 토큰
    """
    url = "https://nid.naver.com/oauth2.0/token"
    params = {
        "grant_type": "authorization_code",
        "client_id": NAVER_CLIENT_ID,
        "client_secret": NAVER_CLIENT_SECRET,
        "code": code,
        "state": state,
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            result = response.json()
            return result.get("access_token")
        except Exception as e:
            print(f"네이버 토큰 발급 실패: {e}")
            return None


async def get_naver_user_info(access_token: str) -> Optional[Dict[str, Any]]:
    """
    네이버 액세스 토큰으로 사용자 정보 가져오기
    
    Args:
        access_token: 네이버 액세스 토큰
    
    Returns:
        사용자 정보 딕셔너리
    """
    url = "https://openapi.naver.com/v1/nid/me"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            result = response.json()
            
            # 필요한 정보 추출
            response_data = result.get("response", {})
            
            return {
                "id": response_data.get("id"),
                "email": response_data.get("email"),
                "display_name": response_data.get("name") or response_data.get("nickname"),
                "profile_image_url": response_data.get("profile_image"),
                "phone_number": response_data.get("mobile"),
            }
        except Exception as e:
            print(f"네이버 사용자 정보 조회 실패: {e}")
            return None
