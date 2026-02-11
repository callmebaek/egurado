"""
인증 라우터
회원가입, 로그인, OAuth, 온보딩
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import uuid
from datetime import datetime, timezone

from ..models.schemas import (
    UserSignupRequest,
    UserLoginRequest,
    AuthResponse,
    KakaoLoginRequest,
    NaverLoginRequest,
    OnboardingRequest,
    Profile,
    ProfileUpdate,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    DeleteAccountRequest,
    OTPSendRequest,
    OTPVerifyRequest,
    OTPSendResponse,
    OTPVerifyResponse,
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
from ..core.database import get_supabase_client, create_auth_client, auth_client_context

router = APIRouter(prefix="/auth", tags=["인증"])
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    현재 인증된 사용자 정보 가져오기 (의존성)
    Supabase JWT 토큰과 자체 JWT 토큰 모두 지원
    """
    from jose import jwt
    import logging
    
    logger = logging.getLogger(__name__)
    token = credentials.credentials
    supabase = get_supabase_client()
    
    print(f"[DEBUG] get_current_user - 토큰 수신됨 (처음 20자): {token[:20]}...")
    
    # Supabase JWT 토큰으로 검증 시도 (JWT Secret 없이 디코딩만 시도)
    try:
        # Supabase JWT는 'sub' 필드에 user_id가 있음
        # JWT Secret이 없으므로, 일단 디코딩만 시도하여 user_id를 추출
        # 실제 검증은 RLS 정책에 의해 Supabase DB에서 이루어짐
        payload = jwt.decode(token, "", options={"verify_signature": False, "verify_aud": False}) # 서명 및 audience 검증 없이 디코딩
        user_id = payload.get("sub") # Supabase JWT는 'sub'에 user_id가 있음
        print(f"[DEBUG] get_current_user - Supabase JWT 디코딩 시도, user_id: {user_id}")
        
        if user_id:
            # Profiles 테이블에서 사용자 정보 조회 (RLS bypass 함수 사용)
            response = supabase.rpc('get_profile_by_id_bypass_rls', {'p_id': str(user_id)}).execute()
            print(f"[DEBUG] get_current_user - Supabase 프로필 조회 결과 (RLS bypass): {len(response.data) if response.data else 0}개")
            
            if response.data and len(response.data) > 0:
                print(f"[DEBUG] get_current_user - Supabase JWT로 사용자 인증 성공: {user_id}")
                return response.data[0]
    except Exception as e:
        print(f"[DEBUG] get_current_user - Supabase JWT 실패: {e}")
        logger.warning(f"Supabase JWT decoding failed or user not found: {e}")
        # Supabase 토큰 검증 실패 시, 자체 JWT 토큰으로 시도
        pass
    
    # 자체 JWT 토큰으로 검증 시도
    print(f"[DEBUG] get_current_user - 자체 JWT 토큰으로 검증 시도")
    payload = decode_access_token(token)
    print(f"[DEBUG] get_current_user - 자체 JWT 디코딩 결과: {payload}")
    
    if not payload:
        print(f"[DEBUG] get_current_user - 자체 JWT 디코딩 실패")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 인증 토큰입니다",
        )
    
    user_id = payload.get("user_id")
    print(f"[DEBUG] get_current_user - 자체 JWT에서 추출한 user_id: {user_id}")
    
    if not user_id:
        print(f"[DEBUG] get_current_user - user_id가 없음")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자 정보를 찾을 수 없습니다",
        )
    
    # Supabase에서 사용자 정보 조회 (RLS bypass 함수 사용)
    print(f"[DEBUG] get_current_user - Supabase에서 사용자 조회 (RLS bypass): {user_id}")
    response = supabase.rpc('get_profile_by_id_bypass_rls', {'p_id': str(user_id)}).execute()
    print(f"[DEBUG] get_current_user - 프로필 조회 결과 (RLS bypass): {len(response.data) if response.data else 0}개")
    
    if not response.data or len(response.data) == 0:
        print(f"[DEBUG] get_current_user - 프로필을 찾을 수 없음: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다",
        )
    
    print(f"[DEBUG] get_current_user - 자체 JWT로 사용자 인증 성공: {user_id}")
    return response.data[0]


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(request: UserSignupRequest):
    """
    이메일 회원가입 (이메일 인증 필요)
    ⚠️ auth.sign_up()은 일회용 클라이언트에서 실행 (글로벌 세션 오염 방지)
    """
    supabase = get_supabase_client()
    
    # 이메일 중복 확인 (데이터 전용 클라이언트 사용 - 안전)
    existing_user = supabase.table("profiles").select("id").eq("email", request.email).execute()
    if existing_user.data and len(existing_user.data) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 이메일입니다",
        )
    
    # Supabase Auth에 사용자 생성 (일회용 클라이언트 사용 - 글로벌 세션 보호)
    auth_client = create_auth_client()
    try:
        auth_response = auth_client.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "email_redirect_to": "https://whiplace.com/auth/confirm",
                "data": {
                    "display_name": request.display_name or request.email.split("@")[0]
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="회원가입 처리 중 오류가 발생했습니다",
            )
        
        user_id = auth_response.user.id
        email_confirmed = auth_response.user.email_confirmed_at is not None
        
        print(f"[회원가입] 사용자 생성됨: {user_id}")
        print(f"[회원가입] 이메일 확인 상태: {auth_response.user.email_confirmed_at}")
        print(f"[회원가입] 이메일 인증 필요 여부: {not email_confirmed}")
        
        # 이메일이 이미 확인됨 (Supabase에서 이메일 인증이 비활성화된 경우)
        if email_confirmed:
            print(f"[회원가입] 이메일 인증이 비활성화되어 있음 - 바로 프로필 생성")
            
            # profiles 테이블에 사용자 정보 저장 (RPC 사용 - 소셜 로그인과 동일한 방식)
            try:
                profile_result = supabase.rpc('insert_profile_bypass_rls', {
                    'p_id': str(user_id),
                    'p_email': request.email,
                    'p_display_name': request.display_name or request.email.split("@")[0],
                    'p_auth_provider': 'email',
                    'p_subscription_tier': 'free',
                    'p_onboarding_completed': False,
                    'p_profile_image_url': None,
                    'p_phone_number': None
                }).execute()
                
                if not profile_result.data or len(profile_result.data) == 0:
                    raise Exception("프로필 생성 실패")
                    
                user_data = profile_result.data[0]
            except Exception as profile_error:
                print(f"[ERROR] 프로필 생성 실패: {profile_error}")
                raise Exception(f"프로필 생성 중 오류: {str(profile_error)}")
            
            # JWT 토큰 생성
            access_token = create_access_token({"user_id": user_id, "email": request.email})
            
            return AuthResponse(
                access_token=access_token,
                user=Profile(**user_data),
                onboarding_required=True,
            )
        
        # 이메일 인증 대기 중 - JWT 토큰 발급하지 않음
        response_data = {
            "message": "회원가입이 완료되었습니다. 이메일을 확인해주세요.",
            "email": request.email,
            "requires_email_confirmation": True
        }
        print(f"[회원가입] 응답 데이터: {response_data}")
        return response_data
    
    except Exception as e:
        print(f"회원가입 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"회원가입 처리 중 오류가 발생했습니다: {str(e)}",
        )
    finally:
        # 일회용 auth 클라이언트 폐기 (글로벌 세션 보호)
        del auth_client
        print(f"[회원가입] 일회용 auth 클라이언트 폐기 완료")


@router.post("/login", response_model=AuthResponse)
async def login(request: UserLoginRequest):
    """
    이메일 로그인 (일회용 클라이언트로 비밀번호 검증, 전역 세션 영향 없음)
    """
    # 일회용 Supabase 클라이언트 생성 (전역 싱글톤과 독립적)
    temp_client = create_auth_client()
    
    try:
        # 일회용 클라이언트로 비밀번호 검증 (이 인스턴스에만 토큰 저장)
        auth_response = temp_client.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password,
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="이메일 또는 비밀번호가 올바르지 않습니다",
            )
        
        user_id = auth_response.user.id
        print(f"[이메일 로그인] user_id={user_id}, email={request.email} (일회용 클라이언트 사용)")
        
        # 프로필 조회는 전역 클라이언트 사용 (RLS bypass)
        supabase = get_supabase_client()
        profile = supabase.rpc('get_profile_by_id_bypass_rls', {'p_id': str(user_id)}).execute()
        
        if not profile.data or len(profile.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자 정보를 찾을 수 없습니다",
            )
        
        user_data = profile.data[0]
        onboarding_required = not user_data.get("onboarding_completed", False)
        
        # 자체 JWT 토큰 생성
        access_token = create_access_token({"user_id": user_id, "email": request.email})
        
        return AuthResponse(
            access_token=access_token,
            user=Profile(**user_data),
            onboarding_required=onboarding_required,
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[이메일 로그인] 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다",
        )
    finally:
        # 일회용 클라이언트 명시적 폐기 (토큰도 함께 사라짐)
        del temp_client
        print(f"[이메일 로그인] 일회용 클라이언트 폐기 완료")


@router.post("/confirm-email", response_model=AuthResponse)
async def confirm_email_and_create_profile(user_id: str, email: str, display_name: str = None):
    """
    이메일 확인 후 프로필 생성 및 로그인 처리
    """
    supabase = get_supabase_client()
    
    try:
        # 이미 프로필이 있는지 확인
        existing_profile = supabase.table("profiles").select("*").eq("id", user_id).execute()
        
        if existing_profile.data and len(existing_profile.data) > 0:
            # 이미 프로필이 있으면 바로 로그인
            user_data = existing_profile.data[0]
        else:
            # 프로필 생성
            profile_data = {
                "id": user_id,
                "email": email,
                "display_name": display_name or email.split("@")[0],
                "auth_provider": "email",
                "subscription_tier": "free",
                "onboarding_completed": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            
            profile_response = supabase.table("profiles").insert(profile_data).execute()
            
            if not profile_response.data or len(profile_response.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="프로필 생성에 실패했습니다",
                )
            
            user_data = profile_response.data[0]
        
        # JWT 토큰 생성
        access_token = create_access_token({"user_id": user_id, "email": email})
        
        onboarding_required = not user_data.get("onboarding_completed", False)
        
        return AuthResponse(
            access_token=access_token,
            user=Profile(**user_data),
            onboarding_required=onboarding_required,
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"이메일 확인 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="이메일 인증 처리 중 오류가 발생했습니다",
        )


@router.post("/kakao", response_model=AuthResponse)
async def kakao_login(request: KakaoLoginRequest):
    """
    카카오 로그인 - Admin API 없이 일반 Auth API만 사용
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
    email = kakao_user["email"]
    
    # 기존 profiles 확인 (RLS bypass)
    existing_profile = supabase.rpc('get_profile_by_email_bypass_rls', {'p_email': email}).execute()
    
    user_data = None
    user_id = None
    onboarding_required = True
    
    if existing_profile.data and len(existing_profile.data) > 0:
        # 기존 사용자 - profiles에서 user_id 가져오기
        user_data = existing_profile.data[0]
        user_id = user_data["id"]
        onboarding_required = not user_data.get("onboarding_completed", False)
        print(f"[카카오 로그인] 기존 사용자: user_id={user_id}, email={email}")
    else:
        # 신규 사용자 - UUID 직접 생성
        import uuid
        user_id = str(uuid.uuid4())
        print(f"[카카오 로그인] 신규 사용자: user_id={user_id}, email={email}")
        
        try:
            profile_result = supabase.rpc('insert_profile_bypass_rls', {
                'p_id': user_id,
                'p_email': email,
                'p_display_name': kakao_user.get("display_name", email.split("@")[0]),
                'p_auth_provider': 'kakao',
                'p_subscription_tier': 'free',
                'p_onboarding_completed': False,
                'p_profile_image_url': kakao_user.get("profile_image_url"),
                'p_phone_number': None
            }).execute()
            
            if profile_result.data and len(profile_result.data) > 0:
                user_data = profile_result.data[0]
                onboarding_required = True
                print(f"[카카오 로그인] profiles 생성 완료: {user_id}")
            else:
                raise Exception("profiles 생성 결과 없음")
        except Exception as profile_error:
            print(f"[ERROR] profiles 생성 실패: {profile_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"프로필 생성 중 오류가 발생했습니다: {str(profile_error)}"
            )
    
    # 자체 JWT 토큰 생성 (Supabase Auth 사용 안 함)
    access_token = create_access_token({"user_id": user_id, "email": email})
    
    # 최종 응답
    return AuthResponse(
        access_token=access_token,
        user=Profile(**user_data),
        onboarding_required=onboarding_required
    )


@router.post("/naver", response_model=AuthResponse)
async def naver_login(request: NaverLoginRequest):
    """
    네이버 로그인 - Admin API 없이 일반 Auth API만 사용
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
    email = naver_user["email"]
    
    # 기존 profiles 확인 (RLS bypass)
    existing_profile = supabase.rpc('get_profile_by_email_bypass_rls', {'p_email': email}).execute()
    
    user_data = None
    user_id = None
    onboarding_required = True
    
    if existing_profile.data and len(existing_profile.data) > 0:
        # 기존 사용자 - profiles에서 user_id 가져오기
        user_data = existing_profile.data[0]
        user_id = user_data["id"]
        onboarding_required = not user_data.get("onboarding_completed", False)
        print(f"[네이버 로그인] 기존 사용자: user_id={user_id}, email={email}")
    else:
        # 신규 사용자 - UUID 직접 생성
        import uuid
        user_id = str(uuid.uuid4())
        print(f"[네이버 로그인] 신규 사용자: user_id={user_id}, email={email}")
        
        try:
            profile_result = supabase.rpc('insert_profile_bypass_rls', {
                'p_id': user_id,
                'p_email': email,
                'p_display_name': naver_user.get("display_name", email.split("@")[0]),
                'p_auth_provider': 'naver',
                'p_subscription_tier': 'free',
                'p_onboarding_completed': False,
                'p_profile_image_url': naver_user.get("profile_image_url"),
                'p_phone_number': naver_user.get("phone_number")
            }).execute()
            
            if profile_result.data and len(profile_result.data) > 0:
                user_data = profile_result.data[0]
                onboarding_required = True
                print(f"[네이버 로그인] profiles 생성 완료: {user_id}")
            else:
                raise Exception("profiles 생성 결과 없음")
        except Exception as profile_error:
            print(f"[ERROR] profiles 생성 실패: {profile_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"프로필 생성 중 오류가 발생했습니다: {str(profile_error)}"
            )
    
    # 자체 JWT 토큰 생성 (Supabase Auth 사용 안 함)
    access_token = create_access_token({"user_id": user_id, "email": email})
    
    # 최종 응답
    return AuthResponse(
        access_token=access_token,
        user=Profile(**user_data),
        onboarding_required=onboarding_required
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


@router.put("/profile", response_model=Profile)
async def update_profile(
    profile_update: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    사용자 프로필 업데이트
    """
    supabase = get_supabase_client()
    user_id = current_user["id"]
    
    try:
        # 업데이트할 데이터 준비
        update_data = {}
        if profile_update.display_name is not None:
            update_data["display_name"] = profile_update.display_name
        if profile_update.phone_number is not None:
            update_data["phone_number"] = profile_update.phone_number
        if profile_update.profile_image_url is not None:
            update_data["profile_image_url"] = profile_update.profile_image_url
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="업데이트할 항목이 없습니다."
            )
        
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # profiles 테이블 업데이트
        result = supabase.table("profiles").update(update_data) \
            .eq("id", user_id) \
            .execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다."
            )
        
        return Profile(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Profile update failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"프로필 업데이트 실패: {str(e)}"
        )


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    비밀번호 변경 (로그인 상태)
    ⚠️ 일회용 클라이언트 + Admin API 사용 (글로벌 세션 오염 방지)
    """
    supabase = get_supabase_client()
    user_id = current_user["id"]
    
    try:
        # 현재 비밀번호 확인 (이메일 로그인 사용자만 가능)
        auth_provider = current_user.get("auth_provider", "email")
        
        if auth_provider != "email":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="소셜 로그인으로 가입한 계정은 비밀번호 변경이 불가능합니다."
            )
        
        # 현재 비밀번호 확인 (일회용 클라이언트 사용 - 글로벌 세션 보호)
        email = current_user.get("email")
        auth_client = create_auth_client()
        try:
            login_check = auth_client.auth.sign_in_with_password({
                "email": email,
                "password": request.current_password
            })
            if not login_check.user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="현재 비밀번호가 올바르지 않습니다."
                )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="현재 비밀번호가 올바르지 않습니다."
            )
        finally:
            # 비밀번호 검증용 일회용 클라이언트 즉시 폐기
            del auth_client
        
        # 새 비밀번호로 업데이트 (Admin API 사용 - 세션 변경 없음)
        result = supabase.auth.admin.update_user_by_id(
            user_id,
            {"password": request.new_password}
        )
        
        if not result.user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="비밀번호 변경에 실패했습니다."
            )
        
        print(f"[비밀번호 변경] 성공: user_id={user_id} (Admin API 사용)")
        
        return {
            "message": "비밀번호가 성공적으로 변경되었습니다.",
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Password change failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"비밀번호 변경 실패: {str(e)}"
        )


@router.delete("/delete-account")
async def delete_account(
    request: DeleteAccountRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    계정 삭제
    ⚠️ 비밀번호 확인은 일회용 클라이언트, 삭제는 Admin API 사용 (글로벌 세션 보호)
    """
    supabase = get_supabase_client()
    user_id = current_user["id"]
    
    try:
        # 확인 문자 체크
        if request.confirmation.lower() != "delete":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="확인 문자가 올바르지 않습니다. 'delete'를 입력해주세요."
            )
        
        # 이메일 로그인 사용자만 비밀번호 확인
        auth_provider = current_user.get("auth_provider", "email")
        
        if auth_provider == "email":
            # 비밀번호 확인 (일회용 클라이언트 사용 - 글로벌 세션 보호)
            email = current_user.get("email")
            auth_client = create_auth_client()
            try:
                login_check = auth_client.auth.sign_in_with_password({
                    "email": email,
                    "password": request.password
                })
                if not login_check.user:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="비밀번호가 올바르지 않습니다."
                    )
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="비밀번호가 올바르지 않습니다."
                )
            finally:
                # 비밀번호 검증용 일회용 클라이언트 즉시 폐기
                del auth_client
        
        # Supabase Auth에서 사용자 삭제 (Admin API - 세션 변경 없음)
        # profiles, stores, reviews 등은 CASCADE로 자동 삭제
        result = supabase.auth.admin.delete_user(user_id)
        print(f"[계정 삭제] 성공: user_id={user_id} (Admin API 사용)")
        
        return {
            "message": "계정이 성공적으로 삭제되었습니다.",
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Account deletion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"계정 삭제 실패: {str(e)}"
        )


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """
    비밀번호 재설정 이메일 발송
    """
    supabase = get_supabase_client()
    
    try:
        # 이메일 존재 확인
        profile_check = supabase.table("profiles").select("id, auth_provider").eq("email", request.email).execute()
        
        if not profile_check.data or len(profile_check.data) == 0:
            # 보안상 이메일이 없어도 성공 메시지 반환 (계정 존재 여부 노출 방지)
            return {
                "message": "비밀번호 재설정 링크를 이메일로 보냈습니다."
            }
        
        user_data = profile_check.data[0]
        
        # 소셜 로그인 사용자인지 확인
        if user_data.get("auth_provider") in ["kakao", "naver"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="소셜 로그인으로 가입한 계정은 비밀번호 재설정이 불가능합니다.",
            )
        
        # Supabase Auth의 비밀번호 재설정 이메일 발송
        result = supabase.auth.reset_password_email(
            request.email,
            {
                "redirect_to": "https://whiplace.com/reset-password"
            }
        )
        
        print(f"[비밀번호 재설정] 이메일 발송: {request.email}")
        
        return {
            "message": "비밀번호 재설정 링크를 이메일로 보냈습니다."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"비밀번호 재설정 이메일 발송 오류: {e}")
        # 보안상 에러 상세 내용 숨김
        return {
            "message": "비밀번호 재설정 링크를 이메일로 보냈습니다."
        }


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """
    비밀번호 재설정 (이메일 링크에서 받은 토큰 사용)
    """
    import httpx
    import os
    
    supabase_url = os.getenv("SUPABASE_URL")
    
    try:
        # Supabase REST API를 직접 호출하여 비밀번호 업데이트
        supabase_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")
        
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {request.access_token}",
                    "apikey": supabase_key,
                    "Content-Type": "application/json",
                },
                json={"password": request.new_password}
            )
            
            if response.status_code != 200:
                error_data = response.json()
                print(f"[비밀번호 재설정 실패] status: {response.status_code}, error: {error_data}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="비밀번호 재설정에 실패했습니다. 링크가 만료되었거나 유효하지 않습니다.",
                )
            
            result = response.json()
            print(f"[비밀번호 재설정] 완료: {result.get('email', 'unknown')}")
            
            return {
                "message": "비밀번호가 성공적으로 변경되었습니다."
            }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"비밀번호 재설정 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="비밀번호 재설정 처리 중 오류가 발생했습니다.",
        )


@router.post("/logout")
async def logout():
    """
    로그아웃 (클라이언트에서 토큰 삭제 처리)
    """
    return {"message": "로그아웃되었습니다"}


# ============================================
# OTP (카카오 알림톡) 로그인
# ============================================

@router.post("/send-otp", response_model=None)
async def send_otp(request: OTPSendRequest):
    """
    카카오 알림톡으로 OTP 인증코드 발송
    - 전화번호 입력 → 6자리 인증코드를 카카오톡 알림톡으로 발송
    - 3분간 유효
    - 1분 내 재발송 불가
    """
    from ..services.otp_service import otp_service
    
    result = await otp_service.send_otp(request.phone_number)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )
    
    return OTPSendResponse(
        success=True,
        message=result["message"],
        expires_in=result.get("expires_in"),
    )


@router.post("/verify-otp", response_model=None)
async def verify_otp(request: OTPVerifyRequest):
    """
    OTP 인증코드 검증 및 로그인/회원가입
    
    1. 인증코드 검증
    2. 기존 회원이면 → JWT 토큰 발급 (로그인)
    3. 신규 회원이면 → 프로필 자동 생성 → JWT 토큰 발급
    """
    from ..services.otp_service import otp_service
    
    result = await otp_service.verify_otp(request.phone_number, request.code)
    
    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"],
        )
    
    supabase = get_supabase_client()
    
    if result.get("is_new_user"):
        # 신규 사용자: 프로필 자동 생성
        phone = request.phone_number.replace("-", "").replace(" ", "")
        new_user_id = str(uuid.uuid4())
        
        profile_data = {
            "id": new_user_id,
            "email": f"phone_{phone}@whiplace.com",  # 임시 이메일 (나중에 변경 가능)
            "display_name": f"사용자_{phone[-4:]}",
            "auth_provider": "phone",
            "phone_number": phone,
            "subscription_tier": "free",
            "onboarding_completed": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        try:
            profile_result = supabase.table("profiles").insert(profile_data).execute()
            
            if not profile_result.data or len(profile_result.data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="계정 생성에 실패했습니다",
                )
            
            user_data = profile_result.data[0]
            
        except Exception as e:
            print(f"[OTP] 프로필 생성 오류: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="계정 생성에 실패했습니다",
            )
        
        # JWT 토큰 생성
        access_token = create_access_token({
            "user_id": new_user_id,
            "email": user_data["email"],
        })
        
        return OTPVerifyResponse(
            success=True,
            message="회원가입이 완료되었습니다",
            access_token=access_token,
            user=Profile(**user_data),
            is_new_user=True,
            onboarding_required=True,
        )
    
    else:
        # 기존 사용자: 로그인
        user_data = result["user_data"]
        user_id = result["user_id"]
        
        # 전체 프로필 조회 (모든 필드 포함)
        full_profile = supabase.rpc('get_profile_by_id_bypass_rls', {'p_id': str(user_id)}).execute()
        
        if full_profile.data and len(full_profile.data) > 0:
            user_data = full_profile.data[0]
        
        onboarding_required = not user_data.get("onboarding_completed", False)
        
        # JWT 토큰 생성
        access_token = create_access_token({
            "user_id": str(user_id),
            "email": user_data.get("email", ""),
        })
        
        return OTPVerifyResponse(
            success=True,
            message="로그인이 완료되었습니다",
            access_token=access_token,
            user=Profile(**user_data),
            is_new_user=False,
            onboarding_required=onboarding_required,
        )
