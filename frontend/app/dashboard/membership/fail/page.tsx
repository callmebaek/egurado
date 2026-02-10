"use client"

/**
 * 결제 실패 페이지
 * 토스 결제위젯에서 결제 실패/취소 시 리다이렉트
 */
import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

function PaymentFailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const code = searchParams.get('code')
  const message = searchParams.get('message') || '결제가 취소되었거나 오류가 발생했습니다.'
  const orderId = searchParams.get('orderId')
  
  return (
    <div className="w-full max-w-xl mx-auto px-4 py-16 text-center">
      <Card className="p-12 rounded-xl shadow-lg">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-neutral-900 mb-4">
          결제 실패
        </h1>
        <p className="text-base text-neutral-600 mb-2">
          {decodeURIComponent(message)}
        </p>
        {code && (
          <p className="text-sm text-neutral-400 mb-8">
            오류 코드: {code}
          </p>
        )}
        <div className="space-y-3">
          <Button
            onClick={() => router.push('/dashboard/membership')}
            className="w-full h-14 text-lg font-bold"
          >
            다시 시도하기
          </Button>
          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="w-full h-12"
          >
            대시보드로 이동
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center">
        <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-6" />
        <p className="text-neutral-600">로딩 중...</p>
      </div>
    }>
      <PaymentFailContent />
    </Suspense>
  )
}
