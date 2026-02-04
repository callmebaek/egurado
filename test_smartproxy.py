"""
Smartproxy 한국 IP 테스트 스크립트
네이버 API가 프록시를 통해 정상 작동하는지 확인
"""
import httpx
import asyncio
import json

# Smartproxy 설정 (아시아 서버)
PROXY_SERVER = "as.smartproxy.net"
PROXY_PORT = 3120
PROXY_USERNAME = "smart-wdovb9wcd101_area-KR"
PROXY_PASSWORD = "YVUIoFPqFp9AXZyJ"
PROXY_URL = f"http://{PROXY_USERNAME}:{PROXY_PASSWORD}@{PROXY_SERVER}:{PROXY_PORT}"

# 테스트할 포트 목록 (첫 번째 테스트 실패 시 사용)
PORTS_TO_TEST = [3120, 7000, 8000, 7001, 8001, 3128]


async def test_proxy_basic():
    """1단계: 프록시가 작동하는지 기본 테스트"""
    print("=" * 60)
    print("1단계: 프록시 기본 테스트")
    print("=" * 60)
    
    try:
        # Check IP without proxy
        print("\n[WITHOUT PROXY] Checking my real IP...")
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://api.ipify.org?format=json")
            my_ip = response.json()["ip"]
            print(f"[OK] My real IP: {my_ip}")
        
        # Check IP with proxy
        print("\n[WITH PROXY] Checking IP...")
        async with httpx.AsyncClient(proxy=PROXY_URL, timeout=10.0) as client:
            response = await client.get("https://api.ipify.org?format=json")
            proxy_ip = response.json()["ip"]
            print(f"[OK] Proxy IP: {proxy_ip}")
            
            # Check IP location
            print(f"\n[Fetching proxy IP location...]")
            response = await client.get(f"http://ip-api.com/json/{proxy_ip}")
            location = response.json()
            print(f"[OK] Country: {location.get('country')}")
            print(f"[OK] City: {location.get('city')}")
            print(f"[OK] ISP: {location.get('isp')}")
            
            if location.get('countryCode') == 'KR':
                print("\n[SUCCESS] Korean IP confirmed!")
            else:
                print(f"\n[WARNING] Not a Korean IP! ({location.get('country')})")
        
        return True
        
    except Exception as e:
        print(f"\n[ERROR] Exception occurred: {e}")
        return False


async def test_naver_graphql():
    """2단계: 네이버 GraphQL API 테스트"""
    print("\n" + "=" * 60)
    print("2단계: 네이버 GraphQL API 테스트")
    print("=" * 60)
    
    # 네이버가 요구하는 헤더
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ko-KR,ko;q=0.9",
        "Content-Type": "application/json",
        "Origin": "https://m.place.naver.com",
        "Referer": "https://m.place.naver.com/",
    }
    
    # 간단한 검색 쿼리
    payload = {
        "operationName": "getPlacesList",
        "variables": {
            "input": {
                "query": "강남역맛집",
                "start": 1,
                "display": 5,
                "x": "127.0276",
                "y": "37.4979"
            }
        },
        "query": """
        query getPlacesList($input: PlacesInput) {
            places(input: $input) {
                total
                items {
                    id
                    name
                    category
                }
            }
        }
        """
    }
    
    try:
        print("\n[WITHOUT PROXY] Testing Naver API call...")
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.place.naver.com/graphql",
                json=payload,
                headers=headers
            )
            print(f"[OK] Response status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                if "data" in data and "places" in data["data"]:
                    total = data["data"]["places"].get("total", 0)
                    print(f"[OK] Search results: {total} places found")
                    
                    items = data["data"]["places"].get("items", [])
                    if items:
                        print(f"[OK] First place: {items[0]['name']}")
            else:
                print(f"[WARNING] Abnormal response: {response.text[:200]}")
        
        print("\n[WITH PROXY] Testing Naver API call...")
        async with httpx.AsyncClient(proxy=PROXY_URL, timeout=10.0) as client:
            response = await client.post(
                "https://api.place.naver.com/graphql",
                json=payload,
                headers=headers
            )
            print(f"[OK] Response status: {response.status_code}")
            
            if response.status_code == 612:
                print("[FAIL] HTTP 612 Error - Naver blocked the request!")
                print("   -> Smartproxy IP is blocked by Naver.")
                return False
            elif response.status_code == 200:
                data = response.json()
                if "data" in data and "places" in data["data"]:
                    total = data["data"]["places"].get("total", 0)
                    print(f"[OK] Search results: {total} places found")
                    
                    items = data["data"]["places"].get("items", [])
                    if items:
                        print(f"[OK] First place: {items[0]['name']}")
                        print("\n*** SUCCESS! Proxy is working properly! ***")
                        return True
                else:
                    print(f"[WARNING] Abnormal response data: {json.dumps(data, ensure_ascii=False)[:200]}")
            else:
                print(f"[WARNING] Abnormal response status: {response.status_code}")
                print(f"   Response content: {response.text[:300]}")
                return False
        
    except httpx.ConnectTimeout:
        print("[ERROR] Connection timeout - No response from proxy server")
        return False
    except httpx.ProxyError as e:
        print(f"[ERROR] Proxy error: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_with_port(port):
    """특정 포트로 테스트"""
    global PROXY_URL, PROXY_PORT
    PROXY_PORT = port
    PROXY_URL = f"http://{PROXY_USERNAME}:{PROXY_PASSWORD}@{PROXY_SERVER}:{port}"
    
    print("\n" + "=" * 60)
    print(f"Testing with Port: {port}")
    print(f"Server: {PROXY_SERVER}")
    print("=" * 60)
    
    # 1단계: 프록시 기본 테스트
    basic_ok = await test_proxy_basic()
    
    if not basic_ok:
        print(f"\n[FAIL] Port {port} - Basic test failed")
        return False
    
    # 2단계: 네이버 API 테스트
    naver_ok = await test_naver_graphql()
    
    if basic_ok and naver_ok:
        print(f"\n*** SUCCESS! Port {port} is working! ***")
        print(f"Working Proxy URL: {PROXY_URL}")
        return True
    else:
        print(f"\n[FAIL] Port {port} - Naver API test failed")
        return False


async def main():
    """전체 테스트 실행"""
    print("\n[START] Smartproxy + Naver API Test")
    print(f"Server: {PROXY_SERVER}")
    print(f"Initial Port: {PROXY_PORT}\n")
    
    # 첫 번째 포트 테스트
    success = await test_with_port(PROXY_PORT)
    
    if success:
        print("\n" + "=" * 60)
        print("FINAL RESULT: SUCCESS")
        print("=" * 60)
        print("[OK] Proxy is working properly!")
        print("[OK] Ready to deploy to EC2 server!")
        print(f"\nUse this in .env file:")
        print(f"PROXY_URL={PROXY_URL}")
        return
    
    # 첫 번째 포트 실패 시 다른 포트들 시도
    print("\n" + "=" * 60)
    print("First port failed. Trying other ports...")
    print("=" * 60)
    
    for port in PORTS_TO_TEST:
        if port == PROXY_PORT:  # 이미 테스트한 포트 스킵
            continue
        
        success = await test_with_port(port)
        if success:
            print("\n" + "=" * 60)
            print("FINAL RESULT: SUCCESS")
            print("=" * 60)
            print(f"[OK] Found working port: {port}")
            print("[OK] Ready to deploy to EC2 server!")
            print(f"\nUse this in .env file:")
            print(f"PROXY_URL={PROXY_URL}")
            return
    
    # 모든 포트 실패
    print("\n" + "=" * 60)
    print("FINAL RESULT: FAILED")
    print("=" * 60)
    print("[FAIL] All ports failed")
    print("[WARNING] Cannot use Smartproxy service")
    print("   -> Consider using other proxy services (Bright Data, Oxylabs, etc.)")


if __name__ == "__main__":
    asyncio.run(main())
