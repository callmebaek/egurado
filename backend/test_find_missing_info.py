"""누락된 정보 찾기"""
import asyncio
import httpx
import re
import json

async def find_info():
    place_id = "37942234"
    url = f"https://m.place.naver.com/restaurant/{place_id}/home"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
    }
    
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        response = await client.get(url, headers=headers)
        html = response.text
        
        # APOLLO_STATE 추출
        pattern = r'window\.__APOLLO_STATE__\s*=\s*({.+?});(?:\s|</script>)'
        match = re.search(pattern, html, re.DOTALL)
        
        if match:
            apollo_state = json.loads(match.group(1))
            place_key = f"PlaceDetailBase:{place_id}"
            
            if place_key in apollo_state:
                place_data = apollo_state[place_key]
                
                print("="*80)
                print("찾고 있는 정보들")
                print("="*80)
                
                # 5. 영업시간/영업상태
                print("\n[영업시간 관련]")
                for key in ['businessHours', 'openingHours', 'businessStatus', 'hideBusinessHours']:
                    value = place_data.get(key)
                    if value is not None:
                        print(f"  {key}: {value}")
                
                # 6. 메뉴 전체
                menu_keys = [k for k in apollo_state.keys() if k.startswith(f'Menu:{place_id}_')]
                print(f"\n[메뉴] {len(menu_keys)}개")
                
                # 7. 플레이스 플러스
                print("\n[플레이스 플러스 관련]")
                for key in place_data.keys():
                    if 'plus' in key.lower() or 'premium' in key.lower() or 'claimed' in key.lower():
                        print(f"  {key}: {place_data.get(key)}")
                
                # 8. 업체소개글
                print("\n[소개글 관련]")
                for key in ['description', 'intro', 'introduction', 'about', 'detail']:
                    value = place_data.get(key)
                    if value is not None:
                        val_str = str(value)[:100]
                        print(f"  {key}: {val_str}")
                
                # ROOT_QUERY 확인
                root = apollo_state.get('ROOT_QUERY', {})
                print(f"\n[ROOT_QUERY에서 business 관련]")
                for key in root.keys():
                    if 'business' in key.lower():
                        data = root[key]
                        print(f"\n  Key: {key}")
                        if isinstance(data, dict):
                            print(f"    Type: {data.get('__typename')}")
                            # items가 있으면 확인
                            if 'items' in data:
                                items = data['items']
                                if items and len(items) > 0:
                                    first_item = items[0]
                                    if isinstance(first_item, dict) and '__ref' in first_item:
                                        ref_key = first_item['__ref']
                                        ref_data = apollo_state.get(ref_key, {})
                                        print(f"    Ref: {ref_key}")
                                        print(f"    Ref data keys: {list(ref_data.keys())[:10]}")

asyncio.run(find_info())
