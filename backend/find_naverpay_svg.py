"""네이버페이 SVG 찾기"""
from bs4 import BeautifulSoup

def find_svg(filename, store_name):
    print(f"\n{'='*80}")
    print(f"{store_name}")
    print(f"{'='*80}\n")
    
    with open(filename, 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # 모든 SVG 찾기
    svgs = soup.find_all('svg')
    print(f"총 SVG 개수: {len(svgs)}")
    
    # 네이버페이 관련 SVG
    for i, svg in enumerate(svgs, 1):
        svg_str = str(svg).lower()
        svg_parent_str = str(svg.parent).lower() if svg.parent else ""
        
        if '네이버' in str(svg) or 'npay' in svg_str or 'naver' in svg_str and 'pay' in svg_str:
            print(f"\n[SVG #{i}] 네이버페이 관련!")
            
            # SVG 속성
            print(f"SVG 속성:")
            for attr, value in svg.attrs.items():
                print(f"  {attr}: {value}")
            
            # 부모 요소
            if svg.parent:
                print(f"\n부모 요소: <{svg.parent.name}>")
                print(f"부모 클래스: {svg.parent.get('class')}")
                print(f"부모 ID: {svg.parent.get('id')}")
                
                # 부모의 텍스트 내용
                parent_text = svg.parent.get_text(strip=True)
                if parent_text:
                    print(f"부모 텍스트: {parent_text[:100]}")
            
            # SVG 주변 HTML (200자)
            svg_idx = html.find(str(svg)[:50])
            if svg_idx >= 0:
                start = max(0, svg_idx - 200)
                end = min(len(html), svg_idx + 400)
                context = html[start:end]
                
                print(f"\nSVG 주변 HTML:")
                print("-" * 80)
                print(context)
                print("-" * 80)


if __name__ == "__main__":
    find_svg("compare_2034139969_with_naverpay.html", "유제사진관 (네이버페이 O)")
    find_svg("compare_2072848563_with_naverpay.html", "아나나사진관 (네이버페이 O)")
    find_svg("compare_1012350598_without_naverpay.html", "인사도담 (네이버페이 X)")
