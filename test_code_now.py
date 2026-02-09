import httpx
import asyncio

async def test():
    url = "https://kauth.kakao.com/oauth/token"
    
    # 방금 받은 최신 code
    latest_code = "FHyS1Eu_oYmRlMJkowzAIuQxhpbJu2jO0N7Iz_C0_dYLUJFA_zf-YQAAAAQKFxafAAABnEJfVw-o9NUiJo7xnA"
    
    # 현재 백엔드 설정
    data = {
        "grant_type": "authorization_code",
        "client_id": "23a16753e4f7f0b2351c47875259b1e4",
        "redirect_uri": "https://www.whiplace.com/auth/callback/kakao",
        "code": latest_code,
        "client_secret": "spR10L3XZAQgKKFtwhigXE720tR7WYFz"
    }
    
    print("=" * 70)
    print("TESTING LATEST CODE")
    print("=" * 70)
    print(f"Code: {latest_code[:50]}...")
    print(f"Redirect URI: {data['redirect_uri']}")
    print("=" * 70)
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=data)
        print(f"\nStatus: {response.status_code}")
        print(f"Response: {response.text}\n")
        
        if response.status_code == 200:
            print("=" * 70)
            print("SUCCESS!!!")
            print("=" * 70)
        else:
            print("=" * 70)
            print("FAILED - Testing without Client Secret...")
            print("=" * 70)
            
            # Client Secret 없이 재시도
            data_no_secret = data.copy()
            del data_no_secret["client_secret"]
            
            response2 = await client.post(url, data=data_no_secret)
            print(f"\nWithout Secret - Status: {response2.status_code}")
            print(f"Without Secret - Response: {response2.text}\n")

asyncio.run(test())
