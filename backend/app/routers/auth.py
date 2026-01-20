"""
인증 라우터
회원가입, 로그인, OAuth, 온보딩
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import uuid

from ..models.schemas import (
    UserSignupRequest,
    UserLoginRequest,
    AuthResponse,
    KakaoLoginRequest,
    NaverLoginRequest,
    OnboardingRequest,
    Profile,
)
from ..services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    get_kakao_token,
    get_kakao_user_info,
    get_naver_token,
    get_naver_user_info,
)
from ..core.database import get_supabase_client

router = APIRouter(prefix="/auth", tags=["인증"])
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    현재 인증된 사용자 정보 가져오기 (의존성)
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 인증 토큰입니다",
        )
    
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자 정보를 찾을 수 없습니다",
        )
    
    # Supabase에서 사용자 정보 조회
    supabase = get_supabase_client()
    response = supabase.table("profiles").select("*").eq("id", user_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다",
        )
    
    return response.data[0]


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: UserSignupRequest):
    """
    이메일 회원가입
    """
    supabase = get_supabase_client()
    
    # 이메일 중복 확인
    existing_user = supabase.table("profiles").select("id").eq("email", request.email).execute()
    if existing_user.data and len(existing_user.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 이메일입니다",
        )
    
    # Supabase Auth에 사용자 생성
    try:
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="회원가입 처리 중 오류가 발생했습니다",
            )
        
        user_id = auth_response.user.id
        
        # profiles 테이블에 사용자 정보 저장
        profile_data = {
            "id": user_id,
            "email": request.email,
            "display_name": request.display_name or request.email.split("@")[0],
            "auth_provider": "email",
            "subscription_tier": "free",
            "onboarding_completed": False,
        }
        
        supabase.table("profiles").insert(profile_data).execute()
        
        # JWT 토큰 생성
        access_token = create_access_token({"user_id": user_id, "email": request.email})
        
        # 프로필 조회
        profile = supabase.table("profiles").select("*").eq("id", user_id).execute()
        
        return AuthResponse(
            access_token=access_token,
            user=Profile(**profile.data[0]),
            onboarding_required=True,
        )
    
    except Exception as e:
        print(f"회원가입 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"회원가입 처리 중 오류가 발생했습니다: {str(e)}",
        )


@router.post("/login", response_model=AuthResponse)
async def login(request: UserLoginRequest):
    """
    이메일 로그인
    """
    supabase = get_supabase_client()
    
    try:
        # Supabase Auth로 로그인
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password,
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="이메일 또는 비밀번호가 올바르지 않습니다",
            )
        
        user_id = auth_response.user.id
        
        # JWT 토큰 생성
        access_token = create_access_token({"user_id": user_id, "email": request.email})
        
        # 프로필 조회
        profile = supabase.table("profiles").select("*").eq("id", user_id).execute()
        
        if not profile.data or len(profile.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자 정보를 찾을 수 없습니다",
            )
        
        user_data = profile.data[0]
        onboarding_required = not user_data.get("onboarding_completed", False)
        
        return AuthResponse(
            access_token=access_token,
            user=Profile(**user_data),
            onboarding_required=onboarding_required,
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"로그인 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다",
        )


@router.post("/kakao", response_model=AuthResponse)
async def kakao_login(request: KakaoLoginRequest):
    """
    카카오 로그인
    """
    # 카카오 토큰 받기
    kakao_access_token = await get_kakao_token(request.code)
    if not kakao_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="카카오 인증에 실패했습니다",
        )
    
    # 카카오 사용자 정보 가져오기
    kakao_user = await get_kakao_user_info(kakao_access_token)
    if not kakao_user or not kakao_user.get("email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="카카오 사용자 정보를 가져올 수 없습니다",
        )
    
    supabase = get_supabase_client()
    
    # 기존 사용자 확인
    existing_user = supabase.table("profiles").select("*").eq("email", kakao_user["email"]).execute()
    
    if existing_user.data and len(existing_user.data) > 0:
        # 기존 사용자 로그인
        user_data = existing_user.data[0]
        user_id = user_data["id"]
        onboarding_required = not user_data.get("onboarding_completed", False)
    else:
        # 신규 사용자 등록
        # 소셜 로그인은 Supabase Auth와 profiles에 모두 생성
        import secrets
        temp_password = secrets.token_urlsafe(32)
        
        try:
            # 1. Supabase Auth에 사용자 생성
            auth_response = supabase.auth.sign_up({
                "email": kakao_user["email"],
                "password": temp_password,
                "options": {
                    "email_confirm": True,  # 이메일 인증 없이 바로 생성
                }
            })
            
            if not auth_response.user:
                raise Exception("Auth user creation failed")
            
            user_id = auth_response.user.id
            
        except Exception as auth_error:
            print(f"카카오 로그인 Auth 생성 실패: {auth_error}")
            # Auth 생성 실패 시에도 계속 진행 (UUID 직접 생성)
            user_id = str(uuid.uuid4())
        
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        
        profile_data = {
            "id": user_id,
            "email": kakao_user["email"],
            "display_name": kakao_user.get("display_name", kakao_user["email"].split("@")[0]),
            "auth_provider": "kakao",
            "subscription_tier": "free",
            "onboarding_completed": False,
            "profile_image_url": kakao_user.get("profile_image_url"),
            "created_at": now,
            "updated_at": now,
        }
        
        try:
            supabase.table("profiles").insert(profile_data).execute()
        except Exception as profile_error:
            print(f"프로필 생성 실패: {profile_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"카카오 로그인 처리 중 오류가 발생했습니다: {str(profile_error)}",
            )
        
        user_data = profile_data
        onboarding_required = True
    
    # JWT 토큰 생성
    access_token = create_access_token({"user_id": user_id, "email": kakao_user["email"]})
    
    return AuthResponse(
        access_token=access_token,
        user=Profile(**user_data),
        onboarding_required=onboarding_required,
    )


@router.post("/naver", response_model=AuthResponse)
async def naver_login(request: NaverLoginRequest):
    """
    네이버 로그인
    """
    # 네이버 토큰 받기
    naver_access_token = await get_naver_token(request.code, request.state)
    if not naver_access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="네이버 인증에 실패했습니다",
        )
    
    # 네이버 사용자 정보 가져오기
    naver_user = await get_naver_user_info(naver_access_token)
    if not naver_user or not naver_user.get("email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="네이버 사용자 정보를 가져올 수 없습니다",
        )
    
    supabase = get_supabase_client()
    
    # 기존 사용자 확인
    existing_user = supabase.table("profiles").select("*").eq("email", naver_user["email"]).execute()
    
    if existing_user.data and len(existing_user.data) > 0:
        # 기존 사용자 로그인
        user_data = existing_user.data[0]
        user_id = user_data["id"]
        onboarding_required = not user_data.get("onboarding_completed", False)
    else:
        # 신규 사용자 등록
        # 소셜 로그인은 Supabase Auth와 profiles에 모두 생성
        import secrets
        temp_password = secrets.token_urlsafe(32)
        
        try:
            # 1. Supabase Auth에 사용자 생성
            auth_response = supabase.auth.sign_up({
                "email": naver_user["email"],
                "password": temp_password,
                "options": {
                    "email_confirm": True,  # 이메일 인증 없이 바로 생성
                }
            })
            
            if not auth_response.user:
                raise Exception("Auth user creation failed")
            
            user_id = auth_response.user.id
            
        except Exception as auth_error:
            print(f"네이버 로그인 Auth 생성 실패: {auth_error}")
            # Auth 생성 실패 시에도 계속 진행 (UUID 직접 생성)
            user_id = str(uuid.uuid4())
        
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        
        profile_data = {
            "id": user_id,
            "email": naver_user["email"],
            "display_name": naver_user.get("display_name", naver_user["email"].split("@")[0]),
            "auth_provider": "naver",
            "subscription_tier": "free",
            "onboarding_completed": False,
            "profile_image_url": naver_user.get("profile_image_url"),
            "phone_number": naver_user.get("phone_number"),
            "created_at": now,
            "updated_at": now,
        }
        
        try:
            supabase.table("profiles").insert(profile_data).execute()
        except Exception as profile_error:
            print(f"프로필 생성 실패: {profile_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"네이버 로그인 처리 중 오류가 발생했습니다: {str(profile_error)}",
            )
        
        user_data = profile_data
        onboarding_required = True
    
    # JWT 토큰 생성
    access_token = create_access_token({"user_id": user_id, "email": naver_user["email"]})
    
    return AuthResponse(
        access_token=access_token,
        user=Profile(**user_data),
        onboarding_required=onboarding_required,
    )


@router.post("/onboarding")
async def complete_onboarding(
    request: OnboardingRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    온보딩 정보 제출
    """
    supabase = get_supabase_client()
    user_id = current_user["id"]
    
    # 온보딩 정보 업데이트
    update_data = {
        "user_position": request.user_position,
        "marketing_experience": request.marketing_experience,
        "onboarding_completed": True,
    }
    
    # 사장님(광고주)일 경우에만 agency_experience 저장
    if request.user_position == "advertiser" and request.agency_experience:
        update_data["agency_experience"] = request.agency_experience
    
    supabase.table("profiles").update(update_data).eq("id", user_id).execute()
    
    # 업데이트된 프로필 조회
    profile = supabase.table("profiles").select("*").eq("id", user_id).execute()
    
    return {
        "message": "온보딩이 완료되었습니다",
        "user": Profile(**profile.data[0]),
    }


@router.get("/me", response_model=Profile)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    현재 로그인한 사용자 정보 조회
    """
    return Profile(**current_user)


@router.post("/logout")
async def logout():
    """
    로그아웃 (클라이언트에서 토큰 삭제 처리)
    """
    return {"message": "로그아웃되었습니다"}
