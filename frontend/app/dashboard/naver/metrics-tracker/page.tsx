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
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useState, useEffect } from "react"
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
  const { user } = useAuth()

  const [stores, setStores] = useState<Store[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [trackers, setTrackers] = useState<MetricTracker[]>([])
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([])
  
  const [selectedStoreId, setSelectedStoreId] = useState<string>("")
  const [selectedKeywordId, setSelectedKeywordId] = useState<string>("")
  const [newKeyword, setNewKeyword] = useState<string>("")
  
  const [isCreating, setIsCreating] = useState(false)
  const [isLoadingTrackers, setIsLoadingTrackers] = useState(false)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false)
  const [selectedTracker, setSelectedTracker] = useState<MetricTracker | null>(null)
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showAddKeyword, setShowAddKeyword] = useState(false)

  // 구독 tier 및 제한
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free")
  const [trackerLimit, setTrackerLimit] = useState<number>(1)
  const [currentTrackerCount, setCurrentTrackerCount] = useState<number>(0)

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
        if (!user) return

        const response = await fetch(api.stores.list(user.id))
        
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
          setTrackers(data.trackers || [])
          setCurrentTrackerCount(data.total_count || 0)
        }
      } catch (error) {
        console.error("추적 설정 로드 실패:", error)
      } finally {
        setIsLoadingTrackers(false)
      }
    }

    loadTrackers()
  }, [user])

  // 키워드 추가
  const handleAddKeyword = async () => {
    if (!selectedStoreId || !newKeyword.trim()) {
      toast({
        title: "매장과 키워드를 입력해주세요",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(
        `${api.baseUrl}/api/v1/naver/rank/check`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            store_id: selectedStoreId,
            keyword: newKeyword.trim(),
          }),
        }
      )

      if (!response.ok) {
        throw new Error("키워드 추가 실패")
      }

      // 키워드 목록 새로고침
      const keywordsResponse = await fetch(api.naver.keywords(selectedStoreId))
      if (keywordsResponse.ok) {
        const data = await keywordsResponse.json()
        setKeywords(data.keywords || [])
      }

      setNewKeyword("")
      setShowAddKeyword(false)
      
      toast({
        title: "키워드가 추가되었습니다",
      })
    } catch (error) {
      toast({
        title: "키워드 추가 실패",
        variant: "destructive",
      })
    }
  }

  // 추적 설정 생성
  const handleCreateTracker = async () => {
    if (!selectedStoreId || !selectedKeywordId) {
      toast({
        title: "매장과 키워드를 선택해주세요",
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
          keyword_id: selectedKeywordId,
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
          'Authorization': `Bearer ${session.data.session?.access_token}`
        }
      })

      if (trackersResponse.ok) {
        const data = await trackersResponse.json()
        setTrackers(data.trackers || [])
        setCurrentTrackerCount(data.total_count || 0)
      }

      setShowCreateForm(false)
      setSelectedStoreId("")
      setSelectedKeywordId("")

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

    try {
      const token = localStorage.getItem('access_token')
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
      const token = localStorage.getItem('access_token')
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

      // 현재 선택된 추적의 지표를 보고 있다면 자동 새로고침
      if (selectedTracker && selectedTracker.id === tracker.id) {
        await handleViewMetrics(tracker)
      }

    } catch (error) {
      toast({
        title: "지표 수집 실패",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      })
    }
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
                onChange={(e) => setSelectedStoreId(e.target.value)}
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

            {/* 키워드 선택 */}
            {selectedStoreId && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">키워드 선택</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddKeyword(!showAddKeyword)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    키워드 추가
                  </Button>
                </div>
                
                {showAddKeyword && (
                  <div className="flex gap-2 mb-2">
                    <Input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="새 키워드 입력"
                    />
                    <Button onClick={handleAddKeyword} size="sm">
                      추가
                    </Button>
                  </div>
                )}
                
                <select
                  value={selectedKeywordId}
                  onChange={(e) => setSelectedKeywordId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">키워드를 선택하세요</option>
                  {keywords.map((kw) => (
                    <option key={kw.id} value={kw.id}>
                      {kw.keyword}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 버튼 */}
            <div className="flex gap-2">
              <Button
                onClick={handleCreateTracker}
                disabled={isCreating || !selectedStoreId || !selectedKeywordId}
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

      {/* 추적 설정 목록 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          추적 중인 지표 ({trackers.length})
        </h2>

        {isLoadingTrackers ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          </div>
        ) : trackers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">추적 중인 지표가 없습니다</p>
            <p className="text-sm text-muted-foreground mt-1">
              위의 "추적 설정 추가" 버튼을 눌러 새 추적을 시작하세요
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {trackers.map((tracker) => (
              <div
                key={tracker.id}
                className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                  selectedTracker?.id === tracker.id ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{tracker.store_name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                        {tracker.keyword}
                      </span>
                      {!tracker.is_active && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                          일시정지
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        업데이트: 
                        {tracker.update_frequency === 'daily_once' && ' 일 1회'}
                        {tracker.update_frequency === 'daily_twice' && ' 일 2회'}
                        {tracker.update_frequency === 'daily_thrice' && ' 일 3회'}
                      </span>
                      {tracker.notification_enabled && (
                        <span className="flex items-center gap-1">
                          <Bell className="w-3 h-3" />
                          {tracker.notification_type === 'kakao' && '카카오톡'}
                          {tracker.notification_type === 'sms' && 'SMS'}
                          {tracker.notification_type === 'email' && '이메일'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewMetrics(tracker)}
                    >
                      <LineChartIcon className="w-4 h-4 mr-1" />
                      지표 보기
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleCollectNow(tracker)}
                      title="지금 순위와 리뷰 데이터를 수집합니다"
                    >
                      <TrendingUp className="w-4 h-4 mr-1" />
                      지금 수집
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTracker(tracker.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 일별 지표 차트 및 테이블 */}
      {selectedTracker && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedTracker.store_name} - {selectedTracker.keyword}
              </h2>
              <p className="text-sm text-muted-foreground">일별 지표 추이</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTracker(null)
                setDailyMetrics([])
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {isLoadingMetrics ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            </div>
          ) : dailyMetrics.length === 0 ? (
            <div className="text-center py-8">
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

              {/* 테이블 */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">날짜</th>
                      <th className="text-center p-3">순위</th>
                      <th className="text-center p-3">순위 변동</th>
                      <th className="text-right p-3">방문자리뷰</th>
                      <th className="text-right p-3">블로그리뷰</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyMetrics.map((metric) => (
                      <tr key={metric.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          {new Date(metric.collection_date).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="text-center p-3 font-medium">
                          {metric.rank ? `${metric.rank}위` : '-'}
                        </td>
                        <td className="text-center p-3">
                          {metric.rank_change ? (
                            <span className={metric.rank_change > 0 ? 'text-green-600' : 'text-red-600'}>
                              {metric.rank_change > 0 ? '↑' : '↓'}
                              {Math.abs(metric.rank_change)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="text-right p-3">
                          {metric.visitor_review_count.toLocaleString()}개
                        </td>
                        <td className="text-right p-3">
                          {metric.blog_review_count.toLocaleString()}개
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
