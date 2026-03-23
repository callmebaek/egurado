"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from 'next/navigation'
import { 
  Users, 
  Search, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertCircle, 
  CheckCircle2, 
  Store, 
  Target, 
  FileText, 
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/config"
import { notifyCreditUsed } from "@/lib/credit-utils"
import { useCreditConfirm } from "@/lib/hooks/useCreditConfirm"
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface RegisteredStore {
  id: string
  place_id: string
  store_name: string
  name?: string
  category: string
  address: string
  platform: string
  thumbnail?: string
}

interface KeywordInfo {
  id: string
  keyword: string
  store_id: string
}

interface CompetitorStore {
  rank: number
  place_id: string
  name: string
  category: string
  address: string
  diagnosis_score?: number
  diagnosis_grade?: string
  visitor_review_count?: number
  blog_review_count?: number
  total_review_count?: number
  visitor_reviews_7d_avg?: number
  blog_reviews_7d_avg?: number
  announcements_7d?: number
  has_coupon?: boolean
  is_place_plus?: boolean
  is_new_business?: boolean
  supports_naverpay?: boolean
  has_naver_talk?: boolean
  has_naver_order?: boolean
  has_naver_booking?: boolean
  store_search_volume?: number
  important_review?: string
}

interface ComparisonGap {
  my_value: number | boolean
  competitor_avg?: number
  competitor_avg_top5?: number
  competitor_avg_top20?: number
  competitor_rate?: number
  gap?: number
  status: "good" | "bad"
  status_top5?: "good" | "bad"
  status_top20?: "good" | "bad"
}

interface ComparisonResult {
  my_store: CompetitorStore
  competitor_count: number
  gaps: {
    diagnosis_score: ComparisonGap
    visitor_reviews_7d_avg: ComparisonGap
    blog_reviews_7d_avg: ComparisonGap
    announcements_7d: ComparisonGap
    has_coupon: ComparisonGap
    is_place_plus: ComparisonGap
    supports_naverpay: ComparisonGap
    has_naver_talk: ComparisonGap
    has_naver_order: ComparisonGap
  }
  recommendations: Array<{
    priority: string
    category: string
    title: string
    description: string
    impact: string
  }>
  score_distribution: {
    S: number
    A: number
    B: number
    C: number
    D: number
  }
}

export default function CompetitorsPage() {
  const { toast } = useToast()
  const { user, getToken } = useAuth()
  const searchParams = useSearchParams()
  
  // 단계 관리
  const [step, setStep] = useState<1 | 2 | 3>(1)
  
  // 1단계: 매장 선택
  const [stores, setStores] = useState<RegisteredStore[]>([])
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null)
  const [loadingStores, setLoadingStores] = useState(false)
  
  // 2단계: 키워드 입력
  const [keyword, setKeyword] = useState("")
  const [registeredKeywords, setRegisteredKeywords] = useState<KeywordInfo[]>([])
  const [loadingKeywords, setLoadingKeywords] = useState(false)
  
  // 3단계: 상위 매장 목록
  const [topStores, setTopStores] = useState<CompetitorStore[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  
  // 4단계: 분석 결과
  const [analyzedStores, setAnalyzedStores] = useState<CompetitorStore[]>([])
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 })

  // 모바일 카드 확장 상태
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  // 분석 결과 섹션 ref
  const summaryRef = useRef<HTMLDivElement>(null)
  
  // 크레딧 확인 모달
  const { showCreditConfirm, CreditModal } = useCreditConfirm()
  // 업그레이드 모달
  const { handleLimitError, UpgradeModalComponent } = useUpgradeModal()
  
  // 초기 로드: 등록된 매장 가져오기
  useEffect(() => {
    fetchStores()
  }, [])
  
  // URL 파라미터로 자동 분석 시작
  useEffect(() => {
    const autoStart = searchParams.get('autoStart')
    const storeId = searchParams.get('storeId')
    const keywordParam = searchParams.get('keyword')
    
    if (autoStart === 'true' && storeId && keywordParam && stores.length > 0 && !selectedStore) {
      const store = stores.find(s => s.id === storeId)
      if (store) {
        console.log('[경쟁매장 분석] 자동 분석 시작:', store.store_name, keywordParam)
        setSelectedStore(store)
        setKeyword(keywordParam)
        setStep(2)
      }
    }
  }, [searchParams, stores])
  
  // 매장과 키워드가 설정되면 자동으로 검색 시작
  useEffect(() => {
    const autoStart = searchParams.get('autoStart')
    
    if (autoStart === 'true' && selectedStore && keyword && step === 2 && !loadingSearch) {
      console.log('[경쟁매장 분석] 검색 시작:', keyword)
      window.history.replaceState({}, '', window.location.pathname)
      handleKeywordSubmit()
    }
  }, [selectedStore, keyword, step])
  
  const fetchStores = async () => {
    setLoadingStores(true)
    try {
      const token = getToken()
      if (!user || !token) {
        toast({
          title: "로그인 필요",
          description: "로그인이 필요한 서비스입니다.",
          variant: "destructive",
        })
        return
      }
      
      const response = await fetch(api.stores.list(), {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        cache: "no-store"
      })
      
      if (!response.ok) {
        throw new Error("Failed to fetch stores")
      }
      
      const data = await response.json()
      const naverStores = (data.stores || [])
        .filter((s: any) => s.platform === "naver")
        .map((s: any) => ({
          ...s,
          store_name: s.name || s.store_name
        }))
      setStores(naverStores)
    } catch (error) {
      console.error("매장 로드 실패:", error)
      toast({
        title: "오류",
        description: "매장 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoadingStores(false)
    }
  }
  
  const handleStoreSelect = async (store: RegisteredStore) => {
    setSelectedStore(store)
    setStep(2)
    
    setLoadingKeywords(true)
    try {
      const response = await fetch(api.keywords.list(store.id))
      
      if (!response.ok) {
        throw new Error("Failed to fetch keywords")
      }
      
      const data = await response.json()
      setRegisteredKeywords(data.keywords || [])
    } catch (error) {
      console.error("키워드 조회 실패:", error)
    } finally {
      setLoadingKeywords(false)
    }
  }
  
  const handleKeywordSubmit = async () => {
    if (!keyword.trim()) {
      toast({
        title: "키워드 입력 필요",
        description: "분석할 키워드를 입력해주세요.",
        variant: "destructive",
      })
      return
    }
    
    // 🆕 크레딧 사전 체크 (검색 전)
    try {
      const token = await getToken()
      if (!token) {
        toast({
          title: "인증 오류",
          description: "로그인이 필요합니다.",
          variant: "destructive",
        })
        return
      }
      
      const creditsResponse = await fetch(`${api.baseUrl}/api/v1/credits/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (creditsResponse.ok) {
        const creditsData = await creditsResponse.json()
        const currentCredits = creditsData.total_remaining || 0
        
        if (currentCredits < 30) {
          toast({
            title: "크레딧 부족",
            description: `크레딧이 부족합니다. (필요: 30 크레딧, 보유: ${currentCredits} 크레딧)`,
            variant: "destructive",
          })
          return
        }
      }
    } catch (error) {
      console.error('크레딧 체크 오류:', error)
      // 크레딧 체크 실패 시에도 계속 진행 (기존 동작 유지)
    }
    
    setLoadingSearch(true)
    
    try {
      const response = await fetch(`${api.baseUrl}/api/v1/naver/competitor/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword,
          limit: 20,
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`검색 실패: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      
      if (!data.stores || data.stores.length === 0) {
        toast({
          title: "검색 결과 없음",
          description: "해당 키워드로 검색된 매장이 없습니다.",
          variant: "destructive",
        })
        return
      }
      
      const basicStores = data.stores.map((store: any, index: number) => ({
        rank: index + 1,
        place_id: store.place_id,
        name: store.name || store.store_name,
        category: store.category,
        address: store.address,
      }))
      
      setTopStores(basicStores)
      setStep(3)
      
      toast({
        title: "검색 완료",
        description: `상위 ${basicStores.length}개 매장을 찾았습니다. 상세 분석을 시작합니다.`,
      })
      
      setTimeout(() => {
        handleStartAnalysis(basicStores)
      }, 500)
      
    } catch (error: any) {
      toast({
        title: "검색 실패",
        description: error.message || "경쟁매장 검색 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoadingSearch(false)
    }
  }
  
  const handleStartAnalysis = (storesToAnalyze?: CompetitorStore[]) => {
    if (!selectedStore) return
    
    const stores = storesToAnalyze || topStores
    
    if (stores.length === 0) {
      toast({
        title: "오류",
        description: "분석할 경쟁매장이 없습니다.",
        variant: "destructive",
      })
      return
    }
    
    showCreditConfirm({
      featureName: "경쟁매장 분석",
      creditAmount: 30,
      onConfirm: () => executeStartAnalysis(stores),
    })
  }

  const executeStartAnalysis = async (stores: CompetitorStore[]) => {
    setLoadingAnalysis(true)
    setAnalysisProgress({ current: 0, total: stores.length })
    
    try {
      // ==================== 1단계: 우리 매장 분석 ====================
      const myStoreUrl = `${api.baseUrl}/api/v1/naver/competitor/analyze-single/${selectedStore.place_id}?rank=0&store_name=${encodeURIComponent(selectedStore.store_name)}`
      
      const myStoreResponse = await fetch(myStoreUrl)
      
      if (!myStoreResponse.ok) {
        const errorText = await myStoreResponse.text()
        throw new Error(`우리 매장 분석 실패: ${myStoreResponse.status} - ${errorText}`)
      }
      
      const myStoreData = await myStoreResponse.json()
      const myStore = myStoreData.result
      
      // ==================== 2단계: 경쟁매장 개별 분석 (⚡ 성능 최적화) ====================
      const analyzed: CompetitorStore[] = []
      
      // 1개씩 순차 분석 (실시간 업데이트)
      for (let i = 0; i < stores.length; i++) {
        const store = stores[i]
        
        // Progress 업데이트 (분석 시작 전)
        setAnalysisProgress({ current: i, total: stores.length })
        
        try {
          const competitorUrl = `${api.baseUrl}/api/v1/naver/competitor/analyze-single/${store.place_id}?rank=${store.rank}&store_name=${encodeURIComponent(store.name)}`
          const response = await fetch(competitorUrl)
          
          if (response.ok) {
            const data = await response.json()
            analyzed.push(data.result)
            setAnalyzedStores([...analyzed])  // 실시간 업데이트
            
            // Progress 업데이트 (분석 완료 후)
            setAnalysisProgress({ current: i + 1, total: stores.length })
          } else {
            console.error(`${store.name} 분석 실패: ${response.status}`)
          }
        } catch (error) {
          console.error(`${store.name} 분석 에러:`, error)
        }
        
        // ⚡ 성능 최적화: 대기 시간 단축 (1초 → 0.1초)
        if (i < stores.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      // ==================== 3단계: 비교 분석 ====================
      const token = await getToken()
      if (!token) {
        throw new Error("인증 토큰이 없습니다")
      }
      
      console.log('[경쟁매장] 비교 분석 요청 시작')
      
      const comparisonResponse = await fetch(
        `${api.url("/api/v1/naver/competitor/compare")}`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            my_store: myStore,
            competitors: analyzed,
          }),
        }
      )
      
      const comparisonResult = await comparisonResponse.json()
      
      if (!comparisonResponse.ok) {
        // 403 또는 제한 관련 에러 → 업그레이드 모달 표시
        if (handleLimitError(comparisonResponse.status, comparisonResult.detail)) {
          return
        }
        // 402 에러 (크레딧 부족)를 명시적으로 처리
        if (comparisonResponse.status === 402) {
          throw new Error(comparisonResult.detail || "크레딧이 부족합니다. 크레딧을 충전하거나 플랜을 업그레이드해주세요.")
        }
        throw new Error(comparisonResult.detail || "비교 분석 중 오류가 발생했습니다")
      }
      
      setComparison(comparisonResult)

      // ✨ 크레딧 실시간 차감 알림 (경쟁사 분석 30 크레딧)
      notifyCreditUsed(30, token)

      setTimeout(() => {
        summaryRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
      }, 100)
      
      toast({
        title: "분석 완료",
        description: `${analyzed.length}개 경쟁매장 분석이 완료되었습니다.`,
      })
    } catch (error: any) {
      console.error('경쟁매장 분석 에러:', error)
      let errorMessage = "경쟁매장 분석 중 오류가 발생했습니다."
      
      if (error.message.includes("크레딧")) {
        // 크레딧 부족 에러는 원본 메시지 그대로 표시
        errorMessage = error.message
      } else if (error.message.includes("404")) {
        errorMessage = "매장 정보를 찾을 수 없습니다. 매장이 올바르게 등록되었는지 확인해주세요."
      } else if (error.message.includes("우리 매장")) {
        errorMessage = "우리 매장 분석에 실패했습니다. place_id를 확인해주세요."
      }
      
      toast({
        title: "분석 실패",
        description: errorMessage,
        variant: "destructive",
      })
      
      // 크레딧 부족 등의 에러 발생 시 분석 진행 상태 초기화
      setAnalysisProgress({ current: 0, total: 0 })
    } finally {
      setLoadingAnalysis(false)
    }
  }
  
  const resetAnalysis = () => {
    setStep(1)
    setSelectedStore(null)
    setKeyword("")
    setTopStores([])
    setAnalyzedStores([])
    setComparison(null)
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'bg-purple-500'
      case 'A': return 'bg-blue-500'
      case 'B': return 'bg-green-500'
      case 'C': return 'bg-orange-500'
      default: return 'bg-red-500'
    }
  }

  const toggleCardExpansion = (placeId: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(placeId)) {
      newExpanded.delete(placeId)
    } else {
      newExpanded.add(placeId)
    }
    setExpandedCards(newExpanded)
  }
  
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      {/* 헤더 섹션 - 홈페이지 스타일 */}
      <header className="mb-8 md:mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-red-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <Users className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight">
            경쟁매장 분석
          </h1>
        </div>
        <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-3xl mx-auto mb-4">
          키워드 기반으로 상위 노출 경쟁매장을 분석하고<br className="md:hidden" />
          <span className="hidden md:inline"> </span>우리 매장과 비교합니다
        </p>
        <div className="flex items-center justify-center gap-3">
          <Badge 
            variant="secondary"
            className="bg-red-100 text-red-700 border-red-200 px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Target className="w-4 h-4" />
            경쟁 분석
          </Badge>
          {step > 1 && (
            <Button
              variant="outline"
              onClick={resetAnalysis}
              className="h-11 px-5 border-2 border-neutral-300 hover:bg-neutral-50 rounded-xl font-semibold"
            >
              처음으로
            </Button>
          )}
        </div>
      </header>

      {/* 진행 단계 표시 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((s, idx) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    step >= s 
                      ? 'bg-primary text-white' 
                      : 'bg-neutral-200 text-neutral-500'
                  }`}>
                    {s}
                  </div>
                  <span className="text-sm font-semibold text-neutral-700 hidden sm:inline">
                    {s === 1 && "매장 선택"}
                    {s === 2 && "키워드 입력"}
                    {s === 3 && "분석 결과"}
                  </span>
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-1 mx-4 rounded transition-all ${
                    step > s ? 'bg-primary' : 'bg-neutral-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 1단계: 매장 선택 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Store className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">1단계: 분석할 매장 선택</CardTitle>
                <CardDescription>경쟁 분석을 진행할 우리 매장을 선택하세요</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingStores ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-neutral-600">매장 목록을 불러오는 중...</p>
              </div>
            ) : stores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <AlertCircle className="w-16 h-16 text-neutral-300" />
                <p className="text-neutral-600">등록된 매장이 없습니다.</p>
                <p className="text-sm text-neutral-500">먼저 네이버 플레이스 매장을 등록해주세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stores.map((store) => (
                  <Card
                    key={store.id}
                    className="border-neutral-200 hover:border-primary-300 hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => handleStoreSelect(store)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        {store.thumbnail ? (
                          <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden">
                            <img
                              src={store.thumbnail}
                              alt={store.store_name || '매장'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-neutral-100 flex items-center justify-center">
                            <Store className="w-6 h-6 text-neutral-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-neutral-900 line-clamp-2 break-words">
                            {store.store_name || "매장명 없음"}
                          </h3>
                          <p className="text-xs text-neutral-500 mt-1">
                            {store.category || "카테고리 없음"}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-600 line-clamp-1">
                        {store.address || "주소 없음"}
                      </p>
                      <Button
                        size="sm"
                        className="w-full group-hover:bg-primary-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStoreSelect(store)
                        }}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        이 매장 선택
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2단계: 키워드 입력 */}
      {step === 2 && selectedStore && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl">2단계: 타겟 키워드 입력</CardTitle>
                <CardDescription>경쟁 분석을 진행할 키워드를 입력하세요</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Card className="bg-neutral-50 border-neutral-200">
              <CardContent className="pt-4">
                <p className="text-sm font-semibold text-neutral-700 mb-1">선택된 매장</p>
                <p className="text-lg font-bold text-neutral-900">{selectedStore.store_name}</p>
                <p className="text-sm text-neutral-600">{selectedStore.category || "카테고리 정보 없음"}</p>
              </CardContent>
            </Card>

            <div>
              <label className="text-sm font-semibold text-neutral-700 mb-2 block">분석할 키워드 입력</label>
              <div className="flex gap-2">
                <Input
                  placeholder="예: 강남 맛집, 성수동 카페"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleKeywordSubmit()}
                  className="flex-1"
                />
                <Button
                  onClick={handleKeywordSubmit}
                  disabled={loadingSearch || !keyword.trim()}
                  className="px-6"
                >
                  {loadingSearch ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  검색
                </Button>
              </div>
            </div>

            {loadingKeywords ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
              </div>
            ) : registeredKeywords.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-neutral-700 mb-2">등록된 키워드에서 선택</p>
                <div className="flex flex-wrap gap-2">
                  {registeredKeywords.map((kw) => (
                    <Badge
                      key={kw.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-white transition-colors px-3 py-1"
                      onClick={() => setKeyword(kw.keyword)}
                    >
                      {kw.keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3단계: 분석 결과 */}
      {step === 3 && topStores.length > 0 && (
        <>
          {/* 진행 상황 */}
          {loadingAnalysis && (
            <Alert className="mb-6 bg-blue-50 border-primary">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <AlertTitle className="text-primary font-semibold">
                {analysisProgress.current === 0 ? (
                  "우리 매장 분석 중..."
                ) : (
                  `경쟁매장 분석 중... (${analysisProgress.current}/${analysisProgress.total})`
                )}
              </AlertTitle>
              <AlertDescription>
                <div className="mt-2 w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300 ease-out"
                    style={{ width: analysisProgress.total > 0 ? `${(analysisProgress.current / analysisProgress.total) * 100}%` : '0%' }}
                  />
                </div>
                {analysisProgress.current > 0 && (
                  <p className="text-xs text-neutral-600 mt-2">
                    {selectedStore?.store_name} 매장과 비교할 경쟁매장을 분석하고 있습니다
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* 경쟁매장 상세 목록 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="w-5 h-5" />
                경쟁매장 상세 분석
              </CardTitle>
              <CardDescription>
                분석 완료: {analyzedStores.length} / {topStores.length}개
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* PC: 테이블 뷰 */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">순위</TableHead>
                      <TableHead className="min-w-[150px]">매장명</TableHead>
                      <TableHead className="min-w-[100px]">업종</TableHead>
                      <TableHead className="min-w-[120px]">진단점수</TableHead>
                      <TableHead className="min-w-[100px]">전체리뷰</TableHead>
                      <TableHead className="min-w-[100px]">방문자(7일)</TableHead>
                      <TableHead className="min-w-[100px]">블로그(7일)</TableHead>
                      <TableHead className="min-w-[90px]">공지(7일)</TableHead>
                      <TableHead className="w-[70px] text-center">쿠폰</TableHead>
                      <TableHead className="w-[70px] text-center">플플</TableHead>
                      <TableHead className="w-[80px] text-center">네페이</TableHead>
                      <TableHead className="w-[80px] text-center">네톡</TableHead>
                      <TableHead className="w-[80px] text-center">네주문</TableHead>
                      <TableHead className="w-[90px] text-center">네예약</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topStores.map((store) => {
                      const analyzed = analyzedStores.find(s => s.place_id === store.place_id)
                      const isLoading = !analyzed && loadingAnalysis
                      
                      return (
                        <TableRow key={store.place_id}>
                          <TableCell className="font-semibold">{store.rank}</TableCell>
                          <TableCell className="font-semibold">{store.name}</TableCell>
                          <TableCell className="text-sm text-neutral-600">{store.category}</TableCell>
                          <TableCell>
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : analyzed ? (
                              <Badge className={`${getGradeColor(analyzed.diagnosis_grade || 'D')} text-white`}>
                                {analyzed.diagnosis_score?.toFixed(1)}점 ({analyzed.diagnosis_grade})
                              </Badge>
                            ) : (
                              <span className="text-xs text-neutral-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : analyzed ? (
                              <span className="text-sm">{analyzed.visitor_review_count || 0}+{analyzed.blog_review_count || 0}</span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : analyzed ? (
                              analyzed.visitor_reviews_7d_avg?.toFixed(1) || 0
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : analyzed ? (
                              analyzed.blog_reviews_7d_avg?.toFixed(1) || 0
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : analyzed ? (
                              analyzed.announcements_7d || 0
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            ) : analyzed ? (
                              analyzed.has_coupon ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <Minus className="w-4 h-4 text-neutral-300 mx-auto" />
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            ) : analyzed ? (
                              analyzed.is_place_plus ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <Minus className="w-4 h-4 text-neutral-300 mx-auto" />
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            ) : analyzed ? (
                              analyzed.supports_naverpay ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <Minus className="w-4 h-4 text-neutral-300 mx-auto" />
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            ) : analyzed ? (
                              analyzed.has_naver_talk ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <Minus className="w-4 h-4 text-neutral-300 mx-auto" />
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            ) : analyzed ? (
                              analyzed.has_naver_order ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <Minus className="w-4 h-4 text-neutral-300 mx-auto" />
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            ) : analyzed ? (
                              analyzed.has_naver_booking ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <Minus className="w-4 h-4 text-neutral-300 mx-auto" />
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile & Tablet: 카드 뷰 */}
              <div className="lg:hidden space-y-3">
                {topStores.map((store) => {
                  const analyzed = analyzedStores.find(s => s.place_id === store.place_id)
                  const isLoading = !analyzed && loadingAnalysis
                  const isExpanded = expandedCards.has(store.place_id)
                  
                  return (
                    <Card key={store.place_id} className="border-2">
                      <CardContent className="p-4">
                        {/* 기본 정보 (항상 표시) */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="font-bold">#{store.rank}</Badge>
                              <h3 className="font-bold text-base">{store.name}</h3>
                            </div>
                            <p className="text-sm text-neutral-600">{store.category}</p>
                          </div>
                          {isLoading && (
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          )}
                        </div>

                        {/* 핵심 지표 (항상 표시) */}
                        {analyzed && (
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-neutral-50 p-2 rounded">
                              <p className="text-xs text-neutral-600 mb-1">진단점수</p>
                              <Badge className={`${getGradeColor(analyzed.diagnosis_grade || 'D')} text-white text-xs`}>
                                {analyzed.diagnosis_score?.toFixed(1)}점 ({analyzed.diagnosis_grade})
                              </Badge>
                            </div>
                            <div className="bg-neutral-50 p-2 rounded">
                              <p className="text-xs text-neutral-600 mb-1">전체 리뷰</p>
                              <p className="font-semibold text-sm">
                                {(analyzed.visitor_review_count || 0) + (analyzed.blog_review_count || 0)}개
                              </p>
                            </div>
                          </div>
                        )}

                        {/* 확장 버튼 */}
                        {analyzed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCardExpansion(store.place_id)}
                            className="w-full text-xs"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-1" />
                                접기
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-1" />
                                상세 정보 보기
                              </>
                            )}
                          </Button>
                        )}

                        {/* 상세 정보 (확장 시 표시) */}
                        {isExpanded && analyzed && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-neutral-600">방문자 리뷰 (7일)</p>
                                <p className="font-semibold">{analyzed.visitor_reviews_7d_avg?.toFixed(1) || 0}개</p>
                              </div>
                              <div>
                                <p className="text-neutral-600">블로그 리뷰 (7일)</p>
                                <p className="font-semibold">{analyzed.blog_reviews_7d_avg?.toFixed(1) || 0}개</p>
                              </div>
                              <div>
                                <p className="text-neutral-600">공지사항 (7일)</p>
                                <p className="font-semibold">{analyzed.announcements_7d || 0}개</p>
                              </div>
                              <div>
                                <p className="text-neutral-600">검색량</p>
                                <p className="font-semibold">{analyzed.store_search_volume?.toLocaleString() || '0'}</p>
                              </div>
                            </div>

                            <div className="pt-2">
                              <p className="text-xs text-neutral-600 mb-2">네이버 서비스</p>
                              <div className="flex flex-wrap gap-2">
                                {analyzed.has_coupon && <Badge variant="secondary" className="text-xs">쿠폰</Badge>}
                                {analyzed.is_place_plus && <Badge variant="secondary" className="text-xs">플플</Badge>}
                                {analyzed.supports_naverpay && <Badge variant="secondary" className="text-xs">네페이</Badge>}
                                {analyzed.has_naver_talk && <Badge variant="secondary" className="text-xs">네톡</Badge>}
                                {analyzed.has_naver_order && <Badge variant="secondary" className="text-xs">네주문</Badge>}
                                {analyzed.has_naver_booking && <Badge variant="secondary" className="text-xs">네예약</Badge>}
                                {!analyzed.has_coupon && !analyzed.is_place_plus && !analyzed.supports_naverpay && 
                                 !analyzed.has_naver_talk && !analyzed.has_naver_order && !analyzed.has_naver_booking && (
                                  <span className="text-xs text-neutral-400">등록된 서비스 없음</span>
                                )}
                              </div>
                            </div>

                            {analyzed.important_review && (
                              <div className="pt-2">
                                <p className="text-xs text-neutral-600 mb-1">하이라이트 리뷰</p>
                                <p className="text-xs text-neutral-700 line-clamp-3">{analyzed.important_review}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* 비교 분석 요약 */}
          {!loadingAnalysis && analyzedStores.length > 0 && comparison && (
            <>
              <Card ref={summaryRef} className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-xl flex items-center gap-2">
                      📊 비교 분석 요약
                    </CardTitle>
                    <Badge variant="secondary" className="text-sm">
                      {selectedStore?.store_name} vs 상위 {comparison.competitor_count}개
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 플레이스 진단 점수 */}
                    <Card className="border-2">
                      <CardContent className="p-4">
                        <p className="text-sm text-neutral-600 mb-2">플레이스 진단 점수</p>
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-3xl font-bold text-primary">
                            {comparison.gaps.diagnosis_score.my_value?.toFixed(1) || '0.0'}
                          </span>
                          <span className="text-sm text-neutral-600">점</span>
                        </div>
                        <div className="border-t pt-2 space-y-1">
                          <p className="text-xs text-neutral-600">
                            경쟁매장 평균: <span className="font-semibold">{comparison.gaps.diagnosis_score.competitor_avg?.toFixed(1) || '0.0'}점</span>
                          </p>
                          <div className="flex items-center gap-1">
                            {comparison.gaps.diagnosis_score.status === 'good' ? (
                              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                <TrendingUp className="w-3 h-3 text-green-600" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                                <TrendingDown className="w-3 h-3 text-red-600" />
                              </div>
                            )}
                            <span className={`text-xs font-semibold ${comparison.gaps.diagnosis_score.status === 'good' ? 'text-green-600' : 'text-red-600'}`}>
                              {Math.abs((comparison.gaps.diagnosis_score.my_value || 0) - (comparison.gaps.diagnosis_score.competitor_avg || 0)).toFixed(1)}점 {comparison.gaps.diagnosis_score.status === 'good' ? '우수' : '부족'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 방문자 리뷰 */}
                    <Card className="border-2">
                      <CardContent className="p-4">
                        <p className="text-sm text-neutral-600 mb-2">일평균 방문자 리뷰 (7일)</p>
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-3xl font-bold text-primary">
                            {comparison.gaps.visitor_reviews_7d_avg.my_value?.toFixed(1) || '0.0'}
                          </span>
                          <span className="text-sm text-neutral-600">개</span>
                        </div>
                        <div className="border-t pt-2 space-y-1">
                          <p className="text-xs text-neutral-600">
                            경쟁매장 평균: <span className="font-semibold">{comparison.gaps.visitor_reviews_7d_avg.competitor_avg?.toFixed(1) || '0.0'}개</span>
                          </p>
                          <div className="flex items-center gap-1">
                            {comparison.gaps.visitor_reviews_7d_avg.status === 'good' ? (
                              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                <TrendingUp className="w-3 h-3 text-green-600" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                                <TrendingDown className="w-3 h-3 text-red-600" />
                              </div>
                            )}
                            <span className={`text-xs font-semibold ${comparison.gaps.visitor_reviews_7d_avg.status === 'good' ? 'text-green-600' : 'text-red-600'}`}>
                              {Math.abs((comparison.gaps.visitor_reviews_7d_avg.my_value || 0) - (comparison.gaps.visitor_reviews_7d_avg.competitor_avg || 0)).toFixed(1)}개 {comparison.gaps.visitor_reviews_7d_avg.status === 'good' ? '우수' : '부족'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 블로그 리뷰 */}
                    <Card className="border-2">
                      <CardContent className="p-4">
                        <p className="text-sm text-neutral-600 mb-2">일평균 블로그 리뷰 (7일)</p>
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-3xl font-bold text-primary">
                            {comparison.gaps.blog_reviews_7d_avg.my_value?.toFixed(1) || '0.0'}
                          </span>
                          <span className="text-sm text-neutral-600">개</span>
                        </div>
                        <div className="border-t pt-2 space-y-1">
                          <p className="text-xs text-neutral-600">
                            경쟁매장 평균: <span className="font-semibold">{comparison.gaps.blog_reviews_7d_avg.competitor_avg?.toFixed(1) || '0.0'}개</span>
                          </p>
                          <div className="flex items-center gap-1">
                            {comparison.gaps.blog_reviews_7d_avg.status === 'good' ? (
                              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                <TrendingUp className="w-3 h-3 text-green-600" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                                <TrendingDown className="w-3 h-3 text-red-600" />
                              </div>
                            )}
                            <span className={`text-xs font-semibold ${comparison.gaps.blog_reviews_7d_avg.status === 'good' ? 'text-green-600' : 'text-red-600'}`}>
                              {Math.abs((comparison.gaps.blog_reviews_7d_avg.my_value || 0) - (comparison.gaps.blog_reviews_7d_avg.competitor_avg || 0)).toFixed(1)}개 {comparison.gaps.blog_reviews_7d_avg.status === 'good' ? '우수' : '부족'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 공지사항 */}
                    <Card className="border-2">
                      <CardContent className="p-4">
                        <p className="text-sm text-neutral-600 mb-2">7일간 공지 등록 수</p>
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-3xl font-bold text-primary">
                            {comparison.gaps.announcements_7d.my_value?.toFixed(1) || '0.0'}
                          </span>
                          <span className="text-sm text-neutral-600">개</span>
                        </div>
                        <div className="border-t pt-2 space-y-1">
                          <p className="text-xs text-neutral-600">
                            경쟁매장 평균: <span className="font-semibold">{comparison.gaps.announcements_7d.competitor_avg?.toFixed(1) || '0.0'}개</span>
                          </p>
                          <div className="flex items-center gap-1">
                            {comparison.gaps.announcements_7d.status === 'good' ? (
                              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                <TrendingUp className="w-3 h-3 text-green-600" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                                <TrendingDown className="w-3 h-3 text-red-600" />
                              </div>
                            )}
                            <span className={`text-xs font-semibold ${comparison.gaps.announcements_7d.status === 'good' ? 'text-green-600' : 'text-red-600'}`}>
                              {Math.abs((comparison.gaps.announcements_7d.my_value || 0) - (comparison.gaps.announcements_7d.competitor_avg || 0)).toFixed(1)}개 {comparison.gaps.announcements_7d.status === 'good' ? '우수' : '부족'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* 개선 권장사항 */}
              {comparison.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      🎯 개선 권장사항
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {comparison.recommendations.map((rec, idx) => (
                        <Card key={idx} className="border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant={rec.priority === "high" ? "destructive" : "default"} className="text-xs">
                                    {rec.priority === "high" ? "높음" : "보통"}
                                  </Badge>
                                  <h4 className="font-semibold text-sm">{rec.title}</h4>
                                </div>
                                <p className="text-sm text-neutral-600">{rec.description}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* Footer */}
      <Card className="mt-6 bg-neutral-100 border-neutral-200">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-neutral-600">
            © {new Date().getFullYear()} Egurado Competitor Analysis Report • Generated on {new Date().toLocaleString('ko-KR')}
          </p>
        </CardContent>
      </Card>
      {/* 크레딧 차감 확인 모달 */}
      {CreditModal}
      {/* 업그레이드 모달 */}
      {UpgradeModalComponent}
    </div>
  )
}
