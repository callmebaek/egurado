"""네이버 모바일 검색 결과에서 네이버페이 아이콘 확인"""
import asyncio
import httpx
from bs4 import BeautifulSoup
import json

async def crawl_search_results(query: str):
    """네이버 모바일 검색 결과 크롤링"""
    
    # 네이버 모바일 검색 URL
    url = f"https://m.map.naver.com/search2/search.naver?query={query}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
    }
    
    print(f"\n{'='*80}")
    print(f"검색: {query}")
    print(f"URL: {url}")
    print(f"{'='*80}\n")
    
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            
            print(f"응답 상태: {response.status_code}")
            print(f"URL: {response.url}")
            print(f"Content-Type: {response.headers.get('Content-Type')}")
            
            html = response.text
            
            # HTML 파일로 저장
            filename = f"search_results_{query.replace(' ', '_')}.html"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"\nHTML 저장: {filename}")
            
            # BeautifulSoup으로 파싱
            soup = BeautifulSoup(html, 'html.parser')
            
            # 네이버페이 관련 요소 찾기
            print(f"\n=== 네이버페이 관련 HTML 요소 ===")
            
            # 1. "네이버페이" 텍스트
            naverpay_count = html.count('네이버페이')
            print(f"'네이버페이' 출현: {naverpay_count}번")
            
            # 2. npay 관련 클래스/ID
            npay_elements = soup.find_all(class_=lambda x: x and ('npay' in str(x).lower() or 'naverpay' in str(x).lower()))
            print(f"npay 관련 클래스: {len(npay_elements)}개")
            
            # 3. 네이버페이 이미지
            images = soup.find_all('img')
            naverpay_images = [img for img in images 
                             if '네이버' in img.get('alt', '') and '페이' in img.get('alt', '')]
            print(f"네이버페이 이미지: {len(naverpay_images)}개")
            
            # 4. data 속성에서 네이버페이 찾기
            data_elements = soup.find_all(attrs=lambda x: x and any('pay' in str(v).lower() for v in x.values() if isinstance(v, str)))
            print(f"data 속성에 pay: {len(data_elements)}개")
            
            # 5. __APOLLO_STATE__ 또는 __NEXT_DATA__ 확인
            print(f"\n=== JavaScript 데이터 ===")
            
            # __NEXT_DATA__
            next_data_script = soup.find('script', id='__NEXT_DATA__')
            if next_data_script:
                print("[O] __NEXT_DATA__ 발견")
                try:
                    next_data = json.loads(next_data_script.string)
                    # 파일로 저장
                    with open(f"next_data_{query.replace(' ', '_')}.json", 'w', encoding='utf-8') as f:
                        json.dump(next_data, f, ensure_ascii=False, indent=2)
                    print(f"    저장: next_data_{query.replace(' ', '_')}.json")
                except:
                    print("    JSON 파싱 실패")
            else:
                print("[X] __NEXT_DATA__ 없음")
            
            # APOLLO_STATE
            if 'APOLLO_STATE' in html:
                print("[O] __APOLLO_STATE__ 발견")
            else:
                print("[X] __APOLLO_STATE__ 없음")
            
    except Exception as e:
        print(f"오류: {e}")
        import traceback
        traceback.print_exc()


async def main():
    await crawl_search_results("성수사진관")
    print("\n\n" + "="*100 + "\n\n")
    await crawl_search_results("인사동맛집")


if __name__ == "__main__":
    asyncio.run(main())
