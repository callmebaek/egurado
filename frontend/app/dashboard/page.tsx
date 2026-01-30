"use client"

/**
 * 대시보드 메인 페이지
 * 매장별 추적 키워드 그룹화 (매장당 최대 4개 표시)
 * 완벽한 반응형 디자인 (모바일/태블릿/PC)
 * 드래그앤드롭 순서 변경 기능 포함
 */
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/config"
import { 
  Loader2, 
  User, 
  CreditCard, 
  Store as StoreIcon,
  Key,
  Crown,
  BarChart3,
  Sparkles,
  ArrowUpRight,
  Activity,
  Clock,
  MapPin,
  Star,
  Gem,
  Shield,
  GripVertical,
  MessageSquare,
  FileText,
  Edit3,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from "lucide-react"
import Link from "next/link"
import OnboardingSection from "@/components/onboarding/OnboardingSection"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface UserProfile {
  id: string
  email: string
  display_name: string | null
  subscription_tier: 'free' | 'basic' | 'pro' | 'god'
  total_credits?: number
  used_credits?: number
  max_stores?: number
  max_keywords?: number
  max_trackers?: number
  created_at?: string
  subscription_end_date?: string
}

interface Store {
  id: string
  name: string
  store_name?: string
  platform: string
  status: string
  address?: string
  thumbnail?: string
  display_order?: number
  created_at: string
}

interface MetricTracker {
  id: string
  keyword: string
  store_name: string
  store_id: string
  is_active: boolean
  last_collected_at: string | null
  update_frequency: string
  created_at: string
  latest_rank?: number | null
  rank_change?: number | null
  visitor_review_count?: number
  blog_review_count?: number
  visitor_review_change?: number
  blog_review_change?: number
  platform?: string
  display_order?: number
}

interface StoreTrackerGroup {
  store_id: string
  store_name: string
  store_thumbnail?: string
  platform: string
  trackers: MetricTracker[]
  visitor_review_count?: number
  blog_review_count?: number
  visitor_review_change?: number
  blog_review_change?: number
}

interface LatestDiagnosis {
  id: string
  store_name: string
  diagnosed_at: string
  total_score: number
  max_score: number
  grade: string
}

interface SummaryCard {
  type: string
  title: string
  value: number
  daily_avg?: number
  vs_7d_pct?: number
  vs_30d_pct?: number
  avg_7d?: number
  avg_30d?: number
  total?: number
  reply_rate?: number
  has_active?: boolean
  days_since_last?: number
}

interface LatestActivation {
  id: string
  store_name: string
  store_id: string
  created_at: string
  summary_cards: SummaryCard[]
}

// 매장별 색상 팔레트
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

// 드래그 가능한 매장별 추적 키워드 카드
function SortableStoreTrackerCard({ 
  storeGroup, 
  storeColor, 
  isReordering,
  onRefreshTracker,
  onRefreshAllTrackers,
  isRefreshing
}: { 
  storeGroup: StoreTrackerGroup
  storeColor: typeof STORE_COLORS[0]
  isReordering: boolean
  onRefreshTracker: (trackerId: string) => Promise<void>
  onRefreshAllTrackers: (storeId: string) => Promise<void>
  isRefreshing: Set<string>
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: storeGroup.store_id, disabled: !isReordering })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }

  const visibleTrackers = storeGroup.trackers.slice(0, 4)

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div 
        className={`relative p-3 sm:p-4 rounded-xl border-2 ${storeColor.border} hover:shadow-xl transition-all duration-300 bg-gradient-to-br ${storeColor.bg} ${isReordering ? 'cursor-move' : ''}`}
        {...(isReordering ? { ...attributes, ...listeners } : {})}
      >
        {/* 드래그 핸들 */}
        {isReordering && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <GripVertical className="w-5 h-5 text-gray-400" />
          </div>
        )}
        
        <div className={`${isReordering ? 'ml-6' : ''}`}>
          {/* 헤더: 매장명 + 썸네일 + 전체 새로고침 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* 매장 썸네일 */}
              {storeGroup.store_thumbnail ? (
                <img 
                  src={storeGroup.store_thumbnail} 
                  alt={storeGroup.store_name} 
                  className="w-10 h-10 rounded-lg object-cover border-2 border-white shadow-sm flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0">
                  <StoreIcon className="w-5 h-5 text-gray-400" />
                </div>
              )}
              
              {/* 매장명 */}
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-base ${storeColor.text} truncate`}>
                  {storeGroup.store_name}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  storeGroup.platform === 'naver' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-blue-500 text-white'
                }`}>
                  {storeGroup.platform === 'naver' ? '네이버' : '구글'}
                </span>
              </div>
            </div>
            
            {/* 전체 새로고침 버튼 */}
            <button
              onClick={() => onRefreshAllTrackers(storeGroup.store_id)}
              disabled={isRefreshing.has(`store_${storeGroup.store_id}`)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                isRefreshing.has(`store_${storeGroup.store_id}`)
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-indigo-600 hover:bg-indigo-50 hover:shadow-md'
              }`}
              title="이 매장의 모든 추적키워드 순위를 지금 수집합니다!"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing.has(`store_${storeGroup.store_id}`) ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">전체 수집</span>
            </button>
          </div>

          {/* 매장 리뷰 지표 */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* 방문자 리뷰 */}
            <div className="bg-white/70 rounded-lg p-2">
              <div className="flex items-center gap-1 mb-1">
                <MessageSquare className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-600 font-medium">방문자 리뷰</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-gray-800">
                  {storeGroup.visitor_review_count ?? 0}
                </span>
                {storeGroup.visitor_review_change !== undefined && storeGroup.visitor_review_change !== null && storeGroup.visitor_review_change !== 0 && (
                  <span className={`text-sm font-semibold flex items-center gap-0.5 ${
                    storeGroup.visitor_review_change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {storeGroup.visitor_review_change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {storeGroup.visitor_review_change > 0 ? '+' : ''}{storeGroup.visitor_review_change}
                  </span>
                )}
              </div>
            </div>

            {/* 블로그 리뷰 */}
            <div className="bg-white/70 rounded-lg p-2">
              <div className="flex items-center gap-1 mb-1">
                <FileText className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-600 font-medium">블로그 리뷰</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-gray-800">
                  {storeGroup.blog_review_count ?? 0}
                </span>
                {storeGroup.blog_review_change !== undefined && storeGroup.blog_review_change !== null && storeGroup.blog_review_change !== 0 && (
                  <span className={`text-sm font-semibold flex items-center gap-0.5 ${
                    storeGroup.blog_review_change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {storeGroup.blog_review_change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {storeGroup.blog_review_change > 0 ? '+' : ''}{storeGroup.blog_review_change}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 추적 키워드 목록 (최대 4개, 고정 높이) */}
          <div className="space-y-2">
            {/* 키워드 슬롯 4개 (빈 슬롯 포함) */}
            {[...Array(4)].map((_, index) => {
              const tracker = visibleTrackers[index]
              
              if (tracker) {
                // 실제 키워드가 있는 경우
                return (
                  <div
                    key={tracker.id}
                    className="bg-white/80 rounded-lg p-2.5 flex items-center justify-between gap-2 min-h-[68px]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold text-sm ${storeColor.text} truncate`}>
                          {tracker.keyword}
                        </span>
                        <span className="text-xs text-gray-500">
                          {tracker.update_frequency === 'daily_once' ? '1회/일' : 
                           tracker.update_frequency === 'daily_twice' ? '2회/일' : '3회/일'}
                        </span>
                      </div>
                      {tracker.last_collected_at && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(tracker.last_collected_at).toLocaleString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* 순위 */}
                    <div className="flex items-center gap-2">
                      {tracker.latest_rank ? (
                        <div className="flex items-center gap-2">
                          {/* 1~5위 폭죽 뱃지 */}
                          {tracker.latest_rank >= 1 && tracker.latest_rank <= 5 && (
                            <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse flex-shrink-0" />
                          )}
                          <div className="text-right">
                            <div className="flex items-baseline gap-1">
                              <span className={`text-2xl font-bold ${storeColor.text}`}>
                                {tracker.latest_rank}
                              </span>
                              <span className="text-xs text-gray-600">위</span>
                            </div>
                            {tracker.rank_change !== undefined && tracker.rank_change !== null && tracker.rank_change !== 0 && (
                              <div className={`text-xs font-semibold flex items-center justify-end gap-0.5 ${
                                tracker.rank_change > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {tracker.rank_change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {tracker.rank_change > 0 ? '↑' : '↓'}{Math.abs(tracker.rank_change)}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="text-xs text-gray-500 font-medium">300위 권 밖</span>
                        </div>
                      )}
                      
                    {/* 키워드별 새로고침 버튼 */}
                    <button
                      onClick={() => onRefreshTracker(tracker.id)}
                      disabled={isRefreshing.has(tracker.id)}
                      className={`p-1.5 rounded-lg transition-all ${
                        isRefreshing.has(tracker.id)
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-indigo-600 hover:bg-indigo-50 hover:shadow-md'
                      }`}
                      title="이 키워드 순위를 지금 수집합니다"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing.has(tracker.id) ? 'animate-spin' : ''}`} />
                    </button>
                    </div>
                  </div>
                )
              } else {
                // 빈 슬롯 - 추적키워드 추가 버튼
                return (
                  <Link
                    key={`empty-${index}`}
                    href="/dashboard/naver/metrics-tracker"
                    className="block bg-white/40 border-2 border-dashed border-gray-300 rounded-lg p-2.5 min-h-[68px] flex items-center justify-center hover:bg-white/60 hover:border-indigo-400 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-2 text-gray-500 group-hover:text-indigo-600">
                      <span className="text-2xl">+</span>
                      <span className="text-sm font-semibold">추적키워드 추가</span>
                    </div>
                  </Link>
                )
              }
            })}
            
            {/* 더 많은 키워드가 있을 경우 */}
            {storeGroup.trackers.length > 4 && (
              <Link
                href="/dashboard/naver/metrics-tracker"
                className="block text-center py-2 text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                +{storeGroup.trackers.length - 4}개 더보기
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Force redeploy v2 - Review Analysis Modal (2026-01-29 02:40)
export default function DashboardPage() {
  const { user, getToken, loading: authLoading } = useAuth()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [trackers, setTrackers] = useState<MetricTracker[]>([])
  const [storeGroups, setStoreGroups] = useState<StoreTrackerGroup[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isReordering, setIsReordering] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState<Set<string>>(new Set())
  const [latestDiagnosis, setLatestDiagnosis] = useState<LatestDiagnosis | null>(null)
  const [latestActivation, setLatestActivation] = useState<LatestActivation | null>(null)
  
  // 🆕 실제 크레딧 정보 (Credits API)
  const [credits, setCredits] = useState<{
    monthly_credits: number
    monthly_used: number
    total_remaining: number
    tier: string
    percentage_used: number
  } | null>(null)
  
  // 드래그앤드롭 센서 설정
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 추적 키워드를 매장별로 그룹화
  const groupTrackersByStore = (trackers: MetricTracker[], stores: Store[]) => {
    // stores를 display_order로 정렬
    const sortedStores = [...stores].sort((a, b) => {
      const orderA = a.display_order ?? 999
      const orderB = b.display_order ?? 999
      return orderA - orderB
    })
    
    const storeMap = new Map<string, Store>()
    sortedStores.forEach(store => storeMap.set(store.id, store))

    const groupMap = new Map<string, StoreTrackerGroup>()
    
    trackers.forEach(tracker => {
      const store = storeMap.get(tracker.store_id)
      if (!store) return

      if (!groupMap.has(tracker.store_id)) {
        groupMap.set(tracker.store_id, {
          store_id: tracker.store_id,
          store_name: store.name || store.store_name || '매장명 없음',
          store_thumbnail: store.thumbnail,
          platform: tracker.platform || store.platform,
          trackers: [],
          visitor_review_count: tracker.visitor_review_count,
          blog_review_count: tracker.blog_review_count,
          visitor_review_change: tracker.visitor_review_change,
          blog_review_change: tracker.blog_review_change,
        })
      }

      const group = groupMap.get(tracker.store_id)!
      group.trackers.push(tracker)
      
      // 매장 레벨 리뷰 지표는 첫 번째 tracker의 값 사용
      if (group.trackers.length === 1) {
        group.visitor_review_count = tracker.visitor_review_count
        group.blog_review_count = tracker.blog_review_count
        group.visitor_review_change = tracker.visitor_review_change
        group.blog_review_change = tracker.blog_review_change
      }
    })

    // sortedStores 순서대로 그룹 반환
    return sortedStores
      .map(store => groupMap.get(store.id))
      .filter((group): group is StoreTrackerGroup => group !== undefined)
  }

  // 🆕 크레딧 리로드 함수
  const reloadCredits = async () => {
    const token = getToken()
    if (!token) return

    try {
      const creditsRes = await fetch(`${api.baseUrl}/api/v1/credits/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (creditsRes.ok) {
        const creditsData = await creditsRes.json()
        setCredits({
          monthly_credits: creditsData.monthly_credits || 0,
          monthly_used: creditsData.monthly_used || 0,
          total_remaining: creditsData.total_remaining || 0,
          tier: creditsData.tier || 'free',
          percentage_used: creditsData.percentage_used || 0
        })
        console.log('[Credits] 크레딧 업데이트 완료:', creditsData.total_remaining)
      }
    } catch (error) {
      console.log('[Credits] 크레딧 리로드 실패:', error)
    }
  }

  // 개별 키워드 새로고침
  const handleRefreshTracker = async (trackerId: string) => {
    const token = getToken()
    if (!token) return

    setIsRefreshing(prev => new Set(prev).add(trackerId))

    try {
      // 수집 요청 및 응답 대기
      const response = await fetch(api.metrics.collectNow(trackerId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        await response.json()
        
        // 데이터베이스 반영 시간을 위해 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 🆕 크레딧 리로드 (순위조회 완료 후)
        await reloadCredits()
      }

      // 데이터 다시 로드
      await loadTrackers()
    } catch (error) {
      console.error('Failed to refresh tracker:', error)
    } finally {
      setIsRefreshing(prev => {
        const newSet = new Set(prev)
        newSet.delete(trackerId)
        return newSet
      })
    }
  }

  // 매장 전체 키워드 새로고침
  const handleRefreshAllTrackers = async (storeId: string) => {
    const token = getToken()
    if (!token) return

    const storeTrackers = trackers.filter(t => t.store_id === storeId)
    const refreshKey = `store_${storeId}`
    
    setIsRefreshing(prev => new Set(prev).add(refreshKey))

    try {
      // 모든 수집 요청을 병렬로 실행하고 응답을 기다림
      const responses = await Promise.all(
        storeTrackers.map(tracker => 
          fetch(api.metrics.collectNow(tracker.id), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }).then(res => res.ok ? res.json() : null)
        )
      )

      // 모든 수집이 완료된 후 잠시 대기 (데이터베이스 반영 시간)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 🆕 크레딧 리로드 (전체 순위조회 완료 후)
      await reloadCredits()

      // 데이터 다시 로드
      await loadTrackers()
    } catch (error) {
      console.error('Failed to refresh all trackers:', error)
    } finally {
      setIsRefreshing(prev => {
        const newSet = new Set(prev)
        newSet.delete(refreshKey)
        return newSet
      })
    }
  }

  // 드래그 종료 핸들러
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setStoreGroups((items) => {
        const oldIndex = items.findIndex((item) => item.store_id === active.id)
        const newIndex = items.findIndex((item) => item.store_id === over.id)
        
        const newOrder = arrayMove(items, oldIndex, newIndex)
        
        // 순서를 데이터베이스에 저장 (비동기)
        saveStoreOrder(newOrder)
        
        return newOrder
      })
    }
  }
  
  // 매장 순서 저장 함수
  const saveStoreOrder = async (orderedGroups: StoreTrackerGroup[]) => {
    try {
      const token = await getToken()
      if (!token) return
      
      // 각 매장의 순서를 배열로 생성
      const orders = orderedGroups.map((group, index) => ({
        store_id: group.store_id,
        display_order: index
      }))
      
      const response = await fetch(api.stores.reorder(), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orders })
      })
      
      if (!response.ok) {
        console.error('매장 순서 저장 실패:', response.status)
      }
    } catch (error) {
      console.error('매장 순서 저장 중 오류:', error)
    }
  }

  // 순서 변경 토글
  const toggleReordering = () => {
    setIsReordering(!isReordering)
  }

  // 매장별 색상 매핑 생성
  const getStoreColorMap = (groups: StoreTrackerGroup[]) => {
    const colorMap: Record<string, typeof STORE_COLORS[0]> = {}
    groups.forEach((group, index) => {
      colorMap[group.store_id] = STORE_COLORS[index % STORE_COLORS.length]
    })
    return colorMap
  }

  const storeColorMap = getStoreColorMap(storeGroups)

  // 추적 키워드 로드
  const loadTrackers = async (storesList?: Store[]) => {
    const token = getToken()
    if (!token) return

    const trackersRes = await fetch(api.metrics.trackers(), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (trackersRes.ok) {
      const trackersData = await trackersRes.json()
      console.log("[DEBUG] Trackers Response:", trackersData)
      
      // API 응답이 배열인 경우와 { trackers: [] } 형식인 경우 모두 처리
      let trackersList = Array.isArray(trackersData) 
        ? trackersData 
        : (trackersData?.trackers || [])
      
      setTrackers(trackersList)
      
      // 매장별 그룹화 (이미 display_order로 정렬됨)
      // stores 파라미터가 있으면 사용, 없으면 state에서 가져옴
      const currentStores = storesList || stores
      const groups = groupTrackersByStore(trackersList, currentStores)
      setStoreGroups(groups)
    }
  }

  // 최근 진단 결과 로드 (모든 매장 중 가장 최근)
  const loadLatestDiagnosis = async (storesList: Store[]) => {
    const token = getToken()
    if (!token || storesList.length === 0) return

    // 네이버 매장만 필터
    const naverStores = storesList.filter(store => store.platform === 'naver')
    if (naverStores.length === 0) return

    try {
      // 모든 네이버 매장의 최근 진단 결과를 병렬로 조회
      const diagnosisPromises = naverStores.map(store => 
        fetch(api.naver.diagnosisHistory(store.id, 1), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(res => res.ok ? res.json() : null)
        .catch(() => null)
      )

      const results = await Promise.all(diagnosisPromises)
      
      // 모든 진단 결과를 하나의 배열로 합치기
      const allDiagnoses: LatestDiagnosis[] = []
      results.forEach(data => {
        if (data?.history && data.history.length > 0) {
          allDiagnoses.push(...data.history)
        }
      })

      // 진단 날짜 기준으로 정렬하여 가장 최근 것 선택
      if (allDiagnoses.length > 0) {
        const sortedDiagnoses = allDiagnoses.sort((a, b) => 
          new Date(b.diagnosed_at).getTime() - new Date(a.diagnosed_at).getTime()
        )
        setLatestDiagnosis(sortedDiagnoses[0])
      }
    } catch (error) {
      console.error("[DEBUG] Error loading latest diagnosis:", error)
    }
  }

  // 최근 활성화 이력 로드 (모든 매장 중 가장 최근)
  const loadLatestActivation = async (storesList: Store[]) => {
    const token = getToken()
    if (!token || storesList.length === 0) return

    // 네이버 매장만 필터
    const naverStores = storesList.filter(store => store.platform === 'naver')
    if (naverStores.length === 0) return

    try {
      // 모든 네이버 매장의 최근 활성화 이력을 병렬로 조회
      const activationPromises = naverStores.map(store => 
        fetch(api.naver.activationHistory(store.id), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(res => res.ok ? res.json() : null)
        .catch(() => null)
      )

      const results = await Promise.all(activationPromises)
      
      // 모든 활성화 이력을 하나의 배열로 합치기
      const allActivations: LatestActivation[] = []
      results.forEach((data, index) => {
        if (data?.histories && data.histories.length > 0) {
          // 각 이력에 store_name 추가
          const storeActivations = data.histories.map((history: any) => ({
            ...history,
            store_name: naverStores[index].name || naverStores[index].store_name,
            store_id: naverStores[index].id
          }))
          allActivations.push(...storeActivations)
        }
      })

      // 생성 날짜 기준으로 정렬하여 가장 최근 것 선택
      if (allActivations.length > 0) {
        const sortedActivations = allActivations.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setLatestActivation(sortedActivations[0])
        console.log('[Dashboard] 최근 활성화 이력:', sortedActivations[0])
      }
    } catch (error) {
      console.error("[Dashboard] Error loading latest activation:", error)
    }
  }

  // 매장 목록만 다시 로드하는 함수 (온보딩에서 매장 등록 후 호출)
  const reloadStores = async () => {
    const token = getToken()
    if (!token) return

    try {
      const storesRes = await fetch(api.stores.list(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (storesRes.ok) {
        const storesData = await storesRes.json()
        const loadedStores = storesData.stores || []
        setStores(loadedStores)
        
        // 매장이 변경되면 추적 키워드도 다시 그룹화
        await loadTrackers(loadedStores)
        
        // 최근 진단 결과도 다시 로드
        await loadLatestDiagnosis(loadedStores)
      }
    } catch (error) {
      console.error("[DEBUG] Error reloading stores:", error)
    }
  }

  // 데이터 로드
  useEffect(() => {
    const loadDashboardData = async () => {
      console.log("[DEBUG] loadDashboardData called")
      
      const token = getToken()
      if (!user || !token) {
        setIsLoadingData(false)
        return
      }

      try {
        setIsLoadingData(true)

        // 1. 사용자 프로필 조회
        const profileRes = await fetch(`${api.baseUrl}/api/v1/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          setProfile(profileData)
        }

        // 🆕 1-1. 실제 크레딧 조회 (Credits API)
        try {
          const creditsRes = await fetch(`${api.baseUrl}/api/v1/credits/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (creditsRes.ok) {
            const creditsData = await creditsRes.json()
            setCredits({
              monthly_credits: creditsData.monthly_credits || 0,
              monthly_used: creditsData.monthly_used || 0,
              total_remaining: creditsData.total_remaining || 0,
              tier: creditsData.tier || 'free',
              percentage_used: creditsData.percentage_used || 0
            })
          }
        } catch (error) {
          console.log('[INFO] Credits API not available yet:', error)
          // 크레딧 API가 아직 없으면 기존 프로필 데이터 사용
        }

        // 2. 매장 목록 조회
        const storesRes = await fetch(api.stores.list(), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        let loadedStores: Store[] = []
        if (storesRes.ok) {
          const storesData = await storesRes.json()
          loadedStores = storesData.stores || []
          setStores(loadedStores)
        }

        // 3. 추적 키워드 목록 조회 (백엔드에서 변동값 포함하여 반환)
        // 매장 목록을 함께 전달하여 즉시 그룹화
        await loadTrackers(loadedStores)

        // 4. 최근 진단 결과 조회
        await loadLatestDiagnosis(loadedStores)

        // 5. 최근 활성화 이력 조회
        await loadLatestActivation(loadedStores)

      } catch (error) {
        console.error("[DEBUG] Error loading dashboard data:", error)
      } finally {
        setIsLoadingData(false)
      }
    }

    loadDashboardData()
  }, [user])

  // 로딩 중
  if (authLoading || isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="text-center">
          <div className="relative inline-block">
            <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-blue-600 mx-auto mb-3 sm:mb-4" />
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 absolute top-0 right-0 animate-pulse" />
          </div>
          <p className="text-gray-600 text-base sm:text-lg font-semibold">대시보드를 불러오는 중...</p>
          <p className="text-gray-400 text-xs sm:text-sm mt-1 sm:mt-2">잠시만 기다려주세요</p>
        </div>
      </div>
    )
  }

  // 사용자 정보 없음
  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="text-center max-w-md">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-full w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <User className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">환영합니다!</h2>
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
            위플레이스에서 네이버 플레이스와 구글 비즈니스를 관리하세요.
          </p>
          <Link 
            href="/dashboard/naver/store-registration"
            className="inline-flex items-center px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 text-sm sm:text-base"
          >
            매장 등록하기
            <ArrowUpRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
        </div>
      </div>
    )
  }

  // Tier 정보
  const tierInfo = {
    free: { 
      label: '무료', 
      color: 'from-slate-400 to-slate-600', 
      bgColor: 'from-slate-50 to-slate-100',
      Icon: Shield,
      iconColor: 'text-slate-600',
      textColor: 'text-slate-700',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-700'
    },
    basic: { 
      label: '베이직', 
      color: 'from-blue-400 to-blue-600', 
      bgColor: 'from-blue-50 to-blue-100',
      Icon: Star,
      iconColor: 'text-blue-600',
      textColor: 'text-blue-700',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700'
    },
    pro: { 
      label: '프로', 
      color: 'from-purple-400 to-purple-600', 
      bgColor: 'from-purple-50 to-purple-100',
      Icon: Gem,
      iconColor: 'text-purple-600',
      textColor: 'text-purple-700',
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-700'
    },
    god: { 
      label: 'GOD', 
      color: 'from-yellow-400 via-orange-500 to-red-500', 
      bgColor: 'from-yellow-50 via-orange-50 to-red-50',
      Icon: Crown,
      iconColor: 'text-orange-600',
      textColor: 'text-orange-700',
      badgeBg: 'bg-gradient-to-r from-yellow-100 to-orange-100',
      badgeText: 'text-orange-700'
    },
  }

  const currentTier = profile?.subscription_tier || 'free'
  const tier = tierInfo[currentTier]

  // 🆕 크레딧 계산 (실제 Credits API 데이터 우선 사용)
  const totalCredits = credits?.monthly_credits ?? (profile?.total_credits ?? 1000)
  const usedCredits = credits?.monthly_used ?? (profile?.used_credits ?? 0)
  const remainingCredits = totalCredits === -1 ? '무제한' : (totalCredits - usedCredits).toLocaleString()
  const creditPercentage = totalCredits === -1 ? 100 : ((totalCredits - usedCredits) / totalCredits) * 100

  // Quota 계산
  const maxStores = profile?.max_stores ?? 1
  const maxKeywords = profile?.max_keywords ?? 10
  const maxTrackers = profile?.max_trackers ?? 3

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-6 sm:pb-8">
      {/* 환영 헤더 + 활성화 요약 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* 계정 정보 카드 (환영 메시지 통합) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-gray-100 shadow-xl p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`bg-gradient-to-br ${tier.color} p-2 rounded-lg shadow-md flex-shrink-0`}>
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-gray-800 truncate">
                  {profile.display_name || profile.email.split('@')[0]}님 👋
                </h3>
                <p className="text-xs text-gray-500">오늘도 멋진 하루!</p>
              </div>
            </div>
            <div className={`px-2 py-1 bg-gradient-to-r ${tier.color} text-white rounded-md shadow-sm flex items-center gap-1 flex-shrink-0`}>
              <tier.Icon className="w-3 h-3" />
              <span className="text-xs font-bold">{tier.label}</span>
            </div>
          </div>
          
          <div className="space-y-1.5">
            {/* 이메일 */}
            <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-2">
              <p className="text-xs text-gray-500 mb-0.5">이메일</p>
              <p className="text-xs font-medium text-gray-800 truncate">{profile.email}</p>
            </div>

            {/* 잔여 크레딧 */}
            <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-2">
              <p className="text-xs text-gray-500 mb-0.5">잔여 크레딧</p>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-gray-800">{remainingCredits}</span>
                {totalCredits !== -1 && (
                  <span className="text-xs text-gray-500">/ {totalCredits.toLocaleString()}</span>
                )}
              </div>
              {totalCredits !== -1 && (
                <div className="mt-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${creditPercentage}%` }}
                  />
                </div>
              )}
            </div>

            {/* 가입일 */}
            {profile.created_at && (
              <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-2">
                <p className="text-xs text-gray-500 mb-0.5">가입일</p>
                <p className="text-xs font-medium text-gray-800">
                  {new Date(profile.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 플레이스 활성화 요약 카드 */}
        {latestActivation && latestActivation.summary_cards && latestActivation.summary_cards.length > 0 ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-gray-100 shadow-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-800">플레이스 활성화</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(latestActivation.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <Activity className="w-5 h-5 text-purple-500" />
            </div>
            
            <div className="space-y-1.5">
              {latestActivation.summary_cards.slice(0, 5).map((card) => (
                <div 
                  key={card.type} 
                  className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 font-medium truncate">{card.title}</p>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-sm sm:text-base font-bold text-gray-800">
                          {card.type === 'visitor_review' || card.type === 'blog_review' 
                            ? card.value.toFixed(2) 
                            : Math.round(card.value)}
                        </span>
                        {(card.type === 'visitor_review' || card.type === 'blog_review') && (
                          <span className="text-xs text-gray-500">
                            {((card.vs_7d_pct || 0) + (card.vs_30d_pct || 0)) / 2 > 0 ? '👏' : 
                             ((card.vs_7d_pct || 0) + (card.vs_30d_pct || 0)) / 2 < 0 ? '😢' : ''}
                          </span>
                        )}
                        {card.type === 'pending_reply' && (
                          <span className="text-xs text-gray-500">
                            {card.value === 0 ? '👏' : 
                             (card.reply_rate || 0) >= 90 ? '👏' : 
                             (card.reply_rate || 0) >= 70 ? '💪' : '😢'}
                          </span>
                        )}
                        {card.type === 'coupon' && (
                          <span className="text-xs text-gray-500">
                            {card.value >= 1 ? '👏' : '😢'}
                          </span>
                        )}
                        {card.type === 'announcement' && (
                          <span className="text-xs text-gray-500">
                            {card.value > 0 ? '👏' : '😢'}
                          </span>
                        )}
                      </div>
                    </div>
                    {card.type === 'coupon' && (
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        card.has_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {card.has_active ? '활성' : '비활성'}
                      </span>
                    )}
                    {card.type === 'pending_reply' && card.reply_rate !== undefined && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        {card.reply_rate.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-gray-100 shadow-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="text-sm sm:text-base font-bold text-gray-800">플레이스 활성화</h3>
              <Activity className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex flex-col items-center justify-center py-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                <Activity className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mb-2 text-center">아직 활성화 이력이 없습니다</p>
              <Link 
                href="/dashboard/naver/activation"
                className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-semibold rounded-lg hover:shadow-lg transition-all duration-300"
              >
                활성화 확인하기
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 온보딩 섹션 */}
      <OnboardingSection onStoreRegistered={reloadStores} />

      {/* 통계 카드 그리드 */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* 크레딧 카드 */}
        <div className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-lg sm:rounded-xl">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div className="text-xs text-gray-500 font-medium px-2 sm:px-3 py-1 bg-gray-100 rounded-full">
              크레딧
            </div>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm mb-1">잔여 크레딧</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800">
            {remainingCredits}
          </p>
          {totalCredits !== -1 && (
            <>
              <div className="mt-2 sm:mt-3 bg-gray-100 rounded-full h-1.5 sm:h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${creditPercentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 sm:mt-2">
                전체: {totalCredits.toLocaleString()}
              </p>
            </>
          )}
        </div>

        {/* 매장 Quota 카드 */}
        <div className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg sm:rounded-xl">
              <StoreIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div className="text-xs text-gray-500 font-medium px-2 sm:px-3 py-1 bg-gray-100 rounded-full">
              매장
            </div>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm mb-1">등록 매장</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800">
            {stores.length}
            {maxStores !== -1 && <span className="text-base sm:text-lg text-gray-400"> / {maxStores}</span>}
          </p>
          <div className="mt-2 sm:mt-3">
            {maxStores === -1 ? (
              <span className="text-xs text-green-600 font-semibold px-2 py-1 bg-green-50 rounded-full inline-block">
                ✨ 무제한
              </span>
            ) : stores.length >= maxStores ? (
              <span className="text-xs text-red-600 font-semibold px-2 py-1 bg-red-50 rounded-full inline-block">
                ⚠️ 한도 도달
              </span>
            ) : (
              <span className="text-xs text-blue-600 font-semibold px-2 py-1 bg-blue-50 rounded-full inline-block">
                ➕ {maxStores - stores.length}개 가능
              </span>
            )}
          </div>
        </div>

        {/* 추적 키워드 카드 */}
        <div className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg sm:rounded-xl">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
            </div>
            <div className="text-xs text-gray-500 font-medium px-2 sm:px-3 py-1 bg-gray-100 rounded-full">
              추적
            </div>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm mb-1">추적 키워드</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">
            {trackers.length}
            {maxTrackers !== -1 && <span className="text-base sm:text-lg text-gray-400"> / {maxTrackers}</span>}
          </p>
          
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600">활성 <span className="font-bold text-gray-800">{trackers.filter(t => t.is_active).length}</span></span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-gray-600">비활성 <span className="font-bold text-gray-800">{trackers.filter(t => !t.is_active).length}</span></span>
            </div>
            {maxTrackers !== -1 && maxTrackers - trackers.length > 0 && (
              <span className="text-xs text-indigo-600 font-semibold px-2 py-1 bg-indigo-50 rounded-full inline-block">
                +{maxTrackers - trackers.length}개 가능
              </span>
            )}
            {maxTrackers === -1 && (
              <span className="text-xs text-green-600 font-semibold px-2 py-1 bg-green-50 rounded-full inline-block">
                ✨ 무제한
              </span>
            )}
          </div>
        </div>

        {/* 플레이스 진단 카드 */}
        <Link 
          href={latestDiagnosis ? `/dashboard/naver/audit?historyId=${latestDiagnosis.id}` : '/dashboard/naver/audit'}
          className="group block bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg sm:rounded-xl">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div className="text-xs text-gray-500 font-medium px-2 sm:px-3 py-1 bg-gray-100 rounded-full">
              진단
            </div>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm mb-1">플레이스 진단</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">
            {latestDiagnosis ? `${latestDiagnosis.grade}등급` : '진단 기록 없음'}
          </p>
          
          {latestDiagnosis ? (
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-purple-900">{latestDiagnosis.store_name}</span>
                <span className={`text-2xl font-bold ${
                  latestDiagnosis.grade === 'S' ? 'text-purple-600' :
                  latestDiagnosis.grade === 'A' ? 'text-blue-600' :
                  latestDiagnosis.grade === 'B' ? 'text-green-600' :
                  latestDiagnosis.grade === 'C' ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {latestDiagnosis.grade}
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-1">
                점수: {latestDiagnosis.total_score.toFixed(1)} / {latestDiagnosis.max_score}점
              </p>
              <p className="text-xs text-gray-500">
                {new Date(latestDiagnosis.diagnosed_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <div className="mt-2 pt-2 border-t border-purple-200">
                <span className="text-sm font-semibold text-purple-700">상세 리포트 보기 →</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-2">아직 진단 기록이 없습니다</p>
              <p className="text-xs text-gray-500 mb-3">진단 기능을 통해 매장의 상태를 분석하세요</p>
              <span className="text-sm font-semibold text-purple-700">진단 시작하기 →</span>
            </div>
          )}
        </Link>
      </div>

      {/* 매장별 추적 키워드 리스트 */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 sm:p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              <h3 className="text-xl sm:text-2xl font-bold text-white">매장별 추적 키워드</h3>
              <span className="px-2 sm:px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs sm:text-sm font-semibold rounded-full">
                {storeGroups.length}개 매장
              </span>
            </div>
            <div className="flex items-center gap-2">
              {storeGroups.length > 0 && (
                <button
                  onClick={toggleReordering}
                  className={`px-3 sm:px-4 py-2 font-semibold rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 text-xs sm:text-sm flex items-center gap-2 ${
                    isReordering 
                      ? 'bg-green-500 text-white' 
                      : 'bg-white text-indigo-600'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  {isReordering ? '완료' : '순서변경'}
                </button>
              )}
              <Link 
                href="/dashboard/naver/metrics-tracker"
                className="px-3 sm:px-4 py-2 bg-white text-indigo-600 font-semibold rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 text-xs sm:text-sm"
              >
                + 추적관리
              </Link>
            </div>
          </div>
        </div>
        
        <div className="p-4 sm:p-6">
          {storeGroups.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="bg-gray-100 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2 text-sm sm:text-base">추적 중인 키워드가 없습니다</p>
              <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">키워드 순위를 실시간으로 추적해보세요</p>
              <Link 
                href="/dashboard/naver/metrics-tracker"
                className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 text-sm"
              >
                추적 시작하기
                <ArrowUpRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={storeGroups.map(g => g.store_id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {storeGroups.map((storeGroup) => (
                    <SortableStoreTrackerCard
                      key={storeGroup.store_id}
                      storeGroup={storeGroup}
                      storeColor={storeColorMap[storeGroup.store_id] || STORE_COLORS[0]}
                      isReordering={isReordering}
                      onRefreshTracker={handleRefreshTracker}
                      onRefreshAllTrackers={handleRefreshAllTrackers}
                      isRefreshing={isRefreshing}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* 등록 매장 리스트 */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 sm:p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <StoreIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              <h3 className="text-xl sm:text-2xl font-bold text-white">등록 매장</h3>
              <span className="px-2 sm:px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs sm:text-sm font-semibold rounded-full">
                {stores.length}개
              </span>
            </div>
            <Link 
              href="/dashboard/naver/store-registration"
              className="px-3 sm:px-4 py-2 bg-white text-purple-600 font-semibold rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 text-xs sm:text-sm"
            >
              + 매장 추가
            </Link>
          </div>
        </div>
        
        <div className="p-4 sm:p-6">
          {stores.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="bg-gray-100 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <StoreIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-3 sm:mb-4 text-sm sm:text-base">등록된 매장이 없습니다</p>
              <Link 
                href="/dashboard/naver/store-registration"
                className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 text-sm"
              >
                첫 매장 등록하기
                <ArrowUpRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {stores.map((store, index) => {
                const storeColor = STORE_COLORS[index % STORE_COLORS.length]
                return (
                  <Link 
                    href={`/dashboard/naver/reviews?storeId=${store.id}`}
                    key={store.id}
                    className="group"
                  >
                    <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 ${storeColor.border} hover:shadow-xl transition-all duration-300 bg-gradient-to-br ${storeColor.bg}`}>
                      <div className="flex items-start gap-3 mb-2 sm:mb-3">
                        {/* 매장 썸네일 */}
                        {store.thumbnail ? (
                          <div className="flex-shrink-0">
                            <img 
                              src={store.thumbnail} 
                              alt={store.name || store.store_name || '매장'} 
                              className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover border-2 border-white shadow-sm"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                const parent = e.currentTarget.parentElement
                                if (parent) {
                                  parent.innerHTML = '<div class="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-white/80 flex items-center justify-center border-2 border-white shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-gray-400"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>'
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-white/80 flex items-center justify-center border-2 border-white shadow-sm">
                              <StoreIcon className="w-6 h-6 text-gray-400" />
                            </div>
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`font-bold text-sm sm:text-base group-hover:opacity-80 transition-opacity truncate ${storeColor.text}`} title={store.name || store.store_name || '매장명 없음'}>
                              {store.name || store.store_name || '매장명 없음'}
                            </h4>
                            <div className={`px-2 py-1 rounded-md text-xs font-bold ml-2 flex-shrink-0 ${
                              store.status === 'active' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {store.status === 'active' ? '✓' : '○'}
                            </div>
                          </div>
                          {store.address && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate line-clamp-1">{store.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 sm:px-3 py-1 rounded-md text-xs font-bold ${
                          store.platform === 'naver' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-blue-500 text-white'
                        }`}>
                          {store.platform === 'naver' ? '네이버' : '구글'}
                        </span>
                        
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span className="hidden sm:inline">
                            {new Date(store.created_at).toLocaleDateString('ko-KR', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                          <span className="sm:hidden">
                            {new Date(store.created_at).toLocaleDateString('ko-KR', { 
                              month: 'numeric', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
