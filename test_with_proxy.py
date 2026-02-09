"""
프록시 사용하여 네이버 API 테스트
- 프록시 사용 여부에 따른 차이 확인
"""
import httpx
import json
import asyncio
import os

async def test_with_and_without_proxy():
    """프록시 사용/미사용 비교 테스트"""
    
    api_url = "https://api.place.naver.com/graphql"
    proxy_url = os.getenv("PROXY_URL")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Content-Type": "application/json",
        "Origin": "https://m.place.naver.com",
        "Referer": "https://m.place.naver.com/",
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"iOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
    }
    
    graphql_query = """
    query getPlacesList($input: PlacesInput) {
        places(input: $input) {
            total
            items {
                id
                name
            }
        }
    }
    """
    
    variables = {
        "input": {
            "query": "안국역맛집",
            "start": 1,
            "display": 10,
            "deviceType": "mobile",
            "x": "127.0276",
            "y": "37.4979"
        }
    }
    
    payload = {
        "operationName": "getPlacesList",
        "variables": variables,
        "query": graphql_query
    }
    
    print(f"\n{'='*60}")
    print(f"프록시 비교 테스트")
    print(f"{'='*60}")
    print(f"프록시 URL: {proxy_url[:60] if proxy_url else 'None'}...")
    print(f"{'='*60}\n")
    
    # 테스트 1: 프록시 없이
    print("🔸 테스트 1: 프록시 없이 호출")
    print("-" * 60)
    try:
        import time
        start = time.time()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                api_url,
                json=payload,
                headers=headers,
                follow_redirects=True
            )
            
            elapsed = time.time() - start
            print(f"✅ 성공!")
            print(f"   응답 코드: {response.status_code}")
            print(f"   소요 시간: {elapsed:.2f}초")
            
            if response.status_code == 200:
                data = response.json()
                total = data.get("data", {}).get("places", {}).get("total", 0)
                items = data.get("data", {}).get("places", {}).get("items", [])
                print(f"   전체 업체: {total}개")
                print(f"   반환 항목: {len(items)}개")
            
    except Exception as e:
        print(f"❌ 실패!")
        print(f"   에러 타입: {type(e).__name__}")
        print(f"   에러 메시지: {str(e)}")
        import traceback
        print(f"   스택 트레이스:\n{traceback.format_exc()}")
    
    print()
    
    # 테스트 2: 프록시 사용
    if proxy_url:
        print("🔸 테스트 2: 프록시 사용하여 호출")
        print("-" * 60)
        try:
            import time
            start = time.time()
            
            async with httpx.AsyncClient(timeout=30.0, proxy=proxy_url) as client:
                response = await client.post(
                    api_url,
                    json=payload,
                    headers=headers,
                    follow_redirects=True
                )
                
                elapsed = time.time() - start
                print(f"✅ 성공!")
                print(f"   응답 코드: {response.status_code}")
                print(f"   소요 시간: {elapsed:.2f}초")
                
                if response.status_code == 200:
                    data = response.json()
                    total = data.get("data", {}).get("places", {}).get("total", 0)
                    items = data.get("data", {}).get("places", {}).get("items", [])
                    print(f"   전체 업체: {total}개")
                    print(f"   반환 항목: {len(items)}개")
                
        except Exception as e:
            print(f"❌ 실패!")
            print(f"   에러 타입: {type(e).__name__}")
            print(f"   에러 메시지: {str(e)}")
            import traceback
            print(f"   스택 트레이스:\n{traceback.format_exc()}")
    else:
        print("⚠️  프록시 URL이 설정되지 않았습니다.")
    
    print(f"\n{'='*60}")
    print(f"테스트 완료")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    asyncio.run(test_with_and_without_proxy())
