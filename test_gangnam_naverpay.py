"""강남역사진관 네이버페이 체크 분석"""
import asyncio
import httpx
import re

async def analyze_gangnam():
    store_name = "강남역사진관"
    search_url = f"https://m.map.naver.com/search2/search.naver?query={store_name}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        'Accept': 'text/html',
    }
    
    print(f"\n{'='*80}")
    print(f"강남역사진관 네이버페이 분석")
    print(f"{'='*80}\n")
    
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(search_url, headers=headers, follow_redirects=True)
        html = response.text
    
    print(f"HTML 길이: {len(html):,}자\n")
    
    # Find all place IDs in search results
    place_id_pattern = r'"id":(\d{10,})'
    place_ids = re.findall(place_id_pattern, html)
    
    print(f"검색 결과에서 발견된 매장: {len(place_ids)}개\n")
    
    # For each place_id, extract info
    seen_ids = set()
    results = []
    
    for place_id in place_ids:
        if place_id in seen_ids:
            continue
        seen_ids.add(place_id)
        
        # Find JSON object with this place_id
        pattern = f'"id":{place_id}'
        idx = html.find(pattern)
        
        if idx != -1:
            # Get next 1500 chars (JSON object)
            context = html[idx:min(len(html), idx + 1500)]
            
            # Extract name
            name_match = re.search(r'"name":"([^"]+)"', context)
            name = name_match.group(1) if name_match else "Unknown"
            
            # Check hasNPay in this specific object
            has_npay_true = '"hasNPay":true' in context
            has_npay_false = '"hasNPay":false' in context
            
            # Determine hasNPay status
            if has_npay_true:
                npay_status = "✅ true"
            elif has_npay_false:
                npay_status = "❌ false"
            else:
                npay_status = "❓ undefined"
            
            results.append({
                'id': place_id,
                'name': name,
                'hasNPay': npay_status
            })
    
    # Print results
    print("검색 결과 매장 목록:")
    print("-" * 80)
    for i, result in enumerate(results[:15], 1):
        print(f"{i:2d}. place_id: {result['id']}")
        print(f"    이름: {result['name']}")
        print(f"    hasNPay: {result['hasNPay']}")
        print()
    
    # Find "강남역사진관" specifically
    print("\n" + "="*80)
    print("'강남역사진관' 포함 매장 필터링:")
    print("="*80 + "\n")
    
    gangnam_stores = [r for r in results if '강남역사진관' in r['name'] or '강남' in r['name']]
    
    if gangnam_stores:
        for store in gangnam_stores:
            print(f"place_id: {store['id']}")
            print(f"이름: {store['name']}")
            print(f"hasNPay: {store['hasNPay']}")
            print()
    else:
        print("강남역사진관을 찾을 수 없습니다.")
    
    # Save HTML for manual inspection
    with open("gangnam_search.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("HTML 저장: gangnam_search.html")

if __name__ == "__main__":
    asyncio.run(analyze_gangnam())
