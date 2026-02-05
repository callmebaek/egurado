"use client"

/**
 * 멤버십 관리 페이지
 * 현재 요금제, 요금제 비교, 업그레이드/다운그레이드, 결제 수단, 구독 취소
 */
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Star
} from 'lucide-react'
import { api } from '@/lib/config'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Subscription {
  tier: string
  monthly_credits: number
  max_stores: number
  max_keywords: number
  max_auto_collection: number
  next_billing_date?: string
  payment_method?: string
  amount?: number
}

interface Plan {
  tier: string
  name: string
  price: string
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

const PLANS: Plan[] = [
  {
    tier: 'free',
    name: 'Free',
    price: '₩0',
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
      '리뷰 분석',
      '대시보드 기본 기능',
    ],
    icon: Sparkles,
    color: 'from-gray-400 to-gray-500'
  },
  {
    tier: 'basic',
    name: 'Basic',
    price: '추후 공지',
    priceNote: '출시 예정',
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
      '플레이스 진단',
      '키워드 순위 조회',
      '리뷰 분석',
      '경쟁매장 분석',
    ],
    icon: TrendingUp,
    color: 'from-blue-400 to-indigo-500'
  },
  {
    tier: 'basic_plus',
    name: 'Basic+',
    price: '추후 공지',
    priceNote: '출시 예정',
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
      '플레이스 진단',
      '키워드 순위 조회',
      '리뷰 분석',
      '경쟁매장 분석',
      '우선 고객 지원',
    ],
    icon: Zap,
    color: 'from-purple-400 to-pink-500'
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '추후 공지',
    priceNote: '출시 예정',
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
      '모든 기능 무제한',
      '전담 계정 매니저',
      'API 접근 (추후)',
      '우선 기술 지원',
    ],
    icon: Crown,
    color: 'from-yellow-400 to-orange-500'
  },
  {
    tier: 'god',
    name: 'GOD',
    price: '무제한',
    priceNote: '관리자 전용',
    description: '모든 기능 무제한 사용',
    popular: false,
    credits: -1,
    stores: -1,
    keywords: -1,
    autoCollection: -1,
    features: [
      '무제한 크레딧',
      '무제한 매장',
      '무제한 키워드',
      '무제한 자동 수집',
      '모든 프리미엄 기능',
      '최우선 지원',
    ],
    icon: Shield,
    color: 'from-red-400 to-pink-500'
  },
]

export default function MembershipPage() {
  const { user, getToken } = useAuth()
  const { toast } = useToast()
  
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // 구독 정보 로드
  useEffect(() => {
    const loadSubscription = async () => {
      if (!user) return
      
      try {
        const token = getToken()
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/subscriptions/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setSubscription(data)
        } else {
          // Mock 데이터 (API 미구현 시)
          const mockSubscription: Subscription = {
            tier: 'free',
            monthly_credits: 100,
            max_stores: 1,
            max_keywords: 1,
            max_auto_collection: 0,
          }
          setSubscription(mockSubscription)
        }
      } catch (error) {
        console.error('구독 정보 로드 실패:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSubscription()
  }, [user, getToken])

  // 요금제 변경
  const handleChangePlan = async () => {
    if (!selectedPlan) return
    
    setIsProcessing(true)
    
    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/subscriptions/change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tier: selectedPlan.tier
        })
      })
      
      if (response.ok) {
        toast({
          title: "✅ 변경 완료",
          description: `${selectedPlan.name} 플랜으로 변경되었습니다.`,
        })
        
        setShowUpgradeDialog(false)
        setSelectedPlan(null)
        
        // 구독 정보 다시 로드
        window.location.reload()
      } else {
        throw new Error('요금제 변경 실패')
      }
    } catch (error) {
      console.error('요금제 변경 오류:', error)
      toast({
        variant: "destructive",
        title: "❌ 변경 실패",
        description: "요금제 변경에 실패했습니다. 다시 시도해주세요.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 구독 취소
  const handleCancelSubscription = async () => {
    setIsProcessing(true)
    
    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/subscriptions/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        toast({
          title: "✅ 취소 완료",
          description: "구독이 취소되었습니다. 현재 결제 기간이 끝나면 Free 플랜으로 전환됩니다.",
        })
        
        setShowCancelDialog(false)
        
        // 구독 정보 다시 로드
        window.location.reload()
      } else {
        throw new Error('구독 취소 실패')
      }
    } catch (error) {
      console.error('구독 취소 오류:', error)
      toast({
        variant: "destructive",
        title: "❌ 취소 실패",
        description: "구독 취소에 실패했습니다. 다시 시도해주세요.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const currentPlan = PLANS.find(p => p.tier === subscription?.tier) || PLANS[0]

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      {/* 헤더 섹션 */}
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
          현재 요금제를 확인하고 업그레이드하세요
        </p>
      </header>

      <div className="space-y-6 md:space-y-8">
        {/* 현재 요금제 정보 */}
        <section>
          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            <div className="bg-white p-6 md:p-8">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                </div>
              ) : subscription ? (
                <div>
                  {/* 상단: 현재 플랜 */}
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
                    {currentPlan.popular && (
                      <div className={`px-3 py-1.5 bg-gradient-to-r ${currentPlan.color} text-white rounded-full text-sm font-bold shadow-md`}>
                        ⭐ 인기
                      </div>
                    )}
                  </div>

                  {/* 플랜 상세 */}
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

                  {/* 결제 정보 */}
                  {subscription.next_billing_date && (
                    <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-gray-600" />
                          <div>
                            <div className="text-sm font-semibold text-neutral-900">다음 결제일</div>
                            <div className="text-xs text-neutral-600">
                              {formatDate(subscription.next_billing_date)}
                            </div>
                          </div>
                        </div>
                        {subscription.payment_method && (
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-gray-600" />
                            <span className="text-sm text-neutral-700">{subscription.payment_method}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-lg text-neutral-600">구독 정보를 불러올 수 없습니다.</p>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* 요금제 비교 */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">
              요금제 비교
            </h2>
            <p className="text-base text-neutral-600">
              내게 맞는 플랜을 선택하세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PLANS.filter(plan => plan.tier !== 'god').map((plan) => {
              const Icon = plan.icon
              const isCurrent = plan.tier === subscription?.tier
              
              return (
                <Card
                  key={plan.tier}
                  className={`rounded-xl overflow-hidden transition-all duration-200 ${
                    plan.popular
                      ? 'border-4 border-purple-400 shadow-2xl scale-105'
                      : 'border-2 border-neutral-300 shadow-lg hover:shadow-xl'
                  } ${isCurrent ? 'ring-4 ring-green-400' : ''}`}
                >
                  {plan.popular && (
                    <div className="bg-purple-500 text-white text-center py-2 font-bold text-sm">
                      ⭐ 가장 인기있는 플랜
                    </div>
                  )}
                  
                  <div className="p-6">
                    {/* 플랜 헤더 */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-neutral-900">{plan.name}</h3>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600">
                            <Check className="w-4 h-4" />
                            현재 플랜
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 가격 */}
                    <div className="mb-4">
                      <div className="text-3xl font-extrabold text-neutral-900 mb-1">
                        {plan.price}
                      </div>
                      <div className="text-sm text-neutral-600">{plan.priceNote}</div>
                    </div>

                    {/* 설명 */}
                    <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                      {plan.description}
                    </p>

                    {/* 기능 목록 */}
                    <div className="space-y-3 mb-6">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-neutral-700">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA 버튼 */}
                    {!isCurrent && (
                      <Button
                        onClick={() => {
                          setSelectedPlan(plan)
                          setShowUpgradeDialog(true)
                        }}
                        className={`w-full h-12 text-base font-bold ${
                          plan.popular
                            ? 'bg-purple-500 hover:bg-purple-600'
                            : ''
                        }`}
                        disabled={plan.price === '추후 공지'}
                      >
                        {plan.price === '추후 공지' ? (
                          '출시 알림 받기'
                        ) : (
                          <>
                            선택하기
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </section>

        {/* 구독 취소 */}
        {subscription && subscription.tier !== 'free' && subscription.tier !== 'god' && (
          <section>
            <Card className="rounded-xl border-2 border-red-300 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b-2 border-red-200 p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-md">
                    <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                      구독 취소
                    </h2>
                    <p className="text-sm text-red-700 mt-0.5">
                      신중하게 진행해주세요
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 md:p-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <p className="text-sm text-red-700 leading-relaxed">
                    구독을 취소하면 현재 결제 기간이 끝난 후 Free 플랜으로 전환됩니다.
                    <br />
                    남은 크레딧과 데이터는 유지되지만, 플랜 혜택은 사라집니다.
                  </p>
                </div>
                <Button
                  onClick={() => setShowCancelDialog(true)}
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

      {/* 요금제 변경 확인 다이얼로그 */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          {selectedPlan && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                  <Crown className="w-6 h-6 text-yellow-600" />
                  요금제 변경 확인
                </DialogTitle>
                <DialogDescription className="text-base text-neutral-700 pt-2">
                  <span className="font-bold text-purple-600">{selectedPlan.name}</span> 플랜으로 변경하시겠습니까?
                  <br />
                  <br />
                  변경 후 즉시 새로운 플랜의 혜택을 받을 수 있습니다.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-semibold text-neutral-700">월간 크레딧</span>
                    <span className="text-base font-bold text-neutral-900">
                      {selectedPlan.credits.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-semibold text-neutral-700">매장 수</span>
                    <span className="text-base font-bold text-neutral-900">
                      {selectedPlan.stores}개
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-semibold text-neutral-700">키워드 수</span>
                    <span className="text-base font-bold text-neutral-900">
                      {selectedPlan.keywords}개
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUpgradeDialog(false)
                    setSelectedPlan(null)
                  }}
                  disabled={isProcessing}
                  className="h-12 px-6"
                >
                  취소
                </Button>
                <Button
                  onClick={handleChangePlan}
                  disabled={isProcessing}
                  className="h-12 px-8"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    '변경하기'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 구독 취소 확인 다이얼로그 */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              구독 취소 확인
            </DialogTitle>
            <DialogDescription className="text-base text-neutral-700 pt-2">
              정말로 구독을 취소하시겠습니까?
              <br />
              <br />
              현재 결제 기간이 끝나면 Free 플랜으로 전환되며,
              <br />
              프리미엄 기능을 더 이상 사용할 수 없습니다.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isProcessing}
              className="h-12 px-6"
            >
              돌아가기
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isProcessing}
              className="h-12 px-6"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                '구독 취소'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
