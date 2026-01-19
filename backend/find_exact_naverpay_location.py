"""네이버페이 아이콘이 정확히 어디에 있는지 찾기"""
from bs4 import BeautifulSoup
import re

def find_naverpay_context(filename, place_id, store_name, has_naverpay):
    """place_id와 네이버페이 아이콘의 위치 관계 파악"""
    with open(filename, 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    
    print(f"\n{'='*80}")
    print(f"{store_name} (place_id: {place_id})")
    print(f"실제 네이버페이: {'O' if has_naverpay else 'X'}")
    print(f"{'='*80}\n")
    
    # 1. HTML에서 place_id가 처음 나타나는 위치 찾기
    place_id_pattern = f'/place/{place_id}/'
    idx = html.find(place_id_pattern)
    
    if idx == -1:
        print(f"[경고] place_id를 찾을 수 없음")
        return
    
    # 2. place_id 주변 1000자 추출
    start = max(0, idx - 500)
    end = min(len(html), idx + 1500)
    context = html[start:end]
    
    # 3. 이 주변에 네이버페이 관련 내용이 있는지 확인
    has_npay_in_context = 'npay' in context.lower() or '네이버페이' in context
    
    print(f"place_id 주변 {len(context)}자에서 네이버페이: {'있음' if has_npay_in_context else '없음'}")
    
    if has_npay_in_context:
        # 네이버페이가 나타나는 위치
        npay_idx_in_context = context.lower().find('npay')
        if npay_idx_in_context == -1:
            npay_idx_in_context = context.find('네이버페이')
        
        print(f"place_id로부터 거리: {npay_idx_in_context - (idx - start)}자")
        
        # 네이버페이 주변 HTML (200자)
        npay_start = max(0, npay_idx_in_context - 100)
        npay_end = min(len(context), npay_idx_in_context + 200)
        npay_context = context[npay_start:npay_end]
        
        print(f"\n네이버페이 주변 HTML:")
        print("-" * 80)
        print(npay_context)
        print("-" * 80)
    else:
        # 네이버페이가 없으면 컨텍스트 일부 출력
        print(f"\n주변 HTML (네이버페이 없음):")
        print("-" * 80)
        print(context[400:800])  # 중간 부분
        print("-" * 80)
    
    print(f"\n일치 여부: {'O' if has_npay_in_context == has_naverpay else 'X'}")


def main():
    filename = "search_results_성수사진관.html"
    
    print("\n" + "="*100)
    print("네이버페이 O 매장")
    print("="*100)
    
    find_naverpay_context(filename, "1865686697", "오디티모드 성수점", True)
    find_naverpay_context(filename, "2034139969", "유제사진관", True)
    
    print("\n\n" + "="*100)
    print("네이버페이 X 매장")
    print("="*100)
    
    find_naverpay_context(filename, "1006272014", "LES601성수", False)
    find_naverpay_context(filename, "2072848563", "아나나사진관 성수스튜디오", False)


if __name__ == "__main__":
    main()
