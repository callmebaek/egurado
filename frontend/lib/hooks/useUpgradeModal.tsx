"use client"

/**
 * 구독 업그레이드 모달 훅
 * - Tier 제한 초과 시 업그레이드 유도 모달을 표시
 * - 403 에러 응답에서 제한 관련 에러를 감지하여 자동 표시
 * 
 * 사용 예시:
 * ```
 * const { showUpgradeModal, handleLimitError, UpgradeModalComponent } = useUpgradeModal()
 * 
 * // 방법 1: 직접 호출
 * showUpgradeModal({
 *   limitType: "store",
 *   currentCount: 1,
 *   maxCount: 1,
 *   currentTier: "free",
 * })
 * 
 * // 방법 2: API 에러 응답 처리
 * if (!response.ok) {
 *   const error = await response.json()
 *   if (handleLimitError(response.status, error.detail)) return
 *   // ... 기타 에러 처리
 * }
 * 
 * return <>{UpgradeModalComponent}</>
 * ```
 */
import { useState, useCallback, useMemo } from "react"
import { UpgradeModal, type UpgradeLimitType } from "@/components/upgrade/UpgradeModal"

interface UpgradeModalOptions {
  limitType: UpgradeLimitType
  currentCount?: number
  maxCount?: number
  currentTier?: string
  message?: string
}

export function useUpgradeModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<UpgradeModalOptions | null>(null)

  /**
   * 업그레이드 모달을 직접 표시
   */
  const showUpgradeModal = useCallback((opts: UpgradeModalOptions) => {
    setOptions(opts)
    setIsOpen(true)
  }, [])

  /**
   * API 에러 응답에서 제한 관련 에러를 감지하여 자동으로 모달 표시
   * @returns true이면 제한 에러로 처리됨 (추가 에러 처리 불필요)
   */
  const handleLimitError = useCallback((statusCode: number, errorMessage?: string): boolean => {
    if (statusCode !== 403 || !errorMessage) return false

    const msg = errorMessage.toLowerCase()

    // 매장 제한
    if (msg.includes("매장") && (msg.includes("제한") || msg.includes("최대"))) {
      // "무료 플랜은 최대 1개의 매장만 등록할 수 있습니다. (현재: 1개)" 같은 메시지에서 숫자 추출
      const countMatch = errorMessage.match(/현재:\s*(\d+)/)
      const maxMatch = errorMessage.match(/최대\s*(\d+)/)
      showUpgradeModal({
        limitType: "store",
        currentCount: countMatch ? parseInt(countMatch[1]) : undefined,
        maxCount: maxMatch ? parseInt(maxMatch[1]) : undefined,
        message: errorMessage,
      })
      return true
    }

    // 키워드 제한
    if (msg.includes("키워드") && (msg.includes("제한") || msg.includes("도달"))) {
      const countMatch = errorMessage.match(/현재:\s*(\d+)\/(\d+)/)
      showUpgradeModal({
        limitType: "keyword",
        currentCount: countMatch ? parseInt(countMatch[1]) : undefined,
        maxCount: countMatch ? parseInt(countMatch[2]) : undefined,
        message: errorMessage,
      })
      return true
    }

    // 추적 제한
    if (msg.includes("추적") && (msg.includes("제한") || msg.includes("도달") || msg.includes("최대"))) {
      const countMatch = errorMessage.match(/현재:\s*(\d+)\/(\d+)/)
      showUpgradeModal({
        limitType: "tracker",
        currentCount: countMatch ? parseInt(countMatch[1]) : undefined,
        maxCount: countMatch ? parseInt(countMatch[2]) : undefined,
        message: errorMessage,
      })
      return true
    }

    // 구독/업그레이드 관련 일반 메시지
    if (msg.includes("업그레이드") || msg.includes("플랜") || msg.includes("구독")) {
      showUpgradeModal({
        limitType: "feature",
        message: errorMessage,
      })
      return true
    }

    return false
  }, [showUpgradeModal])

  const UpgradeModalComponent = useMemo(() => {
    if (!options) return null
    return (
      <UpgradeModal
        open={isOpen}
        onOpenChange={setIsOpen}
        limitType={options.limitType}
        currentCount={options.currentCount}
        maxCount={options.maxCount}
        currentTier={options.currentTier}
        message={options.message}
      />
    )
  }, [isOpen, options])

  return { showUpgradeModal, handleLimitError, UpgradeModalComponent }
}
