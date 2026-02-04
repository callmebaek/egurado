"""
프록시 사용 시 속도 비교 테스트
"""
import httpx
import asyncio
import time
from statistics import mean, stdev

# Smartproxy 설정
# Sticky Session 추가 (5분간 같은 IP 유지)
PROXY_URL = "http://smart-wdovb9wcd101_area-KR_life-5_session-DaOLZ9DzS:YVUIoFPqFp9AXZyJ@as.smartproxy.net:3120"

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
            "display": 10,
            "x": "127.0276",
            "y": "37.4979"
        }
    },
    "query": "query getPlacesList($input: PlacesInput) { places(input: $input) { total items { id name } } }"
}


async def test_without_proxy(num_tests=10):
    """프록시 없이 속도 테스트"""
    print("\n[WITHOUT PROXY] Testing speed...")
    times = []
    
    for i in range(num_tests):
        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(API_URL, json=PAYLOAD, headers=HEADERS)
                response.raise_for_status()
            elapsed = (time.time() - start) * 1000  # ms
            times.append(elapsed)
            print(f"  Test {i+1}: {elapsed:.0f}ms")
        except Exception as e:
            print(f"  Test {i+1}: ERROR - {e}")
    
    if times:
        avg = mean(times)
        sd = stdev(times) if len(times) > 1 else 0
        print(f"\n  Average: {avg:.0f}ms")
        print(f"  Std Dev: {sd:.0f}ms")
        print(f"  Min: {min(times):.0f}ms")
        print(f"  Max: {max(times):.0f}ms")
        return avg
    return None


async def test_with_proxy(num_tests=10):
    """프록시 사용 시 속도 테스트"""
    print("\n[WITH PROXY] Testing speed...")
    times = []
    
    for i in range(num_tests):
        start = time.time()
        try:
            async with httpx.AsyncClient(proxy=PROXY_URL, timeout=10.0) as client:
                response = await client.post(API_URL, json=PAYLOAD, headers=HEADERS)
                response.raise_for_status()
            elapsed = (time.time() - start) * 1000  # ms
            times.append(elapsed)
            print(f"  Test {i+1}: {elapsed:.0f}ms")
        except Exception as e:
            print(f"  Test {i+1}: ERROR - {e}")
    
    if times:
        avg = mean(times)
        sd = stdev(times) if len(times) > 1 else 0
        print(f"\n  Average: {avg:.0f}ms")
        print(f"  Std Dev: {sd:.0f}ms")
        print(f"  Min: {min(times):.0f}ms")
        print(f"  Max: {max(times):.0f}ms")
        return avg
    return None


async def main():
    print("=" * 60)
    print("Proxy Speed Comparison Test")
    print("=" * 60)
    print("\nTesting 10 times each...\n")
    
    # 프록시 없이 테스트
    avg_without = await test_without_proxy(10)
    
    # 프록시 사용 테스트
    avg_with = await test_with_proxy(10)
    
    # 결과 비교
    print("\n" + "=" * 60)
    print("COMPARISON RESULT")
    print("=" * 60)
    
    if avg_without and avg_with:
        print(f"Without Proxy: {avg_without:.0f}ms")
        print(f"With Proxy:    {avg_with:.0f}ms")
        print(f"\nDifference:    +{avg_with - avg_without:.0f}ms ({((avg_with/avg_without - 1) * 100):.1f}% slower)")
        
        if avg_with > avg_without * 3:
            print("\n[WARNING] Proxy is MORE THAN 3x slower!")
            print("Consider:")
            print("  - Using Sticky Session")
            print("  - Trying different ports")
            print("  - Using proxy only when needed")
        elif avg_with > avg_without * 2:
            print("\n[CAUTION] Proxy is 2-3x slower")
            print("This is expected but consider optimization")
        else:
            print("\n[OK] Acceptable performance degradation")


if __name__ == "__main__":
    asyncio.run(main())
