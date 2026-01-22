"use client"

/**
 * 주요지표 추적 페이지
 * 매장 x 키워드 조합의 일별 순위, 방문자리뷰, 블로그리뷰 추적
 */
import { useStores } from "@/lib/hooks/useStores"
import { useAuth } from "@/lib/auth-context"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Settings, 
  Trash2, 
  Eye,
  EyeOff,
  Bell,
  LineChart as LineChartIcon,
  BarChart3,
  X,
  Users,
  FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useState, useEffect, useMemo } from "react"
import { api } from "@/lib/config"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Store {
  id: string
  name: string
  place_id: string
  platform: string
}

interface Keyword {
  id: string
  keyword: string
}

interface MetricTracker {
  id: string
  store_id: string
  keyword_id: string
  store_name: string
  keyword: string
  platform: string
  update_frequency: 'daily_once' | 'daily_twice' | 'daily_thrice'
  update_times: number[]
  notification_enabled: boolean
  notification_type?: 'kakao' | 'sms' | 'email'
  notification_phone?: string
  notification_email?: string
  is_active: boolean
  last_collected_at?: string
  next_collection_at?: string
  created_at: string
}

interface DailyMetric {
  id: string
  collection_date: string
  rank?: number
  visitor_review_count: number
  blog_review_count: number
  rank_change?: number
  previous_rank?: number
  collected_at: string
}

export default function MetricsTrackerPage() {
  const { hasStores, isLoading: storesLoading } = useStores()
  const { toast } = useToast()
  const { user, getToken } = useAuth()

  const [stores, setStores] = useState<Store[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [trackers, setTrackers] = useState<MetricTracker[]>([])
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([])
  const [latestMetrics, setLatestMetrics] = useState<Record<string, DailyMetric | null>>({})
  const [previousMetrics, setPreviousMetrics] = useState<Record<string, DailyMetric | null>>({})
  
  const [selectedStoreId, setSelectedStoreId] = useState<string>("")
  const [selectedKeywordId, setSelectedKeywordId] = useState<string>("")
  const [newKeyword, setNewKeyword] = useState<string>("")
  const [searchedKeywords, setSearchedKeywords] = useState<Keyword[]>([])  // ⭐ 조회된 키워드 목록
  
  const [isCreating, setIsCreating] = useState(false)
  const [isLoadingTrackers, setIsLoadingTrackers] = useState(false)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false)
  const [selectedTracker, setSelectedTracker] = useState<MetricTracker | null>(null)
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  // ⭐ showAddKeyword 제거 (직접 입력 방식으로 변경)
  
  // 모달 관련
  const [showMetricsDialog, setShowMetricsDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [editingTracker, setEditingTracker] = useState<string | null>(null)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    update_frequency: 'daily_once' as 'daily_once' | 'daily_twice' | 'daily_thrice',
    update_times: [16] as number[],
    notification_enabled: false,
    notification_type: '' as 'kakao' | 'sms' | 'email' | '',
    notification_phone: '',
    notification_email: '',
  })

  // 구독 tier 및 제한
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free")
  const [trackerLimit, setTrackerLimit] = useState<number>(1)
  const [currentTrackerCount, setCurrentTrackerCount] = useState<number>(0)

  // ⭐ 매장별 그룹화
  const storeGroups = useMemo(() => {
    const groups: Record<string, { store: Store, trackers: MetricTracker[] }> = {}
    
    trackers.forEach(tracker => {
      if (!groups[tracker.store_id]) {
        const store = stores.find(s => s.id === tracker.store_id)
        if (store) {
          groups[tracker.store_id] = {
            store,
            trackers: []
          }
        }
      }
      if (groups[tracker.store_id]) {
        groups[tracker.store_id].trackers.push(tracker)
      }
    })
    
    return Object.values(groups)
  }, [trackers, stores])

  // Tier 로드
  useEffect(() => {
    const loadUserTier = async () => {
      try {
        if (!user) return
        
        // user 객체에서 직접 tier 정보 가져오기
        const tier = user.subscription_tier?.toLowerCase() || "free"
        setSubscriptionTier(tier)
        
        const limits: Record<string, number> = {
          free: 1,
          basic: 3,
          pro: 10,
          god: 9999
        }
        
        setTrackerLimit(limits[tier] || 1)
      } catch (error) {
        console.error("Tier 로드 예외:", error)
      }
    }

    if (user) {
      loadUserTier()
    }
  }, [user])

  // 매장 목록 로드
  useEffect(() => {
    const loadStores = async () => {
      try {
        const token = getToken()
        if (!user || !token) return

        const response = await fetch(api.stores.list(), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (!response.ok) return
        
        const data = await response.json()
        const naverStores = data.stores.filter((s: Store) => s.platform === "naver")
        setStores(naverStores)
      } catch (error) {
        console.error("매장 로드 실패:", error)
      }
    }

    if (hasStores && user) {
      loadStores()
    }
  }, [hasStores, user])

  // 키워드 목록 로드 (선택된 매장)
  useEffect(() => {
    const loadKeywords = async () => {
      if (!selectedStoreId) {
        setKeywords([])
        return
      }

      try {
        const response = await fetch(api.naver.keywords(selectedStoreId))
        
        if (response.ok) {
          const data = await response.json()
          setKeywords(data.keywords || [])
        }
      } catch (error) {
        console.error("키워드 로드 실패:", error)
      }
    }

    loadKeywords()
  }, [selectedStoreId])

  // 추적 설정 목록 로드
  useEffect(() => {
    const loadTrackers = async () => {
      if (!user) return

      setIsLoadingTrackers(true)
      try {
        const token = localStorage.getItem('access_token')
        const response = await fetch(`${api.baseUrl}/api/v1/metrics/trackers`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          const loadedTrackers = data.trackers || []
          setTrackers(loadedTrackers)
          setCurrentTrackerCount(data.total_count || 0)

          // 각 tracker의 최근 metric 가져오기
          loadLatestMetrics(loadedTrackers, token)
        }
      } catch (error) {
        console.error("추적 설정 로드 실패:", error)
      } finally {
        setIsLoadingTrackers(false)
      }
    }

    loadTrackers()
  }, [user])

  // 최근 metric 로드 (최근 2개 데이터 가져오기)
  const loadLatestMetrics = async (trackerList: MetricTracker[], token: string | null) => {
    const latestMap: Record<string, DailyMetric | null> = {}
    const previousMap: Record<string, DailyMetric | null> = {}
    
    await Promise.all(
      trackerList.map(async (tracker) => {
        try {
          const response = await fetch(
            `${api.baseUrl}/api/v1/metrics/trackers/${tracker.id}/metrics`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          )

          if (response.ok) {
            const data = await response.json()
            // 최근 데이터 (첫 번째)와 전일 데이터 (두 번째)
            latestMap[tracker.id] = data.metrics && data.metrics.length > 0 
              ? data.metrics[0] 
              : null
            previousMap[tracker.id] = data.metrics && data.metrics.length > 1 
              ? data.metrics[1] 
              : null
          }
        } catch (error) {
          console.error(`최근 metric 로드 실패 (tracker: ${tracker.id}):`, error)
          latestMap[tracker.id] = null
          previousMap[tracker.id] = null
        }
      })
    )

    setLatestMetrics(latestMap)
    setPreviousMetrics(previousMap)
  }

  // 키워드 추가
  // ⭐ handleAddKeyword 제거 (직접 입력 방식으로 변경)

  // 추적 설정 생성 (⭐ 키워드 이름으로 직접 생성)
  const handleCreateTracker = async () => {
    if (!selectedStoreId || !newKeyword.trim()) {
      toast({
        title: "매장과 키워드를 입력해주세요",
        variant: "destructive",
      })
      return
    }

    if (currentTrackerCount >= trackerLimit) {
      toast({
        title: "추적 설정 제한 도달",
        description: `현재 플랜에서는 최대 ${trackerLimit}개까지 추적할 수 있습니다.`,
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${api.baseUrl}/api/v1/metrics/trackers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: user?.id,
          store_id: selectedStoreId,
          keyword: newKeyword.trim(),  // ⭐ 키워드 이름으로 전송
          update_frequency: "daily_once",
          update_times: [16],
          notification_enabled: false,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "추적 설정 생성 실패")
      }

      // 추적 설정 목록 새로고침
      const trackersResponse = await fetch(`${api.baseUrl}/api/v1/metrics/trackers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (trackersResponse.ok) {
        const data = await trackersResponse.json()
        setTrackers(data.trackers || [])
        setCurrentTrackerCount(data.total_count || 0)
      }

      setShowCreateForm(false)
      setSelectedStoreId("")
      setNewKeyword("")  // ⭐ 키워드 입력 초기화
      setSearchedKeywords([])  // ⭐ 조회된 키워드 초기화

      toast({
        title: "추적 설정이 생성되었습니다",
        description: "매일 설정된 시간에 자동으로 지표가 수집됩니다.",
      })
    } catch (error: any) {
      toast({
        title: "추적 설정 생성 실패",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  // 추적 설정 삭제
  const handleDeleteTracker = async (trackerId: string) => {
    if (!confirm("추적 설정을 삭제하시겠습니까? 관련 데이터도 모두 삭제됩니다.")) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${api.baseUrl}/api/v1/metrics/trackers/${trackerId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        },
      })

      if (!response.ok) {
        throw new Error("삭제 실패")
      }

      // 추적 설정 목록 새로고침
      const trackersResponse = await fetch(`${api.baseUrl}/api/v1/metrics/trackers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (trackersResponse.ok) {
        const data = await trackersResponse.json()
        setTrackers(data.trackers || [])
        setCurrentTrackerCount(data.total_count || 0)
      }

      if (selectedTracker?.id === trackerId) {
        setSelectedTracker(null)
        setDailyMetrics([])
      }

      toast({
        title: "추적 설정이 삭제되었습니다",
      })
    } catch (error) {
      toast({
        title: "삭제 실패",
        variant: "destructive",
      })
    }
  }

  // 일별 지표 조회
  const handleViewMetrics = async (tracker: MetricTracker) => {
    setSelectedTracker(tracker)
    setIsLoadingMetrics(true)
    setShowMetricsDialog(true)

    try {
      const token = getToken()
      const response = await fetch(
        `${api.baseUrl}/api/v1/metrics/trackers/${tracker.id}/metrics`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setDailyMetrics(data.metrics || [])
      }
    } catch (error) {
      console.error("지표 조회 실패:", error)
      toast({
        title: "지표 조회 실패",
        variant: "destructive",
      })
    } finally {
      setIsLoadingMetrics(false)
    }
  }

  // 지금 수집 (수동 트리거)
  const handleCollectNow = async (tracker: MetricTracker) => {
    try {
      const token = getToken()
      const response = await fetch(
        `${api.baseUrl}/api/v1/metrics/trackers/${tracker.id}/collect`,
        {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error("수집 실패")
      }

      toast({
        title: "지표 수집 완료",
        description: "최신 순위 및 리뷰 데이터가 수집되었습니다.",
      })

      // 추적 목록 새로고침
      const trackersResponse = await fetch(`${api.baseUrl}/api/v1/metrics/trackers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (trackersResponse.ok) {
        const data = await trackersResponse.json()
        setTrackers(data.trackers || [])
      }

      // 해당 tracker의 최근 metric 새로고침 (최근 2개)
      try {
        const metricResponse = await fetch(
          `${api.baseUrl}/api/v1/metrics/trackers/${tracker.id}/metrics`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        )

        if (metricResponse.ok) {
          const metricData = await metricResponse.json()
          setLatestMetrics(prev => ({
            ...prev,
            [tracker.id]: metricData.metrics && metricData.metrics.length > 0 
              ? metricData.metrics[0] 
              : null
          }))
          setPreviousMetrics(prev => ({
            ...prev,
            [tracker.id]: metricData.metrics && metricData.metrics.length > 1 
              ? metricData.metrics[1] 
              : null
          }))
        }
      } catch (error) {
        console.error("최근 metric 로드 실패:", error)
      }

      // 현재 선택된 추적의 지표를 보고 있다면 자동 새로고침
      if (selectedTracker && selectedTracker.id === tracker.id) {
        await handleViewMetrics(tracker)
      }

    } catch (error: any) {
      console.error("지표 수집 에러:", error)
      toast({
        title: "지표 수집 실패",
        description: error.message || "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      })
    }
  }

  // 설정 편집 시작
  const handleEditSettings = (tracker: MetricTracker) => {
    setSelectedTracker(tracker)
    setEditingTracker(tracker.id)
    setShowSettingsDialog(true)
    setSettingsForm({
      update_frequency: tracker.update_frequency,
      update_times: tracker.update_times,
      notification_enabled: tracker.notification_enabled,
      notification_type: tracker.notification_type || '',
      notification_phone: tracker.notification_phone || '',
      notification_email: tracker.notification_email || '',
    })
  }

  // 설정 저장
  const handleSaveSettings = async (trackerId: string) => {
    setIsSavingSettings(true)
    try {
      const token = getToken()
      if (!token) throw new Error("인증 토큰을 찾을 수 없습니다.")

      // 빈 문자열을 null로 변환
      const payload = {
        ...settingsForm,
        notification_type: settingsForm.notification_type || null,
        notification_phone: settingsForm.notification_phone || null,
        notification_email: settingsForm.notification_email || null,
      }

      const response = await fetch(`${api.baseUrl}/api/v1/metrics/trackers/${trackerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "설정 저장 실패")
      }

      toast({
        title: "설정이 저장되었습니다",
        description: "스케줄러가 새 설정에 따라 작동합니다.",
      })

      // 추적 목록 새로고침
      const trackersResponse = await fetch(`${api.baseUrl}/api/v1/metrics/trackers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (trackersResponse.ok) {
        const data = await trackersResponse.json()
        setTrackers(data.trackers || [])
      }

      setEditingTracker(null)
      setShowSettingsDialog(false)

    } catch (error: any) {
      console.error("설정 저장 실패:", error)
      toast({
        title: "설정 저장 실패",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSavingSettings(false)
    }
  }

  // 업데이트 주기 변경 시 시간 자동 설정
  const handleFrequencyChange = (frequency: 'daily_once' | 'daily_twice' | 'daily_thrice') => {
    const defaultTimes: Record<string, number[]> = {
      daily_once: [16],
      daily_twice: [6, 16],
      daily_thrice: [6, 12, 18],
    }
    setSettingsForm({
      ...settingsForm,
      update_frequency: frequency,
      update_times: defaultTimes[frequency],
    })
  }

  if (storesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!hasStores) {
    return <EmptyStoreMessage />
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
            주요지표 추적
          </h1>
          <p className="text-muted-foreground">
            매장과 키워드의 순위, 리뷰수를 매일 자동으로 추적하고 알림을 받아보세요
          </p>
        </div>
        
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={currentTrackerCount >= trackerLimit}
        >
          <Plus className="w-4 h-4 mr-2" />
          추적 설정 추가
        </Button>
      </div>

      {/* Tier 정보 */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              현재 플랜: <strong className="uppercase">{subscriptionTier}</strong>
            </span>
          </div>
          <div className={`text-sm font-medium px-3 py-1 rounded-full ${
            currentTrackerCount >= trackerLimit 
              ? "bg-red-100 text-red-700" 
              : currentTrackerCount >= trackerLimit * 0.8
              ? "bg-yellow-100 text-yellow-700"
              : "bg-green-100 text-green-700"
          }`}>
            {currentTrackerCount}/{trackerLimit}개 사용 중
          </div>
        </div>
      </Card>

      {/* 추적 설정 생성 폼 */}
      {showCreateForm && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">새 추적 설정</h2>
          
          <div className="space-y-4">
            {/* 매장 선택 */}
            <div>
              <label className="block text-sm font-medium mb-2">매장 선택</label>
              <select
                value={selectedStoreId}
                onChange={async (e) => {
                  const storeId = e.target.value
                  setSelectedStoreId(storeId)
                  
                  // ⭐ 선택된 매장의 조회된 키워드 목록 가져오기 (is_tracked=false)
                  if (storeId) {
                    try {
                      const response = await fetch(`${api.naver.keywords(storeId)}?is_tracked=false`)
                      if (response.ok) {
                        const data = await response.json()
                        setSearchedKeywords(data.keywords || [])
                      }
                    } catch (error) {
                      console.error("조회된 키워드 목록 가져오기 실패:", error)
                      setSearchedKeywords([])
                    }
                  } else {
                    setSearchedKeywords([])
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">매장을 선택하세요</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ⭐ 키워드 직접 입력 */}
            {selectedStoreId && (
              <div>
                <label className="block text-sm font-medium mb-2">키워드 입력</label>
                <Input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="예: 강남 맛집"
                  className="mb-2"
                />
                
                {/* ⭐ 조회된 키워드 목록 (클릭으로 추가) */}
                {searchedKeywords.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-2">
                      해당 매장의 조회한 키워드 (클릭하여 추가)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {searchedKeywords.map((kw) => (
                        <button
                          key={kw.id}
                          onClick={() => setNewKeyword(kw.keyword)}
                          className="px-3 py-1 text-sm bg-gray-100 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          {kw.keyword}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-2">
              <Button
                onClick={handleCreateTracker}
                disabled={isCreating || !selectedStoreId || !newKeyword.trim()}  // ⭐ 키워드 입력 체크
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  "생성하기"
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                취소
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 추적 설정 목록 - 매장별 그룹화 */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">
          추적 중인 지표 ({trackers.length})
        </h2>

        {isLoadingTrackers ? (
          <Card className="p-6">
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            </div>
          </Card>
        ) : trackers.length === 0 ? (
          <Card className="p-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">추적 중인 지표가 없습니다</p>
              <p className="text-sm text-muted-foreground mt-1">
                위의 "추적 설정 추가" 버튼을 눌러 새 추적을 시작하세요
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* 매장별 그룹화 */}
            {storeGroups.map((group) => (
              <Card key={group.store.id} className="p-6">
                {/* 매장 헤더 */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{group.store.name}</h3>
                    <p className="text-sm text-gray-600">
                      {group.trackers.length}개 키워드 추적 중
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      // 매장의 모든 키워드 수집
                      for (const tracker of group.trackers) {
                        await handleCollectNow(tracker.id)
                      }
                    }}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    전체 수집
                  </Button>
                </div>
                
                {/* 키워드 목록 */}
                <div className="space-y-3">
                  {group.trackers.map((tracker) => (
                    <div
                      key={tracker.id}
                      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                {/* 헤더 */}
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 truncate">{tracker.store_name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                          {tracker.keyword}
                        </span>
                        {!tracker.is_active && (
                          <span className="text-xs px-2.5 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                            일시정지
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 최근 지표 미리보기 */}
                  <div className="w-full">
                    {latestMetrics[tracker.id] ? (
                      <div className="grid grid-cols-3 gap-2">
                        {/* 순위 */}
                        <div className="text-center bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg px-2 py-2.5">
                          <div className="text-[10px] text-blue-600 font-medium mb-1">순위</div>
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-xl font-bold text-blue-700">
                              {latestMetrics[tracker.id].rank || '-'}
                            </span>
                            {previousMetrics[tracker.id] && latestMetrics[tracker.id].rank && previousMetrics[tracker.id]!.rank ? (
                              (() => {
                                const change = latestMetrics[tracker.id].rank! - previousMetrics[tracker.id]!.rank!
                                return change !== 0 ? (
                                  <span className={`text-[10px] font-medium ${change > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                    {change > 0 ? '↓' : '↑'}{Math.abs(change)}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-gray-400">-</span>
                                )
                              })()
                            ) : (
                              <span className="text-[9px] text-gray-400">신규</span>
                            )}
                          </div>
                        </div>
                        
                        {/* 방문자 리뷰 */}
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg px-2 py-2.5">
                          <div className="text-[10px] text-green-600 font-medium mb-1 flex items-center justify-center gap-1">
                            <Users className="w-3 h-3" />
                            방문자
                          </div>
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-base font-bold text-green-700">
                              {latestMetrics[tracker.id].visitor_review_count.toLocaleString()}
                            </span>
                            {previousMetrics[tracker.id] ? (
                              (() => {
                                const change = latestMetrics[tracker.id].visitor_review_count - previousMetrics[tracker.id]!.visitor_review_count
                                return change !== 0 ? (
                                  <span className={`text-[10px] font-medium ${change > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                    {change > 0 ? '↑' : '↓'}{Math.abs(change)}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-gray-400">-</span>
                                )
                              })()
                            ) : (
                              <span className="text-[9px] text-gray-400">신규</span>
                            )}
                          </div>
                        </div>
                        
                        {/* 블로그 리뷰 */}
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg px-2 py-2.5">
                          <div className="text-[10px] text-amber-600 font-medium mb-1 flex items-center justify-center gap-1">
                            <FileText className="w-3 h-3" />
                            블로그
                          </div>
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-base font-bold text-amber-700">
                              {latestMetrics[tracker.id].blog_review_count.toLocaleString()}
                            </span>
                            {previousMetrics[tracker.id] ? (
                              (() => {
                                const change = latestMetrics[tracker.id].blog_review_count - previousMetrics[tracker.id]!.blog_review_count
                                return change !== 0 ? (
                                  <span className={`text-[10px] font-medium ${change > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                    {change > 0 ? '↑' : '↓'}{Math.abs(change)}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-gray-400">-</span>
                                )
                              })()
                            ) : (
                              <span className="text-[9px] text-gray-400">신규</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-gray-400 bg-gray-50 rounded-lg py-3">
                        데이터 없음
                      </div>
                    )}
                  </div>
                </div>

                {/* 정보 */}
                <div className="space-y-2 mb-4 pb-4 border-b">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BarChart3 className="w-4 h-4" />
                    <span>
                      업데이트: 
                      {tracker.update_frequency === 'daily_once' && ' 매일 1회 (오후 4시)'}
                      {tracker.update_frequency === 'daily_twice' && ' 매일 2회 (오전 6시, 오후 4시)'}
                      {tracker.update_frequency === 'daily_thrice' && ' 매일 3회 (오전 6시, 낮 12시, 오후 6시)'}
                    </span>
                  </div>
                  {tracker.notification_enabled && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Bell className="w-4 h-4" />
                      <span>
                        알림: 
                        {tracker.notification_type === 'kakao' && ' 카카오톡'}
                        {tracker.notification_type === 'sms' && ' SMS'}
                        {tracker.notification_type === 'email' && ' 이메일'}
                      </span>
                    </div>
                  )}
                  {tracker.last_collected_at && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      마지막 수집: {new Date(tracker.last_collected_at).toLocaleString('ko-KR')}
                    </div>
                  )}
                </div>

                {/* 버튼 그룹 */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewMetrics(tracker)}
                    className="flex-1 min-w-[100px]"
                  >
                    <LineChartIcon className="w-4 h-4 mr-1.5" />
                    지표 보기
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleCollectNow(tracker)}
                    title="지금 순위와 리뷰 데이터를 수집합니다"
                    className="flex-1 min-w-[100px]"
                  >
                    <TrendingUp className="w-4 h-4 mr-1.5" />
                    지금 수집
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditSettings(tracker)}
                    title="스케줄러 및 알림 설정"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTracker(tracker.id)}
                    title="추적 삭제"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* 지표 보기 모달 */}
      <Dialog open={showMetricsDialog} onOpenChange={setShowMetricsDialog}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LineChartIcon className="w-5 h-5" />
              {selectedTracker?.store_name} - {selectedTracker?.keyword}
            </DialogTitle>
            <DialogDescription>일별 지표 추이</DialogDescription>
          </DialogHeader>

          {isLoadingMetrics ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            </div>
          ) : dailyMetrics.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-muted-foreground">아직 수집된 데이터가 없습니다</p>
              <p className="text-sm text-muted-foreground mt-1">
                매일 설정된 시간에 자동으로 수집됩니다
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 차트 */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[...dailyMetrics].reverse().map(m => ({
                      date: new Date(m.collection_date).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric'
                      }),
                      rank: m.rank,
                      visitorReviews: m.visitor_review_count,
                      blogReviews: m.blog_review_count,
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis 
                      yAxisId="left"
                      reversed={true}
                      label={{ value: '순위', angle: -90, position: 'insideLeft' }}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      label={{ value: '리뷰수', angle: 90, position: 'insideRight' }}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="rank" 
                      stroke="#8884d8" 
                      name="순위"
                      strokeWidth={2}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="visitorReviews" 
                      stroke="#82ca9d" 
                      name="방문자리뷰"
                      strokeWidth={2}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="blogReviews" 
                      stroke="#ffc658" 
                      name="블로그리뷰"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 테이블 - 리뷰 변동 포함 */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium">날짜</th>
                      <th className="text-center p-3 font-medium">순위</th>
                      <th className="text-center p-3 font-medium">순위 변동</th>
                      <th className="text-right p-3 font-medium">방문자리뷰</th>
                      <th className="text-right p-3 font-medium">리뷰 변동</th>
                      <th className="text-right p-3 font-medium">블로그리뷰</th>
                      <th className="text-right p-3 font-medium">리뷰 변동</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyMetrics.map((metric, index) => {
                      // 리뷰 변동 계산 (이전 날짜 데이터와 비교)
                      const prevMetric = dailyMetrics[index + 1]
                      const visitorReviewChange = prevMetric 
                        ? metric.visitor_review_count - prevMetric.visitor_review_count 
                        : null
                      const blogReviewChange = prevMetric 
                        ? metric.blog_review_count - prevMetric.blog_review_count 
                        : null

                      return (
                        <tr key={metric.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            {new Date(metric.collection_date).toLocaleDateString('ko-KR')}
                          </td>
                          <td className="text-center p-3 font-medium">
                            {metric.rank ? `${metric.rank}위` : '-'}
                          </td>
                          <td className="text-center p-3">
                            {metric.rank_change ? (
                              <span className={`flex items-center justify-center gap-1 ${metric.rank_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {metric.rank_change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {Math.abs(metric.rank_change)}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="text-right p-3">
                            <div className="flex items-center justify-end gap-1">
                              <Users className="w-3 h-3 text-gray-400" />
                              {metric.visitor_review_count.toLocaleString()}개
                            </div>
                          </td>
                          <td className="text-right p-3">
                            {visitorReviewChange !== null ? (
                              <span className={`flex items-center justify-end gap-1 ${visitorReviewChange > 0 ? 'text-green-600' : visitorReviewChange < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                {visitorReviewChange > 0 ? <TrendingUp className="w-3 h-3" /> : visitorReviewChange < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                {visitorReviewChange !== 0 ? `${visitorReviewChange > 0 ? '+' : ''}${visitorReviewChange}` : '-'}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="text-right p-3">
                            <div className="flex items-center justify-end gap-1">
                              <FileText className="w-3 h-3 text-gray-400" />
                              {metric.blog_review_count.toLocaleString()}개
                            </div>
                          </td>
                          <td className="text-right p-3">
                            {blogReviewChange !== null ? (
                              <span className={`flex items-center justify-end gap-1 ${blogReviewChange > 0 ? 'text-green-600' : blogReviewChange < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                {blogReviewChange > 0 ? <TrendingUp className="w-3 h-3" /> : blogReviewChange < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                {blogReviewChange !== 0 ? `${blogReviewChange > 0 ? '+' : ''}${blogReviewChange}` : '-'}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 설정 모달 */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              스케줄러 및 알림 설정
            </DialogTitle>
            <DialogDescription>
              {selectedTracker?.store_name} - {selectedTracker?.keyword}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 업데이트 주기 */}
            <div>
              <label className="text-sm font-medium mb-2 block">업데이트 주기</label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={settingsForm.update_frequency === 'daily_once' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFrequencyChange('daily_once')}
                  className="w-full"
                >
                  하루 1회
                </Button>
                <Button
                  type="button"
                  variant={settingsForm.update_frequency === 'daily_twice' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFrequencyChange('daily_twice')}
                  className="w-full"
                >
                  하루 2회
                </Button>
                <Button
                  type="button"
                  variant={settingsForm.update_frequency === 'daily_thrice' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFrequencyChange('daily_thrice')}
                  className="w-full"
                >
                  하루 3회
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {settingsForm.update_frequency === 'daily_once' && '📅 매일 오후 4시'}
                {settingsForm.update_frequency === 'daily_twice' && '📅 매일 오전 6시, 오후 4시'}
                {settingsForm.update_frequency === 'daily_thrice' && '📅 매일 오전 6시, 낮 12시, 오후 6시'}
              </p>
            </div>

            {/* 알림 설정 */}
            <div>
              <label className="text-sm font-medium mb-2 block">알림 설정</label>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={settingsForm.notification_enabled}
                  onChange={(e) => setSettingsForm({
                    ...settingsForm,
                    notification_enabled: e.target.checked
                  })}
                  className="w-4 h-4"
                />
                <span className="text-sm">순위 변동 알림 받기</span>
              </div>

              {settingsForm.notification_enabled && (
                <div className="space-y-3 pl-6">
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={settingsForm.notification_type === 'kakao' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSettingsForm({...settingsForm, notification_type: 'kakao'})}
                      className="w-full"
                    >
                      카카오톡
                    </Button>
                    <Button
                      type="button"
                      variant={settingsForm.notification_type === 'sms' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSettingsForm({...settingsForm, notification_type: 'sms'})}
                      className="w-full"
                    >
                      SMS
                    </Button>
                    <Button
                      type="button"
                      variant={settingsForm.notification_type === 'email' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSettingsForm({...settingsForm, notification_type: 'email'})}
                      className="w-full"
                    >
                      이메일
                    </Button>
                  </div>

                  {settingsForm.notification_type === 'sms' && (
                    <Input
                      placeholder="전화번호 (예: 010-1234-5678)"
                      value={settingsForm.notification_phone}
                      onChange={(e) => setSettingsForm({...settingsForm, notification_phone: e.target.value})}
                    />
                  )}

                  {settingsForm.notification_type === 'email' && (
                    <Input
                      placeholder="이메일 주소"
                      type="email"
                      value={settingsForm.notification_email}
                      onChange={(e) => setSettingsForm({...settingsForm, notification_email: e.target.value})}
                    />
                  )}

                  <p className="text-xs text-muted-foreground">
                    💡 순위가 변동되었을 때 알림을 받습니다.
                  </p>
                </div>
              )}
            </div>

            {/* 저장/취소 버튼 */}
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettingsDialog(false)}
              >
                취소
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => selectedTracker && handleSaveSettings(selectedTracker.id)}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "저장"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
