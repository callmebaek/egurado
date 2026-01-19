"""최종 확인"""
import asyncio
import httpx
import json

async def test():
    place_id = "37942234"
    url = f"http://localhost:8000/api/v1/naver/place-details/{place_id}"
    
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.get(url)
        
        if response.status_code == 200:
            data = response.json()
            details = data['details']
            
            print("="*80)
            print("최종 확인")
            print("="*80)
            
            print(f"\n1. 전화번호: {details.get('phone_number')}")
            print(f"2. 블로그 리뷰: {details.get('blog_review_count'):,}개")
            print(f"3. 방문자 리뷰: {details.get('visitor_review_count'):,}개")
            print(f"4. 이미지 개수: {details.get('image_count')}개")
            print(f"5. 메뉴 개수: {len(details.get('menus', []))}개")
            print(f"6. 플레이스 플러스: {'사용중' if details.get('is_place_plus') else '미사용'}")
            print(f"7. 업체소개글: {'있음' if details.get('description') else '없음'}")
            print(f"8. 찾아오는 길: {'있음' if details.get('directions') else '없음'}")
            
            if details.get('description'):
                print(f"\n   소개글 (처음 100자):")
                print(f"   {details['description'][:100]}")
            
            if details.get('directions'):
                print(f"\n   찾아오는 길 (처음 100자):")
                print(f"   {details['directions'][:100]}")
        else:
            print(f"Error: {response.status_code}")

asyncio.run(test())
