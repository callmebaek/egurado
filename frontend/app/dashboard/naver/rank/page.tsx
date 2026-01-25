"use client"

/**
 * 플레이스 순위조회 - Stripe Style Premium Design
 * Mantine UI + 100% 반응형 + 브랜드 컬러 (#407645, #635bff)
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
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Button,
  TextInput,
  Select,
  Badge,
  Table,
  Modal,
  Switch,
  Loader,
  ActionIcon,
  Card,
  Grid,
  Progress,
  Tooltip as MantineTooltip,
  rem,
  Box,
  Divider,
  ThemeIcon,
  Flex,
  NumberInput,
  Center,
  Alert,
} from '@mantine/core'

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
  
  // 구독 tier 및 키워드 제한 ⭐
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free")
  const [keywordLimit, setKeywordLimit] = useState<number>(50) // ⭐ 초기값을 50으로 설정 (로딩 중 표시)
  const [currentKeywordCount, setCurrentKeywordCount] = useState<number>(0)
  const [tierLoaded, setTierLoaded] = useState<boolean>(false) // ⭐ tier 로드 완료 플래그
  
  // 추적 추가 모달 상태
  const [showAddTrackingDialog, setShowAddTrackingDialog] = useState(false)
  const [selectedKeywordForTracking, setSelectedKeywordForTracking] = useState<KeywordData | null>(null)
  const [updateFrequency, setUpdateFrequency] = useState<'daily_once' | 'daily_twice' | 'daily_thrice'>('daily_once')
  const [updateTimes, setUpdateTimes] = useState<number[]>([9])
  const [notificationEnabled, setNotificationEnabled] = useState(false)
  const [notificationType, setNotificationType] = useState<'email' | 'sms' | 'kakao' | ''>('')
  const [isAddingTracker, setIsAddingTracker] = useState(false)

  // 사용자 구독 tier 로드 (최우선 실행) ⭐
  useEffect(() => {
    const loadUserTier = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
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
            const { data: authUser } = await supabase.auth.getUser()
            if (authUser && authUser.user) {
              const { data: insertedUser, error: insertError } = await supabase
                .from("users")
                .insert({
                  id: authUser.user.id,
                  email: authUser.user.email,
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
            pro: 50
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

    loadUserTier()
  }, [supabase.auth])

  // 매장 목록 로드 ⭐
  useEffect(() => {
    const loadStores = async () => {
      if (!tierLoaded) {
        console.log("⏳ Tier 로드 대기 중...")
        return // tier가 로드될 때까지 대기
      }
      
      try {
        const token = getToken()
        if (!token) {
          console.log("사용자 인증 정보가 없습니다")
          return
        }

        console.log("📦 매장 목록 로드 중...")
        
        const response = await fetch(api.stores.list(), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
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
          setSelectedStoreId(naverStores[0].id)
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

    if (hasStores && tierLoaded) {
      loadStores()
    }
  }, [hasStores, tierLoaded, getToken, toast])

  // 키워드 목록 로드 함수 (외부에서도 호출 가능)
  const loadKeywords = async (storeId?: string) => {
    const targetStoreId = storeId || selectedStoreId
    
    if (!targetStoreId || !tierLoaded) {
      console.log(`⏳ 키워드 로드 대기 중... (targetStoreId: ${targetStoreId}, tierLoaded: ${tierLoaded})`)
      return
    }

    setLoadingKeywords(true)
    try {
      const token = getToken()
      if (!token) return
      
      // 모든 매장의 키워드 개수 계산 (전체 quota) ⭐
      const allStoresResponse = await fetch(api.stores.list(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
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
      const response = await fetch(api.naver.keywords(targetStoreId))
      
      if (response.ok) {
        const data = await response.json()
        console.log("[loadKeywords] API Response:", data.keywords)
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
    loadKeywords()
  }, [selectedStoreId, keywordLimit, tierLoaded])

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
        }
      )

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

      // 키워드 목록 새로고침
      await loadKeywords(selectedStoreId)
      
      // 방금 조회한 키워드의 total_count를 total_results로 즉시 업데이트
      if (data.total_count && keyword) {
        // total_count를 숫자로 변환 (문자열 "1,638" → 1638)
        let totalResultsNum = 0
        if (typeof data.total_count === 'string') {
          totalResultsNum = parseInt(data.total_count.replace(/,/g, ''), 10) || 0
        } else if (typeof data.total_count === 'number') {
          totalResultsNum = data.total_count
        }
        
        console.log("[순위조회] total_count 업데이트:", data.total_count, "→", totalResultsNum, "키워드:", keyword.trim())
        
        setKeywords(prevKeywords => 
          prevKeywords.map(kw => 
            kw.keyword === keyword.trim() ? { 
              ...kw, 
              total_results: totalResultsNum
            } : kw
          )
        )
      }

      // 키워드 목록 새로고침 및 전체 카운트 업데이트 ⭐
      const { data: { user } } = await supabase.auth.getUser()
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
      
      // 키워드 목록 새로고침
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
      console.log("[DELETE] 키워드 삭제 시작:", keywordId)
      
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

      console.log("[DELETE] 응답 상태:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[DELETE] 에러 응답:", errorText)
        throw new Error(`키워드 삭제에 실패했습니다 (${response.status})`)
      }

      const result = await response.json()
      console.log("[DELETE] 삭제 성공:", result)

      // 선택된 키워드였다면 차트 닫기
      if (selectedKeywordForChart?.id === keywordId) {
        setSelectedKeywordForChart(null)
        setRankHistory([])
      }

      // 키워드 목록 새로고침
      console.log("[DELETE] 키워드 목록 새로고침 시작, selectedStoreId:", selectedStoreId)
      if (selectedStoreId) {
        await loadKeywords(selectedStoreId)
        console.log("[DELETE] 키워드 목록 새로고침 완료")
      } else {
        console.error("[DELETE] selectedStoreId가 없습니다!")
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
      <Container size="xl" py="xl">
        <Center style={{ minHeight: '60vh' }}>
          <Stack align="center" gap="md">
            <Loader size="xl" color="brand" />
            <Text c="dimmed" size="sm">매장 정보를 불러오는 중...</Text>
          </Stack>
        </Center>
      </Container>
    )
  }

  if (!hasStores) {
    return <EmptyStoreMessage />
  }

  const selectedStore = stores.find(s => s.id === selectedStoreId)

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* 헤더 - Stripe Style */}
        <Box>
          <Group justify="space-between" align="flex-start" mb="xs">
            <div>
              <Title order={1} size="h1" fw={600} mb="xs" style={{ 
                background: 'linear-gradient(135deg, #635bff 0%, #407645 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                플레이스 순위 조회
              </Title>
              <Text c="dimmed" size="md">
                키워드별 네이버 플레이스 검색 순위를 실시간으로 확인하세요
              </Text>
            </div>
            <Badge 
              size="lg" 
              variant="gradient" 
              gradient={{ from: 'brand', to: 'green', deg: 135 }}
              style={{ textTransform: 'none' }}
            >
              최대 300위까지 조회
            </Badge>
          </Group>
        </Box>

        {/* 조회 폼 - Stripe Style Premium Card */}
        <Paper 
          shadow="md" 
          p="xl" 
          radius="lg"
          style={{
            border: '1px solid #e0e7ff',
            background: 'linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%)'
          }}
        >
          <Stack gap="lg">
            {/* 매장 선택 */}
            <div>
              <Text size="sm" fw={500} mb="xs" c="gray.7">
                매장 선택
              </Text>
              {stores.length === 0 ? (
                <Alert color="yellow" variant="light" radius="md">
                  <Text size="sm">
                    네이버 플레이스 매장이 없습니다.{' '}
                    <Text component="a" href="/dashboard/connect-store" fw={600} td="underline" c="yellow.8">
                      매장 등록하기
                    </Text>
                  </Text>
                </Alert>
              ) : (
                <Select
                  size="md"
                  value={selectedStoreId}
                  onChange={(value) => setSelectedStoreId(value || '')}
                  data={stores.map((store) => ({
                    value: store.id,
                    label: store.name
                  }))}
                  placeholder="매장을 선택하세요"
                  leftSection={<MapPin size={16} />}
                  styles={{
                    input: {
                      borderColor: '#e0e7ff',
                      '&:focus': {
                        borderColor: '#635bff',
                      }
                    }
                  }}
                />
              )}
            </div>

            {/* 키워드 입력 */}
            <div>
              <Text size="sm" fw={500} mb="xs" c="gray.7">
                검색 키워드
              </Text>
              <Group gap="sm" align="flex-start">
                <TextInput
                  size="md"
                  flex={1}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="예: 강남 카페"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCheckRank()
                    }
                  }}
                  disabled={isChecking}
                  leftSection={<Search size={16} />}
                  styles={{
                    input: {
                      borderColor: '#e0e7ff',
                      '&:focus': {
                        borderColor: '#635bff',
                      }
                    }
                  }}
                />
                <Button
                  size="md"
                  onClick={handleCheckRank}
                  disabled={isChecking || !selectedStoreId || stores.length === 0}
                  leftSection={isChecking ? <Loader size={16} color="white" /> : <Search size={16} />}
                  variant="gradient"
                  gradient={{ from: 'brand', to: 'brand.7', deg: 135 }}
                  style={{ 
                    minWidth: '140px',
                    boxShadow: '0 4px 12px rgba(99, 91, 255, 0.25)'
                  }}
                >
                  {isChecking ? '조회 중...' : '순위 확인'}
                </Button>
              </Group>
              <Text size="xs" c="dimmed" mt="xs">
                네이버 지도에서 검색할 키워드를 입력하세요 (최대 300개까지 확인)
              </Text>
            </div>
          </Stack>
        </Paper>

      {/* 순위 결과 - Stripe Style */}
      {rankResult && (
        <Paper 
          shadow="lg" 
          p="xl" 
          radius="lg"
          style={{
            border: '1px solid #e0e7ff',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
          }}
        >
          <Title order={2} size="h3" fw={600} mb="lg">
            순위 결과
          </Title>
          
          {rankResult.found && rankResult.rank ? (
            <Stack gap="lg">
              {/* 순위 및 리뷰 정보 - Premium Card */}
              <Paper
                p="xl"
                radius="md"
                style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  border: '2px solid #86efac'
                }}
              >
                <Grid gutter="xl">
                  {/* 순위 정보 */}
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <Stack gap="xs">
                      <Group gap="md" align="center">
                        <ThemeIcon
                          size={64}
                          radius="md"
                          variant="gradient"
                          gradient={{ from: 'green.4', to: 'green.6', deg: 135 }}
                        >
                          <Text size="2xl" fw={700} c="white">
                            {rankResult.rank}
                          </Text>
                        </ThemeIcon>
                        <div>
                          <Text fw={600} size="lg" c="green.9">
                            {selectedStore?.name}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {rankResult.total_count 
                              ? `전체 ${rankResult.total_count}개 중` 
                              : `상위 ${rankResult.total_results}개 중`}
                          </Text>
                        </div>
                      </Group>
                    </Stack>
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 8 }}>
                    <Grid gutter="md">
                      {/* 방문자 리뷰 */}
                      <Grid.Col span={{ base: 6, sm: 4 }}>
                        <Paper p="md" radius="md" bg="white" style={{ border: '1px solid #e0e7ff' }}>
                          <Stack gap={4}>
                            <Text size="xs" c="dimmed" fw={500}>방문자 리뷰</Text>
                            <Text size="xl" fw={700} c="blue.6">
                              {(rankResult.visitor_review_count || 0).toLocaleString()}
                            </Text>
                          </Stack>
                        </Paper>
                      </Grid.Col>

                      {/* 블로그 리뷰 */}
                      <Grid.Col span={{ base: 6, sm: 4 }}>
                        <Paper p="md" radius="md" bg="white" style={{ border: '1px solid #e0e7ff' }}>
                          <Stack gap={4}>
                            <Text size="xs" c="dimmed" fw={500}>블로그 리뷰</Text>
                            <Text size="xl" fw={700} c="violet.6">
                              {(rankResult.blog_review_count || 0).toLocaleString()}
                            </Text>
                          </Stack>
                        </Paper>
                      </Grid.Col>

                      {/* 순위 변동 */}
                      {rankResult.rank_change !== null && rankResult.rank_change !== 0 && (
                        <Grid.Col span={{ base: 12, sm: 4 }}>
                          <Paper 
                            p="md" 
                            radius="md" 
                            bg={rankResult.rank_change > 0 ? 'green.0' : 'red.0'}
                            style={{ border: `1px solid ${rankResult.rank_change > 0 ? '#86efac' : '#fca5a5'}` }}
                          >
                            <Stack gap={4}>
                              <Text size="xs" c="dimmed" fw={500}>순위 변동</Text>
                              <Group gap="xs">
                                {rankResult.rank_change > 0 ? (
                                  <TrendingUp size={24} color="#16a34a" />
                                ) : (
                                  <TrendingDown size={24} color="#dc2626" />
                                )}
                                <Text size="xl" fw={700} c={rankResult.rank_change > 0 ? 'green.7' : 'red.7'}>
                                  {Math.abs(rankResult.rank_change)}
                                </Text>
                              </Group>
                            </Stack>
                          </Paper>
                        </Grid.Col>
                      )}
                    </Grid>
                  </Grid.Col>
                </Grid>
              </Paper>

              {/* 검색 결과 목록 - Stripe Style */}
              <div>
                <Group justify="space-between" mb="md">
                  <Text fw={600} size="lg">검색 결과</Text>
                  <Badge size="lg" variant="light" color="brand">
                    {rankResult.search_results.length}개 확인
                  </Badge>
                </Group>
                <Stack gap="sm" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {rankResult.search_results.map((result, index) => (
                    <Paper
                      key={result.place_id}
                      p="md"
                      radius="md"
                      style={{
                        background: result.place_id === selectedStore?.place_id
                          ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                          : 'white',
                        border: result.place_id === selectedStore?.place_id
                          ? '2px solid #86efac'
                          : '1px solid #e5e7eb'
                      }}
                    >
                      <Group gap="md" wrap="nowrap">
                        {/* 순위 Badge */}
                        <ThemeIcon
                          size={48}
                          radius="md"
                          variant={result.place_id === selectedStore?.place_id ? 'gradient' : 'light'}
                          gradient={{ from: 'green.4', to: 'green.6', deg: 135 }}
                          color={result.place_id === selectedStore?.place_id ? undefined : 'gray'}
                        >
                          <Stack gap={0} align="center">
                            <Text size="xl" fw={700}>
                              {index + 1}
                            </Text>
                            <Text size="xs">위</Text>
                          </Stack>
                        </ThemeIcon>

                        {/* 썸네일 */}
                        {result.thumbnail && (
                          <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
                            <img
                              src={result.thumbnail}
                              alt={result.name}
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: 8,
                                objectFit: 'cover'
                              }}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                        )}

                        {/* 매장 정보 */}
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={600} size="sm" truncate="end">
                            {result.name}
                          </Text>
                          <Text size="xs" c="dimmed" truncate="end">
                            {result.category}
                          </Text>
                          <Group gap={4} mt={2}>
                            <MapPin size={12} color="#9ca3af" />
                            <Text size="xs" c="dimmed" truncate="end">
                              {result.address}
                            </Text>
                          </Group>
                        </Box>

                        {/* 평점 및 리뷰 */}
                        {result.review_count && result.review_count > 0 && (
                          <Group gap={4} style={{ flexShrink: 0 }}>
                            <Star size={16} fill="#fbbf24" color="#fbbf24" />
                            {result.rating && typeof result.rating === 'number' && result.rating > 0 && (
                              <Text size="sm" fw={600}>
                                {result.rating.toFixed(1)}
                              </Text>
                            )}
                            <Text size="sm" c="dimmed">
                              ({typeof result.review_count === 'number' ? result.review_count.toLocaleString() : result.review_count})
                            </Text>
                          </Group>
                        )}

                        {/* 내 매장 Badge */}
                        {result.place_id === selectedStore?.place_id && (
                          <Badge variant="gradient" gradient={{ from: 'green', to: 'teal', deg: 135 }}>
                            내 매장
                          </Badge>
                        )}
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </div>
            </Stack>
          ) : (
            <Paper
              p="xl"
              radius="md"
              style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
                border: '2px solid #fbbf24',
                textAlign: 'center'
              }}
            >
              <Stack align="center" gap="md">
                <ThemeIcon size={64} radius="md" variant="light" color="yellow">
                  <Text size="2xl" fw={700}>
                    300+
                  </Text>
                </ThemeIcon>
                <div>
                  <Text size="xl" fw={700} c="yellow.9" mb="xs">
                    300위 밖
                  </Text>
                  <Text c="yellow.8" fw={500}>
                    상위 300개 내에서 매장을 찾을 수 없습니다
                  </Text>
                  <Text size="sm" c="yellow.7" mt="xs">
                    {rankResult.total_count 
                      ? `전체 ${rankResult.total_count}개 중 300개 확인됨` 
                      : `총 ${rankResult.total_results}개 확인됨`}
                  </Text>
                  <Text size="sm" c="yellow.7" mt="md" fw={500}>
                    💡 더 구체적인 키워드로 시도해보세요
                  </Text>
                </div>
              </Stack>
            </Paper>
          )}
        </Paper>
      )}

      {/* 조회한 키워드 목록 - Stripe Style Premium Table */}
      {keywords.length > 0 && (
        <Paper 
          shadow="md" 
          p="xl" 
          radius="lg"
          style={{
            border: '1px solid #e0e7ff',
            background: 'white'
          }}
        >
          <Group justify="space-between" mb="lg">
            <div>
              <Title order={2} size="h3" fw={600}>
                조회한 키워드
              </Title>
              <Text size="sm" c="dimmed">
                최근 조회한 {keywords.length}개의 키워드
              </Text>
            </div>
            <Badge 
              size="lg" 
              variant="light" 
              color="gray"
              leftSection={<span>💡</span>}
              style={{ textTransform: 'none' }}
            >
              최근 30개만 표시
            </Badge>
          </Group>
          
          {loadingKeywords ? (
            <Center py="xl">
              <Loader size="lg" color="brand" />
            </Center>
          ) : (
            <Box style={{ overflowX: 'auto' }}>
              <Table 
                striped 
                highlightOnHover 
                withTableBorder
                withColumnBorders
                style={{
                  borderRadius: 8,
                  overflow: 'hidden'
                }}
              >
                <Table.Thead style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                  <Table.Tr>
                    <Table.Th style={{ fontWeight: 600 }}>키워드</Table.Th>
                    <Table.Th ta="center" style={{ fontWeight: 600 }}>현재 순위</Table.Th>
                    <Table.Th ta="center" style={{ fontWeight: 600 }}>전체 업체 수</Table.Th>
                    <Table.Th ta="center" style={{ fontWeight: 600 }}>최근 조회</Table.Th>
                    <Table.Th ta="center" style={{ fontWeight: 600 }}>추적</Table.Th>
                    <Table.Th ta="center" style={{ fontWeight: 600 }}>삭제</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {keywords.map((kw) => (
                    <Table.Tr key={kw.id}>
                      <Table.Td>
                        <Text fw={600} size="sm">{kw.keyword}</Text>
                      </Table.Td>
                      <Table.Td ta="center">
                        {kw.current_rank ? (
                          <Badge size="lg" variant="gradient" gradient={{ from: 'brand', to: 'brand.7', deg: 135 }}>
                            {kw.current_rank}위
                          </Badge>
                        ) : (
                          <Badge size="lg" color="yellow">
                            300위권 밖
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td ta="center">
                        <Text c="dimmed" size="sm">
                          {kw.total_results && kw.total_results > 0 ? `${kw.total_results.toLocaleString()}개` : "-"}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Text c="dimmed" size="xs">
                          {new Date(kw.last_checked_at).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="center">
                        {kw.is_tracked ? (
                          <Badge size="md" color="green" variant="light">
                            추적중
                          </Badge>
                        ) : (
                          <Button
                            size="xs"
                            variant="light"
                            color="brand"
                            onClick={() => handleAddTracking(kw)}
                          >
                            추적하기
                          </Button>
                        )}
                      </Table.Td>
                      <Table.Td ta="center">
                        <ActionIcon
                          variant="light"
                          color="red"
                          size="md"
                          onClick={() => handleDeleteKeyword(kw.id, kw.keyword)}
                          title="키워드 삭제"
                        >
                          <X size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          )}
        </Paper>
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
                        const { cx, cy, payload } = props
                        if (!payload.rank || !payload.rawDate) return null
                        
                        // 최신 데이터인지 확인
                        const allData = rankHistory.filter(h => h.rank !== null)
                        if (allData.length === 0) return null
                        
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

      {/* 추적 추가 모달 */}
      {/* 추적 추가 모달 - Stripe Style */}
      <Modal
        opened={showAddTrackingDialog}
        onClose={() => setShowAddTrackingDialog(false)}
        title={
          <Group gap="xs">
            <Text size="xl" fw={600}>📌 키워드 추적 추가</Text>
          </Group>
        }
        size="lg"
        centered
        styles={{
          title: { fontWeight: 600 },
          header: { 
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderBottom: '1px solid #e0e7ff'
          }
        }}
      >
        <Stack gap="lg">
          <Text size="sm" c="dimmed">
            선택한 키워드를 추적 목록에 추가하고 자동 수집 및 알림 설정을 구성하세요
          </Text>

          {/* 선택된 키워드 정보 */}
          <Paper p="md" radius="md" style={{ background: 'linear-gradient(135deg, #f0f4f8 0%, #e8eef5 100%)' }}>
            <Text size="xs" c="dimmed" mb={4}>키워드</Text>
            <Text size="lg" fw={700}>{selectedKeywordForTracking?.keyword}</Text>
          </Paper>

          {/* 수집 주기 */}
          <div>
            <Text size="sm" fw={500} mb="xs">수집 주기</Text>
            <Select
              size="md"
              value={updateFrequency}
              onChange={(value) => {
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
              data={[
                { value: 'daily_once', label: '하루 1회' },
                { value: 'daily_twice', label: '하루 2회' },
                { value: 'daily_thrice', label: '하루 3회' },
              ]}
              styles={{
                input: {
                  borderColor: '#e0e7ff',
                  '&:focus': { borderColor: '#635bff' }
                }
              }}
            />
          </div>

          {/* 수집 시간 */}
          <div>
            <Text size="sm" fw={500} mb="xs">수집 시간</Text>
            <Stack gap="sm">
              {updateTimes.map((time, index) => (
                <Group key={index} gap="sm">
                  <Badge size="lg" variant="light" color="brand" style={{ width: 60 }}>
                    {index + 1}차
                  </Badge>
                  <Select
                    size="md"
                    flex={1}
                    value={time.toString()}
                    onChange={(value) => {
                      const newTimes = [...updateTimes]
                      newTimes[index] = parseInt(value || '9')
                      setUpdateTimes(newTimes)
                    }}
                    data={Array.from({ length: 24 }, (_, i) => ({
                      value: i.toString(),
                      label: `${i}시`
                    }))}
                    styles={{
                      input: {
                        borderColor: '#e0e7ff',
                        '&:focus': { borderColor: '#635bff' }
                      }
                    }}
                  />
                </Group>
              ))}
            </Stack>
          </div>

          {/* 순위 알림받기 */}
          <Paper p="md" radius="md" style={{ border: '1px solid #e0e7ff' }}>
            <Group justify="space-between" mb="sm">
              <div>
                <Text size="sm" fw={600}>순위 알림받기</Text>
                <Text size="xs" c="dimmed">순위 변동 시 알림을 받습니다</Text>
              </div>
              <Switch
                size="lg"
                color="brand"
                checked={notificationEnabled}
                onChange={(event) => {
                  const checked = event.currentTarget.checked
                  setNotificationEnabled(checked)
                  if (!checked) {
                    setNotificationType('')
                  }
                }}
              />
            </Group>

            {notificationEnabled && (
              <Box pl="md" style={{ borderLeft: '2px solid #635bff' }}>
                <Text size="sm" fw={500} mb="xs">알림 방법</Text>
                <Select
                  size="md"
                  value={notificationType}
                  onChange={(value) => setNotificationType(value as 'email' | 'sms' | 'kakao' | '')}
                  placeholder="알림 방법 선택"
                  data={[
                    { value: 'email', label: '📧 이메일' },
                    { value: 'sms', label: '📱 SMS' },
                    { value: 'kakao', label: '💬 카카오톡' },
                  ]}
                  styles={{
                    input: {
                      borderColor: '#e0e7ff',
                      '&:focus': { borderColor: '#635bff' }
                    }
                  }}
                />
                <Text size="xs" c="dimmed" mt="xs">
                  💡 순위 변동 시 선택한 방법으로 알림을 받습니다
                </Text>
              </Box>
            )}
          </Paper>

          {/* 버튼 */}
          <Group justify="flex-end" mt="md">
            <Button
              variant="light"
              color="gray"
              onClick={() => setShowAddTrackingDialog(false)}
              disabled={isAddingTracker}
            >
              취소
            </Button>
            <Button
              variant="gradient"
              gradient={{ from: 'brand', to: 'brand.7', deg: 135 }}
              onClick={handleSubmitTracking}
              disabled={isAddingTracker}
              leftSection={isAddingTracker ? <Loader size={16} color="white" /> : null}
            >
              {isAddingTracker ? '추가 중...' : '추적 추가'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}
