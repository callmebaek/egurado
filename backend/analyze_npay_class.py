"""npay 관련 클래스 분석"""
from bs4 import BeautifulSoup

def analyze(filename, query_name):
    print(f"\n{'='*80}")
    print(f"{query_name}")
    print(f"{'='*80}\n")
    
    with open(filename, 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # npay 관련 클래스/ID 찾기
    npay_elements = soup.find_all(class_=lambda x: x and ('npay' in str(x).lower() or 'naverpay' in str(x).lower()))
    
    print(f"npay 관련 요소: {len(npay_elements)}개\n")
    
    for i, elem in enumerate(npay_elements[:5], 1):
        print(f"[{i}] {elem.name} class={elem.get('class')}")
        
        # 텍스트 내용
        text = elem.get_text(strip=True)
        if text:
            print(f"    텍스트: {text[:100]}")
        
        # 부모 요소
        parent = elem.parent
        if parent:
            print(f"    부모: <{parent.name}> class={parent.get('class')}")
            
            # 부모의 data 속성들
            data_attrs = {k: v for k, v in parent.attrs.items() if k.startswith('data-')}
            if data_attrs:
                print(f"    부모 data 속성:")
                for key, value in list(data_attrs.items())[:5]:
                    value_str = str(value)[:80]
                    print(f"      {key}: {value_str}")
        
        # 주변 HTML (200자)
        elem_str = str(elem)
        idx = html.find(elem_str[:50])
        if idx >= 0:
            start = max(0, idx - 150)
            end = min(len(html), idx + 300)
            context = html[start:end]
            
            print(f"    주변 HTML:")
            print(f"    {context[:250]}...")
        
        print()
    
    # data-id 속성이 있는 매장 리스트 찾기
    print(f"\n=== data-id 속성이 있는 요소 (매장 리스트) ===\n")
    data_id_elements = soup.find_all(attrs={'data-id': True})
    print(f"총 {len(data_id_elements)}개\n")
    
    for i, elem in enumerate(data_id_elements[:3], 1):
        place_id = elem.get('data-id')
        print(f"[{i}] place_id: {place_id}")
        print(f"    태그: <{elem.name}> class={elem.get('class')}")
        
        # 이 요소 안에 npay 관련 요소가 있는지 확인
        npay_in_elem = elem.find_all(class_=lambda x: x and 'npay' in str(x).lower())
        print(f"    내부 npay 요소: {len(npay_in_elem)}개")
        
        if npay_in_elem:
            for npay_elem in npay_in_elem:
                print(f"      - {npay_elem.name} class={npay_elem.get('class')}")
                if npay_elem.get_text(strip=True):
                    print(f"        텍스트: {npay_elem.get_text(strip=True)[:50]}")
        
        print()


if __name__ == "__main__":
    analyze("search_results_성수사진관.html", "성수사진관")
    print("\n\n" + "="*100 + "\n\n")
    analyze("search_results_인사동맛집.html", "인사동맛집")
