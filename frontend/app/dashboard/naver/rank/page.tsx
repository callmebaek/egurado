"use client"

/**
 * 네이버 플레이스 순위 조회 - TurboTax Style
 * Shadcn UI + 100% 모바일 반응형
 */

import { useStores } from "@/lib/hooks/useStores"
import { useAuth } from "@/lib/auth-context"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { Loader2, TrendingUp, TrendingDown, Search, Minus, MapPin, Star, X, LineChart as LineChartIcon } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { api } from "@/lib/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { notifyCreditUsed } from "@/lib/credit-utils"

interface Store {
  id: string
  name: string
  place_id: string
  platform: string
}

interface KeywordData {
  id: string
  keyword: string
  current_rank: number | null
  previous_rank: number | null
  rank_change: number | null
  total_results: number
  is_tracked: boolean
  last_checked_at: string
  created_at: string
}

interface RankHistoryData {
  date: string
  rank: number | null
  checked_at: string
}

interface RankResult {
  rank: number | null
  found: boolean
  total_results: number
  total_count?: string
  previous_rank: number | null
  rank_change: number | null
  search_results: SearchResult[]
  visitor_review_count?: number
  blog_review_count?: number
  save_count?: number
}

interface SearchResult {
  rank: number
  place_id: string
  name: string
  category: string
  address: string
  thumbnail: string
  rating: number | null
  review_count: number | null
}

export default function NaverRankPage() {
  const { hasStores, isLoading: storesLoading } = useStores()
  const { getToken } = useAuth()
  const { toast } = useToast()

  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>("")
  const [keyword, setKeyword] = useState<string>("")
  const [isChecking, setIsChecking] = useState(false)
  const [rankResult, setRankResult] = useState<RankResult | null>(null)
  const [keywords, setKeywords] = useState<KeywordData[]>([])
  const [loadingKeywords, setLoadingKeywords] = useState(false)
  const [selectedKeywordForChart, setSelectedKeywordForChart] = useState<KeywordData | null>(null)
  const [rankHistory, setRankHistory] = useState<RankHistoryData[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  // 구독 tier 및 키워드 제한
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free")
  const [keywordLimit, setKeywordLimit] = useState<number>(50)
  const [currentKeywordCount, setCurrentKeywordCount] = useState<number>(0)
  const [tierLoaded, setTierLoaded] = useState<boolean>(false)
  
  // 추적 추가 모달 상태
  const [showAddTrackingDialog, setShowAddTrackingDialog] = useState(false)
  const [selectedKeywordForTracking, setSelectedKeywordForTracking] = useState<KeywordData | null>(null)
  const [updateFrequency, setUpdateFrequency] = useState<'daily_once' | 'daily_twice' | 'daily_thrice'>('daily_once')
  const [updateTimes, setUpdateTimes] = useState<number[]>([9])
  const [notificationEnabled, setNotificationEnabled] = useState(false)
  const [notificationType, setNotificationType] = useState<'email' | 'sms' | 'kakao' | ''>('')
  const [isAddingTracker, setIsAddingTracker] = useState(false)

  // 사용자 구독 tier 로드
  useEffect(() => {
    const loadUserTier = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setKeywordLimit(1)
          setTierLoaded(true)
          return
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("subscription_tier")
          .eq("id", user.id)
          .single()
        
        if (userError || !userData) {
          try {
            const { data: authUser } = await supabase.auth.getUser()
            if (authUser && authUser.user) {
              const { data: insertedUser, error: insertError } = await supabase
                .from("users")
                .insert({
                  id: authUser.user.id,
                  email: authUser.user.email,
                  subscription_tier: "pro",
                  subscription_status: "active"
                })
                .select()
                .single()
              
              if (!insertError && insertedUser) {
                setSubscriptionTier("pro")
                setKeywordLimit(50)
                setTierLoaded(true)
                return
              }
            }
          } catch (createError) {
            console.log("자동 생성 중 오류:", createError)
          }
          
          setSubscriptionTier("pro")
          setKeywordLimit(50)
          setTierLoaded(true)
          return
        }
        
        if (userData) {
          const tier = userData.subscription_tier?.toLowerCase()?.trim() || "free"
          setSubscriptionTier(tier)
          
          const limits: Record<string, number> = {
            free: 1,
            basic: 10,
            pro: 50
          }
          
          const limit = limits[tier] || 1
          setKeywordLimit(limit)
        } else {
          setSubscriptionTier("free")
          setKeywordLimit(1)
        }
        
        setTierLoaded(true)
      } catch (error) {
        console.error("Tier 로드 실패:", error)
        setKeywordLimit(1)
        setTierLoaded(true)
      }
    }

    loadUserTier()
  }, [])

  // 매장 목록 로드
  useEffect(() => {
    const loadStores = async () => {
      if (!tierLoaded) return
      
      try {
        const token = getToken()
        if (!token) return

        const response = await fetch(api.stores.list(), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (!response.ok) return
        
        const data = await response.json()
        const naverStores = data.stores.filter((s: Store) => s.platform === "naver")
        setStores(naverStores)
        
        if (naverStores.length > 0) {
          setSelectedStoreId(naverStores[0].id)
        }
      } catch (error) {
        console.error("매장 로드 실패:", error)
        toast({
          title: "매장 로드 실패",
          description: "매장 목록을 불러오는 중 오류가 발생했습니다",
          variant: "destructive",
        })
      }
    }

    if (hasStores && tierLoaded) {
      loadStores()
    }
  }, [hasStores, tierLoaded, getToken, toast])

  // 전체 키워드 수 계산
  const calculateTotalKeywordCount = async () => {
    try {
      const token = getToken()
      if (!token) return
      
      const allStoresResponse = await fetch(api.stores.list(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (allStoresResponse.ok) {
        const allStoresData = await allStoresResponse.json()
        const naverStores = allStoresData.stores.filter((s: Store) => s.platform === "naver")
        
        const keywordPromises = naverStores.map((store: Store) =>
          fetch(api.naver.keywords(store.id))
            .then(res => res.ok ? res.json() : { keywords: [] })
            .catch(() => ({ keywords: [] }))
        )
        
        const keywordResults = await Promise.all(keywordPromises)
        const totalKeywords = keywordResults.reduce((sum, data) => 
          sum + (data.keywords || []).length, 0
        )
        
        setCurrentKeywordCount(totalKeywords)
      }
    } catch (error) {
      console.error("키워드 수 계산 실패:", error)
    }
  }

  // 키워드 목록 로드
  const loadKeywords = async (storeId?: string) => {
    const targetStoreId = storeId || selectedStoreId
    
    if (!targetStoreId || !tierLoaded) return

    setLoadingKeywords(true)
    try {
      const token = getToken()
      if (!token) return
      
      const response = await fetch(api.naver.keywords(targetStoreId))
      
      if (response.ok) {
        const data = await response.json()
        setKeywords(data.keywords || [])
      }
    } catch (error) {
      console.error("키워드 로드 실패:", error)
    } finally {
      setLoadingKeywords(false)
    }
  }

  // 선택된 매장의 키워드 목록 로드
  useEffect(() => {
    if (selectedStoreId && tierLoaded) {
      loadKeywords()
    }
  }, [selectedStoreId, tierLoaded])

  // 전체 키워드 수 계산
  useEffect(() => {
    if (tierLoaded && stores.length > 0) {
      calculateTotalKeywordCount()
    }
  }, [tierLoaded, stores.length])

  // 순위 조회
  const handleCheckRank = async () => {
    if (!selectedStoreId) {
      toast({
        title: "매장을 선택해주세요",
        variant: "destructive",
      })
      return
    }

    if (!keyword.trim()) {
      toast({
        title: "키워드를 입력해주세요",
        variant: "destructive",
      })
      return
    }

    setIsChecking(true)
    setRankResult(null)

    try {
      const token = await getToken()
      if (!token) {
        toast({
          title: "인증 오류",
          description: "로그인이 필요합니다.",
          variant: "destructive",
        })
        setIsChecking(false)
        return
      }

      const response = await fetch(
        api.naver.checkRank(),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            store_id: selectedStoreId,
            keyword: keyword.trim(),
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        
        if (response.status === 403 && error.detail?.includes("키워드 등록 제한")) {
          toast({
            title: "키워드 등록 제한 도달",
            description: error.detail,
            variant: "destructive",
          })
          return
        }
        
        throw new Error(error.detail || "순위 조회에 실패했습니다")
      }

      const data = await response.json()
      
      setRankResult({
        rank: data.rank,
        found: data.found,
        total_results: data.total_results,
        total_count: data.total_count,
        previous_rank: data.previous_rank,
        rank_change: data.rank_change,
        search_results: data.search_results || [],
        visitor_review_count: data.visitor_review_count,
        blog_review_count: data.blog_review_count,
        save_count: data.save_count,
      })

      // ✨ 크레딧 실시간 차감 알림
      notifyCreditUsed(5, token)

      await loadKeywords(selectedStoreId)
      calculateTotalKeywordCount()
      
      if (data.total_count && keyword) {
        let totalResultsNum = 0
        if (typeof data.total_count === 'string') {
          totalResultsNum = parseInt(data.total_count.replace(/,/g, ''), 10) || 0
        } else if (typeof data.total_count === 'number') {
          totalResultsNum = data.total_count
        }
        
        setKeywords(prevKeywords => 
          prevKeywords.map(kw => 
            kw.keyword === keyword.trim() ? { 
              ...kw, 
              total_results: totalResultsNum
            } : kw
          )
        )
      }

      toast({
        title: data.found ? "순위 조회 완료" : "300위 밖",
        description: data.found 
          ? `현재 순위: ${data.rank}위${data.total_count ? ` (전체 ${data.total_count}개 중)` : ''}`
          : `상위 300개 내에서 매장을 찾을 수 없습니다`,
        variant: data.found ? "default" : "destructive",
      })
    } catch (error: any) {
      console.error("순위 조회 실패:", error)
      toast({
        title: "순위 조회 실패",
        description: error.message || "순위를 조회하는 중 오류가 발생했습니다",
        variant: "destructive",
      })
    } finally {
      setIsChecking(false)
    }
  }

  // 키워드 순위 히스토리 조회
  const handleViewKeywordHistory = async (keyword: KeywordData) => {
    setSelectedKeywordForChart(keyword)
    setLoadingHistory(true)
    
    try {
      const response = await fetch(api.naver.keywordHistory(keyword.id))

      if (!response.ok) {
        throw new Error("순위 히스토리 조회에 실패했습니다")
      }

      const data = await response.json()
      setRankHistory(data.history || [])
    } catch (error: any) {
      console.error("순위 히스토리 조회 실패:", error)
      toast({
        title: "순위 히스토리 조회 실패",
        description: error.message || "순위 히스토리를 조회하는 중 오류가 발생했습니다",
        variant: "destructive",
      })
      setRankHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  // 추적 추가 핸들러
  const handleAddTracking = (keyword: KeywordData) => {
    setSelectedKeywordForTracking(keyword)
    setUpdateFrequency('daily_once')
    setUpdateTimes([9])
    setNotificationEnabled(false)
    setNotificationType('')
    setShowAddTrackingDialog(true)
  }

  // 추적 추가 실행
  const handleSubmitTracking = async () => {
    if (!selectedKeywordForTracking || !selectedStoreId) {
      toast({
        title: "❌ 오류",
        description: "매장 또는 키워드 정보가 없습니다",
        variant: "destructive"
      })
      return
    }

    setIsAddingTracker(true)
    try {
      const token = getToken()
      if (!token) {
        toast({
          title: "❌ 인증 오류",
          description: "로그인이 필요합니다",
          variant: "destructive"
        })
        return
      }

      const payload = {
        store_id: selectedStoreId,
        keyword_id: selectedKeywordForTracking.id,
        keyword: selectedKeywordForTracking.keyword,
        update_frequency: updateFrequency,
        update_times: updateTimes,
        notification_enabled: notificationEnabled,
        notification_type: notificationEnabled ? notificationType : null
      }

      const response = await fetch(api.metrics.create(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = "추적 추가 실패"
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.detail || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      toast({
        title: "✅ 추적 추가 완료",
        description: `"${selectedKeywordForTracking.keyword}" 키워드가 추적 목록에 추가되었습니다`
      })

      setShowAddTrackingDialog(false)
      await loadKeywords(selectedStoreId)
    } catch (error: any) {
      console.error("추적 추가 오류:", error)
      toast({
        title: "❌ 추적 추가 실패",
        description: error.message || "추적 추가 중 오류가 발생했습니다",
        variant: "destructive"
      })
    } finally {
      setIsAddingTracker(false)
    }
  }

  // 키워드 삭제
  const handleDeleteKeyword = async (keywordId: string, keywordName: string) => {
    const confirmed = window.confirm(
      `"${keywordName}" 키워드를 삭제하시겠습니까?\n\n⚠️ 경고: 이 작업은 되돌릴 수 없습니다.\n- 키워드 정보가 영구적으로 삭제됩니다.\n- 과거 순위 기록도 모두 삭제됩니다.\n- 삭제된 데이터는 복구할 수 없습니다.`
    )

    if (!confirmed) return

    try {
      const token = getToken()
      if (!token) {
        toast({
          title: "❌ 인증 오류",
          description: "로그인이 필요합니다",
          variant: "destructive"
        })
        return
      }
      
      const response = await fetch(
        api.naver.deleteKeyword(keywordId),
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error(`키워드 삭제에 실패했습니다 (${response.status})`)
      }

      if (selectedKeywordForChart?.id === keywordId) {
        setSelectedKeywordForChart(null)
        setRankHistory([])
      }

      if (selectedStoreId) {
        await loadKeywords(selectedStoreId)
        calculateTotalKeywordCount()
      }

      toast({
        title: "✅ 키워드 삭제 완료",
        description: `"${keywordName}" 키워드가 삭제되었습니다.`,
      })
    } catch (error: any) {
      console.error("키워드 삭제 실패:", error)
      toast({
        title: "키워드 삭제 실패",
        description: error.message || "키워드를 삭제하는 중 오류가 발생했습니다",
        variant: "destructive",
      })
    }
  }

  if (storesLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary-500" />
            <p className="text-sm md:text-base text-neutral-600">매장 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!hasStores) {
    return <EmptyStoreMessage />
  }

  const selectedStore = stores.find(s => s.id === selectedStoreId)

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      {/* 헤더 - TurboTax Style */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-neutral-900 mb-1.5 leading-tight">
          플레이스 순위 조회
        </h1>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed mb-2">
          키워드별 네이버 플레이스 검색 순위를 실시간으로 확인하세요
        </p>
        <Badge 
          variant="secondary"
          className="bg-primary-100 text-primary-700 border-primary-200 px-2.5 py-1 text-xs font-medium inline-flex"
        >
          최대 300위까지 조회
        </Badge>
      </div>

      <div className="space-y-6 md:space-y-8">

        {/* 조회 폼 - TurboTax Style */}
        <Card className="rounded-card border-neutral-300 shadow-card">
          <CardContent className="p-4 md:p-6 space-y-4 md:space-y-5">
            {/* 매장 선택 */}
            <div>
              <Label htmlFor="store-select" className="text-sm font-bold text-neutral-900 mb-2 block">
                매장 선택
              </Label>
              {stores.length === 0 ? (
                <div className="bg-warning border border-warning-dark rounded-lg p-3 md:p-4">
                  <p className="text-sm text-warning-dark">
                    네이버 플레이스 매장이 없습니다.{' '}
                    <a href="/dashboard/connect-store" className="font-bold underline hover:text-warning-darker">
                      매장 등록하기
                    </a>
                  </p>
                </div>
              ) : (
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger 
                    id="store-select"
                    className="h-11 md:h-12 border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                      <SelectValue placeholder="매장을 선택하세요" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 키워드 입력 */}
            <div>
              <Label htmlFor="keyword-input" className="text-sm font-bold text-neutral-900 mb-2 block">
                검색 키워드
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4 md:h-5 md:w-5" />
                  <Input
                    id="keyword-input"
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="예: 강남 카페"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCheckRank()
                      }
                    }}
                    disabled={isChecking}
                    className="h-11 md:h-12 pl-10 md:pl-12 border-neutral-300 focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <Button
                  onClick={handleCheckRank}
                  disabled={isChecking || !selectedStoreId || stores.length === 0}
                  className="h-11 md:h-12 w-11 md:w-auto md:px-6 p-0 shadow-button hover:shadow-button-hover active:scale-95 transition-all duration-200 font-bold flex-shrink-0"
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="h-5 w-5 md:mr-2 animate-spin" />
                      <span className="hidden md:inline">조회중...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5 md:mr-2" />
                      <span className="hidden md:inline">순위 확인</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs md:text-sm text-neutral-500 mt-2 leading-relaxed">
                네이버 지도에서 검색할 키워드를 입력하세요 (최대 300개까지 확인)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 순위 결과 - TurboTax Style */}
        {rankResult && (
          <Card className="rounded-card border-neutral-300 shadow-card">
            <CardHeader className="pb-3 md:pb-4 px-4 md:px-6 pt-4 md:pt-6">
              <CardTitle className="text-lg md:text-xl font-bold text-neutral-900">
                순위 결과
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              {rankResult.found && rankResult.rank ? (
                <div className="space-y-4 md:space-y-6">
                  {/* 순위 및 리뷰 정보 */}
                  <div className="bg-success-light border border-success rounded-lg p-4 md:p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {/* 순위 */}
                      <div className="flex items-center gap-4">
                        <div className="text-4xl md:text-5xl font-bold text-success whitespace-nowrap">
                          {rankResult.rank}위
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm md:text-base text-neutral-900 truncate">{selectedStore?.name}</p>
                          <p className="text-xs md:text-sm text-neutral-600 truncate">
                            {rankResult.total_count 
                              ? `전체 ${rankResult.total_count}개 중` 
                              : `상위 ${rankResult.total_results}개 중`}
                          </p>
                        </div>
                      </div>

                      {/* 구분선 */}
                      <div className="hidden sm:block w-px h-12 bg-success/30" />

                      {/* 리뷰수 정보 */}
                      <div className="flex flex-wrap gap-4 sm:gap-6 items-center w-full sm:w-auto">
                        {/* 방문자 리뷰 */}
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-neutral-600 whitespace-nowrap">방문자 리뷰</div>
                          <div className="text-lg md:text-xl font-bold text-primary-600 whitespace-nowrap">
                            {(rankResult.visitor_review_count || 0).toLocaleString()}개
                          </div>
                        </div>

                        {/* 블로그 리뷰 */}
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-neutral-600 whitespace-nowrap">블로그 리뷰</div>
                          <div className="text-lg md:text-xl font-bold text-primary-600 whitespace-nowrap">
                            {(rankResult.blog_review_count || 0).toLocaleString()}개
                          </div>
                        </div>
                      </div>

                      {/* 순위 변동 */}
                      {rankResult.rank_change !== null && rankResult.rank_change !== 0 && (
                        <div className={`flex items-center gap-1 ml-auto ${
                          rankResult.rank_change > 0 ? 'text-success' : 'text-error'
                        }`}>
                          {rankResult.rank_change > 0 ? (
                            <TrendingUp className="w-5 h-5" />
                          ) : (
                            <TrendingDown className="w-5 h-5" />
                          )}
                          <span className="font-bold text-sm md:text-base">
                            {Math.abs(rankResult.rank_change)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 검색 결과 목록 */}
                  <div>
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <h3 className="text-base md:text-lg font-bold text-neutral-900">검색 결과</h3>
                      <Badge variant="secondary" className="bg-primary-100 text-primary-700 border-primary-200">
                        {rankResult.search_results.length}개 확인
                      </Badge>
                    </div>
                    <div className="space-y-2 md:space-y-3 max-h-[500px] overflow-y-auto">
                      {rankResult.search_results.map((result, index) => (
                        <div
                          key={result.place_id}
                          className={`p-3 md:p-4 rounded-lg border transition-all duration-200 ${
                            result.place_id === selectedStore?.place_id
                              ? 'bg-success-light border-success'
                              : 'bg-white border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <div className="flex items-start gap-2 md:gap-3">
                            {/* 순위 Badge */}
                            <div 
                              className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full font-bold text-sm md:text-base flex-shrink-0 ${
                                result.place_id === selectedStore?.place_id 
                                  ? 'bg-success text-white' 
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              {index + 1}
                            </div>

                            {/* 썸네일 */}
                            {result.thumbnail && (
                              <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                                <img
                                  src={result.thumbnail}
                                  alt={result.name}
                                  className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              </div>
                            )}

                            {/* 매장 정보 */}
                            <div className="flex-1 min-w-0">
                              {/* 상단: 매장명 + 내 매장 Badge */}
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="font-bold text-sm md:text-base text-neutral-900 line-clamp-2 leading-tight flex-1">
                                  {result.name}
                                </p>
                                {result.place_id === selectedStore?.place_id && (
                                  <Badge className="bg-success text-white border-success flex-shrink-0 text-xs px-2 py-0.5">
                                    내 매장
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-xs md:text-sm text-neutral-500 truncate mb-1">
                                {result.category}
                              </p>
                              
                              <div className="flex items-start gap-1.5">
                                <MapPin className="w-3 h-3 md:w-3.5 md:h-3.5 text-neutral-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs md:text-sm text-neutral-500 line-clamp-2 leading-tight flex-1">
                                  {result.address}
                                </p>
                              </div>
                              
                              {/* 평점 및 리뷰 - 우측 하단 */}
                              {result.review_count && result.review_count > 0 && (
                                <div className="flex items-center gap-1 mt-2">
                                  <Star className="w-3 h-3 fill-warning text-warning flex-shrink-0" />
                                  {result.rating && typeof result.rating === 'number' && result.rating > 0 && (
                                    <span className="text-xs font-bold text-neutral-900">
                                      {result.rating.toFixed(1)}
                                    </span>
                                  )}
                                  <span className="text-xs text-neutral-500">
                                    ({typeof result.review_count === 'number' ? result.review_count.toLocaleString() : result.review_count})
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 border border-neutral-200 rounded-lg p-6 md:p-8">
                  <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                    {/* 아이콘 */}
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-neutral-200 rounded-full flex items-center justify-center">
                      <span className="text-3xl md:text-4xl">🔍</span>
                    </div>
                    
                    {/* 메인 메시지 */}
                    <div className="text-center space-y-2">
                      <h3 className="text-xl md:text-2xl font-bold text-neutral-900">
                        300위 밖
                      </h3>
                      <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
                        상위 300개 내에서 매장을 찾을 수 없습니다
                      </p>
                    </div>
                    
                    {/* 통계 정보 */}
                    <div className="w-full bg-white border border-neutral-200 rounded-lg p-3 md:p-4">
                      <p className="text-xs md:text-sm text-neutral-500 text-center">
                        {rankResult.total_count 
                          ? `전체 ${rankResult.total_count}개 중 300개 확인됨` 
                          : `총 ${rankResult.total_results}개 확인됨`}
                      </p>
                    </div>
                    
                    {/* 제안 */}
                    <div className="flex items-start gap-2 bg-primary-50 border border-primary-200 rounded-lg p-3 md:p-4 w-full">
                      <span className="text-lg flex-shrink-0">💡</span>
                      <p className="text-xs md:text-sm text-primary-700 leading-relaxed">
                        <span className="font-bold">팁:</span> 더 구체적인 지역명이나 업종을 포함한 키워드로 다시 시도해보세요
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 조회한 키워드 목록 - TurboTax Style Table */}
        {keywords.length > 0 && (
          <Card className="rounded-card border-neutral-300 shadow-card">
            <CardHeader className="pb-3 md:pb-4 px-4 md:px-6 pt-4 md:pt-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-lg md:text-xl font-bold text-neutral-900">
                    조회한 키워드
                  </CardTitle>
                  <p className="text-xs md:text-sm text-neutral-500 mt-1">
                    최근 조회한 {keywords.length}개의 키워드
                  </p>
                </div>
                <Badge 
                  variant="secondary"
                  className="bg-neutral-100 text-neutral-600 border-neutral-200 px-2.5 py-1 text-xs font-medium"
                >
                  💡 최근 30개만 표시
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              {loadingKeywords ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-neutral-200">
                      <thead>
                        <tr className="bg-neutral-50">
                          <th className="px-3 md:px-4 py-3 text-left text-xs md:text-sm font-bold text-neutral-700 w-1/3 md:w-auto">
                            키워드
                          </th>
                          <th className="px-2 md:px-3 py-3 text-center text-xs md:text-sm font-bold text-neutral-700 w-20 md:w-24">
                            현재 순위
                          </th>
                          <th className="hidden sm:table-cell px-2 md:px-3 py-3 text-center text-xs md:text-sm font-bold text-neutral-700 w-24">
                            전체 업체 수
                          </th>
                          <th className="hidden md:table-cell px-2 md:px-3 py-3 text-center text-xs md:text-sm font-bold text-neutral-700 w-24">
                            최근 조회
                          </th>
                          <th className="hidden lg:table-cell px-2 py-3 text-center text-xs md:text-sm font-bold text-neutral-700 w-16">
                            차트
                          </th>
                          <th className="px-2 py-3 text-center text-xs md:text-sm font-bold text-neutral-700 w-16 md:w-20">
                            추적
                          </th>
                          <th className="px-2 py-3 text-center text-xs md:text-sm font-bold text-neutral-700 w-12 md:w-16">
                            삭제
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 bg-white">
                        {keywords.map((kw) => (
                          <tr 
                            key={kw.id}
                            className="hover:bg-neutral-50 transition-colors"
                          >
                            <td className="px-3 md:px-4 py-3">
                              <div className="font-bold text-xs md:text-sm text-neutral-900 break-words">{kw.keyword}</div>
                            </td>
                            <td className="px-2 md:px-3 py-3 text-center">
                              <span className="text-sm md:text-base font-bold text-success">
                                {kw.current_rank ? `${kw.current_rank}위` : (
                                  <span className="text-xs text-warning font-medium">300위권 밖</span>
                                )}
                              </span>
                            </td>
                            <td className="hidden sm:table-cell px-2 md:px-3 py-3 text-center text-xs md:text-sm text-neutral-600">
                              {kw.total_results && kw.total_results > 0 ? `${kw.total_results.toLocaleString()}개` : "-"}
                            </td>
                            <td className="hidden md:table-cell px-2 md:px-3 py-3 text-center text-xs text-neutral-600">
                              {new Date(kw.last_checked_at).toLocaleDateString('ko-KR', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="hidden lg:table-cell px-2 py-3 text-center">
                              <button
                                onClick={() => handleViewKeywordHistory(kw)}
                                className="inline-flex items-center justify-center p-1.5 rounded-lg transition-all duration-200 bg-primary-100 text-primary-600 hover:bg-primary-200 active:scale-95 mx-auto"
                                title="순위 차트 보기"
                              >
                                <LineChartIcon className="w-3.5 h-3.5" />
                              </button>
                            </td>
                            <td className="px-2 py-3 text-center">
                              {kw.is_tracked ? (
                                <Badge variant="secondary" className="bg-success-light text-success border-success/20 text-xs px-1.5 py-0.5 whitespace-nowrap">
                                  추적중
                                </Badge>
                              ) : (
                                <Button
                                  onClick={() => handleAddTracking(kw)}
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs border-primary-300 text-primary-600 hover:bg-primary-50 hover:border-primary-400 active:scale-95 transition-all duration-200 font-medium whitespace-nowrap"
                                >
                                  추적
                                </Button>
                              )}
                            </td>
                            <td className="px-2 py-3 text-center">
                              <button
                                onClick={() => handleDeleteKeyword(kw.id, kw.keyword)}
                                className="inline-flex items-center justify-center p-1.5 rounded-lg transition-all duration-200 bg-error-light text-error hover:bg-error/20 active:scale-95 mx-auto"
                                title="키워드 삭제"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 순위 히스토리 차트 - TurboTax Style */}
        {selectedKeywordForChart && (
          <Card className="rounded-card border-primary-200 shadow-card bg-gradient-to-br from-primary-50/30 to-success-light/30">
            <CardHeader className="pb-3 md:pb-4 px-4 md:px-6 pt-4 md:pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <LineChartIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-neutral-900">순위 변화 차트</h3>
                    <p className="text-xs md:text-sm text-neutral-600 mt-0.5">
                      "{selectedKeywordForChart.keyword}"
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedKeywordForChart(null)
                    setRankHistory([])
                  }}
                  className="h-8 w-8 p-0 hover:bg-neutral-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 md:p-6 pt-0">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                    <p className="text-sm text-neutral-600">데이터를 불러오는 중...</p>
                  </div>
                </div>
              ) : rankHistory.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <p className="text-sm md:text-base text-neutral-600 mb-1">순위 히스토리가 없습니다.</p>
                    <p className="text-xs md:text-sm text-neutral-500">
                      순위를 조회하면 여기에 날짜별 변화가 표시됩니다.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 md:space-y-6">
                  {/* 통계 요약 */}
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="bg-gradient-to-br from-primary-100 to-primary-50 border border-primary-200 rounded-lg p-3 md:p-4 text-center">
                      <p className="text-xs text-primary-700 mb-1 font-medium uppercase">현재 순위</p>
                      <p className="text-2xl md:text-3xl font-bold text-primary-600">
                        {selectedKeywordForChart.current_rank || '-'}위
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-success-light to-success-light/50 border border-success rounded-lg p-3 md:p-4 text-center">
                      <p className="text-xs text-success-dark mb-1 font-medium uppercase">측정 횟수 (최근 30일)</p>
                      <p className="text-2xl md:text-3xl font-bold text-success">
                        {(() => {
                          const thirtyDaysAgo = new Date()
                          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                          return rankHistory.filter(item => 
                            new Date(item.checked_at) >= thirtyDaysAgo
                          ).length
                        })()}회
                      </p>
                    </div>
                  </div>

                  {/* 차트 */}
                  <div className="w-full h-[300px] md:h-[400px] bg-white rounded-lg p-2 md:p-4 border border-neutral-200">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={(() => {
                          if (rankHistory.length === 0) return []
                          
                          const dates = rankHistory.map(item => new Date(item.checked_at))
                          const oldestDate = new Date(Math.min(...dates.map(d => d.getTime())))
                          oldestDate.setHours(0, 0, 0, 0)
                          
                          const days = []
                          for (let i = 0; i < 30; i++) {
                            const date = new Date(oldestDate)
                            date.setDate(oldestDate.getDate() + i)
                            days.push(date)
                          }
                          
                          const dataMap = new Map()
                          rankHistory.forEach(item => {
                            const itemDate = new Date(item.checked_at)
                            const year = itemDate.getFullYear()
                            const month = String(itemDate.getMonth() + 1).padStart(2, '0')
                            const day = String(itemDate.getDate()).padStart(2, '0')
                            const dateKey = `${year}-${month}-${day}`
                            
                            if (!dataMap.has(dateKey) || new Date(dataMap.get(dateKey).checked_at) < itemDate) {
                              dataMap.set(dateKey, item)
                            }
                          })
                          
                          return days.map(date => {
                            const year = date.getFullYear()
                            const month = String(date.getMonth() + 1).padStart(2, '0')
                            const day = String(date.getDate()).padStart(2, '0')
                            const dateKey = `${year}-${month}-${day}`
                            const dataForDate = dataMap.get(dateKey)
                            
                            return {
                              date: date.toLocaleDateString('ko-KR', {
                                month: 'short',
                                day: 'numeric'
                              }),
                              rank: dataForDate ? dataForDate.rank : null,
                              fullDate: dataForDate ? new Date(dataForDate.checked_at).toLocaleString('ko-KR') : null,
                              rawDate: dataForDate ? dataForDate.checked_at : null
                            }
                          })
                        })()}
                        margin={{ top: 20, right: 20, left: 10, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval="preserveStartEnd"
                          stroke="#9ca3af"
                        />
                        <YAxis 
                          reversed={true}
                          label={{ value: '순위', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                          tick={{ fontSize: 11 }}
                          domain={[0, 300]}
                          ticks={[1, 50, 100, 150, 200, 250, 300]}
                          allowDecimals={false}
                          stroke="#9ca3af"
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length && payload[0].payload.fullDate) {
                              return (
                                <div className="bg-white p-3 border border-neutral-200 rounded-lg shadow-lg">
                                  <p className="text-xs text-neutral-600 mb-1">{payload[0].payload.fullDate}</p>
                                  <p className="text-lg font-bold text-primary-600">
                                    {payload[0].value}위
                                  </p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line 
                          type="monotone" 
                          dataKey="rank" 
                          stroke="#635bff" 
                          strokeWidth={3}
                          dot={(props: any) => {
                            const { cx, cy, payload } = props
                            if (!payload.rank || !payload.rawDate) return <circle cx={cx} cy={cy} r={0} />
                            
                            const allData = rankHistory.filter(h => h.rank !== null)
                            if (allData.length === 0) return <circle cx={cx} cy={cy} r={0} />
                            
                            const latestDate = new Date(Math.max(...allData.map(h => new Date(h.checked_at).getTime())))
                            const currentDate = new Date(payload.rawDate)
                            const isLatest = Math.abs(currentDate.getTime() - latestDate.getTime()) < 60000
                            
                            return (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={isLatest ? 8 : 4}
                                fill={isLatest ? "#ef4444" : "#635bff"}
                                stroke={isLatest ? "#fff" : "none"}
                                strokeWidth={isLatest ? 2 : 0}
                              />
                            )
                          }}
                          activeDot={{ r: 8 }}
                          name="순위"
                          connectNulls={true}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <p className="text-xs md:text-sm text-center text-neutral-500">
                    💡 최근 30일간의 순위 변화를 확인할 수 있습니다
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 추적 추가 모달 - TurboTax Style */}
        <Dialog open={showAddTrackingDialog} onOpenChange={setShowAddTrackingDialog}>
          <DialogContent className="sm:max-w-[500px] rounded-card">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-neutral-900">
                📌 키워드 추적 추가
              </DialogTitle>
              <DialogDescription className="text-sm text-neutral-600">
                선택한 키워드를 추적 목록에 추가하고 자동 수집 및 알림 설정을 구성하세요
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* 선택된 키워드 정보 */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 md:p-4">
                <Label className="text-xs text-neutral-500 mb-1 block">키워드</Label>
                <p className="text-base md:text-lg font-bold text-neutral-900">
                  {selectedKeywordForTracking?.keyword}
                </p>
              </div>

              {/* 수집 주기 */}
              <div>
                <Label htmlFor="frequency-select" className="text-sm font-bold text-neutral-900 mb-2 block">
                  수집 주기
                </Label>
                <Select 
                  value={updateFrequency} 
                  onValueChange={(value) => {
                    const freq = value as 'daily_once' | 'daily_twice' | 'daily_thrice'
                    setUpdateFrequency(freq)
                    if (freq === 'daily_once') {
                      setUpdateTimes([9])
                    } else if (freq === 'daily_twice') {
                      setUpdateTimes([9, 18])
                    } else {
                      setUpdateTimes([9, 14, 20])
                    }
                  }}
                >
                  <SelectTrigger id="frequency-select" className="h-11 border-neutral-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily_once">하루 1회</SelectItem>
                    <SelectItem value="daily_twice">하루 2회</SelectItem>
                    <SelectItem value="daily_thrice">하루 3회</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 수집 시간 */}
              <div>
                <Label className="text-sm font-bold text-neutral-900 mb-2 block">
                  수집 시간
                </Label>
                <div className="space-y-2">
                  {updateTimes.map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-primary-100 text-primary-700 px-2 py-1 w-12 justify-center">
                        {index + 1}차
                      </Badge>
                      <Select
                        value={time.toString()}
                        onValueChange={(value) => {
                          const newTimes = [...updateTimes]
                          newTimes[index] = parseInt(value || '9')
                          setUpdateTimes(newTimes)
                        }}
                      >
                        <SelectTrigger className="h-10 border-neutral-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i}시
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* 순위 알림받기 */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 md:p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label className="text-sm font-bold text-neutral-900">순위 알림받기</Label>
                    <p className="text-xs text-neutral-500 mt-0.5">순위 변동 시 알림을 받습니다</p>
                  </div>
                  <Switch
                    checked={notificationEnabled}
                    onCheckedChange={(checked) => {
                      setNotificationEnabled(checked)
                      if (!checked) {
                        setNotificationType('')
                      }
                    }}
                  />
                </div>

                {notificationEnabled && (
                  <div className="pt-3 border-t border-neutral-200">
                    <Label htmlFor="notification-type" className="text-sm font-medium text-neutral-900 mb-2 block">
                      알림 방법
                    </Label>
                    <Select value={notificationType} onValueChange={(value) => setNotificationType(value as any)}>
                      <SelectTrigger id="notification-type" className="h-10 border-neutral-300">
                        <SelectValue placeholder="알림 방법 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">📧 이메일</SelectItem>
                        <SelectItem value="sms">📱 SMS</SelectItem>
                        <SelectItem value="kakao">💬 카카오톡</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-neutral-500 mt-2">
                      💡 순위 변동 시 선택한 방법으로 알림을 받습니다
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAddTrackingDialog(false)}
                disabled={isAddingTracker}
                className="border-neutral-300"
              >
                취소
              </Button>
              <Button
                onClick={handleSubmitTracking}
                disabled={isAddingTracker}
                className="shadow-button hover:shadow-button-hover active:scale-95 transition-all duration-200"
              >
                {isAddingTracker ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    추가 중...
                  </>
                ) : (
                  '추적 추가'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
