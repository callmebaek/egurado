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
  Key,
} from 'lucide-react'
import { useState, useEffect, useCallback, memo } from 'react'

interface NavItem {
  title: string
  href?: string
  icon: React.ReactNode
  children?: NavItem[]
  badge?: string
  disabled?: boolean
  comingSoon?: boolean
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
        title: '플레이스 순위',
        href: '/dashboard/naver/rank',
        icon: <TrendingUp className="w-4 h-4" />,
      },
      {
        title: '대표키워드 분석',
        href: '/dashboard/naver/main-keywords',
        icon: <Star className="w-4 h-4" />,
      },
      {
        title: '리뷰 관리',
        icon: <MessageSquare className="w-4 h-4" />,
        children: [
          { title: '리뷰 통계/현황분석', href: '/dashboard/naver/reviews', icon: null },
          { title: 'AI 답글 생성', href: '/dashboard/naver/reviews/ai-reply', icon: null },
          { title: '네이버 세션 관리', href: '/dashboard/naver/session', icon: null },
        ],
      },
      {
        title: '플레이스 진단',
        href: '/dashboard/naver/audit',
        icon: <Search className="w-4 h-4" />,
        badge: 'Pro',
      },
      {
        title: '경쟁매장 분석',
        href: '/dashboard/naver/competitors',
        icon: <Users className="w-4 h-4" />,
        badge: 'Pro',
      },
      {
        title: '타겟키워드 추출',
        href: '/dashboard/naver/target-keywords',
        icon: <Key className="w-4 h-4" />,
      },
      {
        title: '키워드 검색량',
        href: '/dashboard/naver/keywords',
        icon: <Tag className="w-4 h-4" />,
      },
      {
        title: '플레이스 지수 관리',
        icon: <BarChart3 className="w-4 h-4" />,
        badge: 'Pro',
        disabled: true,
        comingSoon: true,
        children: [
          { title: '주요 KPI 현황', href: '/dashboard/naver/metrics', icon: null, disabled: true },
          { title: '지수 분석 및 전략', href: '/dashboard/naver/metrics/strategy', icon: null, disabled: true },
        ],
      },
      {
        title: '검색광고 분석',
        icon: <Search className="w-4 h-4" />,
        badge: 'Pro',
        disabled: true,
        comingSoon: true,
      },
      {
        title: '네이버 공지',
        href: '/dashboard/naver/notices',
        icon: <Bell className="w-4 h-4" />,
      },
    ],
  },
  {
    title: '구글 비즈니스',
    icon: <span className="w-5 h-5 flex items-center justify-center font-bold text-blue-600">G</span>,
    comingSoon: true,
    children: [
      {
        title: '리뷰 관리',
        icon: <MessageSquare className="w-4 h-4" />,
        disabled: true,
        comingSoon: true,
        children: [
          { title: '리뷰 통계/현황분석', href: '/dashboard/google/reviews', icon: null, disabled: true, comingSoon: true },
          { title: 'AI 답글 생성', href: '/dashboard/google/reviews/ai-reply', icon: null, disabled: true, comingSoon: true },
        ],
      },
      {
        title: 'GBP Audit',
        href: '/dashboard/google/audit',
        icon: <Search className="w-4 h-4" />,
        badge: 'Pro',
        disabled: true,
        comingSoon: true,
      },
      {
        title: '구글 순위 확인',
        href: '/dashboard/google/rank',
        icon: <TrendingUp className="w-4 h-4" />,
        disabled: true,
        comingSoon: true,
      },
      {
        title: 'Citation Boost',
        href: '/dashboard/google/citation',
        icon: <BarChart3 className="w-4 h-4" />,
        badge: 'Pro',
        disabled: true,
        comingSoon: true,
      },
    ],
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const Sidebar = memo(function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  // 네이버 플레이스, 구글 비즈니스, 리뷰 관리를 기본으로 펼쳐진 상태로 설정
  const [openItems, setOpenItems] = useState<string[]>(['네이버 플레이스', '구글 비즈니스', '리뷰 관리'])

  // 모바일에서 라우트 변경 시 사이드바 닫기
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  const toggleItem = useCallback((title: string) => {
    setOpenItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    )
  }, [])

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const isActive = item.href && pathname === item.href
    const hasChildren = item.children && item.children.length > 0
    const isOpen = openItems.includes(item.title)
    const isDisabled = item.disabled

    return (
      <div key={item.title}>
        {item.href ? (
          isDisabled ? (
            <div
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px]',
                level > 0 && 'pl-11',
                level > 1 && 'pl-[60px]',
                level === 0 && 'font-medium',
                'text-[var(--muted-foreground)]/40 cursor-not-allowed opacity-50'
              )}
            >
              {item.icon}
              <span className="flex-1">{item.title}</span>
              {item.comingSoon && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-[var(--muted)] text-[var(--muted-foreground)] rounded-md">
                  Soon
                </span>
              )}
              {item.badge && !item.comingSoon && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500 text-white rounded-md">
                  {item.badge}
                </span>
              )}
            </div>
          ) : (
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-[var(--transition-fast)]',
                level > 0 && 'pl-11',
                level > 1 && 'pl-[60px]',
                level === 0 && 'font-medium',
                isActive
                  ? 'bg-[var(--primary)] text-white font-medium shadow-[var(--shadow-sm)]'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]'
              )}
            >
              {item.icon}
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500 text-white rounded-md">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        ) : (
          <button
            onClick={() => !isDisabled && hasChildren && toggleItem(item.title)}
            disabled={isDisabled}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-[var(--transition-fast)]',
              level > 0 && 'pl-11',
              level === 0 && 'font-medium text-[var(--foreground)]',
              isDisabled
                ? 'text-[var(--muted-foreground)]/40 cursor-not-allowed opacity-50'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]'
            )}
          >
            {item.icon}
            <span className="flex-1 text-left">{item.title}</span>
            {item.comingSoon && (
              <span className="px-2 py-0.5 text-[10px] font-medium bg-[var(--muted)] text-[var(--muted-foreground)] rounded-md">
                Soon
              </span>
            )}
            {item.badge && !item.comingSoon && (
              <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500 text-white rounded-md">
                {item.badge}
              </span>
            )}
            {hasChildren && !isDisabled && (
              isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
        {hasChildren && isOpen && !isDisabled && (
          <div className="mt-0.5 space-y-0.5 overflow-hidden">
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
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-[var(--transition-base)]"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50",
          "w-[280px] h-screen border-r border-[var(--border-light)] bg-[var(--card)] flex flex-col",
          "transition-transform duration-[var(--transition-slow)] ease-[cubic-bezier(0.4,0,0.2,1)] lg:translate-x-0",
          "shadow-[var(--shadow-lg)]",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* 로고 및 닫기 버튼 */}
        <div className="h-16 px-4 border-b border-[var(--border-light)] flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center group py-1.5" onClick={onClose}>
            <div className="relative h-14 w-auto flex items-center group-hover:opacity-90 transition-opacity duration-[var(--transition-base)]">
              <Image
                src="/whiplace-logo.png"
                alt="Whiplace Logo"
                width={280}
                height={90}
                className="object-contain h-full w-auto"
                style={{
                  maxHeight: '56px',
                  width: 'auto',
                  height: '100%',
                  transform: 'scale(1.15)',
                  transformOrigin: 'left center',
                }}
                priority
              />
            </div>
          </Link>
          
          {/* 모바일 닫기 버튼 */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--accent)] transition-colors duration-[var(--transition-fast)]"
            aria-label="메뉴 닫기"
          >
            <X className="w-5 h-5 text-[var(--muted-foreground)]" />
          </button>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-0.5">
            {navigation.map((item) => renderNavItem(item))}
          </div>
        </nav>

        {/* 하단 정보 */}
        <div className="px-6 py-4 border-t border-[var(--border-light)] text-xs text-[var(--muted-foreground)]">
          <p className="font-medium">© 2026 Whiplace</p>
          <p className="text-[var(--muted-foreground)] mt-0.5">Version 1.0.0</p>
        </div>
      </aside>
    </>
  )
})


