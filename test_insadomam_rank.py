"""
인사도담 순위 조회 테스트
키워드: 안국역맛집
"""
import httpx
import json
import asyncio

async def test_insadomam_rank():
    """인사도담의 안국역맛집 순위 확인"""
    
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
    
    keyword = "안국역맛집"
    target_place_id = "1012350598"  # 인사도담
    
    print(f"\n{'='*60}")
    print(f"🔍 순위 조회 테스트")
    print(f"{'='*60}")
    print(f"키워드: {keyword}")
    print(f"매장: 인사도담")
    print(f"Place ID: {target_place_id}")
    print(f"{'='*60}\n")
    
    all_stores = []
    found = False
    rank = None
    
    # 300개까지 조회 (100개씩 3번)
    for page in range(3):
        start_idx = page * 100 + 1
        
        print(f"📄 페이지 {page + 1} 조회 중... (start={start_idx})")
        
        variables = {
            "input": {
                "query": keyword,
                "start": start_idx,
                "display": 100,
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
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    api_url,
                    json=payload,
                    headers=headers,
                    follow_redirects=True
                )
                
                if response.status_code != 200:
                    print(f"❌ HTTP 에러: {response.status_code}")
                    break
                
                data = response.json()
                places_data = data.get("data", {}).get("places", {})
                total = places_data.get("total", 0)
                items = places_data.get("items", [])
                
                print(f"   ✅ {len(items)}개 매장 조회됨 (전체: {total}개)")
                
                if not items:
                    print(f"   ⚠️  더 이상 결과 없음")
                    break
                
                all_stores.extend(items)
                
                # 인사도담 찾기
                for idx, store in enumerate(items, start=1):
                    if str(store.get("id")) == target_place_id:
                        rank = start_idx + idx - 1
                        found = True
                        print(f"\n🎯 발견!")
                        print(f"   순위: {rank}위")
                        print(f"   매장명: {store.get('name')}")
                        print(f"   카테고리: {store.get('category')}")
                        print(f"   주소: {store.get('address')}")
                        print(f"   방문자 리뷰: {store.get('visitorReviewCount')}")
                        print(f"   블로그 리뷰: {store.get('blogCafeReviewCount')}")
                        break
                
                if found:
                    break
                
                # API 부하 방지
                await asyncio.sleep(1)
                
        except Exception as e:
            print(f"❌ 에러 발생: {type(e).__name__}")
            print(f"   {str(e)}")
            import traceback
            print(traceback.format_exc())
            break
    
    print(f"\n{'='*60}")
    print(f"📊 최종 결과")
    print(f"{'='*60}")
    print(f"조회된 총 매장 수: {len(all_stores)}개")
    
    if found:
        print(f"✅ 인사도담 순위: {rank}위")
    else:
        print(f"❌ 인사도담을 300위 안에서 찾지 못했습니다")
        print(f"   (300위 밖이거나 매장 정보가 일치하지 않음)")
    
    print(f"{'='*60}\n")

if __name__ == "__main__":
    asyncio.run(test_insadomam_rank())
