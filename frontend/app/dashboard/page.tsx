"use client"

/**
 * 대시보드 메인 페이지
 * 계정 정보, 등록 매장, 키워드, 추적 현황 표시
 * 완벽한 반응형 디자인 (모바일/태블릿/PC)
 */
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/config"
import { 
  Loader2, 
  User, 
  Mail, 
  CreditCard, 
  Store as StoreIcon,
  Key,
  TrendingUp,
  TrendingDown,
  Crown,
  CheckCircle2,
  XCircle,
  BarChart3,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock,
  MapPin,
  Zap,
  Star,
  Gem,
  Shield
} from "lucide-react"
import Link from "next/link"

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
}

interface Store {
  id: string
  store_name: string
  platform: string
  status: string
  address?: string
  created_at: string
}

interface Keyword {
  id: string
  keyword: string
  current_rank: number | null
  previous_rank: number | null
  store_id: string
  created_at: string
}

interface MetricTracker {
  id: string
  keyword: string
  store_name: string
  is_active: boolean
  last_collected_at: string | null
  update_frequency: string
  created_at: string
  latest_rank?: number | null
  platform?: string
}

export default function DashboardPage() {
  const { user, getToken, loading: authLoading } = useAuth()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [trackers, setTrackers] = useState<MetricTracker[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  // 데이터 로드
  useEffect(() => {
    const loadDashboardData = async () => {
      console.log("[DEBUG] loadDashboardData called")
      console.log("[DEBUG] user:", user)
      
      const token = getToken()
      console.log("[DEBUG] token:", token ? "exists" : "null")
      
      if (!user || !token) {
        console.log("[DEBUG] No user or token, waiting...")
        setIsLoadingData(false)
        return
      }

      try {
        setIsLoadingData(true)

        // 1. 사용자 프로필 조회
        console.log("[DEBUG] Fetching profile from:", `${api.baseUrl}/api/v1/auth/me`)
        const profileRes = await fetch(`${api.baseUrl}/api/v1/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        console.log("[DEBUG] Profile response status:", profileRes.status)
        
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          console.log("[DEBUG] Profile data:", profileData)
          setProfile(profileData)
        } else {
          const errorText = await profileRes.text()
          console.error("[DEBUG] Profile fetch failed:", profileRes.status, errorText)
        }

        // 2. 매장 목록 조회
        console.log("[DEBUG] Fetching stores with auth token")
        const storesRes = await fetch(api.stores.list(), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        console.log("[DEBUG] Stores response status:", storesRes.status)
        
        if (storesRes.ok) {
          const storesData = await storesRes.json()
          console.log("[DEBUG] Stores data:", storesData)
          setStores(storesData.stores || [])

          // 3. 키워드 목록 조회 (모든 매장의 키워드)
          const allKeywords: Keyword[] = []
          for (const store of (storesData.stores || [])) {
            try {
              const keywordsRes = await fetch(api.naver.keywords(store.id))
              if (keywordsRes.ok) {
                const keywordsData = await keywordsRes.json()
                allKeywords.push(...(keywordsData.keywords || []))
              }
            } catch (error) {
              console.error(`Failed to fetch keywords for store ${store.id}:`, error)
            }
          }
          console.log("[DEBUG] All keywords:", allKeywords)
          setKeywords(allKeywords)
        } else {
          console.error("[DEBUG] Stores fetch failed:", storesRes.status)
        }

        // 4. 추적 키워드 목록 조회
        console.log("[DEBUG] Fetching trackers")
        const trackersRes = await fetch(api.metrics.trackers(), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        console.log("[DEBUG] Trackers response status:", trackersRes.status)
        
        if (trackersRes.ok) {
          const trackersData = await trackersRes.json()
          console.log("[DEBUG] Trackers data:", trackersData)
          setTrackers(trackersData.trackers || [])
        } else {
          console.error("[DEBUG] Trackers fetch failed:", trackersRes.status)
        }

      } catch (error) {
        console.error("[DEBUG] Error loading dashboard data:", error)
      } finally {
        console.log("[DEBUG] Loading complete")
        setIsLoadingData(false)
      }
    }

    loadDashboardData()
  }, [user, getToken])

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

  // Tier 정보 (lucide-react 아이콘 사용)
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

  // 크레딧 계산
  const totalCredits = profile?.total_credits ?? 1000
  const usedCredits = profile?.used_credits ?? 0
  const remainingCredits = totalCredits === -1 ? '무제한' : (totalCredits - usedCredits).toLocaleString()
  const creditPercentage = totalCredits === -1 ? 100 : ((totalCredits - usedCredits) / totalCredits) * 100

  // Quota 계산
  const maxStores = profile?.max_stores ?? 1
  const maxKeywords = profile?.max_keywords ?? 10
  const maxTrackers = profile?.max_trackers ?? 3

  // 순위 변동 계산
  const getRankChange = (keyword: Keyword) => {
    if (keyword.previous_rank === null || keyword.current_rank === null) return null
    return keyword.previous_rank - keyword.current_rank
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 pb-6 sm:pb-8">
      {/* 환영 헤더 - 반응형 */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${tier.bgColor} rounded-2xl sm:rounded-3xl border-2 border-white shadow-xl`}>
        <div className="absolute top-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-white/30 rounded-full -mr-16 sm:-mr-32 -mt-16 sm:-mt-32" />
        <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-48 sm:h-48 bg-white/20 rounded-full -ml-12 sm:-ml-24 -mb-12 sm:-mb-24" />
        
        <div className="relative p-5 sm:p-8 lg:p-12">
          <div className="flex items-start justify-between flex-wrap gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className={`bg-gradient-to-br ${tier.color} p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg`}>
                  <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 truncate">
                    환영합니다, {profile.display_name || profile.email.split('@')[0]}님! 👋
                  </h1>
                  <p className="text-gray-600 mt-0.5 sm:mt-1 text-xs sm:text-sm md:text-base">
                    오늘도 멋진 하루 되세요!
                  </p>
                </div>
              </div>
            </div>
            
            <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-5 py-2 sm:py-3 bg-gradient-to-r ${tier.color} text-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex-shrink-0`}>
              <tier.Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
              <div>
                <p className="text-xs opacity-90 font-medium">현재 플랜</p>
                <p className="text-base sm:text-lg font-bold tracking-wide">{tier.label}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 통계 카드 그리드 - 완벽한 반응형 */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

        {/* 키워드 Quota 카드 */}
        <div className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg sm:rounded-xl">
              <Key className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
            <div className="text-xs text-gray-500 font-medium px-2 sm:px-3 py-1 bg-gray-100 rounded-full">
              키워드
            </div>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm mb-1">등록 키워드</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-800">
            {keywords.length}
            {maxKeywords !== -1 && <span className="text-base sm:text-lg text-gray-400"> / {maxKeywords}</span>}
          </p>
          <div className="mt-2 sm:mt-3">
            {maxKeywords === -1 ? (
              <span className="text-xs text-green-600 font-semibold px-2 py-1 bg-green-50 rounded-full inline-block">
                ✨ 무제한
              </span>
            ) : keywords.length >= maxKeywords ? (
              <span className="text-xs text-red-600 font-semibold px-2 py-1 bg-red-50 rounded-full inline-block">
                ⚠️ 한도 도달
              </span>
            ) : (
              <span className="text-xs text-blue-600 font-semibold px-2 py-1 bg-blue-50 rounded-full inline-block">
                ➕ {maxKeywords - keywords.length}개 가능
              </span>
            )}
          </div>
        </div>

        {/* 추적 키워드 카드 */}
        <div className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-5 lg:p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 sm:col-span-2 lg:col-span-1 xl:col-span-2">
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
      </div>

      {/* 추적 키워드 리스트 */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 sm:p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              <h3 className="text-xl sm:text-2xl font-bold text-white">추적 키워드</h3>
              <span className="px-2 sm:px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs sm:text-sm font-semibold rounded-full">
                {trackers.length}개
              </span>
            </div>
            <Link 
              href="/dashboard/naver/metrics-tracker"
              className="px-3 sm:px-4 py-2 bg-white text-indigo-600 font-semibold rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-300 text-xs sm:text-sm"
            >
              + 추적 관리
            </Link>
          </div>
        </div>
        
        <div className="p-4 sm:p-6">
          {trackers.length === 0 ? (
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
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {trackers.map((tracker) => (
                <Link 
                  href={`/dashboard/naver/metrics-tracker?trackerId=${tracker.id}`}
                  key={tracker.id}
                  className="group"
                >
                  <div className="p-4 sm:p-5 rounded-lg sm:rounded-xl border-2 border-purple-100 hover:border-purple-400 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-indigo-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-purple-900 text-sm sm:text-base group-hover:text-purple-600 transition-colors truncate">
                            {tracker.keyword}
                          </h4>
                          {tracker.is_active ? (
                            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-purple-700 mb-1 truncate">{tracker.store_name}</p>
                        <div className="flex items-center gap-2 text-xs text-purple-600">
                          <Activity className="w-3 h-3 flex-shrink-0" />
                          <span>{tracker.update_frequency === 'daily_once' ? '매일 1회' : tracker.update_frequency === 'daily_twice' ? '매일 2회' : '매일 3회'}</span>
                        </div>
                      </div>
                      
                      {tracker.latest_rank && (
                        <div className="px-2 sm:px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold text-xs sm:text-sm shadow-md ml-2 flex-shrink-0">
                          {tracker.latest_rank}위
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {tracker.last_collected_at && (
                        <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-100 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">마지막: {new Date(tracker.last_collected_at).toLocaleString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                      )}
                      
                      {tracker.platform && (
                        <span className={`inline-block px-2 py-1 rounded-md text-xs font-bold ${
                          tracker.platform === 'naver' 
                            ? 'bg-green-500 text-white' 
                            : 'bg-blue-500 text-white'
                        }`}>
                          {tracker.platform === 'naver' ? '네이버' : '구글'}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
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
              {stores.map((store) => (
                <Link 
                  href={`/dashboard/naver/reviews?storeId=${store.id}`}
                  key={store.id}
                  className="group"
                >
                  <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50">
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-800 text-sm sm:text-base mb-1 group-hover:text-purple-600 transition-colors truncate" title={store.store_name}>
                          {store.store_name}
                        </h4>
                        {store.address && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1 sm:mb-2">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate line-clamp-1">{store.address}</span>
                          </div>
                        )}
                      </div>
                      <div className={`px-2 py-1 rounded-md text-xs font-bold ml-2 flex-shrink-0 ${
                        store.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {store.status === 'active' ? '✓' : '○'}
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
                      
                      <div className="flex items-center gap-1 text-xs text-gray-400">
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
