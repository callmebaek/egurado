import httpx
import asyncio

async def test():
    url = "https://kauth.kakao.com/oauth/token"
    
    # 최신 code
    code = "Rh2taEaANJfQids_OuDjaicUaZJYlvSY2AvIITDAr4sDjr-c-0NkQQAAAAQKFwHPAAABnEJsDCAq17LwdM8QAg"
    
    # Native App 키 사용
    data = {
        "grant_type": "authorization_code",
        "client_id": "1381ff2b4417de3cd0b03e6bb1edd436",  # Native App Key
        "redirect_uri": "https://www.whiplace.com/auth/callback/kakao",
        "code": code,
        "client_secret": "spR10L3XZAQgKKFtwhigXE720tR7WYFz"
    }
    
    print("=" * 70)
    print("TEST WITH NATIVE APP KEY")
    print("=" * 70)
    print(f"Code: {code[:50]}...")
    print(f"Client ID (Native): {data['client_id']}")
    print(f"Redirect URI: {data['redirect_uri']}")
    print("=" * 70)
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=data)
        print(f"\nStatus: {response.status_code}")
        print(f"Response: {response.text}\n")
        
        if response.status_code == 200:
            print("=" * 70)
            print("SUCCESS WITH NATIVE APP KEY!!!")
            print("=" * 70)
            result = response.json()
            print(f"Access Token: {result.get('access_token', '')[:30]}...")
        else:
            print("=" * 70)
            print("FAILED WITH NATIVE APP KEY")
            print("=" * 70)

asyncio.run(test())
