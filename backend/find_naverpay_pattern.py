"""네이버페이 O/X 매장의 HTML 구조 차이 찾기"""
from bs4 import BeautifulSoup
import re

def analyze_place_html(filename, place_id, store_name, has_naverpay):
    """특정 매장의 HTML 구조 분석"""
    with open(filename, 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    
    print(f"\n{'='*80}")
    print(f"{store_name} (place_id: {place_id}) - 네이버페이: {'O' if has_naverpay else 'X'}")
    print(f"{'='*80}\n")
    
    # 1. 이 place_id를 포함하는 모든 링크 찾기
    place_links = soup.find_all('a', href=re.compile(f'/place/{place_id}/'))
    
    if not place_links:
        print(f"[경고] place_id {place_id}를 찾을 수 없음")
        return
    
    print(f"링크 발견: {len(place_links)}개")
    
    # 첫 번째 링크의 부모 구조 확인
    first_link = place_links[0]
    
    # 매장 아이템 컨테이너 찾기 (상위로 올라가면서)
    container = first_link
    for _ in range(10):
        container = container.parent
        if container is None:
            break
        
        # 일반적으로 매장 아이템은 특정 클래스를 가진 div
        classes = container.get('class', [])
        if any('item' in str(c).lower() for c in classes):
            print(f"\n매장 컨테이너 발견: {container.name} class={classes}")
            break
    
    if container:
        # 컨테이너 내부에서 네이버페이 아이콘 찾기
        npay_icon = container.find('i', class_='_ico_npay_sis14_154')
        
        if npay_icon:
            print(f"[O] 컨테이너 내부에 네이버페이 아이콘 있음")
        else:
            print(f"[X] 컨테이너 내부에 네이버페이 아이콘 없음")
        
        # 컨테이너의 전체 HTML 구조 (일부)
        container_html = str(container)[:1000]
        
        # 네이버페이 관련 부분만 추출
        if '네이버페이' in container_html or 'npay' in container_html.lower():
            print(f"\n컨테이너에 네이버페이 관련 내용 있음:")
            
            # npay 관련 라인만 추출
            lines = container_html.split('>')
            for line in lines:
                if 'npay' in line.lower() or '네이버페이' in line:
                    print(f"  {line[:150]}")
        
        # 컨테이너의 모든 하위 i 태그 확인
        all_i_tags = container.find_all('i')
        print(f"\n컨테이너 내 <i> 태그: {len(all_i_tags)}개")
        
        for i_tag in all_i_tags:
            classes = i_tag.get('class', [])
            text = i_tag.get_text(strip=True)
            if 'npay' in str(classes).lower() or '네이버' in text:
                print(f"  - class={classes}, text='{text}'")


def main():
    filename = "search_results_성수사진관.html"
    
    # 네이버페이 O
    print("\n" + "="*100)
    print("네이버페이 사용 매장들 (O)")
    print("="*100)
    
    analyze_place_html(filename, "1865686697", "오디티모드 성수점", True)
    analyze_place_html(filename, "2034139969", "유제사진관", True)
    analyze_place_html(filename, "1694261183", "시현하다 성수 플래그쉽", True)
    analyze_place_html(filename, "1255387620", "포토그래피 셀프사진관", True)
    
    # 네이버페이 X
    print("\n\n" + "="*100)
    print("네이버페이 미사용 매장들 (X)")
    print("="*100)
    
    analyze_place_html(filename, "1006272014", "LES601성수", False)
    analyze_place_html(filename, "2072848563", "아나나사진관 성수스튜디오", False)


if __name__ == "__main__":
    main()
