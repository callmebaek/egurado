"""새로운 GraphQL 쿼리들 테스트"""
import asyncio
import httpx
import json

async def test_queries():
    place_id = "37942234"
    api_url = "https://api.place.naver.com/graphql"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Origin": "https://m.place.naver.com",
        "Referer": f"https://m.place.naver.com/restaurant/{place_id}/home",
    }
    
    queries = [
        # 1. AI 브리핑 (요약 정보)
        {
            "name": "getAiBriefing",
            "query": {
                "operationName": "getAiBriefing",
                "variables": {
                    "input": {
                        "businessId": place_id
                    }
                },
                "query": """
                query getAiBriefing($input: AiBriefingInput) {
                  aiBriefing(input: $input) {
                    textSummaries {
                      sentence
                      relatedReviews {
                        userName
                        snippet
                      }
                    }
                    imageSummaries {
                      code
                      caption
                      imageUrl
                    }
                    relatedQueries {
                      category
                      query
                    }
                  }
                }
                """
            }
        },
        
        # 2. 라이브커머스
        {
            "name": "getLiveCommerceBroadcasts",
            "query": {
                "operationName": "getLiveCommerceBroadcasts",
                "variables": {
                    "businessId": place_id,
                    "readyStatus": "NONE,STANDBY",
                    "onairStatus": "ONAIR",
                    "size": 1
                },
                "query": """
                query getLiveCommerceBroadcasts($businessId: String, $readyStatus: String, $onairStatus: String, $size: Int) {
                  readyLiveCommerceBroadcasts: liveCommerceBroadcasts(
                    input: {businessId: $businessId, statuses: $readyStatus, size: $size}
                  ) {
                    broadcastId
                    title
                    status
                  }
                  onAirLiveCommerceBroadcasts: liveCommerceBroadcasts(
                    input: {businessId: $businessId, statuses: $onairStatus, size: $size}
                  ) {
                    broadcastId
                    title
                    status
                  }
                }
                """
            }
        },
    ]
    
    async with httpx.AsyncClient(timeout=30) as client:
        for query_info in queries:
            print(f"\n{'='*80}")
            print(f"Testing: {query_info['name']}")
            print(f"{'='*80}")
            
            try:
                response = await client.post(
                    api_url,
                    json=query_info['query'],
                    headers=headers
                )
                
                print(f"Status: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if "errors" in data:
                        print("[ERROR]")
                        for error in data["errors"]:
                            print(f"  - {error.get('message')[:100]}")
                    else:
                        print("[SUCCESS]")
                        
                        # 데이터 요약
                        result_data = data.get("data", {})
                        
                        if query_info['name'] == "getAiBriefing":
                            briefing = result_data.get("aiBriefing", {})
                            text_summaries = briefing.get("textSummaries", [])
                            image_summaries = briefing.get("imageSummaries", [])
                            related_queries = briefing.get("relatedQueries", [])
                            
                            print(f"\n[AI 브리핑 요약]")
                            print(f"  텍스트 요약: {len(text_summaries)}개")
                            if text_summaries:
                                for i, summary in enumerate(text_summaries[:3], 1):
                                    print(f"    {i}. {summary.get('sentence')[:80]}")
                            
                            print(f"  이미지 요약: {len(image_summaries)}개")
                            if image_summaries:
                                for i, img in enumerate(image_summaries[:3], 1):
                                    print(f"    {i}. {img.get('caption')} ({img.get('code')})")
                            
                            print(f"  연관 검색어: {len(related_queries)}개")
                            if related_queries:
                                for i, q in enumerate(related_queries[:5], 1):
                                    print(f"    {i}. {q.get('query')}")
                        
                        elif query_info['name'] == "getLiveCommerceBroadcasts":
                            ready = result_data.get("readyLiveCommerceBroadcasts", [])
                            onair = result_data.get("onAirLiveCommerceBroadcasts", [])
                            
                            print(f"\n[라이브커머스]")
                            print(f"  준비중: {len(ready) if ready else 0}개")
                            print(f"  방송중: {len(onair) if onair else 0}개")
                        
                        # 전체 JSON 출력 (처음 800자)
                        print(f"\n[전체 응답]")
                        print(json.dumps(data, indent=2, ensure_ascii=False)[:800])
                else:
                    print(f"[ERROR] HTTP {response.status_code}")
                    print(response.text[:200])
                    
            except Exception as e:
                print(f"[EXCEPTION] {type(e).__name__}: {str(e)}")
            
            await asyncio.sleep(0.5)

if __name__ == "__main__":
    asyncio.run(test_queries())
