"use client"

/**
 * 알림 센터 페이지
 * 공지사항, 업데이트, 마케팅, 시스템 알림 통합 관리
 */
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'
import { 
  Bell, 
  Megaphone,
  Sparkles,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Check,
  CheckCheck,
  Settings,
  Loader2,
  X
} from 'lucide-react'
import { api } from '@/lib/config'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Notification {
  id: string
  type: 'announcement' | 'update' | 'marketing' | 'system'
  title: string
  content: string
  created_at: string
  read: boolean
  link?: string
}

const NOTIFICATION_TYPES = [
  { value: 'all', label: '전체', icon: Bell },
  { value: 'announcement', label: '공지사항', icon: Megaphone },
  { value: 'update', label: '업데이트', icon: Sparkles },
  { value: 'marketing', label: '마케팅', icon: TrendingUp },
  { value: 'system', label: '시스템', icon: AlertCircle },
]

export default function NotificationsPage() {
  const { user, getToken } = useAuth()
  const { toast } = useToast()
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [selectedType, setSelectedType] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)

  // 알림 로드
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) return
      
      try {
        const token = getToken()
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          // 백엔드 응답: { notifications: [], total_count, unread_count }
          const notificationsList = data.notifications || []
          // is_read를 read로 변환
          const formattedNotifications = notificationsList.map((n: any) => ({
            ...n,
            read: n.is_read
          }))
          setNotifications(formattedNotifications)
        } else {
          // Mock 데이터 (API 오류 시)
          const mockNotifications: Notification[] = [
            {
              id: '1',
              type: 'announcement',
              title: '설 연휴 고객센터 운영 안내',
              content: '2026년 설 연휴 기간(1/28~1/30) 동안 고객센터 운영이 일시 중단됩니다. 문의사항은 1:1 문의를 이용해주시면 순차적으로 답변드리겠습니다.',
              created_at: new Date().toISOString(),
              read: false,
            },
            {
              id: '2',
              type: 'update',
              title: '대표키워드 분석 기능 추가',
              content: '검색 키워드를 입력하면 상위 15개 매장의 대표 키워드를 자동으로 분석하는 기능이 추가되었습니다. 경쟁 매장의 키워드 전략을 한눈에 파악하세요!',
              created_at: new Date(Date.now() - 86400000).toISOString(),
              read: false,
              link: '/dashboard/naver/main-keywords'
            },
            {
              id: '3',
              type: 'system',
              title: '키워드 "강남카페" 순위 변동',
              content: '추적 중인 키워드 "강남카페"의 순위가 3위에서 5위로 하락했습니다. 경쟁 상황을 확인해보세요.',
              created_at: new Date(Date.now() - 172800000).toISOString(),
              read: true,
              link: '/dashboard/naver/metrics-tracker'
            },
            {
              id: '4',
              type: 'marketing',
              title: '🎉 신규 가입 이벤트 - 크레딧 100개 증정',
              content: '친구를 초대하고 크레딧 100개를 받으세요! 초대받은 친구도 50 크레딧을 받습니다. 이벤트 기간: 2026년 2월 한 달간',
              created_at: new Date(Date.now() - 259200000).toISOString(),
              read: true,
            },
            {
              id: '5',
              type: 'update',
              title: '모바일 UI 대폭 개선',
              content: '모바일 환경에서 더욱 편리하게 사용할 수 있도록 UI/UX를 전면 개선했습니다. 터치 타겟 크기 확대, 반응형 레이아웃 최적화 등이 적용되었습니다.',
              created_at: new Date(Date.now() - 345600000).toISOString(),
              read: true,
            },
            {
              id: '6',
              type: 'system',
              title: '월간 크레딧 리셋 안내',
              content: '2026년 2월 1일 00시에 월간 크레딧이 리셋되었습니다. 이번 달도 열심히 활용해보세요!',
              created_at: new Date(Date.now() - 432000000).toISOString(),
              read: true,
            },
          ]
          setNotifications(mockNotifications)
        }
      } catch (error) {
        console.error('알림 로드 실패:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadNotifications()
  }, [user, getToken])

  // 필터링
  useEffect(() => {
    if (selectedType === 'all') {
      setFilteredNotifications(notifications)
    } else {
      setFilteredNotifications(notifications.filter(n => n.type === selectedType))
    }
  }, [selectedType, notifications])

  // 알림 읽음 처리
  const markAsRead = async (notificationId: string) => {
    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        setNotifications(notifications.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        ))
      }
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error)
    }
  }

  // 모두 읽음 처리
  const markAllAsRead = async () => {
    setIsMarkingAllRead(true)
    
    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/read-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        setNotifications(notifications.map(n => ({ ...n, read: true })))
        toast({
          title: "✅ 완료",
          description: "모든 알림을 읽음 처리했습니다.",
        })
      } else {
        throw new Error('모두 읽음 처리 실패')
      }
    } catch (error) {
      console.error('모두 읽음 처리 오류:', error)
      toast({
        variant: "destructive",
        title: "❌ 실패",
        description: "모두 읽음 처리에 실패했습니다.",
      })
    } finally {
      setIsMarkingAllRead(false)
    }
  }

  // 알림 상세 보기
  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification)
    setShowDetailDialog(true)
    
    if (!notification.read) {
      markAsRead(notification.id)
    }
  }

  // 알림 삭제
  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        setNotifications(notifications.filter(n => n.id !== notificationId))
        toast({
          title: "✅ 삭제 완료",
          description: "알림이 삭제되었습니다.",
        })
      }
    } catch (error) {
      console.error('알림 삭제 실패:', error)
      toast({
        variant: "destructive",
        title: "❌ 삭제 실패",
        description: "알림 삭제에 실패했습니다.",
      })
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="w-5 h-5 text-blue-600" />
      case 'update':
        return <Sparkles className="w-5 h-5 text-purple-600" />
      case 'marketing':
        return <TrendingUp className="w-5 h-5 text-green-600" />
      case 'system':
        return <AlertCircle className="w-5 h-5 text-orange-600" />
    }
  }

  const getNotificationBadgeColor = (type: Notification['type']) => {
    switch (type) {
      case 'announcement':
        return 'bg-blue-100 text-blue-800'
      case 'update':
        return 'bg-purple-100 text-purple-800'
      case 'marketing':
        return 'bg-green-100 text-green-800'
      case 'system':
        return 'bg-orange-100 text-orange-800'
    }
  }

  const getNotificationTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'announcement':
        return '공지사항'
      case 'update':
        return '업데이트'
      case 'marketing':
        return '마케팅'
      case 'system':
        return '시스템'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (hours < 1) return '방금 전'
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      {/* 헤더 섹션 */}
      <header className="mb-8 md:mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="relative">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <Bell className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                {unreadCount}
              </div>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight">
            알림 센터
          </h1>
        </div>
        <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-3xl mx-auto">
          중요한 소식과 업데이트를 확인하세요
        </p>
        {unreadCount > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-full text-sm text-red-700 font-semibold">
            <Bell className="w-4 h-4" />
            읽지 않은 알림 {unreadCount}개
          </div>
        )}
      </header>

      <div className="space-y-6 md:space-y-8">
        {/* 필터 및 액션 */}
        <section>
          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            <div className="p-5 md:p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                {/* 필터 탭 */}
                <div className="flex flex-wrap gap-2">
                  {NOTIFICATION_TYPES.map((type) => {
                    const Icon = type.icon
                    const count = type.value === 'all' 
                      ? notifications.length 
                      : notifications.filter(n => n.type === type.value).length
                    
                    return (
                      <button
                        key={type.value}
                        onClick={() => setSelectedType(type.value)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                          selectedType === type.value
                            ? 'bg-red-500 text-white shadow-md'
                            : 'bg-gray-100 text-neutral-700 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {type.label}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          selectedType === type.value
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-200 text-neutral-700'
                        }`}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* 모두 읽음 처리 버튼 */}
                {unreadCount > 0 && (
                  <Button
                    onClick={markAllAsRead}
                    disabled={isMarkingAllRead}
                    variant="outline"
                    className="h-10 px-4 text-sm font-semibold whitespace-nowrap"
                  >
                    {isMarkingAllRead ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      <>
                        <CheckCheck className="w-4 h-4 mr-2" />
                        모두 읽음
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* 알림 목록 */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                </div>
              ) : filteredNotifications.length > 0 ? (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`relative group p-5 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                        notification.read
                          ? 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                          : 'bg-red-50/50 border-red-200 hover:border-red-300 hover:shadow-md'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {/* NEW 배지 */}
                      {!notification.read && (
                        <div className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                          NEW
                        </div>
                      )}

                      <div className="flex items-start gap-4 pr-12">
                        {/* 아이콘 */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          notification.read ? 'bg-gray-100' : 'bg-white'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* 내용 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getNotificationBadgeColor(notification.type)}`}>
                              {getNotificationTypeLabel(notification.type)}
                            </span>
                            <span className="text-xs text-neutral-500">
                              {formatDate(notification.created_at)}
                            </span>
                          </div>
                          
                          <h3 className="text-base font-bold text-neutral-900 mb-1 leading-tight">
                            {notification.title}
                          </h3>
                          
                          <p className="text-sm text-neutral-600 leading-relaxed line-clamp-2">
                            {notification.content}
                          </p>
                        </div>
                      </div>

                      {/* 삭제 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteNotification(notification.id)
                        }}
                        className="absolute top-3 right-12 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 hover:bg-red-100 rounded-lg"
                        title="삭제"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-10 h-10 text-red-500" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">
                    알림이 없습니다
                  </h3>
                  <p className="text-sm text-neutral-600">
                    {selectedType === 'all' 
                      ? '새로운 알림이 도착하면 여기에 표시됩니다.'
                      : `${NOTIFICATION_TYPES.find(t => t.value === selectedType)?.label} 알림이 없습니다.`
                    }
                  </p>
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>

      {/* 알림 상세 다이얼로그 - 지표 모달 스타일 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="w-[calc(100vw-32px)] sm:w-full sm:max-w-lg max-h-[calc(100vh-32px)] sm:max-h-[85vh] overflow-hidden bg-white border-2 border-neutral-200 shadow-modal rounded-modal flex flex-col p-0">
          {selectedNotification && (
            <>
              {/* 헤더 */}
              <DialogHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-3 border-b border-neutral-200 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 md:w-10 md:h-10 rounded-button flex items-center justify-center shadow-sm flex-shrink-0 ${
                    selectedNotification.type === 'announcement' ? 'bg-blue-500' :
                    selectedNotification.type === 'update' ? 'bg-purple-500' :
                    selectedNotification.type === 'marketing' ? 'bg-green-500' :
                    'bg-orange-500'
                  }`}>
                    {selectedNotification.type === 'announcement' && <Megaphone className="w-4 h-4 md:w-5 md:h-5 text-white" />}
                    {selectedNotification.type === 'update' && <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-white" />}
                    {selectedNotification.type === 'marketing' && <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-white" />}
                    {selectedNotification.type === 'system' && <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
                      {selectedNotification.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs md:text-sm text-neutral-500 mt-0.5 flex items-center gap-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] md:text-xs font-semibold ${getNotificationBadgeColor(selectedNotification.type)}`}>
                        {getNotificationTypeLabel(selectedNotification.type)}
                      </span>
                      <span>{formatDate(selectedNotification.created_at)}</span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              {/* 본문 */}
              <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
                <div className="bg-neutral-50 rounded-card p-4 md:p-5 border border-neutral-200">
                  <p className="text-sm md:text-base text-neutral-700 leading-relaxed whitespace-pre-wrap">
                    {selectedNotification.content}
                  </p>
                </div>
              </div>

              {/* 푸터 */}
              <div className="px-4 md:px-6 py-3 md:py-4 border-t border-neutral-200 flex-shrink-0">
                <div className="flex gap-2.5 justify-end">
                  <button
                    onClick={() => setShowDetailDialog(false)}
                    className="h-10 md:h-11 px-5 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 rounded-button transition-all duration-200 touch-manipulation"
                  >
                    닫기
                  </button>
                  {selectedNotification.link && (
                    <button
                      onClick={() => {
                        window.location.href = selectedNotification.link!
                      }}
                      className="h-10 md:h-11 px-5 text-sm font-semibold text-white bg-[#405D99] hover:bg-[#2E4577] active:bg-[#1A2B52] rounded-button shadow-sm hover:shadow-md transition-all duration-200 touch-manipulation"
                    >
                      자세히 보기
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
