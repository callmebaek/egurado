"use client"

/**
 * 결제 성공 페이지
 * 토스 결제위젯에서 결제 완료 후 리다이렉트되는 페이지
 * successUrl로 전달된 paymentKey, orderId, amount를 서버에 전달하여 결제 확인
 */
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { getToken } = useAuth()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('')
  const [tier, setTier] = useState('')
  
  useEffect(() => {
    const confirmPayment = async () => {
      const paymentKey = searchParams.get('paymentKey')
      const orderId = searchParams.get('orderId')
      const amount = searchParams.get('amount')
      
      if (!paymentKey || !orderId || !amount) {
        setStatus('error')
        setMessage('결제 정보가 올바르지 않습니다.')
        return
      }
      
      try {
        const token = getToken()
        const response = await fetch(`${API_URL}/api/v1/payments/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            payment_key: paymentKey,
            order_id: orderId,
            amount: parseInt(amount),
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          setStatus('success')
          setTier(data.tier || '')
          setMessage(data.message || '결제가 완료되었습니다.')
        } else {
          setStatus('error')
          setMessage(data.message || '결제 확인에 실패했습니다.')
        }
      } catch (error) {
        console.error('결제 확인 오류:', error)
        setStatus('error')
        setMessage('결제 확인 중 오류가 발생했습니다.')
      }
    }
    
    confirmPayment()
  }, [searchParams, getToken, API_URL])
  
  const tierNames: Record<string, string> = {
    basic: 'Basic',
    basic_plus: 'Basic+',
    pro: 'Pro',
    custom: 'Custom',
  }
  
  if (status === 'processing') {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center">
        <Card className="p-12 rounded-xl shadow-lg">
          <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">결제 확인 중...</h1>
          <p className="text-neutral-600">잠시만 기다려주세요. 결제를 확인하고 있습니다.</p>
        </Card>
      </div>
    )
  }
  
  if (status === 'success') {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center">
        <Card className="p-12 rounded-xl shadow-lg">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-neutral-900 mb-4">
            🎉 구독 완료!
          </h1>
          <p className="text-lg text-neutral-600 mb-2">
            <strong className="text-blue-600">{tierNames[tier] || tier}</strong> 플랜이 활성화되었습니다.
          </p>
          <p className="text-base text-neutral-500 mb-8">
            {message}
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full h-14 text-lg font-bold"
            >
              대시보드로 이동
            </Button>
            <Button
              onClick={() => router.push('/dashboard/membership')}
              variant="outline"
              className="w-full h-12"
            >
              멤버십 관리
            </Button>
          </div>
        </Card>
      </div>
    )
  }
  
  // error
  return (
    <div className="w-full max-w-xl mx-auto px-4 py-16 text-center">
      <Card className="p-12 rounded-xl shadow-lg">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-neutral-900 mb-4">
          결제 확인 실패
        </h1>
        <p className="text-base text-neutral-600 mb-8">
          {message}
        </p>
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

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center">
        <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-6" />
        <p className="text-neutral-600">로딩 중...</p>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
