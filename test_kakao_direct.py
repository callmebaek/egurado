import httpx
import asyncio

async def test_kakao_token(code: str):
    """카카오 토큰 교환 테스트"""
    url = "https://kauth.kakao.com/oauth/token"
    
    # 직접 입력
    rest_api_key = "23a16753e4f7f0b2351c47875259b1e4"
    client_secret = "spR10L3XZAQgKKFtwhigXE720tR7WYFz"
    redirect_uri = "https://whiplace.com/auth/callback/kakao"
    
    print("=" * 60)
    print("카카오 토큰 교환 테스트")
    print("=" * 60)
    print(f"REST API KEY: {rest_api_key}")
    print(f"CLIENT SECRET: {client_secret[:10]}... (길이: {len(client_secret)})")
    print(f"REDIRECT URI: {redirect_uri}")
    print(f"CODE: {code[:30]}...")
    print("=" * 60)
    
    data = {
        "grant_type": "authorization_code",
        "client_id": rest_api_key,
        "redirect_uri": redirect_uri,
        "code": code,
        "client_secret": client_secret
    }
    
    async with httpx.AsyncClient() as client:
        try:
            print("\n📤 카카오 API 호출 중...")
            response = await client.post(url, data=data)
            
            print(f"\n✅ Status Code: {response.status_code}")
            print(f"\n📦 Response Body:")
            print(response.text)
            
            if response.status_code == 200:
                print("\n🎉 성공! 토큰 교환 완료!")
                result = response.json()
                print(f"Access Token: {result.get('access_token', '')[:20]}...")
            else:
                print("\n❌ 실패! 에러 발생!")
                
        except Exception as e:
            print(f"\n💥 예외 발생: {e}")

if __name__ == "__main__":
    # 스크린샷의 code 값 (만료되었을 수 있으니 새로 로그인해서 받아야 함)
    test_code = "BIG1Zp24yfwT5qnaMoppye6M_HUfgSydA4dGUjKnwZI5ZXdmxLMxBwAAAAQKFxDvAAABnEJB4YJtZc7GWqiBKA"
    
    print("\n⚠️ 주의: 이 code는 이미 만료되었을 수 있습니다.")
    print("새로운 code를 얻으려면 다시 로그인을 시도해주세요.\n")
    
    asyncio.run(test_kakao_token(test_code))
