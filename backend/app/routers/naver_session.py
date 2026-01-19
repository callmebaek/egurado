"""
네이버 세션 관리 API (북마클릿 방식)
"""

import json
import logging
import time
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import pytz

from app.core.database import get_supabase_client

logger = logging.getLogger(__name__)
KST = pytz.timezone('Asia/Seoul')

router = APIRouter()


# ============================================
# Pydantic 모델
# ============================================

class Cookie(BaseModel):
    """쿠키 정보"""
    name: str
    value: str
    domain: str
    path: str = "/"
    secure: bool = False
    httpOnly: bool = False
    sameSite: str = "Lax"


class SaveSessionRequest(BaseModel):
    """세션 저장 요청"""
    store_id: str
    cookies: List[dict]


class SaveSessionResponse(BaseModel):
    """세션 저장 응답"""
    success: bool
    message: str
    expires_at: str


class CheckSessionRequest(BaseModel):
    """세션 확인 요청"""
    store_id: str


class CheckSessionResponse(BaseModel):
    """세션 확인 응답"""
    has_session: bool
    is_valid: bool
    expires_at: str | None
    days_remaining: int | None


# ============================================
# API 엔드포인트
# ============================================

@router.post("/save", response_model=SaveSessionResponse)
async def save_naver_session(request: SaveSessionRequest):
    """
    네이버 세션 저장 (북마클릿에서 호출)
    
    북마클릿이 수집한 쿠키를 암호화하여 DB에 저장합니다.
    """
    try:
        store_id = request.store_id
        cookies = request.cookies
        
        # #region agent log
        import json as json_module
        with open(r'c:\egurado\.cursor\debug.log', 'a', encoding='utf-8') as f:
            f.write(json_module.dumps({'location':'naver_session.py:76','message':'Function entry','data':{'store_id':store_id,'cookies_count':len(cookies)},'timestamp':int(time.time()*1000),'sessionId':'debug-session','runId':'run1','hypothesisId':'C'})+'\n')
        # Sample first 2 cookies
        for i, cookie in enumerate(cookies[:2]):
            with open(r'c:\egurado\.cursor\debug.log', 'a', encoding='utf-8') as f:
                f.write(json_module.dumps({'location':f'naver_session.py:80','message':f'Received cookie {i+1}','data':{'name':cookie.get('name'),'has_expires':('expires' in cookie),'has_expiry':('expiry' in cookie),'expires_value':cookie.get('expires'),'expiry_value':cookie.get('expiry'),'keys':list(cookie.keys())},'timestamp':int(time.time()*1000),'sessionId':'debug-session','runId':'run1','hypothesisId':'B'})+'\n')
        # #endregion
        
        logger.info(f"🔄 [NEW CODE] 세션 저장 요청: store_id={store_id}, cookies={len(cookies)}개")
        
        # Debug: Log first 3 cookies to see structure
        for i, cookie in enumerate(cookies[:3]):
            logger.info(f"🔍 Sample cookie {i+1}: keys={list(cookie.keys())}, name={cookie.get('name')}, domain={cookie.get('domain')}, has_expires={cookie.get('expires') is not None}, has_expiry={cookie.get('expiry') is not None}")
        
        # 1. 매장 확인
        supabase = get_supabase_client()
        store_result = supabase.table("stores").select("*").eq("id", store_id).execute()
        
        if not store_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다"
            )
        
        # 2. 쿠키 필터링 및 정규화 (네이버 관련만)
        naver_cookies = []
        for cookie in cookies:
            domain = cookie.get("domain", "")
            if "naver.com" in domain:
                # Debug: Log raw cookie data for critical cookies
                if cookie.get('name') in ['NID_AUT', 'NID_SES']:
                    logger.info(f"🔍 Raw cookie '{cookie.get('name')}': keys={list(cookie.keys())}, expires={cookie.get('expires')}, expiry={cookie.get('expiry')}")
                
                # Ensure domain starts with a dot for subdomain matching
                if not domain.startswith('.'):
                    cookie['domain'] = '.naver.com'
                
                # Convert Chrome 'expires' to Selenium 'expiry'
                if 'expires' in cookie and 'expiry' not in cookie:
                    expires_val = cookie['expires']
                    if expires_val is not None:
                        cookie['expiry'] = expires_val
                        del cookie['expires']
                    else:
                        logger.warning(f"⚠️ Cookie '{cookie.get('name')}' has 'expires' key but value is None!")
                        # For critical cookies, set default expiry (7 days from now)
                        if cookie.get('name') in ['NID_AUT', 'NID_SES', 'ASID', 'BUC']:
                            default_expiry = int(time.time()) + (7 * 24 * 60 * 60)  # 7 days
                            cookie['expiry'] = default_expiry
                            del cookie['expires']
                            logger.warning(f"✅ [FIXED] Set default expiry for '{cookie.get('name')}': {default_expiry}")
                
                # If no 'expires' or 'expiry' field, add default expiry for critical cookies
                if 'expiry' not in cookie and 'expires' not in cookie:
                    if cookie.get('name') in ['NID_AUT', 'NID_SES', 'ASID', 'BUC']:
                        default_expiry = int(time.time()) + (7 * 24 * 60 * 60)  # 7 days
                        cookie['expiry'] = default_expiry
                        logger.info(f"✅ Added default expiry for session cookie '{cookie.get('name')}': {default_expiry}")
                
                naver_cookies.append(cookie)
        
        if len(naver_cookies) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="네이버 쿠키를 찾을 수 없습니다. 네이버에 로그인한 상태에서 북마클릿을 실행해주세요."
            )
        
        # #region agent log
        for cookie in naver_cookies:
            if cookie['name'] in ['NID_AUT', 'NID_SES']:
                with open(r'c:\egurado\.cursor\debug.log', 'a', encoding='utf-8') as f:
                    f.write(json_module.dumps({'location':'naver_session.py:139','message':'After filtering naver cookie','data':{'name':cookie['name'],'has_expires':('expires' in cookie),'has_expiry':('expiry' in cookie),'expires_value':cookie.get('expires'),'expiry_value':cookie.get('expiry'),'keys':list(cookie.keys())},'timestamp':int(time.time()*1000),'sessionId':'debug-session','runId':'run1','hypothesisId':'B'})+'\\n')
        # #endregion
        
        # Debug: Log critical cookies and their expiry
        critical_cookies = [c['name'] for c in naver_cookies if c['name'] in ['NID_AUT', 'NID_SES']]
        logger.info(f"네이버 쿠키 필터링: {len(naver_cookies)}개 (중요 쿠키: {critical_cookies})")
        
        # Check expiry of critical cookies
        logger.info(f"🔍 [DEBUG] Checking {len(naver_cookies)} cookies for expiry...")
        current_time = time.time()
        for cookie in naver_cookies:
            if cookie['name'] in ['NID_AUT', 'NID_SES']:
                logger.info(f"🔍 [DEBUG] Cookie '{cookie['name']}': keys={list(cookie.keys())}")
                expiry = cookie.get('expiry')
                if expiry:
                    if expiry < current_time:
                        logger.warning(f"⚠️ Received EXPIRED cookie '{cookie['name']}' (expired {int((current_time - expiry) / 3600)} hours ago)")
                    else:
                        logger.info(f"✅ Received valid cookie '{cookie['name']}' (expires in {int((expiry - current_time) / 3600)} hours)")
                else:
                    # Session cookies (no expiry) are valid - they last until browser closes
                    logger.info(f"ℹ️ Cookie '{cookie['name']}' is a session cookie (no expiry, valid until browser closes)")
        
        # 3. 세션 암호화 (간단하게 JSON 직렬화, 프로덕션에서는 암호화 추가)
        session_encrypted = json.dumps(naver_cookies)
        
        # #region agent log
        import json as json_module
        for cookie in naver_cookies:
            if cookie.get('name') in ['NID_AUT', 'NID_SES']:
                with open(r'c:\egurado\.cursor\debug.log', 'a', encoding='utf-8') as f:
                    f.write(json_module.dumps({'location':'naver_session.py:164','message':'Cookie before DB save','data':{'name':cookie.get('name'),'has_expiry':('expiry' in cookie),'expiry_value':cookie.get('expiry'),'keys':list(cookie.keys())},'timestamp':int(time.time()*1000),'sessionId':'debug-session','runId':'run1','hypothesisId':'H'})+'\n')
        # #endregion
        
        # 4. 만료 시간 설정 (7일)
        expires_at = datetime.now(KST) + timedelta(days=7)
        
        # 5. DB 저장
        update_data = {
            "naver_session_encrypted": session_encrypted,
            "naver_session_expires_at": expires_at.isoformat(),
            "naver_last_login_at": datetime.now(KST).isoformat()
        }
        
        supabase.table("stores").update(update_data).eq("id", store_id).execute()
        
        # DEBUG: Verify what was saved to DB
        verify_result = supabase.table("stores").select("naver_session_encrypted").eq("id", store_id).execute()
        if verify_result.data:
            saved_cookies = json.loads(verify_result.data[0]['naver_session_encrypted'])
            for cookie in saved_cookies:
                if cookie.get('name') in ['NID_AUT', 'NID_SES']:
                    logger.warning(f"🔍 [DB VERIFY] Cookie '{cookie['name']}' in DB: has_expiry={('expiry' in cookie)}, expiry={cookie.get('expiry')}")
        
        logger.info(f"✅ 세션 저장 완료: store_id={store_id}, expires_at={expires_at}")
        
        return SaveSessionResponse(
            success=True,
            message=f"네이버 세션이 성공적으로 저장되었습니다. (유효기간: 7일)",
            expires_at=expires_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"세션 저장 실패: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"세션 저장 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/check", response_model=CheckSessionResponse)
async def check_naver_session(request: CheckSessionRequest):
    """
    네이버 세션 확인
    
    세션이 존재하는지, 유효한지 확인합니다.
    """
    try:
        store_id = request.store_id
        logger.info(f"🔍 세션 확인 요청: store_id={store_id}")
        
        supabase = get_supabase_client()
        store_result = supabase.table("stores").select(
            "naver_session_encrypted, naver_session_expires_at"
        ).eq("id", store_id).execute()
        
        if not store_result.data:
            logger.warning(f"❌ 매장을 찾을 수 없음: store_id={store_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="매장을 찾을 수 없습니다"
            )
        
        store = store_result.data[0]
        logger.info(f"📊 매장 데이터: has_encrypted={bool(store.get('naver_session_encrypted'))}, has_expires={bool(store.get('naver_session_expires_at'))}")
        
        has_session = bool(store.get("naver_session_encrypted"))
        expires_at_str = store.get("naver_session_expires_at")
        
        if not has_session or not expires_at_str:
            logger.info(f"❌ 세션 없음: has_session={has_session}, expires_at={expires_at_str}")
            return CheckSessionResponse(
                has_session=False,
                is_valid=False,
                expires_at=None,
                days_remaining=None
            )
        
        # 만료 시간 확인
        expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
        now = datetime.now(KST)
        
        is_valid = expires_at > now
        days_remaining = (expires_at - now).days if is_valid else 0
        
        return CheckSessionResponse(
            has_session=True,
            is_valid=is_valid,
            expires_at=expires_at_str,
            days_remaining=days_remaining
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"세션 확인 실패: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"세션 확인 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/delete")
async def delete_naver_session(request: CheckSessionRequest):
    """
    네이버 세션 삭제
    """
    try:
        store_id = request.store_id
        
        supabase = get_supabase_client()
        
        update_data = {
            "naver_session_encrypted": None,
            "naver_session_expires_at": None
        }
        
        supabase.table("stores").update(update_data).eq("id", store_id).execute()
        
        logger.info(f"✅ 세션 삭제 완료: store_id={store_id}")
        
        return {
            "success": True,
            "message": "네이버 세션이 삭제되었습니다"
        }
        
    except Exception as e:
        logger.error(f"세션 삭제 실패: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"세션 삭제 중 오류가 발생했습니다: {str(e)}"
        )
