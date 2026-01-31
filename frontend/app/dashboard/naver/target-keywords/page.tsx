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
import { Loader2, Search, Target, TrendingUp, Plus, X, AlertCircle, CheckCircle2, Info, History, Calendar, Eye } from "lucide-react"
import { api } from "@/lib/config"
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
  const handleAnalyze = async () => {
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
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      {/* 헤더 - TurboTax Style */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-neutral-900 mb-1.5 leading-tight flex items-center gap-2">
          <Target className="w-5 h-5 md:w-6 md:h-6 text-primary-500" />
          타겟 키워드 추출 및 진단
        </h1>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          매장에 집중해야 할 키워드를 검색량 기반으로 추천하고, SEO 최적화 상태를 분석합니다.
        </p>
      </div>

      <div className="space-y-6 md:space-y-8">

      {/* 안내 메시지 */}
      <Alert className="border-primary-200 bg-primary-50">
        <Info className="h-4 w-4 text-primary-600" />
        <AlertTitle className="text-neutral-900 font-semibold">사용 방법</AlertTitle>
        <AlertDescription className="text-neutral-700 text-sm md:text-base leading-relaxed">
          1. 매장을 선택하세요 (주소에서 자동으로 지역명이 추출됩니다)<br />
          2. 지역명, 랜드마크, 메뉴/상품명, 업종, 기타 키워드를 입력하세요<br />
          3. 분석 시작 버튼을 클릭하면 최적의 타겟 키워드 10개를 추천해드립니다
        </AlertDescription>
      </Alert>

      {/* 과거 추출된 키워드 보기 */}
      {selectedStore && histories.length > 0 && (
        <Card className="rounded-card border-neutral-300 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg font-bold text-neutral-900 flex items-center gap-2">
              <History className="h-4 h-4 md:h-5 md:w-5 text-primary-500" />
              과거 추출된 키워드 보기
            </CardTitle>
            <CardDescription className="text-xs md:text-sm text-neutral-600">
              이 매장의 최근 {histories.length}개 키워드 추출 히스토리 (최신순)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {/* 모바일: 카드 레이아웃 */}
            <div className="md:hidden space-y-3">
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
      )}

      {/* 입력 폼 */}
      <Card className="rounded-card border-neutral-300 shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg font-bold text-neutral-900">분석 설정</CardTitle>
          <CardDescription className="text-xs md:text-sm text-neutral-600">매장과 키워드 정보를 입력하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 매장 선택 */}
          <div className="space-y-2">
            <Label htmlFor="store-select">매장 선택 *</Label>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger id="store-select">
                <SelectValue placeholder="분석할 매장을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {registeredStores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {storeAddress && (
              <p className="text-sm text-muted-foreground">📍 {storeAddress}</p>
            )}
          </div>

          {/* 지역명 입력 */}
          <div className="space-y-2">
            <Label>지역명 (구, 동, 역세권 등)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="예: 종로, 성수, 강남 등"
                value={tempRegion}
                onChange={(e) => setTempRegion(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addKeyword(tempRegion, setRegions, setTempRegion)
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => addKeyword(tempRegion, setRegions, setTempRegion)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {regions.map((region, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {region}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeKeyword(index, setRegions)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* 랜드마크 입력 */}
          <div className="space-y-2">
            <Label>랜드마크 (역, 건물, 명소 등)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="예: 성수역, 종로타워, 보신각 등"
                value={tempLandmark}
                onChange={(e) => setTempLandmark(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addKeyword(tempLandmark, setLandmarks, setTempLandmark)
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => addKeyword(tempLandmark, setLandmarks, setTempLandmark)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {landmarks.map((landmark, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {landmark}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeKeyword(index, setLandmarks)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* 메뉴/상품명 입력 */}
          <div className="space-y-2">
            <Label>메뉴 또는 상품명</Label>
            <div className="flex gap-2">
              <Input
                placeholder="예: 보쌈, 칼국수, 커피, 헤어컷 등"
                value={tempMenu}
                onChange={(e) => setTempMenu(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addKeyword(tempMenu, setMenus, setTempMenu)
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => addKeyword(tempMenu, setMenus, setTempMenu)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {menus.map((menu, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {menu}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeKeyword(index, setMenus)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* 업종 입력 */}
          <div className="space-y-2">
            <Label>업종</Label>
            <div className="flex gap-2">
              <Input
                placeholder="예: 맛집, 카페, 헤어샵, 사진관 등"
                value={tempIndustry}
                onChange={(e) => setTempIndustry(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addKeyword(tempIndustry, setIndustries, setTempIndustry)
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => addKeyword(tempIndustry, setIndustries, setTempIndustry)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {industries.map((industry, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {industry}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeKeyword(index, setIndustries)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* 기타 키워드 입력 */}
          <div className="space-y-2">
            <Label>기타 (판매형태, 특징 등)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="예: 단체주문, 회식, 데이트 등"
                value={tempOther}
                onChange={(e) => setTempOther(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addKeyword(tempOther, setOthers, setTempOther)
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => addKeyword(tempOther, setOthers, setTempOther)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {others.map((other, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {other}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeKeyword(index, setOthers)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* 분석 버튼 */}
          <div className="space-y-2">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !selectedStore}
              className="w-full font-semibold h-11 md:h-12"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                  타겟 키워드 분석 시작
                </>
              )}
            </Button>
            {isAnalyzing && (
              <div className="text-center">
                <p className="text-sm text-neutral-600">
                  잠시만 기다려주세요! ⏱️ <span className="font-semibold text-primary-600">{getEstimatedTime()}</span> 걸립니다
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 분석 결과 */}
      {analysisResult && (
        <div ref={analysisResultRef} className="space-y-6 md:space-y-8">
          {/* 요약 정보 */}
          <Card className="rounded-card border-neutral-300 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg font-bold text-neutral-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                분석 결과 요약
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div className="p-4 md:p-5 bg-primary-50 rounded-lg border border-primary-200">
                  <p className="text-xs md:text-sm text-primary-700 font-semibold mb-1">매장명</p>
                  <p className="text-lg md:text-xl font-bold text-neutral-900 line-clamp-1">{analysisResult.store_info.store_name}</p>
                </div>
                <div className="p-4 md:p-5 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs md:text-sm text-green-700 font-semibold mb-1">생성된 조합</p>
                  <p className="text-lg md:text-xl font-bold text-neutral-900">{analysisResult.total_combinations}개</p>
                </div>
                <div className="p-4 md:p-5 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs md:text-sm text-purple-700 font-semibold mb-1">타겟 키워드</p>
                  <p className="text-lg md:text-xl font-bold text-neutral-900">{analysisResult.top_keywords.length}개</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 타겟 키워드 테이블 */}
          <Card className="rounded-card border-neutral-300 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg font-bold text-neutral-900">타겟 키워드 (검색량 상위 20개)</CardTitle>
              <CardDescription className="text-xs md:text-sm text-neutral-600">검색량이 높은 순서로 정렬되었습니다</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {/* 모바일: 카드 레이아웃 */}
              <div className="md:hidden space-y-3">
                {analysisResult.top_keywords.map((keyword, index) => {
                  const fieldMatches = analysisResult.seo_analysis.keyword_field_matches?.[keyword.keyword] || {
                    menu: 0,
                    conveniences: 0,
                    microReviews: 0,
                    description: 0,
                    ai_briefing: 0,
                    road: 0,
                    visitor_reviews: 0,
                    total: 0
                  }
                  
                  const rankInfo = analysisResult.rank_data?.[keyword.keyword] || { rank: 0, total_count: 0 }
                  const rank = rankInfo.rank || 0
                  const totalCount = rankInfo.total_count || 0
                  
                  return (
                    <Card key={index} className="border-neutral-200 hover:border-primary-300 transition-colors">
                      <CardContent className="p-4 space-y-3">
                        {/* 헤더: 순위 & 키워드 & 경쟁도 */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-primary-700">
                                #{index + 1}
                              </span>
                              {rank > 0 && (
                                <span className="font-semibold text-xs text-primary-600">
                                  ({rank}위)
                                </span>
                              )}
                            </div>
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
                          <h4 className="text-base font-bold text-neutral-900">{keyword.keyword}</h4>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(keyword.components).map(([key, value]) => (
                              <Badge key={key} variant="secondary" className="text-xs font-medium bg-neutral-100 text-neutral-700">
                                {value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        {/* 통계 */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-primary-50 rounded-lg p-3 border border-primary-200">
                            <p className="text-xs text-primary-700 font-semibold mb-1">전체 검색량</p>
                            <p className="text-lg font-bold text-neutral-900">{keyword.total_volume.toLocaleString()}</p>
                          </div>
                          <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                            <p className="text-xs text-neutral-600 font-semibold mb-1">검색 업체수</p>
                            <p className="text-lg font-bold text-neutral-900">{totalCount > 0 ? totalCount.toLocaleString() : '-'}</p>
                          </div>
                        </div>
                        
                        {/* 상세 정보 */}
                        <div className="pt-2 border-t border-neutral-200 space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-neutral-600">PC 검색량</span>
                            <span className="font-semibold text-neutral-900">{keyword.monthly_pc_qc_cnt.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-neutral-600">모바일 검색량</span>
                            <span className="font-semibold text-neutral-900">{keyword.monthly_mobile_qc_cnt.toLocaleString()}</span>
                          </div>
                          {rank === 0 && (
                            <div className="pt-1">
                              <Badge variant="outline" className="text-xs border-red-300 text-red-600 bg-red-50 font-medium">
                                300위권 밖
                              </Badge>
                            </div>
                          )}
                        </div>
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
                      <TableHead className="w-[50px]">순위</TableHead>
                      <TableHead>키워드</TableHead>
                      <TableHead>구성 요소</TableHead>
                      <TableHead className="text-right">PC 검색량</TableHead>
                      <TableHead className="text-right">모바일 검색량</TableHead>
                      <TableHead className="text-right">전체 검색량</TableHead>
                      <TableHead className="text-right">검색 업체수</TableHead>
                      <TableHead className="w-[80px]">경쟁도</TableHead>
                      <TableHead className="w-[80px] text-center bg-primary-50 font-semibold text-primary-900">순위</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysisResult.top_keywords.map((keyword, index) => {
                      const fieldMatches = analysisResult.seo_analysis.keyword_field_matches?.[keyword.keyword] || {
                        menu: 0,
                        conveniences: 0,
                        microReviews: 0,
                        description: 0,
                        ai_briefing: 0,
                        road: 0,
                        visitor_reviews: 0,
                        total: 0
                      }
                      
                      const rankInfo = analysisResult.rank_data?.[keyword.keyword] || { rank: 0, total_count: 0 }
                      const rank = rankInfo.rank || 0
                      const totalCount = rankInfo.total_count || 0
                      
                      return (
                        <TableRow key={index} className="hover:bg-neutral-50 transition-colors">
                          <TableCell className="font-bold text-neutral-900">{index + 1}</TableCell>
                          <TableCell className="font-semibold text-neutral-900">{keyword.keyword}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(keyword.components).map(([key, value]) => (
                                <Badge key={key} variant="secondary" className="text-xs font-medium bg-neutral-100 text-neutral-700 hover:bg-neutral-200">
                                  {value}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-neutral-600 text-sm">
                            {keyword.monthly_pc_qc_cnt.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-neutral-600 text-sm">
                            {keyword.monthly_mobile_qc_cnt.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary-600">
                            {keyword.total_volume.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-neutral-900 font-semibold text-sm">
                            {totalCount > 0 ? totalCount.toLocaleString() : '-'}
                          </TableCell>
                          <TableCell>
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
                          <TableCell className="text-center bg-primary-50">
                            {rank > 0 ? (
                              <span className="text-primary-700 font-bold">{rank}위</span>
                            ) : (
                              <span className="text-red-600 text-xs font-semibold">300위권 밖</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* SEO 분석 */}
          <Card className="rounded-card border-neutral-300 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg font-bold text-neutral-900">플레이스 SEO 분석</CardTitle>
              <CardDescription className="text-xs md:text-sm text-neutral-600">키워드가 플레이스 정보에 포함된 횟수를 분석합니다</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
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

          {/* 개선 제안 */}
          <Alert className={`${(() => {
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
        </div>
      )}
      </div>
    </div>
  )
}
