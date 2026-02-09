import httpx
import asyncio

async def test():
    url = "https://kauth.kakao.com/oauth/token"
    
    # 최신 code
    code = "dib-nGgXYxkeauDw6cKGI7rQ11cA7BmvDx9YVG8QTIq6KdRb0HmqegAAAAQKFxKWAAABnEJn0wtONYg--5I0Sw"
    
    # 백엔드 설정과 동일
    data = {
        "grant_type": "authorization_code",
        "client_id": "23a16753e4f7f0b2351c47875259b1e4",
        "redirect_uri": "https://www.whiplace.com/auth/callback/kakao",
        "code": code,
        "client_secret": "spR10L3XZAQgKKFtwhigXE720tR7WYFz"
    }
    
    print("=" * 70)
    print("FINAL TEST - All Settings Confirmed Correct")
    print("=" * 70)
    print(f"Code: {code[:50]}...")
    print(f"Client ID: {data['client_id']}")
    print(f"Redirect URI: {data['redirect_uri']}")
    print(f"Client Secret: {data['client_secret'][:10]}...")
    print("=" * 70)
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=data)
        print(f"\nStatus: {response.status_code}")
        print(f"Response: {response.text}\n")
        
        if response.status_code == 200:
            print("=" * 70)
            print("SUCCESS!!!! LOGIN WORKS!")
            print("=" * 70)
            result = response.json()
            print(f"Access Token: {result.get('access_token', '')[:30]}...")
            print(f"Token Type: {result.get('token_type')}")
            print(f"Expires In: {result.get('expires_in')} seconds")
        else:
            print("=" * 70)
            print("FAILED - Error Details:")
            print("=" * 70)
            try:
                error = response.json()
                print(f"Error: {error.get('error')}")
                print(f"Description: {error.get('error_description')}")
                print(f"Error Code: {error.get('error_code')}")
            except:
                print(response.text)

asyncio.run(test())
