"use client"

import { useStores } from "@/lib/hooks/useStores"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { Loader2 } from "lucide-react"

export default function GoogleReviewsPage() {
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
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
          구글 비즈니스 리뷰 통계/현황분석
        </h1>
        <p className="text-muted-foreground">
          구글 비즈니스 프로필 리뷰를 실시간으로 수집하고 분석합니다.
        </p>
      </div>

      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-gray-600">
          구글 리뷰 관리 기능이 곧 추가됩니다! 🚀
        </p>
      </div>
    </div>
  )
}
