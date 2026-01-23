"use client"

/**
 * 사이드바 컴포넌트
 * 왼쪽 네비게이션 메뉴
 * 반응형 디자인: 모바일에서는 햄버거 메뉴로 변환
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Store,
  MessageSquare,
  TrendingUp,
  Search,
  Tag,
  Users,
  BarChart3,
  Bell,
  Star,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface NavItem {
  title: string
  href?: string
  icon: React.ReactNode
  children?: NavItem[]
  badge?: string
}

const navigation: NavItem[] = [
  {
    title: '대시보드',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    title: '내 매장 등록',
    href: '/dashboard/connect-store',
    icon: <Store className="w-5 h-5" />,
  },
  {
    title: '네이버 플레이스',
    icon: <span className="w-5 h-5 flex items-center justify-center font-bold text-green-600">N</span>,
    children: [
      {
        title: '플레이스 순위조회',
        href: '/dashboard/naver/rank',
        icon: <TrendingUp className="w-4 h-4" />,
      },
      {
        title: '주요지표 추적',
        href: '/dashboard/naver/metrics-tracker',
        icon: <BarChart3 className="w-4 h-4" />,
      },
      {
        title: '리뷰 관리',
        icon: <MessageSquare className="w-4 h-4" />,
        children: [
          { title: '리뷰 통계/현황분석', href: '/dashboard/naver/reviews', icon: null },
          { title: 'AI 리뷰답글 달기', href: '/dashboard/naver/reviews/ai-reply', icon: null },
        ],
      },
      {
        title: '플레이스 진단',
        href: '/dashboard/naver/audit',
        icon: <Search className="w-4 h-4" />,
      },
      {
        title: '경쟁매장 분석',
        href: '/dashboard/naver/competitors',
        icon: <Users className="w-4 h-4" />,
      },
      {
        title: '키워드 검색량조회',
        href: '/dashboard/naver/keywords',
        icon: <Tag className="w-4 h-4" />,
      },
      {
        title: '플레이스 지수관리',
        icon: <BarChart3 className="w-4 h-4" />,
        badge: '준비중',
        children: [
          { title: '주요 KPI 현황', href: '/dashboard/naver/metrics', icon: null },
          { title: '지수 분석 및 전략', href: '/dashboard/naver/metrics/strategy', icon: null },
        ],
      },
      {
        title: '검색광고 분석',
        href: '/dashboard/naver/search-ads',
        icon: <Star className="w-4 h-4" />,
        badge: '준비중',
      },
      {
        title: '네이버 공지',
        href: '/dashboard/naver/notices',
        icon: <Bell className="w-4 h-4" />,
        badge: '준비중',
      },
    ],
  },
  {
    title: '구글 비즈니스 프로필',
    icon: <span className="w-5 h-5 flex items-center justify-center font-bold text-blue-600">G</span>,
    badge: '준비중',
    children: [
      {
        title: '리뷰 관리',
        icon: <MessageSquare className="w-4 h-4" />,
        badge: '준비중',
        children: [
          { title: '리뷰 통계/현황분석', href: '/dashboard/google/reviews', icon: null, badge: '준비중' },
          { title: 'AI 리뷰답글 달기', href: '/dashboard/google/reviews/ai-reply', icon: null, badge: '준비중' },
        ],
      },
      {
        title: 'GBP 진단',
        href: '/dashboard/google/audit',
        icon: <Search className="w-4 h-4" />,
        badge: '준비중',
      },
      {
        title: '구글 순위조회',
        href: '/dashboard/google/rank',
        icon: <TrendingUp className="w-4 h-4" />,
        badge: '준비중',
      },
      {
        title: 'Citation Boost',
        href: '/dashboard/google/citation',
        icon: <BarChart3 className="w-4 h-4" />,
        badge: '준비중',
      },
    ],
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  // 네이버 플레이스와 구글 비즈니스를 기본으로 펼쳐진 상태로 설정
  const [openItems, setOpenItems] = useState<string[]>(['네이버 플레이스', '구글 비즈니스'])

  // 모바일에서 라우트 변경 시 사이드바 닫기
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  const toggleItem = (title: string) => {
    setOpenItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    )
  }

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const isActive = item.href && pathname === item.href
    const hasChildren = item.children && item.children.length > 0
    const isOpen = openItems.includes(item.title)

    return (
      <div key={item.title}>
        {item.href ? (
            <Link
              href={item.href}
              className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              level > 0 && 'pl-10',
              level > 1 && 'pl-14',
              level === 0 && 'font-semibold',
                isActive
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {item.icon}
              <span className="flex-1">{item.title}</span>
              {item.badge && (
              <span className="px-1.5 py-0.5 text-xs font-semibold bg-amber-500 text-white rounded">
                  {item.badge}
                </span>
              )}
            </Link>
        ) : (
          <button
            onClick={() => hasChildren && toggleItem(item.title)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              level > 0 && 'pl-10',
              level === 0 && 'font-semibold text-olive-800',
              'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {item.icon}
            <span className="flex-1 text-left">{item.title}</span>
            {item.badge && (
              <span className="px-1.5 py-0.5 text-xs font-semibold bg-amber-500 text-white rounded">
                {item.badge}
              </span>
            )}
            {hasChildren && (
              isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
        {hasChildren && isOpen && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* 모바일 오버레이 배경 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50",
          "w-64 h-screen border-r bg-background flex flex-col",
          "transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* 로고 및 닫기 버튼 */}
        <div className="p-4 border-b flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="text-xl font-bold text-olive-800">이거라도</span>
          </Link>
          
          {/* 모바일 닫기 버튼 */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md hover:bg-accent transition-colors"
            aria-label="메뉴 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {navigation.map((item) => renderNavItem(item))}
          </div>
        </nav>

        {/* 하단 정보 */}
        <div className="p-4 border-t text-xs text-muted-foreground">
          <p>© 2026 Egurado</p>
          <p className="text-olive-600">Version 1.0.0</p>
        </div>
      </aside>
    </>
  )
}


