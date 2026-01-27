import httpx
from bs4 import BeautifulSoup
import re
import json

# 로그에서 확인된 실제 블로그 URL (placeId 일치했던 URL)
blog_url = "https://blog.naver.com/liberi_sognatori/224153613892"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9",
}

print(f"=" * 80)
print(f"블로그 URL: {blog_url}")
print(f"=" * 80)

# 1. 외부 페이지 가져오기
try:
    response = httpx.get(blog_url, headers=headers, follow_redirects=True, timeout=10.0)
    print(f"\n[1단계] 외부 페이지 HTTP 상태: {response.status_code}")
    print(f"최종 URL: {response.url}")
    print(f"HTML 길이: {len(response.text)} bytes")
    
    html = response.text
    soup = BeautifulSoup(html, 'html.parser')
    
    # 2. iframe 찾기
    print(f"\n[2단계] iframe 검색...")
    all_iframes = soup.find_all('iframe')
    print(f"총 iframe 개수: {len(all_iframes)}")
    
    for idx, iframe in enumerate(all_iframes):
        src = iframe.get('src', '')
        iframe_id = iframe.get('id', '')
        print(f"  iframe {idx}: id='{iframe_id}', src='{src[:100]}...'")
    
    # 3. mainFrame iframe 찾기 (네이버 블로그 컨텐츠)
    main_frame = soup.find('iframe', id='mainFrame')
    if main_frame:
        main_frame_src = main_frame.get('src', '')
        print(f"\n[3단계] mainFrame iframe 발견!")
        print(f"mainFrame src: {main_frame_src}")
        
        # mainFrame 컨텐츠 가져오기
        if main_frame_src:
            if not main_frame_src.startswith('http'):
                main_frame_src = 'https://blog.naver.com' + main_frame_src
            
            print(f"\n[4단계] mainFrame 컨텐츠 요청...")
            frame_response = httpx.get(main_frame_src, headers=headers, follow_redirects=True, timeout=10.0)
            print(f"mainFrame HTTP 상태: {frame_response.status_code}")
            print(f"mainFrame HTML 길이: {len(frame_response.text)} bytes")
            
            frame_html = frame_response.text
            frame_soup = BeautifulSoup(frame_html, 'html.parser')
            
            # 5. placeId 검색
            print(f"\n[5단계] mainFrame에서 placeId 검색...")
            
            # 방법 1: data-linkdata
            map_links = frame_soup.find_all('a', attrs={'data-linkdata': True})
            print(f"  data-linkdata 링크: {len(map_links)}개")
            for link in map_links[:3]:  # 처음 3개만 출력
                try:
                    link_data = json.loads(link['data-linkdata'].replace('&quot;', '"'))
                    place_id = link_data.get('placeId', '')
                    print(f"    → placeId: {place_id}, name: {link_data.get('name', '')}")
                except:
                    pass
            
            # 방법 2: iframe with place.naver.com
            place_iframes = frame_soup.find_all('iframe', src=re.compile(r'place\.naver\.com'))
            print(f"  place.naver.com iframe: {len(place_iframes)}개")
            for iframe in place_iframes[:3]:
                src = iframe.get('src', '')
                match = re.search(r'place/(\d+)', src)
                if match:
                    print(f"    → placeId: {match.group(1)}")
            
            # 방법 3: 링크
            place_links = frame_soup.find_all('a', href=re.compile(r'place\.naver\.com/place/(\d+)'))
            print(f"  place.naver.com 링크: {len(place_links)}개")
            for link in place_links[:3]:
                href = link.get('href', '')
                match = re.search(r'place/(\d+)', href)
                if match:
                    print(f"    → placeId: {match.group(1)}")
            
            # HTML 샘플 저장
            print(f"\n[6단계] HTML 샘플 저장...")
            with open('blog_main_frame.html', 'w', encoding='utf-8') as f:
                f.write(frame_html[:50000])  # 처음 50KB만
            print("  → blog_main_frame.html 저장 완료")
    else:
        print(f"\n[3단계] mainFrame iframe을 찾을 수 없습니다!")
        print("외부 HTML 샘플 저장...")
        with open('blog_outer.html', 'w', encoding='utf-8') as f:
            f.write(html[:50000])
        print("  → blog_outer.html 저장 완료")
        
except Exception as e:
    print(f"\n❌ 오류 발생: {type(e).__name__} - {str(e)}")
    import traceback
    traceback.print_exc()

print(f"\n" + "=" * 80)
print("분석 완료")
print("=" * 80)
