"use client"

/**
 * 관리자 페이지 (God Tier 전용)
 * - 알림 관리 (게시/수정/삭제)
 * - 1:1 문의 답변
 * - 회원 관리 (리스트, 필터링, 크레딧 지급, 결제일 표시)
 * - 쿠폰 관리 (생성/수정/삭제/활성화·비활성화)
 */
import { useState, useEffect, useCallback } from 'react'
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
  Gift,
  Calendar,
  Crown,
  CheckCircle2,
  X,
  Tag,
  ToggleLeft,
  ToggleRight,
  Copy,
  Percent,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  CalendarClock,
  CreditCard,
  Ban
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
  monthly_credits?: number
  manual_credits?: number
  monthly_used?: number
  total_remaining?: number
  total_credits_used?: number
  // 구독/결제 관련 필드
  subscription_status?: string
  next_billing_date?: string
  last_payment_date?: string
  service_end_date?: string
  cancelled_at?: string
  auto_renewal?: boolean
}

interface CouponInfo {
  id: string
  code: string
  name: string
  description?: string
  discount_type: string
  discount_value: number
  applicable_tiers?: string[]
  max_uses?: number
  current_uses: number
  max_uses_per_user: number
  is_active: boolean
  is_permanent: boolean
  duration_months?: number
  valid_from?: string
  valid_until?: string
  created_at: string
  updated_at: string
}

type TabType = 'notifications' | 'tickets' | 'users' | 'coupons'

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

  // 쿠폰 관리
  const [coupons, setCoupons] = useState<CouponInfo[]>([])
  const [showCouponDialog, setShowCouponDialog] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<CouponInfo | null>(null)
  const [couponForm, setCouponForm] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 10,
    applicable_tiers: ['basic', 'basic_plus', 'pro'] as string[],
    max_uses: undefined as number | undefined,
    max_uses_per_user: 1,
    is_permanent: true,
    duration_months: undefined as number | undefined,
    valid_until: '',
  })
  const [isSavingCoupon, setIsSavingCoupon] = useState(false)
  const [showInactiveCoupons, setShowInactiveCoupons] = useState(false)
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [generateCount, setGenerateCount] = useState(5)
  const [generatePrefix, setGeneratePrefix] = useState('')

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
      loadUsers(),
      loadCoupons()
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
        const usersList = data.users || []
        setUsers(usersList)
        setFilteredUsers(usersList)
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  // 쿠폰 로드
  const loadCoupons = async () => {
    try {
      const token = getToken()
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/coupons/admin/list?include_inactive=${showInactiveCoupons}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        setCoupons(data.coupons || [])
      }
    } catch (error) {
      console.error('Failed to load coupons:', error)
    }
  }

  // 쿠폰 로드 (비활성 포함 여부 변경 시 다시 로드)
  useEffect(() => {
    if (userTier === 'god') {
      loadCoupons()
    }
  }, [showInactiveCoupons, userTier])

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

  // ============================================
  // 쿠폰 관리 함수들
  // ============================================

  const resetCouponForm = () => {
    setCouponForm({
      code: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 10,
      applicable_tiers: ['basic', 'basic_plus', 'pro'],
      max_uses: undefined,
      max_uses_per_user: 1,
      is_permanent: true,
      duration_months: undefined,
      valid_until: '',
    })
    setEditingCoupon(null)
  }

  // 쿠폰 생성
  const handleSaveCoupon = async () => {
    if (!couponForm.name) {
      toast({ variant: "destructive", title: "❌ 입력 오류", description: "쿠폰 이름을 입력해주세요." })
      return
    }
    if (couponForm.discount_value <= 0) {
      toast({ variant: "destructive", title: "❌ 입력 오류", description: "할인 값을 입력해주세요." })
      return
    }
    if (couponForm.discount_type === 'percentage' && couponForm.discount_value > 100) {
      toast({ variant: "destructive", title: "❌ 입력 오류", description: "할인율은 100%를 초과할 수 없습니다." })
      return
    }

    setIsSavingCoupon(true)

    try {
      const token = getToken()

      if (editingCoupon) {
        // 수정
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/coupons/admin/${editingCoupon.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            name: couponForm.name,
            description: couponForm.description || null,
            discount_value: couponForm.discount_value,
            max_uses: couponForm.max_uses || null,
            valid_until: couponForm.valid_until ? new Date(couponForm.valid_until).toISOString() : null,
          })
        })

        if (response.ok) {
          toast({ title: "✅ 수정 완료", description: "쿠폰이 수정되었습니다." })
        } else {
          const err = await response.json()
          throw new Error(err.detail || '수정 실패')
        }
      } else {
        // 생성
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/coupons/admin/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            code: couponForm.code || null,
            name: couponForm.name,
            description: couponForm.description || null,
            discount_type: couponForm.discount_type,
            discount_value: couponForm.discount_value,
            applicable_tiers: couponForm.applicable_tiers,
            max_uses: couponForm.max_uses || null,
            max_uses_per_user: couponForm.max_uses_per_user,
            is_permanent: couponForm.is_permanent,
            duration_months: couponForm.is_permanent ? null : couponForm.duration_months,
            valid_until: couponForm.valid_until ? new Date(couponForm.valid_until).toISOString() : null,
          })
        })

        if (response.ok) {
          toast({ title: "✅ 생성 완료", description: "쿠폰이 생성되었습니다." })
        } else {
          const err = await response.json()
          throw new Error(err.detail || '생성 실패')
        }
      }

      setShowCouponDialog(false)
      resetCouponForm()
      await loadCoupons()
    } catch (error: any) {
      console.error('Save coupon error:', error)
      toast({
        variant: "destructive",
        title: "❌ 저장 실패",
        description: error.message || "쿠폰 저장에 실패했습니다.",
      })
    } finally {
      setIsSavingCoupon(false)
    }
  }

  // 쿠폰 토글
  const handleToggleCoupon = async (couponId: string) => {
    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/coupons/admin/${couponId}/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: data.is_active ? "✅ 활성화" : "⏸️ 비활성화",
          description: `쿠폰이 ${data.is_active ? '활성화' : '비활성화'}되었습니다.`,
        })
        await loadCoupons()
      }
    } catch (error) {
      console.error('Toggle coupon error:', error)
      toast({ variant: "destructive", title: "❌ 토글 실패", description: "쿠폰 상태 변경에 실패했습니다." })
    }
  }

  // 쿠폰 삭제
  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm('정말로 이 쿠폰을 삭제하시겠습니까? 이미 적용된 쿠폰에는 영향이 없습니다.')) return

    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/coupons/admin/${couponId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        toast({ title: "✅ 삭제 완료", description: "쿠폰이 삭제되었습니다." })
        await loadCoupons()
      }
    } catch (error) {
      console.error('Delete coupon error:', error)
      toast({ variant: "destructive", title: "❌ 삭제 실패", description: "쿠폰 삭제에 실패했습니다." })
    }
  }

  // 쿠폰 코드 생성
  const handleGenerateCodes = async () => {
    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/coupons/admin/generate-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          count: generateCount,
          prefix: generatePrefix || null,
        })
      })

      if (response.ok) {
        const data = await response.json()
        setGeneratedCodes(data.codes || [])
        toast({ title: "✅ 코드 생성 완료", description: `${data.codes?.length || 0}개의 코드가 생성되었습니다.` })
      }
    } catch (error) {
      console.error('Generate codes error:', error)
      toast({ variant: "destructive", title: "❌ 생성 실패", description: "코드 생성에 실패했습니다." })
    }
  }

  // 클립보드 복사
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "📋 복사 완료", description: "클립보드에 복사되었습니다." })
  }

  // ============================================
  // 유틸리티 함수
  // ============================================

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

  const formatShortDate = (dateString?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const getTierBadge = (tier: string) => {
    const config: Record<string, { label: string; color: string }> = {
      free: { label: 'Free', color: 'bg-gray-500' },
      basic: { label: 'Basic', color: 'bg-blue-500' },
      basic_plus: { label: 'Basic+', color: 'bg-purple-500' },
      pro: { label: 'Pro', color: 'bg-yellow-500' },
      custom: { label: 'Custom', color: 'bg-violet-500' },
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

  const getSubscriptionStatusBadge = (user: UserInfo) => {
    if (user.subscription_tier === 'free') {
      return <span className="text-xs text-gray-400">무료</span>
    }
    if (user.subscription_status === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
          <Ban className="w-3 h-3" />
          취소됨
        </span>
      )
    }
    if (user.subscription_status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
          <CheckCircle2 className="w-3 h-3" />
          활성
        </span>
      )
    }
    return <span className="text-xs text-gray-400">-</span>
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
        <div className="flex flex-wrap gap-2 border-b-2 border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-4 md:px-6 py-3 font-semibold transition-colors whitespace-nowrap ${
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
            className={`flex items-center gap-2 px-4 md:px-6 py-3 font-semibold transition-colors whitespace-nowrap ${
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
            className={`flex items-center gap-2 px-4 md:px-6 py-3 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'users'
                ? 'text-red-600 border-b-4 border-red-600 -mb-0.5'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-5 h-5" />
            회원 관리
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-2 px-4 md:px-6 py-3 font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'coupons'
                ? 'text-red-600 border-b-4 border-red-600 -mb-0.5'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Tag className="w-5 h-5" />
            쿠폰 관리
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* 알림 관리 탭 */}
      {/* ============================================ */}
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

      {/* ============================================ */}
      {/* 문의 관리 탭 */}
      {/* ============================================ */}
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

      {/* ============================================ */}
      {/* 회원 관리 탭 (결제일/서비스종료일 표시 추가) */}
      {/* ============================================ */}
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
              <table className="w-full min-w-[1400px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">이메일</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">이름</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Tier</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">구독상태</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">가입일</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-green-700">
                      <div className="flex items-center justify-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" />
                        최근 결제일
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-[#405D99]">
                      <div className="flex items-center justify-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5" />
                        다음 결제일
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-red-600">
                      <div className="flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        서비스 종료일
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-blue-700">월간</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-purple-700">수동</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-red-700">사용</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-green-700">잔여</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-t hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">{u.email}</td>
                      <td className="py-3 px-4 text-sm">{u.display_name || '-'}</td>
                      <td className="py-3 px-4 text-center">{getTierBadge(u.subscription_tier)}</td>
                      <td className="py-3 px-4 text-center">{getSubscriptionStatusBadge(u)}</td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {new Date(u.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      {/* 최근 결제일 */}
                      <td className="py-3 px-4 text-center text-sm">
                        {u.subscription_tier !== 'free' && u.last_payment_date ? (
                          <span className="font-semibold text-green-700">
                            {formatShortDate(u.last_payment_date)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {/* 다음 결제 예정일 */}
                      <td className="py-3 px-4 text-center text-sm">
                        {u.subscription_tier !== 'free' && u.next_billing_date ? (
                          <span className="font-semibold text-[#405D99]">
                            {formatShortDate(u.next_billing_date)}
                          </span>
                        ) : u.subscription_tier === 'free' ? (
                          <span className="text-gray-400 text-xs">무료</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {/* 서비스 종료일 */}
                      <td className="py-3 px-4 text-center text-sm">
                        {u.service_end_date ? (
                          <span className="font-semibold text-red-600">
                            {formatShortDate(u.service_end_date)}
                          </span>
                        ) : u.subscription_status === 'cancelled' && u.cancelled_at ? (
                          <span className="text-orange-500 text-xs">취소처리중</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-sm">
                        <span className="font-semibold text-blue-600">
                          {u.monthly_credits !== undefined ? u.monthly_credits.toLocaleString() : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-sm">
                        <span className="font-semibold text-purple-600">
                          {u.manual_credits !== undefined ? u.manual_credits.toLocaleString() : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-sm">
                        <span className="font-semibold text-red-600">
                          {u.monthly_used !== undefined ? u.monthly_used.toLocaleString() : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-sm">
                        <span className="font-semibold text-green-600">
                          {u.total_remaining !== undefined ? u.total_remaining.toLocaleString() : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedUser(u)}
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

      {/* ============================================ */}
      {/* 쿠폰 관리 탭 */}
      {/* ============================================ */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold text-neutral-900">쿠폰 관리</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setShowGenerateDialog(true)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                코드 생성
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowInactiveCoupons(!showInactiveCoupons)}
              >
                {showInactiveCoupons ? (
                  <><ToggleRight className="w-4 h-4 mr-2" />비활성 포함</>
                ) : (
                  <><ToggleLeft className="w-4 h-4 mr-2" />활성만</>
                )}
              </Button>
              <Button
                onClick={() => {
                  resetCouponForm()
                  setShowCouponDialog(true)
                }}
              >
                <Plus className="w-5 h-5 mr-2" />
                새 쿠폰 만들기
              </Button>
            </div>
          </div>

          {/* 쿠폰 통계 요약 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-gray-500 mb-1">전체 쿠폰</p>
              <p className="text-2xl font-bold text-neutral-900">{coupons.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-500 mb-1">활성 쿠폰</p>
              <p className="text-2xl font-bold text-green-600">{coupons.filter(c => c.is_active).length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-500 mb-1">총 사용 횟수</p>
              <p className="text-2xl font-bold text-blue-600">{coupons.reduce((acc, c) => acc + c.current_uses, 0)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-500 mb-1">정률 할인</p>
              <p className="text-2xl font-bold text-purple-600">{coupons.filter(c => c.discount_type === 'percentage').length}</p>
            </Card>
          </div>

          {/* 쿠폰 리스트 */}
          <div className="grid grid-cols-1 gap-4">
            {coupons.length === 0 ? (
              <Card className="p-8 text-center">
                <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 text-lg">등록된 쿠폰이 없습니다.</p>
                <p className="text-gray-400 text-sm mt-1">새 쿠폰을 만들어보세요.</p>
              </Card>
            ) : (
              coupons.map((coupon) => (
                <Card 
                  key={coupon.id} 
                  className={`p-6 transition-all ${!coupon.is_active ? 'opacity-60 bg-gray-50' : ''}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* 쿠폰 정보 */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {/* 쿠폰 코드 */}
                        <button
                          onClick={() => copyToClipboard(coupon.code)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg font-mono text-sm font-bold text-neutral-800 transition-colors"
                          title="클릭하여 복사"
                        >
                          {coupon.code}
                          <Copy className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        
                        {/* 활성/비활성 뱃지 */}
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          coupon.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {coupon.is_active ? '활성' : '비활성'}
                        </span>

                        {/* 할인 타입 뱃지 */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                          {coupon.discount_type === 'percentage' ? (
                            <><Percent className="w-3 h-3" />{coupon.discount_value}%</>
                          ) : (
                            <><DollarSign className="w-3 h-3" />{coupon.discount_value.toLocaleString()}원</>
                          )}
                        </span>

                        {/* 영구/기간 뱃지 */}
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          coupon.is_permanent ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {coupon.is_permanent ? '영구' : `${coupon.duration_months || '?'}개월`}
                        </span>
                      </div>

                      {/* 쿠폰 이름/설명 */}
                      <h3 className="text-base font-bold text-neutral-900 mb-1">{coupon.name}</h3>
                      {coupon.description && (
                        <p className="text-sm text-gray-500 mb-2">{coupon.description}</p>
                      )}

                      {/* 상세 정보 */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>사용: {coupon.current_uses}{coupon.max_uses ? `/${coupon.max_uses}` : '/∞'}</span>
                        <span>사용자당: {coupon.max_uses_per_user}회</span>
                        {coupon.applicable_tiers && coupon.applicable_tiers.length > 0 && (
                          <span>적용: {coupon.applicable_tiers.join(', ')}</span>
                        )}
                        {coupon.valid_until && (
                          <span>만료: {formatShortDate(coupon.valid_until)}</span>
                        )}
                        <span>생성: {formatShortDate(coupon.created_at)}</span>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleCoupon(coupon.id)}
                        title={coupon.is_active ? '비활성화' : '활성화'}
                      >
                        {coupon.is_active ? (
                          <ToggleRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCoupon(coupon)
                          setCouponForm({
                            code: coupon.code,
                            name: coupon.name,
                            description: coupon.description || '',
                            discount_type: coupon.discount_type as 'percentage' | 'fixed',
                            discount_value: coupon.discount_value,
                            applicable_tiers: coupon.applicable_tiers || ['basic', 'basic_plus', 'pro'],
                            max_uses: coupon.max_uses || undefined,
                            max_uses_per_user: coupon.max_uses_per_user,
                            is_permanent: coupon.is_permanent,
                            duration_months: coupon.duration_months || undefined,
                            valid_until: coupon.valid_until ? new Date(coupon.valid_until).toISOString().slice(0, 10) : '',
                          })
                          setShowCouponDialog(true)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCoupon(coupon.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* 알림 생성/수정 다이얼로그 */}
      {/* ============================================ */}
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

      {/* ============================================ */}
      {/* 문의 답변 다이얼로그 */}
      {/* ============================================ */}
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

      {/* ============================================ */}
      {/* 크레딧 지급 다이얼로그 */}
      {/* ============================================ */}
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

      {/* ============================================ */}
      {/* 쿠폰 생성/수정 다이얼로그 */}
      {/* ============================================ */}
      <Dialog open={showCouponDialog} onOpenChange={(open) => {
        setShowCouponDialog(open)
        if (!open) resetCouponForm()
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? '쿠폰 수정' : '새 쿠폰 만들기'}
            </DialogTitle>
            <DialogDescription>
              {editingCoupon 
                ? '쿠폰 정보를 수정합니다. 할인 유형과 코드는 변경할 수 없습니다.' 
                : '새로운 할인 쿠폰을 생성합니다.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* 쿠폰 코드 */}
            {!editingCoupon && (
              <div>
                <Label>쿠폰 코드 <span className="text-gray-400 font-normal">(미입력 시 자동 생성)</span></Label>
                <Input
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  placeholder="예: WELCOME-2024"
                  className="mt-1 font-mono"
                  maxLength={30}
                />
              </div>
            )}

            {/* 쿠폰 이름 */}
            <div>
              <Label>쿠폰 이름 <span className="text-red-500">*</span></Label>
              <Input
                value={couponForm.name}
                onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })}
                placeholder="예: 첫 결제 50% 할인"
                className="mt-1"
              />
            </div>

            {/* 설명 */}
            <div>
              <Label>설명 (선택)</Label>
              <Textarea
                value={couponForm.description}
                onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                placeholder="쿠폰에 대한 설명..."
                rows={2}
                className="mt-1"
              />
            </div>

            {/* 할인 유형 & 값 */}
            {!editingCoupon && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>할인 유형</Label>
                  <select
                    value={couponForm.discount_type}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full h-10 px-3 mt-1 border-2 border-gray-300 rounded-lg"
                  >
                    <option value="percentage">정률 할인 (%)</option>
                    <option value="fixed">정액 할인 (원)</option>
                  </select>
                </div>
                <div>
                  <Label>할인 값 <span className="text-red-500">*</span></Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      value={couponForm.discount_value}
                      onChange={(e) => setCouponForm({ ...couponForm, discount_value: parseInt(e.target.value) || 0 })}
                      min="1"
                      max={couponForm.discount_type === 'percentage' ? 100 : 1000000}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      {couponForm.discount_type === 'percentage' ? '%' : '원'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {editingCoupon && (
              <div>
                <Label>할인 값</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    value={couponForm.discount_value}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_value: parseInt(e.target.value) || 0 })}
                    min="1"
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {couponForm.discount_type === 'percentage' ? '%' : '원'}
                  </span>
                </div>
              </div>
            )}

            {/* 할인 기간 */}
            {!editingCoupon && (
              <div>
                <Label>할인 적용 기간</Label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={couponForm.is_permanent}
                      onChange={() => setCouponForm({ ...couponForm, is_permanent: true, duration_months: undefined })}
                      className="w-4 h-4 text-[#405D99]"
                    />
                    <span className="text-sm">영구 할인</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!couponForm.is_permanent}
                      onChange={() => setCouponForm({ ...couponForm, is_permanent: false, duration_months: 1 })}
                      className="w-4 h-4 text-[#405D99]"
                    />
                    <span className="text-sm">기간 한정</span>
                  </label>
                </div>
                {!couponForm.is_permanent && (
                  <div className="mt-2">
                    <Input
                      type="number"
                      value={couponForm.duration_months || ''}
                      onChange={(e) => setCouponForm({ ...couponForm, duration_months: parseInt(e.target.value) || undefined })}
                      placeholder="적용 개월 수"
                      min="1"
                      max="36"
                    />
                    <p className="text-xs text-gray-400 mt-1">쿠폰 적용 후 해당 기간 동안만 할인</p>
                  </div>
                )}
              </div>
            )}

            {/* 적용 가능 Tier */}
            {!editingCoupon && (
              <div>
                <Label>적용 가능 요금제</Label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {['basic', 'basic_plus', 'pro'].map((tier) => (
                    <label key={tier} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={couponForm.applicable_tiers.includes(tier)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCouponForm({ ...couponForm, applicable_tiers: [...couponForm.applicable_tiers, tier] })
                          } else {
                            setCouponForm({ ...couponForm, applicable_tiers: couponForm.applicable_tiers.filter(t => t !== tier) })
                          }
                        }}
                        className="w-4 h-4 rounded text-[#405D99]"
                      />
                      <span className="text-sm">{tier === 'basic' ? 'Basic' : tier === 'basic_plus' ? 'Basic+' : 'Pro'}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 사용 제한 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>총 사용 가능 횟수 <span className="text-gray-400 font-normal">(미입력 시 무제한)</span></Label>
                <Input
                  type="number"
                  value={couponForm.max_uses || ''}
                  onChange={(e) => setCouponForm({ ...couponForm, max_uses: parseInt(e.target.value) || undefined })}
                  placeholder="무제한"
                  min="1"
                  className="mt-1"
                />
              </div>
              {!editingCoupon && (
                <div>
                  <Label>사용자당 사용 횟수</Label>
                  <Input
                    type="number"
                    value={couponForm.max_uses_per_user}
                    onChange={(e) => setCouponForm({ ...couponForm, max_uses_per_user: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            {/* 유효기간 */}
            <div>
              <Label>유효 만료일 <span className="text-gray-400 font-normal">(미입력 시 무제한)</span></Label>
              <Input
                type="date"
                value={couponForm.valid_until}
                onChange={(e) => setCouponForm({ ...couponForm, valid_until: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCouponDialog(false)
                resetCouponForm()
              }}
              disabled={isSavingCoupon}
            >
              취소
            </Button>
            <Button
              onClick={handleSaveCoupon}
              disabled={isSavingCoupon}
            >
              {isSavingCoupon ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                editingCoupon ? '수정' : '생성'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* 쿠폰 코드 생성 다이얼로그 */}
      {/* ============================================ */}
      <Dialog open={showGenerateDialog} onOpenChange={(open) => {
        setShowGenerateDialog(open)
        if (!open) {
          setGeneratedCodes([])
          setGeneratePrefix('')
          setGenerateCount(5)
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>쿠폰 코드 생성</DialogTitle>
            <DialogDescription>
              랜덤 쿠폰 코드를 생성합니다. 코드만 생성되며, 쿠폰은 별도로 만들어야 합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>생성 수량</Label>
                <Input
                  type="number"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(Math.min(100, parseInt(e.target.value) || 1))}
                  min="1"
                  max="100"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>접두사 (선택)</Label>
                <Input
                  value={generatePrefix}
                  onChange={(e) => setGeneratePrefix(e.target.value.toUpperCase())}
                  placeholder="예: PROMO"
                  className="mt-1"
                  maxLength={10}
                />
              </div>
            </div>

            <Button onClick={handleGenerateCodes} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              코드 생성
            </Button>

            {generatedCodes.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>생성된 코드 ({generatedCodes.length}개)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedCodes.join('\n'))}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    전체 복사
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto bg-gray-50 rounded-lg p-3 space-y-1">
                  {generatedCodes.map((code, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 px-2 hover:bg-gray-100 rounded">
                      <span className="font-mono text-sm">{code}</span>
                      <button 
                        onClick={() => copyToClipboard(code)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowGenerateDialog(false)
                setGeneratedCodes([])
              }}
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
