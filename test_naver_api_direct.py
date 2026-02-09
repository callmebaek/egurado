"""
네이버 GraphQL API 직접 테스트
- 어디서 문제가 발생하는지 정확히 파악
"""
import httpx
import json
import asyncio
import time

async def test_naver_graphql_api():
    """네이버 GraphQL API 직접 호출 테스트"""
    
    api_url = "https://api.place.naver.com/graphql"
    
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
                category
                address
                roadAddress
                x
                y
                imageUrl
                blogCafeReviewCount
                visitorReviewCount
                visitorReviewScore
            }
        }
    }
    """
    
    # 테스트 1: 첫 페이지 (1-100)
    print("\n" + "="*60)
    print("테스트 1: 페이지 1 (start=1, display=100)")
    print("="*60)
    
    test_cases = [
        {"keyword": "강남맛집", "start": 1, "display": 100},
        {"keyword": "강남맛집", "start": 101, "display": 100},
        {"keyword": "강남맛집", "start": 201, "display": 100},
        {"keyword": "강남맛집", "start": 301, "display": 100},
    ]
    
    for idx, test in enumerate(test_cases, 1):
        print(f"\n--- 테스트 {idx}: keyword={test['keyword']}, start={test['start']}, display={test['display']} ---")
        
        variables = {
            "input": {
                "query": test['keyword'],
                "start": test['start'],
                "display": test['display'],
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
        
        try:
            start_time = time.time()
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    api_url,
                    json=payload,
                    headers=headers,
                    follow_redirects=True
                )
                
                elapsed = time.time() - start_time
                
                print(f"✅ 응답 코드: {response.status_code}")
                print(f"⏱️  소요 시간: {elapsed:.2f}초")
                print(f"📦 응답 크기: {len(response.content)} bytes")
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # 에러 체크
                    if "errors" in data:
                        print(f"❌ GraphQL 에러:")
                        print(json.dumps(data["errors"], indent=2, ensure_ascii=False))
                        continue
                    
                    places_data = data.get("data", {}).get("places", {})
                    total = places_data.get("total", 0)
                    items = places_data.get("items", [])
                    
                    print(f"📊 전체 업체수: {total}")
                    print(f"📋 반환된 항목: {len(items)}개")
                    
                    if items:
                        first_item = items[0]
                        print(f"🏪 첫번째 매장: {first_item.get('name')} (ID: {first_item.get('id')})")
                    
                    # 데이터 구조 확인
                    print("\n응답 데이터 구조:")
                    print(json.dumps(data, indent=2, ensure_ascii=False)[:500] + "...")
                
                else:
                    print(f"❌ HTTP 에러: {response.status_code}")
                    print(f"응답 내용: {response.text[:500]}")
                
        except httpx.TimeoutException as e:
            print(f"⏰ 타임아웃 에러: {str(e)}")
        except httpx.HTTPStatusError as e:
            print(f"❌ HTTP 상태 에러: {str(e)}")
            print(f"응답 내용: {e.response.text[:500]}")
        except Exception as e:
            print(f"❌ 예외 발생: {type(e).__name__}")
            print(f"에러 메시지: {str(e)}")
            import traceback
            print(traceback.format_exc())
        
        # API 부하 방지를 위해 대기
        if idx < len(test_cases):
            print("\n⏳ 2초 대기...")
            await asyncio.sleep(2)
    
    print("\n" + "="*60)
    print("테스트 완료")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(test_naver_graphql_api())
