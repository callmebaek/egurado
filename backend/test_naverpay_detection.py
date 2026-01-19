"""네이버페이 감지 테스트"""
import asyncio
import httpx
from bs4 import BeautifulSoup

async def test_naverpay_detection(place_id: str, store_name: str):
    """특정 매장의 네이버페이 HTML 구조 확인"""
    url = f"https://m.place.naver.com/place/{place_id}/home"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(url, headers=headers)
        html = response.text
        
        print(f"\n{'='*80}")
        print(f"매장: {store_name} (place_id: {place_id})")
        print(f"{'='*80}\n")
        
        # BeautifulSoup으로 파싱
        soup = BeautifulSoup(html, 'html.parser')
        
        # 1. place_blind 클래스 찾기
        print("=== 1. <span class='place_blind'>네이버페이</span> 찾기 ===")
        place_blind_spans = soup.find_all('span', class_='place_blind')
        print(f"총 {len(place_blind_spans)}개의 place_blind span 발견")
        
        for i, span in enumerate(place_blind_spans[:20]):  # 처음 20개만
            text = span.get_text(strip=True)
            if text:
                print(f"  [{i+1}] {text}")
                if '네이버' in text or 'naver' in text.lower() or '페이' in text:
                    print(f"      ^^^ 네이버페이 관련!")
        
        # 2. "네이버페이" 텍스트가 포함된 모든 요소 찾기
        print(f"\n=== 2. '네이버페이' 텍스트 검색 ===")
        naverpay_count = html.count('네이버페이')
        print(f"HTML에서 '네이버페이' 출현 횟수: {naverpay_count}번")
        
        # 3. 결제 관련 섹션 찾기
        print(f"\n=== 3. 결제 관련 섹션 찾기 ===")
        
        # 일반적인 결제 관련 클래스들
        payment_classes = ['payment', 'pay', 'paymentInfo', 'PaymentInfo', 'payment-info']
        
        for cls in payment_classes:
            elements = soup.find_all(class_=lambda x: x and cls in x)
            if elements:
                print(f"\n클래스에 '{cls}' 포함된 요소 {len(elements)}개:")
                for elem in elements[:5]:
                    print(f"  - {elem.name} class='{elem.get('class')}'")
                    text = elem.get_text(strip=True)[:100]
                    if text:
                        print(f"    내용: {text}")
        
        # 4. "네이버페이" 주변 HTML 구조 보기
        print(f"\n=== 4. '네이버페이' 주변 HTML 구조 ===")
        if '네이버페이' in html:
            # 네이버페이가 처음 나타나는 위치 찾기
            idx = html.find('네이버페이')
            context_start = max(0, idx - 300)
            context_end = min(len(html), idx + 300)
            context = html[context_start:context_end]
            
            print("주변 HTML (앞뒤 300자):")
            print("-" * 80)
            print(context)
            print("-" * 80)
        
        # 5. 전체 HTML을 파일로 저장
        output_file = f"debug_naverpay_{place_id}.html"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"\n전체 HTML 저장: {output_file}")


async def main():
    """테스트 실행"""
    # 아나나사진관 성수스튜디오 (place_id: 2072848563)
    # 네이버페이를 사용한다고 알려진 매장
    await test_naverpay_detection("2072848563", "아나나사진관 성수스튜디오")
    
    print("\n\n" + "="*100 + "\n\n")
    
    # 다른 매장도 테스트 (유제사진관, place_id: 2034139969)
    await test_naverpay_detection("2034139969", "유제사진관")


if __name__ == "__main__":
    asyncio.run(main())
