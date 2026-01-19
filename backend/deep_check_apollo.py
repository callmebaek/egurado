"""APOLLO_STATE 전체 키 확인"""
import json
import re

def deep_check(place_id, store_name):
    print(f"\n{'='*80}")
    print(f"{store_name} (place_id: {place_id})")
    print(f"{'='*80}\n")
    
    filename = f"apollo_data_{place_id}.json"
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        # 다른 방법으로 HTML에서 직접 추출
        html_file = f"compare_{place_id}_with_naverpay.html"
        try:
            with open(html_file, 'r', encoding='utf-8') as f:
                html = f.read()
        except:
            html_file = f"compare_{place_id}_without_naverpay.html"
            with open(html_file, 'r', encoding='utf-8') as f:
                html = f.read()
        
        # __APOLLO_STATE__ 추출
        apollo_match = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.+?\});', html, re.DOTALL)
        if apollo_match:
            apollo_data = json.loads(apollo_match.group(1))
            
            # PlaceDetailBase 찾기
            place_key = None
            for key in apollo_data.keys():
                if f'PlaceDetailBase:{place_id}' in key or f'Place:{place_id}' in key:
                    place_key = key
                    break
            
            if place_key:
                data = apollo_data[place_key]
            else:
                print("PlaceDetailBase를 찾을 수 없음")
                return
        else:
            print("APOLLO_STATE를 찾을 수 없음")
            return
    
    # 모든 키 출력
    print(f"=== 전체 키 목록 ({len(data)}개) ===\n")
    
    # 결제/네이버 관련 키만 먼저
    payment_keys = []
    for key in sorted(data.keys()):
        key_lower = key.lower()
        if 'pay' in key_lower or 'naver' in key_lower or 'card' in key_lower or 'npay' in key_lower:
            payment_keys.append(key)
    
    if payment_keys:
        print("결제/네이버 관련 키:")
        for key in payment_keys:
            value = data[key]
            if isinstance(value, (list, str, int, bool)) or value is None:
                print(f"  - {key}: {value}")
            else:
                print(f"  - {key}: {type(value).__name__}")
    else:
        print("결제/네이버 관련 키 없음")
    
    # conveniences 상세
    print(f"\n=== conveniences ===")
    conv = data.get('conveniences', [])
    if conv:
        for item in conv:
            print(f"  - {item}")
    else:
        print("  (없음)")
    
    # paymentInfo 상세
    print(f"\n=== paymentInfo ===")
    pay_info = data.get('paymentInfo')
    print(f"타입: {type(pay_info)}")
    print(f"값: {pay_info}")
    
    # 전체 키 목록 (참고용)
    print(f"\n=== 전체 키 목록 (알파벳순) ===")
    for i, key in enumerate(sorted(data.keys()), 1):
        value = data[key]
        value_type = type(value).__name__
        
        if value is None:
            value_str = "None"
        elif isinstance(value, (list, dict)):
            value_str = f"{value_type}(len={len(value)})"
        elif isinstance(value, str) and len(value) > 50:
            value_str = f"str: {value[:47]}..."
        else:
            value_str = str(value)[:80]
        
        print(f"  [{i:2d}] {key:30s} = {value_str}")


if __name__ == "__main__":
    deep_check("2034139969", "유제사진관 (네이버페이 O)")
    deep_check("2072848563", "아나나사진관 (네이버페이 O)")
    deep_check("1012350598", "인사도담 (네이버페이 X)")
