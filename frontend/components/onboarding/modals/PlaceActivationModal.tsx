"use client"

import { useState, useEffect } from 'react'
import {
  Activity,
  CheckCircle2,
  MessageSquare,
  FileText,
  Gift,
  Megaphone,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/config'
import { useRouter } from 'next/navigation'
import OnboardingModal from './OnboardingModal'
import StoreSelector from './StoreSelector'

interface PlaceActivationModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

interface RegisteredStore {
  id: string
  name: string
  place_id: string
  thumbnail?: string
  address?: string
}

interface SummaryCard {
  type: string
  title: string
  value: number
  vs_7d_pct?: number
  vs_30d_pct?: number
  reply_rate?: number
  has_active?: boolean
  days_since_last?: number
}

interface ActivationData {
  store_name: string
  place_id: string
  thumbnail?: string
  summary_cards: SummaryCard[]
}

export default function PlaceActivationModal({ isOpen, onClose, onComplete }: PlaceActivationModalProps) {
  const { getToken } = useAuth()
  const router = useRouter()
  
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4
  
  const [stores, setStores] = useState<RegisteredStore[]>([])
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null)
  const [loadingStores, setLoadingStores] = useState(false)
  
  const [activationData, setActivationData] = useState<ActivationData | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')

  // 매장 목록 로드
  useEffect(() => {
    if (isOpen && currentStep === 1) {
      loadStores()
    }
  }, [isOpen, currentStep])

  // 모달 닫기 및 초기화
  const handleClose = () => {
    setCurrentStep(1)
    setStores([])
    setSelectedStore(null)
    setActivationData(null)
    setIsAnalyzing(false)
    setError('')
    onClose()
  }

  const loadStores = async () => {
    setLoadingStores(true)
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch(api.stores.list(), {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('매장 목록 조회 실패')

      const data = await response.json()
      const naverStores = data.stores?.filter((s: any) => s.platform === 'naver') || []
      setStores(naverStores)
    } catch (err) {
      console.error('매장 로드 오류:', err)
      setError('매장 목록을 불러오는데 실패했습니다')
    } finally {
      setLoadingStores(false)
    }
  }

  const analyzeActivation = async () => {
    if (!selectedStore) return

    setIsAnalyzing(true)
    setError('')

    try {
      const token = await getToken()
      if (!token) throw new Error('인증 토큰이 없습니다')

      const response = await fetch(api.naver.activation(selectedStore.id), {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('활성화 분석 실패')

      const data = await response.json()
      setActivationData(data.data)
      
      // 캐싱
      const cacheKey = `activation_cache_${selectedStore.id}`
      const cacheData = {
        data: data.data,
        timestamp: Date.now(),
        storeId: selectedStore.id
      }
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheData))
      } catch (err) {
        console.warn('[활성화 모달] 캐시 저장 실패:', err)
      }
      
      setCurrentStep(4)
    } catch (err) {
      console.error('활성화 분석 오류:', err)
      setError('활성화 분석 중 오류가 발생했습니다')
      setCurrentStep(2)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleNext = () => {
    setError('')
    
    if (currentStep === 1) {
      setCurrentStep(2)
      return
    }
    
    if (currentStep === 2) {
      if (!selectedStore) {
        setError('매장을 선택해주세요')
        return
      }
      setCurrentStep(3)
      analyzeActivation()
      return
    }
    
    if (currentStep === 4) {
      router.push(`/dashboard/naver/activation?storeId=${selectedStore?.id}`)
      handleClose()
      onComplete?.()
    }
  }

  const handleBack = () => {
    setError('')
    if (currentStep > 1 && currentStep < 3) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getCardIcon = (type: string) => {
    switch (type) {
      case 'visitor_review': return <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
      case 'blog_review': return <FileText className="w-5 h-5 md:w-6 md:h-6" />
      case 'reply': return <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
      case 'promotion': return <Gift className="w-5 h-5 md:w-6 md:h-6" />
      case 'announcement': return <Megaphone className="w-5 h-5 md:w-6 md:h-6" />
      default: return <Activity className="w-5 h-5 md:w-6 md:h-6" />
    }
  }

  const getCardColor = (type: string) => {
    switch (type) {
      case 'visitor_review': return 'bg-info-bg text-info'
      case 'blog_review': return 'bg-primary-100 text-primary-700'
      case 'reply': return 'bg-info-bg text-info'
      case 'promotion': return 'bg-brand-red/10 text-brand-red'
      case 'announcement': return 'bg-warning-bg text-warning'
      default: return 'bg-neutral-100 text-neutral-600'
    }
  }

  const getTrendIcon = (pct?: number) => {
    if (!pct) return <Minus className="w-3 h-3 md:w-3.5 md:h-3.5" />
    if (pct > 0) return <ArrowUp className="w-3 h-3 md:w-3.5 md:h-3.5" />
    if (pct < 0) return <ArrowDown className="w-3 h-3 md:w-3.5 md:h-3.5" />
    return <Minus className="w-3 h-3 md:w-3.5 md:h-3.5" />
  }

  const getTrendColor = (pct?: number) => {
    if (!pct) return 'bg-neutral-100 text-neutral-600'
    if (pct > 0) return 'bg-success-bg text-success'
    if (pct < 0) return 'bg-error-bg text-error'
    return 'bg-neutral-100 text-neutral-600'
  }

  // Step 1: 환영 메시지
  const renderStep1 = () => (
    <div className="space-y-2">
      <div className="text-center">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 mb-1 leading-tight">
          플레이스 활성화<br className="md:hidden" /> 확인하기
        </h3>
        <p className="text-[11px] md:text-xs text-neutral-600 leading-snug">
          우리 매장이 활성화된 플레이스라는 것을<br />
          지속적으로 시그널을 만들어야 순위를 올릴 수 있습니다
        </p>
      </div>

      <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-lg p-2.5 md:p-3 border border-primary-200">
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 bg-emerald-600 rounded flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-xs md:text-sm font-bold text-neutral-900 mb-0">최근 활성화 수준 확인</p>
              <p className="text-[10px] md:text-xs text-neutral-600 leading-snug">리뷰, 프로모션, 공지사항 등 5가지 핵심 지표를 확인하세요</p>
            </div>
          </div>
          
          <div className="border-t border-primary-200" />
          
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 bg-info rounded flex items-center justify-center flex-shrink-0">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-xs md:text-sm font-bold text-neutral-900 mb-0">개선이 필요한 부분 파악</p>
              <p className="text-[10px] md:text-xs text-neutral-600 leading-snug">우리 매장에 뭐가 더 필요한지를 수시로 판단하세요</p>
            </div>
          </div>
          
          <div className="border-t border-primary-200" />
          
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 bg-success rounded flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-xs md:text-sm font-bold text-neutral-900 mb-0">과거 이력 자동 저장</p>
              <p className="text-[10px] md:text-xs text-neutral-600 leading-snug">분석 결과는 자동으로 저장되어 변화 추이를 확인할 수 있습니다</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-info-bg rounded-lg p-2 md:p-2.5 border border-info/30">
        <p className="text-[10px] md:text-xs text-neutral-700 leading-snug">
          💡 <strong>TIP:</strong> 정기적으로 활성화 수준을 확인하고 개선 활동을 이어가면 플레이스 순위 상승에 도움이 됩니다!
        </p>
      </div>
    </div>
  )

  // Step 2: 매장 선택
  const renderStep2 = () => {
    const formattedStores = stores.map(store => ({
      id: store.id,
      place_id: store.place_id,
      name: store.name,
      address: store.address || '',
      thumbnail: store.thumbnail,
      platform: 'naver',
    }))

    const formattedSelected = selectedStore ? {
      id: selectedStore.id,
      place_id: selectedStore.place_id,
      name: selectedStore.name,
      address: selectedStore.address || '',
      thumbnail: selectedStore.thumbnail,
      platform: 'naver',
    } : null

    return (
      <div className="space-y-3 md:space-y-4">
        <div className="text-center space-y-2">
          <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
            어떤 매장의 활성화 수준을 확인할까요?
          </h3>
          <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
            매장을 선택하면 현재 활성화 상태를 분석해드려요
          </p>
        </div>

        <StoreSelector
          stores={formattedStores}
          selectedStore={formattedSelected}
          onSelect={(store) => {
            const original = stores.find(s => s.id === store.id)
            if (original) {
              setSelectedStore(original)
            }
          }}
          loading={loadingStores}
          emptyMessage={error || '등록된 네이버 플레이스 매장이 없습니다.'}
        />

        {error && (
          <div className="p-3 md:p-4 bg-error-bg border border-error rounded-button">
            <p className="text-sm md:text-base text-error font-medium">{error}</p>
          </div>
        )}
      </div>
    )
  }

  // Step 3: 분석 중
  const renderStep3 = () => (
    <div className="text-center py-8 md:py-12">
      <div className="relative inline-block mb-6">
        <Loader2 className="w-16 h-16 md:w-20 md:h-20 animate-spin text-emerald-600 mx-auto" />
        <Activity className="w-6 h-6 md:w-8 md:h-8 text-primary-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-3 leading-tight">
        활성화 수준을 분석하고 있습니다...
      </h3>
      <p className="text-sm md:text-base text-neutral-600 mb-2 leading-relaxed">
        잠시만 기다려주세요
      </p>
      <div className="w-full max-w-md mx-auto h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-600 animate-pulse" style={{ width: '100%' }} />
      </div>
    </div>
  )

  // Step 4: 결과 요약
  const renderStep4 = () => {
    if (!activationData) return null

    const formatValue = (value: number, type: string) => {
      if (type === 'visitor_review' || type === 'blog_review') {
        if (value % 1 === 0) {
          return Math.round(value).toString()
        }
        return value.toFixed(1)
      }
      return Math.round(value).toString()
    }

    const getStatusMessage = (card: any) => {
      if (card.has_active) {
        return '✅ 현재 활성화 중'
      }
      if (card.days_since_last && card.days_since_last >= 3) {
        return '❌ 지난 3일동안 공지사항이 없습니다'
      }
      return `❌ ${card.days_since_last || 0}일 전 마지막`
    }

    return (
      <div className="space-y-3 md:space-y-4">
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-success-bg rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-success" />
            </div>
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-brand-red absolute -top-1 -right-1 animate-pulse" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-2 leading-tight">
            활성화 분석 완료!
          </h3>
          <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
            현재 활성화 수준을 5가지 지표로 요약했어요
          </p>
        </div>

        <div className="max-h-[350px] overflow-y-auto space-y-3">
          {activationData.summary_cards.map((card) => (
            <div key={card.type} className="p-3 md:p-4 bg-white rounded-xl border-2 border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-button flex items-center justify-center ${getCardColor(card.type)}`}>
                    {getCardIcon(card.type)}
                  </div>
                  <div>
                    <p className="text-sm md:text-base font-bold text-neutral-900">{card.title}</p>
                    <p className="text-xs text-neutral-600">지난 3일 평균</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl md:text-2xl font-extrabold text-neutral-900">{formatValue(card.value, card.type)}</span>
                  <span className="text-xs text-neutral-600">개</span>
                </div>
              </div>

              {(card.type === 'visitor_review' || card.type === 'blog_review') && (
                <div className="flex gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-button text-xs font-bold ${getTrendColor(card.vs_7d_pct)}`}>
                    {getTrendIcon(card.vs_7d_pct)}
                    7일 {card.vs_7d_pct?.toFixed(1) || '0'}%
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-button text-xs font-bold ${getTrendColor(card.vs_30d_pct)}`}>
                    {getTrendIcon(card.vs_30d_pct)}
                    30일 {card.vs_30d_pct?.toFixed(1) || '0'}%
                  </span>
                </div>
              )}

              {card.type === 'reply' && card.reply_rate !== undefined && (
                <span className={`inline-block px-2 py-1 rounded-button text-xs font-bold mt-2 ${
                  card.reply_rate >= 80 ? 'bg-success-bg text-success' : 
                  card.reply_rate >= 50 ? 'bg-warning-bg text-warning' : 'bg-error-bg text-error'
                }`}>
                  답글 비율 {card.reply_rate.toFixed(1)}%
                </span>
              )}

              {(card.type === 'promotion' || card.type === 'announcement') && (
                <p className="text-xs text-neutral-600 mt-2">
                  {getStatusMessage(card)}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="bg-info-bg rounded-xl p-3 md:p-4 border border-info/30">
          <p className="text-xs md:text-sm text-neutral-700">
            💡 상세 페이지에서 트렌드 분석, 개선 제안 등 더 많은 정보를 확인하세요!
          </p>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1()
      case 2:
        return renderStep2()
      case 3:
        return renderStep3()
      case 4:
        return renderStep4()
      default:
        return null
    }
  }

  return (
    <OnboardingModal
      isOpen={isOpen}
      onClose={handleClose}
      title="플레이스 활성화 확인하기"
      icon={TrendingUp}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      onNext={handleNext}
      nextButtonText={
        currentStep === 1
          ? '시작하기'
          : currentStep === 2
          ? '분석 시작하기'
          : currentStep === 3
          ? '분석 중...'
          : '상세 내역 확인하기'
      }
      nextButtonDisabled={
        (currentStep === 2 && (!selectedStore || loadingStores)) ||
        currentStep === 3
      }
      showBackButton={currentStep === 2}
    >
      {renderContent()}
    </OnboardingModal>
  )
}
