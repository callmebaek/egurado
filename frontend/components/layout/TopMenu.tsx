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

interface TopMenuProps {
  onMenuClick: () => void
}

export function TopMenu({ onMenuClick }: TopMenuProps) {
  const router = useRouter()
  const { toast } = useToast()

  const handleLogout = async () => {
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
  }
  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      {/* 좌측: 햄버거 메뉴 + 페이지 타이틀 */}
      <div className="flex items-center gap-3 flex-1">
        {/* 햄버거 메뉴 (모바일) */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-md hover:bg-accent transition-colors"
          aria-label="메뉴 열기"
        >
          <Menu className="w-6 h-6 text-olive-700" />
        </button>
        
        <h1 className="text-lg lg:text-xl font-semibold text-olive-800">대시보드</h1>
      </div>

      {/* 우측: 메뉴 및 프로필 */}
      <div className="flex items-center gap-2 lg:gap-6">
        {/* 데스크톱 네비게이션 */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-sm">
          <Link
            href="/consulting"
            className="text-muted-foreground hover:text-olive-700 transition-colors whitespace-nowrap"
          >
            1:1 컨설팅
          </Link>
          <Link
            href="/about"
            className="text-muted-foreground hover:text-olive-700 transition-colors"
          >
            About
          </Link>
          <Link
            href="/service-intro"
            className="text-muted-foreground hover:text-olive-700 transition-colors whitespace-nowrap"
          >
            서비스 소개
          </Link>
        </nav>

        <div className="flex items-center gap-2 lg:gap-3 border-l pl-2 lg:pl-4">
          {/* 알림 아이콘 */}
          <button
            className="p-2 rounded-md hover:bg-accent transition-colors relative"
            aria-label="알림"
          >
            <Bell className="w-5 h-5 text-olive-700" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* 설정 아이콘 (태블릿 이상) */}
          <Link
            href="/dashboard/settings"
            className="hidden sm:block p-2 rounded-md hover:bg-accent transition-colors"
            aria-label="설정"
          >
            <Settings className="w-5 h-5 text-olive-700" />
          </Link>

          {/* 프로필 아이콘 */}
          <button
            className="flex items-center gap-2 p-1 lg:p-2 rounded-md hover:bg-accent transition-colors"
            aria-label="프로필"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center ring-2 ring-olive-200">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
          </button>

          {/* 로그아웃 버튼 */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-md hover:bg-red-50 transition-colors"
            aria-label="로그아웃"
            title="로그아웃"
          >
            <LogOut className="w-5 h-5 text-red-600" />
          </button>
        </div>
      </div>
    </header>
  )
}


