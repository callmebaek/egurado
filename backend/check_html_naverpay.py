"""생성된 HTML 파일에서 네이버페이 정보 확인"""
import json
import re

def check_html_file(filename):
    print(f"\n{'='*80}")
    print(f"파일: {filename}")
    print(f"{'='*80}\n")
    
    with open(filename, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # 1. __APOLLO_STATE__ 추출
    print("=== 1. __APOLLO_STATE__ 찾기 ===")
    apollo_match = re.search(r'window\.__APOLLO_STATE__\s*=\s*(\{.+?\});', html, re.DOTALL)
    
    if apollo_match:
        print("[OK] __APOLLO_STATE__ 발견!")
        apollo_json = apollo_match.group(1)
        
        try:
            apollo_data = json.loads(apollo_json)
            print(f"JSON 파싱 성공! 키 개수: {len(apollo_data)}")
            
            # PlaceDetailBase 키 찾기
            place_keys = [k for k in apollo_data.keys() if 'PlaceDetailBase' in k or 'Place:' in k]
            print(f"\nPlace 관련 키: {len(place_keys)}개")
            for key in place_keys[:3]:
                print(f"  - {key}")
            
            # 첫 번째 PlaceDetailBase 데이터 확인
            if place_keys:
                place_data = apollo_data[place_keys[0]]
                print(f"\n=== PlaceDetailBase 데이터 구조 ===")
                print(f"키 개수: {len(place_data)}")
                
                # 결제 관련 키 찾기
                payment_keys = [k for k in place_data.keys() if 'pay' in k.lower()]
                print(f"\n결제 관련 키: {payment_keys}")
                
                for key in payment_keys:
                    value = place_data[key]
                    print(f"\n{key}:")
                    if isinstance(value, dict):
                        print(f"  타입: dict, 키: {list(value.keys())[:10]}")
                    elif isinstance(value, list):
                        print(f"  타입: list, 길이: {len(value)}")
                        if value:
                            print(f"  첫 항목: {value[0]}")
                    else:
                        print(f"  값: {value}")
                
                # paymentInfo 확인
                if 'paymentInfo' in place_data:
                    print(f"\n=== paymentInfo 상세 ===")
                    payment_info = place_data['paymentInfo']
                    print(f"타입: {type(payment_info)}")
                    print(f"내용: {payment_info}")
                
                # 전체 데이터를 JSON으로 저장
                output_file = f"apollo_data_{filename.replace('debug_naverpay_', '').replace('.html', '')}.json"
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(place_data, f, ensure_ascii=False, indent=2)
                print(f"\nPlaceDetailBase 데이터 저장: {output_file}")
                
        except json.JSONDecodeError as e:
            print(f"[ERROR] JSON 파싱 실패: {e}")
    else:
        print("[ERROR] __APOLLO_STATE__를 찾을 수 없습니다")
    
    # 2. HTML에서 "네이버페이" 텍스트 검색
    print(f"\n=== 2. '네이버페이' 텍스트 검색 ===")
    naverpay_count = html.count('네이버페이')
    print(f"출현 횟수: {naverpay_count}번")
    
    # 3. "네이버페이" 주변 HTML
    if naverpay_count > 0:
        print(f"\n=== 3. '네이버페이' 첫 번째 출현 위치 ===")
        idx = html.find('네이버페이')
        start = max(0, idx - 200)
        end = min(len(html), idx + 200)
        context = html[start:end]
        
        print("주변 컨텍스트:")
        print("-" * 80)
        print(context)
        print("-" * 80)


if __name__ == "__main__":
    check_html_file("debug_naverpay_2072848563.html")
    print("\n\n" + "="*100 + "\n\n")
    check_html_file("debug_naverpay_2034139969.html")
