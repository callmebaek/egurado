"use client"

/**
 * 대시보드 메인 페이지
 * 계정 정보, 등록 매장, 키워드, 추적 현황 표시
 * 반응형 디자인 최적화
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
  MapPin
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
        console.log("[DEBUG] Fetching stores for user:", user.id)
        const storesRes = await fetch(api.stores.list(user.id))
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
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
            <Sparkles className="h-6 w-6 text-yellow-500 absolute top-0 right-0 animate-pulse" />
          </div>
          <p className="text-gray-600 text-lg font-semibold">대시보드를 불러오는 중...</p>
          <p className="text-gray-400 text-sm mt-2">잠시만 기다려주세요</p>
        </div>
      </div>
    )
  }

  // 사용자 정보 없음
  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center max-w-md">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <User className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">환영합니다!</h2>
          <p className="text-gray-600 mb-6">
            위플레이스에서 네이버 플레이스와 구글 비즈니스를 관리하세요.
          </p>
          <Link 
            href="/dashboard/naver/store-registration"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
          >
            매장 등록하기
            <ArrowUpRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </div>
    )
  }

  // Tier 정보
  const tierInfo = {
    free: { 
      label: '무료', 
      color: 'from-gray-400 to-gray-600', 
      bgColor: 'from-gray-50 to-gray-100',
      icon: '🆓',
      textColor: 'text-gray-700'
    },
    basic: { 
      label: '베이직', 
      color: 'from-blue-400 to-blue-600', 
      bgColor: 'from-blue-50 to-blue-100',
      icon: '⭐',
      textColor: 'text-blue-700'
    },
    pro: { 
      label: '프로', 
      color: 'from-purple-400 to-purple-600', 
      bgColor: 'from-purple-50 to-purple-100',
      icon: '💎',
      textColor: 'text-purple-700'
    },
    god: { 
      label: 'GOD', 
      color: 'from-yellow-400 via-orange-500 to-red-500', 
      bgColor: 'from-yellow-50 via-orange-50 to-red-50',
      icon: '👑',
      textColor: 'text-orange-700'
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
    <div className="space-y-8 pb-8">
      {/* 환영 헤더 */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${tier.bgColor} rounded-3xl border-2 border-white shadow-xl`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/30 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/20 rounded-full -ml-24 -mb-24" />
        
        <div className="relative p-8 md:p-12">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className={`bg-gradient-to-br ${tier.color} p-3 rounded-2xl shadow-lg`}>
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
                    환영합니다, {profile.display_name || profile.email.split('@')[0]}님! 👋
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm md:text-base">
                    오늘도 멋진 하루 되세요!
                  </p>
                </div>
              </div>
            </div>
            
            <div className={`flex items-center gap-3 px-6 py-3 bg-gradient-to-r ${tier.color} text-white rounded-2xl shadow-lg`}>
              <span className="text-2xl">{tier.icon}</span>
              <div>
                <p className="text-xs opacity-90">현재 플랜</p>
                <p className="text-lg font-bold">{tier.label}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 통계 카드 그리드 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* 이메일 카드 */}
        <div className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-xs text-gray-500 font-medium px-3 py-1 bg-gray-100 rounded-full">
              계정
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-1">이메일 주소</p>
          <p className="text-gray-800 font-semibold text-sm truncate" title={profile.email}>
            {profile.email}
          </p>
        </div>

        {/* 크레딧 카드 */}
        <div className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-xs text-gray-500 font-medium px-3 py-1 bg-gray-100 rounded-full">
              크레딧
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-1">잔여 크레딧</p>
          <p className="text-2xl font-bold text-gray-800">
            {remainingCredits}
          </p>
          {totalCredits !== -1 && (
            <>
              <div className="mt-3 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${creditPercentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                전체: {totalCredits.toLocaleString()} 크레딧
              </p>
            </>
          )}
        </div>

        {/* 매장 Quota 카드 */}
        <div className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
              <StoreIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-xs text-gray-500 font-medium px-3 py-1 bg-gray-100 rounded-full">
              매장
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-1">등록 매장</p>
          <p className="text-2xl font-bold text-gray-800">
            {stores.length}
            {maxStores !== -1 && <span className="text-lg text-gray-400"> / {maxStores}</span>}
          </p>
          <div className="mt-3">
            {maxStores === -1 ? (
              <span className="text-xs text-green-600 font-semibold px-2 py-1 bg-green-50 rounded-full">
                ✨ 무제한
              </span>
            ) : stores.length >= maxStores ? (
              <span className="text-xs text-red-600 font-semibold px-2 py-1 bg-red-50 rounded-full">
                ⚠️ 한도 도달
              </span>
            ) : (
              <span className="text-xs text-blue-600 font-semibold px-2 py-1 bg-blue-50 rounded-full">
                ➕ {maxStores - stores.length}개 추가 가능
              </span>
            )}
          </div>
        </div>

        {/* 키워드 Quota 카드 */}
        <div className="group bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl">
              <Key className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-xs text-gray-500 font-medium px-3 py-1 bg-gray-100 rounded-full">
              키워드
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-1">등록 키워드</p>
          <p className="text-2xl font-bold text-gray-800">
            {keywords.length}
            {maxKeywords !== -1 && <span className="text-lg text-gray-400"> / {maxKeywords}</span>}
          </p>
          <div className="mt-3">
            {maxKeywords === -1 ? (
              <span className="text-xs text-green-600 font-semibold px-2 py-1 bg-green-50 rounded-full">
                ✨ 무제한
              </span>
            ) : keywords.length >= maxKeywords ? (
              <span className="text-xs text-red-600 font-semibold px-2 py-1 bg-red-50 rounded-full">
                ⚠️ 한도 도달
              </span>
            ) : (
              <span className="text-xs text-blue-600 font-semibold px-2 py-1 bg-blue-50 rounded-full">
                ➕ {maxKeywords - keywords.length}개 추가 가능
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 추적 키워드 요약 카드 */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border-2 border-white shadow-lg p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">추적 키워드</h3>
              <p className="text-gray-600 text-sm">실시간 순위 모니터링</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-indigo-600">{trackers.length}</p>
              <p className="text-xs text-gray-500 mt-1">전체</p>
            </div>
            <div className="w-px h-12 bg-gray-300" />
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{trackers.filter(t => t.is_active).length}</p>
              <p className="text-xs text-gray-500 mt-1">활성</p>
            </div>
            <div className="w-px h-12 bg-gray-300" />
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-400">{trackers.filter(t => !t.is_active).length}</p>
              <p className="text-xs text-gray-500 mt-1">비활성</p>
            </div>
          </div>
          
          {maxTrackers !== -1 && (
            <div className="text-right">
              <p className="text-sm text-gray-600">사용 가능</p>
              <p className="text-2xl font-bold text-purple-600">{maxTrackers - trackers.length}개</p>
            </div>
          )}
        </div>
      </div>

      {/* 등록 매장 리스트 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StoreIcon className="w-6 h-6 text-white" />
              <h3 className="text-2xl font-bold text-white">등록 매장</h3>
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-semibold rounded-full">
                {stores.length}개
              </span>
            </div>
            <Link 
              href="/dashboard/naver/store-registration"
              className="px-4 py-2 bg-white text-purple-600 font-semibold rounded-xl hover:shadow-lg transition-all duration-300 text-sm"
            >
              + 매장 추가
            </Link>
          </div>
        </div>
        
        <div className="p-6">
          {stores.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <StoreIcon className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-4">등록된 매장이 없습니다</p>
              <Link 
                href="/dashboard/naver/store-registration"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
              >
                첫 매장 등록하기
                <ArrowUpRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => (
                <Link 
                  href={`/dashboard/naver/reviews?storeId=${store.id}`}
                  key={store.id}
                  className="group"
                >
                  <div className="p-5 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 text-base mb-1 group-hover:text-purple-600 transition-colors">
                          {store.store_name}
                        </h4>
                        {store.address && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{store.address}</span>
                          </div>
                        )}
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        store.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {store.status === 'active' ? '✓ 활성' : '○ 비활성'}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        store.platform === 'naver' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-blue-500 text-white'
                      }`}>
                        {store.platform === 'naver' ? '네이버' : '구글'}
                      </span>
                      
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {new Date(store.created_at).toLocaleDateString('ko-KR', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 등록 키워드 리스트 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="w-6 h-6 text-white" />
              <h3 className="text-2xl font-bold text-white">등록 키워드</h3>
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-semibold rounded-full">
                {keywords.length}개
              </span>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {keywords.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Key className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">등록된 키워드가 없습니다</p>
              <p className="text-gray-400 text-sm">매장을 선택하고 키워드를 등록해보세요</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {keywords.map((keyword) => {
                const rankChange = getRankChange(keyword)
                const store = stores.find(s => s.id === keyword.store_id)
                
                return (
                  <div 
                    key={keyword.id} 
                    className="p-4 rounded-xl border-2 border-blue-100 hover:border-blue-400 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-blue-50 to-cyan-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-bold text-blue-900 text-sm mb-1">{keyword.keyword}</p>
                        <p className="text-xs text-blue-600">{store?.store_name || 'Unknown'}</p>
                      </div>
                      
                      {keyword.current_rank && (
                        <div className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-md">
                          {keyword.current_rank}위
                        </div>
                      )}
                    </div>
                    
                    {rankChange !== null && rankChange !== 0 && (
                      <div className={`flex items-center gap-1 text-xs font-semibold mt-2 ${
                        rankChange > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {rankChange > 0 ? (
                          <>
                            <ArrowUpRight className="w-4 h-4" />
                            <span>{rankChange} 상승</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="w-4 h-4" />
                            <span>{Math.abs(rankChange)} 하락</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 추적 키워드 리스트 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-white" />
              <h3 className="text-2xl font-bold text-white">추적 키워드</h3>
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-semibold rounded-full">
                {trackers.length}개
              </span>
            </div>
            <Link 
              href="/dashboard/naver/metrics-tracker"
              className="px-4 py-2 bg-white text-indigo-600 font-semibold rounded-xl hover:shadow-lg transition-all duration-300 text-sm"
            >
              추적 관리
            </Link>
          </div>
        </div>
        
        <div className="p-6">
          {trackers.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">추적 중인 키워드가 없습니다</p>
              <p className="text-gray-400 text-sm mb-4">키워드 순위를 실시간으로 추적해보세요</p>
              <Link 
                href="/dashboard/naver/metrics-tracker"
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
              >
                추적 시작하기
                <ArrowUpRight className="ml-2 w-5 h-5" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
              {trackers.map((tracker) => (
                <Link 
                  href={`/dashboard/naver/metrics-tracker?trackerId=${tracker.id}`}
                  key={tracker.id}
                  className="group"
                >
                  <div className="p-5 rounded-xl border-2 border-purple-100 hover:border-purple-400 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-indigo-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-purple-900 text-base group-hover:text-purple-600 transition-colors">
                            {tracker.keyword}
                          </h4>
                          {tracker.is_active ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <p className="text-sm text-purple-700 mb-1">{tracker.store_name}</p>
                        <div className="flex items-center gap-2 text-xs text-purple-600">
                          <Activity className="w-3 h-3" />
                          <span>{tracker.update_frequency === 'daily' ? '매일' : tracker.update_frequency === 'weekly' ? '주간' : '월간'} 업데이트</span>
                        </div>
                      </div>
                      
                      <div className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        tracker.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {tracker.is_active ? '● 활성' : '○ 비활성'}
                      </div>
                    </div>
                    
                    {tracker.last_collected_at && (
                      <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-100 rounded-lg px-3 py-2">
                        <Clock className="w-3 h-3" />
                        <span>마지막 수집: {new Date(tracker.last_collected_at).toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                    )}
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
