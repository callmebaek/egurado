import httpx
import asyncio

async def test():
    url = "https://kauth.kakao.com/oauth/token"
    
    # Client Secret 없이 테스트
    data = {
        "grant_type": "authorization_code",
        "client_id": "23a16753e4f7f0b2351c47875259b1e4",
        "redirect_uri": "https://www.whiplace.com/auth/callback/kakao",
        "code": "NEED_NEW_CODE"  # 새 code 필요
    }
    
    print("Testing WITHOUT Client Secret...")
    print("Need a NEW code - please login again!")

# asyncio.run(test())
print("Skipped - need new code")
