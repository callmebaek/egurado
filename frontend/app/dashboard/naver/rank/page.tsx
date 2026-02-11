"use client"

/**
 * 네이버 플레이스 순위 조회 - TurboTax Style
 * Shadcn UI + 100% 모바일 반응형
 */

import { useStores } from "@/lib/hooks/useStores"
import { useAuth } from "@/lib/auth-context"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { Loader2, TrendingUp, TrendingDown, Search, MapPin, Star, X, Plus, Store as StoreIcon, Clock, Bell, Settings2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
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
import { useCreditConfirm } from "@/lib/hooks/useCreditConfirm"

interface Store {
  id: string
  name: string
  place_id: string
  platform: string
  thumbnail?: string
  category?: string
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
  
  // 구독 tier 및 키워드 제한
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free")
  const [keywordLimit, setKeywordLimit] = useState<number>(50)
  const [currentKeywordCount, setCurrentKeywordCount] = useState<number>(0)
  const [tierLoaded, setTierLoaded] = useState<boolean>(false)
  
  // 추적 추가 모달 상태
  const [showAddTrackingDialog, setShowAddTrackingDialog] = useState(false)
  
  // 크레딧 확인 모달
  const { showCreditConfirm, CreditModal } = useCreditConfirm()
  const [selectedKeywordForTracking, setSelectedKeywordForTracking] = useState<KeywordData | null>(null)
  const [updateFrequency, setUpdateFrequency] = useState<'daily_once' | 'daily_twice'>('daily_once')
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
  const handleCheckRank = () => {
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

    showCreditConfirm({
      featureName: "순위 조회",
      creditAmount: 5,
      onConfirm: () => executeCheckRank(),
    })
  }

  const executeCheckRank = async () => {
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
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      {/* 헤더 섹션 - 홈페이지 스타일 */}
      <header className="mb-8 md:mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
            <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight">
            플레이스 순위 조회
          </h1>
        </div>
        <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-3xl mx-auto mb-4">
          키워드별 네이버 플레이스 검색 순위를 <br className="md:hidden" />
          <span className="hidden md:inline"> </span>실시간으로 확인하세요
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
          <Badge 
            variant="secondary"
            className="bg-blue-100 text-blue-700 border-blue-200 px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            최대 300위까지 조회
          </Badge>
          <Badge 
            variant="secondary"
            className="bg-green-100 text-green-700 border-green-200 px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
          >
            💡 5 크레딧
          </Badge>
        </div>
      </header>

      <div className="space-y-8 md:space-y-10">

        {/* 조회 폼 섹션 */}
        <section>
          <div className="mb-4 md:mb-5">
            <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-1.5 leading-tight">
              순위 조회하기
            </h2>
            <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
              매장과 키워드를 선택하여 현재 순위를 확인하세요
            </p>
          </div>

          <Card className="rounded-xl border-2 border-neutral-300 shadow-md hover:shadow-lg transition-all duration-200">
            <CardContent className="p-5 md:p-6 space-y-5 md:space-y-6">
              {/* 매장 선택 */}
              <div>
                <Label htmlFor="store-select" className="text-sm md:text-base font-bold text-neutral-900 mb-2.5 block flex items-center gap-2">
                  <MapPin className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                  매장 선택
                </Label>
                {stores.length === 0 ? (
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl p-4 md:p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-orange-400 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">⚠️</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm md:text-base font-semibold text-orange-900 mb-1">
                          네이버 플레이스 매장이 없습니다
                        </p>
                        <a 
                          href="/dashboard/connect-store" 
                          className="text-sm text-orange-700 font-bold underline hover:text-orange-900 transition-colors"
                        >
                          매장 등록하러 가기 →
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                    <SelectTrigger 
                      id="store-select"
                      className="h-14 md:h-16 border-2 border-neutral-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200"
                    >
                      {selectedStoreId && stores.find(s => s.id === selectedStoreId) ? (
                        <div className="flex items-center gap-3">
                          {stores.find(s => s.id === selectedStoreId)?.thumbnail ? (
                            <img
                              src={stores.find(s => s.id === selectedStoreId)!.thumbnail}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <StoreIcon className="h-5 w-5 text-blue-600" />
                            </div>
                          )}
                          <span className="text-base md:text-lg font-medium truncate">{stores.find(s => s.id === selectedStoreId)?.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-5 w-5 text-blue-600" />
                          </div>
                          <SelectValue placeholder="매장을 선택하세요" className="text-base md:text-lg" />
                        </div>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id} className="text-base py-2.5">
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
                )}
              </div>

              {/* 키워드 입력 */}
              <div>
                <Label htmlFor="keyword-input" className="text-sm md:text-base font-bold text-neutral-900 mb-2.5 block flex items-center gap-2">
                  <Search className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                  검색 키워드
                </Label>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 md:left-5 top-1/2 transform -translate-y-1/2 text-neutral-400 h-5 w-5 md:h-6 md:w-6 pointer-events-none" />
                    <Input
                      id="keyword-input"
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="예: 강남 카페, 혜화 맛집"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isChecking && selectedStoreId && keyword.trim()) {
                          handleCheckRank()
                        }
                      }}
                      disabled={isChecking}
                      className="h-14 md:h-16 pl-12 md:pl-14 pr-4 text-base md:text-lg border-2 border-neutral-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 font-medium placeholder:text-neutral-400 placeholder:font-normal"
                    />
                  </div>
                  <Button
                    onClick={handleCheckRank}
                    disabled={isChecking || !selectedStoreId || stores.length === 0 || !keyword.trim()}
                    className="h-14 md:h-16 px-8 md:px-10 text-base md:text-lg rounded-xl shadow-button hover:shadow-button-hover active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold whitespace-nowrap touch-target-minimum"
                  >
                    {isChecking ? (
                      <>
                        <Loader2 className="h-5 w-5 md:h-6 md:w-6 mr-2 animate-spin" />
                        조회중...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-5 w-5 md:h-6 md:w-6 mr-2" />
                        순위 확인
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <span className="text-lg flex-shrink-0">💡</span>
                  <p className="text-xs md:text-sm text-blue-700 leading-relaxed">
                    네이버 지도에서 검색할 키워드를 입력하세요. 최대 300위까지 확인 가능합니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 순위 결과 섹션 */}
        {rankResult && (
          <section>
            <Card className="rounded-xl border-2 border-neutral-200 shadow-md overflow-hidden">
              <CardHeader className="bg-neutral-50 border-b border-neutral-200 pb-3 px-4 md:px-5 pt-4 md:pt-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 md:w-9 md:h-9 bg-neutral-700 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <CardTitle className="text-lg md:text-xl font-bold text-neutral-900">
                    순위 결과
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-5">
                {rankResult.found && rankResult.rank ? (
                  <div className="space-y-4 md:space-y-5">
                  {/* 순위 및 리뷰 정보 - 컴팩트 버전 */}
                  <div className="bg-white border-2 border-neutral-200 rounded-xl p-4 md:p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      {/* 왼쪽: 순위 + 매장 정보 */}
                      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                        {/* 순위 (축소) */}
                        <div className="relative flex-shrink-0">
                          <div className="w-14 h-14 md:w-16 md:h-16 bg-green-500 rounded-xl flex items-center justify-center shadow-md">
                            <div className="text-center">
                              <div className="text-2xl md:text-3xl font-extrabold text-white leading-none">
                                {rankResult.rank}
                              </div>
                              <div className="text-[10px] md:text-xs text-white/90 font-semibold">
                                위
                              </div>
                            </div>
                          </div>
                          {/* 순위 변동 배지 */}
                          {rankResult.rank_change !== null && rankResult.rank_change !== 0 && (
                            <div className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5 ${
                              rankResult.rank_change > 0 ? 'bg-blue-500' : 'bg-red-500'
                            }`}>
                              {rankResult.rank_change > 0 ? (
                                <TrendingUp className="w-2.5 h-2.5 text-white" />
                              ) : (
                                <TrendingDown className="w-2.5 h-2.5 text-white" />
                              )}
                              <span className="font-bold text-[10px] text-white">
                                {Math.abs(rankResult.rank_change)}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* 매장 정보 */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base md:text-lg text-neutral-900 mb-0.5 line-clamp-1 leading-tight">
                            {selectedStore?.name}
                          </p>
                          <p className="text-xs md:text-sm text-neutral-500">
                            {rankResult.total_count 
                              ? `전체 ${rankResult.total_count}개 중` 
                              : `상위 ${rankResult.total_results}개 중`}
                          </p>
                        </div>
                      </div>

                      {/* 오른쪽: 리뷰 통계 (인라인) */}
                      <div className="flex items-center gap-4 md:gap-6">
                        {/* 방문자 리뷰 */}
                        <div className="text-center">
                          <p className="text-[10px] md:text-xs text-neutral-500 mb-0.5 font-medium">방문자</p>
                          <p className="text-base md:text-lg font-bold text-neutral-900">
                            {(rankResult.visitor_review_count || 0).toLocaleString()}
                          </p>
                        </div>

                        {/* 구분선 */}
                        <div className="w-px h-8 bg-neutral-200"></div>

                        {/* 블로그 리뷰 */}
                        <div className="text-center">
                          <p className="text-[10px] md:text-xs text-neutral-500 mb-0.5 font-medium">블로그</p>
                          <p className="text-base md:text-lg font-bold text-neutral-900">
                            {(rankResult.blog_review_count || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 검색 결과 목록 */}
                  <div>
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                      <h3 className="text-base md:text-lg font-bold text-neutral-900 flex items-center gap-2">
                        <Search className="w-4 h-4 md:w-5 md:h-5 text-neutral-600" />
                        검색 결과
                      </h3>
                      <Badge variant="secondary" className="bg-neutral-100 text-neutral-700 border-neutral-200 px-2.5 py-1 text-xs font-semibold">
                        {rankResult.search_results.length}개
                      </Badge>
                    </div>
                    <div className="space-y-2 md:space-y-2.5 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                      {rankResult.search_results.map((result, index) => (
                        <div
                          key={result.place_id}
                          className={`p-3 md:p-3.5 rounded-lg border transition-all duration-200 ${
                            result.place_id === selectedStore?.place_id
                              ? 'bg-green-50 border-green-500 shadow-sm'
                              : 'bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 md:gap-3">
                            {/* 순위 번호 (작게) */}
                            <div 
                              className={`flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg font-bold text-sm md:text-base flex-shrink-0 ${
                                result.place_id === selectedStore?.place_id 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              {index + 1}
                            </div>

                            {/* 썸네일 (작게) */}
                            {result.thumbnail ? (
                              <div className="relative w-11 h-11 md:w-12 md:h-12 flex-shrink-0">
                                <img
                                  src={result.thumbnail}
                                  alt={result.name}
                                  className="w-11 h-11 md:w-12 md:h-12 rounded-lg object-cover ring-1 ring-neutral-200"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-11 h-11 md:w-12 md:h-12 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-5 h-5 md:w-6 md:h-6 text-neutral-400" />
                              </div>
                            )}

                            {/* 매장 정보 */}
                            <div className="flex-1 min-w-0">
                              {/* 매장명 + 내 매장 표시 */}
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="font-bold text-sm md:text-base text-neutral-900 line-clamp-1 leading-tight flex-1">
                                  {result.name}
                                  {result.place_id === selectedStore?.place_id && (
                                    <span className="ml-2 text-xs font-semibold text-green-600">✓ 내 매장</span>
                                  )}
                                </p>
                              </div>
                              
                              <p className="text-[11px] md:text-xs text-neutral-500 mb-1 font-medium">
                                {result.category}
                              </p>
                              
                              {/* 평점 및 리뷰 */}
                              {result.review_count && result.review_count > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-yellow-500 text-yellow-500 flex-shrink-0" />
                                  {result.rating && typeof result.rating === 'number' && result.rating > 0 && (
                                    <span className="text-xs md:text-sm font-bold text-neutral-900">
                                      {result.rating.toFixed(1)}
                                    </span>
                                  )}
                                  <span className="text-[11px] md:text-xs text-neutral-500">
                                    리뷰 {typeof result.review_count === 'number' ? result.review_count.toLocaleString() : result.review_count}
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
                <div className="bg-white border-2 border-neutral-200 rounded-xl p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col items-center gap-4 max-w-lg mx-auto">
                    {/* 아이콘 */}
                    <div className="w-16 h-16 md:w-18 md:h-18 bg-neutral-100 rounded-xl flex items-center justify-center">
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
                    <div className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-3 md:p-4">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-lg">📊</span>
                        <p className="text-xs md:text-sm text-neutral-700 font-medium">
                          {rankResult.total_count 
                            ? `전체 ${rankResult.total_count}개 중 300개 확인됨` 
                            : `총 ${rankResult.total_results}개 확인됨`}
                        </p>
                      </div>
                    </div>
                    
                    {/* 제안 */}
                    <div className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-3 md:p-4">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 bg-neutral-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-base">💡</span>
                        </div>
                        <div>
                          <p className="text-xs md:text-sm font-bold text-neutral-900 mb-1">
                            검색 팁
                          </p>
                          <p className="text-xs text-neutral-600 leading-relaxed">
                            더 구체적인 지역명이나 업종을 포함한 키워드로 다시 시도해보세요.<br />
                            예: "강남 카페" → "강남역 카페" 또는 "강남 디저트 카페"
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* 조회한 키워드 목록 - TurboTax Style Table */}
        {keywords.length > 0 && (
          <section>
            <div className="mb-4 md:mb-5">
              <h2 className="text-lg md:text-xl font-bold text-neutral-900 mb-1.5 leading-tight">
                조회한 키워드 목록
              </h2>
              <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
                최근 조회한 {keywords.length}개의 키워드를 관리하고 추적하세요
              </p>
            </div>

          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-primary-50 border-b-2 border-primary-200 pb-4 px-5 md:px-6 pt-5 md:pt-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-500 rounded-xl flex items-center justify-center shadow-md">
                    <Search className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg md:text-xl font-bold text-neutral-900">
                      키워드 관리
                    </CardTitle>
                    <p className="text-xs md:text-sm text-neutral-600 mt-0.5">
                      {keywords.length}개 등록됨
                    </p>
                  </div>
                </div>
                <Badge 
                  variant="secondary"
                  className="bg-primary-100 text-primary-700 border-primary-200 px-3 py-1.5 text-xs font-semibold"
                >
                  💡 최근 30개만 표시
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingKeywords ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 md:h-12 md:w-12 animate-spin text-primary-500" />
                    <p className="text-sm md:text-base text-neutral-600 font-medium">키워드 불러오는 중...</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-50 to-primary-50 border-b-2 border-primary-100">
                          <th className="px-2 md:px-4 py-3.5 md:py-4 text-left text-xs md:text-sm font-extrabold text-neutral-900">
                            키워드
                          </th>
                          <th className="px-2 md:px-3 py-3.5 md:py-4 text-center text-xs md:text-sm font-extrabold text-neutral-900 w-20 md:w-24">
                            현재 순위
                          </th>
                          <th className="hidden sm:table-cell px-2 md:px-3 py-3.5 md:py-4 text-center text-xs md:text-sm font-extrabold text-neutral-900 w-24">
                            전체 업체
                          </th>
                          <th className="hidden md:table-cell px-2 md:px-3 py-3.5 md:py-4 text-center text-xs md:text-sm font-extrabold text-neutral-900 w-28">
                            최근 조회
                          </th>
                          <th className="px-2 py-3.5 md:py-4 text-center text-xs md:text-sm font-extrabold text-neutral-900 w-20 md:w-24">
                            추적
                          </th>
                          <th className="px-2 py-3.5 md:py-4 text-center text-xs md:text-sm font-extrabold text-neutral-900 w-14 md:w-16">
                            삭제
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 bg-white">
                        {keywords.map((kw, index) => (
                          <tr 
                            key={kw.id}
                            className="hover:bg-primary-50/30 transition-colors duration-150"
                          >
                            <td className="px-2 md:px-4 py-3.5 md:py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-400 font-medium flex-shrink-0 w-4">{index + 1}</span>
                                <div className="font-bold text-sm md:text-base text-neutral-900 break-words leading-tight">{kw.keyword}</div>
                              </div>
                            </td>
                            <td className="px-2 md:px-3 py-3.5 md:py-4 text-center">
                              {kw.current_rank ? (
                                <span className="text-base md:text-lg font-extrabold text-success">
                                  {kw.current_rank}<span className="text-sm font-semibold text-neutral-600">위</span>
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-warning">
                                  300위 밖
                                </span>
                              )}
                            </td>
                            <td className="hidden sm:table-cell px-2 md:px-3 py-3.5 md:py-4 text-center">
                              <span className="text-sm md:text-base text-neutral-700 font-medium">
                                {kw.total_results && kw.total_results > 0 ? `${kw.total_results.toLocaleString()}개` : (
                                  <span className="text-neutral-400">-</span>
                                )}
                              </span>
                            </td>
                            <td className="hidden md:table-cell px-2 md:px-3 py-3.5 md:py-4 text-center">
                              <span className="text-xs md:text-sm text-neutral-600 font-medium">
                                {new Date(kw.last_checked_at).toLocaleDateString('ko-KR', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </td>
                            <td className="px-2 py-3.5 md:py-4 text-center">
                              {kw.is_tracked ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300 text-xs px-2.5 py-1.5 whitespace-nowrap font-semibold">
                                  ✓ 추적중
                                </Badge>
                              ) : (
                                <Button
                                  onClick={() => handleAddTracking(kw)}
                                  size="sm"
                                  className="h-8 px-2.5 text-xs bg-primary-500 text-white border-0 hover:bg-primary-600 hover:shadow-lg active:scale-95 transition-all duration-200 font-semibold whitespace-nowrap shadow-md group"
                                >
                                  <Plus className="w-3 h-3 mr-1 group-hover:rotate-90 transition-transform duration-200" />
                                  추적
                                </Button>
                              )}
                            </td>
                            <td className="px-2 py-3.5 md:py-4 text-center">
                              <button
                                onClick={() => handleDeleteKeyword(kw.id, kw.keyword)}
                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 bg-red-100 text-red-600 hover:bg-red-200 hover:shadow-md active:scale-95"
                                title="키워드 삭제"
                              >
                                <X className="w-4 h-4" />
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
          </section>
        )}

        {/* 추적 추가 모달 - 지표 모달 스타일 */}
        <Dialog open={showAddTrackingDialog} onOpenChange={setShowAddTrackingDialog}>
          <DialogContent className="w-[calc(100vw-32px)] sm:w-full sm:max-w-lg max-h-[calc(100vh-32px)] sm:max-h-[85vh] overflow-hidden bg-white border-2 border-neutral-200 shadow-modal rounded-modal flex flex-col p-0">
            {/* 헤더 - 지표 모달 스타일 */}
            <DialogHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-3 border-b border-neutral-200 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 md:w-10 md:h-10 bg-[#405D99] rounded-button flex items-center justify-center shadow-sm flex-shrink-0">
                  <Plus className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base md:text-lg font-bold text-neutral-900 truncate">
                    키워드 추적 추가
                  </DialogTitle>
                  <DialogDescription className="text-xs md:text-sm text-neutral-600 truncate">
                    {selectedStore?.name || '매장'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* 본문 - 스크롤 가능 영역 */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
              <div className="space-y-4">
                {/* 선택된 키워드 정보 카드 */}
                <div className="bg-neutral-50 rounded-card p-3 md:p-4 border border-neutral-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Search className="w-3.5 h-3.5 text-[#405D99]" />
                    <span className="text-[10px] md:text-xs text-neutral-500 font-bold">선택한 키워드</span>
                  </div>
                  <p className="text-base md:text-lg font-bold text-neutral-900">
                    {selectedKeywordForTracking?.keyword}
                  </p>
                  {selectedKeywordForTracking?.current_rank && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-neutral-500">현재 순위</span>
                      <span className="text-sm font-bold text-emerald-600">{selectedKeywordForTracking.current_rank}위</span>
                    </div>
                  )}
                </div>

                {/* 수집 주기 */}
                <div className="bg-neutral-50 rounded-card p-3 md:p-4 border border-neutral-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings2 className="w-3.5 h-3.5 text-[#405D99]" />
                    <span className="text-xs md:text-sm font-bold text-neutral-900">수집 주기</span>
                  </div>
                  <Select 
                    value={updateFrequency} 
                    onValueChange={(value) => {
                      const freq = value as 'daily_once' | 'daily_twice'
                      setUpdateFrequency(freq)
                      if (freq === 'daily_once') {
                        setUpdateTimes([9])
                      } else {
                        setUpdateTimes([9, 18])
                      }
                    }}
                  >
                    <SelectTrigger className="h-11 border border-neutral-300 rounded-button focus:border-[#405D99] focus:ring-2 focus:ring-[#405D99]/20 transition-all duration-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily_once">하루 1회</SelectItem>
                      <SelectItem value="daily_twice">하루 2회</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 수집 시간 */}
                <div className="bg-neutral-50 rounded-card p-3 md:p-4 border border-neutral-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-3.5 h-3.5 text-[#405D99]" />
                    <span className="text-xs md:text-sm font-bold text-neutral-900">수집 시간</span>
                  </div>
                  <div className="space-y-2.5">
                    {updateTimes.map((time, index) => (
                      <div key={index} className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-[#405D99] bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1 flex-shrink-0 min-w-[40px] text-center">
                          {index + 1}차
                        </span>
                        <Select
                          value={time.toString()}
                          onValueChange={(value) => {
                            const newTimes = [...updateTimes]
                            newTimes[index] = parseInt(value || '9')
                            setUpdateTimes(newTimes)
                          }}
                        >
                          <SelectTrigger className="h-10 border border-neutral-300 rounded-button focus:border-[#405D99] focus:ring-2 focus:ring-[#405D99]/20 transition-all duration-200 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                {String(i).padStart(2, '0')}:00
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 순위 알림받기 */}
                <div className="bg-neutral-50 rounded-card p-3 md:p-4 border border-neutral-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-[#405D99]" />
                      <span className="text-xs md:text-sm font-bold text-neutral-900">순위 알림받기</span>
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
                  <p className="text-[10px] md:text-xs text-neutral-500 mb-2 ml-[22px]">순위 변동 시 알림을 받습니다</p>

                  {notificationEnabled && (
                    <div className="pt-3 border-t border-neutral-200 mt-3">
                      <label className="text-xs font-bold text-neutral-700 mb-2 block">알림 방법</label>
                      <Select value={notificationType} onValueChange={(value) => setNotificationType(value as any)}>
                        <SelectTrigger className="h-10 border border-neutral-300 rounded-button focus:border-[#405D99] focus:ring-2 focus:ring-[#405D99]/20 transition-all duration-200 bg-white">
                          <SelectValue placeholder="알림 방법 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">📧 이메일</SelectItem>
                          <SelectItem value="sms">📱 SMS</SelectItem>
                          <SelectItem value="kakao">💬 카카오톡</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 푸터 - 지표 모달 스타일 */}
            <div className="px-4 md:px-6 py-3 md:py-4 border-t border-neutral-200 flex-shrink-0">
              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={() => setShowAddTrackingDialog(false)}
                  disabled={isAddingTracker}
                  className="h-10 md:h-11 px-5 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 disabled:opacity-50 rounded-button transition-all duration-200 touch-manipulation"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmitTracking}
                  disabled={isAddingTracker}
                  className="h-10 md:h-11 px-5 text-sm font-semibold text-white bg-[#405D99] hover:bg-[#2E4577] active:bg-[#1A2B52] disabled:bg-neutral-300 disabled:text-neutral-500 rounded-button shadow-sm hover:shadow-md transition-all duration-200 touch-manipulation flex items-center gap-2"
                >
                  {isAddingTracker ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      추가 중...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      추적 추가
                    </>
                  )}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      {/* 크레딧 차감 확인 모달 */}
      {CreditModal}
      </div>
    </div>
  )
}
