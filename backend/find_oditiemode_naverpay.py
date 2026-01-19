"""오디티모드 성수점의 네이버페이 아이콘 찾기"""
from bs4 import BeautifulSoup
import re

filename = "search_results_성수사진관.html"
place_id = "1865686697"

with open(filename, 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

print(f"오디티모드 성수점 (place_id: {place_id}) 네이버페이 찾기")
print("="*80)

# 1. place_id가 나타나는 모든 위치 찾기
all_indices = []
search_start = 0
while True:
    idx = html.find(f'/place/{place_id}/', search_start)
    if idx == -1:
        break
    all_indices.append(idx)
    search_start = idx + 1

print(f"\nplace_id 출현 횟수: {len(all_indices)}번")

# 각 출현 위치 주변에서 네이버페이 검색
for i, idx in enumerate(all_indices, 1):
    print(f"\n[출현 #{i}] 위치: {idx}")
    
    # 앞뒤 2000자씩 확인
    start = max(0, idx - 2000)
    end = min(len(html), idx + 2000)
    context = html[start:end]
    
    has_npay = 'npay' in context.lower() or '네이버페이' in context
    print(f"  주변 4000자에 네이버페이: {'있음' if has_npay else '없음'}")
    
    if has_npay:
        # 위치 계산
        npay_idx = context.lower().find('npay')
        if npay_idx == -1:
            npay_idx = context.find('네이버페이')
        
        distance = npay_idx - (idx - start)
        print(f"  place_id로부터 거리: {distance}자 ({'앞' if distance < 0 else '뒤'})")
        
        # 네이버페이 주변 HTML
        npay_start = max(0, npay_idx - 100)
        npay_end = min(len(context), npay_idx + 200)
        print(f"\n  네이버페이 주변 HTML:")
        print(f"  {context[npay_start:npay_end]}")

# 2. 모든 npay 아이콘의 위치 확인
print(f"\n\n{'='*80}")
print("전체 HTML에서 모든 npay 아이콘 위치")
print("="*80)

npay_icons = soup.find_all('i', class_='_ico_npay_sis14_154')
print(f"\n총 {len(npay_icons)}개 발견\n")

for i, icon in enumerate(npay_icons[:20], 1):
    # 이 아이콘 주변에서 오디티모드 찾기
    icon_html = str(icon.parent.parent.parent)  # 조부모까지
    
    if place_id in icon_html or '오디티모드' in icon_html:
        print(f"[{i}] 오디티모드와 관련된 npay 아이콘 발견!")
        print(f"  주변 HTML: {icon_html[:300]}")
