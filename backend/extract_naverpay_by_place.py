"""각 매장의 place_id와 네이버페이 여부 매칭"""
from bs4 import BeautifulSoup
import re

def extract_stores_with_naverpay(filename, query_name):
    print(f"\n{'='*80}")
    print(f"{query_name}")
    print(f"{'='*80}\n")
    
    with open(filename, 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # place_id 패턴으로 매장 찾기
    # URL 형식: /place/{place_id}/
    place_links = soup.find_all('a', href=re.compile(r'/place/\d+/'))
    
    print(f"매장 링크 발견: {len(place_links)}개\n")
    
    stores_info = {}
    
    for link in place_links:
        href = link.get('href', '')
        match = re.search(r'/place/(\d+)/', href)
        if match:
            place_id = match.group(1)
            
            if place_id not in stores_info:
                # 매장 이름 (링크 텍스트 또는 주변에서 찾기)
                store_name = link.get_text(strip=True)
                
                # 이 매장 주변에 네이버페이 아이콘이 있는지 확인
                # 부모 또는 조상 요소에서 네이버페이 아이콘 찾기
                parent = link.parent
                has_naverpay = False
                
                for _ in range(5):  # 최대 5단계 부모까지 확인
                    if parent is None:
                        break
                    
                    npay_icon = parent.find('i', class_='_ico_npay_sis14_154')
                    if npay_icon:
                        has_naverpay = True
                        break
                    
                    parent = parent.parent
                
                stores_info[place_id] = {
                    'name': store_name,
                    'has_naverpay': has_naverpay,
                    'place_id': place_id
                }
    
    # 결과 출력
    print(f"총 {len(stores_info)}개 고유 매장:\n")
    
    naverpay_stores = []
    non_naverpay_stores = []
    
    for place_id, info in stores_info.items():
        if info['has_naverpay']:
            naverpay_stores.append(info)
        else:
            non_naverpay_stores.append(info)
    
    print(f"=== 네이버페이 사용 매장: {len(naverpay_stores)}개 ===\n")
    for i, store in enumerate(naverpay_stores[:10], 1):
        print(f"[{i}] {store['name']} (place_id: {store['place_id']})")
    
    print(f"\n=== 네이버페이 미사용 매장: {len(non_naverpay_stores)}개 ===\n")
    for i, store in enumerate(non_naverpay_stores[:10], 1):
        print(f"[{i}] {store['name']} (place_id: {store['place_id']})")
    
    return stores_info


if __name__ == "__main__":
    stores1 = extract_stores_with_naverpay("search_results_성수사진관.html", "성수사진관")
    
    print("\n\n" + "="*100 + "\n\n")
    
    stores2 = extract_stores_with_naverpay("search_results_인사동맛집.html", "인사동맛집")
