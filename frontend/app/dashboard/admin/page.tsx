"use client"

/**
 * 관리자 페이지 (God Tier 전용)
 * - 알림 관리 (게시/수정/삭제)
 * - 1:1 문의 답변
 * - 회원 관리 (리스트, 필터링, 크레딧 지급)
 */
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { 
  Shield,
  Bell,
  MessageSquare,
  Users,
  Plus,
  Edit,
  Trash2,
  Send,
  Loader2,
  Search,
  Filter,
  Gift,
  Calendar,
  Mail,
  Crown,
  CreditCard,
  CheckCircle2,
  Clock,
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
  link?: string
}

interface Ticket {
  id: string
  user_id: string
  user_email: string
  created_at: string
  type: string
  title: string
  content: string
  status: 'pending' | 'answered' | 'closed'
  answer?: string
  answered_at?: string
}

interface UserInfo {
  id: string
  email: string
  display_name: string | null
  subscription_tier: string
  created_at: string
  last_login?: string
  total_credits_used?: number
  monthly_credits?: number
  manual_credits?: number
}

type TabType = 'notifications' | 'tickets' | 'users'

export default function AdminPage() {
  const { user, getToken } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<TabType>('notifications')
  const [isLoading, setIsLoading] = useState(true)
  const [userTier, setUserTier] = useState<string>('')
  
  // 알림 관리
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotificationDialog, setShowNotificationDialog] = useState(false)
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null)
  const [notificationForm, setNotificationForm] = useState({
    type: 'announcement' as Notification['type'],
    title: '',
    content: '',
    link: ''
  })
  const [isSavingNotification, setIsSavingNotification] = useState(false)
  
  // 문의 관리
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [answer, setAnswer] = useState('')
  const [isSendingAnswer, setIsSendingAnswer] = useState(false)
  
  // 회원 관리
  const [users, setUsers] = useState<UserInfo[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserInfo[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null)
  const [creditAmount, setCreditAmount] = useState(0)
  const [isGivingCredit, setIsGivingCredit] = useState(false)

  // God Tier 체크 및 초기 데이터 로드
  useEffect(() => {
    const checkTierAndLoad = async () => {
      if (!user) return
      
      try {
        const token = getToken()
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          const tier = data.subscription_tier?.toLowerCase()
          setUserTier(tier)
          
          if (tier !== 'god') {
            toast({
              variant: "destructive",
              title: "❌ 접근 거부",
              description: "관리자 페이지는 God Tier만 접근할 수 있습니다.",
            })
            router.push('/dashboard')
            return
          }
          
          // God Tier 확인 후 데이터 로드
          await loadAllData()
        }
      } catch (error) {
        console.error('Tier check failed:', error)
        router.push('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }
    
    checkTierAndLoad()
  }, [user, getToken, router, toast])

  const loadAllData = async () => {
    await Promise.all([
      loadNotifications(),
      loadTickets(),
      loadUsers()
    ])
  }

  // 알림 로드
  const loadNotifications = async () => {
    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        // 백엔드에서 배열을 직접 반환
        setNotifications(data)
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }

  // 문의 로드
  const loadTickets = async () => {
    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/tickets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        // 백엔드 응답: { tickets: [], total_count }
        setTickets(data.tickets || [])
      }
    } catch (error) {
      console.error('Failed to load tickets:', error)
    }
  }

  // 회원 로드
  const loadUsers = async () => {
    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        // 백엔드 응답: { users: [], total_count, page, page_size }
        const usersList = data.users || []
        setUsers(usersList)
        setFilteredUsers(usersList)
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  // 회원 필터링
  useEffect(() => {
    let filtered = users

    if (searchQuery) {
      filtered = filtered.filter(u => 
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (tierFilter !== 'all') {
      filtered = filtered.filter(u => u.subscription_tier === tierFilter)
    }

    setFilteredUsers(filtered)
  }, [searchQuery, tierFilter, users])

  // 알림 저장 (생성/수정)
  const handleSaveNotification = async () => {
    if (!notificationForm.title || !notificationForm.content) {
      toast({
        variant: "destructive",
        title: "❌ 입력 오류",
        description: "제목과 내용을 모두 입력해주세요.",
      })
      return
    }

    setIsSavingNotification(true)

    try {
      const token = getToken()
      const url = editingNotification
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/notifications/${editingNotification.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/notifications`
      
      const response = await fetch(url, {
        method: editingNotification ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(notificationForm)
      })

      if (response.ok) {
        toast({
          title: "✅ 저장 완료",
          description: `알림이 ${editingNotification ? '수정' : '생성'}되었습니다.`,
        })
        setShowNotificationDialog(false)
        setEditingNotification(null)
        setNotificationForm({ type: 'announcement', title: '', content: '', link: '' })
        await loadNotifications()
      } else {
        throw new Error('Failed to save notification')
      }
    } catch (error) {
      console.error('Save notification error:', error)
      toast({
        variant: "destructive",
        title: "❌ 저장 실패",
        description: "알림 저장에 실패했습니다.",
      })
    } finally {
      setIsSavingNotification(false)
    }
  }

  // 알림 삭제
  const handleDeleteNotification = async (id: string) => {
    if (!confirm('정말로 이 알림을 삭제하시겠습니까?')) return

    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        toast({
          title: "✅ 삭제 완료",
          description: "알림이 삭제되었습니다.",
        })
        await loadNotifications()
      }
    } catch (error) {
      console.error('Delete notification error:', error)
      toast({
        variant: "destructive",
        title: "❌ 삭제 실패",
        description: "알림 삭제에 실패했습니다.",
      })
    }
  }

  // 문의 답변
  const handleSendAnswer = async () => {
    if (!selectedTicket || !answer) {
      toast({
        variant: "destructive",
        title: "❌ 입력 오류",
        description: "답변 내용을 입력해주세요.",
      })
      return
    }

    setIsSendingAnswer(true)

    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/tickets/${selectedTicket.id}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answer })
      })

      if (response.ok) {
        toast({
          title: "✅ 답변 전송 완료",
          description: "답변이 전송되었습니다.",
        })
        setSelectedTicket(null)
        setAnswer('')
        await loadTickets()
      } else {
        throw new Error('Failed to send answer')
      }
    } catch (error) {
      console.error('Send answer error:', error)
      toast({
        variant: "destructive",
        title: "❌ 전송 실패",
        description: "답변 전송에 실패했습니다.",
      })
    } finally {
      setIsSendingAnswer(false)
    }
  }

  // 크레딧 지급
  const handleGiveCredit = async () => {
    if (!selectedUser || creditAmount <= 0) {
      toast({
        variant: "destructive",
        title: "❌ 입력 오류",
        description: "사용자를 선택하고 크레딧 양을 입력해주세요.",
      })
      return
    }

    setIsGivingCredit(true)

    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users/${selectedUser.id}/grant-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          credit_amount: creditAmount,
          admin_note: `관리자 지급 - ${creditAmount} 크레딧`
        })
      })

      if (response.ok) {
        toast({
          title: "✅ 크레딧 지급 완료",
          description: `${selectedUser.email}에게 ${creditAmount} 크레딧을 지급했습니다.`,
        })
        setSelectedUser(null)
        setCreditAmount(0)
        await loadUsers()
      } else {
        throw new Error('Failed to give credit')
      }
    } catch (error) {
      console.error('Give credit error:', error)
      toast({
        variant: "destructive",
        title: "❌ 지급 실패",
        description: "크레딧 지급에 실패했습니다.",
      })
    } finally {
      setIsGivingCredit(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTierBadge = (tier: string) => {
    const config: Record<string, { label: string; color: string }> = {
      free: { label: 'Free', color: 'bg-gray-500' },
      basic: { label: 'Basic', color: 'bg-blue-500' },
      basic_plus: { label: 'Basic+', color: 'bg-purple-500' },
      pro: { label: 'Pro', color: 'bg-yellow-500' },
      god: { label: 'GOD', color: 'bg-red-500' }
    }
    const { label, color } = config[tier] || config.free
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 ${color} text-white rounded text-xs font-bold`}>
        <Crown className="w-3 h-3" />
        {label}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-red-500" />
      </div>
    )
  }

  if (userTier !== 'god') {
    return null
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      {/* 헤더 */}
      <header className="mb-8 md:mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight">
              관리자 페이지
            </h1>
            <p className="text-sm md:text-base text-red-600 font-semibold">
              🛡️ God Tier 전용
            </p>
          </div>
        </div>
      </header>

      {/* 탭 */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 border-b-2 border-gray-200">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors ${
              activeTab === 'notifications'
                ? 'text-red-600 border-b-4 border-red-600 -mb-0.5'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bell className="w-5 h-5" />
            알림 관리
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors ${
              activeTab === 'tickets'
                ? 'text-red-600 border-b-4 border-red-600 -mb-0.5'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            문의 관리
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors ${
              activeTab === 'users'
                ? 'text-red-600 border-b-4 border-red-600 -mb-0.5'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-5 h-5" />
            회원 관리
          </button>
        </div>
      </div>

      {/* 탭 내용 */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-neutral-900">알림 관리</h2>
            <Button
              onClick={() => {
                setEditingNotification(null)
                setNotificationForm({ type: 'announcement', title: '', content: '', link: '' })
                setShowNotificationDialog(true)
              }}
              className="h-12 px-6"
            >
              <Plus className="w-5 h-5 mr-2" />
              새 알림 작성
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {notifications.map((notification) => (
              <Card key={notification.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        notification.type === 'announcement' ? 'bg-blue-100 text-blue-800' :
                        notification.type === 'update' ? 'bg-purple-100 text-purple-800' :
                        notification.type === 'marketing' ? 'bg-green-100 text-green-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {notification.type}
                      </span>
                      <span className="text-sm text-gray-500">{formatDate(notification.created_at)}</span>
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-2">{notification.title}</h3>
                    <p className="text-sm text-neutral-600">{notification.content}</p>
                    {notification.link && (
                      <p className="text-xs text-blue-600 mt-2">링크: {notification.link}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingNotification(notification)
                        setNotificationForm({
                          type: notification.type,
                          title: notification.title,
                          content: notification.content,
                          link: notification.link || ''
                        })
                        setShowNotificationDialog(true)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteNotification(notification.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-neutral-900">문의 관리</h2>

          <div className="grid grid-cols-1 gap-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        ticket.status === 'answered' ? 'bg-green-100 text-green-800' :
                        ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.status === 'answered' ? '답변완료' : ticket.status === 'pending' ? '대기중' : '종료'}
                      </span>
                      <span className="text-sm text-gray-500">{formatDate(ticket.created_at)}</span>
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900 mb-1">[{ticket.type}] {ticket.title}</h3>
                    <p className="text-sm text-neutral-600 mb-2">{ticket.content}</p>
                    <p className="text-xs text-gray-500">작성자: {ticket.user_email}</p>
                  </div>
                  {ticket.status === 'pending' && (
                    <Button
                      onClick={() => setSelectedTicket(ticket)}
                      className="ml-4"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      답변하기
                    </Button>
                  )}
                </div>
                {ticket.answer && (
                  <div className="mt-4 pt-4 border-t-2 border-gray-100 bg-blue-50 p-4 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">관리자 답변</span>
                      {ticket.answered_at && (
                        <span className="text-xs text-gray-500">{formatDate(ticket.answered_at)}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{ticket.answer}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-neutral-900">회원 관리</h2>

          {/* 필터 */}
          <Card className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="이메일 또는 이름으로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="h-10 px-4 border-2 border-gray-300 rounded-lg"
                >
                  <option value="all">전체 Tier</option>
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="basic_plus">Basic+</option>
                  <option value="pro">Pro</option>
                  <option value="god">GOD</option>
                </select>
              </div>
            </div>
          </Card>

          {/* 회원 리스트 */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">이메일</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">이름</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Tier</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">가입일</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">크레딧</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-t hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">{user.email}</td>
                      <td className="py-3 px-4 text-sm">{user.display_name || '-'}</td>
                      <td className="py-3 px-4 text-center">{getTierBadge(user.subscription_tier)}</td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {new Date(user.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="py-3 px-4 text-center text-sm">
                        {user.monthly_credits !== undefined ? (
                          <span className="font-semibold">{user.monthly_credits + (user.manual_credits || 0)}</span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Gift className="w-4 h-4 mr-1" />
                          크레딧 지급
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 알림 생성/수정 다이얼로그 */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingNotification ? '알림 수정' : '새 알림 작성'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>유형</Label>
              <select
                value={notificationForm.type}
                onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value as Notification['type'] })}
                className="w-full h-10 px-3 mt-1 border-2 border-gray-300 rounded-lg"
              >
                <option value="announcement">공지사항</option>
                <option value="update">업데이트</option>
                <option value="marketing">마케팅</option>
                <option value="system">시스템</option>
              </select>
            </div>

            <div>
              <Label>제목</Label>
              <Input
                value={notificationForm.title}
                onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                placeholder="알림 제목"
                className="mt-1"
              />
            </div>

            <div>
              <Label>내용</Label>
              <Textarea
                value={notificationForm.content}
                onChange={(e) => setNotificationForm({ ...notificationForm, content: e.target.value })}
                placeholder="알림 내용"
                rows={6}
                className="mt-1"
              />
            </div>

            <div>
              <Label>링크 (선택)</Label>
              <Input
                value={notificationForm.link}
                onChange={(e) => setNotificationForm({ ...notificationForm, link: e.target.value })}
                placeholder="/dashboard/..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNotificationDialog(false)
                setEditingNotification(null)
              }}
              disabled={isSavingNotification}
            >
              취소
            </Button>
            <Button
              onClick={handleSaveNotification}
              disabled={isSavingNotification}
            >
              {isSavingNotification ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 문의 답변 다이얼로그 */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent>
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle>문의 답변</DialogTitle>
                <DialogDescription>
                  {selectedTicket.user_email}의 문의에 답변합니다
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="p-4 bg-gray-50 rounded">
                  <h4 className="font-semibold text-sm mb-2">{selectedTicket.title}</h4>
                  <p className="text-sm text-gray-700">{selectedTicket.content}</p>
                </div>

                <div>
                  <Label>답변</Label>
                  <Textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="답변 내용을 입력하세요..."
                    rows={8}
                    className="mt-1"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTicket(null)
                    setAnswer('')
                  }}
                  disabled={isSendingAnswer}
                >
                  취소
                </Button>
                <Button
                  onClick={handleSendAnswer}
                  disabled={isSendingAnswer}
                >
                  {isSendingAnswer ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      전송 중...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      답변 전송
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 크레딧 지급 다이얼로그 */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle>크레딧 지급</DialogTitle>
                <DialogDescription>
                  {selectedUser.email}에게 크레딧을 지급합니다
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <Label>크레딧 양</Label>
                <Input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                  placeholder="100"
                  className="mt-1"
                  min="1"
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(null)
                    setCreditAmount(0)
                  }}
                  disabled={isGivingCredit}
                >
                  취소
                </Button>
                <Button
                  onClick={handleGiveCredit}
                  disabled={isGivingCredit}
                >
                  {isGivingCredit ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      지급 중...
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4 mr-2" />
                      지급
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
