"use client"

/**
 * 주요지표 추적 페이지 - 대시보드 스타일
 * 매장별 카드 형식으로 추적 키워드 표시
 * 완벽한 반응형 디자인 (모바일/태블릿/PC)
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
  RefreshCw,
  Store as StoreIcon,
  MessageSquare,
  FileText,
  Clock,
  BarChart3,
  X,
  Eye
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

// 매장 색상 테마 (대시보드와 동일)
const STORE_COLORS = [
  { bg: 'from-blue-50 to-blue-100', border: 'border-blue-300', text: 'text-blue-900', badge: 'bg-blue-500' },
  { bg: 'from-purple-50 to-purple-100', border: 'border-purple-300', text: 'text-purple-900', badge: 'bg-purple-500' },
  { bg: 'from-green-50 to-green-100', border: 'border-green-300', text: 'text-green-900', badge: 'bg-green-500' },
  { bg: 'from-orange-50 to-orange-100', border: 'border-orange-300', text: 'text-orange-900', badge: 'bg-orange-500' },
  { bg: 'from-pink-50 to-pink-100', border: 'border-pink-300', text: 'text-pink-900', badge: 'bg-pink-500' },
  { bg: 'from-teal-50 to-teal-100', border: 'border-teal-300', text: 'text-teal-900', badge: 'bg-teal-500' },
  { bg: 'from-indigo-50 to-indigo-100', border: 'border-indigo-300', text: 'text-indigo-900', badge: 'bg-indigo-500' },
  { bg: 'from-rose-50 to-rose-100', border: 'border-rose-300', text: 'text-rose-900', badge: 'bg-rose-500' },
]

interface Store {
  id: string
  name: string
  store_name?: string
  thumbnail?: string
  platform: string
}

interface MetricTracker {
  id: string
  store_id: string
  keyword_id: string
  store_name: string
  keyword: string
  platform: string
  update_frequency: 'daily_once' | 'daily_twice' | 'daily_thrice'
  is_active: boolean
  last_collected_at?: string
  created_at: string
}

interface DailyMetric {
  id: string
  collection_date: string
  rank?: number
  visitor_review_count: number
  blog_review_count: number
  rank_change?: number
}

interface StoreGroup {
  store: Store
  trackers: MetricTracker[]
  color: typeof STORE_COLORS[0]
}

export default function MetricsTrackerPage() {
  const { hasStores, isLoading: storesLoading } = useStores()
  const { user, getToken } = useAuth()
  const { toast } = useToast()

  const [stores, setStores] = useState<Store[]>([])
  const [trackers, setTrackers] = useState<MetricTracker[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState<Set<string>>(new Set())
  
  // 추적 설정 추가 모달
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedStoreId, setSelectedStoreId] = useState("")
  const [newKeyword, setNewKeyword] = useState("")
  const [updateFrequency, setUpdateFrequency] = useState<'daily_once' | 'daily_twice' | 'daily_thrice'>('daily_once')
  const [isAdding, setIsAdding] = useState(false)

  // 지표 보기 모달
  const [showMetricsDialog, setShowMetricsDialog] = useState(false)
  const [selectedTracker, setSelectedTracker] = useState<MetricTracker | null>(null)
  const [metrics, setMetrics] = useState<DailyMetric[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(false)

  // 설정 모달
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [editingTracker, setEditingTracker] = useState<MetricTracker | null>(null)
  const [editFrequency, setEditFrequency] = useState<'daily_once' | 'daily_twice' | 'daily_thrice'>('daily_once')

  // 최근 지표 데이터
  const [latestMetrics, setLatestMetrics] = useState<{[trackerId: string]: DailyMetric}>({})
  const [previousMetrics, setPreviousMetrics] = useState<{[trackerId: string]: DailyMetric | null}>({})

  // 매장 목록 로드
  useEffect(() => {
    if (hasStores && user) {
      loadStores()
    }
  }, [hasStores, user])

  // 추적 설정 로드
  useEffect(() => {
    if (user) {
      loadTrackers()
    }
  }, [user])

  const loadStores = async () => {
    try {
      const token = getToken()
      if (!token) return

      const response = await fetch(api.stores.list(), {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setStores(data.stores || [])
      }
    } catch (error) {
      console.error("매장 로드 실패:", error)
    }
  }

  const loadTrackers = async () => {
    try {
      setLoading(true)
      const token = getToken()
      if (!token) return

      const response = await fetch(api.metrics.list(), {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setTrackers(data.trackers || [])
        
        // 각 tracker의 최근 지표 로드
        if (data.trackers && data.trackers.length > 0) {
          loadAllLatestMetrics(data.trackers)
        }
      }
    } catch (error) {
      console.error("추적 설정 로드 실패:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadAllLatestMetrics = async (trackerList: MetricTracker[]) => {
    const token = getToken()
    if (!token) return

    const latestData: {[key: string]: DailyMetric} = {}
    const previousData: {[key: string]: DailyMetric | null} = {}

    for (const tracker of trackerList) {
      try {
        const response = await fetch(api.metrics.getMetrics(tracker.id), {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.metrics && data.metrics.length > 0) {
            latestData[tracker.id] = data.metrics[0]
            previousData[tracker.id] = data.metrics[1] || null
          }
        }
      } catch (error) {
        console.error(`지표 로드 실패 (${tracker.id}):`, error)
      }
    }

    setLatestMetrics(latestData)
    setPreviousMetrics(previousData)
  }

  // 매장별 그룹화
  const storeGroups = useMemo<StoreGroup[]>(() => {
    const groups: {[storeId: string]: StoreGroup} = {}

    trackers.forEach((tracker) => {
      if (!groups[tracker.store_id]) {
        const store = stores.find(s => s.id === tracker.store_id)
        if (!store) return

        const colorIndex = Object.keys(groups).length % STORE_COLORS.length
        groups[tracker.store_id] = {
          store: {
            id: store.id,
            name: store.store_name || store.name,
            thumbnail: store.thumbnail,
            platform: store.platform
          },
          trackers: [],
          color: STORE_COLORS[colorIndex]
        }
      }
      groups[tracker.store_id].trackers.push(tracker)
    })

    return Object.values(groups)
  }, [trackers, stores])

  // 추적 설정 추가
  const handleAddTracker = async () => {
    if (!selectedStoreId || !newKeyword.trim()) {
      toast({
        title: "입력 오류",
        description: "매장과 키워드를 모두 입력해주세요",
        variant: "destructive"
      })
      return
    }

    try {
      setIsAdding(true)
      const token = getToken()
      if (!token) return

      const response = await fetch(api.metrics.create(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          store_id: selectedStoreId,
          keyword: newKeyword.trim(),
          update_frequency: updateFrequency,
          notification_enabled: false
        })
      })

      if (response.ok) {
        toast({
          title: "추적 시작",
          description: "키워드 추적이 시작되었습니다. 첫 지표를 수집 중입니다..."
        })
        setShowAddDialog(false)
        setSelectedStoreId("")
        setNewKeyword("")
        setUpdateFrequency('daily_once')
        
        // 목록 새로고침
        await loadTrackers()
      } else {
        const error = await response.json()
        throw new Error(error.detail || "추적 설정 추가 실패")
      }
    } catch (error: any) {
      toast({
        title: "추적 추가 실패",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsAdding(false)
    }
  }

  // 지금 수집
  const handleCollectNow = async (trackerId: string) => {
    try {
      setIsRefreshing(prev => new Set(prev).add(trackerId))
      const token = getToken()
      if (!token) return

      const response = await fetch(api.metrics.collect(trackerId), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        toast({
          title: "수집 완료",
          description: "지표가 수집되었습니다"
        })
        
        // 해당 tracker의 최근 지표 다시 로드
        const metricsResponse = await fetch(api.metrics.getMetrics(trackerId), {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        if (metricsResponse.ok) {
          const data = await metricsResponse.json()
          if (data.metrics && data.metrics.length > 0) {
            setLatestMetrics(prev => ({
              ...prev,
              [trackerId]: data.metrics[0]
            }))
            setPreviousMetrics(prev => ({
              ...prev,
              [trackerId]: data.metrics[1] || null
            }))
          }
        }
      } else {
        throw new Error("지표 수집 실패")
      }
    } catch (error: any) {
      toast({
        title: "수집 실패",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsRefreshing(prev => {
        const next = new Set(prev)
        next.delete(trackerId)
        return next
      })
    }
  }

  // 매장 전체 수집
  const handleCollectAllStore = async (storeId: string, trackerIds: string[]) => {
    const storeKey = `store_${storeId}`
    try {
      setIsRefreshing(prev => new Set(prev).add(storeKey))
      
      for (const trackerId of trackerIds) {
        await handleCollectNow(trackerId)
      }
      
      toast({
        title: "전체 수집 완료",
        description: "모든 키워드의 지표가 수집되었습니다"
      })
    } finally {
      setIsRefreshing(prev => {
        const next = new Set(prev)
        next.delete(storeKey)
        return next
      })
    }
  }

  // 지표 보기
  const handleViewMetrics = async (tracker: MetricTracker) => {
    setSelectedTracker(tracker)
    setShowMetricsDialog(true)
    setLoadingMetrics(true)

    try {
      const token = getToken()
      if (!token) return

      const response = await fetch(api.metrics.getMetrics(tracker.id), {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics || [])
      }
    } catch (error) {
      console.error("지표 로드 실패:", error)
    } finally {
      setLoadingMetrics(false)
    }
  }

  // 설정 수정
  const handleEditSettings = (tracker: MetricTracker) => {
    setEditingTracker(tracker)
    setEditFrequency(tracker.update_frequency)
    setShowSettingsDialog(true)
  }

  const handleUpdateSettings = async () => {
    if (!editingTracker) return

    try {
      const token = getToken()
      if (!token) return

      const response = await fetch(api.metrics.update(editingTracker.id), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          update_frequency: editFrequency
        })
      })

      if (response.ok) {
        toast({
          title: "설정 수정 완료",
          description: "추적 설정이 수정되었습니다"
        })
        setShowSettingsDialog(false)
        await loadTrackers()
      }
    } catch (error) {
      toast({
        title: "설정 수정 실패",
        description: "설정 수정 중 오류가 발생했습니다",
        variant: "destructive"
      })
    }
  }

  // 삭제
  const handleDelete = async (trackerId: string, keyword: string) => {
    if (!confirm(`"${keyword}" 추적을 삭제하시겠습니까?`)) return

    try {
      const token = getToken()
      if (!token) return

      const response = await fetch(api.metrics.delete(trackerId), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        toast({
          title: "삭제 완료",
          description: "추적 설정이 삭제되었습니다"
        })
        await loadTrackers()
      }
    } catch (error) {
      toast({
        title: "삭제 실패",
        description: "삭제 중 오류가 발생했습니다",
        variant: "destructive"
      })
    }
  }

  if (storesLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!hasStores) {
    return <EmptyStoreMessage />
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">주요지표 추적</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            매장별 키워드의 순위와 리뷰 수를 자동으로 추적합니다
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="w-full sm:w-auto"
          size="lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          추적 추가
        </Button>
      </div>

      {/* 매장별 추적 키워드 카드 */}
      {trackers.length === 0 ? (
        <Card className="p-8 sm:p-12">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-base sm:text-lg text-muted-foreground mb-2">
              추적 중인 키워드가 없습니다
            </p>
            <p className="text-sm text-muted-foreground">
              "추적 추가" 버튼을 눌러 키워드 추적을 시작하세요
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {storeGroups.map((group) => (
            <div
              key={group.store.id}
              className={`relative p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 ${group.color.border} hover:shadow-xl transition-all duration-300 bg-gradient-to-br ${group.color.bg}`}
            >
              {/* 매장 헤더 */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* 매장 썸네일 */}
                  {group.store.thumbnail ? (
                    <img 
                      src={group.store.thumbnail} 
                      alt={group.store.name} 
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl object-cover border-2 border-white shadow-sm flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-white/80 flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0">
                      <StoreIcon className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400" />
                    </div>
                  )}
                  
                  {/* 매장명 */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-base sm:text-lg ${group.color.text} truncate`}>
                      {group.store.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        group.store.platform === 'naver' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-blue-500 text-white'
                      }`}>
                        {group.store.platform === 'naver' ? '네이버' : '구글'}
                      </span>
                      <span className="text-xs text-gray-600">
                        {group.trackers.length}개 추적중
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* 전체 수집 버튼 */}
                <button
                  onClick={() => handleCollectAllStore(group.store.id, group.trackers.map(t => t.id))}
                  disabled={isRefreshing.has(`store_${group.store.id}`)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                    isRefreshing.has(`store_${group.store.id}`)
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-indigo-600 hover:bg-indigo-50 hover:shadow-md'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing.has(`store_${group.store.id}`) ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">전체 수집</span>
                  <span className="sm:hidden">수집</span>
                </button>
              </div>

              {/* 추적 키워드 목록 */}
              <div className="space-y-3">
                {group.trackers.map((tracker) => (
                  <div
                    key={tracker.id}
                    className="bg-white/90 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:shadow-md transition-all"
                  >
                    {/* 키워드명과 상태 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        <span className={`font-bold text-sm sm:text-base ${group.color.text} truncate`}>
                          {tracker.keyword}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {tracker.update_frequency === 'daily_once' ? '1회/일' : 
                           tracker.update_frequency === 'daily_twice' ? '2회/일' : '3회/일'}
                        </span>
                        {!tracker.is_active && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium flex-shrink-0">
                            일시정지
                          </span>
                        )}
                      </div>
                      {tracker.last_collected_at && (
                        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(tracker.last_collected_at).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 최근 지표 */}
                    {latestMetrics[tracker.id] ? (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {/* 순위 */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2 sm:p-2.5">
                          <div className="text-xs text-blue-600 font-medium mb-0.5 sm:mb-1">순위</div>
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-lg sm:text-xl font-bold text-blue-700">
                              {latestMetrics[tracker.id].rank || '-'}
                            </span>
                            {previousMetrics[tracker.id] && latestMetrics[tracker.id].rank && previousMetrics[tracker.id]!.rank ? (
                              (() => {
                                const change = latestMetrics[tracker.id].rank! - previousMetrics[tracker.id]!.rank!
                                return change !== 0 ? (
                                  <span className={`text-xs font-medium flex items-center gap-0.5 ${change > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                    {change > 0 ? '↓' : '↑'}{Math.abs(change)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )
                              })()
                            ) : (
                              <span className="text-xs text-gray-400">신규</span>
                            )}
                          </div>
                        </div>
                        
                        {/* 방문자 리뷰 */}
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2 sm:p-2.5">
                          <div className="text-xs text-green-600 font-medium mb-0.5 sm:mb-1 flex items-center justify-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span className="hidden sm:inline">방문자</span>
                          </div>
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-base sm:text-lg font-bold text-green-700">
                              {latestMetrics[tracker.id].visitor_review_count.toLocaleString()}
                            </span>
                            {previousMetrics[tracker.id] ? (
                              (() => {
                                const change = latestMetrics[tracker.id].visitor_review_count - previousMetrics[tracker.id]!.visitor_review_count
                                return change !== 0 ? (
                                  <span className={`text-xs font-medium flex items-center gap-0.5 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {change > 0 ? '↑' : '↓'}{Math.abs(change)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )
                              })()
                            ) : (
                              <span className="text-xs text-gray-400">신규</span>
                            )}
                          </div>
                        </div>
                        
                        {/* 블로그 리뷰 */}
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-2 sm:p-2.5">
                          <div className="text-xs text-amber-600 font-medium mb-0.5 sm:mb-1 flex items-center justify-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span className="hidden sm:inline">블로그</span>
                          </div>
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-base sm:text-lg font-bold text-amber-700">
                              {latestMetrics[tracker.id].blog_review_count.toLocaleString()}
                            </span>
                            {previousMetrics[tracker.id] ? (
                              (() => {
                                const change = latestMetrics[tracker.id].blog_review_count - previousMetrics[tracker.id]!.blog_review_count
                                return change !== 0 ? (
                                  <span className={`text-xs font-medium flex items-center gap-0.5 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {change > 0 ? '↑' : '↓'}{Math.abs(change)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )
                              })()
                            ) : (
                              <span className="text-xs text-gray-400">신규</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-gray-400 bg-gray-50 rounded-lg py-3 mb-3">
                        데이터 수집 중...
                      </div>
                    )}

                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        onClick={() => handleViewMetrics(tracker)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs sm:text-sm font-medium transition-all"
                      >
                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">지표</span>
                      </button>
                      <button
                        onClick={() => handleCollectNow(tracker.id)}
                        disabled={isRefreshing.has(tracker.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs sm:text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing.has(tracker.id) ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">수집</span>
                      </button>
                      <button
                        onClick={() => handleEditSettings(tracker)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg text-xs sm:text-sm font-medium transition-all"
                      >
                        <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">설정</span>
                      </button>
                      <button
                        onClick={() => handleDelete(tracker.id, tracker.keyword)}
                        className="flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs sm:text-sm font-medium transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>

                    {/* 모바일: 마지막 수집 시간 */}
                    {tracker.last_collected_at && (
                      <div className="sm:hidden flex items-center gap-1 text-xs text-gray-400 mt-2 pt-2 border-t">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(tracker.last_collected_at).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 추적 추가 모달 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>추적 추가</DialogTitle>
            <DialogDescription>
              새로운 키워드 추적을 시작합니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">매장 선택</label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">매장을 선택하세요</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.store_name || store.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">키워드</label>
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="예: 강남 카페"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">수집 주기</label>
              <select
                value={updateFrequency}
                onChange={(e) => setUpdateFrequency(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="daily_once">하루 1회</option>
                <option value="daily_twice">하루 2회</option>
                <option value="daily_thrice">하루 3회</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              onClick={handleAddTracker}
              disabled={isAdding}
              className="flex-1"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : '추가'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 지표 보기 모달 */}
      <Dialog open={showMetricsDialog} onOpenChange={setShowMetricsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTracker?.keyword} 지표
            </DialogTitle>
            <DialogDescription>
              {selectedTracker?.store_name}
            </DialogDescription>
          </DialogHeader>
          {loadingMetrics ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : metrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              아직 수집된 지표가 없습니다
            </div>
          ) : (
            <div className="space-y-4">
              {/* 차트 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-4">순위 변화</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[...metrics].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="collection_date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis reversed domain={[1, 'dataMax']} />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString('ko-KR')}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="rank" stroke="#3b82f6" name="순위" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 지표 테이블 */}
              <div>
                <h4 className="font-semibold mb-2">상세 지표</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">날짜</th>
                        <th className="px-4 py-2 text-center">순위</th>
                        <th className="px-4 py-2 text-center">방문자리뷰</th>
                        <th className="px-4 py-2 text-center">블로그리뷰</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((metric) => (
                        <tr key={metric.id} className="border-t">
                          <td className="px-4 py-2">
                            {new Date(metric.collection_date).toLocaleDateString('ko-KR')}
                          </td>
                          <td className="px-4 py-2 text-center font-bold">
                            {metric.rank || '-'}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {metric.visitor_review_count}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {metric.blog_review_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 설정 수정 모달 */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>추적 설정</DialogTitle>
            <DialogDescription>
              {editingTracker?.keyword} - {editingTracker?.store_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">수집 주기</label>
              <select
                value={editFrequency}
                onChange={(e) => setEditFrequency(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="daily_once">하루 1회</option>
                <option value="daily_twice">하루 2회</option>
                <option value="daily_thrice">하루 3회</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSettingsDialog(false)}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              onClick={handleUpdateSettings}
              className="flex-1"
            >
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
