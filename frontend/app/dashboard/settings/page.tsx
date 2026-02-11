"use client"

/**
 * 계정 설정 페이지
 * 프로필 정보, 보안 설정, 알림 설정, 계정 관리
 */
import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'
import { 
  Settings, 
  User, 
  Lock, 
  Bell, 
  AlertTriangle,
  Save,
  EyeOff,
  Eye,
  Monitor,
  Smartphone,
  Loader2,
  Crown,
  Calendar,
  CreditCard,
  Zap,
  Phone,
  ShieldCheck,
  MessageSquare,
  CheckCircle2
} from 'lucide-react'
import { api } from '@/lib/config'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface UserProfile {
  id: string
  email: string
  display_name: string | null
  phone_number?: string | null
  created_at?: string
}

interface LoginHistory {
  timestamp: string
  device: string
  browser: string
  location: string
  ip: string
}

interface NotificationSettings {
  email_notifications: boolean
  weekly_report: boolean
  marketing_consent: boolean
}

interface SubscriptionInfo {
  tier: string
  status: string
  expires_at?: string
  cancelled_at?: string
  next_billing_date?: string
  auto_renewal?: boolean
  monthly_credits?: number
  max_stores?: number
  max_keywords?: number
}

export default function SettingsPage() {
  const { user, getToken } = useAuth()
  const { toast } = useToast()
  
  // 구독 정보
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)
  const [isLoadingSub, setIsLoadingSub] = useState(true)
  
  // 프로필 정보
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  
  // 비밀번호 변경
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  
  // 전화번호 등록 여부 (기존 유저 폴백용)
  const hasPhone = Boolean(phone)
  
  // 전화번호 등록 (기존 유저용)
  const [registerPhone, setRegisterPhone] = useState('')
  const [registerOtpCode, setRegisterOtpCode] = useState('')
  const [registerOtpSent, setRegisterOtpSent] = useState(false)
  const [registerOtpVerified, setRegisterOtpVerified] = useState(false)
  const [registerOtpCooldown, setRegisterOtpCooldown] = useState(0)
  const [registerOtpExpiry, setRegisterOtpExpiry] = useState(0)
  const [isRegisterSendingOtp, setIsRegisterSendingOtp] = useState(false)
  const [isRegisterVerifyingOtp, setIsRegisterVerifyingOtp] = useState(false)
  const [isRegisteringPhone, setIsRegisteringPhone] = useState(false)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  
  // OTP 본인인증 (비밀번호 변경용 - 전화번호 등록 유저만)
  const [otpPhone, setOtpPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)
  const [otpExpiry, setOtpExpiry] = useState(0)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  
  // 로그인 기록
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  
  // 알림 설정
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_notifications: true,
    weekly_report: true,
    marketing_consent: false,
  })
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true)
  const [isSavingNotifications, setIsSavingNotifications] = useState(false)
  
  // 계정 삭제
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  // 구독 정보 로드
  useEffect(() => {
    const loadSubscription = async () => {
      if (!user) return
      try {
        const token = getToken()
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/subscriptions/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setSubscriptionInfo(data)
        }
      } catch (error) {
        console.error('구독 정보 로드 실패:', error)
      } finally {
        setIsLoadingSub(false)
      }
    }
    loadSubscription()
  }, [user, getToken])

  // 프로필 정보 로드
  useEffect(() => {
    const loadProfile = async () => {
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
          setProfile(data)
          setDisplayName(data.display_name || '')
          setPhone(data.phone_number || '')
          // OTP 전화번호 자동 입력 (프로필에 등록된 전화번호)
          if (data.phone_number) {
            setOtpPhone(formatPhoneNumber(data.phone_number))
          }
        }
      } catch (error) {
        console.error('프로필 로드 실패:', error)
      } finally {
        setIsLoadingProfile(false)
      }
    }
    
    loadProfile()
  }, [user, getToken])

  // 로그인 기록 로드
  useEffect(() => {
    const loadLoginHistory = async () => {
      if (!user) return
      
      try {
        const token = getToken()
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user-settings/login-history`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          // 백엔드 응답: { login_history: [...] }
          setLoginHistory(data.login_history || [])
        } else {
          // API 오류 시 Mock 데이터
          const mockHistory: LoginHistory[] = [
            {
              timestamp: new Date().toISOString(),
              device: 'Desktop',
              browser: 'Chrome 120',
              location: 'Seoul, KR',
              ip: '123.456.789.012'
            },
          ]
          setLoginHistory(mockHistory)
        }
      } catch (error) {
        console.error('로그인 기록 로드 실패:', error)
      } finally {
        setIsLoadingHistory(false)
      }
    }
    
    loadLoginHistory()
  }, [user, getToken])

  // 알림 설정 로드
  useEffect(() => {
    const loadNotificationSettings = async () => {
      if (!user) return
      
      try {
        const token = getToken()
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user-settings/notifications`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setNotifications({
            email_notifications: data.email_notifications ?? true,
            weekly_report: data.weekly_report ?? true,
            marketing_consent: data.marketing_consent ?? false,
          })
        }
      } catch (error) {
        console.error('알림 설정 로드 실패:', error)
      } finally {
        setIsLoadingNotifications(false)
      }
    }
    
    loadNotificationSettings()
  }, [user, getToken])

  // OTP 쿨다운 타이머
  useEffect(() => {
    if (otpCooldown <= 0) return
    const timer = setInterval(() => {
      setOtpCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [otpCooldown])

  // OTP 만료 타이머
  useEffect(() => {
    if (otpExpiry <= 0) return
    const timer = setInterval(() => {
      setOtpExpiry(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setOtpSent(false)
          setOtpVerified(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [otpExpiry])

  // 전화번호 포맷팅
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

  // OTP 발송 (비밀번호 변경용)
  const handleSendPasswordOtp = async () => {
    const cleanPhone = otpPhone.replace(/[^\d]/g, '')
    if (!cleanPhone.startsWith('010') || cleanPhone.length !== 11) {
      toast({
        variant: "destructive",
        title: "❌ 전화번호 오류",
        description: "올바른 전화번호를 입력해주세요 (010-XXXX-XXXX)",
      })
      return
    }

    setIsSendingOtp(true)
    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: cleanPhone }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || '인증코드 발송에 실패했습니다')
      }

      setOtpSent(true)
      setOtpVerified(false)
      setOtpCooldown(60)
      setOtpExpiry(180)
      setOtpCode('')
      toast({
        title: "✅ 인증코드 발송",
        description: "카카오톡으로 인증코드가 발송되었습니다.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ 발송 실패",
        description: error.message || "인증코드 발송에 실패했습니다.",
      })
    } finally {
      setIsSendingOtp(false)
    }
  }

  // OTP 검증 (본인인증만, 로그인X)
  const handleVerifyPasswordOtp = async () => {
    if (otpCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "❌ 인증코드 오류",
        description: "6자리 인증코드를 입력해주세요.",
      })
      return
    }

    setIsVerifyingOtp(true)
    try {
      const cleanPhone = otpPhone.replace(/[^\d]/g, '')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: cleanPhone, code: otpCode, purpose: 'verify_identity' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || '인증에 실패했습니다')
      }

      const data = await response.json()
      if (data.verified || data.success) {
        setOtpVerified(true)
        toast({
          title: "✅ 본인인증 완료",
          description: "인증이 완료되었습니다. 새 비밀번호를 입력해주세요.",
        })
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ 인증 실패",
        description: error.message || "인증코드가 올바르지 않습니다.",
      })
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // ── 전화번호 등록 (기존 유저용) ──
  // 전화번호 등록 쿨다운 타이머
  useEffect(() => {
    if (registerOtpCooldown <= 0) return
    const timer = setInterval(() => {
      setRegisterOtpCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [registerOtpCooldown])

  // 전화번호 등록 만료 타이머
  useEffect(() => {
    if (registerOtpExpiry <= 0) return
    const timer = setInterval(() => {
      setRegisterOtpExpiry(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setRegisterOtpSent(false)
          setRegisterOtpVerified(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [registerOtpExpiry])

  // 전화번호 등록 OTP 발송
  const handleRegisterSendOtp = async () => {
    const cleanPhone = registerPhone.replace(/[^\d]/g, '')
    if (!cleanPhone.startsWith('010') || cleanPhone.length !== 11) {
      toast({ variant: "destructive", title: "❌ 전화번호 오류", description: "올바른 전화번호를 입력해주세요 (010-XXXX-XXXX)" })
      return
    }
    setIsRegisterSendingOtp(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: cleanPhone }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || '인증코드 발송에 실패했습니다')
      }
      setRegisterOtpSent(true)
      setRegisterOtpVerified(false)
      setRegisterOtpCooldown(60)
      setRegisterOtpExpiry(180)
      setRegisterOtpCode('')
      toast({ title: "✅ 인증코드 발송", description: "카카오톡으로 인증코드가 발송되었습니다." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "❌ 발송 실패", description: error.message || "인증코드 발송에 실패했습니다." })
    } finally {
      setIsRegisterSendingOtp(false)
    }
  }

  // 전화번호 등록 OTP 검증
  const handleRegisterVerifyOtp = async () => {
    if (registerOtpCode.length !== 6) {
      toast({ variant: "destructive", title: "❌ 인증코드 오류", description: "6자리 인증코드를 입력해주세요." })
      return
    }
    setIsRegisterVerifyingOtp(true)
    try {
      const cleanPhone = registerPhone.replace(/[^\d]/g, '')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: cleanPhone, code: registerOtpCode, purpose: 'verify_identity' }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || '인증에 실패했습니다')
      }
      const data = await response.json()
      if (data.verified || data.success) {
        setRegisterOtpVerified(true)
        toast({ title: "✅ 인증 완료", description: "전화번호 인증이 완료되었습니다." })
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "❌ 인증 실패", description: error.message || "인증코드가 올바르지 않습니다." })
    } finally {
      setIsRegisterVerifyingOtp(false)
    }
  }

  // 전화번호 등록 최종 처리
  const handleRegisterPhone = async () => {
    if (!registerOtpVerified) {
      toast({ variant: "destructive", title: "❌ 인증 필요", description: "먼저 전화번호 OTP 인증을 완료해주세요." })
      return
    }
    setIsRegisteringPhone(true)
    try {
      const token = getToken()
      const cleanPhone = registerPhone.replace(/[^\d]/g, '')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phone_number: cleanPhone }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || '전화번호 등록에 실패했습니다')
      }
      const data = await response.json()
      // 성공 시 프로필 전화번호 업데이트
      setPhone(cleanPhone)
      setOtpPhone(formatPhoneNumber(cleanPhone))
      setShowRegisterForm(false)
      setRegisterPhone('')
      setRegisterOtpCode('')
      setRegisterOtpSent(false)
      setRegisterOtpVerified(false)
      toast({ title: "✅ 전화번호 등록 완료", description: "전화번호가 성공적으로 등록되었습니다." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "❌ 등록 실패", description: error.message || "전화번호 등록에 실패했습니다." })
    } finally {
      setIsRegisteringPhone(false)
    }
  }

  // 프로필 저장
  const handleSaveProfile = async () => {
    if (!profile) return
    
    setIsSavingProfile(true)
    
    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          display_name: displayName,
        })
      })
      
      if (response.ok) {
        toast({
          title: "✅ 저장 완료",
          description: "프로필 정보가 업데이트되었습니다.",
        })
        
        // 프로필 다시 로드
        const data = await response.json()
        setProfile(data)
      } else {
        throw new Error('프로필 업데이트 실패')
      }
    } catch (error) {
      console.error('프로필 저장 오류:', error)
      toast({
        variant: "destructive",
        title: "❌ 저장 실패",
        description: "프로필 정보 저장에 실패했습니다.",
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  // 비밀번호 변경 (전화번호 있으면 OTP, 없으면 현재 비밀번호)
  const handleChangePassword = async () => {
    // 인증 방식별 유효성 검사
    if (hasPhone) {
      // 전화번호 등록 유저: OTP 필수
      if (!otpVerified) {
        toast({
          variant: "destructive",
          title: "❌ 본인인증 필요",
          description: "먼저 전화번호 OTP 인증을 완료해주세요.",
        })
        return
      }
    } else {
      // 전화번호 미등록 기존 유저: 현재 비밀번호 필수
      if (!currentPassword) {
        toast({
          variant: "destructive",
          title: "❌ 입력 오류",
          description: "현재 비밀번호를 입력해주세요.",
        })
        return
      }
    }

    // 공통 유효성 검사
    if (!newPassword || !confirmPassword) {
      toast({
        variant: "destructive",
        title: "❌ 입력 오류",
        description: "새 비밀번호를 입력해주세요.",
      })
      return
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "❌ 비밀번호 불일치",
        description: "새 비밀번호가 일치하지 않습니다.",
      })
      return
    }
    
    if (newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "❌ 비밀번호 길이",
        description: "비밀번호는 최소 8자 이상이어야 합니다.",
      })
      return
    }
    
    setIsChangingPassword(true)
    
    try {
      const token = getToken()
      // 전화번호 유무에 따라 요청 본문 분기
      const body = hasPhone
        ? { new_password: newPassword, otp_verified: true }
        : { current_password: currentPassword, new_password: newPassword, otp_verified: false }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })
      
      if (response.ok) {
        toast({
          title: "✅ 변경 완료",
          description: "비밀번호가 성공적으로 변경되었습니다.",
        })
        
        // 입력 필드 초기화
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setOtpVerified(false)
        setOtpSent(false)
        setOtpCode('')
        // 프로필 전화번호로 다시 설정
        if (phone) {
          setOtpPhone(formatPhoneNumber(phone))
        }
      } else {
        const error = await response.json()
        throw new Error(error.detail || '비밀번호 변경 실패')
      }
    } catch (error) {
      console.error('비밀번호 변경 오류:', error)
      toast({
        variant: "destructive",
        title: "❌ 변경 실패",
        description: error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다.",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  // 알림 설정 저장
  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true)
    
    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/settings/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(notifications)
      })
      
      if (response.ok) {
        toast({
          title: "✅ 저장 완료",
          description: "알림 설정이 업데이트되었습니다.",
        })
      } else {
        throw new Error('알림 설정 저장 실패')
      }
    } catch (error) {
      console.error('알림 설정 저장 오류:', error)
      toast({
        variant: "destructive",
        title: "❌ 저장 실패",
        description: "알림 설정 저장에 실패했습니다.",
      })
    } finally {
      setIsSavingNotifications(false)
    }
  }

  // 계정 삭제
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== '삭제') {
      toast({
        variant: "destructive",
        title: "❌ 확인 필요",
        description: "'삭제'를 정확히 입력해주세요.",
      })
      return
    }
    
    setIsDeletingAccount(true)
    
    try {
      const token = getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        toast({
          title: "✅ 계정 삭제 완료",
          description: "계정이 성공적으로 삭제되었습니다.",
        })
        
        // 로그아웃 및 로그인 페이지로 이동
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      } else {
        throw new Error('계정 삭제 실패')
      }
    } catch (error) {
      console.error('계정 삭제 오류:', error)
      toast({
        variant: "destructive",
        title: "❌ 삭제 실패",
        description: "계정 삭제에 실패했습니다.",
      })
      setIsDeletingAccount(false)
    }
  }

  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes('mobile')) return <Smartphone className="w-4 h-4" />
    return <Monitor className="w-4 h-4" />
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      {/* 헤더 섹션 */}
      <header className="mb-8 md:mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
            <Settings className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight">
            계정 설정
          </h1>
        </div>
        <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-3xl mx-auto">
          프로필 정보, 보안 설정, 알림 설정을 관리하세요
        </p>
      </header>

      <div className="space-y-6 md:space-y-8">
        {/* 프로필 정보 */}
        <section>
          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                  <User className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                    프로필 정보
                  </h2>
                  <p className="text-sm text-blue-700 mt-0.5">
                    기본 정보를 관리합니다
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6">
              {isLoadingProfile ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* 이름 */}
                    <div className="space-y-2">
                      <Label htmlFor="displayName" className="text-sm font-semibold text-neutral-700">
                        이름
                      </Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="홍길동"
                        className="h-12 text-base"
                      />
                    </div>

                    {/* 이메일 (읽기 전용) */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-semibold text-neutral-700">
                        이메일
                      </Label>
                      <Input
                        id="email"
                        value={profile?.email || ''}
                        disabled
                        className="h-12 text-base bg-gray-50"
                      />
                    </div>
                  </div>

                  {/* 전화번호 */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-semibold text-neutral-700 flex items-center gap-1.5">
                      전화번호
                      {phone && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          인증됨
                        </span>
                      )}
                    </Label>

                    {phone ? (
                      /* 전화번호가 등록된 유저: 읽기 전용 */
                      <>
                        <Input
                          id="phone"
                          value={formatPhoneNumber(phone)}
                          disabled
                          className="h-12 text-base bg-gray-50"
                        />
                        <p className="text-xs text-neutral-500">
                          전화번호는 회원가입 시 인증된 번호로 변경이 불가합니다.
                        </p>
                      </>
                    ) : !showRegisterForm ? (
                      /* 전화번호 미등록 유저: 등록 버튼 */
                      <div className="flex items-center gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-amber-800">전화번호가 등록되어 있지 않습니다</p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            계정 보안 강화 및 비밀번호 찾기를 위해 전화번호를 등록해주세요.
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => setShowRegisterForm(true)}
                          className="h-10 px-4 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white whitespace-nowrap"
                        >
                          등록하기
                        </Button>
                      </div>
                    ) : (
                      /* 전화번호 등록 폼 (OTP 인증) */
                      <div className="space-y-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                        <p className="text-sm font-bold text-blue-800 mb-2">📱 전화번호 등록</p>

                        {registerOtpVerified ? (
                          /* OTP 인증 완료 → 등록 버튼 */
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-300 rounded-lg">
                              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                              <p className="text-sm font-bold text-green-800">
                                {formatPhoneNumber(registerPhone)} 인증 완료
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                onClick={handleRegisterPhone}
                                disabled={isRegisteringPhone}
                                className="flex-1 h-12 font-bold bg-emerald-500 hover:bg-emerald-600 text-white"
                              >
                                {isRegisteringPhone ? (
                                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />등록 중...</>
                                ) : (
                                  '전화번호 등록'
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setShowRegisterForm(false)
                                  setRegisterOtpVerified(false)
                                  setRegisterOtpSent(false)
                                  setRegisterPhone('')
                                  setRegisterOtpCode('')
                                }}
                                className="h-12 px-4 font-bold"
                              >
                                취소
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* 전화번호 입력 + OTP 발송 */}
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold text-neutral-700 flex items-center gap-1.5">
                                <Phone className="w-4 h-4 text-blue-500" />
                                전화번호 입력
                              </Label>
                              <div className="flex gap-2">
                                <Input
                                  type="tel"
                                  placeholder="010-1234-5678"
                                  value={registerPhone}
                                  onChange={(e) => setRegisterPhone(formatPhoneNumber(e.target.value))}
                                  maxLength={13}
                                  disabled={isRegisterSendingOtp || isRegisterVerifyingOtp}
                                  className="flex-1 h-12 text-base"
                                />
                                <Button
                                  type="button"
                                  onClick={handleRegisterSendOtp}
                                  disabled={isRegisterSendingOtp || registerOtpCooldown > 0 || registerPhone.replace(/[^\d]/g, '').length !== 11}
                                  className="h-12 px-4 font-bold whitespace-nowrap"
                                >
                                  {isRegisterSendingOtp ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : registerOtpCooldown > 0 ? (
                                    `${registerOtpCooldown}초`
                                  ) : registerOtpSent ? (
                                    '재발송'
                                  ) : (
                                    '인증요청'
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* 인증코드 입력 */}
                            {registerOtpSent && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-semibold text-neutral-700 flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                                    인증코드
                                  </Label>
                                  {registerOtpExpiry > 0 && (
                                    <span className={`text-xs font-bold ${registerOtpExpiry <= 30 ? 'text-red-500' : 'text-blue-600'}`}>
                                      {Math.floor(registerOtpExpiry / 60)}:{(registerOtpExpiry % 60).toString().padStart(2, '0')}
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="6자리 인증코드"
                                    value={registerOtpCode}
                                    onChange={(e) => setRegisterOtpCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                                    maxLength={6}
                                    disabled={isRegisterVerifyingOtp}
                                    className="flex-1 h-12 text-base text-center tracking-[0.3em] font-bold"
                                  />
                                  <Button
                                    type="button"
                                    onClick={handleRegisterVerifyOtp}
                                    disabled={registerOtpCode.length !== 6 || isRegisterVerifyingOtp}
                                    className="h-12 px-4 font-bold whitespace-nowrap"
                                  >
                                    {isRegisterVerifyingOtp ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      '인증확인'
                                    )}
                                  </Button>
                                </div>
                                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                  <MessageSquare className="w-3.5 h-3.5 text-yellow-500" />
                                  카카오톡으로 발송된 인증코드를 입력해주세요
                                </p>
                              </div>
                            )}

                            {/* 취소 버튼 */}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowRegisterForm(false)
                                setRegisterOtpSent(false)
                                setRegisterPhone('')
                                setRegisterOtpCode('')
                              }}
                              className="w-full h-10 text-sm font-bold"
                            >
                              취소
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 저장 버튼 */}
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="h-12 px-8 text-base font-bold"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          저장 중...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-2" />
                          저장하기
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* 구독 & 결제 정보 */}
        <section>
          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b-2 border-yellow-200 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-md">
                  <Crown className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                    구독 & 결제 정보
                  </h2>
                  <p className="text-sm text-yellow-700 mt-0.5">
                    현재 구독 상태와 결제 정보를 확인합니다
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6">
              {isLoadingSub ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
                </div>
              ) : subscriptionInfo ? (
                <div className="space-y-4">
                  {/* 현재 플랜 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-4 h-4 text-yellow-600" />
                        <span className="text-xs font-semibold text-neutral-600">현재 플랜</span>
                      </div>
                      <div className="text-lg font-bold text-neutral-900 capitalize">
                        {subscriptionInfo.tier === 'basic_plus' ? 'Basic+' : subscriptionInfo.tier}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-semibold text-neutral-600">구독 상태</span>
                      </div>
                      <div className={`text-lg font-bold ${
                        subscriptionInfo.status === 'active' ? 'text-green-600' :
                        subscriptionInfo.status === 'cancelled' ? 'text-red-600' :
                        'text-neutral-600'
                      }`}>
                        {subscriptionInfo.status === 'active' ? '활성' :
                         subscriptionInfo.status === 'cancelled' ? '취소됨' :
                         subscriptionInfo.status === 'expired' ? '만료' : subscriptionInfo.status}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-semibold text-neutral-600">
                          {subscriptionInfo.status === 'cancelled' ? '서비스 종료일' : '다음 결제일'}
                        </span>
                      </div>
                      <div className="text-lg font-bold text-neutral-900">
                        {subscriptionInfo.status === 'cancelled' && subscriptionInfo.expires_at
                          ? new Date(subscriptionInfo.expires_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
                          : subscriptionInfo.next_billing_date
                          ? new Date(subscriptionInfo.next_billing_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
                          : '-'
                        }
                      </div>
                    </div>
                  </div>

                  {/* 구독 취소 경고 */}
                  {subscriptionInfo.status === 'cancelled' && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-bold">구독 취소 안내</span>
                      </div>
                      <div className="text-sm text-red-700 space-y-1">
                        {subscriptionInfo.expires_at && (
                          <p>
                            <strong>{new Date(subscriptionInfo.expires_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>까지 현재 플랜의 모든 기능을 이용하실 수 있습니다.
                          </p>
                        )}
                        <p>서비스 종료 후 Free 플랜으로 자동 전환되며, 미사용 크레딧은 소멸됩니다.</p>
                      </div>
                    </div>
                  )}

                  {/* 멤버십 관리 링크 */}
                  <div className="flex justify-end pt-2">
                    <Link href="/dashboard/membership">
                      <Button variant="outline" className="h-12 px-6 text-base font-bold">
                        <CreditCard className="w-5 h-5 mr-2" />
                        멤버십 관리
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-neutral-600">구독 정보를 불러올 수 없습니다.</p>
                  <Link href="/dashboard/membership">
                    <Button className="mt-4 h-12 px-6 text-base font-bold">
                      <Crown className="w-5 h-5 mr-2" />
                      멤버십 시작하기
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* 보안 설정 */}
        <section>
          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-200 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-md">
                  <Lock className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                    보안 설정
                  </h2>
                  <p className="text-sm text-purple-700 mt-0.5">
                    비밀번호 및 로그인 기록을 관리합니다
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6 space-y-8">
              {/* 비밀번호 변경 */}
              <div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">비밀번호 변경</h3>
                <p className="text-sm text-neutral-500 mb-4">
                  {hasPhone
                    ? '비밀번호 변경을 위해 가입 시 등록한 전화번호로 본인인증이 필요합니다.'
                    : '현재 비밀번호를 확인한 후 새 비밀번호를 설정합니다.'}
                </p>

                {/* 전화번호 미등록 유저 안내 배너 */}
                {!hasPhone && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">전화번호를 등록해주세요</p>
                      <p className="text-xs text-amber-700 mt-1">
                        계정 보안 강화를 위해 전화번호 등록을 권장합니다.<br />
                        전화번호 등록 후에는 더 안전한 OTP 인증으로 비밀번호를 변경할 수 있습니다.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {hasPhone ? (
                    /* ══════ 전화번호 등록 유저: OTP 인증 ══════ */
                    <div className="space-y-3">
                      {otpVerified ? (
                        <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-300 rounded-xl">
                          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-green-800">본인인증 완료</p>
                            <p className="text-xs text-green-600 mt-0.5">아래에 새 비밀번호를 입력해주세요</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold text-neutral-700 flex items-center gap-1.5">
                              <Phone className="w-4 h-4 text-purple-500" />
                              가입 시 등록된 전화번호
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                type="tel"
                                placeholder="010-1234-5678"
                                value={otpPhone}
                                onChange={(e) => setOtpPhone(formatPhoneNumber(e.target.value))}
                                maxLength={13}
                                disabled={isSendingOtp || isVerifyingOtp}
                                className="flex-1 h-12 text-base"
                              />
                              <Button
                                type="button"
                                onClick={handleSendPasswordOtp}
                                disabled={isSendingOtp || otpCooldown > 0 || otpPhone.replace(/[^\d]/g, '').length !== 11}
                                className="h-12 px-4 font-bold whitespace-nowrap"
                              >
                                {isSendingOtp ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : otpCooldown > 0 ? (
                                  `${otpCooldown}초`
                                ) : otpSent ? (
                                  '재발송'
                                ) : (
                                  '인증요청'
                                )}
                              </Button>
                            </div>
                          </div>

                          {otpSent && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold text-neutral-700 flex items-center gap-1.5">
                                  <ShieldCheck className="w-4 h-4 text-purple-500" />
                                  인증코드
                                </Label>
                                {otpExpiry > 0 && (
                                  <span className={`text-xs font-bold ${otpExpiry <= 30 ? 'text-red-500' : 'text-purple-600'}`}>
                                    {Math.floor(otpExpiry / 60)}:{(otpExpiry % 60).toString().padStart(2, '0')}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="6자리 인증코드"
                                  value={otpCode}
                                  onChange={(e) => setOtpCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                                  maxLength={6}
                                  disabled={isVerifyingOtp}
                                  className="flex-1 h-12 text-base text-center tracking-[0.3em] font-bold"
                                />
                                <Button
                                  type="button"
                                  onClick={handleVerifyPasswordOtp}
                                  disabled={otpCode.length !== 6 || isVerifyingOtp}
                                  className="h-12 px-4 font-bold whitespace-nowrap"
                                >
                                  {isVerifyingOtp ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    '인증확인'
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5 text-yellow-500" />
                                카카오톡으로 발송된 인증코드를 입력해주세요
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    /* ══════ 전화번호 미등록 기존 유저: 현재 비밀번호 ══════ */
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-sm font-semibold text-neutral-700">
                        현재 비밀번호
                      </Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="현재 비밀번호를 입력하세요"
                          className="h-12 text-base pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 새 비밀번호 (OTP 인증 완료 후 또는 현재 비밀번호 입력 시 표시) */}
                  {(hasPhone ? otpVerified : true) && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm font-semibold text-neutral-700">
                          새 비밀번호
                        </Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="새 비밀번호를 입력하세요 (최소 8자)"
                            className="h-12 text-base pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          >
                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-semibold text-neutral-700">
                          새 비밀번호 확인
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="새 비밀번호를 다시 입력하세요"
                            className="h-12 text-base pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* 변경 버튼 */}
                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={handleChangePassword}
                          disabled={isChangingPassword}
                          className="h-12 px-8 text-base font-bold"
                        >
                          {isChangingPassword ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              변경 중...
                            </>
                          ) : (
                            <>
                              <Lock className="w-5 h-5 mr-2" />
                              비밀번호 변경
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 로그인 기록 */}
              <div>
                <h3 className="text-lg font-bold text-neutral-900 mb-4">로그인 기록</h3>
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loginHistory.map((record, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          {getDeviceIcon(record.device)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-neutral-900">
                              {record.device}
                            </span>
                            <span className="text-xs text-neutral-500">·</span>
                            <span className="text-sm text-neutral-600">{record.browser}</span>
                          </div>
                          <div className="text-xs text-neutral-500">
                            {new Date(record.timestamp).toLocaleString('ko-KR')} · {record.location}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </section>

        {/* 알림 설정 */}
        <section>
          <Card className="rounded-xl border-2 border-neutral-300 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-md">
                  <Bell className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                    알림 설정
                  </h2>
                  <p className="text-sm text-green-700 mt-0.5">
                    받고 싶은 알림을 선택하세요
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6">
              <div className="space-y-5">
                {/* 이메일 알림 */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-neutral-900 mb-1">
                      이메일 알림
                    </h3>
                    <p className="text-sm text-neutral-600">
                      중요한 업데이트를 이메일로 받습니다
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email_notifications}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, email_notifications: checked })
                    }
                  />
                </div>

                {/* 주간 리포트 */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-neutral-900 mb-1">
                      주간 리포트
                    </h3>
                    <p className="text-sm text-neutral-600">
                      매주 성과 리포트를 받습니다
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weekly_report}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, weekly_report: checked })
                    }
                  />
                </div>

                {/* 마케팅 수신 동의 */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-neutral-900 mb-1">
                      마케팅 수신 동의
                    </h3>
                    <p className="text-sm text-neutral-600">
                      이벤트 및 프로모션 정보를 받습니다
                    </p>
                  </div>
                  <Switch
                    checked={notifications.marketing_consent}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, marketing_consent: checked })
                    }
                  />
                </div>

                {/* 저장 버튼 */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveNotifications}
                    disabled={isSavingNotifications}
                    className="h-12 px-8 text-base font-bold"
                  >
                    {isSavingNotifications ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        저장하기
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* 계정 관리 (Danger Zone) */}
        <section>
          <Card className="rounded-xl border-2 border-red-300 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b-2 border-red-200 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-md">
                  <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
                    계정 관리
                  </h2>
                  <p className="text-sm text-red-700 mt-0.5">
                    신중하게 진행해주세요
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-6">
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="text-base font-semibold text-red-900 mb-2">
                    계정 삭제
                  </h3>
                  <p className="text-sm text-red-700 mb-4">
                    계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
                    <br />
                    구독 중인 요금제가 있다면 자동으로 취소됩니다.
                  </p>
                  <Button
                    onClick={() => setShowDeleteDialog(true)}
                    variant="destructive"
                    className="h-12 px-8 text-base font-bold"
                  >
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    계정 삭제
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </div>

      {/* 계정 삭제 확인 다이얼로그 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              계정 삭제 확인
            </DialogTitle>
            <DialogDescription className="text-base text-neutral-700 pt-2">
              정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              <br />
              <br />
              계속하려면 아래에 <span className="font-bold text-red-600">"삭제"</span>를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="삭제"
              className="h-12 text-base"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteConfirmText('')
              }}
              disabled={isDeletingAccount}
              className="h-12 px-6"
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount || deleteConfirmText !== '삭제'}
              className="h-12 px-6"
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  삭제 중...
                </>
              ) : (
                '계정 삭제'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
