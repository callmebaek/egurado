"use client"

/**
 * 상단 메뉴 컴포넌트
 * 로고, 메뉴, 프로필 아이콘
 * 반응형: 모바일에서는 햄버거 메뉴 표시
 */
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, User, Settings, Menu, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { memo, useCallback } from 'react'

interface TopMenuProps {
  onMenuClick: () => void
}

export const TopMenu = memo(function TopMenu({ onMenuClick }: TopMenuProps) {
  const router = useRouter()
  const { toast } = useToast()

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
  
  return (
    <header className="h-16 border-b border-[var(--border-light)] bg-[var(--card)]/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-[var(--shadow-sm)]">
      {/* 좌측: 햄버거 메뉴 + 페이지 타이틀 */}
      <div className="flex items-center gap-4 flex-1">
        {/* 햄버거 메뉴 (모바일) */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-[var(--accent)] transition-all duration-[var(--transition-fast)]"
          aria-label="메뉴 열기"
        >
          <Menu className="w-5 h-5 text-[var(--foreground)]" />
        </button>
        
        <h1 className="text-lg lg:text-xl font-semibold text-[var(--foreground)] tracking-tight">대시보드</h1>
      </div>

      {/* 우측: 메뉴 및 프로필 */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* 데스크톱 네비게이션 */}
        <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium">
          <Link
            href="/consulting"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-[var(--transition-fast)] whitespace-nowrap"
          >
            1:1 컨설팅
          </Link>
          <Link
            href="/about"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-[var(--transition-fast)]"
          >
            About
          </Link>
          <Link
            href="/service-intro"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-[var(--transition-fast)] whitespace-nowrap"
          >
            서비스 소개
          </Link>
        </nav>

        <div className="flex items-center gap-1 lg:gap-2 border-l border-[var(--border-light)] pl-3 lg:pl-4 ml-2">
          {/* 알림 아이콘 */}
          <button
            className="p-2 rounded-lg hover:bg-[var(--accent)] transition-all duration-[var(--transition-fast)] relative"
            aria-label="알림"
          >
            <Bell className="w-[18px] h-[18px] text-[var(--muted-foreground)]" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white"></span>
          </button>

          {/* 설정 아이콘 (태블릿 이상) */}
          <Link
            href="/dashboard/settings"
            className="hidden sm:block p-2 rounded-lg hover:bg-[var(--accent)] transition-all duration-[var(--transition-fast)]"
            aria-label="설정"
          >
            <Settings className="w-[18px] h-[18px] text-[var(--muted-foreground)]" />
          </Link>

          {/* 프로필 아이콘 */}
          <button
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--accent)] transition-all duration-[var(--transition-fast)]"
            aria-label="프로필"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--olive-700)] flex items-center justify-center shadow-[var(--shadow-sm)]">
              <User className="w-4 h-4 text-white" />
            </div>
          </button>

          {/* 로그아웃 버튼 */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-red-50 transition-all duration-[var(--transition-fast)]"
            aria-label="로그아웃"
            title="로그아웃"
          >
            <LogOut className="w-[18px] h-[18px] text-red-600" />
          </button>
        </div>
      </div>
    </header>
  )
})


