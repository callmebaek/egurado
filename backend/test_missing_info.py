"""missingInfo 상세 확인"""
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
                print("MissingInfo")
                print("="*80)
                
                missing_info = place_data.get('missingInfo', {})
                print(json.dumps(missing_info, indent=2, ensure_ascii=False))
                
                print("\n="*80)
                print("ReviewSettings")
                print("="*80)
                
                review_settings = place_data.get('reviewSettings', {})
                print(json.dumps(review_settings, indent=2, ensure_ascii=False))
                
                print("\n="*80)
                print("기타 플래그들")
                print("="*80)
                print(f"isGoodStore: {place_data.get('isGoodStore')}")
                print(f"hideBusinessHours: {place_data.get('hideBusinessHours')}")
                print(f"hidePrice: {place_data.get('hidePrice')}")
                print(f"hasMobilePhoneNumber: {place_data.get('hasMobilePhoneNumber')}")

asyncio.run(check())
