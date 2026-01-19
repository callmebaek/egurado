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
          <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)] mx-auto mb-3" />
          <p className="text-[var(--muted-foreground)] text-sm font-medium">대시보드를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 등록된 매장이 없음
  if (!hasStores) {
    return <EmptyStoreMessage />
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 환영 메시지 */}
      <div className="bg-gradient-to-br from-[var(--card)] to-[var(--muted)] p-8 rounded-2xl border border-[var(--border-light)] shadow-[var(--shadow-sm)]">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[var(--foreground)]">
          환영합니다 👋
        </h2>
        <p className="text-[var(--muted-foreground)] mt-3 text-[15px] leading-relaxed">
          <strong className="text-[var(--foreground)] font-medium">위플레이스</strong>에서 네이버 플레이스와 구글 비즈니스를 손쉽게 관리하세요.
        </p>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">
          현재 <strong className="text-[var(--foreground)] font-semibold">{storeCount}개</strong>의 매장이 등록되어 있습니다.
        </p>
      </div>

      {/* 주요 지표 카드 */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* 총 리뷰 카드 */}
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--card)] hover:shadow-[var(--shadow-lg)] transition-all duration-[var(--transition-base)] p-6 group">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[var(--muted-foreground)] mb-2">총 리뷰</p>
              <p className="text-3xl md:text-4xl font-semibold text-[var(--foreground)] tracking-tight">248</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-[var(--transition-base)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-6 w-6 text-blue-600"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-[13px] text-[var(--muted-foreground)] font-medium">
            <span className="text-green-600 font-semibold">↑ 12%</span> 지난 달 대비
          </p>
        </div>

        {/* 평균 평점 카드 */}
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--card)] hover:shadow-[var(--shadow-lg)] transition-all duration-[var(--transition-base)] p-6 group">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[var(--muted-foreground)] mb-2">평균 평점</p>
              <p className="text-3xl md:text-4xl font-semibold text-[var(--foreground)] tracking-tight">4.8</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-[var(--transition-base)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6 text-amber-500"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          </div>
          <p className="text-[13px] text-[var(--muted-foreground)] font-medium">
            <span className="text-green-600 font-semibold">↑ 0.2</span> 지난 달 대비
          </p>
        </div>

        {/* 답글 대기 카드 */}
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--card)] hover:shadow-[var(--shadow-lg)] transition-all duration-[var(--transition-base)] p-6 group">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[var(--muted-foreground)] mb-2">답글 대기</p>
              <p className="text-3xl md:text-4xl font-semibold text-[var(--foreground)] tracking-tight">15</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-[var(--transition-base)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-6 w-6 text-red-600"
              >
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <p className="text-[13px] text-[var(--muted-foreground)] font-medium">AI 답글 생성 가능</p>
        </div>

        {/* 키워드 순위 카드 */}
        <div className="rounded-2xl border border-[var(--border-light)] bg-gradient-to-br from-[var(--card)] to-[var(--muted)] hover:shadow-[var(--shadow-lg)] transition-all duration-[var(--transition-base)] p-6 group">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[var(--muted-foreground)] mb-2">키워드 순위</p>
              <p className="text-3xl md:text-4xl font-semibold text-[var(--foreground)] tracking-tight">3위</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-[var(--transition-base)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-6 w-6 text-green-600"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
          </div>
          <p className="text-[13px] text-[var(--muted-foreground)] font-medium">
            <span className="text-green-600 font-semibold">↑ 2단계</span> 상승
          </p>
        </div>
      </div>

      {/* 최근 리뷰 */}
      <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--card)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="p-6 md:p-8 border-b border-[var(--border-light)] bg-gradient-to-r from-[var(--card)] to-[var(--muted)]">
          <h3 className="text-xl md:text-2xl font-semibold text-[var(--foreground)] tracking-tight">최근 리뷰</h3>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-2 leading-relaxed">
            실시간으로 수집된 고객 리뷰를 확인하세요
          </p>
        </div>
        <div className="p-8 md:p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="w-10 h-10 text-blue-600"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-[15px] text-[var(--foreground)] font-medium mb-2">
              리뷰 데이터를 불러오는 중입니다...
            </p>
            <p className="text-[13px] text-[var(--muted-foreground)] leading-relaxed">
              등록된 매장의 네이버 플레이스와 구글 비즈니스 리뷰가 자동으로 수집됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


