"""
Admin Dependencies
관리자 권한 체크 의존성
"""
from fastapi import Depends, HTTPException, status
from app.routers.auth import get_current_user


async def require_god_tier(user = Depends(get_current_user)):
    """
    God Tier 권한 확인
    
    Args:
        user: 현재 로그인한 사용자 (딕셔너리)
        
    Returns:
        user: God Tier 사용자
        
    Raises:
        HTTPException: God Tier가 아닌 경우 403 에러
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    # subscription_tier 확인 (user는 딕셔너리)
    user_tier = user.get('subscription_tier')
    if not user_tier:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint requires God tier access. No tier found."
        )
    
    if user_tier.lower() != 'god':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This endpoint requires God tier access. Current tier: {user_tier}"
        )
    
    return user
