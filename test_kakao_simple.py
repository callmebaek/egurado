import httpx
import asyncio

async def test():
    url = "https://kauth.kakao.com/oauth/token"
    
    data = {
        "grant_type": "authorization_code",
        "client_id": "23a16753e4f7f0b2351c47875259b1e4",
        "redirect_uri": "https://whiplace.com/auth/callback/kakao",
        "code": "BIG1Zp24yfwT5qnaMoppye6M_HUfgSydA4dGUjKnwZI5ZXdmxLMxBwAAAAQKFxDvAAABnEJB4YJtZc7GWqiBKA",
        "client_secret": "spR10L3XZAQgKKFtwhigXE720tR7WYFz"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")

asyncio.run(test())
