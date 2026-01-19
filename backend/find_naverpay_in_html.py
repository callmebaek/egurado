"""HTML에서 네이버페이가 표시되는 정확한 위치와 구조 찾기"""
from bs4 import BeautifulSoup
import re

def find_naverpay_pattern(filename):
    print(f"\n{'='*80}")
    print(f"파일: {filename}")
    print(f"{'='*80}\n")
    
    with open(filename, 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # 1. "네이버페이"가 포함된 모든 요소 찾기
    print("=== 1. '네이버페이' 텍스트가 포함된 요소 ===")
    
    # 모든 태그에서 "네이버페이" 텍스트 찾기
    all_tags = soup.find_all(string=re.compile('네이버페이'))
    print(f"총 {len(all_tags)}개의 텍스트 노드 발견")
    
    for i, tag in enumerate(all_tags, 1):
        print(f"\n[{i}] 텍스트: '{tag.strip()}'")
        
        # 부모 태그 정보
        parent = tag.parent
        if parent:
            print(f"    부모 태그: <{parent.name}>")
            if parent.get('class'):
                print(f"    부모 클래스: {parent.get('class')}")
            if parent.get('id'):
                print(f"    부모 ID: {parent.get('id')}")
            
            # 조부모 태그 정보
            grandparent = parent.parent
            if grandparent:
                print(f"    조부모 태그: <{grandparent.name}>")
                if grandparent.get('class'):
                    print(f"    조부모 클래스: {grandparent.get('class')}")
            
            # 주변 HTML 구조
            print(f"    부모 HTML (일부):")
            parent_str = str(parent)[:200]
            print(f"    {parent_str}...")
    
    # 2. "간편결제" 주변 HTML 구조
    print(f"\n\n=== 2. '간편결제' 주변 HTML 구조 ===")
    simple_pay_tags = soup.find_all(string=re.compile('간편결제'))
    print(f"총 {len(simple_pay_tags)}개 발견")
    
    for i, tag in enumerate(simple_pay_tags, 1):
        print(f"\n[{i}] 텍스트: '{tag.strip()}'")
        parent = tag.parent
        if parent:
            print(f"    부모: <{parent.name}> class={parent.get('class')}")
            
            # 주변 HTML
            print(f"    주변 HTML:")
            # 부모의 전체 텍스트
            full_text = parent.get_text(strip=True)
            print(f"    '{full_text}'")
            
            # 부모의 형제 요소들
            siblings = list(parent.find_next_siblings(limit=3))
            if siblings:
                print(f"    다음 형제 요소들:")
                for sib in siblings:
                    if hasattr(sib, 'get_text'):
                        sib_text = sib.get_text(strip=True)[:50]
                        print(f"      - {sib_text}")
    
    # 3. 이미지 alt 태그에서 네이버페이 찾기
    print(f"\n\n=== 3. 이미지 alt/title에서 네이버페이 ===")
    images = soup.find_all('img')
    for img in images:
        alt = img.get('alt', '')
        title = img.get('title', '')
        src = img.get('src', '')
        
        if '네이버' in alt or '네이버' in title or 'naver' in src.lower() or 'pay' in src.lower():
            print(f"\n이미지 발견:")
            print(f"  alt: {alt}")
            print(f"  title: {title}")
            print(f"  src: {src[:100]}")
    
    # 4. 아이콘 클래스 찾기
    print(f"\n\n=== 4. 네이버페이 아이콘 클래스 ===")
    # 네이버페이 아이콘은 보통 특정 클래스나 SVG로 표시됨
    icon_elements = soup.find_all(class_=re.compile('icon|pay|naver', re.I))
    naverpay_icons = []
    for elem in icon_elements:
        text = elem.get_text(strip=True)
        if '네이버' in text or 'NAVER' in text:
            naverpay_icons.append(elem)
    
    print(f"총 {len(naverpay_icons)}개 발견")
    for i, icon in enumerate(naverpay_icons[:5], 1):
        print(f"\n[{i}] {icon.name} class={icon.get('class')}")
        print(f"    텍스트: {icon.get_text(strip=True)[:100]}")


if __name__ == "__main__":
    find_naverpay_pattern("debug_naverpay_2034139969.html")
    print("\n\n" + "="*100 + "\n\n")
    find_naverpay_pattern("debug_naverpay_2072848563.html")
