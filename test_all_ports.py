"""
모든 Smartproxy 포트 속도 비교 테스트
"""
import httpx
import asyncio
import time
from statistics import mean

# Smartproxy 설정
PROXY_SERVER = "as.smartproxy.net"
PROXY_USERNAME = "smart-wdovb9wcd101_area-KR_life-5_session-DaOLZ9DzS"
PROXY_PASSWORD = "YVUIoFPqFp9AXZyJ"

# 테스트할 포트 목록
PORTS = [3120, 7000, 8000, 7001, 8001, 3128, 10000, 10001]

# 네이버 API 설정
API_URL = "https://api.place.naver.com/graphql"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
    "Accept": "application/json",
    "Content-Type": "application/json",
}

PAYLOAD = {
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
    "query": "query getPlacesList($input: PlacesInput) { places(input: $input) { total items { id name } } }"
}


async def test_port(port, num_tests=5):
    """특정 포트의 속도 테스트"""
    proxy_url = f"http://{PROXY_USERNAME}:{PROXY_PASSWORD}@{PROXY_SERVER}:{port}"
    
    print(f"\n[PORT {port}] Testing...")
    times = []
    errors = []
    
    for i in range(num_tests):
        start = time.time()
        try:
            async with httpx.AsyncClient(proxy=proxy_url, timeout=15.0) as client:
                response = await client.post(API_URL, json=PAYLOAD, headers=HEADERS)
                response.raise_for_status()
                
                # 응답 확인
                data = response.json()
                if "data" in data and "places" in data["data"]:
                    elapsed = (time.time() - start) * 1000
                    times.append(elapsed)
                    print(f"  Test {i+1}: {elapsed:.0f}ms - OK")
                else:
                    errors.append("Invalid response")
                    print(f"  Test {i+1}: ERROR - Invalid response")
                    
        except httpx.ProxyError as e:
            errors.append(f"Proxy error: {e}")
            print(f"  Test {i+1}: ERROR - Proxy error")
        except httpx.ConnectTimeout:
            errors.append("Timeout")
            print(f"  Test {i+1}: ERROR - Timeout")
        except httpx.HTTPStatusError as e:
            errors.append(f"HTTP {e.response.status_code}")
            print(f"  Test {i+1}: ERROR - HTTP {e.response.status_code}")
        except Exception as e:
            errors.append(str(e))
            print(f"  Test {i+1}: ERROR - {e}")
    
    if times:
        avg = mean(times)
        success_rate = (len(times) / num_tests) * 100
        print(f"  Average: {avg:.0f}ms (Success: {success_rate:.0f}%)")
        return {
            "port": port,
            "avg_time": avg,
            "success_rate": success_rate,
            "times": times,
            "errors": errors
        }
    else:
        print(f"  FAILED - All tests failed")
        return {
            "port": port,
            "avg_time": None,
            "success_rate": 0,
            "times": [],
            "errors": errors
        }


async def test_without_proxy(num_tests=5):
    """프록시 없이 기준 속도 측정"""
    print("\n[NO PROXY] Testing baseline speed...")
    times = []
    
    for i in range(num_tests):
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(API_URL, json=PAYLOAD, headers=HEADERS)
                response.raise_for_status()
            elapsed = (time.time() - start) * 1000
            times.append(elapsed)
            print(f"  Test {i+1}: {elapsed:.0f}ms")
        except Exception as e:
            print(f"  Test {i+1}: ERROR - {e}")
    
    if times:
        avg = mean(times)
        print(f"  Average: {avg:.0f}ms")
        return avg
    return None


async def main():
    print("=" * 70)
    print("Smartproxy Port Speed Comparison Test")
    print("=" * 70)
    print(f"\nServer: {PROXY_SERVER}")
    print(f"Testing {len(PORTS)} ports with 5 requests each...\n")
    
    # 기준 속도 측정
    baseline = await test_without_proxy(5)
    
    # 각 포트 테스트
    results = []
    for port in PORTS:
        result = await test_port(port, 5)
        results.append(result)
        await asyncio.sleep(1)  # 포트 간 1초 대기
    
    # 결과 정렬 (빠른 순)
    successful_results = [r for r in results if r["avg_time"] is not None]
    successful_results.sort(key=lambda x: x["avg_time"])
    
    failed_results = [r for r in results if r["avg_time"] is None]
    
    # 최종 결과 출력
    print("\n" + "=" * 70)
    print("FINAL RESULTS (Sorted by Speed)")
    print("=" * 70)
    
    if baseline:
        print(f"\nBaseline (No Proxy): {baseline:.0f}ms")
    
    if successful_results:
        print("\n--- WORKING PORTS (Fastest first) ---\n")
        for i, result in enumerate(successful_results, 1):
            port = result["port"]
            avg = result["avg_time"]
            success = result["success_rate"]
            
            if baseline:
                slowdown = (avg / baseline - 1) * 100
                print(f"{i}. Port {port:5d}: {avg:4.0f}ms (Success: {success:.0f}%) [+{slowdown:.0f}% vs baseline]")
            else:
                print(f"{i}. Port {port:5d}: {avg:4.0f}ms (Success: {success:.0f}%)")
        
        # 최고 성능 포트 추천
        best = successful_results[0]
        print("\n" + "=" * 70)
        print("RECOMMENDATION")
        print("=" * 70)
        print(f"\nBest Port: {best['port']}")
        print(f"Average Speed: {best['avg_time']:.0f}ms")
        print(f"Success Rate: {best['success_rate']:.0f}%")
        
        if baseline:
            slowdown = (best['avg_time'] / baseline - 1) * 100
            print(f"Slowdown: +{slowdown:.0f}% vs no proxy")
        
        print(f"\nUse this in .env file:")
        print(f"PROXY_URL=http://{PROXY_USERNAME}:{PROXY_PASSWORD}@{PROXY_SERVER}:{best['port']}")
    
    if failed_results:
        print("\n--- FAILED PORTS ---\n")
        for result in failed_results:
            print(f"Port {result['port']}: FAILED - {', '.join(set(result['errors'])[:2])}")


if __name__ == "__main__":
    asyncio.run(main())
