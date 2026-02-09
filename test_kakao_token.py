import os
import httpx
import asyncio
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv('backend/.env')

async def test_kakao_token(code: str):
    """카카오 토큰 교환 테스트"""
    url = "https://kauth.kakao.com/oauth/token"
    
    rest_api_key = os.getenv("KAKAO_REST_API_KEY")
    client_secret = os.getenv("KAKAO_CLIENT_SECRET")
    redirect_uri = os.getenv("KAKAO_REDIRECT_URI")
    
    print("=" * 60)
    print("카카오 토큰 교환 테스트")
    print("=" * 60)
    print(f"REST API KEY: {rest_api_key}")
    print(f"CLIENT SECRET: {client_secret[:10]}... (길이: {len(client_secret) if client_secret else 0})")
    print(f"REDIRECT URI: {redirect_uri}")
    print(f"CODE: {code[:30]}...")
    print("=" * 60)
    
    data = {
        "grant_type": "authorization_code",
        "client_id": rest_api_key,
        "redirect_uri": redirect_uri,
        "code": code,
    }
    
    # Client Secret이 있으면 추가
    if client_secret:
        data["client_secret"] = client_secret
    
    async with httpx.AsyncClient() as client:
        try:
            print("\n📤 카카오 API 호출 중...")
            response = await client.post(url, data=data)
            
            print(f"\n✅ Status Code: {response.status_code}")
            print(f"\n📦 Response Body:")
            print(response.text)
            
            if response.status_code == 200:
                print("\n🎉 성공! 토큰 교환 완료!")
            else:
                print("\n❌ 실패! 에러 발생!")
                
        except Exception as e:
            print(f"\n💥 예외 발생: {e}")

if __name__ == "__main__":
    # 스크린샷의 code 값 (만료되었을 수 있음)
    test_code = "BIG1Zp24yfwT5qnaMoppye6M_HUfgSydA4dGUjKnwZI5ZXdmxLMxBwAAAAQKFxDvAAABnEJB4YJtZc7GWqiBKA"
    
    asyncio.run(test_kakao_token(test_code))
