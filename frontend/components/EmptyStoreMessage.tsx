"use client"

import Link from "next/link"
import { Store, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function EmptyStoreMessage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4 animate-fade-in">
      <Card className="w-full max-w-2xl border-2 border-dashed border-[var(--border)]">
        <CardContent className="p-8 md:p-12 text-center">
          {/* 아이콘 */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center animate-scale-in">
            <Store className="w-12 h-12 text-blue-600" />
          </div>

          {/* 메시지 */}
          <h2 className="text-3xl md:text-4xl font-semibold text-[var(--foreground)] mb-4 tracking-tight">
            등록된 매장이 없습니다
          </h2>
          <p className="text-[var(--muted-foreground)] mb-3 text-[15px] leading-relaxed">
            이 기능을 사용하려면 먼저 매장을 등록해주세요.
          </p>
          <p className="text-[13px] text-[var(--muted-foreground)] mb-8 leading-relaxed max-w-lg mx-auto">
            네이버 플레이스 또는 구글 비즈니스 프로필 매장을 연결하면
            <br />
            리뷰 관리, 순위 추적 등 다양한 기능을 사용할 수 있습니다.
          </p>

          {/* 버튼 */}
          <Link href="/dashboard/connect-store">
            <Button size="lg" className="gap-2 shadow-[var(--shadow-md)]">
              <Store className="w-5 h-5" />
              내 매장 등록하기
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>

          {/* 안내 */}
          <div className="mt-10 p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
            <p className="text-[15px] text-blue-900 font-semibold mb-3">
              💡 매장 등록 방법
            </p>
            <ol className="text-[13px] text-blue-800 text-left space-y-2 max-w-md mx-auto leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="font-semibold min-w-[20px]">1.</span>
                <span>"내 매장 등록하기" 버튼 클릭</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold min-w-[20px]">2.</span>
                <span>네이버 지도에서 매장 검색</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold min-w-[20px]">3.</span>
                <span>검색 결과에서 "연결" 버튼 클릭</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold min-w-[20px]">4.</span>
                <span>등록 완료! 🎉</span>
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
