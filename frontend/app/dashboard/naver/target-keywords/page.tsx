"use client"

/**
 * 타겟 키워드 추출 및 진단 페이지
 * 매장의 최적 키워드를 추천하고 SEO 최적화 상태를 분석
 */
import React, { useState, useEffect, useRef } from "react"
import { useStores } from "@/lib/hooks/useStores"
import { useAuth } from "@/lib/auth-context"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Search, Target, TrendingUp, Plus, X, AlertCircle, CheckCircle2, Info, History, Calendar, Eye, ChevronDown, ChevronUp, Store as StoreIcon } from "lucide-react"
import { api } from "@/lib/config"
import { notifyCreditUsed } from "@/lib/credit-utils"
import { useCreditConfirm } from "@/lib/hooks/useCreditConfirm"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface RegisteredStore {
  id: string
  name: string
  platform: string
  place_id?: string
  address?: string
  thumbnail?: string
  category?: string
  status: string
}

interface KeywordData {
  keyword: string
  type: string
  components: Record<string, string>
  monthly_pc_qc_cnt: number
  monthly_mobile_qc_cnt: number
  total_volume: number
  comp_idx: string
}

interface SEOAnalysis {
  field_analysis: Record<string, {
    total_matches: number
    keyword_counts: Record<string, number>
  }>
  keyword_total_counts: Record<string, number>
  keyword_field_matches: Record<string, {
    menu: number
    conveniences: number
    microReviews: number
    description: number
    ai_briefing: number
    road: number
    total: number
  }>
  all_keywords: string[]
}

interface AnalysisResult {
  store_info: {
    store_id: string
    place_id: string
    store_name: string
    address: string
  }
  input_keywords: {
    regions: string[]
    landmarks: string[]
    menus: string[]
    industries: string[]
    others: string[]
  }
  total_combinations: number
  top_keywords: KeywordData[]
  rank_data?: Record<string, { rank: number; total_count: number }>
  seo_analysis: SEOAnalysis
  place_details: any
}

export default function TargetKeywordsPage() {
  const { hasStores, isLoading: storesLoading, userId } = useStores()
  const { getToken } = useAuth()
  const { toast } = useToast()

  const [registeredStores, setRegisteredStores] = useState<RegisteredStore[]>([])
  const [selectedStore, setSelectedStore] = useState<string>("")
  const [storeAddress, setStoreAddress] = useState<string>("")
  
  // 입력 키워드
  const [regions, setRegions] = useState<string[]>([])
  const [landmarks, setLandmarks] = useState<string[]>([])
  const [menus, setMenus] = useState<string[]>([])
  const [industries, setIndustries] = useState<string[]>([])
  const [others, setOthers] = useState<string[]>([])
  
  // 임시 입력값
  const [tempRegion, setTempRegion] = useState("")
  const [tempLandmark, setTempLandmark] = useState("")
  const [tempMenu, setTempMenu] = useState("")
  const [tempIndustry, setTempIndustry] = useState("")
  const [tempOther, setTempOther] = useState("")
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  
  // 히스토리 관련 상태
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [histories, setHistories] = useState<any[]>([])
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [expandedHistoryData, setExpandedHistoryData] = useState<any>(null)

  // 분석 결과 섹션 ref (자동 스크롤용)
  const analysisResultRef = useRef<HTMLDivElement>(null)

  // 확장된 키워드 카드 상태
  const [expandedKeywordIds, setExpandedKeywordIds] = useState<Set<string>>(new Set())
  
  // 크레딧 확인 모달
  const { showCreditConfirm, CreditModal } = useCreditConfirm()
  
  const toggleKeywordExpansion = (keyword: string) => {
    const newExpanded = new Set(expandedKeywordIds)
    if (newExpanded.has(keyword)) {
      newExpanded.delete(keyword)
    } else {
      newExpanded.add(keyword)
    }
    setExpandedKeywordIds(newExpanded)
  }

  // 등록된 매장 불러오기
  useEffect(() => {
    if (userId) {
      fetchRegisteredStores()
    }
  }, [userId])

  // 매장 선택 시 주소 자동 입력 및 히스토리 로드
  useEffect(() => {
    if (selectedStore) {
      const store = registeredStores.find(s => s.id === selectedStore)
      if (store && store.address) {
        setStoreAddress(store.address)
        // 주소에서 구, 동 자동 추출
        autoExtractRegions(store.address)
      }
      // 매장 히스토리 로드
      loadStoreHistories(selectedStore)
    } else {
      setHistories([])
    }
  }, [selectedStore, registeredStores])

  // URL 파라미터로 historyId가 있으면 해당 히스토리 로드
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const historyId = params.get("historyId")
    
    if (historyId && registeredStores.length > 0) {
      // URL 파라미터로 들어온 경우 매장 자동 선택
      loadHistoryDetail(historyId, true)
    }
  }, [registeredStores])

  const fetchRegisteredStores = async () => {
    try {
      const token = await getToken()
      if (!token) throw new Error("인증 토큰 없음")
      
      const response = await fetch(api.stores.list(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) throw new Error("매장 조회 실패")
      
      const result = await response.json()
      const stores = result.stores || []
      
      // 네이버 매장만 필터링
      const naverStores = stores.filter((store: RegisteredStore) => store.platform === "naver")
      setRegisteredStores(naverStores)
      
      console.log(`[타겟 키워드] 매장 조회 완료: ${naverStores.length}개`)
    } catch (error) {
      console.error("매장 조회 에러:", error)
      toast({
        title: "오류",
        description: "등록된 매장을 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const loadStoreHistories = async (storeId: string) => {
    try {
      const token = await getToken()
      if (!token) return
      
      const response = await fetch(`${api.baseUrl}/api/v1/target-keywords/history/${storeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) throw new Error("히스토리 조회 실패")
      
      const result = await response.json()
      setHistories(result.histories || [])
      console.log(`[타겟 키워드] 히스토리 ${result.histories?.length || 0}개 로드 완료`)
    } catch (error) {
      console.error("히스토리 조회 에러:", error)
      setHistories([])
    }
  }

  const loadHistoryDetail = async (historyId: string, autoSelectStore: boolean = false) => {
    // 이미 펼쳐진 히스토리를 다시 클릭하면 접기
    if (expandedHistoryId === historyId && !autoSelectStore) {
      setExpandedHistoryId(null)
      setExpandedHistoryData(null)
      return
    }
    
    setIsLoadingHistory(true)
    
    try {
      const token = await getToken()
      if (!token) throw new Error("인증 토큰 없음")
      
      const response = await fetch(`${api.baseUrl}/api/v1/target-keywords/history/detail/${historyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) throw new Error("히스토리 조회 실패")
      
      const result = await response.json()
      const history = result.history
      
      if (!history) throw new Error("히스토리 데이터 없음")
      
      console.log("[타겟 키워드] 히스토리 로드:", history)
      
      // 매장 자동 선택 (URL 파라미터로 들어왔을 때)
      if (autoSelectStore && history.store_id) {
        setSelectedStore(history.store_id)
        console.log("[타겟 키워드] 매장 자동 선택:", history.store_id)
        
        // 🆕 히스토리 목록도 로드하여 UI에 표시되도록 함
        loadStoreHistories(history.store_id)
      }
      
      // 히스토리 데이터 설정 (펼쳐서 표시용)
      setExpandedHistoryId(historyId)
      setExpandedHistoryData(history)
      
    } catch (error) {
      console.error("히스토리 로드 에러:", error)
      toast({
        title: "오류",
        description: "히스토리를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const autoExtractRegions = (address: string) => {
    // 주소에서 구, 동 추출
    const guMatch = address.match(/([가-힣]+구)/g)
    const dongMatch = address.match(/([가-힣]+동)/g)
    
    const extracted: string[] = []
    if (guMatch) extracted.push(...guMatch)
    if (dongMatch) extracted.push(...dongMatch)
    
    // 중복 제거 후 지역명에 추가
    const uniqueRegions = [...new Set([...regions, ...extracted])]
    setRegions(uniqueRegions)
  }

  // 키워드 추가 함수
  const addKeyword = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>, tempSetter: React.Dispatch<React.SetStateAction<string>>) => {
    if (value.trim()) {
      setter((prev) => [...prev, value.trim()])
      tempSetter("")
    }
  }

  // 키워드 제거 함수
  const removeKeyword = (index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => prev.filter((_, i) => i !== index))
  }

  // 총 키워드 개수 계산
  const getTotalKeywordCount = () => {
    return regions.length + landmarks.length + menus.length + industries.length + others.length
  }

  // 예상 소요시간 계산 (키워드 개수 기반)
  const getEstimatedTime = () => {
    const totalCount = getTotalKeywordCount()
    if (totalCount <= 5) return "약 30초"
    if (totalCount <= 10) return "약 1분"
    if (totalCount <= 15) return "약 1-2분"
    return "약 2분"
  }

  // 분석 시작
  const handleAnalyze = () => {
    if (!selectedStore) {
      toast({
        title: "매장을 선택해주세요",
        description: "분석할 매장을 먼저 선택해야 합니다.",
        variant: "destructive",
      })
      return
    }

    if (regions.length === 0 && landmarks.length === 0 && menus.length === 0 && industries.length === 0 && others.length === 0) {
      toast({
        title: "키워드를 입력해주세요",
        description: "최소 1개 이상의 키워드를 입력해야 합니다.",
        variant: "destructive",
      })
      return
    }

    showCreditConfirm({
      featureName: "타겟 키워드 추출",
      creditAmount: 20,
      onConfirm: () => executeAnalyze(),
    })
  }

  const executeAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      const token = await getToken()
      const response = await fetch(`${api.baseUrl}/api/v1/target-keywords/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          store_id: selectedStore,
          // user_id: userId,  // Removed: user_id is now extracted from current_user in backend
          regions,
          landmarks,
          menus,
          industries,
          others,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("분석 실패 응답:", errorData)
        throw new Error(errorData.detail || errorData.message || `분석 실패 (${response.status})`)
      }

      const result = await response.json()
      
      if (result.status === "success") {
        setAnalysisResult(result.data)

        // ✨ 크레딧 실시간 차감 알림 (타겟 키워드 추출 20 크레딧)
        notifyCreditUsed(20, token)
        
        // 히스토리 ID가 있으면 URL 업데이트
        if (result.history_id) {
          const newUrl = `${window.location.pathname}?historyId=${result.history_id}`
          window.history.pushState({}, '', newUrl)
          console.log("[타겟 키워드] 히스토리 ID 저장:", result.history_id)
          
          // 히스토리 목록 새로고침
          if (selectedStore) {
            loadStoreHistories(selectedStore)
          }
        }
        
        toast({
          title: "분석 완료",
          description: `총 ${result.data.top_keywords.length}개의 타겟 키워드를 추출했습니다.`,
        })

        // 분석 결과로 자동 스크롤 (약간의 딜레이 후)
        setTimeout(() => {
          analysisResultRef.current?.scrollIntoView({ 
            behavior: "smooth", 
            block: "start" 
          })
        }, 500)
      } else {
        throw new Error(result.message || "분석 실패")
      }
    } catch (error) {
      console.error("분석 에러:", error)
      toast({
        title: "분석 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 로딩 중
  if (storesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">페이지를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 등록된 매장이 없음
  if (!hasStores) {
    return <EmptyStoreMessage />
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      {/* 헤더 섹션 - 홈페이지 스타일 */}
      <header className="mb-8 md:mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
            <Target className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight">
            타겟 키워드 추출
          </h1>
        </div>
        <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-3xl mx-auto mb-4">
          매장에 집중해야 할 키워드를 검색량 기반으로 추천하고,<br className="md:hidden" />
          <span className="hidden md:inline"> </span>SEO 최적화 상태를 분석합니다
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
          <Badge 
            variant="secondary"
            className="bg-orange-100 text-orange-700 border-orange-200 px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            최대 20개 키워드 추천
          </Badge>
          <Badge 
            variant="secondary"
            className="bg-amber-100 text-amber-700 border-amber-200 px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
          >
            💡 20 크레딧
          </Badge>
        </div>
      </header>

      <div className="space-y-8 md:space-y-10">

      {/* 안내 메시지 */}
      <section>
        <Alert className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Info className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <AlertTitle className="text-neutral-900 font-bold text-base md:text-lg mb-2">사용 방법</AlertTitle>
              <AlertDescription className="text-neutral-700 text-sm md:text-base leading-relaxed space-y-2">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p>매장을 선택하세요 (주소에서 자동으로 지역명이 추출됩니다)</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p>지역명, 랜드마크, 메뉴/상품명, 업종, 기타 키워드를 입력하세요</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p>분석 시작 버튼을 클릭하면 최적의 타겟 키워드를 추천해드립니다</p>
                </div>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      </section>

      {/* 과거 추출된 키워드 보기 */}
      {selectedStore && histories.length > 0 && (
        <section>
          <div className="mb-4 md:mb-5">
            <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-1.5 leading-tight">
              과거 추출 히스토리
            </h2>
            <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
              이 매장의 최근 {histories.length}개 키워드 추출 기록을 확인하세요
            </p>
          </div>

        <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200 pb-4 px-5 md:px-6 pt-5 md:pt-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-md">
                  <History className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg md:text-xl font-bold text-neutral-900">
                    추출 히스토리
                  </CardTitle>
                  <p className="text-xs md:text-sm text-neutral-600 mt-0.5">
                    {histories.length}개 기록
                  </p>
                </div>
              </div>
              <Badge 
                variant="secondary"
                className="bg-amber-100 text-amber-700 border-amber-200 px-3 py-1.5 text-xs font-semibold"
              >
                최신순
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 md:p-6">
            {/* 모바일: 카드 레이아웃 */}
            <div className="md:hidden space-y-3 p-4">
              {histories.map((history) => {
                const isExpanded = expandedHistoryId === history.id
                const allInputKeywords = [
                  ...(history.regions || []),
                  ...(history.landmarks || []),
                  ...(history.menus || []),
                  ...(history.industries || []),
                  ...(history.other_keywords || [])
                ]
                
                return (
                  <div key={history.id}>
                    <Card 
                      className={`transition-all ${isExpanded ? 'border-primary-500 bg-primary-50' : 'border-neutral-200'}`}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-neutral-500" />
                            <span className="text-xs text-neutral-900 font-medium">
                              {new Date(history.created_at).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <Badge variant="default" className="font-semibold text-xs bg-primary-500 hover:bg-primary-600 text-white">
                            {history.total_keywords}개
                          </Badge>
                        </div>
                        
                        <div>
                          <p className="text-xs text-neutral-600 mb-1.5 font-medium">입력 키워드</p>
                          <div className="flex flex-wrap gap-1">
                            {allInputKeywords.slice(0, 5).map((keyword, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs bg-neutral-100 text-neutral-700 font-medium">
                                {keyword}
                              </Badge>
                            ))}
                            {allInputKeywords.length > 5 && (
                              <Badge variant="outline" className="text-xs border-neutral-300 text-neutral-700 font-medium">
                                +{allInputKeywords.length - 5}개
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          type="button"
                          size="sm"
                          variant={isExpanded ? "default" : "outline"}
                          disabled={isLoadingHistory}
                          className="w-full font-semibold text-xs h-9 border-neutral-300 hover:border-primary-400"
                          onClick={(e) => {
                            e.stopPropagation()
                            loadHistoryDetail(history.id)
                          }}
                        >
                          {isLoadingHistory && expandedHistoryId === history.id ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              로딩...
                            </>
                          ) : isExpanded ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              접기
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              보기
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                    
                    {/* 펼쳐진 상세 정보 - 모바일 */}
                    {isExpanded && expandedHistoryData && (
                      <Card className="mt-2 border-primary-200 bg-primary-50">
                        <CardContent className="p-4 space-y-3">
                          <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary-600" />
                            추출된 키워드 ({expandedHistoryData.total_keywords}개)
                          </h4>
                          
                          <div className="grid grid-cols-1 gap-3">
                            {expandedHistoryData.extracted_keywords.map((kw: any, idx: number) => (
                              <div
                                key={idx}
                                className="bg-white p-3 rounded-lg border border-primary-200 shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <span className="text-sm font-semibold text-neutral-900 flex-1">
                                    {kw.keyword}
                                  </span>
                                  {kw.rank > 0 && (
                                    <Badge variant="default" className="text-xs font-semibold bg-primary-500 text-white flex-shrink-0">
                                      {kw.rank}위
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="text-neutral-600">검색량</span>
                                    <span className="font-semibold text-primary-600">
                                      {kw.total_volume?.toLocaleString() || 0}
                                    </span>
                                  </div>
                                  {kw.total_count > 0 && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-neutral-600">전체</span>
                                      <span className="font-semibold text-neutral-900">
                                        {kw.total_count?.toLocaleString()}개
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 데스크톱: 테이블 레이아웃 */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">추출 날짜</TableHead>
                    <TableHead>입력 키워드</TableHead>
                    <TableHead className="text-center w-[120px]">추출된 키워드</TableHead>
                    <TableHead className="text-center w-[100px]">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {histories.map((history) => {
                    const isExpanded = expandedHistoryId === history.id
                    const allInputKeywords = [
                      ...(history.regions || []),
                      ...(history.landmarks || []),
                      ...(history.menus || []),
                      ...(history.industries || []),
                      ...(history.other_keywords || [])
                    ]
                    
                    return (
                      <React.Fragment key={history.id}>
                        <TableRow 
                          className={`${isExpanded ? "bg-primary-50" : ""} transition-colors`}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 h-3 md:h-4 md:w-4 text-neutral-500" />
                              <span className="text-xs md:text-sm text-neutral-900">
                                {new Date(history.created_at).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {allInputKeywords.slice(0, 5).map((keyword, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs bg-neutral-100 text-neutral-700 hover:bg-neutral-200 font-medium">
                                  {keyword}
                                </Badge>
                              ))}
                              {allInputKeywords.length > 5 && (
                                <Badge variant="outline" className="text-xs border-neutral-300 text-neutral-700 font-medium">
                                  +{allInputKeywords.length - 5}개
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default" className="font-semibold text-xs bg-primary-500 hover:bg-primary-600 text-white">
                              {history.total_keywords}개
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              size="sm"
                              variant={isExpanded ? "default" : "outline"}
                              disabled={isLoadingHistory}
                              className="w-full font-semibold text-xs h-8 border-neutral-300 hover:border-primary-400"
                              onClick={(e) => {
                                e.stopPropagation()
                                loadHistoryDetail(history.id)
                              }}
                            >
                              {isLoadingHistory && expandedHistoryId === history.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 animate-spin" />
                                  로딩...
                                </>
                              ) : isExpanded ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                                  접기
                                </>
                              ) : (
                                <>
                                  <Eye className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                                  보기
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                        
                        {/* 펼쳐진 상세 정보 */}
                        {isExpanded && expandedHistoryData && (
                          <TableRow key={`${history.id}-detail`} className="bg-primary-50">
                            <TableCell colSpan={4} className="p-4 md:p-6">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-base md:text-lg font-bold text-neutral-900 flex items-center gap-2">
                                    <Target className="h-4 w-4 md:h-5 md:w-5 text-primary-600" />
                                    추출된 키워드 ({expandedHistoryData.total_keywords}개)
                                  </h4>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                  {expandedHistoryData.extracted_keywords.map((kw: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="bg-white p-3 rounded-lg border border-primary-200 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <span className="text-sm font-semibold text-neutral-900 flex-1 line-clamp-1">
                                          {kw.keyword}
                                        </span>
                                        {kw.rank > 0 && (
                                          <Badge variant="default" className="text-xs font-semibold bg-primary-500 hover:bg-primary-600 text-white flex-shrink-0">
                                            {kw.rank}위
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="mt-2 flex items-center justify-between text-xs text-neutral-600">
                                        <span>검색량</span>
                                        <span className="font-semibold text-primary-600">
                                          {kw.total_volume?.toLocaleString() || 0}
                                        </span>
                                      </div>
                                      {kw.total_count > 0 && (
                                        <div className="mt-1 flex items-center justify-between text-xs text-neutral-600">
                                          <span>전체</span>
                                          <span className="font-semibold text-neutral-900">
                                            {kw.total_count?.toLocaleString()}개
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        </section>
      )}

      {/* 입력 폼 */}
      <section>
        <div className="mb-4 md:mb-5">
          <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-1.5 leading-tight">
            키워드 분석 설정
          </h2>
          <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
            매장과 키워드 정보를 입력하여 타겟 키워드를 추출하세요
          </p>
        </div>

      <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-200 pb-4 px-5 md:px-6 pt-5 md:pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-md">
              <Search className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg md:text-xl font-bold text-neutral-900">분석 설정</CardTitle>
              <CardDescription className="text-xs md:text-sm text-neutral-600 mt-0.5">
                총 {getTotalKeywordCount()}개 키워드 입력됨
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 md:p-6 space-y-5 md:space-y-6">
          {/* 매장 선택 */}
          <div className="space-y-3">
            <Label htmlFor="store-select" className="text-sm md:text-base font-bold text-neutral-900 flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-orange-600" />
              </div>
              매장 선택 *
            </Label>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger id="store-select" className="h-14 md:h-16 text-base md:text-lg border-2 border-neutral-300 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-200">
                {selectedStore && registeredStores.find(s => s.id === selectedStore) ? (
                  <div className="flex items-center gap-3">
                    {registeredStores.find(s => s.id === selectedStore)?.thumbnail ? (
                      <img src={registeredStores.find(s => s.id === selectedStore)!.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <StoreIcon className="h-5 w-5 text-orange-600" />
                      </div>
                    )}
                    <span className="truncate">{registeredStores.find(s => s.id === selectedStore)?.name}</span>
                  </div>
                ) : (
                  <SelectValue placeholder="분석할 매장을 선택하세요" />
                )}
              </SelectTrigger>
              <SelectContent>
                {registeredStores.map((store) => (
                  <SelectItem key={store.id} value={store.id} className="py-2.5">
                    <div className="flex items-center gap-2.5">
                      {store.thumbnail ? (
                        <img src={store.thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                          <StoreIcon className="w-4 h-4 text-neutral-400" />
                        </div>
                      )}
                      <span className="truncate">{store.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {storeAddress && (
              <div className="flex items-start gap-2 bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                <span className="text-lg flex-shrink-0">📍</span>
                <p className="text-sm text-neutral-700 leading-relaxed">{storeAddress}</p>
              </div>
            )}
          </div>

          {/* 지역명 입력 */}
          <div className="space-y-3">
            <Label className="text-sm md:text-base font-bold text-neutral-900">지역명 (구, 동, 역세권 등)</Label>
            <div className="flex gap-2 md:gap-3">
              <Input
                placeholder="예: 종로, 성수, 강남"
                value={tempRegion}
                onChange={(e) => setTempRegion(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addKeyword(tempRegion, setRegions, setTempRegion)
                  }
                }}
                className="h-12 md:h-14 text-base border-2 border-neutral-300 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-200"
              />
              <Button
                type="button"
                variant="outline"
                className="h-12 md:h-14 w-12 md:w-14 flex-shrink-0 border-2 border-neutral-300 rounded-xl hover:bg-orange-50 hover:border-orange-500 active:scale-95 transition-all duration-200 touch-target-minimum"
                onClick={() => addKeyword(tempRegion, setRegions, setTempRegion)}
              >
                <Plus className="h-5 w-5 md:h-6 md:w-6" />
              </Button>
            </div>
            {regions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {regions.map((region, index) => (
                  <Badge key={index} variant="secondary" className="gap-1.5 text-sm py-1.5 px-3 bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 transition-colors">
                    {region}
                    <X
                      className="h-4 w-4 cursor-pointer hover:text-orange-900"
                      onClick={() => removeKeyword(index, setRegions)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 랜드마크 입력 */}
          <div className="space-y-3">
            <Label className="text-sm md:text-base font-bold text-neutral-900">랜드마크 (역, 건물, 명소 등)</Label>
            <div className="flex gap-2 md:gap-3">
              <Input
                placeholder="예: 성수역, 종로타워"
                value={tempLandmark}
                onChange={(e) => setTempLandmark(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addKeyword(tempLandmark, setLandmarks, setTempLandmark)
                  }
                }}
                className="h-12 md:h-14 text-base border-2 border-neutral-300 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-200"
              />
              <Button
                type="button"
                variant="outline"
                className="h-12 md:h-14 w-12 md:w-14 flex-shrink-0 border-2 border-neutral-300 rounded-xl hover:bg-orange-50 hover:border-orange-500 active:scale-95 transition-all duration-200 touch-target-minimum"
                onClick={() => addKeyword(tempLandmark, setLandmarks, setTempLandmark)}
              >
                <Plus className="h-5 w-5 md:h-6 md:w-6" />
              </Button>
            </div>
            {landmarks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {landmarks.map((landmark, index) => (
                  <Badge key={index} variant="secondary" className="gap-1.5 text-sm py-1.5 px-3 bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 transition-colors">
                    {landmark}
                    <X
                      className="h-4 w-4 cursor-pointer hover:text-amber-900"
                      onClick={() => removeKeyword(index, setLandmarks)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 메뉴/상품명 입력 */}
          <div className="space-y-3">
            <Label className="text-sm md:text-base font-bold text-neutral-900">메뉴 또는 상품명</Label>
            <div className="flex gap-2 md:gap-3">
              <Input
                placeholder="예: 보쌈, 칼국수, 커피"
                value={tempMenu}
                onChange={(e) => setTempMenu(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addKeyword(tempMenu, setMenus, setTempMenu)
                  }
                }}
                className="h-12 md:h-14 text-base border-2 border-neutral-300 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-200"
              />
              <Button
                type="button"
                variant="outline"
                className="h-12 md:h-14 w-12 md:w-14 flex-shrink-0 border-2 border-neutral-300 rounded-xl hover:bg-orange-50 hover:border-orange-500 active:scale-95 transition-all duration-200 touch-target-minimum"
                onClick={() => addKeyword(tempMenu, setMenus, setTempMenu)}
              >
                <Plus className="h-5 w-5 md:h-6 md:w-6" />
              </Button>
            </div>
            {menus.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {menus.map((menu, index) => (
                  <Badge key={index} variant="secondary" className="gap-1.5 text-sm py-1.5 px-3 bg-green-100 text-green-700 border-green-200 hover:bg-green-200 transition-colors">
                    {menu}
                    <X
                      className="h-4 w-4 cursor-pointer hover:text-green-900"
                      onClick={() => removeKeyword(index, setMenus)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 업종 입력 */}
          <div className="space-y-3">
            <Label className="text-sm md:text-base font-bold text-neutral-900">업종</Label>
            <div className="flex gap-2 md:gap-3">
              <Input
                placeholder="예: 맛집, 카페, 헤어샵"
                value={tempIndustry}
                onChange={(e) => setTempIndustry(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addKeyword(tempIndustry, setIndustries, setTempIndustry)
                  }
                }}
                className="h-12 md:h-14 text-base border-2 border-neutral-300 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-200"
              />
              <Button
                type="button"
                variant="outline"
                className="h-12 md:h-14 w-12 md:w-14 flex-shrink-0 border-2 border-neutral-300 rounded-xl hover:bg-orange-50 hover:border-orange-500 active:scale-95 transition-all duration-200 touch-target-minimum"
                onClick={() => addKeyword(tempIndustry, setIndustries, setTempIndustry)}
              >
                <Plus className="h-5 w-5 md:h-6 md:w-6" />
              </Button>
            </div>
            {industries.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {industries.map((industry, index) => (
                  <Badge key={index} variant="secondary" className="gap-1.5 text-sm py-1.5 px-3 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 transition-colors">
                    {industry}
                    <X
                      className="h-4 w-4 cursor-pointer hover:text-blue-900"
                      onClick={() => removeKeyword(index, setIndustries)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 기타 키워드 입력 */}
          <div className="space-y-3">
            <Label className="text-sm md:text-base font-bold text-neutral-900">기타 (판매형태, 특징 등)</Label>
            <div className="flex gap-2 md:gap-3">
              <Input
                placeholder="예: 단체주문, 회식, 데이트"
                value={tempOther}
                onChange={(e) => setTempOther(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addKeyword(tempOther, setOthers, setTempOther)
                  }
                }}
                className="h-12 md:h-14 text-base border-2 border-neutral-300 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all duration-200"
              />
              <Button
                type="button"
                variant="outline"
                className="h-12 md:h-14 w-12 md:w-14 flex-shrink-0 border-2 border-neutral-300 rounded-xl hover:bg-orange-50 hover:border-orange-500 active:scale-95 transition-all duration-200 touch-target-minimum"
                onClick={() => addKeyword(tempOther, setOthers, setTempOther)}
              >
                <Plus className="h-5 w-5 md:h-6 md:w-6" />
              </Button>
            </div>
            {others.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {others.map((other, index) => (
                  <Badge key={index} variant="secondary" className="gap-1.5 text-sm py-1.5 px-3 bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 transition-colors">
                    {other}
                    <X
                      className="h-4 w-4 cursor-pointer hover:text-purple-900"
                      onClick={() => removeKeyword(index, setOthers)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 분석 버튼 */}
          <div className="space-y-4 pt-4">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !selectedStore}
              className="w-full font-bold h-14 md:h-16 text-base md:text-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-6 w-6" />
                  타겟 키워드 분석 시작
                </>
              )}
            </Button>
            {isAnalyzing && (
              <div className="text-center bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-4 md:p-5">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl">⏱️</span>
                  <p className="text-base md:text-lg font-bold text-neutral-900">
                    분석 중입니다...
                  </p>
                </div>
                <p className="text-sm md:text-base text-neutral-700">
                  예상 소요시간: <span className="font-extrabold text-orange-600">{getEstimatedTime()}</span>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </section>

      {/* 분석 결과 */}
      {analysisResult && (
        <div ref={analysisResultRef} className="space-y-8 md:space-y-10">
          {/* 요약 정보 */}
          <section>
            <div className="mb-4 md:mb-5">
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-1.5 leading-tight">
                분석 결과 요약
              </h2>
              <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
                키워드 분석이 완료되었습니다
              </p>
            </div>

          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200 pb-4 px-5 md:px-6 pt-5 md:pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-md">
                  <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <CardTitle className="text-lg md:text-xl font-bold text-neutral-900">
                  분석 요약
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                <div className="p-4 md:p-5 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-xs md:text-sm text-orange-700 font-semibold">매장명</p>
                  </div>
                  <p className="text-base md:text-lg font-extrabold text-neutral-900 truncate" title={analysisResult.store_info.store_name}>
                    {analysisResult.store_info.store_name}
                  </p>
                </div>
                <div className="p-4 md:p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <Search className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-xs md:text-sm text-green-700 font-semibold">생성된 조합</p>
                  </div>
                  <p className="text-2xl md:text-3xl font-extrabold text-green-600">{analysisResult.total_combinations}
                    <span className="text-base md:text-lg text-neutral-600 ml-1">개</span>
                  </p>
                </div>
                <div className="p-4 md:p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-xs md:text-sm text-purple-700 font-semibold">타겟 키워드</p>
                  </div>
                  <p className="text-2xl md:text-3xl font-extrabold text-purple-600">{analysisResult.top_keywords.length}
                    <span className="text-base md:text-lg text-neutral-600 ml-1">개</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          </section>

          {/* 타겟 키워드 테이블 */}
          <section>
            <div className="mb-4 md:mb-5">
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-1.5 leading-tight">
                타겟 키워드 목록
              </h2>
              <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
                검색량이 높은 순서로 정렬된 상위 20개 키워드입니다
              </p>
            </div>

          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b-2 border-amber-200 pb-4 px-5 md:px-6 pt-5 md:pt-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500 rounded-xl flex items-center justify-center shadow-md">
                    <Target className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg md:text-xl font-bold text-neutral-900">
                      추천 키워드
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm text-neutral-600 mt-0.5">
                      {analysisResult.top_keywords.length}개 추출됨
                    </CardDescription>
                  </div>
                </div>
                <Badge 
                  variant="secondary"
                  className="bg-amber-100 text-amber-700 border-amber-200 px-3 py-1.5 text-xs font-semibold"
                >
                  검색량 높은 순
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 md:p-6">
              {/* 모바일: 카드 레이아웃 */}
              <div className="md:hidden space-y-3 p-4">
                {analysisResult.top_keywords.map((keyword, index) => {
                  const rankInfo = analysisResult.rank_data?.[keyword.keyword] || { rank: 0, total_count: 0 }
                  const rank = rankInfo.rank || 0
                  const totalCount = rankInfo.total_count || 0
                  const isExpanded = expandedKeywordIds.has(keyword.keyword)
                  
                  return (
                    <Card key={index} className="border-neutral-200 hover:border-primary-300 transition-colors">
                      <CardContent className="p-4 space-y-3">
                        {/* 헤더: 순위 & 키워드 */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-bold text-sm border-primary-300 text-primary-700">
                                #{index + 1}
                              </Badge>
                              <Badge
                                variant={
                                  keyword.comp_idx === "높음" ? "destructive" :
                                  keyword.comp_idx === "중간" ? "default" : "secondary"
                                }
                                className={`font-semibold text-xs flex-shrink-0 ${
                                  keyword.comp_idx === "높음" ? "bg-red-500 hover:bg-red-600 text-white" :
                                  keyword.comp_idx === "중간" ? "bg-orange-500 hover:bg-orange-600 text-white" : 
                                  "bg-green-500 hover:bg-green-600 text-white"
                                }`}
                              >
                                {keyword.comp_idx}
                              </Badge>
                            </div>
                            {rank > 0 ? (
                              <Badge variant="default" className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs">
                                {rank}위
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-red-300 text-red-600 bg-red-50 font-bold text-xs">
                                300위권 밖
                              </Badge>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-neutral-900">{keyword.keyword}</h4>
                        </div>
                        
                        {/* 핵심 통계 */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-primary-50 rounded-lg p-2.5 border border-primary-200">
                            <p className="text-xs text-primary-700 font-semibold mb-1">전체 검색량</p>
                            <p className="text-base font-bold text-primary-600">{keyword.total_volume.toLocaleString()}</p>
                          </div>
                          <div className="bg-neutral-50 rounded-lg p-2.5 border border-neutral-200">
                            <p className="text-xs text-neutral-600 font-semibold mb-1">검색 업체수</p>
                            <p className="text-base font-bold text-neutral-900">{totalCount > 0 ? totalCount.toLocaleString() : '-'}</p>
                          </div>
                        </div>
                        
                        {/* 확장 버튼 */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleKeywordExpansion(keyword.keyword)}
                          className="w-full text-xs"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-1" />
                              간단히 보기
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-1" />
                              상세 정보 보기
                            </>
                          )}
                        </Button>
                        
                        {/* 상세 정보 (확장 시) */}
                        {isExpanded && (
                          <div className="pt-2.5 border-t border-neutral-200 space-y-2.5">
                            <div>
                              <p className="text-xs text-neutral-600 mb-1.5 font-semibold">구성 요소</p>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(keyword.components).map(([key, value]) => (
                                  <Badge key={key} variant="secondary" className="text-xs font-medium bg-neutral-100 text-neutral-700">
                                    {value}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-xs text-neutral-600 font-semibold">상세 검색량</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-neutral-50 rounded p-2 border border-neutral-200">
                                  <span className="text-neutral-600 block mb-0.5">PC</span>
                                  <span className="font-semibold text-neutral-900 text-sm">{keyword.monthly_pc_qc_cnt.toLocaleString()}</span>
                                </div>
                                <div className="bg-neutral-50 rounded p-2 border border-neutral-200">
                                  <span className="text-neutral-600 block mb-0.5">모바일</span>
                                  <span className="font-semibold text-neutral-900 text-sm">{keyword.monthly_mobile_qc_cnt.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* 데스크톱: 테이블 레이아웃 */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px] text-xs">순위</TableHead>
                      <TableHead className="min-w-[150px] text-xs">키워드</TableHead>
                      <TableHead className="text-right w-[120px] text-xs">전체 검색량</TableHead>
                      <TableHead className="text-center w-[110px] bg-primary-50 text-xs">우리매장 순위</TableHead>
                      <TableHead className="text-center w-[90px] text-xs">경쟁도</TableHead>
                      <TableHead className="text-center w-[90px] text-xs">상세</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysisResult.top_keywords.map((keyword, index) => {
                      const rankInfo = analysisResult.rank_data?.[keyword.keyword] || { rank: 0, total_count: 0 }
                      const rank = rankInfo.rank || 0
                      const totalCount = rankInfo.total_count || 0
                      const isExpanded = expandedKeywordIds.has(keyword.keyword)
                      
                      return (
                        <React.Fragment key={index}>
                          <TableRow className={`${isExpanded ? "bg-primary-50" : ""} hover:bg-neutral-50 transition-colors`}>
                            <TableCell className="py-3">
                              <Badge variant="outline" className="border-primary-300 text-primary-700 font-bold text-xs">
                                #{index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold text-neutral-900 text-sm py-3">
                              {keyword.keyword}
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary-600 text-sm py-3">
                              {keyword.total_volume.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center bg-primary-50 py-3">
                              {rank > 0 ? (
                                <Badge variant="default" className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs">
                                  {rank}위
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-red-300 text-red-600 bg-red-50 font-bold text-xs">
                                  300위권 밖
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center py-3">
                              <Badge
                                variant={
                                  keyword.comp_idx === "높음" ? "destructive" :
                                  keyword.comp_idx === "중간" ? "default" : "secondary"
                                }
                                className={`font-semibold text-xs whitespace-nowrap ${
                                  keyword.comp_idx === "높음" ? "bg-red-500 hover:bg-red-600 text-white" :
                                  keyword.comp_idx === "중간" ? "bg-orange-500 hover:bg-orange-600 text-white" : 
                                  "bg-green-500 hover:bg-green-600 text-white"
                                }`}
                              >
                                {keyword.comp_idx}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center py-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleKeywordExpansion(keyword.keyword)}
                                className="h-7 text-xs px-2"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-3 h-3 mr-1" />
                                    접기
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3 mr-1" />
                                    펼치기
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                          
                          {/* 확장된 상세 정보 */}
                          {isExpanded && (
                            <TableRow className="bg-primary-50">
                              <TableCell colSpan={6} className="p-3">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                  {/* 구성 요소 */}
                                  <div className="bg-white rounded-lg p-3 border border-primary-200">
                                    <h5 className="text-xs font-bold text-neutral-900 mb-2 flex items-center gap-1.5">
                                      <Target className="w-3.5 h-3.5 text-primary-600" />
                                      구성 요소
                                    </h5>
                                    <div className="flex flex-wrap gap-1">
                                      {Object.entries(keyword.components).map(([key, value]) => (
                                        <Badge key={key} variant="secondary" className="text-xs font-medium bg-neutral-100 text-neutral-700">
                                          {value}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* 검색량 상세 */}
                                  <div className="bg-white rounded-lg p-3 border border-primary-200">
                                    <h5 className="text-xs font-bold text-neutral-900 mb-2 flex items-center gap-1.5">
                                      <TrendingUp className="w-3.5 h-3.5 text-primary-600" />
                                      검색량 상세
                                    </h5>
                                    <div className="grid grid-cols-3 gap-2">
                                      <div>
                                        <p className="text-xs text-neutral-600 mb-0.5">PC</p>
                                        <p className="text-xs font-bold text-neutral-900">{keyword.monthly_pc_qc_cnt.toLocaleString()}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-neutral-600 mb-0.5">모바일</p>
                                        <p className="text-xs font-bold text-neutral-900">{keyword.monthly_mobile_qc_cnt.toLocaleString()}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-neutral-600 mb-0.5">검색 업체수</p>
                                        <p className="text-xs font-bold text-neutral-900">{totalCount > 0 ? totalCount.toLocaleString() : '-'}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          </section>

          {/* SEO 분석 */}
          <section>
            <div className="mb-4 md:mb-5">
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-1.5 leading-tight">
                플레이스 SEO 분석
              </h2>
              <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
                키워드가 플레이스 정보에 포함된 횟수를 분석합니다
              </p>
            </div>

          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-blue-200 pb-4 px-5 md:px-6 pt-5 md:pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                  <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg md:text-xl font-bold text-neutral-900">SEO 최적화 분석</CardTitle>
                  <CardDescription className="text-xs md:text-sm text-neutral-600 mt-0.5">
                    키워드 매칭 현황
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 md:p-6">
              <div className="space-y-3 md:space-y-4">
                {Object.entries(analysisResult.seo_analysis.field_analysis).map(([field, data]) => {
                  const fieldNames: Record<string, string> = {
                    menu: "메뉴",
                    conveniences: "편의시설",
                    microReviews: "대표 한줄평",
                    description: "업체소개글",
                    ai_briefing: "AI 브리핑",
                    road: "찾아오는길",
                    visitor_reviews: "방문자 리뷰 (상위 50개)"
                  }
                  
                  return (
                    <div key={field} className="border border-neutral-200 rounded-lg p-3 md:p-4 hover:border-primary-300 hover:bg-neutral-50 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-neutral-900 text-sm md:text-base">{fieldNames[field] || field}</h4>
                        <span className={`text-xs md:text-sm font-semibold ${data.total_matches > 0 ? 'text-green-600' : 'text-neutral-500'}`}>
                          {data.total_matches > 0 ? `${data.total_matches}회 매칭` : "매칭 없음"}
                        </span>
                      </div>
                      {data.total_matches > 0 && (
                        <div className="flex flex-wrap gap-1.5 md:gap-2 mt-2">
                          {Object.entries(data.keyword_counts).map(([keyword, count]) => (
                            <Badge key={keyword} variant="outline" className="text-xs font-medium border-primary-200 text-primary-700 bg-primary-50">
                              {keyword}: {count}회
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
          </section>

          {/* 개선 제안 */}
          <section>
          <Alert className={`rounded-xl border-2 shadow-lg ${(() => {
            const totalMatches = Object.values(analysisResult.seo_analysis.field_analysis).reduce(
              (sum, field) => sum + field.total_matches,
              0
            )
            if (totalMatches === 0) return "border-red-200 bg-red-50"
            if (totalMatches < 10) return "border-orange-200 bg-orange-50"
            if (totalMatches < 30) return "border-blue-200 bg-blue-50"
            return "border-green-200 bg-green-50"
          })()}`}>
            <AlertCircle className={`h-4 w-4 ${(() => {
              const totalMatches = Object.values(analysisResult.seo_analysis.field_analysis).reduce(
                (sum, field) => sum + field.total_matches,
                0
              )
              if (totalMatches === 0) return "text-red-600"
              if (totalMatches < 10) return "text-orange-600"
              if (totalMatches < 30) return "text-blue-600"
              return "text-green-600"
            })()}`} />
            <AlertTitle className="text-neutral-900 font-semibold">SEO 최적화 제안</AlertTitle>
            <AlertDescription className="text-neutral-700 text-sm md:text-base leading-relaxed">
              {(() => {
                const totalMatches = Object.values(analysisResult.seo_analysis.field_analysis).reduce(
                  (sum, field) => sum + field.total_matches,
                  0
                )
                
                if (totalMatches === 0) {
                  return "타겟 키워드가 플레이스 정보에 전혀 포함되어 있지 않습니다. 메뉴, 업체소개글, 찾아오는길 등에 키워드를 추가하세요."
                } else if (totalMatches < 10) {
                  return "타겟 키워드 노출이 부족합니다. 업체소개글과 메뉴 설명에 더 많은 키워드를 자연스럽게 포함시키세요."
                } else if (totalMatches < 30) {
                  return "적절한 수준의 키워드 최적화가 되어 있습니다. 부족한 항목(대표 한줄평, AI 브리핑)을 보완하면 더 좋습니다."
                } else {
                  return "훌륭합니다! 키워드가 잘 최적화되어 있습니다. 정기적으로 업데이트하여 최신 상태를 유지하세요."
                }
              })()}
            </AlertDescription>
          </Alert>
          </section>
        </div>
      )}
      {/* 크레딧 차감 확인 모달 */}
      {CreditModal}
      </div>
    </div>
  )
}
