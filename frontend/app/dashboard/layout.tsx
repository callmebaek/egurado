"use client"

/**
 * 대시보드 레이아웃 - Cal.com 스타일
 * Sidebar + TopMenu 조합
 * 완전한 반응형 디자인
 * Mantine UI 통합
 */
import { Sidebar } from '@/components/layout/Sidebar'
import { TopMenu } from '@/components/layout/TopMenu'
import { Toaster } from '@/components/ui/toaster'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const handleSidebarClose = useCallback(() => setSidebarOpen(false), [])
  const handleSidebarOpen = useCallback(() => setSidebarOpen(true), [])

  useEffect(() => {
    // 인증 상태 체크
    if (!loading && !user) {
      router.push('/login')
    }
    
    // Chrome Extension을 위해 userId를 Chrome Storage에 저장
    if (user && typeof chrome !== 'undefined' && chrome.storage) {
      try {
        chrome.storage.local.set({
          userId: user.id,
          lastUpdated: Date.now()
        })
        console.log('✅ Chrome Storage에 userId 저장 완료:', user.id)
      } catch (error) {
        console.log('ℹ️ Chrome Storage 저장 실패 (확장 프로그램이 설치되지 않았을 수 있음):', error)
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-black mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm font-medium">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 인증되지 않은 경우 (리다이렉트 중)
  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* 사이드바 */}
      <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 상단 메뉴 */}
        <TopMenu onMenuClick={handleSidebarOpen} />

        {/* 페이지 컨텐츠 - Cal.com 스타일 */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
      
      {/* Toast 알림 */}
      <Toaster />
    </div>
  )
}
