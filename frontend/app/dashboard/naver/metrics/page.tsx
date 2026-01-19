"use client"

import { useStores } from "@/lib/hooks/useStores"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { Loader2 } from "lucide-react"

export default function NaverMetricsPage() {
  const { hasStores, isLoading } = useStores()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">매장 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!hasStores) {
    return <EmptyStoreMessage />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
          플레이스 지수 관리 - 주요 KPI 현황
        </h1>
        <span className="px-2 py-1 text-xs font-semibold bg-amber-500 text-white rounded">
          Pro
        </span>
      </div>
      <p className="text-muted-foreground">
        네이버 플레이스 지수와 주요 성과 지표(KPI)를 한눈에 확인하세요.
      </p>

      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-gray-600">
          플레이스 지수 관리 기능이 곧 추가됩니다! 📊
        </p>
      </div>
    </div>
  )
}
