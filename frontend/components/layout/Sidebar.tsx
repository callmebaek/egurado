"use client"

/**
 * 사이드바 컴포넌트 - Cal.com 스타일
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
  Rocket,
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
    title: '시작하기',
    href: '/dashboard/getting-started',
    icon: <Rocket className="w-5 h-5" />,
    badge: '가이드',
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
        icon: <BarChart3 className="w-4 h-4" />,
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
  const [openItems, setOpenItems] = useState<string[]>(['N사 플레이스', '리뷰관리'])

  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  // 모바일에서 사이드바 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // ESC 키로 사이드바 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const toggleItem = (title: string) => {
    setOpenItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    )
  }

  const renderNavItem = (item: NavItem, level: number = 0) => {
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
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm min-h-[44px]',
              level > 0 && 'pl-9',
              level > 1 && 'pl-12',
              isActive
                ? 'bg-emerald-100 text-emerald-700 font-semibold'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:scale-[0.98]'
            )}
          >
            <span className={cn(
              'flex-shrink-0',
              isActive && 'text-emerald-600',
              !isActive && 'text-gray-600'
            )}>
              {item.icon}
            </span>
            <span>{item.title}</span>
            {item.badge && (
              <span className={cn(
                "text-[10px] font-semibold transition-colors ml-2",
                item.badge === '가이드'
                  ? "text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full"
                  : isVoting 
                    ? "text-emerald-600" 
                    : "text-gray-500"
              )}>
                {item.badge}
              </span>
            )}
          </Link>
        ) : (
          <button
            onClick={() => hasChildren && toggleItem(item.title)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium min-h-[44px]',
              level > 0 && 'pl-9',
              'text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:scale-[0.98]'
            )}
          >
            <span className="flex-shrink-0 text-gray-600">
              {item.icon}
            </span>
            <span className="text-left">{item.title}</span>
            {item.badge && (
              <span className={cn(
                "text-[10px] font-semibold transition-colors ml-2",
                isVoting 
                  ? "text-emerald-600" 
                  : "text-gray-500"
              )}>
                {item.badge}
              </span>
            )}
            {hasChildren && (
              <span className="flex-shrink-0 text-gray-400 ml-auto">
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
            )}
          </button>
        )}
        {hasChildren && isOpen && (
          <div className="mt-1 space-y-0.5 pl-1">
            {item.children!.map((child) => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm animate-fade-in touch-action-none"
          onClick={onClose}
          aria-label="사이드바 닫기"
        />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50",
          "w-72 lg:w-80 h-screen border-r border-gray-200 bg-white flex flex-col",
          "transition-transform duration-200 ease-in-out lg:translate-x-0",
          "will-change-transform gpu-accelerate",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* 로고 영역 */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4 md:px-5">
          <Link 
            href="/dashboard" 
            className="flex items-center group" 
            onClick={onClose}
            aria-label="대시보드로 이동"
          >
            <Image
              src="/whiplace-logo.svg"
              alt="/윕플."
              width={140}
              height={56}
              priority
              className="w-auto h-8 transition-opacity group-hover:opacity-80"
            />
          </Link>
          
          {/* 모바일 닫기 버튼 */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-all touch-target-minimum"
            aria-label="사이드바 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 p-3 overflow-y-auto overscroll-contain">
          <div className="space-y-1">
            {navigation.map((item) => renderNavItem(item))}
          </div>
        </nav>

        {/* 하단 정보 */}
        <div className="p-4 md:p-5 border-t border-gray-200">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              © 2026 
              <Image
                src="/favicon.ico"
                alt="favicon"
                width={14}
                height={14}
                className="inline-block"
              />
              <span className="font-millenial text-gray-600">/윕플.</span>
            </p>
            <p className="text-[10px] text-gray-400">Version 1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  )
}
