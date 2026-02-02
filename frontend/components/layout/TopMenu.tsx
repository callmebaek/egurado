"use client"

/**
 * 상단 메뉴 컴포넌트 - Cal.com 스타일
 * 로고, 메뉴, 프로필 아이콘
 * 반응형: 모바일에서는 햄버거 메뉴 표시
 */
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, User, Menu, LogOut, CreditCard, Crown } from 'lucide-react'
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
    }
  }, [user, loadCredits])

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
    pro: { label: '프로', color: 'bg-purple-600' },
    god: { label: 'GOD', color: 'bg-gradient-to-r from-yellow-600 to-orange-600' },
  }
  const tierInfo = tierConfig[credits?.tier as keyof typeof tierConfig] || tierConfig.free
  
  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 w-full overflow-x-hidden">
      {/* 좌측: 햄버거 메뉴 */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* 우측: 크레딧 & 프로필 */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {/* 크레딧 표시 - Active한 느낌 */}
        {credits && (
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            {/* 크레딧 - 밝은 색상으로 Active 느낌 */}
            <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg flex-shrink-0">
              <CreditCard className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
              <span className="text-xs md:text-sm font-bold text-green-700 whitespace-nowrap">{credits.total_remaining.toLocaleString()}</span>
            </div>
            
            {/* 티어 배지 */}
            <div className={cn(
              "flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 text-white rounded-lg font-semibold text-xs md:text-sm flex-shrink-0",
              tierInfo.color
            )}>
              <Crown className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline whitespace-nowrap">{tierInfo.label}</span>
            </div>
          </div>
        )}

        {/* 알림 */}
        <button
          className="relative p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* 프로필 */}
        <button
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 flex-shrink-0"
        >
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
        </button>

        {/* 로그아웃 */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-red-50 text-red-600 flex-shrink-0"
          title="로그아웃"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
})
