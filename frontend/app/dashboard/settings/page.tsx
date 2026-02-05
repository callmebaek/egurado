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
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  Chrome,
  Loader2
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

interface UserProfile {
  id: string
  email: string
  display_name: string | null
  phone?: string | null
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

export default function SettingsPage() {
  const { user, getToken } = useAuth()
  const { toast } = useToast()
  
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
          setPhone(data.phone || '')
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
          phone_number: phone
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

  // 비밀번호 변경
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        variant: "destructive",
        title: "❌ 입력 오류",
        description: "모든 비밀번호 필드를 입력해주세요.",
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
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
                    <Label htmlFor="phone" className="text-sm font-semibold text-neutral-700">
                      전화번호 (선택)
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010-1234-5678"
                      className="h-12 text-base"
                    />
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
                <h3 className="text-lg font-bold text-neutral-900 mb-4">비밀번호 변경</h3>
                <div className="space-y-4">
                  {/* 현재 비밀번호 */}
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* 새 비밀번호 */}
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* 새 비밀번호 확인 */}
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
