import httpx
import asyncio

async def test():
    url = "https://kauth.kakao.com/oauth/token"
    
    # 새로운 code
    new_code = "1q_AbTQpl55pwvynQfVM3C6eMKsLePf7-Pu0AQD5rD-kCbGd7PVjfwAAAAQKFyIgAAABnEJGseltjdRilM79qQ"
    
    data = {
        "grant_type": "authorization_code",
        "client_id": "23a16753e4f7f0b2351c47875259b1e4",
        "redirect_uri": "https://whiplace.com/auth/callback/kakao",
        "code": new_code,
        "client_secret": "spR10L3XZAQgKKFtwhigXE720tR7WYFz"
    }
    
    print("Testing with NEW code...")
    print(f"Code: {new_code[:50]}...")
    print("")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("\n=== SUCCESS ===")
            result = response.json()
            print(f"Access Token: {result.get('access_token', '')[:30]}...")
        else:
            print("\n=== FAILED ===")

asyncio.run(test())
