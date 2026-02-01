"use client"

/**
 * 상단 메뉴 컴포넌트
 * 로고, 메뉴, 프로필 아이콘
 * 반응형: 모바일에서는 햄버거 메뉴 표시
 * 
 * ✨ 크레딧 실시간 업데이트 지원 (하이브리드 방식)
 */
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, User, Settings, Menu, LogOut, CreditCard, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'
import { memo, useCallback, useState, useEffect } from 'react'
import { 
  getCachedCredits, 
  setCachedCredits,
  type Credits 
} from '@/lib/credit-utils'

interface TopMenuProps {
  onMenuClick: () => void
}

export const TopMenu = memo(function TopMenu({ onMenuClick }: TopMenuProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [credits, setCredits] = useState<Credits | null>(null)
  const { user, getToken } = useAuth()

  // 크레딧 정보 로드 (재사용 가능하도록 useCallback으로 분리)
  const loadCredits = useCallback(async () => {
    const token = getToken()
    if (!token || !user) return

    try {
      // 1️⃣ 캐시가 있으면 즉시 표시 (0ms, 페이지 로드 속도 향상)
      const cached = getCachedCredits()
      if (cached) {
        setCredits(cached)
      }

      // 2️⃣ 백그라운드에서 실제 값 갱신 (최신 크레딧 확보)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/credits/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const freshCredits: Credits = {
          total_remaining: data.total_remaining || 0,
          tier: data.tier || 'free'
        }
        
        // 캐시 업데이트
        setCachedCredits(freshCredits)
        setCredits(freshCredits)
      }
    } catch (error) {
      console.error('Failed to load credits:', error)
    }
  }, [user, getToken])

  // 초기 로드 및 user 변경 시 (기존 로직 유지)
  useEffect(() => {
    if (user) {
      loadCredits()
    }
  }, [user, loadCredits])

  // 🆕 크레딧 변경 이벤트 리스너 (실시간 업데이트)
  useEffect(() => {
    const handleCreditChanged = (e: CustomEvent<Credits>) => {
      console.log('💳 Credit changed event received:', e.detail)
      setCredits(e.detail)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('creditChanged' as any, handleCreditChanged as any)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('creditChanged' as any, handleCreditChanged as any)
      }
    }
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      toast({
        variant: "success",
        title: "✅ 로그아웃 완료",
        description: "안전하게 로그아웃되었습니다.",
      })
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      toast({
        variant: "destructive",
        title: "❌ 오류",
        description: "로그아웃에 실패했습니다.",
      })
    }
  }, [router, toast])

  // Tier 정보
  const tierConfig = {
    free: { label: '무료', color: 'bg-neutral-600' },
    basic: { label: '베이직', color: 'bg-primary-500' },
    pro: { label: '프로', color: 'bg-primary-600' },
    god: { label: 'GOD', color: 'bg-brand-red' },
  }
  const tierInfo = tierConfig[credits?.tier as keyof typeof tierConfig] || tierConfig.free
  
  return (
    <header className="h-14 md:h-16 lg:h-20 border-b border-neutral-300 bg-white/90 backdrop-blur-xl flex items-center justify-between px-3 md:px-6 lg:px-8 sticky top-0 z-30 shadow-sm">
      {/* 좌측: 햄버거 메뉴 + 페이지 타이틀 */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* 햄버거 메뉴 (모바일) */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-button hover:bg-neutral-100 active:scale-95 transition-all duration-200 flex-shrink-0"
          aria-label="메뉴 열기"
        >
          <Menu className="w-5 h-5 text-neutral-700" />
        </button>
        
        {/* 모바일에서 숨김, 태블릿부터 표시 */}
        <h1 className="hidden md:block text-lg lg:text-2xl font-extrabold text-brand-red leading-tight select-none pointer-events-none tracking-normal" style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
          Not quite my tempo.
        </h1>
      </div>

      {/* 우측: 메뉴 및 프로필 */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* 크레딧 & 티어 표시 */}
        {credits && (
          <div className="flex items-center gap-1.5 border-r border-neutral-300 pr-2 md:pr-3">
            {/* 크레딧 */}
            <div className="flex items-center gap-1 px-1.5 md:px-2.5 py-1 md:py-1.5 bg-success-bg rounded-button">
              <CreditCard className="w-3.5 h-3.5 md:w-4 md:h-4 text-success" />
              <span className="text-xs md:text-sm font-bold text-success">{credits.total_remaining.toLocaleString()}</span>
            </div>
            
            {/* 티어 배지 */}
            <div className={`flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2.5 py-1 md:py-1.5 ${tierInfo.color} text-white rounded-button shadow-sm`}>
              <Crown className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-xs font-bold hidden sm:inline">{tierInfo.label}</span>
            </div>
          </div>
        )}

        {/* 데스크톱 네비게이션 */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-bold border-r border-neutral-300 pr-4 mr-2">
          <Link
            href="/consulting"
            className="text-neutral-600 hover:text-primary-600 transition-colors duration-200 whitespace-nowrap"
          >
            1:1 컨설팅
          </Link>
          <Link
            href="/about"
            className="text-neutral-600 hover:text-primary-600 transition-colors duration-200"
          >
            About
          </Link>
          <Link
            href="/service-intro"
            className="text-neutral-600 hover:text-primary-600 transition-colors duration-200 whitespace-nowrap"
          >
            서비스 소개
          </Link>
        </nav>

        <div className="flex items-center gap-1 md:gap-1.5">
          {/* 알림 아이콘 */}
          <button
            className="p-1.5 md:p-2 rounded-button hover:bg-neutral-100 active:scale-95 transition-all duration-200 relative"
            aria-label="알림"
          >
            <Bell className="w-4 h-4 md:w-5 md:h-5 text-neutral-600" />
            <span className="absolute top-1 right-1 md:top-1.5 md:right-1.5 w-1.5 h-1.5 md:w-2 md:h-2 bg-brand-red rounded-full ring-1 md:ring-2 ring-white"></span>
          </button>

          {/* 설정 아이콘 (태블릿 이상) */}
          <Link
            href="/dashboard/settings"
            className="hidden sm:block p-1.5 md:p-2 rounded-button hover:bg-neutral-100 active:scale-95 transition-all duration-200"
            aria-label="설정"
          >
            <Settings className="w-4 h-4 md:w-5 md:h-5 text-neutral-600" />
          </Link>

          {/* 프로필 아이콘 */}
          <button
            className="flex items-center gap-2 p-1.5 md:p-2 rounded-button hover:bg-neutral-100 active:scale-95 transition-all duration-200"
            aria-label="프로필"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-primary-500 flex items-center justify-center shadow-sm">
              <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
          </button>

          {/* 로그아웃 버튼 */}
          <button
            onClick={handleLogout}
            className="p-1.5 md:p-2 rounded-button hover:bg-error-bg active:scale-95 transition-all duration-200"
            aria-label="로그아웃"
            title="로그아웃"
          >
            <LogOut className="w-4 h-4 md:w-5 md:h-5 text-error" />
          </button>
        </div>
      </div>
    </header>
  )
})


