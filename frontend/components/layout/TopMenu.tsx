"use client"

/**
 * 상단 메뉴 컴포넌트
 * 로고, 메뉴, 프로필 아이콘
 * 반응형: 모바일에서는 햄버거 메뉴 표시
 */
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, User, Settings, Menu, LogOut, CreditCard, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'
import { memo, useCallback, useState, useEffect } from 'react'

interface TopMenuProps {
  onMenuClick: () => void
}

export const TopMenu = memo(function TopMenu({ onMenuClick }: TopMenuProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [credits, setCredits] = useState<{ total_remaining: number; tier: string } | null>(null)
  const { user, getToken } = useAuth()

  // 크레딧 정보 로드
  useEffect(() => {
    const loadCredits = async () => {
      const token = getToken()
      if (!token) return

      try {
        const response = await fetch('http://3.34.136.255:8000/api/v1/credits/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          setCredits({
            total_remaining: data.total_remaining || 0,
            tier: data.tier || 'free'
          })
        }
      } catch (error) {
        console.error('Failed to load credits:', error)
      }
    }

    if (user) {
      loadCredits()
    }
  }, [user, getToken])

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
    <header className="h-16 md:h-20 border-b border-neutral-300 bg-white/90 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 lg:px-8 sticky top-0 z-30 shadow-sm">
      {/* 좌측: 햄버거 메뉴 + 페이지 타이틀 */}
      <div className="flex items-center gap-4 flex-1">
        {/* 햄버거 메뉴 (모바일) */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2.5 rounded-button hover:bg-neutral-100 active:scale-95 transition-all duration-200"
          aria-label="메뉴 열기"
        >
          <Menu className="w-5 h-5 md:w-6 md:h-6 text-neutral-700" />
        </button>
        
        <h1 className="text-lg md:text-2xl font-extrabold text-brand-red leading-tight select-none pointer-events-none tracking-normal" style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
          Not quite my tempo.
        </h1>
      </div>

      {/* 우측: 메뉴 및 프로필 */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* 크레딧 & 티어 표시 */}
        {credits && (
          <div className="flex items-center gap-2 border-r border-neutral-300 pr-3 md:pr-4">
            {/* 크레딧 */}
            <div className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 bg-success-bg rounded-button">
              <CreditCard className="w-4 h-4 text-success" />
              <span className="text-sm font-bold text-success">{credits.total_remaining.toLocaleString()}</span>
            </div>
            
            {/* 티어 배지 */}
            <div className={`flex items-center gap-1 px-2 md:px-3 py-1.5 ${tierInfo.color} text-white rounded-button shadow-sm`}>
              <Crown className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-xs md:text-sm font-bold hidden md:inline">{tierInfo.label}</span>
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

        <div className="flex items-center gap-2">
          {/* 알림 아이콘 */}
          <button
            className="p-2.5 rounded-button hover:bg-neutral-100 active:scale-95 transition-all duration-200 relative"
            aria-label="알림"
          >
            <Bell className="w-5 h-5 text-neutral-600" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-brand-red rounded-full ring-2 ring-white"></span>
          </button>

          {/* 설정 아이콘 (태블릿 이상) */}
          <Link
            href="/dashboard/settings"
            className="hidden sm:block p-2.5 rounded-button hover:bg-neutral-100 active:scale-95 transition-all duration-200"
            aria-label="설정"
          >
            <Settings className="w-5 h-5 text-neutral-600" />
          </Link>

          {/* 프로필 아이콘 */}
          <button
            className="flex items-center gap-2 p-2 rounded-button hover:bg-neutral-100 active:scale-95 transition-all duration-200"
            aria-label="프로필"
          >
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary-500 flex items-center justify-center shadow-sm">
              <User className="w-5 h-5 text-white" />
            </div>
          </button>

          {/* 로그아웃 버튼 */}
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-button hover:bg-error-bg active:scale-95 transition-all duration-200"
            aria-label="로그아웃"
            title="로그아웃"
          >
            <LogOut className="w-5 h-5 text-error" />
          </button>
        </div>
      </div>
    </header>
  )
})


