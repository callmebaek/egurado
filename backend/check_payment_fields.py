"""APOLLO_STATE에서 결제 관련 필드만 확인"""
import json
import re

def check_place(place_id):
    print(f"\n{'='*80}")
    print(f"매장 ID: {place_id}")
    print(f"{'='*80}\n")
    
    # JSON 파일 읽기
    filename = f"apollo_data_{place_id}.json"
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 1. 기본 정보
    print(f"매장명: {data.get('name')}")
    print(f"카테고리: {data.get('category')}")
    
    # 2. conveniences
    print(f"\n=== conveniences ===")
    conveniences = data.get('conveniences', [])
    if conveniences:
        for i, conv in enumerate(conveniences, 1):
            print(f"  [{i}] {conv}")
    else:
        print("  (없음)")
    
    # 3. paymentInfo
    print(f"\n=== paymentInfo ===")
    payment_info = data.get('paymentInfo')
    print(f"타입: {type(payment_info)}")
    if payment_info:
        if isinstance(payment_info, list):
            for i, pay in enumerate(payment_info, 1):
                print(f"  [{i}] {pay}")
        else:
            print(f"  값: {payment_info}")
    else:
        print("  (None)")
    
    # 4. 다른 결제 관련 필드
    print(f"\n=== 기타 결제/네이버 관련 필드 ===")
    for key, value in data.items():
        key_lower = key.lower()
        if 'pay' in key_lower or 'naver' in key_lower or 'card' in key_lower:
            print(f"  {key}: {value}")
    
    # 5. HTML에서 네이버페이 확인
    html_filename = f"debug_naverpay_{place_id}.html"
    try:
        with open(html_filename, 'r', encoding='utf-8') as f:
            html = f.read()
        
        naverpay_count = html.count('네이버페이')
        print(f"\n=== HTML에서 네이버페이 ===")
        print(f"출현 횟수: {naverpay_count}번")
        
        # 네이버페이가 나타나는 컨텍스트
        if naverpay_count > 0:
            idx = html.find('네이버페이')
            start = max(0, idx - 100)
            end = min(len(html), idx + 100)
            context = html[start:end]
            
            # JSON 문자열인지 확인
            if '"naver_pay' in html.lower():
                print("HTML에서 'naver_pay' 키워드 발견 (JSON 데이터일 가능성)")
                
                # naver_pay 관련 JSON 추출
                patterns = [
                    r'"naver_pay[^"]*"\s*:\s*"([^"]*)"',
                    r'"naver_pay[^"]*"\s*:\s*([^,}]+)',
                ]
                
                for pattern in patterns:
                    matches = re.findall(pattern, html, re.IGNORECASE)
                    if matches:
                        print(f"  패턴 발견: {matches[:3]}")
        
    except FileNotFoundError:
        print(f"\n=== HTML 파일 없음 ===")


if __name__ == "__main__":
    check_place("2034139969")  # 유제사진관
    print("\n\n")
    check_place("2072848563")  # 아나나사진관
