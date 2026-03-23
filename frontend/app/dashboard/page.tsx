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
import { useCollectionQueue } from "@/lib/hooks/useCollectionQueue"
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
  TrendingDown,
  Eye,
  Users
} from "lucide-react"
import Link from "next/link"
// OnboardingSection moved to /dashboard/getting-started page
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { notifyCreditUsed } from '@/lib/credit-utils'

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

// 매장별 색상 팔레트 (TurboTax 스타일 - 중립적 + Emerald 강조)
const STORE_COLORS = [
  { bg: 'bg-white', border: 'border-emerald-500', text: 'text-neutral-900', badge: 'bg-emerald-500', accent: 'bg-emerald-100' },
  { bg: 'bg-white', border: 'border-neutral-300', text: 'text-neutral-900', badge: 'bg-neutral-700', accent: 'bg-neutral-100' },
  { bg: 'bg-white', border: 'border-emerald-400', text: 'text-neutral-900', badge: 'bg-emerald-400', accent: 'bg-emerald-50' },
  { bg: 'bg-white', border: 'border-neutral-400', text: 'text-neutral-900', badge: 'bg-neutral-600', accent: 'bg-neutral-50' },
  { bg: 'bg-white', border: 'border-emerald-300', text: 'text-neutral-900', badge: 'bg-emerald-600', accent: 'bg-emerald-100' },
  { bg: 'bg-white', border: 'border-neutral-300', text: 'text-neutral-900', badge: 'bg-neutral-700', accent: 'bg-neutral-100' },
  { bg: 'bg-white', border: 'border-emerald-500', text: 'text-neutral-900', badge: 'bg-emerald-500', accent: 'bg-emerald-100' },
  { bg: 'bg-white', border: 'border-neutral-400', text: 'text-neutral-900', badge: 'bg-neutral-600', accent: 'bg-neutral-50' },
]

// 드래그 가능한 매장별 추적 키워드 카드
function SortableStoreTrackerCard({ 
  storeGroup, 
  storeColor, 
  isReordering,
  onRefreshTracker,
  onRefreshAllTrackers,
  onViewMetrics,
  onViewCompetitors,
  isRefreshing,
  getQueueStatus,
}: { 
  storeGroup: StoreTrackerGroup
  storeColor: typeof STORE_COLORS[0]
  isReordering: boolean
  onRefreshTracker: (trackerId: string) => Promise<void>
  onRefreshAllTrackers: (storeId: string) => Promise<void>
  onViewMetrics: (tracker: MetricTracker) => void
  onViewCompetitors: (tracker: MetricTracker) => void
  isRefreshing: Set<string>
  getQueueStatus: (id: string) => 'collecting' | 'queued' | undefined
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
    <div ref={setNodeRef} style={style} className="group w-full min-w-0">
      <div 
        className={`relative p-3 md:p-4 rounded-card border-2 ${storeColor.border} ${storeColor.bg} shadow-card hover:shadow-card-hover transition-all duration-200 ${isReordering ? 'cursor-move touch-none' : ''} w-full overflow-hidden`}
        {...(isReordering ? { ...attributes, ...listeners } : {})}
      >
        {/* 드래그 핸들 */}
        {isReordering && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
            <GripVertical className="w-4 h-4 text-neutral-400" />
          </div>
        )}
        
        <div className={`${isReordering ? 'ml-6' : ''} w-full overflow-hidden`}>
          {/* 헤더: 매장명 + 썸네일 + 전체 새로고침 */}
          <div className="flex items-center justify-between mb-3 w-full min-w-0">
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
              {/* 매장 썸네일 */}
              {storeGroup.store_thumbnail ? (
                <img 
                  src={storeGroup.store_thumbnail} 
                  alt={storeGroup.store_name} 
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
              
              {/* 매장명 */}
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-base md:text-lg ${storeColor.text} truncate leading-tight mb-1`}>
                  {storeGroup.store_name}
                </h3>
                <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-bold ${
                  storeGroup.platform === 'naver' 
                    ? 'bg-success text-white' 
                    : 'bg-info text-white'
                }`}>
                  {storeGroup.platform === 'naver' ? 'N' : 'G'}
                </span>
              </div>
            </div>
            
            {/* 전체 새로고침 버튼 - 모바일 최적화 */}
            {(() => {
              const storeQueueStatus = getQueueStatus(`store_${storeGroup.store_id}`)
              const isBusy = !!storeQueueStatus
              return (
                <button
                  onClick={() => onRefreshAllTrackers(storeGroup.store_id)}
                  disabled={isBusy}
                  className={`flex items-center justify-center gap-1 px-2 md:px-3 py-2 rounded-button font-bold text-xs transition-all duration-200 flex-shrink-0 min-w-[44px] min-h-[44px] ${
                    storeQueueStatus === 'queued'
                      ? 'bg-amber-100 text-amber-600 cursor-wait'
                      : isBusy
                        ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-button hover:shadow-button-hover active:scale-95'
                  }`}
                  title={storeQueueStatus === 'queued' ? '대기 중 - 이전 수집이 완료되면 자동으로 시작됩니다' : '이 매장의 모든 추적키워드 순위를 지금 수집합니다!'}
                >
                  {storeQueueStatus === 'queued' ? (
                    <>
                      <Clock className="w-4 h-4" />
                      <span className="hidden md:inline">대기</span>
                    </>
                  ) : storeQueueStatus === 'collecting' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="hidden md:inline">수집중</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span className="hidden md:inline">전체</span>
                    </>
                  )}
                </button>
              )
            })()}
          </div>

          {/* 매장 리뷰 지표 - 컴팩트 */}
          <div className="grid grid-cols-2 gap-2 mb-3 w-full overflow-hidden">
            {/* 방문자 리뷰 */}
            <div className="bg-neutral-50 rounded-button border border-neutral-200 p-2">
              <div className="flex items-center gap-1 mb-1">
                <MessageSquare className="w-3 h-3 text-neutral-600" />
                <span className="text-xs text-neutral-600 font-bold truncate">방문자</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg md:text-xl font-bold text-neutral-900 leading-tight">
                  {storeGroup.visitor_review_count ?? 0}
                </span>
                {storeGroup.visitor_review_change !== undefined && storeGroup.visitor_review_change !== null && storeGroup.visitor_review_change !== 0 && (
                  <span className={`text-xs font-bold flex items-center gap-0.5 ${
                    storeGroup.visitor_review_change > 0 ? 'text-success' : 'text-error'
                  }`}>
                    {storeGroup.visitor_review_change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {storeGroup.visitor_review_change > 0 ? '+' : ''}{storeGroup.visitor_review_change}
                  </span>
                )}
              </div>
            </div>

            {/* 블로그 리뷰 */}
            <div className="bg-neutral-50 rounded-button border border-neutral-200 p-2">
              <div className="flex items-center gap-1 mb-1">
                <FileText className="w-3 h-3 text-neutral-600" />
                <span className="text-xs text-neutral-600 font-bold truncate">블로그</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg md:text-xl font-bold text-neutral-900 leading-tight">
                  {storeGroup.blog_review_count ?? 0}
                </span>
                {storeGroup.blog_review_change !== undefined && storeGroup.blog_review_change !== null && storeGroup.blog_review_change !== 0 && (
                  <span className={`text-xs font-bold flex items-center gap-0.5 ${
                    storeGroup.blog_review_change > 0 ? 'text-success' : 'text-error'
                  }`}>
                    {storeGroup.blog_review_change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {storeGroup.blog_review_change > 0 ? '+' : ''}{storeGroup.blog_review_change}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 추적 키워드 목록 (최대 4개) - 모바일 최적화 */}
          <div className="space-y-2 w-full overflow-hidden">
            {/* 키워드 슬롯 4개 (빈 슬롯 포함) */}
            {[...Array(4)].map((_, index) => {
              const tracker = visibleTrackers[index]
              
              if (tracker) {
                // 개별 트래커 상태 또는 부모 매장 상태를 폴백으로 사용
                const trackerStatus = getQueueStatus(tracker.id) || getQueueStatus(`store_${storeGroup.store_id}`)
                
                // 실제 키워드가 있는 경우 - 키워드순위추적 페이지 스타일 2단 구조
                return (
                  <div
                    key={tracker.id}
                    className="bg-white rounded-button border border-neutral-200 p-2.5 md:p-3 shadow-sm hover:shadow-md transition-shadow duration-200 w-full overflow-hidden"
                  >
                    {/* 1단: 키워드명 + 수집시간 | 순위 + 수집버튼 */}
                    <div className="flex items-center justify-between gap-2 w-full min-w-0 mb-2">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-1.5 mb-0.5 w-full min-w-0">
                          <span className={`font-bold text-sm md:text-base ${storeColor.text} truncate block`}>
                            {tracker.keyword}
                          </span>
                          <span className="text-xs text-neutral-600 font-medium px-1.5 py-0.5 bg-neutral-100 rounded-full hidden md:inline flex-shrink-0">
                            {tracker.update_frequency === 'daily_once' ? '1회/일' : 
                             tracker.update_frequency === 'daily_twice' ? '2회/일' : '3회/일'}
                          </span>
                        </div>
                        {/* 수집 시간 */}
                        <div className="flex items-center gap-1 text-xs text-neutral-500">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          {trackerStatus === 'collecting' ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              수집 중...
                            </span>
                          ) : trackerStatus === 'queued' ? (
                            <span className="flex items-center gap-1 text-amber-600 font-medium">
                              <Clock className="w-3 h-3" />
                              대기 중...
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
                      
                      {/* 순위 + 수집버튼 */}
                      <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                        {trackerStatus === 'collecting' ? (
                          <div className="w-14 h-12 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                          </div>
                        ) : trackerStatus === 'queued' ? (
                          <div className="w-14 h-12 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-500" />
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

                        {/* 수집 버튼 */}
                        <button
                          onClick={() => onRefreshTracker(tracker.id)}
                          disabled={!!trackerStatus}
                          className={`p-2 rounded-button transition-all duration-200 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                            trackerStatus === 'queued'
                              ? 'bg-amber-50 text-amber-500 cursor-wait'
                              : trackerStatus === 'collecting'
                                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                                : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 hover:shadow-sm active:scale-95'
                          }`}
                          title={trackerStatus === 'queued' ? '대기 중 - 순서대로 자동 실행됩니다' : '이 키워드 순위를 지금 수집합니다'}
                        >
                          {trackerStatus === 'collecting' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : trackerStatus === 'queued' ? (
                            <Clock className="w-4 h-4" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 리뷰 지표 + 액션 버튼 - 키워드순위추적 페이지와 동일 */}
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

                        {/* 지표 + 경쟁매장 버튼 */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => onViewMetrics(tracker)}
                            className="p-2 rounded-button bg-primary-100 text-primary-600 hover:bg-primary-200 hover:shadow-sm active:scale-95 transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center"
                            title="지표 보기"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onViewCompetitors(tracker)}
                            className="p-2 rounded-button bg-amber-100 text-amber-700 hover:bg-amber-200 hover:shadow-sm active:scale-95 transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center"
                            title="경쟁매장 보기"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              } else {
                // 빈 슬롯 - 추적키워드 추가 버튼
                return (
                  <Link
                    key={`empty-${index}`}
                    href="/dashboard/naver/metrics-tracker"
                    className="block bg-white border-2 border-dashed border-neutral-300 rounded-button p-3 min-h-[64px] md:min-h-[72px] flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-500 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-1.5 text-neutral-500 group-hover:text-emerald-600">
                      <span className="text-xl font-bold">+</span>
                      <span className="text-xs md:text-sm font-bold">추적키워드 추가</span>
                    </div>
                  </Link>
                )
              }
            })}
            
            {/* 더 많은 키워드가 있을 경우 */}
            {storeGroup.trackers.length > 4 && (
              <Link
                href="/dashboard/naver/metrics-tracker"
                className="block text-center py-2 text-sm text-emerald-600 hover:text-emerald-700 font-bold transition-colors duration-200"
              >
                +{storeGroup.trackers.length - 4}개 더보기 →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// DailyMetric interface for metrics modal
interface DailyMetric {
  id: string
  collection_date: string
  rank: number | null
  visitor_review_count: number
  blog_review_count: number
  save_count: number
  collected_at: string
  keyword?: string
  store_name?: string
}

// CompetitorStore interface for competitor modal
interface CompetitorStore {
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
}

// Force redeploy v2 - Review Analysis Modal (2026-01-29 02:40)
export default function DashboardPage() {
  const { user, getToken, loading: authLoading } = useAuth()
  const { toast } = useToast()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [trackers, setTrackers] = useState<MetricTracker[]>([])
  const [storeGroups, setStoreGroups] = useState<StoreTrackerGroup[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isReordering, setIsReordering] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState<Set<string>>(new Set())
  const collectionQueue = useCollectionQueue()
  const [latestDiagnosis, setLatestDiagnosis] = useState<LatestDiagnosis | null>(null)
  const [latestActivation, setLatestActivation] = useState<LatestActivation | null>(null)
  
  // 지표 보기 모달
  const [showMetricsDialog, setShowMetricsDialog] = useState(false)
  const [selectedTracker, setSelectedTracker] = useState<MetricTracker | null>(null)
  const [metrics, setMetrics] = useState<DailyMetric[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(false)

  // 경쟁매장 보기 모달
  const [showCompetitorDialog, setShowCompetitorDialog] = useState(false)
  const [competitorKeyword, setCompetitorKeyword] = useState("")
  const [competitorMyRank, setCompetitorMyRank] = useState<number | null>(null)
  const [competitorTotalCount, setCompetitorTotalCount] = useState(0)
  const [competitors, setCompetitors] = useState<CompetitorStore[]>([])
  const [loadingCompetitors, setLoadingCompetitors] = useState(false)
  
  // 🆕 실제 크레딧 정보 (Credits API)
  const [credits, setCredits] = useState<{
    monthly_credits: number
    monthly_used: number
    total_remaining: number
    tier: string
    percentage_used: number
  } | null>(null)
  
  // 구독 정보 (취소 상태 표시용 + 쿼터 정보)
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    status: string
    tier: string
    expires_at?: string
    next_billing_date?: string
    cancelled_at?: string
    max_stores?: number
    max_keywords?: number
    max_auto_collection?: number
    monthly_credits?: number
  } | null>(null)
  
  // 드래그앤드롭 센서 설정
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 8,
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

  // 지표 보기 핸들러
  const handleViewMetrics = async (tracker: MetricTracker) => {
    setSelectedTracker(tracker)
    setMetrics([])
    setShowMetricsDialog(true)
    setLoadingMetrics(true)

    try {
      const token = getToken()
      if (!token) return

      // tracker의 실제 tracker ID로 metrics 조회
      // tracker 목록에서 해당 tracker의 id를 찾아야 함
      const response = await fetch(api.metrics.getMetrics(tracker.id), {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: "no-store"
      })

      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics || [])
      } else {
        toast({
          title: "조회 실패",
          description: "지표 데이터를 불러오는데 실패했습니다",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "조회 실패",
        description: "지표 데이터를 불러오는데 실패했습니다",
        variant: "destructive"
      })
    } finally {
      setLoadingMetrics(false)
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
        setCompetitors(data.competitors || [])
        setCompetitorMyRank(data.my_rank)
        setCompetitorTotalCount(data.total_count || 0)
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

  // 경쟁매장 보기 핸들러 (DB에서 불러옴 - 수집 시 자동 저장됨)
  const handleViewCompetitors = async (tracker: MetricTracker) => {
    setCompetitorKeyword(tracker.keyword)
    setShowCompetitorDialog(true)
    await fetchCompetitorData(tracker.keyword, tracker.store_id)
  }

  // 개별 키워드 새로고침 (큐 시스템 적용 - 동시 6개 제한)
  const handleRefreshTracker = async (trackerId: string) => {
    const token = getToken()
    if (!token) return

    collectionQueue.enqueueKeyword(trackerId, async () => {
      try {
        const response = await fetch(api.metrics.collectNow(trackerId), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          await response.json()
          await new Promise(resolve => setTimeout(resolve, 500))
          notifyCreditUsed(5, token)
        }

        await loadTrackers()
      } catch (error) {
        console.error('Failed to refresh tracker:', error)
      }
    })
  }

  // 매장 전체 키워드 새로고침 (큐 시스템 적용 - 동시 2개 매장 제한)
  const handleRefreshAllTrackers = async (storeId: string) => {
    const token = getToken()
    if (!token) return

    collectionQueue.enqueueStore(storeId, async () => {
      const storeTrackers = trackers.filter(t => t.store_id === storeId)

      try {
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

        const successCount = responses.filter(r => r !== null).length
        await new Promise(resolve => setTimeout(resolve, 1000))
        if (successCount > 0) notifyCreditUsed(successCount * 5, token)
        await loadTrackers()
      } catch (error) {
        console.error('Failed to refresh all trackers:', error)
      }
    })
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
      if (!token) {
        console.error('토큰이 없어 순서 저장 불가')
        return
      }
      
      // 각 매장의 순서를 배열로 생성
      const orders = orderedGroups.map((group, index) => ({
        store_id: group.store_id,
        display_order: index
      }))
      
      console.log('[순서변경] 저장 중:', orders)
      
      const response = await fetch(api.stores.reorder(), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orders })
      })
      
      if (response.ok) {
        console.log('[순서변경] 저장 성공')
        // stores state도 업데이트하여 정렬 유지
        setStores(prevStores => {
          const updatedStores = prevStores.map(store => {
            const order = orders.find(o => o.store_id === store.id)
            return order ? { ...store, display_order: order.display_order } : store
          })
          return updatedStores.sort((a, b) => {
            const orderA = a.display_order ?? 999
            const orderB = b.display_order ?? 999
            return orderA - orderB
          })
        })
      } else {
        console.error('[순서변경] 저장 실패:', response.status, await response.text())
      }
    } catch (error) {
      console.error('[순서변경] 저장 중 오류:', error)
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
      },
      cache: "no-store"
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
        },
        cache: "no-store"
      })
      
      if (storesRes.ok) {
        const storesData = await storesRes.json()
        let loadedStores = storesData.stores || []
        
        // display_order로 정렬 (없으면 999로 처리)
        loadedStores = loadedStores.sort((a: Store, b: Store) => {
          const orderA = a.display_order ?? 999
          const orderB = b.display_order ?? 999
          return orderA - orderB
        })
        
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

        // 🆕 1-1. 실제 크레딧 조회 (Credits API) + 구독 정보 조회
        try {
          const [creditsRes, subRes] = await Promise.all([
            fetch(`${api.baseUrl}/api/v1/credits/me`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${api.baseUrl}/api/v1/subscriptions/me`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
          ])
          
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
          
          if (subRes.ok) {
            const subData = await subRes.json()
            setSubscriptionInfo(subData)
          }
        } catch (error) {
          console.log('[INFO] Credits/Subscription API not available yet:', error)
          // 크레딧 API가 아직 없으면 기존 프로필 데이터 사용
        }

        // 2. 매장 목록 조회
        const storesRes = await fetch(api.stores.list(), {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          cache: "no-store"
        })
        
        let loadedStores: Store[] = []
        if (storesRes.ok) {
          const storesData = await storesRes.json()
          loadedStores = storesData.stores || []
          
          // display_order로 정렬 (없으면 999로 처리)
          loadedStores = loadedStores.sort((a: Store, b: Store) => {
            const orderA = a.display_order ?? 999
            const orderB = b.display_order ?? 999
            return orderA - orderB
          })
          
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
            <Loader2 className="h-12 w-12 md:h-16 md:w-16 animate-spin text-emerald-600 mx-auto mb-4" />
            <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-brand-red absolute top-0 right-0 animate-pulse" />
          </div>
          <p className="text-neutral-900 text-lg md:text-xl font-bold leading-tight">대시보드를 불러오는 중...</p>
          <p className="text-neutral-600 text-sm md:text-base mt-2">잠시만 기다려주세요</p>
        </div>
      </div>
    )
  }

  // 사용자 정보 없음
  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="text-center max-w-md">
          <div className="bg-emerald-100 rounded-full w-20 h-20 md:w-24 md:h-24 flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 md:w-12 md:h-12 text-emerald-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-3 leading-tight">환영합니다!</h2>
          <p className="text-neutral-700 mb-6 text-base md:text-lg leading-relaxed">
            위플레이스에서 네이버 플레이스와 구글 비즈니스를 관리하세요.
          </p>
          <Link 
            href="/dashboard/naver/store-registration"
            className="inline-flex items-center px-6 py-3 md:px-8 md:py-4 bg-emerald-600 text-white font-bold rounded-button shadow-button hover:bg-emerald-700 hover:shadow-button-hover active:scale-95 transition-all duration-200 text-base md:text-lg"
          >
            매장 등록하기
            <ArrowUpRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </div>
    )
  }

  // Tier 정보 (TurboTax 스타일 - Emerald 테마)
  const tierInfo = {
    free: { 
      label: '무료', 
      color: 'bg-neutral-600', 
      Icon: Shield,
      iconColor: 'text-neutral-600',
      textColor: 'text-neutral-700',
      badgeBg: 'bg-neutral-100',
      badgeText: 'text-neutral-700'
    },
    basic: { 
      label: '베이직', 
      color: 'bg-emerald-500', 
      Icon: Star,
      iconColor: 'text-emerald-600',
      textColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-700'
    },
    basic_plus: { 
      label: '베이직플러스', 
      color: 'bg-blue-500', 
      Icon: Star,
      iconColor: 'text-blue-600',
      textColor: 'text-blue-700',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700'
    },
    pro: { 
      label: '프로', 
      color: 'bg-emerald-600', 
      Icon: Gem,
      iconColor: 'text-emerald-700',
      textColor: 'text-emerald-800',
      badgeBg: 'bg-emerald-200',
      badgeText: 'text-emerald-800'
    },
    custom: { 
      label: '커스텀', 
      color: 'bg-purple-500', 
      Icon: Gem,
      iconColor: 'text-purple-600',
      textColor: 'text-purple-700',
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-700'
    },
    god: { 
      label: 'GOD', 
      color: 'bg-brand-red', 
      Icon: Crown,
      iconColor: 'text-brand-red',
      textColor: 'text-brand-red',
      badgeBg: 'bg-error-bg',
      badgeText: 'text-brand-red'
    },
  }

  const currentTier = profile?.subscription_tier || 'free'
  const tier = tierInfo[currentTier as keyof typeof tierInfo] || tierInfo.free

  // 🆕 크레딧 계산 (실제 Credits API 데이터 우선 사용)
  const totalCredits = credits?.monthly_credits ?? (profile?.total_credits ?? 1000)
  const usedCredits = credits?.monthly_used ?? (profile?.used_credits ?? 0)
  const remainingCredits = totalCredits === -1 ? '무제한' : (totalCredits - usedCredits).toLocaleString()
  const creditPercentage = totalCredits === -1 ? 100 : ((totalCredits - usedCredits) / totalCredits) * 100

  // Quota 계산
  const maxStores = subscriptionInfo?.max_stores ?? profile?.max_stores ?? 1
  const maxKeywords = subscriptionInfo?.max_keywords ?? profile?.max_keywords ?? 1
  const maxTrackers = subscriptionInfo?.max_auto_collection ?? profile?.max_trackers ?? 1

  return (
    <div className="space-y-3 md:space-y-4 lg:space-y-5 pb-6 md:pb-8 overflow-x-hidden">
      {/* 시작하기 바로가기 버튼 */}
      <Link
        href="/dashboard/getting-started"
        className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl px-4 py-3 md:px-5 md:py-3.5 hover:from-emerald-100 hover:to-teal-100 hover:border-emerald-300 hover:shadow-md active:scale-[0.99] transition-all duration-200 group min-h-[52px]"
      >
        <div className="w-9 h-9 md:w-10 md:h-10 bg-emerald-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
          <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm md:text-base font-bold text-emerald-800 leading-tight">
            쉽고 빠르게 시작하기
          </p>
          <p className="text-[10px] md:text-xs text-emerald-600">
            단계별 가이드를 따라 서비스를 시작해보세요
          </p>
        </div>
        <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-emerald-500 group-hover:text-emerald-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0" />
      </Link>

      {/* 계정 정보, 플레이스 활성화, 플레이스 진단 카드 - 한 줄 배치 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-3 lg:gap-4 w-full overflow-x-hidden">
        {/* 계정 정보 카드 - 스크린샷 스타일 */}
        <div className="bg-white rounded-card border border-neutral-300 shadow-card hover:shadow-card-hover transition-shadow duration-200 p-3 md:p-4 lg:p-5">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className={`${tier.color} p-1.5 md:p-2 rounded-button shadow-sm`}>
                <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm md:text-base lg:text-lg font-bold text-neutral-900 leading-tight">
                  {profile.display_name || profile.email.split('@')[0]}님
                </h3>
                <p className="text-xs text-neutral-600 font-medium">계정 정보</p>
              </div>
            </div>
            <div className={`px-2 md:px-2.5 py-0.5 md:py-1 ${tier.color} text-white rounded-button shadow-sm flex items-center gap-0.5 md:gap-1`}>
              <tier.Icon className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-xs md:text-sm font-bold">{tier.label}</span>
            </div>
          </div>

          {/* 기본 정보 */}
          <div className="space-y-2 md:space-y-2.5 mb-3">
            {/* 이메일 */}
            <div className="bg-neutral-50 rounded-button p-2 md:p-2.5 border border-neutral-200">
              <p className="text-xs text-neutral-600 font-bold mb-0.5">이메일</p>
              <p className="text-xs md:text-sm font-medium text-neutral-900 truncate">{profile.email}</p>
            </div>

            {/* 가입일 */}
            {profile.created_at && (
              <div className="bg-neutral-50 rounded-button p-2 md:p-2.5 border border-neutral-200">
                <p className="text-xs text-neutral-600 font-bold mb-0.5">가입일</p>
                <p className="text-xs md:text-sm font-medium text-neutral-900">
                  {new Date(profile.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}
          </div>

          {/* 쿼터 정보 */}
          <div className="grid grid-cols-2 gap-2 md:gap-2.5 w-full overflow-hidden">
            {/* 등록매장 */}
            <div className="bg-neutral-50 rounded-button p-2 md:p-2.5 border border-neutral-200">
              <p className="text-xs text-neutral-600 font-bold mb-0.5 md:mb-1">등록 매장</p>
              <div className="flex items-baseline gap-1 mb-1 md:mb-1.5">
                <span className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">{stores.length}</span>
                {maxStores !== -1 && (
                  <span className="text-xs md:text-sm text-neutral-600">/ {maxStores}</span>
                )}
                {maxStores === -1 && (
                  <span className="text-xs md:text-sm text-success font-bold">무제한</span>
                )}
              </div>
              {maxStores !== -1 && maxStores - stores.length > 0 && (
                <p className="text-xs text-emerald-600 font-bold">+{maxStores - stores.length}개 가능</p>
              )}
            </div>

            {/* 추적키워드 */}
            <div className="bg-neutral-50 rounded-button p-2 md:p-2.5 border border-neutral-200">
              <p className="text-xs text-neutral-600 font-bold mb-0.5 md:mb-1">추적 키워드</p>
              <div className="flex items-baseline gap-1 mb-1 md:mb-1.5">
                <span className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">{trackers.length}</span>
                {maxTrackers !== -1 && (
                  <span className="text-xs md:text-sm text-neutral-600">/ {maxTrackers}</span>
                )}
                {maxTrackers === -1 && (
                  <span className="text-xs md:text-sm text-success font-bold">무제한</span>
                )}
              </div>
              {maxTrackers !== -1 && maxTrackers - trackers.length > 0 && (
                <p className="text-xs text-emerald-600 font-bold">+{maxTrackers - trackers.length}개 가능</p>
              )}
            </div>
          </div>

          {/* 구독 취소 안내 */}
          {subscriptionInfo?.status === 'cancelled' && subscriptionInfo?.expires_at && (
            <div className="mt-2.5 p-2.5 bg-red-50 border border-red-200 rounded-button">
              <p className="text-xs font-bold text-red-700 mb-0.5">⚠️ 구독 취소됨</p>
              <p className="text-xs text-red-600">
                {new Date(subscriptionInfo.expires_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}까지 이용 가능
              </p>
              <p className="text-xs text-red-500 mt-0.5">이후 Free 플랜으로 전환됩니다</p>
            </div>
          )}
          {/* 다음 결제일 */}
          {subscriptionInfo?.status === 'active' && subscriptionInfo?.next_billing_date && currentTier !== 'free' && currentTier !== 'god' && (
            <div className="mt-2.5 p-2.5 bg-blue-50 border border-blue-200 rounded-button">
              <p className="text-xs text-blue-700">
                <span className="font-bold">다음 결제일:</span>{' '}
                {new Date(subscriptionInfo.next_billing_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
              </p>
            </div>
          )}
        </div>
        {/* 플레이스 활성화 카드 - 스크린샷 스타일 */}
        {latestActivation && latestActivation.summary_cards && latestActivation.summary_cards.length > 0 ? (
          <Link 
            href="/dashboard/naver/activation"
            className="group block bg-white rounded-card border border-neutral-300 p-3 md:p-4 lg:p-5 shadow-card hover:shadow-card-hover transition-all duration-200"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="p-1.5 md:p-2 bg-emerald-100 rounded-button">
                  <Activity className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base lg:text-lg font-bold text-neutral-900 leading-tight truncate">
                    {latestActivation.store_name || '매장명 없음'}
                  </h3>
                  <p className="text-xs text-neutral-600">플레이스 활성화</p>
                </div>
              </div>
              <div className="text-xs text-neutral-600">
                {new Date(latestActivation.created_at).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
            
            {/* 활성화 지표 그리드 */}
            <div className="space-y-2 md:space-y-2.5 w-full overflow-hidden">
              {/* 첫 번째 행: 방문자 리뷰, 답글 대기 */}
              <div className="grid grid-cols-2 gap-2 md:gap-2.5 w-full overflow-hidden">
                {latestActivation.summary_cards.filter(card => 
                  card.type === 'visitor_review' || card.type === 'pending_reply'
                ).map((card) => (
                  <div 
                    key={card.type} 
                    className="bg-neutral-50 rounded-button p-2 md:p-2.5 border border-neutral-200"
                  >
                    <p className="text-xs text-neutral-600 font-bold mb-0.5 md:mb-1">{card.title}</p>
                    <div className="flex items-baseline gap-1 mb-1 md:mb-1.5">
                      <span className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                        {card.type === 'visitor_review' 
                          ? card.value.toFixed(2) 
                          : Math.round(card.value)}
                      </span>
                      {card.type === 'visitor_review' && (
                        <span className="text-lg">
                          {((card.vs_7d_pct || 0) + (card.vs_30d_pct || 0)) / 2 > 0 ? '😊' : 
                           ((card.vs_7d_pct || 0) + (card.vs_30d_pct || 0)) / 2 < 0 ? '😢' : '😐'}
                        </span>
                      )}
                    </div>
                    
                    {/* 답글률 프로그레스 바 */}
                    {card.type === 'pending_reply' && card.reply_rate !== undefined && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-neutral-600">답글률</span>
                          <span className="text-xs font-bold text-info">{card.reply_rate.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-info transition-all duration-300"
                            style={{ width: `${card.reply_rate}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* vs 지난 7일/30일 */}
                    {card.type === 'visitor_review' && (
                      <div className="space-y-0.5">
                        {card.vs_7d_pct !== undefined && card.vs_7d_pct !== null && card.vs_7d_pct !== 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-600">vs 지난 7일</span>
                            <span className={`font-bold ${card.vs_7d_pct > 0 ? 'text-success' : 'text-error'}`}>
                              {card.vs_7d_pct > 0 ? '↓' : '↑'} {Math.abs(card.vs_7d_pct).toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {card.vs_30d_pct !== undefined && card.vs_30d_pct !== null && card.vs_30d_pct !== 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-neutral-600">vs 지난 30일</span>
                            <span className={`font-bold ${card.vs_30d_pct > 0 ? 'text-success' : 'text-error'}`}>
                              {card.vs_30d_pct > 0 ? '↓' : '↑'} {Math.abs(card.vs_30d_pct).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 두 번째 행: 블로그 리뷰 (전체 폭) */}
              {latestActivation.summary_cards.filter(card => card.type === 'blog_review').map((card) => (
                <div 
                  key={card.type} 
                  className="bg-neutral-50 rounded-button p-2 md:p-2.5 border border-neutral-200"
                >
                  <p className="text-xs text-neutral-600 font-bold mb-0.5 md:mb-1">{card.title}</p>
                  <div className="flex items-baseline gap-1 mb-1 md:mb-1.5">
                    <span className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                      {card.value.toFixed(2)}
                    </span>
                    <span className="text-lg">
                      {((card.vs_7d_pct || 0) + (card.vs_30d_pct || 0)) / 2 > 0 ? '😊' : 
                       ((card.vs_7d_pct || 0) + (card.vs_30d_pct || 0)) / 2 < 0 ? '😢' : '😐'}
                    </span>
                  </div>
                  
                  <div className="space-y-0.5">
                    {card.vs_7d_pct !== undefined && card.vs_7d_pct !== null && card.vs_7d_pct !== 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-600">vs 지난 7일</span>
                        <span className={`font-bold ${card.vs_7d_pct > 0 ? 'text-success' : 'text-error'}`}>
                          {card.vs_7d_pct > 0 ? '↓' : '↑'} {Math.abs(card.vs_7d_pct).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {card.vs_30d_pct !== undefined && card.vs_30d_pct !== null && card.vs_30d_pct !== 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-600">vs 지난 30일</span>
                        <span className={`font-bold ${card.vs_30d_pct > 0 ? 'text-success' : 'text-error'}`}>
                          {card.vs_30d_pct > 0 ? '↓' : '↑'} {Math.abs(card.vs_30d_pct).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* 세 번째 행: 쿠폰, 공지사항 (각각 반 폭) */}
              <div className="grid grid-cols-2 gap-2 md:gap-2.5 w-full overflow-hidden">
                {latestActivation.summary_cards.filter(card => 
                  card.type === 'coupon' || card.type === 'announcement'
                ).map((card) => (
                  <div 
                    key={card.type} 
                    className="bg-neutral-50 rounded-button p-2 md:p-2.5 border border-neutral-200"
                  >
                    <p className="text-xs text-neutral-600 font-bold mb-0.5 md:mb-1">{card.title}</p>
                    <div className="flex items-baseline gap-1 mb-1 md:mb-1.5">
                      <span className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                        {Math.round(card.value)}개
                      </span>
                      <span className="text-lg">
                        {card.type === 'coupon' 
                          ? (card.has_active ? '😊' : '😢')
                          : (card.value > 0 ? '😊' : '😢')}
                      </span>
                    </div>
                    
                    {/* 쿠폰 상태 */}
                    {card.type === 'coupon' && (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        card.has_active ? 'bg-success-bg text-success' : 'bg-neutral-200 text-neutral-600'
                      }`}>
                        {card.has_active ? '활성' : '비활성'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Link>
        ) : (
          <Link 
            href="/dashboard/naver/activation"
            className="group block bg-white rounded-card border border-neutral-300 p-4 md:p-5 shadow-card hover:shadow-card-hover transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-neutral-100 rounded-button">
                  <Activity className="w-5 h-5 text-neutral-400" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
                    플레이스 활성화
                  </h3>
                  <p className="text-xs text-neutral-600">기록 없음</p>
                </div>
              </div>
            </div>
            
            <div className="bg-neutral-50 rounded-button p-6 border border-neutral-200 text-center">
              <Activity className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
              <p className="text-sm text-neutral-600 mb-2">아직 활성화 기록이 없습니다</p>
              <p className="text-xs text-neutral-500">활성화 기능을 통해 매장의 활성도를 확인하세요</p>
            </div>
          </Link>
        )}

        {/* 플레이스 진단 카드 - 스크린샷 스타일 */}
        {latestDiagnosis ? (
          <Link 
            href={`/dashboard/naver/audit?historyId=${latestDiagnosis.id}`}
            className="group block bg-white rounded-card border border-neutral-300 p-3 md:p-4 lg:p-5 shadow-card hover:shadow-card-hover transition-all duration-200"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="p-1.5 md:p-2 bg-warning-bg rounded-button">
                  <FileText className="w-4 h-4 md:w-5 md:h-5 text-warning" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base lg:text-lg font-bold text-neutral-900 leading-tight truncate">
                    {latestDiagnosis.store_name}
                  </h3>
                  <p className="text-xs text-neutral-600">플레이스 진단</p>
                </div>
              </div>
              <div className="text-xs text-neutral-600">
                {new Date(latestDiagnosis.diagnosed_at).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
            
            {/* 진단 결과 */}
            <div className="space-y-2 md:space-y-2.5">
              {/* 진단 등급 - 강조 */}
              <div className="bg-warning-bg border border-warning/20 rounded-button p-3 md:p-4 text-center">
                <p className="text-xs text-warning font-bold mb-2">진단 등급</p>
                <div className="flex items-center justify-center gap-2">
                  <span className={`text-5xl font-bold leading-tight ${
                    latestDiagnosis.grade === 'S' ? 'text-primary-600' :
                    latestDiagnosis.grade === 'A' ? 'text-info' :
                    latestDiagnosis.grade === 'B' ? 'text-success' :
                    latestDiagnosis.grade === 'C' ? 'text-warning' : 'text-error'
                  }`}>
                    {latestDiagnosis.grade}
                  </span>
                  <span className="text-2xl">
                    {latestDiagnosis.grade === 'S' || latestDiagnosis.grade === 'A' ? '😊' :
                     latestDiagnosis.grade === 'B' ? '😐' : '😢'}
                  </span>
                </div>
              </div>
              
              {/* 진단 점수 */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-button p-2 md:p-2.5">
                <p className="text-xs text-neutral-600 font-bold mb-1 md:mb-1.5">진단 점수</p>
                <div className="flex items-baseline gap-1 mb-1.5 md:mb-2">
                  <span className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                    {latestDiagnosis.total_score.toFixed(1)}
                  </span>
                  <span className="text-xs md:text-sm text-neutral-600">/ {latestDiagnosis.max_score}점</span>
                </div>
                
                {/* 점수 프로그레스 바 */}
                <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      latestDiagnosis.grade === 'S' || latestDiagnosis.grade === 'A' ? 'bg-success' :
                      latestDiagnosis.grade === 'B' ? 'bg-warning' : 'bg-error'
                    }`}
                    style={{ width: `${(latestDiagnosis.total_score / latestDiagnosis.max_score) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <Link 
            href="/dashboard/naver/audit"
            className="group block bg-white rounded-card border border-neutral-300 p-3 md:p-4 lg:p-5 shadow-card hover:shadow-card-hover transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="p-1.5 md:p-2 bg-neutral-100 rounded-button">
                  <FileText className="w-4 h-4 md:w-5 md:h-5 text-neutral-400" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base lg:text-lg font-bold text-neutral-900 leading-tight">
                    플레이스 진단
                  </h3>
                  <p className="text-xs text-neutral-600">기록 없음</p>
                </div>
              </div>
            </div>
            
            <div className="bg-neutral-50 rounded-button p-4 md:p-5 lg:p-6 border border-neutral-200 text-center">
              <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
              <p className="text-sm text-neutral-600 mb-2">아직 진단 기록이 없습니다</p>
              <p className="text-xs text-neutral-500">진단 기능을 통해 매장의 상태를 분석하세요</p>
            </div>
          </Link>
        )}
      </div>

      {/* 매장별 추적 키워드 리스트 */}
      <div className="bg-white rounded-card border border-neutral-300 shadow-card overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-100 to-emerald-200 p-2.5 md:p-3">
          <div className="flex items-center justify-between flex-wrap gap-2 md:gap-3 w-full overflow-x-hidden">
            <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1">
              <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 flex-shrink-0" />
              <h3 className="text-base md:text-lg lg:text-xl font-bold text-emerald-900 leading-tight truncate">매장별 추적 키워드</h3>
              <span className="px-1.5 md:px-2 py-0.5 bg-emerald-300 text-emerald-900 text-xs font-bold rounded-full flex-shrink-0">
                {storeGroups.length}개
              </span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              {storeGroups.length > 0 && (
                <button
                  onClick={toggleReordering}
                  className={`px-3 md:px-4 py-1.5 md:py-2 font-bold rounded-button transition-all duration-200 text-xs md:text-sm flex items-center justify-center gap-1 md:gap-1.5 leading-none min-h-[44px] ${
                    isReordering 
                      ? 'bg-success text-white shadow-button hover:shadow-button-hover' 
                      : 'bg-white text-emerald-600 border border-emerald-200 shadow-sm hover:bg-emerald-50 hover:shadow-md active:scale-95'
                  }`}
                >
                  <Edit3 className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">{isReordering ? '완료' : '순서변경'}</span>
                  <span className="sm:hidden">{isReordering ? '✓' : '⇅'}</span>
                </button>
              )}
              <Link 
                href="/dashboard/naver/metrics-tracker"
                className="px-3 md:px-4 py-1.5 md:py-2 bg-white text-emerald-600 font-bold rounded-button border border-emerald-200 shadow-sm hover:bg-emerald-50 hover:shadow-md active:scale-95 transition-all duration-200 text-xs md:text-sm flex items-center justify-center leading-none min-h-[44px]"
              >
                + 추가
              </Link>
            </div>
          </div>
        </div>
        
        <div className="p-3 md:p-4 lg:p-6">
          {storeGroups.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-neutral-100 rounded-full w-20 h-20 md:w-24 md:h-24 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-10 h-10 md:w-12 md:h-12 text-neutral-400" />
              </div>
              <p className="text-neutral-700 mb-2 text-lg font-bold">추적 중인 키워드가 없습니다</p>
              <p className="text-neutral-600 text-base mb-6 leading-relaxed">키워드 순위를 실시간으로 추적해보세요</p>
              <Link 
                href="/dashboard/naver/metrics-tracker"
                className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white font-bold rounded-button shadow-button hover:bg-emerald-700 hover:shadow-button-hover active:scale-95 transition-all duration-200 text-base"
              >
                추적 시작하기
                <ArrowUpRight className="ml-2 w-5 h-5" />
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
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full overflow-x-hidden" style={{ maxWidth: '100%' }}>
                  {storeGroups.map((storeGroup) => (
                    <SortableStoreTrackerCard
                      key={storeGroup.store_id}
                      storeGroup={storeGroup}
                      storeColor={storeColorMap[storeGroup.store_id] || STORE_COLORS[0]}
                      isReordering={isReordering}
                      onRefreshTracker={handleRefreshTracker}
                      onRefreshAllTrackers={handleRefreshAllTrackers}
                      onViewMetrics={handleViewMetrics}
                      onViewCompetitors={handleViewCompetitors}
                      isRefreshing={isRefreshing}
                      getQueueStatus={collectionQueue.getStatus}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* 등록 매장 리스트 */}
      <div className="bg-white rounded-card border border-neutral-300 shadow-card overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-100 to-emerald-200 p-2.5 md:p-3 lg:p-4">
          <div className="flex items-center justify-between flex-wrap gap-2 md:gap-3 w-full overflow-x-hidden">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <StoreIcon className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 flex-shrink-0" />
              <h3 className="text-base md:text-lg lg:text-xl font-bold text-emerald-900 leading-tight truncate">등록 매장</h3>
              <span className="px-2 md:px-2.5 py-0.5 md:py-1 bg-emerald-300 text-emerald-900 text-xs md:text-sm font-bold rounded-full flex-shrink-0">
                {stores.length}개
              </span>
            </div>
            <Link 
              href="/dashboard/naver/store-registration"
              className="px-3 md:px-4 py-1.5 md:py-2 bg-white text-emerald-600 font-bold rounded-button border border-emerald-200 shadow-sm hover:bg-emerald-50 hover:shadow-md active:scale-95 transition-all duration-200 text-xs md:text-sm flex items-center justify-center leading-none min-h-[44px]"
            >
              + 매장 추가
            </Link>
          </div>
        </div>
        
        <div className="p-3 md:p-4 lg:p-6">
          {stores.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-neutral-100 rounded-full w-20 h-20 md:w-24 md:h-24 flex items-center justify-center mx-auto mb-4">
                <StoreIcon className="w-10 h-10 md:w-12 md:h-12 text-neutral-400" />
              </div>
              <p className="text-neutral-700 mb-6 text-lg font-bold">등록된 매장이 없습니다</p>
              <Link 
                href="/dashboard/naver/store-registration"
                className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white font-bold rounded-button shadow-button hover:bg-emerald-700 hover:shadow-button-hover active:scale-95 transition-all duration-200 text-base"
              >
                첫 매장 등록하기
                <ArrowUpRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full overflow-x-hidden">
              {stores.map((store, index) => {
                const storeColor = STORE_COLORS[index % STORE_COLORS.length]
                return (
                  <Link 
                    href={`/dashboard/naver/reviews?storeId=${store.id}`}
                    key={store.id}
                    className="group w-full min-w-0"
                  >
                    <div className={`p-4 rounded-card border-2 ${storeColor.border} ${storeColor.bg} shadow-card hover:shadow-card-hover transition-all duration-200 active:scale-98 w-full overflow-hidden`}>
                      <div className="flex items-start gap-3 mb-3 w-full min-w-0">
                        {/* 매장 썸네일 */}
                        {store.thumbnail ? (
                          <div className="flex-shrink-0">
                            <img 
                              src={store.thumbnail} 
                              alt={store.name || store.store_name || '매장'} 
                              className="w-14 h-14 md:w-16 md:h-16 rounded-button object-cover border-2 border-neutral-200 shadow-sm"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                const parent = e.currentTarget.parentElement
                                if (parent) {
                                  parent.innerHTML = '<div class="w-14 h-14 md:w-16 md:h-16 rounded-button bg-neutral-100 flex items-center justify-center border-2 border-neutral-200 shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6 text-neutral-400"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>'
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0">
                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-button bg-neutral-100 flex items-center justify-center border-2 border-neutral-200 shadow-sm">
                              <StoreIcon className="w-6 h-6 text-neutral-500" />
                            </div>
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <h4 className="font-bold text-base md:text-lg group-hover:opacity-80 transition-opacity truncate text-neutral-900 leading-tight" title={store.name || store.store_name || '매장명 없음'}>
                              {store.name || store.store_name || '매장명 없음'}
                            </h4>
                            <div className={`px-2.5 py-1 rounded-button text-xs font-bold ml-2 flex-shrink-0 ${
                              store.status === 'active' 
                                ? 'bg-success-bg text-success' 
                                : 'bg-neutral-100 text-neutral-600'
                            }`}>
                              {store.status === 'active' ? '✓' : '○'}
                            </div>
                          </div>
                          {store.address && (
                            <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate line-clamp-1">{store.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-3 py-1.5 rounded-button text-xs font-bold ${
                          store.platform === 'naver' 
                            ? 'bg-success text-white' 
                            : 'bg-info text-white'
                        }`}>
                          {store.platform === 'naver' ? '네이버' : '구글'}
                        </span>
                        
                        <div className="flex items-center gap-1.5 text-sm text-neutral-600 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {new Date(store.created_at).toLocaleDateString('ko-KR', { 
                              month: 'short', 
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

      {/* 지표 보기 모달 - 키워드순위추적 페이지와 동일 */}
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

                {/* 상세 지표 */}
                <div>
                  <h4 className="font-bold text-sm md:text-base mb-3 text-neutral-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    상세 지표
                  </h4>
                  
                  {/* 모바일 카드형 레이아웃 */}
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
                        <div key={metric.id || index} className="bg-white rounded-button border border-neutral-200 p-3 shadow-sm">
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

                  {/* PC 테이블 레이아웃 */}
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
                            <tr key={metric.id || index} className={`border-t border-neutral-200 ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}>
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

      {/* 경쟁매장 보기 모달 - DB에서 불러옴 */}
      <Dialog open={showCompetitorDialog} onOpenChange={setShowCompetitorDialog}>
        <DialogContent className="w-[calc(100vw-24px)] sm:w-full sm:max-w-2xl lg:max-w-3xl max-h-[calc(100vh-24px)] p-0 rounded-modal shadow-modal flex flex-col overflow-hidden">
          <DialogHeader className="p-4 md:p-6 pb-3 md:pb-4 flex-shrink-0 border-b border-neutral-200">
            <DialogTitle className="text-lg md:text-xl font-bold text-neutral-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-600" />
              경쟁매장 순위
            </DialogTitle>
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
