"""HTML에서 네이버페이 찾기 - 간단 버전"""
from bs4 import BeautifulSoup
import re

def find_naverpay(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    
    output = []
    output.append(f"\n{'='*80}\n파일: {filename}\n{'='*80}\n")
    
    # 1. "네이버페이" 텍스트가 포함된 요소
    naverpay_tags = soup.find_all(string=re.compile('네이버페이'))
    output.append(f"=== '네이버페이' 텍스트: {len(naverpay_tags)}개 ===\n")
    
    for i, tag in enumerate(naverpay_tags, 1):
        output.append(f"[{i}] 텍스트: {repr(tag.strip())}\n")
        
        parent = tag.parent
        if parent:
            output.append(f"    부모: <{parent.name}> class={parent.get('class')}\n")
            
            # 부모 HTML (특수문자 제거)
            parent_html = str(parent)[:150]
            try:
                output.append(f"    HTML: {parent_html}...\n")
            except:
                output.append(f"    HTML: (인코딩 오류)\n")
        output.append("\n")
    
    # 2. "간편결제" 찾기
    simple_pay_tags = soup.find_all(string=re.compile('간편결제'))
    output.append(f"\n=== '간편결제' 텍스트: {len(simple_pay_tags)}개 ===\n")
    
    for i, tag in enumerate(simple_pay_tags, 1):
        output.append(f"[{i}] 텍스트: {repr(tag.strip())}\n")
        parent = tag.parent
        if parent:
            output.append(f"    부모: <{parent.name}> class={parent.get('class')}\n")
            # 부모의 전체 텍스트
            try:
                full_text = parent.get_text(strip=True)
                output.append(f"    전체 텍스트: {full_text}\n")
            except:
                output.append(f"    전체 텍스트: (인코딩 오류)\n")
        output.append("\n")
    
    # 3. 네이버 이미지
    images = soup.find_all('img')
    naver_images = []
    for img in images:
        alt = img.get('alt', '')
        src = img.get('src', '')
        if '네이버' in alt or 'naver' in src.lower() and 'pay' in src.lower():
            naver_images.append((alt, src))
    
    output.append(f"\n=== 네이버 관련 이미지: {len(naver_images)}개 ===\n")
    for i, (alt, src) in enumerate(naver_images[:10], 1):
        output.append(f"[{i}] alt={repr(alt)} src={src[:80]}...\n")
    
    # 결과를 파일로 저장
    output_file = f"naverpay_analysis_{filename.replace('debug_naverpay_', '').replace('.html', '')}.txt"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.writelines(output)
    
    return output_file


if __name__ == "__main__":
    file1 = find_naverpay("debug_naverpay_2034139969.html")
    print(f"분석 결과 저장: {file1}")
    
    file2 = find_naverpay("debug_naverpay_2072848563.html")
    print(f"분석 결과 저장: {file2}")
