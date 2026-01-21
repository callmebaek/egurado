"use client"

import { useState, useEffect } from "react"
import { Users, Search, Loader2, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, Store, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { api } from "@/lib/config"

interface RegisteredStore {
  id: string
  place_id: string
  store_name: string
  name?: string // API 응답에서 name으로 올 수도 있음
  category: string
  address: string
  platform: string
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
  
  // 초기 로드: 등록된 매장 가져오기
  useEffect(() => {
    fetchStores()
  }, [])
  
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
        }
      })
      
      if (!response.ok) {
        throw new Error("Failed to fetch stores")
      }
      
      const data = await response.json()
      // API는 'name' 필드를 반환하지만, 이 컴포넌트는 'store_name'을 기대함
      const naverStores = (data.stores || [])
        .filter((s: any) => s.platform === "naver")
        .map((s: any) => ({
          ...s,
          store_name: s.name || s.store_name // name을 store_name으로 매핑
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
    
    // 해당 매장의 등록된 키워드 가져오기
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
    
    setLoadingSearch(true)
    console.log("[경쟁매장] 검색 시작:", keyword)
    console.log("[경쟁매장] API URL:", `${api.baseUrl}/api/v1/naver/competitor/search`)
    
    try {
      const response = await fetch(`${api.baseUrl}/api/v1/naver/competitor/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword,
          limit: 20,
        }),
      })
      
      console.log("[경쟁매장] 응답 상태:", response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error("[경쟁매장] 에러 응답:", errorText)
        throw new Error(`검색 실패: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      console.log("[경쟁매장] 검색 결과:", data)
      
      if (!data.stores || data.stores.length === 0) {
        toast({
          title: "검색 결과 없음",
          description: "해당 키워드로 검색된 매장이 없습니다.",
          variant: "destructive",
        })
        return
      }
      
      // 기본 정보만 있는 매장 목록
      const basicStores = data.stores.map((store: any, index: number) => ({
        rank: index + 1,
        place_id: store.place_id,
        name: store.name || store.store_name, // API 응답에는 name으로 올 수 있음
        category: store.category,
        address: store.address,
      }))
      
      console.log("[경쟁매장] 파싱된 매장 목록:", basicStores)
      
      setTopStores(basicStores)
      setStep(3)
      
      toast({
        title: "검색 완료",
        description: `상위 ${basicStores.length}개 매장을 찾았습니다. 상세 분석을 시작합니다.`,
      })
      
      // 자동으로 상세 분석 시작 (basicStores를 직접 전달)
      setTimeout(() => {
        handleStartAnalysis(basicStores)
      }, 500)
      
    } catch (error: any) {
      console.error("[경쟁매장] 검색 실패:", error)
      toast({
        title: "검색 실패",
        description: error.message || "경쟁매장 검색 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoadingSearch(false)
    }
  }
  
  const handleStartAnalysis = async (storesToAnalyze?: CompetitorStore[]) => {
    if (!selectedStore) return
    
    // topStores 대신 파라미터로 받은 stores 사용 (React 상태 업데이트 비동기 문제 해결)
    const stores = storesToAnalyze || topStores
    
    if (stores.length === 0) {
      console.error("[경쟁매장] 분석할 매장이 없습니다")
      toast({
        title: "오류",
        description: "분석할 경쟁매장이 없습니다.",
        variant: "destructive",
      })
      return
    }
    
    setLoadingAnalysis(true)
    setAnalysisProgress({ current: 0, total: stores.length + 1 })
    
    try {
      // 점진적 분석: 우리 매장 먼저
      const myStoreUrl = `${api.baseUrl}/api/v1/naver/competitor/analyze-single/${selectedStore.place_id}?rank=0&store_name=${encodeURIComponent(selectedStore.store_name)}`
      
      console.log("[경쟁매장] 우리 매장 분석 시작:", {
        store_name: selectedStore.store_name,
        place_id: selectedStore.place_id,
        url: myStoreUrl
      })
      
      setAnalysisProgress({ current: 1, total: stores.length + 1 })
      
      const myStoreResponse = await fetch(myStoreUrl)
      
      console.log("[경쟁매장] 우리 매장 응답 상태:", myStoreResponse.status)
      
      if (!myStoreResponse.ok) {
        const errorText = await myStoreResponse.text()
        console.error("[경쟁매장] 우리 매장 에러:", errorText)
        throw new Error(`우리 매장 분석 실패: ${myStoreResponse.status} - ${errorText}`)
      }
      
      const myStoreData = await myStoreResponse.json()
      console.log("[경쟁매장] 우리 매장 응답 데이터:", myStoreData)
      
      const myStore = myStoreData.result
      console.log("[경쟁매장] 우리 매장 분석 완료:", myStore)
      
      // 경쟁사 분석 (점진적)
      const analyzed: CompetitorStore[] = []
      
      console.log("[경쟁매장] 경쟁사 분석 시작: 총 " + stores.length + "개")
      
      for (let i = 0; i < stores.length; i++) {
        const store = stores[i]
        setAnalysisProgress({ current: i + 2, total: stores.length + 1 })
        
        console.log(`[경쟁매장] ${i + 1}/${stores.length} 분석 중: ${store.name}`)
        
        try {
          const competitorUrl = `${api.baseUrl}/api/v1/naver/competitor/analyze-single/${store.place_id}?rank=${store.rank}&store_name=${encodeURIComponent(store.name)}`
          
          const response = await fetch(competitorUrl)
          console.log(`[경쟁매장] ${store.name} 응답 상태:`, response.status)
          
          if (response.ok) {
            const data = await response.json()
            console.log(`[경쟁매장] ${store.name} 데이터:`, data.result)
            analyzed.push(data.result)
            
            // 실시간 업데이트
            setAnalyzedStores([...analyzed])
          } else {
            const errorText = await response.text()
            console.error(`[경쟁매장] ${store.name} 에러:`, errorText)
            
            // 에러 정보 파싱
            try {
              const errorJson = JSON.parse(errorText)
              console.warn(`[경쟁매장] ${store.name} 분석 실패: ${errorJson.detail || '알 수 없는 오류'}`)
            } catch {
              console.warn(`[경쟁매장] ${store.name} 분석 실패 (${response.status})`)
            }
          }
        } catch (error) {
          console.error(`[경쟁매장] ${store.name} 분석 실패:`, error)
          console.warn(`[경쟁매장] ${store.name} 스킵됨 - 다음 매장 분석 계속`)
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      // 비교 분석 생성
      console.log("[경쟁매장] 비교 분석 생성 시작")
      console.log("[경쟁매장] 우리 매장:", myStore)
      console.log("[경쟁매장] 분석된 경쟁사:", analyzed)
      
      // 백엔드에서 LLM 기반 비교 분석 가져오기
      console.log("[경쟁매장] 백엔드에서 비교 분석 요청 중...")
      const comparisonResponse = await fetch(
        `${api.url("/api/v1/naver/competitor/compare")}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            my_store: myStore,
            competitors: analyzed,
          }),
        }
      )
      
      if (!comparisonResponse.ok) {
        console.warn("[경쟁매장] 백엔드 비교 분석 실패, 로컬 생성 사용")
        const comparisonData = generateComparison(myStore, analyzed)
        setComparison(comparisonData)
      } else {
        const comparisonResult = await comparisonResponse.json()
        console.log("[경쟁매장] 비교 분석 결과 (LLM):", comparisonResult)
        setComparison(comparisonResult)
      }
      
      toast({
        title: "분석 완료",
        description: `${analyzed.length}개 경쟁매장 분석이 완료되었습니다.`,
      })
    } catch (error: any) {
      console.error("[경쟁매장] 분석 실패:", error)
      
      let errorMessage = "경쟁매장 분석 중 오류가 발생했습니다."
      
      if (error.message.includes("404")) {
        errorMessage = "매장 정보를 찾을 수 없습니다. 매장이 올바르게 등록되었는지 확인해주세요."
      } else if (error.message.includes("우리 매장")) {
        errorMessage = "우리 매장 분석에 실패했습니다. place_id를 확인해주세요."
      }
      
      toast({
        title: "분석 실패",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoadingAnalysis(false)
    }
  }
  
  const generateComparison = (myStore: CompetitorStore, competitors: CompetitorStore[]): ComparisonResult => {
    if (competitors.length === 0) {
      return {
        my_store: myStore,
        competitor_count: 0,
        gaps: {} as any,
        recommendations: [],
        score_distribution: { S: 0, A: 0, B: 0, C: 0, D: 0 },
      }
    }
    
    const avgScore = competitors.reduce((sum, c) => sum + (c.diagnosis_score || 0), 0) / competitors.length
    const avgVisitorReviews = competitors.reduce((sum, c) => sum + (c.visitor_reviews_7d_avg || 0), 0) / competitors.length
    const avgBlogReviews = competitors.reduce((sum, c) => sum + (c.blog_reviews_7d_avg || 0), 0) / competitors.length
    const avgAnnouncements = competitors.reduce((sum, c) => sum + (c.announcements_7d || 0), 0) / competitors.length
    
    const couponRate = (competitors.filter(c => c.has_coupon).length / competitors.length) * 100
    const placePlusRate = (competitors.filter(c => c.is_place_plus).length / competitors.length) * 100
    const naverpayRate = (competitors.filter(c => c.supports_naverpay).length / competitors.length) * 100
    
    const scoreDistribution = {
      S: competitors.filter(c => c.diagnosis_grade === "S").length,
      A: competitors.filter(c => c.diagnosis_grade === "A").length,
      B: competitors.filter(c => c.diagnosis_grade === "B").length,
      C: competitors.filter(c => c.diagnosis_grade === "C").length,
      D: competitors.filter(c => c.diagnosis_grade === "D").length,
    }
    
    const gaps: {
      diagnosis_score: ComparisonGap
      visitor_reviews_7d_avg: ComparisonGap
      blog_reviews_7d_avg: ComparisonGap
      announcements_7d: ComparisonGap
      has_coupon: ComparisonGap
      is_place_plus: ComparisonGap
      supports_naverpay: ComparisonGap
    } = {
      diagnosis_score: {
        my_value: myStore.diagnosis_score || 0,
        competitor_avg: avgScore,
        gap: (myStore.diagnosis_score || 0) - avgScore,
        status: ((myStore.diagnosis_score || 0) >= avgScore ? "good" : "bad") as "good" | "bad",
      },
      visitor_reviews_7d_avg: {
        my_value: myStore.visitor_reviews_7d_avg || 0,
        competitor_avg: avgVisitorReviews,
        gap: (myStore.visitor_reviews_7d_avg || 0) - avgVisitorReviews,
        status: ((myStore.visitor_reviews_7d_avg || 0) >= avgVisitorReviews ? "good" : "bad") as "good" | "bad",
      },
      blog_reviews_7d_avg: {
        my_value: myStore.blog_reviews_7d_avg || 0,
        competitor_avg: avgBlogReviews,
        gap: (myStore.blog_reviews_7d_avg || 0) - avgBlogReviews,
        status: ((myStore.blog_reviews_7d_avg || 0) >= avgBlogReviews ? "good" : "bad") as "good" | "bad",
      },
      announcements_7d: {
        my_value: myStore.announcements_7d || 0,
        competitor_avg: avgAnnouncements,
        gap: (myStore.announcements_7d || 0) - avgAnnouncements,
        status: ((myStore.announcements_7d || 0) >= avgAnnouncements ? "good" : "bad") as "good" | "bad",
      },
      has_coupon: {
        my_value: myStore.has_coupon || false,
        competitor_rate: couponRate,
        status: (myStore.has_coupon ? "good" : "bad") as "good" | "bad",
      },
      is_place_plus: {
        my_value: myStore.is_place_plus || false,
        competitor_rate: placePlusRate,
        status: (myStore.is_place_plus ? "good" : "bad") as "good" | "bad",
      },
      supports_naverpay: {
        my_value: myStore.supports_naverpay || false,
        competitor_rate: naverpayRate,
        status: (myStore.supports_naverpay ? "good" : "bad") as "good" | "bad",
      },
    }
    
    const recommendations: any[] = []
    
    if (gaps.diagnosis_score.status === "bad") {
      recommendations.push({
        priority: "high",
        category: "overall",
        title: "전체 플레이스 진단 점수 개선 필요",
        description: `경쟁매장 평균 대비 ${Math.abs(gaps.diagnosis_score.gap || 0).toFixed(1)}점 낮습니다.`,
        impact: "high",
      })
    }
    
    if (gaps.visitor_reviews_7d_avg.status === "bad") {
      recommendations.push({
        priority: "high",
        category: "reviews",
        title: "방문자 리뷰 활성화 필요",
        description: `경쟁매장은 일평균 ${gaps.visitor_reviews_7d_avg.competitor_avg?.toFixed(1)}개의 리뷰를 받고 있습니다.`,
        impact: "high",
      })
    }
    
    return {
      my_store: myStore,
      competitor_count: competitors.length,
      gaps,
      recommendations,
      score_distribution: scoreDistribution,
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
  
  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8 text-purple-600" />
            경쟁매장 분석
          </h1>
          <p className="text-gray-600 mt-2">
            키워드 기반으로 상위 노출 경쟁매장을 분석하고 우리 매장과 비교합니다
          </p>
        </div>
        {step > 1 && (
          <Button variant="outline" onClick={resetAnalysis}>
            처음으로
          </Button>
        )}
      </div>
      
      {/* 진행 단계 표시 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {s}
                </div>
                <div className="ml-2 text-sm">
                  {s === 1 && "매장 선택"}
                  {s === 2 && "키워드 입력"}
                  {s === 3 && "분석 결과"}
                </div>
                {s < 3 && (
                  <div
                    className={`w-20 h-1 mx-4 ${
                      step > s ? "bg-purple-600" : "bg-gray-200"
                    }`}
                  />
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
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              1단계: 분석할 매장 선택
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStores ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : stores.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">등록된 매장이 없습니다.</p>
                <p className="text-sm text-gray-500 mt-2">
                  먼저 네이버 플레이스 매장을 등록해주세요.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stores.map((store) => (
                  <button
                    key={store.id}
                    className="border rounded-lg p-4 hover:border-purple-600 hover:bg-purple-50 cursor-pointer transition-all text-left"
                    onClick={() => handleStoreSelect(store)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {store.store_name || "매장명 없음"}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {store.category || "카테고리 없음"}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {store.address || "주소 없음"}
                        </p>
                      </div>
                      <Store className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    </div>
                  </button>
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
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              2단계: 타겟 키워드 입력
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">선택된 매장</p>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold">{selectedStore.store_name}</h3>
                <p className="text-sm text-gray-600">{selectedStore.category || "카테고리 정보 없음"}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                분석할 키워드 입력
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="예: 강남 맛집, 성수동 카페"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleKeywordSubmit()}
                />
                <Button
                  onClick={handleKeywordSubmit}
                  disabled={loadingSearch || !keyword.trim()}
                >
                  {loadingSearch ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  검색
                </Button>
              </div>
            </div>
            
            {loadingKeywords ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : registeredKeywords.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  등록된 키워드에서 선택
                </p>
                <div className="flex flex-wrap gap-2">
                  {registeredKeywords.map((kw) => (
                    <button
                      key={kw.id}
                      className="px-3 py-1 bg-gray-100 hover:bg-purple-100 rounded-full text-sm transition-colors"
                      onClick={() => setKeyword(kw.keyword)}
                    >
                      {kw.keyword}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* 3단계: 상위 매장 분석 결과 */}
      {step === 3 && topStores.length > 0 && (
        <>
          {/* 진행 상황 */}
          {loadingAnalysis && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto" />
                  <div>
                    <p className="font-medium">
                      경쟁매장 분석 중... ({analysisProgress.current}/{analysisProgress.total})
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${(analysisProgress.current / analysisProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* 비교 요약 (분석 완료 후) */}
          {!loadingAnalysis && analyzedStores.length > 0 && comparison && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Store className="w-6 h-6 text-purple-600" />
                  <div>
                    <CardTitle className="text-2xl">비교 분석 요약</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-semibold text-purple-600">{selectedStore?.store_name}</span> vs 상위 20개 경쟁매장
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ComparisonMetric
                    label="플레이스 진단 점수"
                    myValue={comparison.gaps.diagnosis_score.my_value as number}
                    avgValueTop5={comparison.gaps.diagnosis_score.competitor_avg_top5 || 0}
                    avgValueTop20={comparison.gaps.diagnosis_score.competitor_avg_top20 || 0}
                    statusTop5={(comparison.gaps.diagnosis_score.status_top5 || "good") as "good" | "bad"}
                    statusTop20={(comparison.gaps.diagnosis_score.status_top20 || "good") as "good" | "bad"}
                    unit="점"
                  />
                  <ComparisonMetric
                    label="일평균 방문자 리뷰 (지난 7일)"
                    myValue={comparison.gaps.visitor_reviews_7d_avg.my_value as number}
                    avgValueTop5={comparison.gaps.visitor_reviews_7d_avg.competitor_avg_top5 || 0}
                    avgValueTop20={comparison.gaps.visitor_reviews_7d_avg.competitor_avg_top20 || 0}
                    statusTop5={(comparison.gaps.visitor_reviews_7d_avg.status_top5 || "good") as "good" | "bad"}
                    statusTop20={(comparison.gaps.visitor_reviews_7d_avg.status_top20 || "good") as "good" | "bad"}
                    unit="개"
                  />
                  <ComparisonMetric
                    label="일평균 블로그 리뷰 (지난 7일)"
                    myValue={comparison.gaps.blog_reviews_7d_avg.my_value as number}
                    avgValueTop5={comparison.gaps.blog_reviews_7d_avg.competitor_avg_top5 || 0}
                    avgValueTop20={comparison.gaps.blog_reviews_7d_avg.competitor_avg_top20 || 0}
                    statusTop5={(comparison.gaps.blog_reviews_7d_avg.status_top5 || "good") as "good" | "bad"}
                    statusTop20={(comparison.gaps.blog_reviews_7d_avg.status_top20 || "good") as "good" | "bad"}
                    unit="개"
                  />
                  <ComparisonMetric
                    label="7일간 공지 등록 수"
                    myValue={comparison.gaps.announcements_7d.my_value as number}
                    avgValueTop5={comparison.gaps.announcements_7d.competitor_avg_top5 || 0}
                    avgValueTop20={comparison.gaps.announcements_7d.competitor_avg_top20 || 0}
                    statusTop5={(comparison.gaps.announcements_7d.status_top5 || "good") as "good" | "bad"}
                    statusTop20={(comparison.gaps.announcements_7d.status_top20 || "good") as "good" | "bad"}
                    unit="개"
                  />
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* 개선 권장사항 (분석 완료 후) */}
          {!loadingAnalysis && comparison && comparison.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>개선 권장사항</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comparison.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-l-4 ${
                        rec.priority === "high"
                          ? "border-red-500 bg-red-50"
                          : "border-yellow-500 bg-yellow-50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{rec.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {rec.description}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            rec.priority === "high"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {rec.priority === "high" ? "높음" : "보통"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* 경쟁매장 상세 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>
                경쟁매장 상세 분석 ({analyzedStores.length}/{topStores.length}개)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">순위</th>
                      <th className="text-left p-2">매장명</th>
                      <th className="text-left p-2">업종</th>
                      <th className="text-left p-2">주소</th>
                      <th className="text-left p-2">진단점수</th>
                      <th className="text-left p-2">전체리뷰수</th>
                      <th className="text-left p-2">방문자리뷰(7일)</th>
                      <th className="text-left p-2">블로그리뷰(7일)</th>
                      <th className="text-left p-2">공지(7일)</th>
                      <th className="text-left p-2">쿠폰</th>
                      <th className="text-left p-2">플플</th>
                      <th className="text-left p-2">새로오픈</th>
                      <th className="text-left p-2">네이버페이</th>
                      <th className="text-left p-2">네이버예약</th>
                      <th className="text-left p-2">매장명 검색량</th>
                      <th className="text-left p-2 min-w-[200px]">하이라이트 리뷰</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topStores.map((store) => {
                      // 분석된 매장 찾기
                      const analyzed = analyzedStores.find(s => s.place_id === store.place_id)
                      const isLoading = !analyzed && loadingAnalysis
                      
                      return (
                        <tr key={store.place_id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{store.rank}</td>
                          <td className="p-2 font-medium">{store.name}</td>
                          <td className="p-2 text-gray-600">{store.category}</td>
                          <td className="p-2 text-gray-600 text-xs">{store.address}</td>
                          <td className="p-2">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            ) : analyzed ? (
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  analyzed.diagnosis_grade === "S" || analyzed.diagnosis_grade === "A"
                                    ? "bg-green-100 text-green-700"
                                    : analyzed.diagnosis_grade === "B"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {analyzed.diagnosis_score?.toFixed(1)}점 ({analyzed.diagnosis_grade})
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">대기 중</span>
                            )}
                          </td>
                          <td className="p-2">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            ) : analyzed ? (
                              <span className="text-sm text-gray-700">
                                {analyzed.visitor_review_count || 0}+{analyzed.blog_review_count || 0}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-2">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            ) : analyzed ? (
                              analyzed.visitor_reviews_7d_avg?.toFixed(1) || 0
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-2">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            ) : analyzed ? (
                              analyzed.blog_reviews_7d_avg?.toFixed(1) || 0
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-2">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            ) : analyzed ? (
                              analyzed.announcements_7d || 0
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-2">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            ) : analyzed ? (
                              analyzed.has_coupon ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              ) : (
                                <Minus className="w-4 h-4 text-gray-400" />
                              )
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-2">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            ) : analyzed ? (
                              analyzed.is_place_plus ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              ) : (
                                <Minus className="w-4 h-4 text-gray-400" />
                              )
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-2">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            ) : analyzed ? (
                              analyzed.is_new_business ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              ) : (
                                <Minus className="w-4 h-4 text-gray-400" />
                              )
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-2">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            ) : analyzed ? (
                              analyzed.supports_naverpay ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              ) : (
                                <Minus className="w-4 h-4 text-gray-400" />
                              )
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-2">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            ) : analyzed ? (
                              analyzed.has_naver_booking ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              ) : (
                                <Minus className="w-4 h-4 text-gray-400" />
                              )
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-2">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            ) : analyzed ? (
                              <span className="text-sm text-gray-700">
                                {analyzed.store_search_volume ? analyzed.store_search_volume.toLocaleString() : '0'}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-2 max-w-[200px]">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            ) : analyzed ? (
                              <span className="text-xs text-gray-600 line-clamp-2" title={analyzed.important_review || '없음'}>
                                {analyzed.important_review || '-'}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// 비교 메트릭 컴포넌트 (개선된 가독성 - Top 5 & Top 20)
function ComparisonMetric({
  label,
  myValue,
  avgValueTop5,
  avgValueTop20,
  statusTop5,
  statusTop20,
  unit,
}: {
  label: string
  myValue: number
  avgValueTop5: number
  avgValueTop20: number
  statusTop5: "good" | "bad"
  statusTop20: "good" | "bad"
  unit: string
}) {
  const diffTop5 = Math.abs(myValue - avgValueTop5)
  const diffTop20 = Math.abs(myValue - avgValueTop20)
  const isHigherTop5 = myValue > avgValueTop5
  const isHigherTop20 = myValue > avgValueTop20
  
  // 전체 상태는 top5 기준으로 결정 (더 엄격한 기준)
  const overallStatus = statusTop5
  
  return (
    <div className={`rounded-lg border-2 p-5 ${
      overallStatus === "good" 
        ? "bg-green-50 border-green-200" 
        : "bg-red-50 border-red-200"
    }`}>
      <div className="flex items-center gap-2 mb-3">
        {overallStatus === "good" ? (
          <TrendingUp className="w-5 h-5 text-green-600" />
        ) : (
          <TrendingDown className="w-5 h-5 text-red-600" />
        )}
        <h4 className="font-semibold text-gray-900">{label}</h4>
      </div>
      
      <div className="space-y-2">
        {/* Top 5 비교 */}
        <p className="text-base text-gray-800">
          <span className="font-medium text-gray-700">상위 5개</span> 매장 평균보다{" "}
          <span className={`font-bold ${
            statusTop5 === "good" ? "text-green-700" : "text-red-700"
          }`}>
            {diffTop5.toFixed(1)}{unit}
          </span>
          {" "}
          <span className={`font-medium ${
            statusTop5 === "good" ? "text-green-700" : "text-red-700"
          }`}>
            {isHigherTop5 ? "높습니다" : "낮습니다"}
          </span>
        </p>
        
        {/* Top 20 비교 */}
        <p className="text-base text-gray-800">
          <span className="font-medium text-gray-700">상위 20개</span> 매장 평균보다{" "}
          <span className={`font-bold ${
            statusTop20 === "good" ? "text-green-700" : "text-red-700"
          }`}>
            {diffTop20.toFixed(1)}{unit}
          </span>
          {" "}
          <span className={`font-medium ${
            statusTop20 === "good" ? "text-green-700" : "text-red-700"
          }`}>
            {isHigherTop20 ? "높습니다" : "낮습니다"}
          </span>
        </p>
        
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700">우리 매장</span>
          <span className="text-base font-bold text-gray-900">
            {myValue.toFixed(1)}{unit}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">경쟁사 평균 (Top 5)</span>
          <span className="text-sm font-medium text-gray-600">
            {avgValueTop5.toFixed(1)}{unit}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">경쟁사 평균 (Top 20)</span>
          <span className="text-sm font-medium text-gray-600">
            {avgValueTop20.toFixed(1)}{unit}
          </span>
        </div>
      </div>
    </div>
  )
}
