/**
 * 크레딧 관리 유틸리티 (하이브리드 방식 - 성능 최적화)
 * 
 * 특징:
 * - 낙관적 업데이트로 즉각적인 UI 반영 (0ms)
 * - 디바운스로 연속 API 호출 방지
 * - 캐시로 페이지 로드 속도 향상
 * - 기존 코드에 영향 없이 선택적 적용 가능
 */

export interface Credits {
  total_remaining: number
  tier: string
}

// 로컬 크레딧 캐시 (메모리 효율적)
let cachedCredits: Credits | null = null

/**
 * 캐시된 크레딧 정보 가져오기
 */
export function getCachedCredits(): Credits | null {
  return cachedCredits
}

/**
 * 크레딧 캐시 업데이트
 */
export function setCachedCredits(credits: Credits): void {
  cachedCredits = credits
}

/**
 * 낙관적 업데이트: 로컬에서 즉시 크레딧 차감 표시
 * UI에 즉시 반영되어 사용자 경험 향상
 */
export function optimisticallyDeductCredits(amount: number): void {
  if (cachedCredits && typeof window !== 'undefined') {
    cachedCredits = {
      ...cachedCredits,
      total_remaining: Math.max(0, cachedCredits.total_remaining - amount)
    }
    
    // 즉시 UI 업데이트 트리거
    const event = new CustomEvent('creditChanged', { 
      detail: cachedCredits 
    })
    window.dispatchEvent(event)
    
    console.log(`💳 Credits optimistically deducted: -${amount} (new: ${cachedCredits.total_remaining})`)
  }
}

/**
 * 실제 크레딧 갱신 (API 호출)
 * 백엔드에서 실제 크레딧 값을 가져와 동기화
 */
export async function refreshCreditsFromAPI(token: string): Promise<Credits | null> {
  if (typeof window === 'undefined') return null
  
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/credits/me`,
      { 
        headers: { 'Authorization': `Bearer ${token}` } 
      }
    )
    
    if (response.ok) {
      const data = await response.json()
      const credits: Credits = {
        total_remaining: data.total_remaining || 0,
        tier: data.tier || 'free'
      }
      
      setCachedCredits(credits)
      
      // 실제 값으로 UI 업데이트
      const event = new CustomEvent('creditChanged', { 
        detail: credits 
      })
      window.dispatchEvent(event)
      
      console.log(`💳 Credits refreshed from API: ${credits.total_remaining}`)
      
      return credits
    }
  } catch (error) {
    console.error('Failed to refresh credits:', error)
  }
  return null
}

/**
 * 디바운스된 크레딧 갱신 (연속 호출 방지)
 * 여러 번 연속 호출되어도 마지막 호출 후 delay 이후 1번만 실행
 */
let refreshTimeout: NodeJS.Timeout | null = null

export function debouncedRefreshCredits(token: string, delay = 1000): void {
  if (typeof window === 'undefined') return
  
  if (refreshTimeout) {
    clearTimeout(refreshTimeout)
  }
  
  refreshTimeout = setTimeout(() => {
    refreshCreditsFromAPI(token)
  }, delay)
}

/**
 * 크레딧 사용 알림 (낙관적 업데이트 + 디바운스 갱신)
 * 
 * 사용 예시:
 * ```typescript
 * import { notifyCreditUsed } from '@/lib/credit-utils'
 * 
 * const handleCheckRank = async () => {
 *   const token = getToken()
 *   const response = await fetch(...)
 *   
 *   if (response.ok) {
 *     notifyCreditUsed(5, token)  // 5 크레딧 차감
 *   }
 * }
 * ```
 * 
 * @param amount - 차감할 크레딧 수
 * @param token - 인증 토큰
 */
export function notifyCreditUsed(amount: number, token: string): void {
  if (typeof window === 'undefined') return
  
  console.log(`🔔 Credit used notification: ${amount} credits`)
  
  // 1. 즉시 UI 업데이트 (낙관적 업데이트)
  optimisticallyDeductCredits(amount)
  
  // 2. 1초 후 실제 크레딧 갱신 (디바운스)
  debouncedRefreshCredits(token)
}

/**
 * 크레딧 갱신 강제 실행 (디바운스 무시)
 * 에러 발생 시 실제 값으로 되돌리기 위해 사용
 */
export async function forceRefreshCredits(token: string): Promise<Credits | null> {
  // 디바운스 타이머 취소
  if (refreshTimeout) {
    clearTimeout(refreshTimeout)
    refreshTimeout = null
  }
  
  return await refreshCreditsFromAPI(token)
}
