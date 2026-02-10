"use client"

/**
 * 멤버십 관리 페이지
 * 결제 플로우: 요금제 선택 → 쿠폰 적용 → 약관 동의 → 토스 결제위젯 → 완료
 */
import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'
import { 
  Crown, 
  Check,
  X,
  CreditCard,
  Calendar,
  Zap,
  Users,
  Key,
  TrendingUp,
  Sparkles,
  Shield,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Star,
  Tag,
  ChevronLeft,
  FileText,
  CheckCircle,
  XCircle,
  Gift,
  BadgePercent,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ============================================
// Types
// ============================================

interface Subscription {
  tier: string
  status: string
  monthly_credits: number
  max_stores: number
  max_keywords: number
  max_auto_collection: number
  next_billing_date?: string
  expires_at?: string
  cancelled_at?: string
  payment_method?: string
  auto_renewal?: boolean
}

interface Plan {
  tier: string
  name: string
  price: number
  priceDisplay: string
  priceNote: string
  description: string
  popular: boolean
  credits: number
  stores: number
  keywords: number
  autoCollection: number
  features: string[]
  icon: any
  color: string
}

interface CheckoutData {
  order_id: string
  order_name: string
  amount: number
  original_amount: number
  discount_amount: number
  coupon_applied: boolean
  coupon_code: string | null
  customer_key: string
  tier: string
  is_upgrade: boolean
}

// ============================================
// Plans 데이터
// ============================================

const PLANS: Plan[] = [
  {
    tier: 'free',
    name: 'Free',
    price: 0,
    priceDisplay: '₩0',
    priceNote: '영구 무료',
    description: '플레이스 관리를 처음 시작하는 분',
    popular: false,
    credits: 100,
    stores: 1,
    keywords: 1,
    autoCollection: 0,
    features: [
      '매장 1개',
      '키워드 1개',
      '월 100 크레딧',
      '플레이스 진단',
      '키워드 순위 조회',
    ],
    icon: Sparkles,
    color: 'from-gray-400 to-gray-500'
  },
  {
    tier: 'basic',
    name: 'Basic',
    price: 29000,
    priceDisplay: '₩29,000',
    priceNote: '/ 월',
    description: '주 2-3회 플레이스를 관리하는 분',
    popular: false,
    credits: 600,
    stores: 3,
    keywords: 10,
    autoCollection: 3,
    features: [
      '매장 3개',
      '키워드 10개',
      '월 600 크레딧',
      '자동 순위 수집 3개',
      '리뷰 분석',
      '경쟁매장 분석',
    ],
    icon: TrendingUp,
    color: 'from-blue-400 to-indigo-500'
  },
  {
    tier: 'basic_plus',
    name: 'Basic+',
    price: 49000,
    priceDisplay: '₩49,000',
    priceNote: '/ 월',
    description: '빡세게 플레이스를 관리하는 분',
    popular: true,
    credits: 1200,
    stores: 4,
    keywords: 6,
    autoCollection: 6,
    features: [
      '매장 4개',
      '키워드 6개',
      '월 1,200 크레딧',
      '자동 순위 수집 6개',
      '우선 고객 지원',
    ],
    icon: Zap,
    color: 'from-purple-400 to-pink-500'
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: 89000,
    priceDisplay: '₩89,000',
    priceNote: '/ 월',
    description: '파워 유저 및 다점포 관리자',
    popular: false,
    credits: 3000,
    stores: 10,
    keywords: 50,
    autoCollection: 15,
    features: [
      '매장 10개',
      '키워드 50개',
      '월 3,000 크레딧',
      '자동 순위 수집 15개',
      '전담 계정 매니저',
    ],
    icon: Crown,
    color: 'from-yellow-400 to-orange-500'
  },
]

// ============================================
// 결제 플로우 단계
// ============================================

type PaymentStep = 'select' | 'checkout' | 'processing' | 'complete'

export default function MembershipPage() {
  const { user, getToken } = useAuth()
  const { toast } = useToast()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  
  // 상태
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [step, setStep] = useState<PaymentStep>('select')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null)
  
  // 쿠폰
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState<any>(null)
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false)
  
  // 약관 동의
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeRefund, setAgreeRefund] = useState(false)
  const [agreePayment, setAgreePayment] = useState(false)
  const allAgreed = agreeTerms && agreePrivacy && agreeRefund && agreePayment
  
  // 처리 상태
  const [isProcessing, setIsProcessing] = useState(false)
  
  // 취소 관련
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelInfo, setCancelInfo] = useState<any>(null)
  const [keepStoreIds, setKeepStoreIds] = useState<string[]>([])
  const [keepKeywordIds, setKeepKeywordIds] = useState<string[]>([])
  const [cancelReason, setCancelReason] = useState('')
  
  // ============================================
  // 구독 정보 로드
  // ============================================
  
  useEffect(() => {
    const loadSubscription = async () => {
      if (!user) return
      
      try {
        const token = getToken()
        const response = await fetch(`${API_URL}/api/v1/subscriptions/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (response.ok) {
          const data = await response.json()
          setSubscription(data)
        } else {
          setSubscription({
            tier: user.subscription_tier || 'free',
            status: 'active',
            monthly_credits: 100,
            max_stores: 1,
            max_keywords: 1,
            max_auto_collection: 0,
          })
        }
      } catch (error) {
        console.error('구독 정보 로드 실패:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSubscription()
  }, [user, getToken, API_URL])
  
  // ============================================
  // 쿠폰 검증
  // ============================================
  
  const validateCoupon = async () => {
    if (!couponCode.trim() || !selectedPlan) return
    
    setIsValidatingCoupon(true)
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/v1/payments/validate-coupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: couponCode.trim(),
          tier: selectedPlan.tier
        })
      })
      
      const data = await response.json()
      setCouponResult(data)
      
      if (data.valid) {
        toast({ title: "🎉 쿠폰 적용!", description: data.message })
      } else {
        toast({ variant: "destructive", title: "쿠폰 오류", description: data.message })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "오류", description: "쿠폰 확인 중 오류가 발생했습니다." })
    } finally {
      setIsValidatingCoupon(false)
    }
  }
  
  // ============================================
  // 체크아웃 생성 & 결제 진행
  // ============================================
  
  const handleCheckout = async () => {
    if (!selectedPlan || !allAgreed) return
    
    setIsProcessing(true)
    try {
      const token = getToken()
      
      // 1. 체크아웃 생성
      const checkoutResponse = await fetch(`${API_URL}/api/v1/payments/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tier: selectedPlan.tier,
          coupon_code: couponResult?.valid ? couponCode.trim() : null,
          agree_terms: agreeTerms,
          agree_privacy: agreePrivacy,
          agree_refund: agreeRefund,
          agree_payment: agreePayment,
        })
      })
      
      if (!checkoutResponse.ok) {
        const error = await checkoutResponse.json()
        throw new Error(error.detail || '체크아웃 생성 실패')
      }
      
      const checkout: CheckoutData = await checkoutResponse.json()
      setCheckoutData(checkout)
      
      // 2. 토스 결제위젯 호출
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      if (!clientKey) {
        throw new Error('결제 설정이 올바르지 않습니다.')
      }
      
      // 동적 import로 토스 SDK 로드
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk')
      const tossPayments = await loadTossPayments(clientKey)
      
      const payment = tossPayments.payment({
        customerKey: checkout.customer_key,
      })
      
      // 결제 요청
      await payment.requestPayment({
        method: "CARD",
        amount: {
          currency: "KRW",
          value: checkout.amount,
        },
        orderId: checkout.order_id,
        orderName: checkout.order_name,
        customerEmail: user?.email,
        customerName: user?.display_name || user?.email?.split('@')[0] || '고객',
        successUrl: `${window.location.origin}/dashboard/membership/success?orderId=${checkout.order_id}`,
        failUrl: `${window.location.origin}/dashboard/membership/fail?orderId=${checkout.order_id}`,
        card: {
          useEscrow: false,
          flowMode: "DEFAULT",
          useCardPoint: false,
          useAppCardOnly: false,
        },
      })
      
    } catch (error: any) {
      console.error('결제 오류:', error)
      if (error?.code !== 'USER_CANCEL') {
        toast({
          variant: "destructive",
          title: "결제 오류",
          description: error.message || "결제 진행 중 오류가 발생했습니다.",
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }
  
  // ============================================
  // 구독 취소
  // ============================================
  
  const loadCancelInfo = async () => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/v1/subscriptions/cancel-info`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCancelInfo(data)
        // 기본적으로 첫 번째 매장과 키워드 선택
        if (data.stores?.length > 0) {
          setKeepStoreIds([data.stores[0].id])
        }
        if (data.keywords?.length > 0) {
          setKeepKeywordIds([data.keywords[0].id])
        }
      }
    } catch (error) {
      console.error('취소 정보 로드 실패:', error)
    }
  }
  
  const handleCancelSubscription = async () => {
    setIsProcessing(true)
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/v1/subscriptions/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: cancelReason,
          keep_store_ids: keepStoreIds,
          keep_keyword_ids: keepKeywordIds,
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        toast({
          title: "구독 취소 완료",
          description: data.message,
        })
        setShowCancelDialog(false)
        window.location.reload()
      } else {
        const error = await response.json()
        throw new Error(error.detail || '구독 취소 실패')
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "취소 실패",
        description: error.message || "구독 취소에 실패했습니다.",
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  // ============================================
  // Helpers
  // ============================================
  
  const currentPlan = PLANS.find(p => p.tier === subscription?.tier) || PLANS[0]
  const TIER_ORDER: Record<string, number> = { free: 0, basic: 1, basic_plus: 2, pro: 3 }
  
  const isUpgrade = (targetTier: string) => {
    const currentOrder = TIER_ORDER[subscription?.tier || 'free'] || 0
    const targetOrder = TIER_ORDER[targetTier] || 0
    return targetOrder > currentOrder
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(amount)
  }

  // 결제 금액 계산
  const getPaymentAmount = () => {
    if (!selectedPlan) return 0
    let amount = selectedPlan.price
    if (couponResult?.valid && couponResult.discount_value) {
      if (couponResult.discount_type === 'percentage') {
        amount = Math.max(0, amount - Math.floor(amount * couponResult.discount_value / 100))
      } else {
        amount = Math.max(0, amount - couponResult.discount_value)
      }
    }
    return amount
  }
  
  // ============================================
  // RENDER: 요금제 선택 화면
  // ============================================
  
  if (step === 'select') {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
        {/* 헤더 */}
        <header className="mb-8 md:mb-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <Crown className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight">
              멤버십 관리
            </h1>
          </div>
          <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-3xl mx-auto">
            비즈니스에 맞는 요금제를 선택하세요
          </p>
        </header>

        <div className="space-y-6 md:space-y-8">
          {/* 현재 구독 정보 */}
          <section>
            <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
              <div className="bg-white p-6 md:p-8">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                  </div>
                ) : subscription ? (
                  <div>
                    <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 bg-gradient-to-br ${currentPlan.color} rounded-xl flex items-center justify-center shadow-md`}>
                          <currentPlan.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-neutral-600">현재 요금제</div>
                          <div className="text-3xl font-extrabold text-neutral-900">{currentPlan.name}</div>
                        </div>
                      </div>
                      {subscription.status === 'cancelled' && (
                        <div className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-bold">
                          ⚠️ 취소됨 - {subscription.expires_at ? formatDate(subscription.expires_at) + '까지 이용 가능' : ''}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-900">월간 크레딧</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-700">
                          {subscription.monthly_credits === -1 ? '무제한' : subscription.monthly_credits.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-semibold text-purple-900">매장 수</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-700">
                          {subscription.max_stores === -1 ? '무제한' : `${subscription.max_stores}개`}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Key className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-green-900">키워드 수</span>
                        </div>
                        <div className="text-2xl font-bold text-green-700">
                          {subscription.max_keywords === -1 ? '무제한' : `${subscription.max_keywords}개`}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-orange-600" />
                          <span className="text-xs font-semibold text-orange-900">자동 수집</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-700">
                          {subscription.max_auto_collection === -1 ? '무제한' : `${subscription.max_auto_collection}개`}
                        </div>
                      </div>
                    </div>

                    {subscription.next_billing_date && subscription.status === 'active' && (
                      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-gray-600" />
                            <div>
                              <div className="text-sm font-semibold text-neutral-900">다음 결제일</div>
                              <div className="text-xs text-neutral-600">{formatDate(subscription.next_billing_date)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </Card>
          </section>

          {/* 요금제 목록 */}
          <section>
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">요금제 비교</h2>
              <p className="text-base text-neutral-600">내게 맞는 플랜을 선택하세요</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PLANS.map((plan) => {
                const Icon = plan.icon
                const isCurrent = plan.tier === subscription?.tier
                const canUpgrade = isUpgrade(plan.tier)
                
                return (
                  <Card
                    key={plan.tier}
                    className={`rounded-xl overflow-hidden transition-all duration-200 ${
                      plan.popular
                        ? 'border-4 border-purple-400 shadow-2xl md:scale-105'
                        : 'border-2 border-neutral-300 shadow-lg hover:shadow-xl'
                    } ${isCurrent ? 'ring-4 ring-green-400' : ''}`}
                  >
                    {plan.popular && (
                      <div className="bg-purple-500 text-white text-center py-2 font-bold text-sm">
                        ⭐ 가장 인기있는 플랜
                      </div>
                    )}
                    
                    <div className="p-5 md:p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center`}>
                          <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl md:text-2xl font-bold text-neutral-900">{plan.name}</h3>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600">
                              <Check className="w-3 h-3" /> 현재 플랜
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-2xl md:text-3xl font-extrabold text-neutral-900 mb-1">
                          {plan.priceDisplay}
                        </div>
                        <div className="text-sm text-neutral-600">{plan.priceNote}</div>
                      </div>

                      <p className="text-sm text-neutral-600 mb-4 leading-relaxed">{plan.description}</p>

                      <div className="space-y-2 mb-6">
                        {plan.features.map((feature, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-neutral-700">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {!isCurrent && plan.tier !== 'free' && (
                        <Button
                          onClick={() => {
                            setSelectedPlan(plan)
                            setCouponCode('')
                            setCouponResult(null)
                            setAgreeTerms(false)
                            setAgreePrivacy(false)
                            setAgreeRefund(false)
                            setAgreePayment(false)
                            setStep('checkout')
                          }}
                          className={`w-full h-12 text-base font-bold ${
                            plan.popular ? 'bg-purple-500 hover:bg-purple-600' : ''
                          }`}
                        >
                          {canUpgrade ? '업그레이드' : '구독하기'}
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                      )}
                      {isCurrent && (
                        <div className="w-full h-12 flex items-center justify-center bg-green-50 rounded-lg border-2 border-green-200">
                          <span className="text-sm font-bold text-green-600 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" /> 현재 이용 중
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>

          {/* 구독 취소 섹션 */}
          {subscription && subscription.tier !== 'free' && subscription.tier !== 'god' && subscription.status === 'active' && (
            <section>
              <Card className="rounded-xl border-2 border-red-300 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b-2 border-red-200 p-5 md:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-md">
                      <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-neutral-900">구독 취소</h2>
                      <p className="text-sm text-red-700 mt-0.5">신중하게 진행해주세요</p>
                    </div>
                  </div>
                </div>
                <div className="p-5 md:p-6">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4 space-y-2">
                    <p className="text-sm text-red-700 font-medium">⚠️ 구독 취소 시 안내사항:</p>
                    <ul className="text-sm text-red-600 space-y-1 list-disc list-inside">
                      <li>현재 결제 기간이 끝나면 Free 플랜으로 전환됩니다.</li>
                      <li>Free 플랜은 매장 1개, 키워드 1개만 유지 가능합니다.</li>
                      <li>선택하지 않은 매장과 키워드의 <strong>데이터가 영구 삭제</strong>됩니다.</li>
                      <li>미사용 크레딧은 서비스 종료 시 소멸됩니다.</li>
                    </ul>
                  </div>
                  <Button
                    onClick={() => {
                      loadCancelInfo()
                      setShowCancelDialog(true)
                    }}
                    variant="destructive"
                    className="h-12 px-8 text-base font-bold"
                  >
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    구독 취소
                  </Button>
                </div>
              </Card>
            </section>
          )}
        </div>

        {/* 구독 취소 다이얼로그 */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                구독 취소 확인
              </DialogTitle>
              <DialogDescription className="text-base text-neutral-700 pt-2">
                Free 티어로 전환 시 유지할 매장과 키워드를 선택해주세요.
              </DialogDescription>
            </DialogHeader>

            {cancelInfo ? (
              <div className="space-y-6 py-4">
                {/* 경고 메시지 */}
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl">
                  <p className="text-red-700 font-bold text-base mb-2">⚠️ 데이터 삭제 경고</p>
                  <p className="text-sm text-red-600">
                    선택하지 않은 매장과 키워드의 모든 데이터(순위 기록, 리뷰 분석, 추적 내역 등)가 
                    <strong className="underline"> 영구적으로 삭제</strong>됩니다. 이 작업은 되돌릴 수 없습니다.
                  </p>
                </div>
                
                {/* 서비스 종료일 */}
                {cancelInfo.service_end_date && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>서비스 종료일:</strong> {formatDate(cancelInfo.service_end_date)}
                      <br />종료일까지 현재 플랜의 모든 기능을 이용하실 수 있습니다.
                    </p>
                  </div>
                )}

                {/* 매장 선택 */}
                <div>
                  <h4 className="font-bold text-neutral-900 mb-2">
                    유지할 매장 선택 (최대 {cancelInfo.free_tier_limits?.max_stores || 1}개)
                  </h4>
                  <div className="space-y-2">
                    {(cancelInfo.stores || []).map((store: any) => (
                      <label
                        key={store.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          keepStoreIds.includes(store.id)
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={keepStoreIds.includes(store.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const maxStores = cancelInfo.free_tier_limits?.max_stores || 1
                              if (keepStoreIds.length < maxStores) {
                                setKeepStoreIds([...keepStoreIds, store.id])
                              }
                            } else {
                              setKeepStoreIds(keepStoreIds.filter(id => id !== store.id))
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium text-neutral-900">{store.store_name}</span>
                        <span className="text-xs text-neutral-500">{store.platform}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 키워드 선택 */}
                <div>
                  <h4 className="font-bold text-neutral-900 mb-2">
                    유지할 키워드 선택 (최대 {cancelInfo.free_tier_limits?.max_keywords || 1}개)
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(cancelInfo.keywords || []).map((kw: any) => (
                      <label
                        key={kw.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          keepKeywordIds.includes(kw.id)
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={keepKeywordIds.includes(kw.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const maxKw = cancelInfo.free_tier_limits?.max_keywords || 1
                              if (keepKeywordIds.length < maxKw) {
                                setKeepKeywordIds([...keepKeywordIds, kw.id])
                              }
                            } else {
                              setKeepKeywordIds(keepKeywordIds.filter(id => id !== kw.id))
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium text-neutral-900">{kw.keyword}</span>
                        {kw.current_rank && (
                          <span className="text-xs text-blue-600 font-medium">#{kw.current_rank}</span>
                        )}
                        {kw.stores?.store_name && (
                          <span className="text-xs text-neutral-500">({kw.stores.store_name})</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* 취소 사유 */}
                <div>
                  <h4 className="font-bold text-neutral-900 mb-2">취소 사유 (선택)</h4>
                  <Input
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="취소 사유를 알려주시면 서비스 개선에 참고하겠습니다."
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={isProcessing} className="h-12 px-6">
                돌아가기
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelSubscription}
                disabled={isProcessing || !cancelInfo}
                className="h-12 px-6"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 처리 중...</>
                ) : (
                  '구독 취소 확인'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
  
  // ============================================
  // RENDER: 체크아웃 화면 (쿠폰 + 약관 동의 + 결제)
  // ============================================
  
  if (step === 'checkout' && selectedPlan) {
    const finalAmount = getPaymentAmount()
    
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* 뒤로가기 */}
        <button
          onClick={() => {
            setStep('select')
            setSelectedPlan(null)
          }}
          className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">요금제 선택으로 돌아가기</span>
        </button>

        <div className="space-y-6">
          {/* 선택한 플랜 요약 */}
          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            <div className={`bg-gradient-to-r ${selectedPlan.color} p-6 text-white`}>
              <div className="flex items-center gap-3">
                <selectedPlan.icon className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">{selectedPlan.name} 플랜</h2>
                  <p className="text-sm opacity-90">{selectedPlan.description}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-neutral-600">월간 크레딧</div>
                  <div className="text-lg font-bold text-neutral-900">{selectedPlan.credits.toLocaleString()}</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-neutral-600">매장 / 키워드</div>
                  <div className="text-lg font-bold text-neutral-900">{selectedPlan.stores}개 / {selectedPlan.keywords}개</div>
                </div>
              </div>
            </div>
          </Card>

          {/* 쿠폰 입력 */}
          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold text-neutral-900">할인 쿠폰</h3>
            </div>
            <div className="flex gap-2">
              <Input
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase())
                  setCouponResult(null)
                }}
                placeholder="쿠폰 코드를 입력하세요"
                className="flex-1 h-12 text-base"
              />
              <Button
                onClick={validateCoupon}
                disabled={!couponCode.trim() || isValidatingCoupon}
                className="h-12 px-6"
                variant="outline"
              >
                {isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : '적용'}
              </Button>
            </div>
            {couponResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${
                couponResult.valid
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {couponResult.valid ? (
                  <div className="flex items-center gap-2">
                    <BadgePercent className="w-4 h-4" />
                    <span>{couponResult.message}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    <span>{couponResult.message}</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* 결제 금액 */}
          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg p-6">
            <h3 className="text-lg font-bold text-neutral-900 mb-4">결제 금액</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">{selectedPlan.name} 월 구독료</span>
                <span className="font-medium">{formatPrice(selectedPlan.price)}</span>
              </div>
              {couponResult?.valid && (
                <div className="flex justify-between items-center text-green-600">
                  <span>쿠폰 할인 ({couponResult.discount_value}{couponResult.discount_type === 'percentage' ? '%' : '원'})</span>
                  <span className="font-medium">-{formatPrice(selectedPlan.price - finalAmount)}</span>
                </div>
              )}
              <div className="border-t-2 border-gray-200 pt-3 flex justify-between items-center">
                <span className="text-lg font-bold text-neutral-900">결제 금액</span>
                <span className="text-2xl font-extrabold text-blue-600">{formatPrice(finalAmount)}</span>
              </div>
              <p className="text-xs text-neutral-500">* 매월 자동 결제됩니다. 언제든 취소 가능합니다.</p>
            </div>
          </Card>

          {/* 약관 동의 */}
          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-neutral-900">약관 동의</h3>
            </div>
            
            {/* 전체 동의 */}
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={allAgreed}
                onChange={(e) => {
                  const checked = e.target.checked
                  setAgreeTerms(checked)
                  setAgreePrivacy(checked)
                  setAgreeRefund(checked)
                  setAgreePayment(checked)
                }}
                className="w-5 h-5 accent-blue-600"
              />
              <span className="text-base font-bold text-neutral-900">전체 동의</span>
            </label>

            <div className="space-y-3 pl-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-neutral-700">[필수] <a href="/terms" target="_blank" className="text-blue-600 underline">서비스 이용약관</a> 동의</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-neutral-700">[필수] <a href="/privacy" target="_blank" className="text-blue-600 underline">개인정보 처리방침</a> 동의</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={agreeRefund} onChange={(e) => setAgreeRefund(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-neutral-700">[필수] <a href="/refundpolicy" target="_blank" className="text-blue-600 underline">환불 정책</a> 동의</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={agreePayment} onChange={(e) => setAgreePayment(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-neutral-700">[필수] 월 정기결제(자동결제)에 동의합니다</span>
              </label>
            </div>
          </Card>

          {/* 결제 버튼 */}
          <Button
            onClick={handleCheckout}
            disabled={!allAgreed || isProcessing || finalAmount <= 0}
            className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg"
          >
            {isProcessing ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 결제 진행 중...</>
            ) : (
              <><CreditCard className="w-5 h-5 mr-2" /> {formatPrice(finalAmount)} 결제하기</>
            )}
          </Button>

          <p className="text-xs text-center text-neutral-500 pb-4">
            결제는 토스페이먼츠를 통해 안전하게 처리됩니다.
            <br />
            결제 후 즉시 서비스가 활성화되며, 매월 동일 날짜에 자동 결제됩니다.
          </p>
        </div>
      </div>
    )
  }
  
  // ============================================
  // RENDER: 결제 완료 화면
  // ============================================
  
  if (step === 'complete') {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-neutral-900 mb-4">구독 완료! 🎉</h1>
        <p className="text-lg text-neutral-600 mb-8">
          {selectedPlan?.name} 플랜이 활성화되었습니다.
          <br />지금 바로 모든 기능을 이용해보세요.
        </p>
        <Button
          onClick={() => window.location.href = '/dashboard'}
          className="h-14 px-8 text-lg font-bold"
        >
          대시보드로 이동
        </Button>
      </div>
    )
  }
  
  return null
}
