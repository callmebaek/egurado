"""네이버페이 사용 여부를 확실히 구분하기 위한 비교"""
import asyncio
import httpx
from bs4 import BeautifulSoup

async def analyze_store(place_id: str, store_name: str, has_naverpay: bool):
    """매장 HTML 분석"""
    url = f"https://m.place.naver.com/place/{place_id}/home"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(url, headers=headers)
        html = response.text
        
        soup = BeautifulSoup(html, 'html.parser')
        
        print(f"\n{'='*80}")
        print(f"매장: {store_name} (네이버페이: {'O' if has_naverpay else 'X'})")
        print(f"{'='*80}\n")
        
        # 1. "네이버페이" 텍스트 출현 횟수
        naverpay_count = html.count('네이버페이')
        print(f"'네이버페이' 출현: {naverpay_count}번")
        
        # 2. 간편결제 확인
        simple_pay_count = html.count('간편결제')
        print(f"'간편결제' 출현: {simple_pay_count}번")
        
        # 3. <span class="place_blind">네이버페이</span> 형태
        place_blind_spans = soup.find_all('span', class_='place_blind')
        naverpay_in_blind = sum(1 for span in place_blind_spans if '네이버페이' in span.get_text())
        print(f"<span class='place_blind'>네이버페이</span>: {naverpay_in_blind}개")
        
        # 4. 이미지에서 네이버페이 아이콘
        images = soup.find_all('img')
        naverpay_images = []
        for img in images:
            alt = img.get('alt', '')
            src = img.get('src', '')
            if '네이버' in alt and '페이' in alt:
                naverpay_images.append(src)
            elif 'npay' in src.lower() or ('naver' in src.lower() and 'pay' in src.lower()):
                naverpay_images.append(src)
        
        print(f"네이버페이 관련 이미지: {len(naverpay_images)}개")
        if naverpay_images:
            for i, src in enumerate(naverpay_images[:3], 1):
                print(f"  [{i}] {src[:80]}...")
        
        # 5. SVG 아이콘
        svgs = soup.find_all('svg')
        naverpay_svgs = []
        for svg in svgs:
            if '네이버' in str(svg) or 'npay' in str(svg).lower():
                naverpay_svgs.append(svg)
        print(f"네이버페이 관련 SVG: {len(naverpay_svgs)}개")
        
        # 6. 특정 클래스나 ID
        naverpay_elements = soup.find_all(class_=lambda x: x and ('npay' in str(x).lower() or 'naverpay' in str(x).lower()))
        print(f"네이버페이 관련 클래스: {len(naverpay_elements)}개")
        if naverpay_elements:
            for i, elem in enumerate(naverpay_elements[:3], 1):
                print(f"  [{i}] {elem.name} class={elem.get('class')}")
        
        # 7. HTML 전체를 파일로 저장
        output_file = f"compare_{place_id}_{'with' if has_naverpay else 'without'}_naverpay.html"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"\nHTML 저장: {output_file}")


async def main():
    """비교 분석"""
    # 실제로 네이버페이를 사용한다고 알려진 매장들
    print("\n" + "="*100)
    print("네이버페이 사용 매장 분석")
    print("="*100)
    
    await analyze_store("2034139969", "유제사진관", True)
    await analyze_store("2072848563", "아나나사진관 성수스튜디오", True)
    
    # 확실히 네이버페이를 사용하지 않는 매장 (예: 작은 동네 식당)
    # 인사도담을 분석해볼까요?
    print("\n\n" + "="*100)
    print("네이버페이 미사용 매장 분석 (비교용)")
    print("="*100)
    
    # 인사도담 (음식점, place_id는 이전에 사용한 것)
    await analyze_store("1012350598", "인사도담", False)


if __name__ == "__main__":
    asyncio.run(main())
