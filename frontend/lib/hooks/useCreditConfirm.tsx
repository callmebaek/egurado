"use client"

/**
 * 크레딧 차감 확인 훅
 * - 기능 실행 전 크레딧 차감 확인 모달을 표시
 * - localStorage에 "알림 끄기" 설정이 저장된 경우 모달 없이 바로 실행
 * 
 * 사용 예시:
 * ```
 * const { showCreditConfirm, CreditModal } = useCreditConfirm()
 * 
 * const handleAction = () => {
 *   showCreditConfirm({
 *     featureName: "플레이스 진단",
 *     creditAmount: 8,
 *     onConfirm: () => { // 실제 기능 실행 }
 *   })
 * }
 * 
 * return <>{CreditModal}</>
 * ```
 */
import { useState, useCallback, useMemo } from "react"
import { CreditConfirmModal, isCreditConfirmDismissed } from "@/components/credit/CreditConfirmModal"

interface CreditConfirmOptions {
  featureName: string
  creditAmount: number
  creditDetail?: string
  onConfirm: () => void
  onCancel?: () => void
}

export function useCreditConfirm() {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<CreditConfirmOptions | null>(null)

  const showCreditConfirm = useCallback((opts: CreditConfirmOptions) => {
    // "알림 끄기" 설정이 되어 있으면 바로 실행
    if (isCreditConfirmDismissed()) {
      opts.onConfirm()
      return
    }

    setOptions(opts)
    setIsOpen(true)
  }, [])

  const CreditModal = useMemo(() => {
    if (!options) return null

    return (
      <CreditConfirmModal
        open={isOpen}
        onOpenChange={setIsOpen}
        featureName={options.featureName}
        creditAmount={options.creditAmount}
        creditDetail={options.creditDetail}
        onConfirm={options.onConfirm}
        onCancel={options.onCancel}
      />
    )
  }, [isOpen, options])

  return { showCreditConfirm, CreditModal }
}
