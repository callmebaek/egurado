"""GraphQL로 업체소개글 찾기"""
import asyncio
import httpx
import json

async def test():
    place_id = "37942234"
    api_url = "https://api.place.naver.com/graphql"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    
    # 여러 필드를 시도
    query = {
        "operationName": "getPlacesList",
        "variables": {
            "input": {
                "query": "인사동마을보쌈",
                "start": 1,
                "display": 5,
                "deviceType": "mobile",
                "x": "127.0276",
                "y": "37.4979"
            }
        },
        "query": """
        query getPlacesList($input: PlacesInput) {
            places(input: $input) {
                items {
                    id
                    name
                    description
                    intro
                    introduction
                }
            }
        }
        """
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(api_url, json=query, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            
            if "errors" in data:
                print("Errors:")
                for error in data["errors"]:
                    print(f"  - {error.get('message')}")
            else:
                items = data.get("data", {}).get("places", {}).get("items", [])
                for item in items:
                    if str(item.get("id")) == place_id:
                        print("Found:")
                        print(json.dumps(item, indent=2, ensure_ascii=False))
        else:
            print(f"HTTP {response.status_code}")

asyncio.run(test())
