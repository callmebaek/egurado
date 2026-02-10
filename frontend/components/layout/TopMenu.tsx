"use client"

/**
 * 상단 메뉴 컴포넌트 - Cal.com 스타일
 * 로고, 메뉴, 프로필 아이콘
 * 반응형: 모바일에서는 햄버거 메뉴 표시
 */
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, User, Menu, LogOut, CreditCard, Crown, MessageCircle } from 'lucide-react'
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
  const [unreadCount, setUnreadCount] = useState(0)
  const { user, getToken } = useAuth()

  const loadCredits = useCallback(async () => {
    const token = getToken()
    if (!token || !user) return

    try {
      const cached = getCachedCredits()
      if (cached) {
        setCredits(cached)
      }

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
        
        setCachedCredits(freshCredits)
        setCredits(freshCredits)
      }
    } catch (error) {
      console.error('Failed to load credits:', error)
    }
  }, [user, getToken])

  useEffect(() => {
    if (user) {
      loadCredits()
      loadUnreadNotifications()
    }
  }, [user, loadCredits])

  const loadUnreadNotifications = useCallback(async () => {
    const token = getToken()
    if (!token || !user) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unread_count || 0)
      }
    } catch (error) {
      console.error('Failed to load unread notifications count:', error)
      // 에러 시 0으로 설정 (조용히 실패)
      setUnreadCount(0)
    }
  }, [user, getToken])

  useEffect(() => {
    const handleCreditChanged = (e: CustomEvent<Credits>) => {
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

  const tierConfig = {
    free: { label: '무료', color: 'bg-gray-600' },
    basic: { label: '베이직', color: 'bg-blue-600' },
    basic_plus: { label: '베이직+', color: 'bg-blue-700' },
    pro: { label: '프로', color: 'bg-purple-600' },
    custom: { label: '커스텀', color: 'bg-purple-700' },
    god: { label: 'GOD', color: 'bg-gradient-to-r from-yellow-600 to-orange-600' },
  }
  const tierInfo = tierConfig[credits?.tier as keyof typeof tierConfig] || tierConfig.free
  
  return (
    <header className="h-14 md:h-16 border-b border-gray-200 bg-white sticky top-0 z-30 w-full overflow-x-hidden">
      <div className="h-full flex items-center justify-between px-3 md:px-4 lg:px-6">
        {/* 좌측: 햄버거 메뉴 */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <div className="group relative">
            <button
              onClick={onMenuClick}
              className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 touch-manipulation"
            >
              <Menu className="w-5 h-5 md:w-6 md:h-6 text-gray-700" />
            </button>
            <div className="absolute left-0 top-full mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg z-50">
              메뉴
              <div className="absolute left-4 -top-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
            </div>
          </div>
        </div>

        {/* 우측: 크레딧 & 프로필 */}
        <div className="flex items-center gap-0 sm:gap-1 md:gap-2 lg:gap-3 flex-shrink-0 ml-auto">
          {/* 크레딧 표시 */}
          {credits && (
            <div className="flex items-center gap-0 sm:gap-0.5 md:gap-1 flex-shrink-0">
              {/* 크레딧 배지 */}
              <div className="group relative">
                <Link 
                  href="/dashboard/credits"
                  className="flex items-center justify-center gap-1 md:gap-1.5 h-11 px-2.5 md:px-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 hover:border-green-300 hover:shadow-md active:bg-green-200 transition-all duration-200 cursor-pointer touch-manipulation"
                >
                  <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm md:text-base font-bold text-green-700 whitespace-nowrap">{credits.total_remaining.toLocaleString()}</span>
                </Link>
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg z-50">
                  크레딧 관리
                  <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
              
              {/* 티어 배지 */}
              <div className="group relative">
                <Link
                  href="/dashboard/membership"
                  className={cn(
                    "flex items-center justify-center gap-1 md:gap-1.5 h-11 px-2.5 md:px-3 text-white rounded-lg font-semibold text-xs sm:text-sm hover:shadow-lg hover:scale-105 active:scale-100 transition-all duration-200 cursor-pointer touch-manipulation",
                    tierInfo.color
                  )}
                >
                  <Crown className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                  <span className="hidden sm:inline whitespace-nowrap">{tierInfo.label}</span>
                </Link>
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg z-50">
                  멤버십 관리
                  <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            </div>
          )}

          {/* 알림 */}
          <div className="group relative">
            <Link
              href="/dashboard/notifications"
              className="relative w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 hover:shadow-md active:bg-gray-200 transition-all duration-200 touch-manipulation"
            >
              <Bell className="w-5 h-5 md:w-6 md:h-6 text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white shadow-sm"></span>
              )}
            </Link>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg z-50">
              알림 센터
              <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
            </div>
          </div>

          {/* 문의하기 */}
          <div className="group relative">
            <Link
              href="/dashboard/support"
              className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 hover:shadow-md active:bg-gray-200 transition-all duration-200 touch-manipulation"
            >
              <MessageCircle className="w-5 h-5 md:w-6 md:h-6 text-gray-700" />
            </Link>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg z-50">
              고객 지원
              <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
            </div>
          </div>

          {/* 프로필 */}
          <div className="group relative">
            <Link
              href="/dashboard/settings"
              className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 hover:shadow-md active:bg-gray-200 transition-all duration-200 touch-manipulation"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 group-hover:ring-2 group-hover:ring-gray-300 transition-all duration-200">
                <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
            </Link>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg z-50">
              계정 설정
              <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
            </div>
          </div>

          {/* 로그아웃 */}
          <div className="group relative">
            <button
              onClick={handleLogout}
              className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-red-50 hover:shadow-md active:bg-red-100 text-red-600 transition-all duration-200 touch-manipulation"
            >
              <LogOut className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <div className="absolute right-0 top-full mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg z-50">
              로그아웃
              <div className="absolute right-4 -top-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
})
