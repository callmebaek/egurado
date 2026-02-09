import httpx
import asyncio

async def test():
    url = "https://kauth.kakao.com/oauth/token"
    
    # 방금 받은 새로운 code
    fresh_code = "B-RJuJS1xm7ygIK2kofIiEFZDfYn7M2_i6ifXpF24JIvqgzWCIEBwgAAAAQKFwvXAAABnEJWKwq37mS5Kc-sjw"
    
    # 현재 백엔드 설정과 동일하게
    data = {
        "grant_type": "authorization_code",
        "client_id": "23a16753e4f7f0b2351c47875259b1e4",
        "redirect_uri": "https://www.whiplace.com/auth/callback/kakao",  # www 포함!
        "code": fresh_code,
        "client_secret": "spR10L3XZAQgKKFtwhigXE720tR7WYFz"
    }
    
    print("=" * 70)
    print("FRESH CODE TEST - www.whiplace.com")
    print("=" * 70)
    print(f"Code: {fresh_code[:50]}...")
    print(f"Redirect URI: {data['redirect_uri']}")
    print(f"Client ID: {data['client_id']}")
    print(f"Client Secret: {data['client_secret'][:10]}...")
    print("=" * 70)
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=data)
        print(f"\nStatus: {response.status_code}")
        print(f"Response: {response.text}\n")
        
        if response.status_code == 200:
            print("=" * 70)
            print("SUCCESS! Token exchange worked!")
            print("=" * 70)
            result = response.json()
            print(f"Access Token: {result.get('access_token', '')[:30]}...")
        else:
            print("=" * 70)
            print("FAILED! Error from Kakao:")
            print("=" * 70)

asyncio.run(test())
