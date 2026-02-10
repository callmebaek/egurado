"use client"

/**
 * 키워드순위 추적 페이지 - TurboTax Style
 * 대시보드 매장 카드 디자인 통일 + 모바일 완벽 반응형
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
  Eye,
  Bell,
  Mail,
  Phone,
  MessageCircle,
  Sparkles,
  Search,
  Users,
  MapPin
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Switch } from "@/components/ui/switch"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState, useEffect, useMemo } from "react"
import { api } from "@/lib/config"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { notifyCreditUsed } from "@/lib/credit-utils"

// 대시보드와 동일한 매장별 색상 팔레트
const STORE_COLORS = [
  { bg: 'bg-white', border: 'border-emerald-500', text: 'text-neutral-900', badge: 'bg-emerald-500', accent: 'bg-emerald-100', platformBg: 'bg-success' },
  { bg: 'bg-white', border: 'border-neutral-300', text: 'text-neutral-900', badge: 'bg-neutral-700', accent: 'bg-neutral-100', platformBg: 'bg-neutral-700' },
  { bg: 'bg-white', border: 'border-emerald-400', text: 'text-neutral-900', badge: 'bg-emerald-400', accent: 'bg-emerald-50', platformBg: 'bg-success' },
  { bg: 'bg-white', border: 'border-neutral-400', text: 'text-neutral-900', badge: 'bg-neutral-600', accent: 'bg-neutral-50', platformBg: 'bg-neutral-600' },
  { bg: 'bg-white', border: 'border-emerald-300', text: 'text-neutral-900', badge: 'bg-emerald-600', accent: 'bg-emerald-100', platformBg: 'bg-success' },
  { bg: 'bg-white', border: 'border-neutral-300', text: 'text-neutral-900', badge: 'bg-neutral-700', accent: 'bg-neutral-100', platformBg: 'bg-neutral-700' },
  { bg: 'bg-white', border: 'border-emerald-500', text: 'text-neutral-900', badge: 'bg-emerald-500', accent: 'bg-emerald-100', platformBg: 'bg-success' },
  { bg: 'bg-white', border: 'border-neutral-400', text: 'text-neutral-900', badge: 'bg-neutral-600', accent: 'bg-neutral-50', platformBg: 'bg-neutral-600' },
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

  // 경쟁매장 보기 모달
  const [showCompetitorDialog, setShowCompetitorDialog] = useState(false)
  const [competitorKeyword, setCompetitorKeyword] = useState("")
  const [competitorStoreId, setCompetitorStoreId] = useState("")
  const [competitorMyRank, setCompetitorMyRank] = useState<number | null>(null)
  const [competitorTotalCount, setCompetitorTotalCount] = useState(0)
  const [competitors, setCompetitors] = useState<{
    rank: number
    place_id: string
    name: string
    category: string
    address: string
    road_address: string
    rating: number | null
    visitor_review_count: number
    blog_review_count: number
    thumbnail: string
    is_my_store: boolean
  }[]>([])
  const [loadingCompetitors, setLoadingCompetitors] = useState(false)
  // 경쟁매장 데이터 캐시 (keyword_storeId → data)
  const [competitorCache, setCompetitorCache] = useState<Record<string, {competitors: typeof competitors, myRank: number | null, totalCount: number}>>({})

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
        
        // 각 tracker의 최근 지표는 개별 트래커 선택 시 로드됨
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

        // ✨ 크레딧 실시간 차감 알림
        notifyCreditUsed(2, token)
        
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
      
      // ✨ 크레딧 실시간 차감 알림 (성공한 수집 개수만큼)
      if (successCount > 0) {
        notifyCreditUsed(successCount * 2, token)
      }
      
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

  // 경쟁매장 API 조회 (내부 함수)
  const fetchCompetitorData = async (keyword: string, storeId: string) => {
    setCompetitors([])
    setCompetitorMyRank(null)
    setCompetitorTotalCount(0)
    setLoadingCompetitors(true)

    try {
      const token = getToken()
      if (!token) return

      const response = await fetch(api.metrics.competitors(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          keyword,
          store_id: storeId
        })
      })

      if (response.ok) {
        const data = await response.json()
        const competitorData = data.competitors || []
        const myRank = data.my_rank
        const totalCount = data.total_count || 0
        
        setCompetitors(competitorData)
        setCompetitorMyRank(myRank)
        setCompetitorTotalCount(totalCount)
        
        // 캐시에 저장
        const cacheKey = `${keyword}_${storeId}`
        setCompetitorCache(prev => ({
          ...prev,
          [cacheKey]: { competitors: competitorData, myRank, totalCount }
        }))
        
        // 크레딧 사용 알림
        notifyCreditUsed(5, token)
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast({
          title: "조회 실패",
          description: errorData.detail || "경쟁매장 조회 중 오류가 발생했습니다",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "조회 실패",
        description: "경쟁매장 조회 중 오류가 발생했습니다",
        variant: "destructive"
      })
    } finally {
      setLoadingCompetitors(false)
    }
  }

  // 경쟁매장 보기 (캐시 지원)
  const handleViewCompetitors = async (tracker: MetricTracker) => {
    const cacheKey = `${tracker.keyword}_${tracker.store_id}`
    
    setCompetitorKeyword(tracker.keyword)
    setCompetitorStoreId(tracker.store_id)
    setShowCompetitorDialog(true)
    
    // 캐시 확인
    if (competitorCache[cacheKey]) {
      const cached = competitorCache[cacheKey]
      setCompetitors(cached.competitors)
      setCompetitorMyRank(cached.myRank)
      setCompetitorTotalCount(cached.totalCount)
      setLoadingCompetitors(false)
      return
    }
    
    // 캐시 없으면 API 조회
    await fetchCompetitorData(tracker.keyword, tracker.store_id)
  }

  // 경쟁매장 강제 새로고침
  const handleForceRefreshCompetitors = async () => {
    await fetchCompetitorData(competitorKeyword, competitorStoreId)
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
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <div className="relative inline-block">
            <Loader2 className="h-12 w-12 md:h-16 md:w-16 animate-spin text-emerald-600 mx-auto mb-4" />
            <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-brand-red absolute top-0 right-0 animate-pulse" />
          </div>
          <p className="text-neutral-900 text-lg md:text-xl font-bold leading-tight">데이터를 불러오는 중...</p>
          <p className="text-neutral-600 text-sm md:text-base mt-2">잠시만 기다려주세요</p>
        </div>
      </div>
    )
  }

  if (!hasStores) {
    return <EmptyStoreMessage />
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10 overflow-x-hidden">
      {/* 헤더 섹션 */}
      <header className="mb-6 md:mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-11 h-11 md:w-12 md:h-12 bg-emerald-600 rounded-button flex items-center justify-center shadow-button">
            <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-neutral-900 leading-tight">
            키워드순위 추적
          </h1>
        </div>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed max-w-3xl mx-auto mb-4">
          매장별 주요 키워드의 순위 변화와<br className="md:hidden" />
          <span className="hidden md:inline"> </span>리뷰 수를 자동으로 추적하고 알림을 받을 수 있습니다
        </p>
        <div className="flex items-center justify-center gap-2.5">
          <Badge 
            variant="secondary"
            className="bg-emerald-100 text-emerald-700 border-emerald-200 px-3 py-1.5 text-xs md:text-sm font-bold inline-flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            자동 추적
          </Badge>
          <button
            onClick={() => setShowAddDialog(true)}
            className="h-10 md:h-11 px-4 md:px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-button font-bold shadow-button hover:shadow-button-hover active:scale-95 transition-all duration-200 text-sm flex items-center gap-1.5 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            추적 추가
          </button>
        </div>
      </header>

      {/* 매장별 추적 키워드 카드 */}
      {trackers.length === 0 ? (
        <div className="bg-white rounded-card border border-neutral-300 shadow-card p-8 sm:p-12">
          <div className="text-center">
            <div className="bg-neutral-100 rounded-full w-20 h-20 md:w-24 md:h-24 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-10 h-10 md:w-12 md:h-12 text-neutral-400" />
            </div>
            <p className="text-neutral-700 mb-2 text-lg font-bold">
              추적 중인 키워드가 없습니다
            </p>
            <p className="text-sm text-neutral-600 mb-6">
              "추적 추가" 버튼을 눌러 키워드 추적을 시작하세요
            </p>
            <button
              onClick={() => setShowAddDialog(true)}
              className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white font-bold rounded-button shadow-button hover:bg-emerald-700 hover:shadow-button-hover active:scale-95 transition-all duration-200 text-base"
            >
              추적 시작하기
              <Plus className="ml-2 w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 w-full overflow-x-hidden">
          {storeGroups.map((group) => {
            const storeColor = STORE_COLORS[group.colorIndex % STORE_COLORS.length]

            return (
              <div
                key={group.store.id}
                className={`relative p-3 md:p-4 rounded-card border-2 ${storeColor.border} ${storeColor.bg} shadow-card hover:shadow-card-hover transition-all duration-200 w-full overflow-hidden`}
              >
                {/* 매장 헤더 - 대시보드 스타일 */}
                <div className="flex items-center justify-between mb-3 w-full min-w-0">
                  <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                    {/* 매장 썸네일 */}
                    {group.store.thumbnail ? (
                      <img 
                        src={group.store.thumbnail} 
                        alt={group.store.name} 
                        className="w-10 h-10 md:w-12 md:h-12 rounded-button object-cover border-2 border-neutral-200 shadow-sm flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-button bg-neutral-100 flex items-center justify-center border-2 border-neutral-200 shadow-sm flex-shrink-0">
                        <StoreIcon className="w-5 h-5 text-neutral-500" />
                      </div>
                    )}
                    
                    {/* 매장명 + 플랫폼 */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-base md:text-lg ${storeColor.text} truncate leading-tight mb-1`}>
                        {group.store.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-bold text-white ${
                          group.store.platform === 'naver' ? 'bg-success' : 'bg-info'
                        }`}>
                          {group.store.platform === 'naver' ? 'N' : 'G'}
                        </span>
                        <span className="text-xs text-neutral-600 font-medium">
                          {group.trackers.length}개 추적중
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 자동수집설정 & 전체 수집 버튼 */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => handleEditStoreSettings(group.store.id, group.store.name, group.trackers)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-button font-bold text-xs transition-all duration-200 min-h-[44px] bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 hover:shadow-sm active:scale-95"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden md:inline">자동수집설정</span>
                    <span className="md:hidden">설정</span>
                  </button>
                  <button
                    onClick={() => handleCollectAllStore(group.store.id, group.trackers.map(t => t.id))}
                    disabled={isRefreshing.has(`store_${group.store.id}`)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-button font-bold text-xs transition-all duration-200 min-h-[44px] ${
                      isRefreshing.has(`store_${group.store.id}`)
                        ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-button hover:shadow-button-hover active:scale-95'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing.has(`store_${group.store.id}`) ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">전체 수집</span>
                    <span className="sm:hidden">수집</span>
                  </button>
                </div>

                {/* 추적 키워드 목록 */}
                <div className="space-y-2 w-full overflow-hidden">
                  {group.trackers.map((tracker) => (
                    <div
                      key={tracker.id}
                      className="bg-white rounded-button border border-neutral-200 p-2.5 md:p-3 shadow-sm hover:shadow-md transition-shadow duration-200 w-full overflow-hidden"
                    >
                      {/* 키워드명 + 순위 + 수집 버튼 (대시보드 키워드 행 스타일) */}
                      <div className="flex items-center justify-between gap-2 w-full min-w-0 mb-2">
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-1.5 mb-0.5 w-full min-w-0">
                            <span className={`font-bold text-sm md:text-base ${storeColor.text} truncate block`}>
                              {tracker.keyword}
                            </span>
                            {tracker.notification_enabled && (
                              <span className="text-xs flex-shrink-0">
                                {tracker.notification_type === 'email' ? '📧' :
                                 tracker.notification_type === 'sms' ? '📱' :
                                 tracker.notification_type === 'kakao' ? '💬' : '🔔'}
                              </span>
                            )}
                            {!tracker.is_active && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-error-bg text-error rounded-full font-bold flex-shrink-0">정지</span>
                            )}
                            <span className="text-xs text-neutral-600 font-medium px-1.5 py-0.5 bg-neutral-100 rounded-full hidden md:inline flex-shrink-0">
                              {tracker.update_frequency === 'daily_once' ? '1회/일' : 
                               tracker.update_frequency === 'daily_twice' ? '2회/일' : '3회/일'}
                            </span>
                          </div>
                          {/* 수집 시간 */}
                          <div className="flex items-center gap-1 text-xs text-neutral-500">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            {isRefreshing.has(tracker.id) ? (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                수집 중...
                              </span>
                            ) : tracker.last_collected_at ? (
                              <div className="flex flex-col leading-tight md:flex-row md:gap-1">
                                <span>
                                  {new Date(tracker.last_collected_at).toLocaleString('ko-KR', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                                <span>
                                  {new Date(tracker.last_collected_at).toLocaleString('ko-KR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            ) : (
                              <span>수집 대기중</span>
                            )}
                          </div>
                        </div>
                        
                        {/* 순위 표시 - 대시보드 스타일 */}
                        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                          {isRefreshing.has(tracker.id) ? (
                            <div className="w-14 h-12 flex items-center justify-center">
                              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                            </div>
                          ) : tracker.latest_rank ? (
                            <div className="flex items-center gap-1">
                              {tracker.latest_rank >= 1 && tracker.latest_rank <= 5 && (
                                <Sparkles className="w-4 h-4 text-brand-red animate-pulse flex-shrink-0" />
                              )}
                              <div className="text-right">
                                <div className="flex items-baseline gap-0.5">
                                  <span className="text-2xl md:text-3xl font-bold text-emerald-600 leading-tight">
                                    {tracker.latest_rank}
                                  </span>
                                  <span className="text-xs md:text-sm text-neutral-600 font-medium">위</span>
                                </div>
                                {tracker.rank_change !== undefined && tracker.rank_change !== null && tracker.rank_change !== 0 && (
                                  <div className={`text-xs font-bold flex items-center justify-end gap-0.5 mt-0.5 ${
                                    tracker.rank_change > 0 ? 'text-success' : 'text-error'
                                  }`}>
                                    {tracker.rank_change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    {tracker.rank_change > 0 ? '↑' : '↓'}{Math.abs(tracker.rank_change)}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-right">
                              <span className="text-xs md:text-sm text-neutral-500 font-medium whitespace-nowrap">300위 밖</span>
                            </div>
                          )}

                          {/* 개별 수집 버튼 */}
                          <button
                            onClick={() => handleCollectNow(tracker.id)}
                            disabled={isRefreshing.has(tracker.id)}
                            className={`p-2 rounded-button transition-all duration-200 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                              isRefreshing.has(tracker.id)
                                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                                : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 hover:shadow-sm active:scale-95'
                            }`}
                            title="이 키워드 순위를 지금 수집합니다"
                          >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing.has(tracker.id) ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* 리뷰 지표 + 액션 버튼 */}
                      <div className="pt-2 border-t border-neutral-100">
                        <div className="flex items-end justify-between gap-2">
                          {/* 리뷰 지표 - 모바일: 세로, PC: 가로 */}
                          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3 text-xs min-w-0">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-neutral-500 flex-shrink-0" />
                              <span className="text-neutral-600 font-bold whitespace-nowrap">방문자</span>
                              <span className="font-bold text-neutral-900">{tracker.visitor_review_count?.toLocaleString() || '0'}</span>
                              {tracker.visitor_review_change !== undefined && tracker.visitor_review_change !== null && tracker.visitor_review_change !== 0 && (
                                <span className={`font-bold ${tracker.visitor_review_change > 0 ? 'text-success' : 'text-error'}`}>
                                  {tracker.visitor_review_change > 0 ? '+' : ''}{tracker.visitor_review_change}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="w-3 h-3 text-neutral-500 flex-shrink-0" />
                              <span className="text-neutral-600 font-bold whitespace-nowrap">블로그</span>
                              <span className="font-bold text-neutral-900">{tracker.blog_review_count?.toLocaleString() || '0'}</span>
                              {tracker.blog_review_change !== undefined && tracker.blog_review_change !== null && tracker.blog_review_change !== 0 && (
                                <span className={`font-bold ${tracker.blog_review_change > 0 ? 'text-success' : 'text-error'}`}>
                                  {tracker.blog_review_change > 0 ? '+' : ''}{tracker.blog_review_change}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 지표 + 경쟁매장 + 삭제 버튼 */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleViewMetrics(tracker)}
                              className="p-2 rounded-button bg-primary-100 text-primary-600 hover:bg-primary-200 hover:shadow-sm active:scale-95 transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center"
                              title="지표 보기"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleViewCompetitors(tracker)}
                              className="p-2 rounded-button bg-amber-100 text-amber-700 hover:bg-amber-200 hover:shadow-sm active:scale-95 transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center"
                              title="경쟁매장 보기"
                            >
                              <Users className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(tracker.id, tracker.keyword)}
                              className="p-2 rounded-button bg-red-100 text-red-600 hover:bg-red-200 hover:shadow-sm active:scale-95 transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 추적 추가 모달 - 모바일 완벽 반응형 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="w-[calc(100vw-32px)] sm:w-full sm:max-w-xl lg:max-w-2xl max-h-[calc(100vh-32px)] sm:max-h-[85vh] overflow-hidden bg-white border-2 border-neutral-200 shadow-modal rounded-modal flex flex-col p-0">
          <DialogHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-3 border-b border-neutral-200 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 md:w-10 md:h-10 bg-[#405D99] rounded-button flex items-center justify-center shadow-sm flex-shrink-0">
                <Plus className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base md:text-lg font-bold text-neutral-900">
                  키워드 추적 추가
                </DialogTitle>
                <DialogDescription className="text-xs md:text-sm text-neutral-600">
                  새로운 키워드 순위를 자동 추적하세요
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
            <div className="space-y-4">
              {/* 매장 선택 */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-neutral-700">
                  <StoreIcon className="w-3.5 h-3.5 text-[#405D99]" />
                  매장 선택
                </label>
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger className="w-full h-12 border-2 border-neutral-300 rounded-button focus:ring-2 focus:ring-[#405D99] focus:border-[#405D99] transition-all bg-white text-sm font-medium">
                    {selectedStoreId && stores.find(s => s.id === selectedStoreId) ? (
                      <div className="flex items-center gap-2">
                        {stores.find(s => s.id === selectedStoreId)?.thumbnail ? (
                          <img src={stores.find(s => s.id === selectedStoreId)!.thumbnail} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-md bg-neutral-100 flex items-center justify-center flex-shrink-0">
                            <StoreIcon className="w-4 h-4 text-neutral-400" />
                          </div>
                        )}
                        <span className="truncate">{stores.find(s => s.id === selectedStoreId)?.store_name || stores.find(s => s.id === selectedStoreId)?.name}</span>
                      </div>
                    ) : (
                      <SelectValue placeholder="매장을 선택하세요" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id} className="py-2">
                        <div className="flex items-center gap-2">
                          {store.thumbnail ? (
                            <img src={store.thumbnail} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-md bg-neutral-100 flex items-center justify-center flex-shrink-0">
                              <StoreIcon className="w-4 h-4 text-neutral-400" />
                            </div>
                          )}
                          <span className="truncate">{store.store_name || store.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 키워드 입력 */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-neutral-700">
                  <Search className="w-3.5 h-3.5 text-[#405D99]" />
                  키워드
                </label>
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="예: 강남 카페"
                  className="h-11 border-2 border-neutral-300 rounded-button focus:ring-2 focus:ring-[#405D99] focus:border-[#405D99] text-sm"
                />
                
                {/* 조회된 키워드 목록 */}
                {selectedStoreId && (
                  <div className="mt-2">
                    {loadingKeywords ? (
                      <div className="flex items-center justify-center py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-[#405D99]" />
                      </div>
                    ) : searchedKeywords.length > 0 ? (
                      <div className="bg-blue-50 rounded-button p-3 border border-blue-200">
                        <p className="text-xs font-bold text-[#405D99] mb-2 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          최근 조회한 키워드
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {searchedKeywords.map((kw) => (
                            <button
                              key={kw.id}
                              onClick={() => setNewKeyword(kw.keyword)}
                              className="px-2.5 py-1.5 bg-white text-[#405D99] rounded-md text-xs font-bold hover:bg-blue-100 active:scale-95 transition-all shadow-sm border border-blue-200 min-h-[32px]"
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

              {/* 수집 주기 & 수집 시간 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 수집 주기 */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-neutral-700">
                    <RefreshCw className="w-3.5 h-3.5 text-[#405D99]" />
                    수집 주기
                  </label>
                  <select
                    value={updateFrequency}
                    onChange={(e) => {
                      const newFrequency = e.target.value as 'daily_once' | 'daily_twice' | 'daily_thrice'
                      setUpdateFrequency(newFrequency)
                      setUpdateTimes(getDefaultUpdateTimes(newFrequency))
                    }}
                    className="w-full h-11 px-3 border-2 border-neutral-300 rounded-button focus:outline-none focus:ring-2 focus:ring-[#405D99] focus:border-[#405D99] transition-all bg-white text-sm font-medium"
                  >
                    <option value="daily_once">하루 1회</option>
                    <option value="daily_twice">하루 2회</option>
                    <option value="daily_thrice">하루 3회</option>
                  </select>
                </div>

                {/* 수집 시간 */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs md:text-sm font-bold text-neutral-700">
                    <Clock className="w-3.5 h-3.5 text-[#405D99]" />
                    수집 시간
                  </label>
                  <div className="bg-neutral-50 rounded-button p-2.5 border border-neutral-200 space-y-2">
                    {updateTimes.map((time, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#405D99] w-10 flex-shrink-0 text-center bg-blue-100 rounded py-1">
                          {index + 1}차
                        </span>
                        <select
                          value={time}
                          onChange={(e) => {
                            const newTimes = [...updateTimes]
                            newTimes[index] = parseInt(e.target.value)
                            setUpdateTimes(newTimes)
                          }}
                          className="flex-1 h-10 px-3 border-2 border-neutral-300 rounded-button focus:outline-none focus:ring-2 focus:ring-[#405D99] focus:border-[#405D99] transition-all bg-white text-sm font-medium"
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
              </div>

              {/* 순위 알림받기 */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-button border border-amber-200 min-h-[52px]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bell className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <label className="text-xs md:text-sm font-bold text-neutral-900 block">순위 알림받기</label>
                      <p className="text-[10px] md:text-xs text-neutral-500">순위 변동 시 알림</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationEnabled}
                    onCheckedChange={(checked) => {
                      setNotificationEnabled(checked)
                      if (!checked) {
                        setNotificationType(null)
                      }
                    }}
                    className="data-[state=checked]:bg-[#405D99]"
                  />
                </div>

                {notificationEnabled && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: 'email', icon: Mail, label: '이메일' },
                      { type: 'sms', icon: Phone, label: '문자' },
                      { type: 'kakao', icon: MessageCircle, label: '카카오' },
                    ].map(({ type, icon: Icon, label }) => (
                      <button
                        key={type}
                        onClick={() => setNotificationType(type as 'email' | 'sms' | 'kakao')}
                        className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-button border-2 transition-all min-h-[44px] active:scale-95 ${
                          notificationType === type
                            ? 'border-[#405D99] bg-blue-50'
                            : 'border-neutral-200 bg-white hover:border-neutral-300'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${notificationType === type ? 'text-[#405D99]' : 'text-neutral-400'}`} />
                        <span className={`text-xs font-bold ${notificationType === type ? 'text-[#405D99]' : 'text-neutral-600'}`}>
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 버튼 영역 */}
          <div className="flex gap-2.5 px-4 md:px-6 py-3 md:py-4 border-t border-neutral-200 flex-shrink-0">
            <button
              onClick={() => {
                setShowAddDialog(false)
                setSearchedKeywords([])
              }}
              className="flex-1 h-11 md:h-12 rounded-button border-2 border-neutral-300 text-neutral-700 font-bold text-sm hover:bg-neutral-50 active:scale-95 transition-all"
            >
              취소
            </button>
            <button
              onClick={handleAddTracker}
              disabled={isAdding}
              className="flex-1 h-11 md:h-12 rounded-button bg-[#405D99] hover:bg-[#2E4577] text-white font-bold text-sm shadow-button hover:shadow-button-hover active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  추가 중...
                </span>
              ) : (
                '추가하기'
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 지표 보기 모달 - 모바일 완벽 반응형 */}
      <Dialog open={showMetricsDialog} onOpenChange={setShowMetricsDialog}>
        <DialogContent className="w-[calc(100vw-32px)] sm:w-full sm:max-w-2xl lg:max-w-4xl max-h-[calc(100vh-32px)] sm:max-h-[85vh] overflow-hidden bg-white border-2 border-neutral-200 shadow-modal rounded-modal flex flex-col p-0">
          <DialogHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-3 border-b border-neutral-200 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 md:w-10 md:h-10 bg-emerald-600 rounded-button flex items-center justify-center shadow-sm flex-shrink-0">
                <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base md:text-lg font-bold text-neutral-900 truncate">
                  {selectedTracker?.keyword} 지표
                </DialogTitle>
                <DialogDescription className="text-xs md:text-sm text-neutral-600 truncate">
                  {selectedTracker?.store_name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
            {loadingMetrics ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-3" />
                  <p className="text-sm text-neutral-600">지표를 불러오는 중...</p>
                </div>
              </div>
            ) : metrics.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-neutral-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-neutral-400" />
                </div>
                <p className="text-neutral-700 font-bold mb-1">아직 수집된 지표가 없습니다</p>
                <p className="text-sm text-neutral-500">수집이 완료되면 여기에 표시됩니다</p>
              </div>
            ) : (
              <div className="space-y-4 md:space-y-5">
                {/* 차트 */}
                <div className="bg-neutral-50 rounded-card p-3 md:p-5 border border-neutral-200">
                  <h4 className="font-bold text-sm md:text-base mb-3 text-neutral-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    순위 변화
                  </h4>
                  <div className="w-full h-[200px] md:h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[...metrics].reverse()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="collection_date" 
                          tickFormatter={(date) => new Date(date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                          stroke="#9ca3af"
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={50}
                          interval="preserveStartEnd"
                        />
                        <YAxis reversed domain={[1, 'dataMax']} stroke="#9ca3af" tick={{ fontSize: 10 }} width={30} />
                        <Tooltip 
                          labelFormatter={(date) => new Date(date).toLocaleDateString('ko-KR')}
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            fontSize: '12px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="rank" 
                          stroke="#059669" 
                          strokeWidth={2}
                          name="순위" 
                          dot={{ fill: '#059669', r: 3 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 상세 지표 - 모바일: 카드형 / PC: 테이블 */}
                <div>
                  <h4 className="font-bold text-sm md:text-base mb-3 text-neutral-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    상세 지표
                  </h4>
                  
                  {/* 모바일 카드형 레이아웃 (md 미만) */}
                  <div className="md:hidden space-y-2.5">
                    {metrics.map((metric, index) => {
                      const prevMetric = metrics[index + 1]
                      const rankChange = prevMetric && metric.rank && prevMetric.rank 
                        ? metric.rank - prevMetric.rank : null
                      const visitorChange = prevMetric 
                        ? metric.visitor_review_count - prevMetric.visitor_review_count : null
                      const blogChange = prevMetric 
                        ? metric.blog_review_count - prevMetric.blog_review_count : null
                      
                      return (
                        <div key={metric.id} className="bg-white rounded-button border border-neutral-200 p-3 shadow-sm">
                          {/* 날짜 헤더 */}
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-neutral-100">
                            <span className="text-xs font-bold text-neutral-700">
                              {new Date(metric.collection_date).toLocaleDateString('ko-KR', {
                                month: 'short', day: 'numeric'
                              })}
                            </span>
                            <span className={`text-lg font-bold ${metric.rank ? 'text-emerald-600' : 'text-neutral-400'}`}>
                              {metric.rank ? `${metric.rank}위` : '-'}
                            </span>
                          </div>
                          {/* 지표 그리드 */}
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-[10px] text-neutral-500 font-bold mb-0.5">순위변동</p>
                              <p className="text-xs font-bold">
                                {rankChange === null || rankChange === 0 ? (
                                  <span className="text-neutral-400">-</span>
                                ) : (
                                  <span className={rankChange < 0 ? 'text-success' : 'text-error'}>
                                    {rankChange < 0 ? '↑' : '↓'}{Math.abs(rankChange)}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-neutral-500 font-bold mb-0.5">방문자</p>
                              <p className="text-xs font-bold text-neutral-900">{metric.visitor_review_count.toLocaleString()}</p>
                              {visitorChange !== null && visitorChange !== 0 && (
                                <p className={`text-[10px] font-bold ${visitorChange > 0 ? 'text-success' : 'text-error'}`}>
                                  {visitorChange > 0 ? '+' : ''}{visitorChange}
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-[10px] text-neutral-500 font-bold mb-0.5">블로그</p>
                              <p className="text-xs font-bold text-neutral-900">{metric.blog_review_count.toLocaleString()}</p>
                              {blogChange !== null && blogChange !== 0 && (
                                <p className={`text-[10px] font-bold ${blogChange > 0 ? 'text-success' : 'text-error'}`}>
                                  {blogChange > 0 ? '+' : ''}{blogChange}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* PC 테이블 레이아웃 (md 이상) */}
                  <div className="hidden md:block border-2 border-neutral-200 rounded-card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-50">
                        <tr>
                          <th className="px-3 py-3 text-left font-bold text-neutral-700 text-xs">날짜</th>
                          <th className="px-3 py-3 text-center font-bold text-neutral-700 text-xs">순위</th>
                          <th className="px-3 py-3 text-center font-bold text-neutral-700 text-xs">변동</th>
                          <th className="px-3 py-3 text-center font-bold text-neutral-700 text-xs">방문자</th>
                          <th className="px-3 py-3 text-center font-bold text-neutral-700 text-xs">변동</th>
                          <th className="px-3 py-3 text-center font-bold text-neutral-700 text-xs">블로그</th>
                          <th className="px-3 py-3 text-center font-bold text-neutral-700 text-xs">변동</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.map((metric, index) => {
                          const prevMetric = metrics[index + 1]
                          const rankChange = prevMetric && metric.rank && prevMetric.rank 
                            ? metric.rank - prevMetric.rank : null
                          const visitorChange = prevMetric 
                            ? metric.visitor_review_count - prevMetric.visitor_review_count : null
                          const blogChange = prevMetric 
                            ? metric.blog_review_count - prevMetric.blog_review_count : null
                          
                          return (
                            <tr key={metric.id} className={`border-t border-neutral-200 ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}>
                              <td className="px-3 py-2.5 text-neutral-700 whitespace-nowrap text-xs">
                                {new Date(metric.collection_date).toLocaleDateString('ko-KR')}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-emerald-600 text-sm">
                                {metric.rank || '-'}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-xs">
                                {rankChange === null || rankChange === 0 ? (
                                  <span className="text-neutral-400">-</span>
                                ) : (
                                  <span className={rankChange < 0 ? 'text-success' : 'text-error'}>
                                    {rankChange < 0 ? '↑' : '↓'}{Math.abs(rankChange)}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center text-neutral-700 text-xs">
                                {metric.visitor_review_count.toLocaleString()}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-xs">
                                {visitorChange === null || visitorChange === 0 ? (
                                  <span className="text-neutral-400">-</span>
                                ) : (
                                  <span className={visitorChange > 0 ? 'text-success' : 'text-error'}>
                                    {visitorChange > 0 ? '+' : ''}{visitorChange.toLocaleString()}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center text-neutral-700 text-xs">
                                {metric.blog_review_count.toLocaleString()}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-xs">
                                {blogChange === null || blogChange === 0 ? (
                                  <span className="text-neutral-400">-</span>
                                ) : (
                                  <span className={blogChange > 0 ? 'text-success' : 'text-error'}>
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
          </div>
        </DialogContent>
      </Dialog>

      {/* 매장별 자동수집 설정 모달 - 모바일 완벽 반응형 */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="w-[calc(100vw-32px)] sm:w-full sm:max-w-xl lg:max-w-3xl max-h-[calc(100vh-32px)] sm:max-h-[85vh] overflow-hidden bg-white border-2 border-neutral-200 shadow-modal rounded-modal flex flex-col p-0">
          <DialogHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-3 border-b border-neutral-200 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 md:w-10 md:h-10 bg-emerald-600 rounded-button flex items-center justify-center shadow-sm flex-shrink-0">
                <Settings className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base md:text-lg font-bold text-neutral-900">
                  자동수집 설정
                </DialogTitle>
                <DialogDescription className="text-xs md:text-sm text-neutral-600 truncate">
                  {editingStore?.name} - 키워드별 자동수집 시간 설정
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
            <div className="space-y-3 md:space-y-4">
              {editingTrackers.map((tracker) => {
                const settings = editTrackerSettings[tracker.id]
                if (!settings) return null

                const frequencyCount = settings.frequency === 'daily_once' ? 1 :
                                      settings.frequency === 'daily_twice' ? 2 : 3

                return (
                  <div key={tracker.id} className="border-2 border-neutral-200 rounded-card p-3 md:p-4 bg-white hover:shadow-sm transition-all">
                    {/* 키워드명 */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm md:text-base text-neutral-900">{tracker.keyword}</h3>
                      {tracker.notification_enabled && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] md:text-xs font-bold">
                          <Bell className="w-3 h-3" />
                          알림
                        </span>
                      )}
                    </div>

                    {/* 수집 주기 */}
                    <div className="mb-3">
                      <label className="text-xs md:text-sm font-bold mb-1.5 block text-neutral-700">수집 주기</label>
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
                        className="w-full h-11 px-3 border-2 border-neutral-300 rounded-button focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white text-sm font-medium"
                      >
                        <option value="daily_once">하루 1회</option>
                        <option value="daily_twice">하루 2회</option>
                        <option value="daily_thrice">하루 3회</option>
                      </select>
                    </div>

                    {/* 수집 시간 */}
                    <div className="mb-3">
                      <label className="text-xs md:text-sm font-bold mb-1.5 block text-neutral-700">수집 시간</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {settings.times.slice(0, frequencyCount).map((time, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-xs text-neutral-600 font-bold w-10 flex-shrink-0">
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
                              className="flex-1 h-10 px-3 border-2 border-neutral-300 rounded-button focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white text-sm font-medium"
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
                    <div className="space-y-2.5 pt-3 border-t border-neutral-100">
                      <div className="flex items-center justify-between min-h-[44px]">
                        <label className="text-xs md:text-sm font-bold text-neutral-700">순위 알림받기</label>
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
                            settings.notificationEnabled ? 'bg-emerald-600' : 'bg-neutral-300'
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
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { type: 'email', icon: Mail, label: '이메일' },
                            { type: 'sms', icon: Phone, label: '문자' },
                            { type: 'kakao', icon: MessageCircle, label: '카카오' },
                          ].map(({ type, icon: Icon, label }) => (
                            <button
                              key={type}
                              onClick={() => {
                                setEditTrackerSettings(prev => ({
                                  ...prev,
                                  [tracker.id]: {
                                    ...prev[tracker.id],
                                    notificationType: type as 'email' | 'sms' | 'kakao'
                                  }
                                }))
                              }}
                              className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-button border-2 transition-all min-h-[44px] ${
                                settings.notificationType === type
                                  ? 'border-emerald-500 bg-emerald-50'
                                  : 'border-neutral-200 bg-white hover:border-neutral-300'
                              }`}
                            >
                              <Icon className={`w-3.5 h-3.5 ${settings.notificationType === type ? 'text-emerald-600' : 'text-neutral-400'}`} />
                              <span className={`text-xs font-bold ${settings.notificationType === type ? 'text-emerald-600' : 'text-neutral-600'}`}>
                                {label}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            
            <p className="text-[10px] md:text-xs text-neutral-500 mt-3 text-center">
              ℹ️ 설정한 시간에 자동으로 지표를 수집합니다 (한국시간 기준)
            </p>
          </div>

          <div className="flex gap-2.5 px-4 md:px-6 py-3 md:py-4 border-t border-neutral-200 flex-shrink-0">
            <button
              onClick={() => {
                setShowSettingsDialog(false)
                setEditingStore(null)
                setEditingTrackers([])
                setEditTrackerSettings({})
              }}
              disabled={isSavingSettings}
              className="flex-1 h-11 md:h-12 rounded-button border-2 border-neutral-300 text-neutral-700 font-bold text-sm hover:bg-neutral-50 active:scale-95 transition-all disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleUpdateSettings}
              disabled={isSavingSettings}
              className="flex-1 h-11 md:h-12 rounded-button bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-button hover:shadow-button-hover active:scale-95 transition-all disabled:opacity-50"
            >
              {isSavingSettings ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  저장 중...
                </span>
              ) : (
                '저장'
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 경쟁매장 보기 모달 - 캐시 지원 + 새로고침 */}
      <Dialog open={showCompetitorDialog} onOpenChange={setShowCompetitorDialog}>
        <DialogContent className="w-[calc(100vw-24px)] sm:w-full sm:max-w-2xl lg:max-w-3xl max-h-[calc(100vh-24px)] p-0 rounded-modal shadow-modal flex flex-col overflow-hidden">
          <DialogHeader className="p-4 md:p-6 pb-3 md:pb-4 flex-shrink-0 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg md:text-xl font-bold text-neutral-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                경쟁매장 순위
              </DialogTitle>
              <button
                onClick={handleForceRefreshCompetitors}
                disabled={loadingCompetitors}
                className="p-2 rounded-button bg-amber-100 text-amber-700 hover:bg-amber-200 active:scale-95 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
                title="새로고침"
              >
                <RefreshCw className={`w-4 h-4 ${loadingCompetitors ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <DialogDescription className="text-xs md:text-sm text-neutral-500 mt-1">
              &quot;{competitorKeyword}&quot; 키워드 검색 결과 (최대 300위)
              {competitorTotalCount > 0 && (
                <span className="ml-2 text-neutral-400">
                  전체 {competitorTotalCount.toLocaleString()}개 업체
                </span>
              )}
            </DialogDescription>
            {competitorMyRank && (
              <div className="mt-2 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-button px-3 py-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700">
                  내 매장 순위: {competitorMyRank}위
                </span>
              </div>
            )}
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-3 md:p-4">
            {loadingCompetitors ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-3" />
                <p className="text-sm text-neutral-500 font-medium">경쟁매장 순위를 불러오는 중...</p>
                <p className="text-xs text-neutral-400 mt-1">300위까지 조회 중이며, 약 10~20초 소요됩니다</p>
              </div>
            ) : competitors.length > 0 ? (
              <div className="space-y-1.5 md:space-y-2">
                {competitors.map((comp) => (
                  <div
                    key={`${comp.rank}-${comp.place_id}`}
                    className={`flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-button border transition-all duration-200 ${
                      comp.is_my_store 
                        ? 'bg-emerald-50 border-emerald-300 shadow-sm ring-1 ring-emerald-200' 
                        : 'bg-white border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {/* 순위 */}
                    <div className={`flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      comp.rank <= 3 
                        ? 'bg-amber-100 text-amber-700' 
                        : comp.rank <= 10 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      {comp.rank}
                    </div>

                    {/* 썸네일 */}
                    {comp.thumbnail ? (
                      <img
                        src={comp.thumbnail}
                        alt={comp.name}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-neutral-400" />
                      </div>
                    )}

                    {/* 매장 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`font-bold text-sm md:text-base truncate ${
                          comp.is_my_store ? 'text-emerald-700' : 'text-neutral-900'
                        }`}>
                          {comp.name}
                        </span>
                        {comp.is_my_store && (
                          <span className="flex-shrink-0 text-[10px] md:text-xs font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">
                            내 매장
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 truncate mb-0.5">
                        {comp.category && <span>{comp.category}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-600">
                        {comp.rating && (
                          <span className="flex items-center gap-0.5">
                            <span className="text-amber-500">★</span>
                            <span className="font-medium">{comp.rating.toFixed(1)}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="w-3 h-3 text-neutral-400" />
                          <span className="font-medium">{comp.visitor_review_count.toLocaleString()}</span>
                        </span>
                        <span className="flex items-center gap-0.5">
                          <FileText className="w-3 h-3 text-neutral-400" />
                          <span className="font-medium">{comp.blog_review_count.toLocaleString()}</span>
                        </span>
                      </div>
                      {/* 주소 - PC에서만 표시 */}
                      <div className="hidden md:block text-xs text-neutral-400 truncate mt-0.5">
                        {comp.road_address || comp.address}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="w-10 h-10 text-neutral-300 mb-3" />
                <p className="text-sm text-neutral-500">검색 결과가 없습니다</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
