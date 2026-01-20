"use client"

import { useStores } from "@/lib/hooks/useStores"
import { useAuth } from "@/lib/auth-context"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { Loader2, TrendingUp, TrendingDown, Search, Minus, MapPin, Star, X, LineChart as LineChartIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { api } from "@/lib/config"

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
  total_count?: string  // 전체 업체 수 (예: "1,234")
  previous_rank: number | null
  rank_change: number | null
  search_results: SearchResult[]
  // 리뷰수 정보 (비공식 API) ⭐
  visitor_review_count?: number  // 방문자 리뷰 수
  blog_review_count?: number     // 블로그 리뷰 수
  save_count?: number            // 저장 수
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
  const { toast } = useToast()
  const { user } = useAuth()

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
  
  // 구독 tier 및 키워드 제한 ⭐
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free")
  const [keywordLimit, setKeywordLimit] = useState<number>(50) // ⭐ 초기값을 50으로 설정 (로딩 중 표시)
  const [currentKeywordCount, setCurrentKeywordCount] = useState<number>(0)
  const [tierLoaded, setTierLoaded] = useState<boolean>(false) // ⭐ tier 로드 완료 플래그

  // 사용자 구독 tier 로드 (최우선 실행) ⭐
  useEffect(() => {
    const loadUserTier = async () => {
      try {
        if (!user) {
          console.log("⚠️ 사용자 인증 정보가 없습니다")
          setKeywordLimit(1)
          setTierLoaded(true)
          return
        }

        console.log("🔑 사용자 tier 로드 중..., user_id:", user.id)
        
        // 사용자 구독 tier 정보 가져오기 ⭐
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("subscription_tier")
          .eq("id", user.id)
          .single()
        
        console.log("🔍 사용자 데이터:", userData)
        console.log("🔍 에러:", userError)
        
        // users 테이블에 레코드가 없으면 자동 생성 ⭐
        if (userError || !userData) {
          console.log("⚠️ Users 테이블에 레코드가 없습니다. 자동 생성 시도...")
          
          try {
            if (user) {
              const { data: insertedUser, error: insertError } = await supabase
                .from("users")
                .insert({
                  id: user.id,
                  email: user.email,
                  subscription_tier: "pro", // 기본값: pro
                  subscription_status: "active"
                })
                .select()
                .single()
              
              if (!insertError && insertedUser) {
                console.log("✅ Users 테이블 레코드 자동 생성 완료:", insertedUser)
                const tier = "pro"
                setSubscriptionTier(tier)
                setKeywordLimit(50)
                console.log(`✅ 자동 생성: tier=${tier}, limit=50`)
                setTierLoaded(true)
                return
              } else {
                console.log("❌ 레코드 생성 실패:", insertError)
              }
            }
          } catch (createError) {
            console.log("❌ 자동 생성 중 오류:", createError)
          }
          
          // 생성 실패 시 기본값 사용
          console.log("⚠️ 레코드 생성 실패, 기본값(pro) 사용")
          setSubscriptionTier("pro")
          setKeywordLimit(50)
          setTierLoaded(true)
          return
        }
        
        if (userData) {
          const rawTier = userData.subscription_tier
          const tier = rawTier?.toLowerCase()?.trim() || "free"
          
          console.log(`🔍 원본 tier: "${rawTier}"`)
          console.log(`🔍 변환된 tier: "${tier}"`)
          
          setSubscriptionTier(tier)
          
          // tier별 제한 설정
          const limits: Record<string, number> = {
            free: 1,
            basic: 10,
            pro: 50,
            god: 9999  // God tier: 무제한 (커스터마이징 가능)
          }
          
          const limit = limits[tier]
          if (limit !== undefined) {
            setKeywordLimit(limit)
            console.log(`✅ 키워드 제한 설정 완료: ${tier} → ${limit}개`)
          } else {
            console.log(`⚠️ 알 수 없는 tier: ${tier}, 기본값 사용`)
            setKeywordLimit(1)
          }
          
          console.log(`✅ 사용자 구독 tier: ${tier}, 키워드 제한: ${limit || 1}개`)
          console.log(`✅ 가능한 tier 목록:`, Object.keys(limits))
        } else {
          console.log("⚠️ 사용자 데이터를 가져오지 못했습니다. 기본값(free) 사용")
          setSubscriptionTier("free")
          setKeywordLimit(1)
        }
        
        setTierLoaded(true)
      } catch (error) {
        console.error("❌ Tier 로드 실패:", error)
        setKeywordLimit(1)
        setTierLoaded(true)
      }
    }

    if (user) {
      loadUserTier()
    }
  }, [user])

  // 매장 목록 로드 ⭐
  useEffect(() => {
    const loadStores = async () => {
      if (!tierLoaded) {
        console.log("⏳ Tier 로드 대기 중...")
        return // tier가 로드될 때까지 대기
      }
      
      try {
        if (!user) {
          console.log("사용자 인증 정보가 없습니다")
          return
        }

        console.log("📦 매장 목록 로드 중..., user_id:", user.id)
        
        const response = await fetch(api.stores.list(user.id))
        
        if (!response.ok) {
          console.error("매장 목록 조회 실패:", response.status)
          return
        }
        
        const data = await response.json()
        console.log("API 응답:", data)
        
        // 네이버 플레이스만 필터링
        const naverStores = data.stores.filter((s: Store) => s.platform === "naver")
        console.log("네이버 플레이스 매장:", naverStores)
        setStores(naverStores)
        
        if (naverStores.length > 0) {
          setSelectedStoreId("")  // 기본값: 매장 선택 안 함
        } else {
          console.log("네이버 플레이스 매장이 없습니다")
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

    if (hasStores && tierLoaded && user) {
      loadStores()
    }
  }, [hasStores, tierLoaded, user, toast])

  // 선택된 매장의 키워드 목록 로드
  useEffect(() => {
    const loadKeywords = async () => {
      if (!selectedStoreId || !tierLoaded) {
        console.log(`⏳ 키워드 로드 대기 중... (selectedStoreId: ${selectedStoreId}, tierLoaded: ${tierLoaded})`)
        return
      }

      setLoadingKeywords(true)
      try {
        if (!user) return
        
        // 모든 매장의 키워드 개수 계산 (전체 quota) ⭐
        const allStoresResponse = await fetch(api.stores.list(user.id))
        
        if (allStoresResponse.ok) {
          const allStoresData = await allStoresResponse.json()
          const naverStores = allStoresData.stores.filter((s: Store) => s.platform === "naver")
          
          // 모든 매장의 키워드 수 합산
          let totalKeywords = 0
          for (const store of naverStores) {
            const keywordResponse = await fetch(api.naver.keywords(store.id))
            if (keywordResponse.ok) {
              const keywordData = await keywordResponse.json()
              totalKeywords += (keywordData.keywords || []).length
            }
          }
          setCurrentKeywordCount(totalKeywords)
          console.log(`📊 전체 키워드 수: ${totalKeywords}/${keywordLimit} (tier: ${subscriptionTier})`)
        }
        
        // 현재 선택된 매장의 키워드 로드
        const response = await fetch(api.naver.keywords(selectedStoreId))
        
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

    loadKeywords()
  }, [selectedStoreId, keywordLimit, tierLoaded, supabase.auth])

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
      // 비공식 API 방식 (5-10배 빠르고 리뷰수 포함) ⭐
      // 300개 조회를 위해 타임아웃을 60초로 설정
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60초
      
      try {
        const response = await fetch(
          api.naver.checkRank(),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              store_id: selectedStoreId,
              keyword: keyword.trim(),
            }),
            signal: controller.signal,
          }
        )
        
        clearTimeout(timeoutId)

        if (!response.ok) {
          const error = await response.json()
          
          // 키워드 제한 에러 특별 처리 ⭐
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
          total_count: data.total_count,  // 전체 업체 수
          previous_rank: data.previous_rank,
          rank_change: data.rank_change,
          search_results: data.search_results || [],
          // 리뷰수 정보 추가 ⭐
          visitor_review_count: data.visitor_review_count,
          blog_review_count: data.blog_review_count,
          save_count: data.save_count,
        })

        // 키워드 목록 새로고침 및 전체 카운트 업데이트 ⭐
        if (user) {
          // 전체 키워드 수 재계산
          const allStoresResponse = await fetch(api.stores.list(user.id))
          
          if (allStoresResponse.ok) {
            const allStoresData = await allStoresResponse.json()
            const naverStores = allStoresData.stores.filter((s: Store) => s.platform === "naver")
            
            let totalKeywords = 0
            for (const store of naverStores) {
              const keywordResponse = await fetch(api.naver.keywords(store.id))
              if (keywordResponse.ok) {
                const keywordData = await keywordResponse.json()
                totalKeywords += (keywordData.keywords || []).length
              }
            }
            setCurrentKeywordCount(totalKeywords)
          }
        }
        
        const keywordsResponse = await fetch(api.naver.keywords(selectedStoreId))
        if (keywordsResponse.ok) {
          const keywordsData = await keywordsResponse.json()
          setKeywords(keywordsData.keywords || [])
        }

        toast({
          title: data.found ? "순위 조회 완료" : "300위 밖",
          description: data.found 
            ? `현재 순위: ${data.rank}위${data.total_count ? ` (전체 ${data.total_count}개 중)` : ''}`
            : `상위 300개 내에서 매장을 찾을 수 없습니다`,
          variant: data.found ? "default" : "destructive",
        })
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        
        // 타임아웃 에러 처리
        if (fetchError.name === 'AbortError') {
          toast({
            title: "조회 시간 초과",
            description: "순위 조회 시간이 너무 오래 걸립니다. 더 구체적인 키워드로 다시 시도해주세요.",
            variant: "destructive",
          })
        } else {
          throw fetchError
        }
      }
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

  // 기존 키워드 클릭 시 해당 키워드로 조회
  const handleKeywordClick = (kw: string) => {
    setKeyword(kw)
    handleCheckRank()
  }

  // 키워드 순위 히스토리 조회 ⭐
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

  // 키워드 삭제 ⭐
  const handleDeleteKeyword = async (keywordId: string, keywordName: string) => {
    // 경고 메시지 표시
    const confirmed = window.confirm(
      `"${keywordName}" 키워드를 삭제하시겠습니까?\n\n⚠️ 경고: 이 작업은 되돌릴 수 없습니다.\n- 키워드 정보가 영구적으로 삭제됩니다.\n- 과거 순위 기록도 모두 삭제됩니다.\n- 삭제된 데이터는 복구할 수 없습니다.`
    )

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(
        api.naver.deleteKeyword(keywordId),
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error("키워드 삭제에 실패했습니다")
      }

      // 선택된 키워드였다면 차트 닫기
      if (selectedKeywordForChart?.id === keywordId) {
        setSelectedKeywordForChart(null)
        setRankHistory([])
      }

      // 키워드 목록 새로고침 및 전체 카운트 업데이트 ⭐
      if (user) {
        // 전체 키워드 수 재계산
        const allStoresResponse = await fetch(api.stores.list(user.id))
        
        if (allStoresResponse.ok) {
          const allStoresData = await allStoresResponse.json()
          const naverStores = allStoresData.stores.filter((s: Store) => s.platform === "naver")
          
          let totalKeywords = 0
          for (const store of naverStores) {
            const keywordResponse = await fetch(api.naver.keywords(store.id))
            if (keywordResponse.ok) {
              const keywordData = await keywordResponse.json()
              totalKeywords += (keywordData.keywords || []).length
            }
          }
          setCurrentKeywordCount(totalKeywords)
        }
      }
      
      const keywordsResponse = await fetch(api.naver.keywords(selectedStoreId))
      if (keywordsResponse.ok) {
        const keywordsData = await keywordsResponse.json()
        setKeywords(keywordsData.keywords || [])
      }

      toast({
        title: "키워드 삭제 완료",
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">매장 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!hasStores) {
    return <EmptyStoreMessage />
  }

  const selectedStore = stores.find(s => s.id === selectedStoreId)

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
          플레이스 순위 조회
        </h1>
        <p className="text-muted-foreground">
          키워드별 네이버 플레이스 검색 순위를 확인하세요
        </p>
      </div>

      {/* 조회 폼 */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* 매장 선택 */}
          <div>
            <label className="block text-sm font-medium mb-2">매장 선택</label>
            {stores.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-center">
                <p className="text-sm text-yellow-800">
                  네이버 플레이스 매장이 없습니다. 
                  <a href="/dashboard/connect-store" className="underline ml-1 font-medium">
                    매장 등록하기
                  </a>
                </p>
              </div>
            ) : (
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">매장을 선택하세요</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 키워드 입력 */}
          <div>
            <label className="block text-sm font-medium mb-2">검색 키워드</label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예: 강남 카페"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCheckRank()
                  }
                }}
                disabled={isChecking}
              />
              <Button
                onClick={handleCheckRank}
                disabled={isChecking || !selectedStoreId || stores.length === 0}
                className="px-6"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    조회 중...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    순위 확인
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              네이버 지도에서 검색할 키워드를 입력하세요 (최대 300개까지 확인)
            </p>
          </div>
        </div>
      </Card>

      {/* 순위 결과 */}
      {rankResult && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">순위 결과</h2>
          
          {rankResult.found && rankResult.rank ? (
            <div className="space-y-4">
              {/* 순위 및 리뷰 정보 한 줄로 표시 ⭐ */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* 순위 */}
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-green-600 whitespace-nowrap">
                      {rankResult.rank}위
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedStore?.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {rankResult.total_count 
                          ? `전체 ${rankResult.total_count}개 중` 
                          : `상위 ${rankResult.total_results}개 중 확인됨`}
                      </p>
                    </div>
                  </div>

                  {/* 구분선 */}
                  <div className="hidden sm:block w-px h-12 bg-green-300" />

                  {/* 리뷰수 정보 */}
                  <div className="flex flex-wrap gap-4 sm:gap-6 items-center">
                    {/* 방문자 리뷰 */}
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground whitespace-nowrap">방문자 리뷰</div>
                      <div className="text-xl font-bold text-blue-600 whitespace-nowrap">
                        {(rankResult.visitor_review_count || 0).toLocaleString()}개
                      </div>
                    </div>

                    {/* 블로그 리뷰 */}
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground whitespace-nowrap">블로그 리뷰</div>
                      <div className="text-xl font-bold text-purple-600 whitespace-nowrap">
                        {(rankResult.blog_review_count || 0).toLocaleString()}개
                      </div>
                    </div>
                  </div>

                  {/* 순위 변동 */}
                  {rankResult.rank_change !== null && rankResult.rank_change !== 0 && (
                    <div className={`flex items-center gap-1 ml-auto ${
                      rankResult.rank_change > 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {rankResult.rank_change > 0 ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <TrendingDown className="w-5 h-5" />
                      )}
                      <span className="font-semibold">
                        {Math.abs(rankResult.rank_change)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 검색 결과 목록 */}
              <div>
                <h3 className="font-medium mb-3">검색 결과 ({rankResult.search_results.length}개)</h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {rankResult.search_results.map((result, index) => (
                    <div
                      key={result.place_id}
                      className={`p-3 border rounded-lg flex items-center gap-3 ${
                        result.place_id === selectedStore?.place_id
                          ? "bg-green-50 border-green-300"
                          : "bg-white"
                      }`}
                    >
                      {/* 순위 ⭐ */}
                      <div className={`flex flex-col items-center justify-center w-12 flex-shrink-0 ${
                        result.place_id === selectedStore?.place_id
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}>
                        <div className="text-2xl font-bold">
                          {index + 1}
                        </div>
                        <div className="text-xs font-medium">
                          위
                        </div>
                      </div>

                      {/* 썸네일 */}
                      {result.thumbnail && (
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <div className="absolute inset-0 bg-gray-200 rounded animate-pulse" />
                          <img
                            src={result.thumbnail}
                            alt={result.name}
                            className="relative w-12 h-12 rounded object-cover"
                            loading="lazy"
                            onLoad={(e) => {
                              const parent = e.currentTarget.previousElementSibling as HTMLElement
                              if (parent) parent.style.display = 'none'
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      )}

                      {/* 매장 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{result.name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {result.category}
                        </div>
                        <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {result.address}
                        </div>
                      </div>

                      {/* 평점 및 리뷰 수 ⭐ */}
                      {result.review_count && result.review_count > 0 && (
                        <div className="text-sm flex items-center gap-1 flex-shrink-0">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          {/* 평점이 있으면 표시 */}
                          {result.rating && typeof result.rating === 'number' && result.rating > 0 && (
                            <span className="font-medium">{result.rating.toFixed(1)}</span>
                          )}
                          {/* 리뷰수는 항상 표시 */}
                          <span className="text-muted-foreground">
                            ({typeof result.review_count === 'number' ? result.review_count.toLocaleString() : result.review_count})
                          </span>
                        </div>
                      )}

                      {/* 내 매장 표시 */}
                      {result.place_id === selectedStore?.place_id && (
                        <div className="px-2 py-1 bg-green-600 text-white text-xs rounded font-medium">
                          내 매장
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">
                300위 밖
              </div>
              <p className="text-yellow-700 font-medium">
                상위 300개 내에서 매장을 찾을 수 없습니다
              </p>
              <p className="text-sm text-yellow-600 mt-1">
                {rankResult.total_count 
                  ? `전체 ${rankResult.total_count}개 중 300개 확인됨` 
                  : `총 ${rankResult.total_results}개 확인됨`}
              </p>
              <p className="text-sm text-yellow-600 mt-2">
                💡 더 구체적인 키워드로 시도해보세요
              </p>
            </div>
          )}
        </Card>
      )}

      {/* 등록된 키워드 목록 */}
      {keywords.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              등록된 키워드 ({keywords.length})
            </h2>
            <div className={`text-sm font-medium px-3 py-1 rounded-full ${
              currentKeywordCount >= keywordLimit 
                ? "bg-red-100 text-red-700" 
                : currentKeywordCount >= keywordLimit * 0.8
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700"
            }`}>
              전체 {currentKeywordCount}/{keywordLimit}개
            </div>
          </div>
          
          {loadingKeywords ? (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {keywords.map((kw) => (
                <div
                  key={kw.id}
                  className={`p-3 border rounded-lg hover:bg-gray-50 transition-colors relative group ${
                    selectedKeywordForChart?.id === kw.id ? 'ring-2 ring-primary bg-primary/5' : ''
                  }`}
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => {
                      handleViewKeywordHistory(kw)
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{kw.keyword}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(kw.last_checked_at).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                      
                      {/* 현재 순위 */}
                      <div className="text-center flex-shrink-0">
                        <div className="text-xl font-bold text-primary">
                          {kw.current_rank ? `${kw.current_rank}위` : "-"}
                        </div>
                      </div>
                    </div>

                    {/* 순위 변동 */}
                    {kw.rank_change !== null && kw.rank_change !== 0 && (
                      <div className={`flex items-center gap-1 text-sm ${
                        kw.rank_change > 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {kw.rank_change > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : kw.rank_change < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <Minus className="w-3 h-3" />
                        )}
                        <span className="text-xs font-medium">
                          {Math.abs(kw.rank_change)} 변동
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 삭제 버튼 ⭐ */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteKeyword(kw.id, kw.keyword)
                    }}
                    className="absolute top-2 right-2 p-1 rounded-md bg-red-50 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                    title="키워드 삭제"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 순위 히스토리 차트 ⭐ */}
      {selectedKeywordForChart && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LineChartIcon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">
                순위 변화 차트: "{selectedKeywordForChart.keyword}"
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedKeywordForChart(null)
                setRankHistory([])
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {loadingHistory ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">데이터를 불러오는 중...</p>
            </div>
          ) : rankHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">순위 히스토리가 없습니다.</p>
              <p className="text-sm text-muted-foreground mt-1">
                순위를 조회하면 여기에 날짜별 변화가 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 통계 요약 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">현재 순위</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedKeywordForChart.current_rank || '-'}위
                  </p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">측정 횟수 (최근 30일)</p>
                  <p className="text-2xl font-bold text-green-600">
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
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={(() => {
                      if (rankHistory.length === 0) return []
                      
                      // 가장 오래된 데이터 날짜 찾기
                      const dates = rankHistory.map(item => new Date(item.checked_at))
                      const oldestDate = new Date(Math.min(...dates.map(d => d.getTime())))
                      oldestDate.setHours(0, 0, 0, 0)
                      
                      // 가장 오래된 날짜부터 30일 범위 생성
                      const days = []
                      for (let i = 0; i < 30; i++) {
                        const date = new Date(oldestDate)
                        date.setDate(oldestDate.getDate() + i)
                        days.push(date)
                      }
                      
                      // 실제 데이터를 날짜별로 매핑
                      const dataMap = new Map()
                      rankHistory.forEach(item => {
                        const itemDate = new Date(item.checked_at)
                        // 로컬 날짜 기준으로 dateKey 생성
                        const year = itemDate.getFullYear()
                        const month = String(itemDate.getMonth() + 1).padStart(2, '0')
                        const day = String(itemDate.getDate()).padStart(2, '0')
                        const dateKey = `${year}-${month}-${day}`
                        
                        // 같은 날짜에 여러 측정이 있으면 가장 최근 것 사용
                        if (!dataMap.has(dateKey) || new Date(dataMap.get(dateKey).checked_at) < itemDate) {
                          dataMap.set(dateKey, item)
                        }
                      })
                      
                      // 30일치 데이터 생성 (데이터 없는 날은 null)
                      return days.map(date => {
                        // 로컬 날짜 기준으로 dateKey 생성
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
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      reversed={true}
                      label={{ value: '순위', angle: -90, position: 'insideLeft' }}
                      tick={{ fontSize: 12 }}
                      domain={[0, 300]}
                      ticks={[1, 50, 100, 150, 200, 250, 300]}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length && payload[0].payload.fullDate) {
                          return (
                            <div className="bg-white p-3 border rounded-lg shadow-lg">
                              <p className="text-sm font-medium">{payload[0].payload.fullDate}</p>
                              <p className="text-lg font-bold text-primary">
                                {payload[0].value}위
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="rank" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={(props: any) => {
                          if (!props) return <circle r={0} />
                        const { cx, cy, payload } = props
                        if (!payload.rank || !payload.rawDate) return <circle r={0} />
                        
                        // 최신 데이터인지 확인
                        const allData = rankHistory.filter(h => h.rank !== null)
                        if (allData.length === 0) return <circle r={0} />
                        
                        const latestDate = new Date(Math.max(...allData.map(h => new Date(h.checked_at).getTime())))
                        const currentDate = new Date(payload.rawDate)
                        const isLatest = Math.abs(currentDate.getTime() - latestDate.getTime()) < 60000
                        
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isLatest ? 8 : 5}
                            fill={isLatest ? "#ff6b6b" : "#8884d8"}
                            stroke={isLatest ? "#fff" : "none"}
                            strokeWidth={isLatest ? 3 : 0}
                            style={{
                              filter: isLatest ? 'drop-shadow(0px 2px 4px rgba(255, 107, 107, 0.5))' : 'none'
                            }}
                          />
                        )
                      }}
                      activeDot={{ r: 10 }}
                      name="순위"
                      connectNulls={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                💡 하루에 5분만 투자해서 관리하세요
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
