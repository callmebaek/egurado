"""검색 API에서 네이버페이 정보 확인"""
import asyncio
import httpx
import json

async def test_search_with_all_fields(query: str):
    """모든 가능한 필드를 요청하여 네이버페이 정보 찾기"""
    
    api_url = "https://api.place.naver.com/graphql"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Origin": "https://m.place.naver.com",
        "Referer": "https://m.place.naver.com/",
    }
    
    # 현재 작동하는 기본 필드
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
                bookingUrl
                bookingReviewCount
                virtualPhone
                distance
                imageCount
                hasBooking
            }
        }
    }
    """
    
    variables = {
        "input": {
            "query": query,
            "start": 1,
            "display": 20,
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
    
    print(f"\n{'='*80}")
    print(f"검색 쿼리: {query}")
    print(f"{'='*80}\n")
    
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                api_url,
                json=payload,
                headers=headers
            )
            
            print(f"응답 상태: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # errors 확인
                if "errors" in data:
                    print(f"\n[GraphQL 오류]")
                    for error in data["errors"]:
                        print(f"  - {error.get('message')}")
                        if 'path' in error:
                            print(f"    경로: {error['path']}")
                
                # 결과 확인
                items = data.get("data", {}).get("places", {}).get("items", [])
                print(f"\n검색 결과: {len(items)}개\n")
                
                if items:
                    # 첫 번째 매장 상세 정보
                    first_store = items[0]
                    print(f"=== 첫 번째 매장: {first_store.get('name')} ===\n")
                    
                    # 모든 필드 출력
                    for key, value in sorted(first_store.items()):
                        if value is not None:
                            value_str = str(value)[:100]
                            print(f"  {key}: {value_str}")
                    
                    # 네이버페이 관련 필드만 추출
                    print(f"\n=== 네이버페이 관련 필드 ===")
                    naverpay_keys = [k for k in first_store.keys() 
                                    if 'pay' in k.lower() or 'naver' in k.lower() or 'npay' in k.lower()]
                    
                    if naverpay_keys:
                        for key in naverpay_keys:
                            print(f"  {key}: {first_store[key]}")
                    else:
                        print("  (없음)")
                    
                    # 전체 응답을 파일로 저장
                    with open(f"search_api_response_{query.replace(' ', '_')}.json", 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
                    print(f"\n전체 응답 저장: search_api_response_{query.replace(' ', '_')}.json")
                    
            else:
                print(f"오류: {response.text[:500]}")
                
    except Exception as e:
        print(f"예외 발생: {e}")
        import traceback
        traceback.print_exc()


async def main():
    # 네이버페이를 사용하는 매장이 많을 것 같은 검색어
    await test_search_with_all_fields("성수사진관")
    
    print("\n\n" + "="*100 + "\n\n")
    
    await test_search_with_all_fields("인사동맛집")


if __name__ == "__main__":
    asyncio.run(main())
