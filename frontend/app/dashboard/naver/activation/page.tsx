'use client'

/**
 * 플레이스 활성화 페이지
 * 매장의 플레이스 활성화 현황을 분석하고 개선 방안 제시
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  Store, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  MessageSquare,
  FileText,
  Gift,
  Megaphone,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Globe,
  Instagram,
  Facebook,
  BookOpen,
  Phone,
  CreditCard,
  Calendar,
  MessageCircle,
  Award,
  Copy,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MapPin
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/use-toast'
import { api } from '@/lib/config'
import { notifyCreditUsed } from '@/lib/credit-utils'
import { useCreditConfirm } from '@/lib/hooks/useCreditConfirm'
import { useUpgradeModal } from '@/lib/hooks/useUpgradeModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import Image from 'next/image'

// ===== 인터페이스 정의 =====
interface RegisteredStore {
  id: string
  name: string
  place_id: string
  category: string
  address: string
  thumbnail?: string
  platform: string
}

interface SummaryCard {
  type: string
  title: string
  value: number
  daily_avg?: number
  vs_7d_pct?: number
  vs_30d_pct?: number
  avg_7d?: number
  avg_30d?: number
  total?: number
  reply_rate?: number
  has_active?: boolean
  days_since_last?: number
}

interface ReviewTrends {
  last_3days_avg: number
  last_7days_avg: number
  last_30days_avg: number
  last_60days_avg: number
  comparisons: {
    vs_last_7days: { direction: string; change: number }
    vs_last_30days: { direction: string; change: number }
    vs_last_60days: { direction: string; change: number }
  }
}

interface PendingReplyInfo {
  total_reviews: number
  pending_count: number
  replied_count: number
  reply_rate: number
  oldest_pending_date: string | null
}

interface PromotionItem {
  title: string
  description: string
  discount: string
}

interface AnnouncementItem {
  title: string
  content: string
  days_ago: number
  relative: string
}

interface ActivationData {
  store_name: string
  place_id: string
  thumbnail?: string
  summary_cards: SummaryCard[]
  visitor_review_trends: ReviewTrends
  blog_review_trends: ReviewTrends
  current_visitor_review_count: number
  current_blog_review_count: number
  promotion_items: PromotionItem[]
  announcement_items: AnnouncementItem[]
  is_place_plus: boolean
  pending_reply_info: PendingReplyInfo
  naver_api_limited: boolean
  has_promotion: boolean
  promotion_count: number
  has_announcement: boolean
  announcement_count: number
  last_announcement_date?: string
  days_since_last_announcement?: number
  description?: string
  directions?: string
  homepage?: string
  instagram?: string
  facebook?: string
  blog?: string
  has_smart_call: boolean
  has_naver_pay: boolean
  has_naver_booking: boolean
  has_naver_talk: boolean
  has_naver_order: boolean
}

export default function ActivationPage() {
  const { user, getToken } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  
  // 상태 관리
  const [stores, setStores] = useState<RegisteredStore[]>([])
  const [isLoadingStores, setIsLoadingStores] = useState(false)
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activationData, setActivationData] = useState<ActivationData | null>(null)
  
  // AI 생성 모달 상태
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)
  const [showDirectionsModal, setShowDirectionsModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedText, setGeneratedText] = useState('')
  const [generatedTextCharCount, setGeneratedTextCharCount] = useState(0)
  
  // 업체소개글 생성 필드
  const [regionKeyword, setRegionKeyword] = useState('')
  const [landmarkKeywords, setLandmarkKeywords] = useState('')
  const [businessTypeKeyword, setBusinessTypeKeyword] = useState('')
  const [productKeywords, setProductKeywords] = useState('')
  const [storeFeatures, setStoreFeatures] = useState('')
  
  // 찾아오는길 생성 필드
  const [directionsRegionKeyword, setDirectionsRegionKeyword] = useState('')
  const [directionsLandmarkKeywords, setDirectionsLandmarkKeywords] = useState('')
  const [directionsDescription, setDirectionsDescription] = useState('')
  const [generatedDirectionsText, setGeneratedDirectionsText] = useState('')
  const [generatedDirectionsCharCount, setGeneratedDirectionsCharCount] = useState(0)

  // 과거 이력
  const [activationHistories, setActivationHistories] = useState<any[]>([])
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [isLoadingHistories, setIsLoadingHistories] = useState(false)

  // 크레딧 확인 모달
  const { showCreditConfirm, CreditModal } = useCreditConfirm()
  // 업그레이드 모달
  const { handleLimitError, UpgradeModalComponent } = useUpgradeModal()

  // ===== 데이터 로딩 =====
  useEffect(() => {
    if (user) {
      fetchStores()
    }
  }, [user])

  // URL 파라미터로부터 storeId 읽어서 자동 선택
  useEffect(() => {
    const storeId = searchParams.get('storeId')
    if (storeId && stores.length > 0) {
      const store = stores.find(s => s.id === storeId)
      if (store) {
        setSelectedStore(store)
        loadActivationData(store.id)
      }
    }
  }, [searchParams, stores])

  // 매장 목록 조회
  const fetchStores = async () => {
    setIsLoadingStores(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('인증 토큰 없음')
      
      const response = await fetch(api.stores.list(), {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: "no-store"
      })
      
      if (!response.ok) throw new Error('매장 조회 실패')
      
      const result = await response.json()
      const allStores = result.stores || []
      const naverStores = allStores.filter((s: RegisteredStore) => s.platform === 'naver')
      setStores(naverStores)
    } catch (error) {
      console.error('매장 조회 에러:', error)
      toast({
        title: '오류',
        description: '매장 목록을 불러오지 못했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingStores(false)
    }
  }

  // 활성화 데이터 로드
  const loadActivationData = async (storeId: string) => {
    setIsLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('인증 토큰 없음')
      
      const url = `${api.baseUrl}/api/v1/naver/activation/${storeId}`
      console.log('🔍 활성화 분석 요청:', url)
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      console.log('📡 응답 상태:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ 활성화 분석 실패')
        console.error('Status:', response.status)
        console.error('Error Data:', errorData)
        // 403/402 에러 → 업그레이드 모달 표시
        if (handleLimitError(response.status, errorData.detail)) return
        throw new Error(errorData.detail || errorData.message || `활성화 분석 실패 (${response.status})`)
      }
      
      const result = await response.json()
      console.log('활성화 분석 성공:', result)
      setActivationData(result.data)
      
      // ✨ 크레딧 실시간 차감 알림 (활성화 분석: 15 크레딧)
      notifyCreditUsed(15, token)
      
      // 과거 이력도 로드
      loadActivationHistories(storeId)
      
      toast({
        title: '분석 완료',
        description: '플레이스 활성화 현황을 성공적으로 조회했습니다.',
      })
      
      // 성공 시에만 로딩 해제
      setIsLoading(false)
    } catch (error) {
      console.error('활성화 분석 에러:', error)
      
      // 에러 발생 시 로딩 해제하고 매장 선택 화면으로 돌아가기
      setIsLoading(false)
      setSelectedStore(null)
      setActivationData(null)
      
      toast({
        title: '오류',
        description: error instanceof Error ? error.message : '활성화 분석에 실패했습니다.',
        variant: 'destructive',
      })
    }
  }

  // 과거 이력 로드
  const loadActivationHistories = async (storeId: string) => {
    setIsLoadingHistories(true)
    try {
      const token = await getToken()
      if (!token) return
      
      const response = await fetch(`${api.baseUrl}/api/v1/naver/activation/history/${storeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const result = await response.json()
        setActivationHistories(result.histories || [])
      }
    } catch (error) {
      console.error('이력 조회 에러:', error)
    } finally {
      setIsLoadingHistories(false)
    }
  }

  // AI 업체소개글 생성
  const handleGenerateDescription = () => {
    if (!selectedStore) {
      toast({
        title: '매장 선택 필요',
        description: '매장을 먼저 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    if (!regionKeyword || !businessTypeKeyword || !storeFeatures) {
      toast({
        title: '필수 정보 누락',
        description: '지역, 업종, 매장 특색은 필수로 입력해야 합니다.',
        variant: 'destructive',
      })
      return
    }

    showCreditConfirm({
      featureName: "AI 업체소개글 생성",
      creditAmount: 10,
      onConfirm: () => executeGenerateDescription(),
    })
  }

  const executeGenerateDescription = async () => {
    setIsGenerating(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('인증 토큰 없음')
      
      const landmarks = landmarkKeywords.split(',').map(k => k.trim()).filter(k => k)
      const products = productKeywords.split(',').map(k => k.trim()).filter(k => k)
      
      const response = await fetch(`${api.baseUrl}/api/v1/naver/activation/generate-description`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          store_id: selectedStore.id,
          region_keyword: regionKeyword,
          landmark_keywords: landmarks,
          business_type_keyword: businessTypeKeyword,
          product_keywords: products,
          store_features: storeFeatures
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (handleLimitError(response.status, errorData.detail)) return
        throw new Error(errorData.detail || '생성 실패')
      }
      
      const result = await response.json()
      setGeneratedText(result.generated_text || '')
      setGeneratedTextCharCount(result.generated_text?.length || 0)

      // ✨ 크레딧 실시간 차감 알림 (업체소개글 생성: 10 크레딧)
      notifyCreditUsed(10, token)
      
      toast({
        title: '생성 완료',
        description: 'AI가 업체소개글을 생성했습니다!',
      })
    } catch (error) {
      console.error('생성 에러:', error)
      toast({
        title: '오류',
        description: '업체소개글 생성에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // AI 찾아오는길 생성
  const handleGenerateDirections = () => {
    if (!selectedStore) {
      toast({
        title: '매장 선택 필요',
        description: '매장을 먼저 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    if (!directionsRegionKeyword || !directionsDescription) {
      toast({
        title: '필수 정보 누락',
        description: '지역과 설명은 필수로 입력해야 합니다.',
        variant: 'destructive',
      })
      return
    }

    showCreditConfirm({
      featureName: "AI 찾아오는길 생성",
      creditAmount: 10,
      onConfirm: () => executeGenerateDirections(),
    })
  }

  const executeGenerateDirections = async () => {
    setIsGenerating(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('인증 토큰 없음')
      
      const landmarks = directionsLandmarkKeywords.split(',').map(k => k.trim()).filter(k => k)
      
      const response = await fetch(`${api.baseUrl}/api/v1/naver/activation/generate-directions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          store_id: selectedStore.id,
          region_keyword: directionsRegionKeyword,
          landmark_keywords: landmarks,
          directions_description: directionsDescription
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (handleLimitError(response.status, errorData.detail)) return
        throw new Error(errorData.detail || '생성 실패')
      }
      
      const result = await response.json()
      setGeneratedDirectionsText(result.generated_text || '')
      setGeneratedDirectionsCharCount(result.generated_text?.length || 0)

      // ✨ 크레딧 실시간 차감 알림 (찾아오는길 생성: 10 크레딧)
      notifyCreditUsed(10, token)
      
      toast({
        title: '생성 완료',
        description: 'AI가 찾아오는길을 생성했습니다!',
      })
    } catch (error) {
      console.error('생성 에러:', error)
      toast({
        title: '오류',
        description: '찾아오는길 생성에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // 텍스트 복사
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: '복사 완료',
      description: '클립보드에 복사되었습니다.',
    })
  }

  // ===== 렌더링 함수들 =====

  // 요약 카드 렌더링
  const renderSummaryCards = () => {
    if (!activationData?.summary_cards) return null

    // 카드 타입별 이모지 매핑
    const getCardEmoji = (type: string) => {
      switch (type) {
        case 'visitor_review': return '👥'
        case 'blog_review': return '📝'
        case 'pending_reply': return '💬'
        case 'promotion': return '🎁'
        case 'announcement': return '📢'
        case 'place_plus': return '⭐'
        default: return ''
      }
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {activationData.summary_cards.map((card) => {
          const isReviewCard = card.type === 'visitor_review' || card.type === 'blog_review'
          const avgChange = ((card.vs_7d_pct || 0) + (card.vs_30d_pct || 0)) / 2
          const emoji = getCardEmoji(card.type)
          
          return (
            <Card key={card.type} className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-neutral-600">{card.title}</p>
                  {emoji && <span className="text-lg">{emoji}</span>}
                </div>
                
                {isReviewCard ? (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="text-xl md:text-2xl font-bold text-neutral-900">
                        {card.value.toFixed(2)}
                      </p>
                      <span className="text-base">
                        {avgChange > 0 ? '📈' : avgChange < 0 ? '📉' : '➖'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">지난 3일 일평균</p>
                    
                    <div className="border-t border-neutral-200 pt-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] text-neutral-500 whitespace-nowrap">vs 7일</span>
                        <Badge 
                          variant={(card.vs_7d_pct || 0) > 0 ? 'destructive' : (card.vs_7d_pct || 0) < 0 ? 'default' : 'secondary'}
                          className="text-[10px] px-1 py-0 h-4 whitespace-nowrap"
                        >
                          {(card.vs_7d_pct || 0) > 0 ? '↑' : (card.vs_7d_pct || 0) < 0 ? '↓' : '−'}
                          {Math.abs(card.vs_7d_pct || 0).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] text-neutral-500 whitespace-nowrap">vs 30일</span>
                        <Badge 
                          variant={(card.vs_30d_pct || 0) > 0 ? 'destructive' : (card.vs_30d_pct || 0) < 0 ? 'default' : 'secondary'}
                          className="text-[10px] px-1 py-0 h-4 whitespace-nowrap"
                        >
                          {(card.vs_30d_pct || 0) > 0 ? '↑' : (card.vs_30d_pct || 0) < 0 ? '↓' : '−'}
                          {Math.abs(card.vs_30d_pct || 0).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </>
                ) : card.type === 'pending_reply' && card.reply_rate !== undefined ? (
                  // 답글 대기 카드 특별 처리
                  <>
                    <p className="text-2xl md:text-3xl font-bold text-orange-600">
                      {Math.round(card.value)}
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-500">답글률</span>
                        <span className="font-bold text-primary-600">{card.reply_rate.toFixed(1)}%</span>
                      </div>
                      {card.total !== undefined && (
                        <p className="text-xs text-neutral-500">
                          전체 {card.total}개 리뷰 중
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-2xl md:text-3xl font-bold text-neutral-900">
                      {Math.round(card.value)}
                    </p>
                    {card.has_active !== undefined && (
                      <Badge variant={card.has_active ? 'default' : 'secondary'} className="text-xs">
                        {card.has_active ? '활성' : '비활성'}
                      </Badge>
                    )}
                    {card.days_since_last !== undefined && card.days_since_last > 0 && (
                      <p className="text-xs text-neutral-500">
                        {card.days_since_last <= 3 
                          ? '최근 활동 있음' 
                          : card.days_since_last >= 999 
                          ? '지난 3일 동안 없음'
                          : `${card.days_since_last}일 전 업데이트`}
                      </p>
                    )}
                    {card.days_since_last !== undefined && card.days_since_last === 0 && (
                      <p className="text-xs text-green-600 font-medium">
                        최근 활동 있음
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // 리뷰 추이 렌더링
  const renderReviewTrends = () => {
    if (!activationData?.visitor_review_trends || !activationData?.blog_review_trends) return null

    const trends = [
      { title: '방문자 리뷰 추이', data: activationData.visitor_review_trends, icon: MessageSquare, color: 'blue' },
      { title: '블로그 리뷰 추이', data: activationData.blog_review_trends, icon: FileText, color: 'green' }
    ]

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {trends.map((trend) => {
          const Icon = trend.icon
          const hasData = trend.data.last_3days_avg > 0
          
          return (
            <Card key={trend.title} className="border-neutral-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base md:text-lg font-bold text-neutral-900">
                    {trend.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg bg-${trend.color}-50`}>
                    <Icon className={`w-5 h-5 text-${trend.color}-600`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-neutral-600">지난 3일 일평균</p>
                    <p className="text-xl md:text-2xl font-bold text-neutral-900">
                      {trend.data.last_3days_avg.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">지난 7일 일평균</p>
                    <p className="text-lg md:text-xl font-semibold text-neutral-700">
                      {trend.data.last_7days_avg.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">지난 30일 일평균</p>
                    <p className="text-lg md:text-xl font-semibold text-neutral-700">
                      {trend.data.last_30days_avg.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600">지난 60일 일평균</p>
                    <p className="text-lg md:text-xl font-semibold text-neutral-700">
                      {trend.data.last_60days_avg.toFixed(2)}
                    </p>
                  </div>
                </div>

                {hasData && (
                  <div className="mt-4 pt-3 border-t border-neutral-200 space-y-2">
                    <p className="text-xs font-semibold text-neutral-700">변화 추이</p>
                    {Object.entries(trend.data.comparisons).map(([key, comp]: [string, any]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-neutral-600">
                          {key === 'vs_last_7days' ? 'vs 지난 7일' :
                           key === 'vs_last_30days' ? 'vs 지난 30일' : 'vs 지난 60일'}
                        </span>
                        <Badge 
                          variant={comp.direction === 'up' ? 'destructive' : comp.direction === 'down' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {comp.direction === 'up' ? <TrendingUp className="w-3 h-3 mr-0.5" /> :
                           comp.direction === 'down' ? <TrendingDown className="w-3 h-3 mr-0.5" /> :
                           <Minus className="w-3 h-3 mr-0.5" />}
                          {Math.abs(comp.change).toFixed(1)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // 답글 대기 렌더링
  const renderPendingReply = () => {
    if (!activationData?.pending_reply_info) return null

    const { pending_reply_info, naver_api_limited } = activationData

    return (
      <Card className="border-neutral-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg font-bold text-neutral-900">
              답글 대기 현황
            </CardTitle>
            <div className="p-2 rounded-lg bg-orange-50">
              <MessageSquare className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {naver_api_limited ? (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-sm font-semibold text-yellow-900">
                네이버 API 제한
              </AlertTitle>
              <AlertDescription className="text-xs text-yellow-700 mt-1">
                현재 네이버 API 제한으로 리뷰 정보를 가져올 수 없습니다. "AI 리뷰답글" 메뉴에서 직접 확인해주세요.
              </AlertDescription>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                onClick={() => window.location.href = '/dashboard/naver/reviews/ai-reply'}
              >
                AI 리뷰답글 바로가기
              </Button>
            </Alert>
          ) : (
            <>
              {pending_reply_info.pending_count === 0 ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-sm font-semibold text-green-900">
                    답글 대기 없음
                  </AlertTitle>
                  <AlertDescription className="text-xs text-green-700 mt-1">
                    모든 리뷰에 답글이 달려 있습니다! 👏
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                      <p className="text-xs text-neutral-600 mb-1">전체 리뷰</p>
                      <p className="text-2xl font-bold text-neutral-900">
                        {pending_reply_info.total_reviews}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                      <p className="text-xs text-orange-600 mb-1">답글 대기</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {pending_reply_info.pending_count}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-neutral-700">답글률</span>
                      <span className="text-sm font-bold text-primary-600">
                        {pending_reply_info.reply_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2">
                      <div 
                        className="bg-primary-500 h-2 rounded-full transition-all"
                        style={{ width: `${pending_reply_info.reply_rate}%` }}
                      />
                    </div>
                  </div>

                  {(() => {
                    if (!pending_reply_info.oldest_pending_date) return null
                    
                    try {
                      const date = new Date(pending_reply_info.oldest_pending_date)
                      // 유효한 날짜인지 확인
                      if (isNaN(date.getTime())) return null
                      
                      return (
                        <Alert className="border-red-200 bg-red-50">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-xs text-red-700">
                            가장 오래된 대기 리뷰: {date.toLocaleDateString('ko-KR')}
                          </AlertDescription>
                        </Alert>
                      )
                    } catch (error) {
                      console.error('날짜 파싱 에러:', pending_reply_info.oldest_pending_date, error)
                      return null
                    }
                  })()}

                  <Button 
                    className="w-full"
                    onClick={() => window.location.href = '/dashboard/naver/reviews/ai-reply'}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    AI 리뷰답글 바로가기
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  // 플레이스 정보 렌더링
  const renderPlaceInfo = () => {
    if (!activationData) return null

    return (
      <div className="space-y-4">
        {/* 프로모션/쿠폰 */}
        <Card className="border-neutral-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-neutral-900">
                프로모션/쿠폰
              </CardTitle>
              <Badge variant={activationData.has_promotion ? 'default' : 'secondary'}>
                {activationData.has_promotion ? `${activationData.promotion_count}개 활성` : '비활성'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {activationData.has_promotion && activationData.promotion_items?.length > 0 ? (
              <div className="space-y-2">
                {activationData.promotion_items.map((item, index) => (
                  <div key={index} className="p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                    <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-neutral-600 mt-1">{item.description}</p>
                    )}
                    {item.discount && (
                      <Badge variant="destructive" className="mt-2 text-xs">
                        {item.discount}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Alert className="border-yellow-200 bg-yellow-50">
                <Gift className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-xs text-yellow-700">
                  쿠폰을 등록하여 고객 유입을 늘려보세요!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 공지사항 */}
        <Card className="border-neutral-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-neutral-900">
                공지사항
              </CardTitle>
              <Badge variant={activationData.has_announcement ? 'default' : 'secondary'}>
                {activationData.has_announcement ? `${activationData.announcement_count}개 활성` : '비활성'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {activationData.has_announcement && activationData.announcement_items?.length > 0 ? (
              <div className="space-y-2">
                {activationData.announcement_items.map((item, index) => (
                  <div key={index} className="p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                    <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
                    <p className="text-xs text-neutral-600 mt-1">{item.content}</p>
                    <p className="text-xs text-neutral-500 mt-1">{item.relative}</p>
                  </div>
                ))}
              </div>
            ) : (
              <Alert className="border-yellow-200 bg-yellow-50">
                <Megaphone className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-xs text-yellow-700">
                  공지사항을 등록하여 고객에게 정보를 전달하세요!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 업체소개글 */}
        <Card className="border-neutral-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-neutral-900">
                업체소개글
              </CardTitle>
              <Badge variant={activationData.description ? 'default' : 'secondary'}>
                {activationData.description ? '등록됨' : '미등록'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {activationData.description ? (
              <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                  {activationData.description}
                </p>
              </div>
            ) : (
              <Alert className="border-blue-200 bg-blue-50">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-700">
                  AI로 SEO 최적화된 업체소개글을 생성해보세요!
                </AlertDescription>
              </Alert>
            )}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowDescriptionModal(true)}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI로 업체소개글 생성하기
            </Button>
          </CardContent>
        </Card>

        {/* 찾아오는길 */}
        <Card className="border-neutral-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-neutral-900">
                찾아오는길
              </CardTitle>
              <Badge variant={activationData.directions ? 'default' : 'secondary'}>
                {activationData.directions ? '등록됨' : '미등록'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {activationData.directions ? (
              <div className="p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                  {activationData.directions}
                </p>
              </div>
            ) : (
              <Alert className="border-blue-200 bg-blue-50">
                <MapPin className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-700">
                  AI로 고객이 쉽게 이해할 수 있는 찾아오는길을 생성해보세요!
                </AlertDescription>
              </Alert>
            )}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowDirectionsModal(true)}
            >
              <MapPin className="w-4 h-4 mr-2" />
              AI로 찾아오는길 생성하기
            </Button>
          </CardContent>
        </Card>

        {/* SNS & 웹사이트 */}
        <Card className="border-neutral-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-neutral-900">
                SNS & 웹사이트
              </CardTitle>
              <Badge variant={
                activationData.homepage || activationData.instagram || activationData.facebook || activationData.blog 
                  ? 'default' 
                  : 'secondary'
              }>
                {[activationData.homepage, activationData.instagram, activationData.facebook, activationData.blog].filter(Boolean).length}개 등록
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* 홈페이지 */}
              {activationData.homepage ? (
                <a
                  href={activationData.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border border-green-200 bg-green-50 hover:border-green-300 transition-colors"
                >
                  <Globe className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">홈페이지</span>
                  <Badge variant="default" className="ml-auto bg-green-500 text-white text-xs">등록됨</Badge>
                  <ExternalLink className="w-3 h-3 text-green-600" />
                </a>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                  <Globe className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm font-medium text-neutral-500">홈페이지</span>
                  <Badge variant="secondary" className="ml-auto text-xs">미등록</Badge>
                </div>
              )}
              
              {/* 인스타그램 */}
              {activationData.instagram ? (
                <a
                  href={activationData.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border border-green-200 bg-green-50 hover:border-green-300 transition-colors"
                >
                  <Instagram className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">인스타그램</span>
                  <Badge variant="default" className="ml-auto bg-green-500 text-white text-xs">등록됨</Badge>
                  <ExternalLink className="w-3 h-3 text-green-600" />
                </a>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                  <Instagram className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm font-medium text-neutral-500">인스타그램</span>
                  <Badge variant="secondary" className="ml-auto text-xs">미등록</Badge>
                </div>
              )}
              
              {/* 페이스북 */}
              {activationData.facebook ? (
                <a
                  href={activationData.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border border-green-200 bg-green-50 hover:border-green-300 transition-colors"
                >
                  <Facebook className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">페이스북</span>
                  <Badge variant="default" className="ml-auto bg-green-500 text-white text-xs">등록됨</Badge>
                  <ExternalLink className="w-3 h-3 text-green-600" />
                </a>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                  <Facebook className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm font-medium text-neutral-500">페이스북</span>
                  <Badge variant="secondary" className="ml-auto text-xs">미등록</Badge>
                </div>
              )}
              
              {/* 블로그 */}
              {activationData.blog ? (
                <a
                  href={activationData.blog}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border border-green-200 bg-green-50 hover:border-green-300 transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">블로그</span>
                  <Badge variant="default" className="ml-auto bg-green-500 text-white text-xs">등록됨</Badge>
                  <ExternalLink className="w-3 h-3 text-green-600" />
                </a>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                  <BookOpen className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm font-medium text-neutral-500">블로그</span>
                  <Badge variant="secondary" className="ml-auto text-xs">미등록</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 네이버 서비스 */}
        <Card className="border-neutral-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-neutral-900">
                네이버 서비스
              </CardTitle>
              <Badge variant={
                [
                  activationData.has_smart_call,
                  activationData.has_naver_pay,
                  activationData.has_naver_booking,
                  activationData.has_naver_talk,
                  activationData.has_naver_order,
                  activationData.is_place_plus
                ].filter(Boolean).length > 0 ? 'default' : 'secondary'
              }>
                {[
                  activationData.has_smart_call,
                  activationData.has_naver_pay,
                  activationData.has_naver_booking,
                  activationData.has_naver_talk,
                  activationData.has_naver_order,
                  activationData.is_place_plus
                ].filter(Boolean).length}개 활성
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: '스마트콜', active: activationData.has_smart_call, icon: Phone },
                { label: '네이버페이', active: activationData.has_naver_pay, icon: CreditCard },
                { label: '예약', active: activationData.has_naver_booking, icon: Calendar },
                { label: '톡톡', active: activationData.has_naver_talk, icon: MessageCircle },
                { label: '주문', active: activationData.has_naver_order, icon: Store },
                { label: '플레이스+', active: activationData.is_place_plus, icon: Award }
              ].map((service) => {
                const Icon = service.icon
                return (
                  <div
                    key={service.label}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border ${
                      service.active 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-neutral-200 bg-neutral-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${service.active ? 'text-green-600' : 'text-neutral-400'}`} />
                    <span className={`text-xs font-medium text-center ${
                      service.active ? 'text-green-900' : 'text-neutral-500'
                    }`}>
                      {service.label}
                    </span>
                    <Badge 
                      variant={service.active ? 'default' : 'secondary'}
                      className={`text-xs ${service.active ? 'bg-green-500 text-white' : ''}`}
                    >
                      {service.active ? '활성' : '비활성'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ===== 메인 렌더링 =====

  // 로딩 중
  if (isLoadingStores) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary-500 mx-auto" />
            <p className="text-neutral-600">매장 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  // 매장 선택 화면
  if (!selectedStore) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
        <div className="space-y-8 md:space-y-10">
          {/* 헤더 섹션 - 홈페이지 스타일 */}
          <header className="mb-8 md:mb-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight">
                플레이스 활성화
              </h1>
            </div>
            <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-3xl mx-auto mb-4">
              매장의 플레이스 활성화 현황을 확인하고<br className="md:hidden" />
              <span className="hidden md:inline"> </span>개선 방안을 확인하세요
            </p>
            <Badge 
              variant="secondary"
              className="bg-green-100 text-green-700 border-green-200 px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
            >
              💡 15 크레딧
            </Badge>
          </header>

          {/* 매장 목록 */}
          {stores.length === 0 ? (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-700">
                등록된 네이버 플레이스 매장이 없습니다. 먼저 매장을 등록해주세요.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map((store) => (
                <Card
                  key={store.id}
                  className="border-neutral-200 hover:border-primary-300 hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => {
                    setSelectedStore(store)
                    showCreditConfirm({
                      featureName: "플레이스 활성화 분석",
                      creditAmount: 15,
                      onConfirm: () => loadActivationData(store.id),
                      onCancel: () => setSelectedStore(null),
                    })
                  }}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {store.thumbnail ? (
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <Image
                            src={store.thumbnail}
                            alt={store.name}
                            fill
                            className="rounded-lg object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-neutral-100 flex items-center justify-center">
                          <Store className="w-6 h-6 text-neutral-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-neutral-900 line-clamp-2 break-words">
                          {store.name}
                        </h3>
                        <p className="text-xs text-neutral-500 mt-1">
                          {store.category}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-600 line-clamp-1">
                      {store.address}
                    </p>
                    <Button
                      size="sm"
                      className="w-full group-hover:bg-primary-600"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedStore(store)
                        showCreditConfirm({
                          featureName: "플레이스 활성화 분석",
                          creditAmount: 15,
                          onConfirm: () => loadActivationData(store.id),
                          onCancel: () => setSelectedStore(null),
                        })
                      }}
                    >
                      활성화 분석
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 분석 중
  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-16 w-16 md:h-20 md:w-20 animate-spin text-green-500 mx-auto" />
            <p className="text-base md:text-lg font-semibold text-neutral-700">플레이스 활성화 정보를 분석하는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  // 메인 화면
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      <div className="space-y-8 md:space-y-10">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {activationData?.thumbnail ? (
              <div className="relative w-12 h-12 flex-shrink-0">
                <Image
                  src={activationData.thumbnail}
                  alt={activationData.store_name}
                  fill
                  className="rounded-lg object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-neutral-100 flex items-center justify-center">
                <Store className="w-6 h-6 text-neutral-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-neutral-900">
                {activationData?.store_name || selectedStore.name}
              </h1>
              <p className="text-xs md:text-sm text-neutral-500">
                플레이스 ID: {activationData?.place_id || selectedStore.place_id}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedStore(null)
              setActivationData(null)
              setActivationHistories([])
            }}
          >
            다른 매장 선택
          </Button>
        </div>

        {/* 활성화 요약 */}
        <div>
          <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-4">
            활성화 요약
          </h2>
          {renderSummaryCards()}
        </div>

        {/* 과거 이력 */}
        {activationHistories.length > 0 && (
          <Card className="border-neutral-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg font-bold text-neutral-900">
                📜 과거 활성화 이력
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {activationHistories.map((history) => {
                  const isExpanded = expandedHistoryId === history.id
                  
                  return (
                    <div
                      key={history.id}
                      className="p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedHistoryId(isExpanded ? null : history.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {new Date(history.created_at).toLocaleDateString('ko-KR')}
                          </Badge>
                          <span className="text-sm font-medium text-neutral-700">
                            {new Date(history.created_at).toLocaleTimeString('ko-KR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>

                      {isExpanded && history.summary_cards && (
                        <div className="mt-3 pt-3 border-t border-neutral-200 space-y-2">
                          {history.summary_cards.map((card: any) => (
                            <div
                              key={card.type}
                              className="flex items-center justify-between p-2 rounded bg-neutral-50"
                            >
                              <span className="text-sm font-medium text-neutral-700">
                                {card.title}
                              </span>
                              <span className="text-sm font-bold text-neutral-900">
                                {card.type === 'visitor_review' || card.type === 'blog_review'
                                  ? card.value.toFixed(1)
                                  : Math.round(card.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 리뷰 추이 */}
        <div>
          <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-4">
            리뷰 추이 현황
          </h2>
          {renderReviewTrends()}
        </div>

        {/* 답글 대기 */}
        <div>
          <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-4">
            답글 대기
          </h2>
          {renderPendingReply()}
        </div>

        {/* 플레이스 정보 */}
        <div>
          <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-4">
            플레이스 정보
          </h2>
          {renderPlaceInfo()}
        </div>
      </div>

      {/* AI 업체소개글 생성 모달 */}
      <Dialog open={showDescriptionModal} onOpenChange={setShowDescriptionModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8">
          <DialogHeader className="space-y-4 pb-4">
            <div className="flex items-center justify-center">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-xl md:text-2xl font-bold text-center text-neutral-900">
              AI로 완벽한 업체소개글 생성하기
            </DialogTitle>
            <DialogDescription className="text-sm md:text-base text-center text-neutral-600">
              SEO 최적화된 업체소개글을 생성합니다.<br className="md:hidden" />
              <span className="hidden md:inline"> </span>모든 필드를 입력하면 더 정확한 결과를 얻을 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 md:space-y-6 pt-2">
            <div className="space-y-2">
              <Label htmlFor="region" className="text-sm md:text-base font-semibold text-neutral-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">1</span>
                지역 키워드 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="region"
                placeholder="예: 합정, 종로, 성수 등"
                value={regionKeyword}
                onChange={(e) => setRegionKeyword(e.target.value)}
                className="h-12 md:h-14 text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 rounded-xl transition-all"
              />
              <p className="text-xs md:text-sm text-neutral-500">가장 메인 지역 1개만 입력</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="landmarks" className="text-sm md:text-base font-semibold text-neutral-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold">2</span>
                랜드마크 키워드
              </Label>
              <Input
                id="landmarks"
                placeholder="예: 합정역, 홍대입구역, 성수역 등"
                value={landmarkKeywords}
                onChange={(e) => setLandmarkKeywords(e.target.value)}
                className="h-12 md:h-14 text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 rounded-xl transition-all"
              />
              <p className="text-xs md:text-sm text-neutral-500">역, 상권, 건물, 관광지 등 (최대 2개, 쉼표로 구분)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business" className="text-sm md:text-base font-semibold text-neutral-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">3</span>
                업종 키워드 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="business"
                placeholder="예: 카페, 식당, 사진관, 헤어샵 등"
                value={businessTypeKeyword}
                onChange={(e) => setBusinessTypeKeyword(e.target.value)}
                className="h-12 md:h-14 text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 rounded-xl transition-all"
              />
              <p className="text-xs md:text-sm text-neutral-500">업종 1개만 입력</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="products" className="text-sm md:text-base font-semibold text-neutral-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold">4</span>
                상품/서비스 키워드
              </Label>
              <Input
                id="products"
                placeholder="예: 칼국수, 보쌈, 커피, 콜드브루 등"
                value={productKeywords}
                onChange={(e) => setProductKeywords(e.target.value)}
                className="h-12 md:h-14 text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 rounded-xl transition-all"
              />
              <p className="text-xs md:text-sm text-neutral-500">최대 3개 (쉼표로 구분)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="features" className="text-sm md:text-base font-semibold text-neutral-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">5</span>
                매장 특색 및 강점 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="features"
                placeholder="예: 저희 매장은 처음 방문하시는 분들도 부담 없이 이용할 수 있도록..."
                value={storeFeatures}
                onChange={(e) => setStoreFeatures(e.target.value)}
                rows={5}
                className="text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 rounded-xl transition-all resize-none"
              />
              <p className="text-xs md:text-sm text-neutral-500">
                매장의 특별한 점, 강점, 차별화 포인트를 자유롭게 입력해주세요
              </p>
            </div>

            <Button
              onClick={handleGenerateDescription}
              disabled={isGenerating || !regionKeyword || !businessTypeKeyword || !storeFeatures}
              className="w-full h-12 md:h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-base md:text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  AI가 생성 중입니다...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  업체소개글 생성하기 (10 크레딧)
                </>
              )}
            </Button>

            {generatedText && (
              <div className="mt-6 space-y-4 p-5 md:p-6 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 rounded-2xl border-2 border-emerald-200/50">
                <div className="flex items-center justify-between">
                  <Label className="text-base md:text-lg font-bold text-neutral-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    생성된 업체소개글
                  </Label>
                  <Badge variant="outline" className="bg-white text-emerald-600 border-emerald-300 font-semibold px-3 py-1">
                    {generatedTextCharCount}자
                  </Badge>
                </div>
                <Textarea
                  value={generatedText}
                  onChange={(e) => {
                    setGeneratedText(e.target.value)
                    setGeneratedTextCharCount(e.target.value.length)
                  }}
                  rows={10}
                  className="text-sm md:text-base leading-relaxed border-2 border-emerald-200 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 rounded-xl transition-all bg-white"
                />
                <Button
                  variant="outline"
                  className="w-full h-11 md:h-12 border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 text-base font-semibold rounded-xl transition-all"
                  onClick={() => copyToClipboard(generatedText)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  클립보드에 복사하기
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI 찾아오는길 생성 모달 */}
      <Dialog open={showDirectionsModal} onOpenChange={setShowDirectionsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8">
          <DialogHeader className="space-y-4 pb-4">
            <div className="flex items-center justify-center">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg">
                <MapPin className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-xl md:text-2xl font-bold text-center text-neutral-900">
              AI로 찾아오는길 생성하기
            </DialogTitle>
            <DialogDescription className="text-sm md:text-base text-center text-neutral-600">
              고객이 쉽게 이해할 수 있는<br className="md:hidden" />
              <span className="hidden md:inline"> </span>찾아오는길을 생성합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 md:space-y-6 pt-2">
            <div className="space-y-2">
              <Label htmlFor="dir-region" className="text-sm md:text-base font-semibold text-neutral-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold">1</span>
                지역 키워드 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dir-region"
                placeholder="예: 합정, 종로, 성수 등"
                value={directionsRegionKeyword}
                onChange={(e) => setDirectionsRegionKeyword(e.target.value)}
                className="h-12 md:h-14 text-base border-2 border-teal-100 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 rounded-xl transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dir-landmarks" className="text-sm md:text-base font-semibold text-neutral-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-bold">2</span>
                랜드마크 키워드
              </Label>
              <Input
                id="dir-landmarks"
                placeholder="예: 합정역, 홍대입구역 등"
                value={directionsLandmarkKeywords}
                onChange={(e) => setDirectionsLandmarkKeywords(e.target.value)}
                className="h-12 md:h-14 text-base border-2 border-teal-100 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 rounded-xl transition-all"
              />
              <p className="text-xs md:text-sm text-neutral-500">역, 주요 건물 등 (쉼표로 구분)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dir-desc" className="text-sm md:text-base font-semibold text-neutral-700 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold">3</span>
                길 안내 설명 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="dir-desc"
                placeholder="예: 합정역 3번 출구에서 직진하여 첫 번째 골목 우측..."
                value={directionsDescription}
                onChange={(e) => setDirectionsDescription(e.target.value)}
                rows={5}
                className="text-base border-2 border-teal-100 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 rounded-xl transition-all resize-none"
              />
            </div>

            <Button
              onClick={handleGenerateDirections}
              disabled={isGenerating || !directionsRegionKeyword || !directionsDescription}
              className="w-full h-12 md:h-14 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-base md:text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  AI가 생성 중입니다...
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5 mr-2" />
                  찾아오는길 생성하기 (10 크레딧)
                </>
              )}
            </Button>

            {generatedDirectionsText && (
              <div className="mt-6 space-y-4 p-5 md:p-6 bg-gradient-to-br from-teal-50/80 to-cyan-50/80 rounded-2xl border-2 border-teal-200/50">
                <div className="flex items-center justify-between">
                  <Label className="text-base md:text-lg font-bold text-neutral-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-400 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    생성된 찾아오는길
                  </Label>
                  <Badge variant="outline" className="bg-white text-teal-600 border-teal-300 font-semibold px-3 py-1">
                    {generatedDirectionsCharCount}자
                  </Badge>
                </div>
                <Textarea
                  value={generatedDirectionsText}
                  onChange={(e) => {
                    setGeneratedDirectionsText(e.target.value)
                    setGeneratedDirectionsCharCount(e.target.value.length)
                  }}
                  rows={8}
                  className="text-sm md:text-base leading-relaxed border-2 border-teal-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 rounded-xl transition-all bg-white"
                />
                <Button
                  variant="outline"
                  className="w-full h-11 md:h-12 border-2 border-teal-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400 text-base font-semibold rounded-xl transition-all"
                  onClick={() => copyToClipboard(generatedDirectionsText)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  클립보드에 복사하기
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 크레딧 차감 확인 모달 */}
      {CreditModal}
      {/* 업그레이드 모달 */}
      {UpgradeModalComponent}
    </div>
  )
}
