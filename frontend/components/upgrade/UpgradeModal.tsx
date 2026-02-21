"use client"

/**
 * 구독 업그레이드 안내 모달
 * - Tier 제한 초과 시 업그레이드 유도
 * - CreditConfirmModal과 동일한 디자인 톤
 */
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Crown, AlertTriangle, Store, Search, BarChart3, ArrowRight } from "lucide-react"

export type UpgradeLimitType = "store" | "keyword" | "tracker" | "auto_collection" | "feature"

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 제한 유형 */
  limitType: UpgradeLimitType
  /** 현재 사용 수량 */
  currentCount?: number
  /** 최대 허용 수량 */
  maxCount?: number
  /** 현재 tier */
  currentTier?: string
  /** 추가 메시지 (백엔드 에러 메시지 등) */
  message?: string
}

const LIMIT_INFO: Record<UpgradeLimitType, {
  icon: React.ReactNode
  label: string
  unit: string
  description: string
}> = {
  store: {
    icon: <Store className="w-5 h-5" />,
    label: "매장 등록",
    unit: "개",
    description: "더 많은 매장을 등록하고 관리하려면 플랜을 업그레이드하세요.",
  },
  keyword: {
    icon: <Search className="w-5 h-5" />,
    label: "키워드 등록",
    unit: "개",
    description: "더 많은 키워드를 등록하고 순위를 추적하려면 플랜을 업그레이드하세요.",
  },
  tracker: {
    icon: <BarChart3 className="w-5 h-5" />,
    label: "추적 키워드",
    unit: "개",
    description: "더 많은 키워드를 자동 추적하려면 플랜을 업그레이드하세요.",
  },
  auto_collection: {
    icon: <BarChart3 className="w-5 h-5" />,
    label: "자동 수집",
    unit: "개",
    description: "자동 수집 기능을 사용하려면 플랜을 업그레이드하세요.",
  },
  feature: {
    icon: <Crown className="w-5 h-5" />,
    label: "기능 제한",
    unit: "",
    description: "이 기능을 사용하려면 플랜을 업그레이드하세요.",
  },
}

const TIER_NAMES: Record<string, string> = {
  free: "무료",
  basic: "베이직",
  basic_plus: "베이직 플러스",
  pro: "프로",
  god: "갓",
}

export function UpgradeModal({
  open,
  onOpenChange,
  limitType,
  currentCount,
  maxCount,
  currentTier,
  message,
}: UpgradeModalProps) {
  const router = useRouter()
  const info = LIMIT_INFO[limitType]
  const tierName = currentTier ? TIER_NAMES[currentTier] || currentTier : "현재"

  const handleUpgrade = () => {
    onOpenChange(false)
    router.push("/dashboard/membership")
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-32px)] md:w-[440px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            플랜 업그레이드 필요
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mt-1">
            {tierName} 플랜의 {info.label} 한도에 도달했습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          {/* 현재 상태 표시 */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-amber-600">
                {info.icon}
              </div>
              <span className="text-sm font-semibold text-amber-900">{info.label} 제한</span>
            </div>

            {currentCount !== undefined && maxCount !== undefined && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-amber-700">사용량</span>
                  <span className="font-bold text-amber-900">
                    {currentCount} / {maxCount}{info.unit}
                  </span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-2">
                  <div
                    className="bg-amber-500 rounded-full h-2 transition-all"
                    style={{
                      width: `${Math.min((currentCount / maxCount) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-amber-700 leading-relaxed">
              {message || info.description}
            </p>
          </div>

          {/* 업그레이드 혜택 안내 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">업그레이드 혜택</span>
            </div>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2 text-xs text-blue-700">
                <span className="text-blue-500 mt-0.5">•</span>
                더 많은 매장 등록 및 키워드 추적
              </li>
              <li className="flex items-start gap-2 text-xs text-blue-700">
                <span className="text-blue-500 mt-0.5">•</span>
                월간 크레딧 대폭 증가
              </li>
              <li className="flex items-start gap-2 text-xs text-blue-700">
                <span className="text-blue-500 mt-0.5">•</span>
                자동 순위 수집 및 알림 기능
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-200">
          <div className="flex gap-2 justify-end w-full">
            <button
              onClick={handleClose}
              className="h-11 px-5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition-all duration-200 touch-manipulation"
            >
              닫기
            </button>
            <button
              onClick={handleUpgrade}
              className="h-11 px-5 text-sm font-semibold text-white bg-gradient-to-r from-[#405D99] to-[#2E4577] hover:from-[#2E4577] hover:to-[#1A2B52] active:from-[#1A2B52] active:to-[#1A2B52] rounded-lg shadow-sm hover:shadow-md transition-all duration-200 touch-manipulation flex items-center gap-2"
            >
              <Crown className="w-4 h-4" />
              업그레이드 하러가기
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
