"use client"

/**
 * 대시보드 레이아웃
 * Sidebar + TopMenu 조합
 * 완전한 반응형 디자인
 * Mantine UI 통합 (Stripe 스타일)
 */
import { Sidebar } from '@/components/layout/Sidebar'
import { TopMenu } from '@/components/layout/TopMenu'
import { Toaster } from '@/components/ui/toaster'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { MantineProvider, createTheme } from '@mantine/core'
import '@mantine/core/styles.css'

// Stripe 스타일 브랜드 테마
const theme = createTheme({
  primaryColor: 'brand',
  colors: {
    brand: [
      '#f0f4f8',  // lightest
      '#d9e2ec',
      '#bcccdc',
      '#9fb3c8',
      '#829ab1',
      '#635bff',  // primary (#635bff)
      '#5046e5',
      '#4239cc',
      '#342cb2',
      '#271f99',  // darkest
    ],
    green: [
      '#f0f8f1',  // lightest
      '#d4edd6',
      '#b8e1bc',
      '#9cd6a2',
      '#80ca88',
      '#407645',  // primary (#407645)
      '#366239',
      '#2d4f2e',
      '#233b23',
      '#1a2818',  // darkest
    ],
  },
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  headings: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '2.125rem', lineHeight: '1.2' },
      h2: { fontSize: '1.625rem', lineHeight: '1.25' },
      h3: { fontSize: '1.375rem', lineHeight: '1.3' },
    },
  },
  defaultRadius: 'md',
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
})

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
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-transparent border-t-[var(--primary)] mx-auto mb-4"></div>
          <p className="text-[var(--muted-foreground)] text-sm font-medium">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 인증되지 않은 경우 (리다이렉트 중)
  if (!user) {
    return null
  }

  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
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
    </MantineProvider>
  )
}


