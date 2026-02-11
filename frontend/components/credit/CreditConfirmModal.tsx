"use client"

/**
 * 크레딧 차감 확인 모달
 * - 기능 실행 전 예상 크레딧 차감량을 표시
 * - "앞으로 알림 받지 않기" 체크박스 (localStorage 저장)
 * - 디자인 시스템 규칙 준수
 */
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { CreditCard, AlertCircle } from "lucide-react"
import { getCachedCredits } from "@/lib/credit-utils"

const STORAGE_KEY = "egurado_credit_confirm_dismissed"

interface CreditConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  featureName: string
  creditAmount: number
  /** 동적 크레딧인 경우 상세 설명 (예: "15개 리뷰 × 2") */
  creditDetail?: string
  onConfirm: () => void
  onCancel?: () => void
}

export function CreditConfirmModal({
  open,
  onOpenChange,
  featureName,
  creditAmount,
  creditDetail,
  onConfirm,
  onCancel,
}: CreditConfirmModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const currentCredits = getCachedCredits()
  const remaining = currentCredits ? currentCredits.total_remaining : null
  const isInsufficient = remaining !== null && remaining < creditAmount

  const handleConfirm = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(STORAGE_KEY, "true")
      } catch {}
    }
    onOpenChange(false)
    onConfirm()
  }

  const handleCancel = () => {
    onOpenChange(false)
    onCancel?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-32px)] md:w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5 text-[#405D99]" />
            크레딧 차감 안내
          </DialogTitle>
          <DialogDescription>
            이 기능을 사용하면 크레딧이 차감됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5">
          {/* 기능 & 차감 금액 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">{featureName}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#405D99]">{creditAmount.toLocaleString()}</span>
              <span className="text-sm font-medium text-blue-700">크레딧</span>
            </div>
            {creditDetail && (
              <p className="text-xs text-blue-600 mt-1">{creditDetail}</p>
            )}
          </div>

          {/* 잔여 크레딧 정보 */}
          {remaining !== null && (
            <div className={`flex items-center justify-between rounded-lg p-3 text-sm ${
              isInsufficient 
                ? "bg-red-50 border border-red-200" 
                : "bg-gray-50 border border-gray-200"
            }`}>
              <span className={isInsufficient ? "text-red-700" : "text-gray-600"}>
                현재 잔여 크레딧
              </span>
              <span className={`font-bold ${isInsufficient ? "text-red-600" : "text-gray-900"}`}>
                {remaining.toLocaleString()}
              </span>
            </div>
          )}

          {isInsufficient && (
            <div className="flex items-center gap-2 mt-3 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>크레딧이 부족합니다. 크레딧을 충전해주세요.</span>
            </div>
          )}

          {remaining !== null && !isInsufficient && (
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              <span>차감 후 잔여</span>
              <span className="font-semibold text-gray-700">
                {(remaining - creditAmount).toLocaleString()} 크레딧
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-200">
          <div className="flex flex-col w-full gap-3">
            {/* 알림 끄기 체크박스 */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#405D99] focus:ring-[#405D99] cursor-pointer"
              />
              <span className="text-xs text-gray-500">
                크레딧 차감 알림을 앞으로 받지 않겠습니다
              </span>
            </label>

            {/* 버튼 */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancel}
                className="h-11 px-5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-all duration-200 touch-manipulation"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                disabled={isInsufficient}
                className="h-11 px-5 text-sm font-semibold text-white bg-[#405D99] hover:bg-[#2E4577] active:bg-[#1A2B52] disabled:bg-gray-300 disabled:text-gray-500 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 touch-manipulation"
              >
                {isInsufficient ? "크레딧 부족" : "확인 및 실행"}
              </button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 크레딧 확인 모달 숨김 여부 체크 유틸리티
 */
export function isCreditConfirmDismissed(): boolean {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem(STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

/**
 * 크레딧 확인 모달 표시 설정 리셋
 */
export function resetCreditConfirmDismissed(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}
