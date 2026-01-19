"use client"

/**
 * 대시보드 레이아웃
 * Sidebar + TopMenu 조합
 * 완전한 반응형 디자인
 */
import { Sidebar } from '@/components/layout/Sidebar'
import { TopMenu } from '@/components/layout/TopMenu'
import { Toaster } from '@/components/ui/toaster'
import { useState, useEffect, useCallback } from 'react'
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
  
  const handleSidebarClose = useCallback(() => setSidebarOpen(false), [])
  const handleSidebarOpen = useCallback(() => setSidebarOpen(true), [])

  useEffect(() => {
    // 인증 상태 체크
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
      } else {
        setIsLoading(false)
        
        // Chrome Extension을 위해 userId를 Chrome Storage에 저장
        if (session.user && typeof chrome !== 'undefined' && chrome.storage) {
          try {
            await chrome.storage.local.set({
              userId: session.user.id,
              lastUpdated: Date.now()
            })
            console.log('✅ Chrome Storage에 userId 저장 완료:', session.user.id)
          } catch (error) {
            console.log('ℹ️ Chrome Storage 저장 실패 (확장 프로그램이 설치되지 않았을 수 있음):', error)
          }
        }
      }
    }

    checkAuth()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login')
      } else if (session.user && typeof chrome !== 'undefined' && chrome.storage) {
        // 인증 상태 변경 시에도 Chrome Storage 업데이트
        try {
          chrome.storage.local.set({
            userId: session.user.id,
            lastUpdated: Date.now()
          })
        } catch (error) {
          console.log('ℹ️ Chrome Storage 저장 실패:', error)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-transparent border-t-[var(--primary)] mx-auto mb-4"></div>
          <p className="text-[var(--muted-foreground)] text-sm font-medium">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      {/* 사이드바 */}
      <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 상단 메뉴 */}
        <TopMenu onMenuClick={handleSidebarOpen} />

        {/* 페이지 컨텐츠 */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-[var(--muted)]">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
      
      {/* Toast 알림 */}
      <Toaster />
    </div>
  )
}


