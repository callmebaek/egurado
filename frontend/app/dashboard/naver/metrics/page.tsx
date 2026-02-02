"use client"

import { useStores } from "@/lib/hooks/useStores"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { Loader2, TrendingUp, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      {/* 헤더 섹션 - 홈페이지 스타일 */}
      <header className="mb-8 md:mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
            <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight">
            키워드 순위 추적
          </h1>
        </div>
        <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-3xl mx-auto mb-4">
          네이버 플레이스 지수와 주요 성과 지표(KPI)를<br className="md:hidden" />
          <span className="hidden md:inline"> </span>한눈에 확인하세요
        </p>
        <Badge 
          variant="secondary"
          className="bg-purple-100 text-purple-700 border-purple-200 px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
        >
          ✨ Pro 기능
        </Badge>
      </header>

      {/* Coming Soon 카드 */}
      <section>
        <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
          <CardContent className="p-10 md:p-16 text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
                <Clock className="w-12 h-12 md:w-16 md:h-16 text-purple-600" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900">
                  곧 만나요! 🚀
                </h2>
                <p className="text-base md:text-lg text-neutral-600 leading-relaxed">
                  플레이스 지수 관리 기능을 열심히 개발하고 있습니다.<br />
                  조금만 기다려주세요!
                </p>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6 md:p-8">
                <p className="text-sm md:text-base text-purple-900 font-semibold mb-2">
                  💡 출시 예정 기능
                </p>
                <ul className="text-sm md:text-base text-purple-700 space-y-2 text-left max-w-md mx-auto">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 mt-1">•</span>
                    <span>키워드별 순위 자동 추적</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 mt-1">•</span>
                    <span>플레이스 지수 변화 모니터링</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 mt-1">•</span>
                    <span>KPI 대시보드 및 리포트</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
