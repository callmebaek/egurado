"use client"

/**
 * 주요지표 추적 페이지 - Apple Style Premium Design
 * Glassmorphism, Dynamic Gradients, Smooth Animations
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
  Eye,
  Bell,
  BellOff,
  Mail,
  Phone,
  MessageCircle,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Switch } from "@/components/ui/switch"
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
  update_times: number[] // 수집 시간 배열 (0-23시)
  is_active: boolean
  last_collected_at?: string
  created_at: string
  notification_enabled: boolean
  notification_type?: 'kakao' | 'sms' | 'email' | null
}

interface DailyMetric {
  id: string
  collection_date: string
  rank?: number
  visitor_review_count: number
  blog_review_count: number
  rank_change?: number
}

interface SearchedKeyword {
  id: string
  keyword: string
  store_id: string
  last_searched_at: string
  is_tracked: boolean
}

interface StoreGroup {
  store: Store
  trackers: MetricTracker[]
  colorIndex: number
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
  const [updateTimes, setUpdateTimes] = useState<number[]>([16]) // 기본: 16시 (오후 4시)
  const [notificationEnabled, setNotificationEnabled] = useState(false)
  const [notificationType, setNotificationType] = useState<'email' | 'sms' | 'kakao' | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [searchedKeywords, setSearchedKeywords] = useState<SearchedKeyword[]>([])
  const [loadingKeywords, setLoadingKeywords] = useState(false)

  // 지표 보기 모달
  const [showMetricsDialog, setShowMetricsDialog] = useState(false)
  const [selectedTracker, setSelectedTracker] = useState<MetricTracker | null>(null)
  const [metrics, setMetrics] = useState<DailyMetric[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(false)

  // 설정 모달 (매장별 일괄 설정)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [editingStore, setEditingStore] = useState<{id: string, name: string} | null>(null)
  const [editingTrackers, setEditingTrackers] = useState<MetricTracker[]>([])
  const [editTrackerSettings, setEditTrackerSettings] = useState<{
    [trackerId: string]: {
      frequency: 'daily_once' | 'daily_twice' | 'daily_thrice'
      times: number[]
      notificationEnabled: boolean
      notificationType: 'email' | 'sms' | 'kakao' | ''
    }
  }>({})
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  // 주기별 기본 수집 시간 설정
  const getDefaultUpdateTimes = (frequency: 'daily_once' | 'daily_twice' | 'daily_thrice'): number[] => {
    switch(frequency) {
      case 'daily_once':
        return [16] // 16시 (오후 4시)
      case 'daily_twice':
        return [6, 16] // 6시, 16시 (오전 6시, 오후 4시)
      case 'daily_thrice':
        return [6, 12, 18] // 6시, 12시, 18시 (오전 6시, 낮 12시, 오후 6시)
      default:
        return [16]
    }
  }

  // 최근 지표 데이터
  const [latestMetrics, setLatestMetrics] = useState<{[trackerId: string]: DailyMetric}>({})
  const [previousMetrics, setPreviousMetrics] = useState<{[trackerId: string]: DailyMetric | null}>({})

  // 주기 변경 시 기본 시간 설정 (추가 모달)
  useEffect(() => {
    setUpdateTimes(getDefaultUpdateTimes(updateFrequency))
  }, [updateFrequency])

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

  // 매장 선택 시 조회된 키워드 로드
  useEffect(() => {
    if (selectedStoreId && showAddDialog) {
      loadSearchedKeywords(selectedStoreId)
    }
  }, [selectedStoreId, showAddDialog])

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

  const loadSearchedKeywords = async (storeId: string) => {
    try {
      setLoadingKeywords(true)
      const token = getToken()
      if (!token) return

      const response = await fetch(api.naver.keywords(storeId), {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        // is_tracked=false인 키워드만 필터링
        const untracked = (data.keywords || []).filter((k: SearchedKeyword) => !k.is_tracked)
        setSearchedKeywords(untracked)
      }
    } catch (error) {
      console.error("키워드 로드 실패:", error)
    } finally {
      setLoadingKeywords(false)
    }
  }

  // 매장별 그룹화
  const storeGroups = useMemo<StoreGroup[]>(() => {
    const groups: {[storeId: string]: StoreGroup} = {}

    trackers.forEach((tracker) => {
      if (!groups[tracker.store_id]) {
        const store = stores.find(s => s.id === tracker.store_id)
        if (!store) return

        const colorIndex = Object.keys(groups).length % 8
        groups[tracker.store_id] = {
          store: {
            id: store.id,
            name: store.store_name || store.name,
            thumbnail: store.thumbnail,
            platform: store.platform
          },
          trackers: [],
          colorIndex
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
          update_times: updateTimes,
          notification_enabled: notificationEnabled,
          notification_type: notificationEnabled ? notificationType : null
        })
      })

      if (response.ok) {
        toast({
          title: "✨ 추적 시작",
          description: "키워드 추적이 시작되었습니다. 첫 지표를 수집 중입니다..."
        })
        setShowAddDialog(false)
        setSelectedStoreId("")
        setNewKeyword("")
        setUpdateFrequency('daily_once')
        setUpdateTimes([9])
        setNotificationEnabled(false)
        setNotificationType(null)
        setSearchedKeywords([])
        
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

      const response = await fetch(api.metrics.collectNow(trackerId), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        // API 응답으로 받은 최신 지표 사용
        const collectedMetric = await response.json()
        
        toast({
          title: "✅ 수집 완료",
          description: "지표가 수집되었습니다"
        })
        
        // ✅ tracker의 last_collected_at 및 최신 지표 업데이트 (전체 새로고침 불필요)
        setTrackers(prev => prev.map(t => 
          t.id === trackerId 
            ? { 
                ...t, 
                last_collected_at: new Date().toISOString(),
                // 수집된 지표로 업데이트
                latest_rank: collectedMetric.rank,
                rank_change: collectedMetric.rank_change,
                visitor_review_count: collectedMetric.visitor_review_count,
                blog_review_count: collectedMetric.blog_review_count
              }
            : t
        ))
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || "지표 수집 실패")
      }
    } catch (error: any) {
      console.error("수집 실패:", error)
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

  // 매장 전체 수집 (🚀 병렬 처리로 최적화)
  const handleCollectAllStore = async (storeId: string, trackerIds: string[]) => {
    const storeKey = `store_${storeId}`
    const token = getToken()
    if (!token) return
    
    try {
      setIsRefreshing(prev => new Set(prev).add(storeKey))
      
      // 🚀 각 tracker에 개별 로딩 상태 표시
      trackerIds.forEach(trackerId => {
        setIsRefreshing(prev => new Set(prev).add(trackerId))
      })
      
      // 🚀 모든 키워드 수집을 병렬로 처리 (순차 → 병렬)
      const collectPromises = trackerIds.map(async (trackerId) => {
        try {
          const response = await fetch(api.metrics.collectNow(trackerId), {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          })

          if (response.ok) {
            const collectedMetric = await response.json()
            return {
              trackerId,
              success: true,
              metric: collectedMetric
            }
          }
          return { trackerId, success: false }
        } catch (error) {
          console.error(`Tracker ${trackerId} 수집 실패:`, error)
          return { trackerId, success: false }
        }
      })
      
      // 모든 수집 완료 대기
      const results = await Promise.all(collectPromises)
      
      // ✅ 한 번에 모든 tracker 업데이트
      setTrackers(prev => prev.map(t => {
        const result = results.find(r => r.trackerId === t.id)
        if (result && result.success && result.metric) {
          return {
            ...t,
            last_collected_at: new Date().toISOString(),
            latest_rank: result.metric.rank,
            rank_change: result.metric.rank_change,
            visitor_review_count: result.metric.visitor_review_count,
            blog_review_count: result.metric.blog_review_count
          }
        }
        return t
      }))
      
      // 개별 tracker 로딩 상태 일괄 제거
      setIsRefreshing(prev => {
        const next = new Set(prev)
        trackerIds.forEach(id => next.delete(id))
        return next
      })
      
      const successCount = results.filter(r => r.success).length
      toast({
        title: "🎉 전체 수집 완료",
        description: `${successCount}/${trackerIds.length}개 키워드의 지표가 수집되었습니다`
      })
    } catch (error) {
      console.error("전체 수집 실패:", error)
      toast({
        title: "수집 실패",
        description: "일부 키워드 수집에 실패했습니다",
        variant: "destructive"
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

  // 매장별 자동수집 설정 (여러 키워드 한번에)
  const handleEditStoreSettings = (storeId: string, storeName: string, storeTrackers: MetricTracker[]) => {
    setEditingStore({ id: storeId, name: storeName })
    setEditingTrackers(storeTrackers)
    
    // 각 tracker의 현재 설정을 초기화
    const settings: typeof editTrackerSettings = {}
    storeTrackers.forEach(tracker => {
      settings[tracker.id] = {
        frequency: tracker.update_frequency,
        times: tracker.update_times && tracker.update_times.length > 0 
          ? tracker.update_times 
          : getDefaultUpdateTimes(tracker.update_frequency),
        notificationEnabled: tracker.notification_enabled,
        notificationType: tracker.notification_type || ''
      }
    })
    setEditTrackerSettings(settings)
    setShowSettingsDialog(true)
  }

  const handleUpdateSettings = async () => {
    if (!editingStore || editingTrackers.length === 0) return

    try {
      setIsSavingSettings(true)
      const token = getToken()
      if (!token) return

      // 모든 tracker를 병렬로 업데이트
      const updatePromises = editingTrackers.map(async (tracker) => {
        const settings = editTrackerSettings[tracker.id]
        if (!settings) return null

        const response = await fetch(api.metrics.update(tracker.id), {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            update_frequency: settings.frequency,
            update_times: settings.times,
            notification_enabled: settings.notificationEnabled,
            notification_type: settings.notificationEnabled ? settings.notificationType : null
          })
        })

        if (response.ok) {
          const updatedTracker = await response.json()
          return updatedTracker
        }
        return null
      })

      const results = await Promise.all(updatePromises)
      
      // ✅ State만 업데이트 (페이지 새로고침 없음)
      setTrackers(prev => prev.map(t => {
        const updated = results.find(r => r && r.id === t.id)
        return updated ? { ...t, ...updated } : t
      }))

      toast({
        title: "✅ 설정 저장 완료",
        description: `${editingStore.name}의 자동수집 설정이 저장되었습니다`
      })
      
      setShowSettingsDialog(false)
      setEditingStore(null)
      setEditingTrackers([])
      setEditTrackerSettings({})
    } catch (error) {
      toast({
        title: "설정 저장 실패",
        description: "설정 저장 중 오류가 발생했습니다",
        variant: "destructive"
      })
    } finally {
      setIsSavingSettings(false)
    }
  }

  // 삭제 (🚀 state에서만 제거로 최적화)
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
          title: "✅ 삭제 완료",
          description: "추적 설정이 삭제되었습니다"
        })
        
        // ✅ 전체 새로고침 대신 state에서만 제거 (즉각 반영)
        setTrackers(prev => prev.filter(t => t.id !== trackerId))
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              주요지표 추적
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              매장별 키워드의 순위와 리뷰 수를 자동으로 추적합니다
            </p>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="group relative w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span>추적 추가</span>
            </div>
          </button>
        </div>

        {/* 매장별 추적 키워드 카드 */}
        {trackers.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/40 rounded-3xl border border-white/20 shadow-2xl p-8 sm:p-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 mb-6">
                <BarChart3 className="w-10 h-10 text-white" />
              </div>
              <p className="text-lg sm:text-xl text-gray-700 mb-2 font-semibold">
                추적 중인 키워드가 없습니다
              </p>
              <p className="text-sm text-gray-500">
                "추적 추가" 버튼을 눌러 키워드 추적을 시작하세요
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {storeGroups.map((group) => {
              const gradients = [
                'from-blue-500 to-cyan-500',
                'from-purple-500 to-pink-500',
                'from-green-500 to-emerald-500',
                'from-orange-500 to-red-500',
                'from-pink-500 to-rose-500',
                'from-teal-500 to-green-500',
                'from-indigo-500 to-purple-500',
                'from-yellow-500 to-orange-500',
              ]
              const gradient = gradients[group.colorIndex]

              return (
                <div
                  key={group.store.id}
                  className="group backdrop-blur-xl bg-white/60 rounded-3xl border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
                >
                  {/* Gradient Bar */}
                  <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
                  
                  {/* 매장 헤더 */}
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* 매장 썸네일 */}
                        <div className="relative">
                          {group.store.thumbnail ? (
                            <div className="relative">
                              <div className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-2xl blur-md opacity-50`} />
                              <img 
                                src={group.store.thumbnail} 
                                alt={group.store.name} 
                                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-4 border-white shadow-lg"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            </div>
                          ) : (
                            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center border-4 border-white shadow-lg`}>
                              <StoreIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* 매장명 */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-xl sm:text-2xl text-gray-800 truncate mb-1">
                            {group.store.name}
                          </h3>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs px-3 py-1 rounded-full font-bold text-white bg-gradient-to-r ${gradient} shadow-sm`}>
                              {group.store.platform === 'naver' ? '네이버' : '구글'}
                            </span>
                            <span className="text-sm text-gray-600 font-medium">
                              {group.trackers.length}개 추적중
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 자동수집설정 & 전체 수집 버튼 */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditStoreSettings(group.store.id, group.store.name, group.trackers)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md bg-white/80 border-2 ${
                            `border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-white hover:shadow-lg hover:scale-105`
                          }`}
                        >
                          <Settings className="w-4 h-4" />
                          <span className="hidden lg:inline">자동수집설정</span>
                        </button>
                        <button
                          onClick={() => handleCollectAllStore(group.store.id, group.trackers.map(t => t.id))}
                          disabled={isRefreshing.has(`store_${group.store.id}`)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${
                            isRefreshing.has(`store_${group.store.id}`)
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : `bg-gradient-to-r ${gradient} text-white hover:shadow-lg hover:scale-105`
                          }`}
                        >
                          <RefreshCw className={`w-4 h-4 ${isRefreshing.has(`store_${group.store.id}`) ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">전체 수집</span>
                        </button>
                      </div>
                    </div>

                    {/* 추적 키워드 목록 */}
                    <div className="grid gap-4">
                      {group.trackers.map((tracker) => (
                        <div
                          key={tracker.id}
                          className="backdrop-blur-sm bg-white/80 rounded-2xl p-4 sm:p-5 hover:bg-white/90 transition-all duration-300 border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md"
                        >
                          {/* 키워드명과 상태 */}
                          <div className="flex flex-col gap-3 mb-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-bold text-lg text-gray-800">
                                {tracker.keyword}
                              </span>
                              {tracker.notification_enabled && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                                  <Bell className="w-3 h-3" />
                                  <span>
                                    {tracker.notification_type === 'email' ? '이메일' :
                                     tracker.notification_type === 'sms' ? '문자' :
                                     tracker.notification_type === 'kakao' ? '카카오톡' : '알림'}
                                  </span>
                                </div>
                              )}
                              {!tracker.is_active && (
                                <span className="text-xs px-2.5 py-1 bg-red-50 text-red-600 rounded-full font-medium">
                                  일시정지
                                </span>
                              )}
                            </div>
                            
                            {/* 최근 업데이트 & 자동수집 정보 */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                              <div className="flex items-center gap-2 text-gray-500">
                                <Clock className="w-3.5 h-3.5" />
                                {isRefreshing.has(tracker.id) ? (
                                  <span className="flex items-center gap-1.5 text-blue-500 font-medium">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    수집 중...
                                  </span>
                                ) : tracker.last_collected_at ? (
                                  <span>
                                    최근 업데이트: {new Date(tracker.last_collected_at).toLocaleDateString('ko-KR', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                ) : (
                                  <span>최근 업데이트: 수집 대기중</span>
                                )}
                              </div>
                              <span className="hidden sm:inline text-gray-300">|</span>
                              <div className="flex items-center gap-2 text-gray-500">
                                <Settings className="w-3.5 h-3.5" />
                                <span>
                                  자동수집: {tracker.update_frequency === 'daily_once' ? '1회/일' : 
                                           tracker.update_frequency === 'daily_twice' ? '2회/일' : '3회/일'}
                                  {tracker.update_times && tracker.update_times.length > 0 && (
                                    <span className="ml-1 text-gray-400">
                                      ({tracker.update_times.map(t => `${t < 10 ? '0' : ''}${t}시`).join(', ')})
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 최근 지표 */}
                          {isRefreshing.has(tracker.id) ? (
                            <div className="text-center text-sm text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl py-8 mb-4 border border-gray-200">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                              <p className="font-semibold text-gray-600">지표 수집 중...</p>
                              <p className="text-xs text-gray-400 mt-1">잠시만 기다려주세요</p>
                            </div>
                          ) : tracker.latest_rank !== undefined || tracker.visitor_review_count !== undefined ? (
                            <div className="grid grid-cols-3 gap-3 mb-4">
                              {/* 순위 (✅ 백엔드에서 제공하는 데이터 직접 사용) */}
                              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 sm:p-4 border border-blue-200/50">
                                <div className="text-xs text-blue-600 font-semibold mb-2 flex items-center gap-1.5">
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  <span>순위</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-2xl sm:text-3xl font-bold text-blue-700">
                                    {tracker.latest_rank || '-'}
                                  </span>
                                  {tracker.rank_change !== undefined && tracker.rank_change !== null && tracker.rank_change !== 0 ? (
                                    <span className={`text-xs font-bold flex items-center gap-0.5 mt-1 ${tracker.rank_change > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                      {tracker.rank_change > 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                                      {Math.abs(tracker.rank_change)}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-400 mt-1">{tracker.rank_change === 0 ? '변동없음' : '신규'}</span>
                                  )}
                                </div>
                              </div>
                              
                              {/* 방문자 리뷰 (✅ 백엔드에서 제공하는 데이터 직접 사용) */}
                              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-3 sm:p-4 border border-green-200/50">
                                <div className="text-xs text-green-600 font-semibold mb-2 flex items-center gap-1.5">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">방문자</span>
                                  <span className="sm:hidden">방문</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-xl sm:text-2xl font-bold text-green-700">
                                    {tracker.visitor_review_count?.toLocaleString() || '0'}
                                  </span>
                                  {tracker.visitor_review_change !== undefined && tracker.visitor_review_change !== null && tracker.visitor_review_change !== 0 ? (
                                    <span className={`text-xs font-bold flex items-center gap-0.5 mt-1 ${tracker.visitor_review_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {tracker.visitor_review_change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                      {Math.abs(tracker.visitor_review_change)}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-400 mt-1">{tracker.visitor_review_change === 0 ? '변동없음' : '신규'}</span>
                                  )}
                                </div>
                              </div>
                              
                              {/* 블로그 리뷰 (✅ 백엔드에서 제공하는 데이터 직접 사용) */}
                              <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl p-3 sm:p-4 border border-amber-200/50">
                                <div className="text-xs text-amber-600 font-semibold mb-2 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">블로그</span>
                                  <span className="sm:hidden">블로그</span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-xl sm:text-2xl font-bold text-amber-700">
                                    {tracker.blog_review_count?.toLocaleString() || '0'}
                                  </span>
                                  {tracker.blog_review_change !== undefined && tracker.blog_review_change !== null && tracker.blog_review_change !== 0 ? (
                                    <span className={`text-xs font-bold flex items-center gap-0.5 mt-1 ${tracker.blog_review_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {tracker.blog_review_change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                      {Math.abs(tracker.blog_review_change)}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-400 mt-1">{tracker.blog_review_change === 0 ? '변동없음' : '신규'}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-sm text-gray-400 bg-gray-50 rounded-xl py-4 mb-4">
                              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                              데이터 수집 중...
                            </div>
                          )}

                          {/* 액션 버튼 */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewMetrics(tracker)}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                            >
                              <Eye className="w-4 h-4" />
                              <span className="hidden sm:inline">지표 보기</span>
                              <span className="sm:hidden">지표</span>
                            </button>
                            <button
                              onClick={() => handleCollectNow(tracker.id)}
                              disabled={isRefreshing.has(tracker.id)}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                              <RefreshCw className={`w-4 h-4 ${isRefreshing.has(tracker.id) ? 'animate-spin' : ''}`} />
                              <span className="hidden sm:inline">지금 수집</span>
                              <span className="sm:hidden">수집</span>
                            </button>
                            <button
                              onClick={() => handleDelete(tracker.id, tracker.keyword)}
                              className="flex items-center justify-center px-3 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 추적 추가 모달 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg backdrop-blur-xl bg-white/95 border-2 border-white/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              추적 추가
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              새로운 키워드 추적을 시작합니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div>
              <label className="text-sm font-semibold mb-2 block text-gray-700">매장 선택</label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
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
              <label className="text-sm font-semibold mb-2 block text-gray-700">키워드</label>
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="예: 강남 카페"
                className="border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent h-12"
              />
              
              {/* 조회된 키워드 목록 */}
              {selectedStoreId && (
                <div className="mt-3">
                  {loadingKeywords ? (
                    <div className="text-center py-3">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto text-gray-400" />
                    </div>
                  ) : searchedKeywords.length > 0 ? (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">최근 조회한 키워드 (클릭하여 선택)</p>
                      <div className="flex flex-wrap gap-2">
                        {searchedKeywords.map((kw) => (
                          <button
                            key={kw.id}
                            onClick={() => setNewKeyword(kw.keyword)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-all hover:scale-105"
                          >
                            {kw.keyword}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block text-gray-700">수집 주기</label>
              <select
                value={updateFrequency}
                onChange={(e) => {
                  const newFrequency = e.target.value as 'daily_once' | 'daily_twice' | 'daily_thrice'
                  setUpdateFrequency(newFrequency)
                  // 수집 주기 변경 시 기본 시간으로 자동 설정
                  setUpdateTimes(getDefaultUpdateTimes(newFrequency))
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
              >
                <option value="daily_once">하루 1회</option>
                <option value="daily_twice">하루 2회</option>
                <option value="daily_thrice">하루 3회</option>
              </select>
            </div>

            {/* 수집 시간 */}
            <div>
              <label className="text-sm font-semibold mb-2 block text-gray-700">수집 시간</label>
              <div className="space-y-2">
                {updateTimes.map((time, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 w-16">
                      {index + 1}차
                    </span>
                    <select
                      value={time}
                      onChange={(e) => {
                        const newTimes = [...updateTimes]
                        newTimes[index] = parseInt(e.target.value)
                        setUpdateTimes(newTimes)
                      }}
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i}시
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* 순위 알림받기 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block">순위 알림받기</label>
                  <p className="text-xs text-gray-500 mt-1">순위 변동 시 알림을 받습니다</p>
                </div>
                <Switch
                  checked={notificationEnabled}
                  onCheckedChange={(checked) => {
                    setNotificationEnabled(checked)
                    if (!checked) {
                      setNotificationType(null)
                    }
                  }}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>

              {notificationEnabled && (
                <div className="pl-4 border-l-2 border-blue-200">
                  <label className="text-sm font-medium mb-2 block text-gray-600">알림 방법</label>
                  <select
                    value={notificationType || ''}
                    onChange={(e) => setNotificationType(e.target.value as 'email' | 'sms' | 'kakao')}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                  >
                    <option value="">알림 방법 선택</option>
                    <option value="email">📧 이메일</option>
                    <option value="sms">📱 SMS</option>
                    <option value="kakao">💬 카카오톡</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 순위 변동 시 선택한 방법으로 알림을 받습니다
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false)
                setSearchedKeywords([])
              }}
              className="flex-1 h-12 rounded-xl border-2"
            >
              취소
            </Button>
            <Button
              onClick={handleAddTracker}
              disabled={isAdding}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg"
            >
              {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : '추가'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 지표 보기 모달 */}
      <Dialog open={showMetricsDialog} onOpenChange={setShowMetricsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto backdrop-blur-xl bg-white/95 border-2 border-white/40 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {selectedTracker?.keyword} 지표
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {selectedTracker?.store_name}
            </DialogDescription>
          </DialogHeader>
          {loadingMetrics ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
          ) : metrics.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              아직 수집된 지표가 없습니다
            </div>
          ) : (
            <div className="space-y-6">
              {/* 차트 */}
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-200">
                <h4 className="font-bold text-lg mb-4 text-gray-800">순위 변화</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[...metrics].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="collection_date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      stroke="#6b7280"
                    />
                    <YAxis reversed domain={[1, 'dataMax']} stroke="#6b7280" />
                    <Tooltip 
                      labelFormatter={(date) => new Date(date).toLocaleDateString('ko-KR')}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="rank" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      name="순위" 
                      dot={{ fill: '#3b82f6', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 지표 테이블 */}
              <div>
                <h4 className="font-bold text-lg mb-3 text-gray-800">상세 지표</h4>
                <div className="border-2 border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold text-gray-700">날짜</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-700">순위</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-700">순위변동</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-700">방문자리뷰</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-700">방문자변동</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-700">블로그리뷰</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-700">블로그변동</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((metric, index) => {
                        // 이전 데이터와 비교 (역순이므로 다음 index)
                        const prevMetric = metrics[index + 1]
                        
                        // 변동값 계산
                        const rankChange = prevMetric && metric.rank && prevMetric.rank 
                          ? metric.rank - prevMetric.rank 
                          : null
                        const visitorChange = prevMetric 
                          ? metric.visitor_review_count - prevMetric.visitor_review_count 
                          : null
                        const blogChange = prevMetric 
                          ? metric.blog_review_count - prevMetric.blog_review_count 
                          : null
                        
                        return (
                          <tr key={metric.id} className={`border-t border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                              {new Date(metric.collection_date).toLocaleDateString('ko-KR')}
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-blue-600">
                              {metric.rank || '-'}
                            </td>
                            <td className="px-3 py-3 text-center font-semibold">
                              {rankChange === null ? (
                                <span className="text-gray-400">-</span>
                              ) : rankChange === 0 ? (
                                <span className="text-gray-500">-</span>
                              ) : (
                                <span className={rankChange < 0 ? 'text-red-600' : 'text-blue-600'}>
                                  {rankChange < 0 ? '+' : '-'}{Math.abs(rankChange)}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center text-gray-700">
                              {metric.visitor_review_count.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-center font-semibold">
                              {visitorChange === null ? (
                                <span className="text-gray-400">-</span>
                              ) : visitorChange === 0 ? (
                                <span className="text-gray-500">-</span>
                              ) : (
                                <span className={visitorChange > 0 ? 'text-red-600' : 'text-blue-600'}>
                                  {visitorChange > 0 ? '+' : ''}{visitorChange.toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center text-gray-700">
                              {metric.blog_review_count.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-center font-semibold">
                              {blogChange === null ? (
                                <span className="text-gray-400">-</span>
                              ) : blogChange === 0 ? (
                                <span className="text-gray-500">-</span>
                              ) : (
                                <span className={blogChange > 0 ? 'text-red-600' : 'text-blue-600'}>
                                  {blogChange > 0 ? '+' : ''}{blogChange.toLocaleString()}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 매장별 자동수집 설정 모달 */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden backdrop-blur-xl bg-white/95 border-2 border-white/40 shadow-2xl flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              자동수집 설정
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {editingStore?.name} - 추적중인 키워드별 자동수집 시간을 설정합니다
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-4">
              {editingTrackers.map((tracker) => {
                const settings = editTrackerSettings[tracker.id]
                if (!settings) return null

                const frequencyCount = settings.frequency === 'daily_once' ? 1 :
                                      settings.frequency === 'daily_twice' ? 2 : 3

                return (
                  <div key={tracker.id} className="border-2 border-gray-200 rounded-2xl p-5 bg-white/50 hover:bg-white/80 transition-all">
                    {/* 키워드명 */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg text-gray-800">{tracker.keyword}</h3>
                      {tracker.notification_enabled && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                          <Bell className="w-3 h-3" />
                          <span>알림 설정됨</span>
                        </div>
                      )}
                    </div>

                    {/* 수집 주기 */}
                    <div className="mb-4">
                      <label className="text-sm font-semibold mb-2 block text-gray-700">수집 주기</label>
                      <select
                        value={settings.frequency}
                        onChange={(e) => {
                          const newFrequency = e.target.value as 'daily_once' | 'daily_twice' | 'daily_thrice'
                          setEditTrackerSettings(prev => ({
                            ...prev,
                            [tracker.id]: {
                              ...prev[tracker.id],
                              frequency: newFrequency,
                              times: getDefaultUpdateTimes(newFrequency)
                            }
                          }))
                        }}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                      >
                        <option value="daily_once">하루 1회</option>
                        <option value="daily_twice">하루 2회</option>
                        <option value="daily_thrice">하루 3회</option>
                      </select>
                    </div>

                    {/* 수집 시간 */}
                    <div className="mb-4">
                      <label className="text-sm font-semibold mb-2 block text-gray-700">수집 시간</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {settings.times.slice(0, frequencyCount).map((time, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 w-12">
                              {index + 1}회차
                            </span>
                            <select
                              value={time}
                              onChange={(e) => {
                                const newTimes = [...settings.times]
                                newTimes[index] = parseInt(e.target.value)
                                setEditTrackerSettings(prev => ({
                                  ...prev,
                                  [tracker.id]: {
                                    ...prev[tracker.id],
                                    times: newTimes
                                  }
                                }))
                              }}
                              className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-sm"
                            >
                              {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>
                                  {i < 10 ? `0${i}:00` : `${i}:00`}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 순위 알림받기 */}
                    <div className="space-y-3 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-gray-700">순위 알림받기</label>
                        <button
                          onClick={() => {
                            setEditTrackerSettings(prev => ({
                              ...prev,
                              [tracker.id]: {
                                ...prev[tracker.id],
                                notificationEnabled: !prev[tracker.id].notificationEnabled
                              }
                            }))
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                            settings.notificationEnabled ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.notificationEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      {settings.notificationEnabled && (
                        <div className="space-y-2 pl-4 border-l-2 border-blue-200">
                          <p className="text-xs text-gray-500 mb-2">알림 방법 선택</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                              onClick={() => {
                                setEditTrackerSettings(prev => ({
                                  ...prev,
                                  [tracker.id]: {
                                    ...prev[tracker.id],
                                    notificationType: 'email'
                                  }
                                }))
                              }}
                              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all ${
                                settings.notificationType === 'email'
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <Mail className={`w-4 h-4 ${settings.notificationType === 'email' ? 'text-blue-600' : 'text-gray-400'}`} />
                              <span className={`text-sm font-medium ${settings.notificationType === 'email' ? 'text-blue-600' : 'text-gray-600'}`}>
                                이메일
                              </span>
                            </button>
                            <button
                              onClick={() => {
                                setEditTrackerSettings(prev => ({
                                  ...prev,
                                  [tracker.id]: {
                                    ...prev[tracker.id],
                                    notificationType: 'sms'
                                  }
                                }))
                              }}
                              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all ${
                                settings.notificationType === 'sms'
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <Phone className={`w-4 h-4 ${settings.notificationType === 'sms' ? 'text-blue-600' : 'text-gray-400'}`} />
                              <span className={`text-sm font-medium ${settings.notificationType === 'sms' ? 'text-blue-600' : 'text-gray-600'}`}>
                                문자
                              </span>
                            </button>
                            <button
                              onClick={() => {
                                setEditTrackerSettings(prev => ({
                                  ...prev,
                                  [tracker.id]: {
                                    ...prev[tracker.id],
                                    notificationType: 'kakao'
                                  }
                                }))
                              }}
                              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all ${
                                settings.notificationType === 'kakao'
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <MessageCircle className={`w-4 h-4 ${settings.notificationType === 'kakao' ? 'text-blue-600' : 'text-gray-400'}`} />
                              <span className={`text-sm font-medium ${settings.notificationType === 'kakao' ? 'text-blue-600' : 'text-gray-600'}`}>
                                카카오톡
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            
            <p className="text-xs text-gray-500 mt-4 text-center">
              ℹ️ 설정한 시간에 자동으로 지표를 수집합니다 (한국시간 기준)
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowSettingsDialog(false)
                setEditingStore(null)
                setEditingTrackers([])
                setEditTrackerSettings({})
              }}
              disabled={isSavingSettings}
              className="flex-1 h-12 rounded-xl border-2"
            >
              취소
            </Button>
            <Button
              onClick={handleUpdateSettings}
              disabled={isSavingSettings}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg disabled:opacity-50"
            >
              {isSavingSettings ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  저장 중...
                </span>
              ) : (
                '저장'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
