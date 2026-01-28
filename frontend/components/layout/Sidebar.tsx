"use client"

/**
 * 사이드바 컴포넌트
 * 왼쪽 네비게이션 메뉴
 * 반응형 디자인: 모바일에서는 햄버거 메뉴로 변환
 */
import Link from 'next/link'
import Image from 'next/image'
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
  Target,
  Key,
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
    title: 'N사 플레이스',
    icon: <span className="w-5 h-5 flex items-center justify-center font-bold text-green-600">N</span>,
    children: [
      {
        title: '플레이스 순위조회',
        href: '/dashboard/naver/rank',
        icon: <TrendingUp className="w-4 h-4" />,
      },
      {
        title: '플레이스 진단',
        href: '/dashboard/naver/audit',
        icon: <Search className="w-4 h-4" />,
      },
      {
        title: '타겟키워드 추출',
        href: '/dashboard/naver/target-keywords',
        icon: <Target className="w-4 h-4" />,
      },
      {
        title: '키워드순위 추적',
        href: '/dashboard/naver/metrics-tracker',
        icon: <BarChart3 className="w-4 h-4" />,
      },
      {
        title: '플레이스 활성화',
        href: '/dashboard/naver/activation',
        icon: <TrendingUp className="w-4 h-4" />,
      },
      {
        title: '대표키워드 분석',
        href: '/dashboard/naver/main-keywords',
        icon: <Key className="w-4 h-4" />,
      },
      {
        title: '리뷰관리',
        icon: <MessageSquare className="w-4 h-4" />,
        children: [
          { title: '리뷰 분석', href: '/dashboard/naver/reviews', icon: null },
          { title: 'AI 리뷰답글', href: '/dashboard/naver/reviews/ai-reply', icon: null },
        ],
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
        title: '플레이스 지수',
        icon: <BarChart3 className="w-3.5 h-3.5" />,
        badge: '투표',
        children: [
          { title: '주요 KPI현황', href: '/dashboard/feature-voting', icon: null, badge: '투표' },
          { title: '지수 분석 및 전략', href: '/dashboard/feature-voting', icon: null, badge: '투표' },
        ],
      },
      {
        title: '검색광고 분석',
        href: '/dashboard/feature-voting',
        icon: <Star className="w-4 h-4" />,
        badge: '투표',
      },
      {
        title: '네이버 공지',
        href: '/dashboard/feature-voting',
        icon: <Bell className="w-4 h-4" />,
        badge: '투표',
      },
    ],
  },
  {
    title: 'K사 맵 관리',
    icon: <span className="w-5 h-5 flex items-center justify-center font-bold text-amber-500">K</span>,
    badge: '투표',
    children: [
      {
        title: 'K사 비지니스 매장진단',
        href: '/dashboard/feature-voting',
        icon: <Search className="w-4 h-4" />,
        badge: '투표',
      },
      {
        title: '리뷰관리',
        href: '/dashboard/feature-voting',
        icon: <MessageSquare className="w-4 h-4" />,
        badge: '투표',
      },
      {
        title: 'K사 맵 순위조회',
        href: '/dashboard/feature-voting',
        icon: <TrendingUp className="w-4 h-4" />,
        badge: '투표',
      },
      {
        title: '주요지표관리',
        href: '/dashboard/feature-voting',
        icon: <BarChart3 className="w-4 h-4" />,
        badge: '투표',
      },
    ],
  },
  {
    title: 'G사 비지니스 프로필',
    icon: <span className="w-5 h-5 flex items-center justify-center font-bold text-blue-600">G</span>,
    badge: '투표',
    children: [
      {
        title: '리뷰 관리',
        icon: <MessageSquare className="w-4 h-4" />,
        badge: '투표',
        children: [
          { title: '리뷰 통계/현황 분석', href: '/dashboard/feature-voting', icon: null, badge: '투표' },
          { title: 'AI 리뷰답글 달기', href: '/dashboard/feature-voting', icon: null, badge: '투표' },
        ],
      },
      {
        title: 'GBP 진단',
        href: '/dashboard/feature-voting',
        icon: <Search className="w-4 h-4" />,
        badge: '투표',
      },
      {
        title: 'G사 맵 순위조회',
        href: '/dashboard/feature-voting',
        icon: <TrendingUp className="w-4 h-4" />,
        badge: '투표',
      },
      {
        title: 'Citation Boost',
        href: '/dashboard/feature-voting',
        icon: <BarChart3 className="w-4 h-4" />,
        badge: '투표',
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
  // N사 플레이스와 리뷰관리만 기본으로 펼쳐진 상태로 설정
  const [openItems, setOpenItems] = useState<string[]>([
    'N사 플레이스', 
    '리뷰관리'
  ])

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
    // 투표 페이지는 active 표시 안 함 (여러 메뉴에서 링크되므로)
    const isActive = item.href && pathname === item.href && item.href !== '/dashboard/feature-voting'
    const hasChildren = item.children && item.children.length > 0
    const isOpen = openItems.includes(item.title)
    const isVoting = item.badge === '투표'

    return (
      <div key={item.title}>
        {item.href ? (
            <Link
              href={item.href}
              className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
              level > 0 && 'pl-10 text-xs',
              level > 1 && 'pl-14 text-xs',
              level === 0 && 'font-semibold text-sm',
              level > 0 && !level && 'text-sm',
                isActive
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {item.icon}
              <span className="flex-1">{item.title}</span>
              {item.badge && (
              <span className={cn(
                "px-1.5 py-0.5 text-[10px] font-semibold rounded",
                isVoting 
                  ? "bg-blue-100 text-blue-700 border border-blue-300" 
                  : "bg-gray-100 text-gray-500 border border-gray-200"
              )}>
                  {item.badge}
                </span>
              )}
            </Link>
        ) : (
          <button
            onClick={() => hasChildren && toggleItem(item.title)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
              level > 0 && 'pl-10 text-xs',
              level === 0 && 'font-semibold text-sm text-olive-800',
              'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {item.icon}
            <span className="flex-1 text-left">{item.title}</span>
            {item.badge && (
              <span className={cn(
                "px-1.5 py-0.5 text-[10px] font-semibold rounded",
                isVoting 
                  ? "bg-blue-100 text-blue-700 border border-blue-300" 
                  : "bg-gray-100 text-gray-500 border border-gray-200"
              )}>
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
        <div className="h-16 border-b flex items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center justify-center flex-1" onClick={onClose}>
              <Image
                src="/whiplace-logo.svg"
              alt="WhiPlace"
              width={500}
              height={160}
                priority
              className="w-[67.5%] h-auto max-w-full"
              />
          </Link>
          
          {/* 모바일 닫기 버튼 */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md hover:bg-accent transition-colors flex-shrink-0"
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


