"use client"

/**
 * 대시보드 레이아웃
 * Sidebar + TopMenu 조합
 * 완전한 반응형 디자인
 */
import { Sidebar } from '@/components/layout/Sidebar'
import { TopMenu } from '@/components/layout/TopMenu'
import { Toaster } from '@/components/ui/toaster'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 인증 상태 체크
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
      } else {
        setIsLoading(false)
      }
    }

    checkAuth()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-olive-50/30">
      {/* 사이드바 */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 상단 메뉴 */}
        <TopMenu onMenuClick={() => setSidebarOpen(true)} />

        {/* 페이지 컨텐츠 */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gradient-to-br from-white to-olive-50/20">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      
      {/* Toast 알림 */}
      <Toaster />
    </div>
  )
}


