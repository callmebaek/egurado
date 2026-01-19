"use client"

import Link from "next/link"
import { Store, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function EmptyStoreMessage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-2xl border-2 border-dashed border-primary/30">
        <CardContent className="p-8 md:p-12 text-center">
          {/* 아이콘 */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Store className="w-10 h-10 text-primary" />
          </div>

          {/* 메시지 */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            등록된 매장이 없습니다
          </h2>
          <p className="text-gray-600 mb-2">
            이 기능을 사용하려면 먼저 매장을 등록해주세요.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            네이버 플레이스 또는 구글 비즈니스 프로필 매장을 연결하면
            <br />
            리뷰 관리, 순위 추적 등 다양한 기능을 사용할 수 있습니다.
          </p>

          {/* 버튼 */}
          <Link href="/dashboard/connect-store">
            <Button size="lg" className="gap-2">
              <Store className="w-5 h-5" />
              내 매장 등록하기
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>

          {/* 안내 */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 font-medium mb-2">
              💡 매장 등록 방법
            </p>
            <ol className="text-xs text-blue-700 text-left space-y-1 max-w-md mx-auto">
              <li>1. "내 매장 등록하기" 버튼 클릭</li>
              <li>2. 네이버 지도에서 매장 검색</li>
              <li>3. 검색 결과에서 "연결" 버튼 클릭</li>
              <li>4. 등록 완료! 🎉</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
