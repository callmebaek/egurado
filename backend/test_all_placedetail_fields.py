"""PlaceDetailBase 전체 필드 출력"""
import asyncio
import httpx
import re
import json

async def check():
    place_id = "37942234"
    url = f"https://m.place.naver.com/restaurant/{place_id}/home"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
    }
    
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        response = await client.get(url, headers=headers)
        html = response.text
        
        pattern = r'window\.__APOLLO_STATE__\s*=\s*({.+?});(?:\s|</script>)'
        match = re.search(pattern, html, re.DOTALL)
        
        if match:
            apollo_state = json.loads(match.group(1))
            place_key = f"PlaceDetailBase:{place_id}"
            
            if place_key in apollo_state:
                place_data = apollo_state[place_key]
                
                print("="*80)
                print("PlaceDetailBase 전체 필드")
                print("="*80)
                
                for key, value in sorted(place_data.items()):
                    val_str = str(value)
                    if len(val_str) > 80:
                        val_str = val_str[:80] + "..."
                    print(f"{key}: {val_str}")

asyncio.run(check())
