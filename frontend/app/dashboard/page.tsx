"use client"

/**
 * 대시보드 메인 페이지
 * 주요 지표 및 현황 표시
 * 반응형 디자인 최적화
 */
import { useStores } from "@/lib/hooks/useStores"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { Loader2 } from "lucide-react"

export default function DashboardPage() {
  const { hasStores, isLoading, storeCount } = useStores()

  // 로딩 중
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">대시보드를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 등록된 매장이 없음
  if (!hasStores) {
    return <EmptyStoreMessage />
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 환영 메시지 */}
      <div className="bg-gradient-to-r from-olive-50 to-olive-100 p-6 rounded-lg border border-olive-200">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-olive-900">
          환영합니다! 👋
        </h2>
        <p className="text-olive-700 mt-2">
          <strong className="text-olive-800">이거라도</strong>에서 네이버 플레이스와 구글 비즈니스를 손쉽게 관리하세요.
        </p>
        <p className="text-sm text-olive-600 mt-1">
          현재 <strong className="text-olive-800">{storeCount}개</strong>의 매장이 등록되어 있습니다.
        </p>
      </div>

      {/* 주요 지표 카드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 총 리뷰 카드 */}
        <div className="rounded-lg border border-olive-200 bg-white hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-olive-600">총 리뷰</p>
              <p className="text-2xl md:text-3xl font-bold text-olive-900">248</p>
            </div>
            <div className="text-olive-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-8 w-8 md:h-10 md:w-10"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-olive-600 mt-2 font-medium">
            <span className="text-green-600">↑ 12%</span> 지난 달 대비
          </p>
        </div>

        {/* 평균 평점 카드 */}
        <div className="rounded-lg border border-amber-200 bg-white hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700">평균 평점</p>
              <p className="text-2xl md:text-3xl font-bold text-amber-900">4.8</p>
            </div>
            <div className="text-amber-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-8 w-8 md:h-10 md:w-10"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-amber-700 mt-2 font-medium">
            <span className="text-green-600">↑ 0.2</span> 지난 달 대비
          </p>
        </div>

        {/* 답글 대기 카드 */}
        <div className="rounded-lg border border-red-200 bg-white hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">답글 대기</p>
              <p className="text-2xl md:text-3xl font-bold text-red-900">15</p>
            </div>
            <div className="text-red-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-8 w-8 md:h-10 md:w-10"
              >
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-red-600 mt-2 font-medium">AI 답글 생성 가능</p>
        </div>

        {/* 키워드 순위 카드 */}
        <div className="rounded-lg border border-olive-200 bg-gradient-to-br from-olive-50 to-olive-100 hover:shadow-lg transition-shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-olive-700">키워드 순위</p>
              <p className="text-2xl md:text-3xl font-bold text-olive-900">3위</p>
            </div>
            <div className="text-olive-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-8 w-8 md:h-10 md:w-10"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-olive-700 mt-2 font-medium">
            <span className="text-green-600">↑ 2단계</span> 상승
          </p>
        </div>
      </div>

      {/* 최근 리뷰 */}
      <div className="rounded-lg border border-olive-200 bg-white shadow-sm">
        <div className="p-4 md:p-6 border-b border-olive-100 bg-gradient-to-r from-olive-50 to-white">
          <h3 className="text-lg md:text-xl font-semibold text-olive-900">최근 리뷰</h3>
          <p className="text-sm text-olive-600 mt-1">
            실시간으로 수집된 고객 리뷰를 확인하세요
          </p>
        </div>
        <div className="p-6 md:p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-olive-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="w-8 h-8 text-olive-600"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm text-olive-700 font-medium">
              리뷰 데이터를 불러오는 중입니다...
            </p>
            <p className="text-xs text-olive-600 mt-2">
              등록된 매장의 네이버 플레이스와 구글 비즈니스 리뷰가 자동으로 수집됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


