"""네이버페이 체크 테스트 스크립트"""
import asyncio
import httpx

async def test_naverpay_check():
    """합정티라미수로 네이버페이 체크 테스트"""
    
    place_id = "1132863024"
    store_name = "합정티라미수"
    
    print(f"\n{'='*80}")
    print(f"네이버페이 체크 테스트: {store_name} (place_id: {place_id})")
    print(f"{'='*80}\n")
    
    # 검색 URL
    search_url = f"https://m.map.naver.com/search2/search.naver?query={store_name}"
    
    print(f"검색 URL: {search_url}\n")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9",
    }
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(search_url, headers=headers, follow_redirects=True)
            response.raise_for_status()
            html = response.text
        
        print(f"응답 상태: {response.status_code}")
        print(f"HTML 길이: {len(html):,}자\n")
        
        # HTML 파일로 저장
        with open("hapjeong_search.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("HTML 저장: hapjeong_search.html\n")
        
        # place_id 확인
        if place_id in html:
            print(f"✅ place_id '{place_id}' 발견")
            place_id_idx = html.find(place_id)
            print(f"   위치: {place_id_idx}\n")
            
            # place_id 주변 4000자 추출
            start_idx = max(0, place_id_idx - 2000)
            end_idx = min(len(html), place_id_idx + 2000)
            context = html[start_idx:end_idx]
            
            # 네이버페이 패턴 확인
            naverpay_patterns = [
                '<span class="urQl1"><span class="place_blind">네이버페이</span>',
                'class="place_blind">네이버페이</span>',
                '<span class="place_blind">네이버페이</span><svg',
            ]
            
            print(f"검색 범위: {start_idx}~{end_idx} (총 {len(context)}자)")
            print("\n네이버페이 패턴 확인:")
            
            found_patterns = []
            for i, pattern in enumerate(naverpay_patterns, 1):
                if pattern in context:
                    found_patterns.append(pattern)
                    print(f"  ✅ 패턴 {i}: 발견")
                else:
                    print(f"  ❌ 패턴 {i}: 없음")
            
            # 네이버페이 텍스트 확인
            naverpay_count = context.count("네이버페이")
            print(f"\n'네이버페이' 텍스트 출현: {naverpay_count}회")
            
            # 결과
            print(f"\n{'='*80}")
            if found_patterns:
                print(f"✅ 네이버페이 사용 중 (매칭 패턴: {len(found_patterns)}개)")
            else:
                print(f"❌ 네이버페이 미사용 또는 패턴 불일치")
            print(f"{'='*80}\n")
            
            # 주변 HTML 일부 출력
            if naverpay_count > 0:
                npay_idx = context.find("네이버페이")
                sample_start = max(0, npay_idx - 200)
                sample_end = min(len(context), npay_idx + 300)
                print("\n네이버페이 주변 HTML 샘플:")
                print("-" * 80)
                print(context[sample_start:sample_end])
                print("-" * 80)
        else:
            print(f"❌ place_id '{place_id}' 없음 - 검색 결과에 매장이 없거나 ID가 틀림")
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_naverpay_check())
