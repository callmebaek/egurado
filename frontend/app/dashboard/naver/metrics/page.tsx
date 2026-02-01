"use client"

import { useStores } from "@/lib/hooks/useStores"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8 min-h-screen bg-neutral-50">
      {/* 헤더 */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 mb-1.5">
          <h1 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
            플레이스 지수 관리 - 주요 KPI 현황
          </h1>
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold">
            Pro
          </Badge>
        </div>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          네이버 플레이스 지수와 주요 성과 지표(KPI)를 한눈에 확인하세요
        </p>
      </div>

      {/* Coming Soon 카드 */}
      <Card className="p-6 md:p-8 shadow-sm border-neutral-200 text-center">
        <p className="text-sm md:text-base text-neutral-600">
          플레이스 지수 관리 기능이 곧 추가됩니다! 📊
        </p>
      </Card>
    </div>
  )
}
