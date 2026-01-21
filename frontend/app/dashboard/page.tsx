"use client"

/**
 * 대시보드 메인 페이지
 * 계정 정보, 등록 매장, 키워드, 추적 현황 표시
 * 반응형 디자인 최적화
 */
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useStores } from "@/lib/hooks/useStores"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { api } from "@/lib/config"
import { 
  Loader2, 
  User, 
  Mail, 
  CreditCard, 
  Store as StoreIcon,
  Key,
  TrendingUp,
  Crown,
  CheckCircle2,
  XCircle,
  BarChart3
} from "lucide-react"

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
  created_at: string
}

interface Keyword {
  id: string
  keyword: string
  current_rank: number | null
  store_id: string
  created_at: string
}

interface MetricTracker {
  id: string
  keyword: string
  store_name: string
  is_active: boolean
  last_collected_at: string | null
  created_at: string
}

export default function DashboardPage() {
  const { user, token } = useAuth()
  const { hasStores, isLoading: storesLoading, storeCount } = useStores()
  
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
      console.log("[DEBUG] token:", token ? "exists" : "null")
      
      if (!user || !token) {
        console.log("[DEBUG] No user or token, returning")
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
          console.log("[DEBUG] Credit/Quota:", {
            total_credits: profileData.total_credits,
            used_credits: profileData.used_credits,
            max_stores: profileData.max_stores,
            max_keywords: profileData.max_keywords,
            max_trackers: profileData.max_trackers
          })
          setProfile(profileData)
        } else {
          const errorText = await profileRes.text()
          console.error("[DEBUG] Profile fetch failed:", profileRes.status, errorText)
        }

        // 2. 매장 목록 조회
        const storesRes = await fetch(api.stores.list(user.id))
        if (storesRes.ok) {
          const storesData = await storesRes.json()
          setStores(storesData.stores || [])
        }

        // 3. 키워드 목록 조회 (모든 매장의 키워드)
        if (storesRes.ok) {
          const storesData = await storesRes.json()
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
          
          setKeywords(allKeywords)
        }

        // 4. 추적 키워드 목록 조회
        const trackersRes = await fetch(api.metrics.trackers(), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (trackersRes.ok) {
          const trackersData = await trackersRes.json()
          setTrackers(trackersData.trackers || [])
        }

      } catch (error) {
        console.error("[DEBUG] Error loading dashboard data:", error)
      } finally {
        console.log("[DEBUG] Loading complete")
        setIsLoadingData(false)
      }
    }

    loadDashboardData()
  }, [user, token])

  // 로딩 중
  if (storesLoading || isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)] mx-auto mb-3" />
          <p className="text-[var(--muted-foreground)] text-sm font-medium">대시보드를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 등록된 매장이 없음
  if (!hasStores) {
    return <EmptyStoreMessage />
  }

  // Tier 정보
  const tierInfo = {
    free: { label: '무료', color: 'bg-gray-100 text-gray-700', icon: '🆓' },
    basic: { label: '베이직', color: 'bg-blue-100 text-blue-700', icon: '⭐' },
    pro: { label: '프로', color: 'bg-purple-100 text-purple-700', icon: '💎' },
    god: { label: 'GOD', color: 'bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700', icon: '👑' },
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 계정 정보 카드 */}
      <div className="bg-gradient-to-br from-[var(--card)] to-[var(--muted)] rounded-2xl border border-[var(--border-light)] shadow-[var(--shadow-md)] p-6 md:p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--foreground)] flex items-center gap-3">
              <User className="w-7 h-7" />
              계정 정보
            </h2>
            <p className="text-[var(--muted-foreground)] mt-2 text-sm">
              현재 플랜 및 사용량 현황
            </p>
          </div>
          <div className={`px-4 py-2 rounded-xl ${tier.color} font-semibold text-sm flex items-center gap-2`}>
            <span className="text-lg">{tier.icon}</span>
            {tier.label}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* 이메일 */}
          <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border-light)]">
            <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-xs font-medium mb-2">
              <Mail className="w-4 h-4" />
              이메일
            </div>
            <p className="text-[var(--foreground)] font-medium text-sm truncate" title={profile?.email}>
              {profile?.email || '로딩 중...'}
            </p>
          </div>

          {/* 크레딧 */}
          <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border-light)]">
            <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-xs font-medium mb-2">
              <CreditCard className="w-4 h-4" />
              크레딧
            </div>
            <p className="text-[var(--foreground)] font-semibold text-lg">
              {remainingCredits}
              {totalCredits !== -1 && <span className="text-[var(--muted-foreground)] text-sm font-normal"> / {totalCredits.toLocaleString()}</span>}
            </p>
            {totalCredits !== -1 && (
              <div className="mt-2 bg-[var(--muted)] rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
                  style={{ width: `${creditPercentage}%` }}
                />
              </div>
            )}
          </div>

          {/* 등록 매장 Quota */}
          <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border-light)]">
            <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-xs font-medium mb-2">
              <StoreIcon className="w-4 h-4" />
              등록 매장
            </div>
            <p className="text-[var(--foreground)] font-semibold text-lg">
              {stores.length}
              {maxStores !== -1 && <span className="text-[var(--muted-foreground)] text-sm font-normal"> / {maxStores}</span>}
            </p>
            <div className="mt-2 flex items-center gap-1 text-xs">
              {maxStores === -1 ? (
                <span className="text-green-600 font-medium">무제한</span>
              ) : stores.length >= maxStores ? (
                <span className="text-red-600 font-medium">한도 도달</span>
              ) : (
                <span className="text-blue-600 font-medium">{maxStores - stores.length}개 추가 가능</span>
              )}
            </div>
          </div>

          {/* 키워드 Quota */}
          <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border-light)]">
            <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-xs font-medium mb-2">
              <Key className="w-4 h-4" />
              등록 키워드
            </div>
            <p className="text-[var(--foreground)] font-semibold text-lg">
              {keywords.length}
              {maxKeywords !== -1 && <span className="text-[var(--muted-foreground)] text-sm font-normal"> / {maxKeywords}</span>}
            </p>
            <div className="mt-2 flex items-center gap-1 text-xs">
              {maxKeywords === -1 ? (
                <span className="text-green-600 font-medium">무제한</span>
              ) : keywords.length >= maxKeywords ? (
                <span className="text-red-600 font-medium">한도 도달</span>
              ) : (
                <span className="text-blue-600 font-medium">{maxKeywords - keywords.length}개 추가 가능</span>
              )}
            </div>
          </div>
        </div>

        {/* 추적 키워드 Quota (별도 행) */}
        <div className="mt-4 bg-[var(--card)] rounded-xl p-4 border border-[var(--border-light)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-xs font-medium mb-1">
                <TrendingUp className="w-4 h-4" />
                추적 키워드
              </div>
              <p className="text-[var(--foreground)] font-semibold text-lg">
                {trackers.length}
                {maxTrackers !== -1 && <span className="text-[var(--muted-foreground)] text-sm font-normal"> / {maxTrackers}</span>}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-[var(--muted-foreground)] mb-1">활성 추적</div>
              <p className="text-sm font-medium text-green-600">
                {trackers.filter(t => t.is_active).length}개
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 등록 매장 리스트 */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="p-6 border-b border-[var(--border-light)] bg-gradient-to-r from-[var(--card)] to-[var(--muted)]">
          <h3 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2">
            <StoreIcon className="w-5 h-5" />
            등록 매장
            <span className="text-sm font-normal text-[var(--muted-foreground)]">({stores.length}개)</span>
          </h3>
        </div>
        <div className="p-6">
          {stores.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              등록된 매장이 없습니다.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => (
                <div 
                  key={store.id} 
                  className="p-4 rounded-xl border border-[var(--border-light)] hover:shadow-md transition-shadow bg-gradient-to-br from-[var(--card)] to-[var(--muted)]"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-[var(--foreground)] text-sm">{store.store_name}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      store.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {store.status === 'active' ? '활성' : '비활성'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <span className={`px-2 py-0.5 rounded ${
                      store.platform === 'naver' 
                        ? 'bg-green-50 text-green-700' 
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {store.platform === 'naver' ? '네이버' : '구글'}
                    </span>
                    <span>•</span>
                    <span>{new Date(store.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 등록 키워드 리스트 */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="p-6 border-b border-[var(--border-light)] bg-gradient-to-r from-[var(--card)] to-[var(--muted)]">
          <h3 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Key className="w-5 h-5" />
            등록 키워드
            <span className="text-sm font-normal text-[var(--muted-foreground)]">({keywords.length}개)</span>
          </h3>
        </div>
        <div className="p-6">
          {keywords.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              등록된 키워드가 없습니다.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {keywords.map((keyword) => (
                <div 
                  key={keyword.id} 
                  className="p-3 rounded-xl border border-[var(--border-light)] hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-blue-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-900 text-sm">{keyword.keyword}</span>
                    {keyword.current_rank && (
                      <span className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-bold">
                        {keyword.current_rank}위
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 추적 키워드 리스트 */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border-light)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="p-6 border-b border-[var(--border-light)] bg-gradient-to-r from-[var(--card)] to-[var(--muted)]">
          <h3 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            추적 키워드
            <span className="text-sm font-normal text-[var(--muted-foreground)]">({trackers.length}개)</span>
          </h3>
        </div>
        <div className="p-6">
          {trackers.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              추적 중인 키워드가 없습니다.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-2">
              {trackers.map((tracker) => (
                <div 
                  key={tracker.id} 
                  className="p-4 rounded-xl border border-[var(--border-light)] hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50 to-purple-100"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-purple-900 text-sm mb-1">{tracker.keyword}</h4>
                      <p className="text-xs text-purple-700">{tracker.store_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {tracker.is_active ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                  {tracker.last_collected_at && (
                    <div className="text-xs text-purple-600 mt-2">
                      마지막 수집: {new Date(tracker.last_collected_at).toLocaleString('ko-KR')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
