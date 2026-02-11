"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Phone, ShieldCheck, MessageSquare, CheckCircle2, ArrowLeft, Lock, Mail } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

export const dynamic = 'force-dynamic'

type Step = 'email' | 'otp' | 'reset' | 'done'

export default function FindPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { sendOtp, verifyOtp } = useAuth()

  const [step, setStep] = useState<Step>('email')
  
  // Step 1: 이메일 입력
  const [email, setEmail] = useState("")
  const [maskedPhone, setMaskedPhone] = useState("")
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)

  // Step 2: OTP 인증
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)
  const [otpExpiry, setOtpExpiry] = useState(0)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [resetToken, setResetToken] = useState("")

  // Step 3: 새 비밀번호 설정
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isResetting, setIsResetting] = useState(false)

  // 타이머
  useEffect(() => {
    if (otpCooldown <= 0) return
    const timer = setInterval(() => {
      setOtpCooldown(prev => { if (prev <= 1) { clearInterval(timer); return 0 }; return prev - 1 })
    }, 1000)
    return () => clearInterval(timer)
  }, [otpCooldown])

  useEffect(() => {
    if (otpExpiry <= 0) return
    const timer = setInterval(() => {
      setOtpExpiry(prev => {
        if (prev <= 1) { clearInterval(timer); setOtpSent(false); toast({ variant: "destructive", title: "⏰ 인증코드 만료" }); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [otpExpiry])

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

  // Step 1: 이메일 확인 → 마스킹된 전화번호 받기
  const handleCheckEmail = async () => {
    if (!email) {
      toast({ variant: "destructive", title: "❌ 이메일 입력 필요", description: "이메일을 입력해주세요." })
      return
    }
    setIsCheckingEmail(true)
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.detail || '계정을 찾을 수 없습니다.')
      }
      
      if (data.has_phone && data.masked_phone) {
        setMaskedPhone(data.masked_phone)
        setStep('otp')
        toast({ title: "✅ 계정 확인", description: `연결된 전화번호(${data.masked_phone})로 인증을 진행해주세요.` })
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "❌ 계정 조회 실패", description: error.message })
    } finally {
      setIsCheckingEmail(false)
    }
  }

  // Step 2: OTP 발송
  const handleSendOtp = async () => {
    const cleanPhone = phoneNumber.replace(/[^\d]/g, '')
    if (!cleanPhone.startsWith('010') || cleanPhone.length !== 11) {
      toast({ variant: "destructive", title: "❌ 전화번호 오류", description: "올바른 전화번호를 입력해주세요" })
      return
    }
    setIsSendingOtp(true)
    try {
      await sendOtp(cleanPhone)
      setOtpSent(true)
      setOtpCooldown(60)
      setOtpExpiry(180)
      setOtpCode("")
      toast({ title: "✅ 인증코드 발송", description: "카카오톡으로 인증코드가 발송되었습니다." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "❌ 발송 실패", description: error.message })
    } finally {
      setIsSendingOtp(false)
    }
  }

  // Step 2: OTP 검증
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast({ variant: "destructive", title: "❌ 인증코드 오류", description: "6자리 인증코드를 입력해주세요." })
      return
    }
    setIsVerifyingOtp(true)
    try {
      const cleanPhone = phoneNumber.replace(/[^\d]/g, '')
      const result = await verifyOtp(cleanPhone, otpCode, 'reset_password')
      
      if (result.success && result.reset_token) {
        setResetToken(result.reset_token)
        setStep('reset')
        toast({ title: "✅ 인증 완료", description: "새 비밀번호를 설정해주세요." })
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "❌ 인증 실패", description: error.message })
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // Step 3: 비밀번호 재설정
  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      toast({ variant: "destructive", title: "❌ 비밀번호 길이", description: "비밀번호는 8자 이상이어야 합니다." })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "❌ 비밀번호 불일치", description: "비밀번호가 일치하지 않습니다." })
      return
    }
    setIsResetting(true)
    try {
      const cleanPhone = phoneNumber.replace(/[^\d]/g, '')
      const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: cleanPhone,
          new_password: newPassword,
          reset_token: resetToken,
        }),
      })
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.detail || '비밀번호 재설정에 실패했습니다.')
      }
      
      setStep('done')
      toast({ title: "✅ 비밀번호 변경 완료", description: "새 비밀번호로 로그인해주세요." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "❌ 비밀번호 재설정 실패", description: error.message })
    } finally {
      setIsResetting(false)
    }
  }

  // 단계 인디케이터
  const stepLabels = ['이메일 확인', '전화번호 인증', '비밀번호 재설정']
  const stepIndex = step === 'email' ? 0 : step === 'otp' ? 1 : 2

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50/30 via-green-50/20 to-teal-50/20 p-4">
      <Card className="w-full max-w-md border-2 border-emerald-200/50 shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            <Image src="/whiplace-logo.svg" alt="WhiPlace" width={180} height={60} priority className="w-full max-w-[180px] h-auto" />
          </div>
          <CardTitle className="text-xl font-bold text-center">비밀번호 찾기</CardTitle>
          {step !== 'done' && (
            <>
              <CardDescription className="text-center">
                {step === 'email' && '가입하신 이메일을 입력해주세요'}
                {step === 'otp' && '연결된 전화번호로 본인인증을 진행해주세요'}
                {step === 'reset' && '새로운 비밀번호를 설정해주세요'}
              </CardDescription>
              {/* 단계 표시 */}
              <div className="flex items-center justify-center gap-2 pt-3">
                {stepLabels.map((label, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i <= stepIndex ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {i + 1}
                    </div>
                    {i < stepLabels.length - 1 && (
                      <div className={`w-8 h-0.5 ${i < stepIndex ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {/* Step 1: 이메일 입력 */}
          {step === 'email' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Mail className="w-4 h-4 text-emerald-500" />
                  이메일
                </label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isCheckingEmail}
                  className="h-12 text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 rounded-xl"
                />
              </div>
              <Button
                type="button"
                onClick={handleCheckEmail}
                disabled={isCheckingEmail || !email}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg"
              >
                {isCheckingEmail ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />확인 중...</> : '다음'}
              </Button>
            </div>
          )}

          {/* Step 2: 전화번호 OTP 인증 */}
          {step === 'otp' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-sm text-emerald-700">
                  <strong>{email}</strong> 계정에 연결된 전화번호
                </p>
                <p className="text-lg font-bold text-emerald-800 mt-1">{maskedPhone}</p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  전화번호 전체 입력
                </label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="010-1234-5678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                    maxLength={13}
                    disabled={isSendingOtp || isVerifyingOtp}
                    className="flex-1 h-12 text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 rounded-xl"
                  />
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || otpCooldown > 0 || phoneNumber.replace(/[^\d]/g, '').length !== 11}
                    className="h-12 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-md whitespace-nowrap text-sm"
                  >
                    {isSendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : otpCooldown > 0 ? `${otpCooldown}초` : otpSent ? '재발송' : '인증요청'}
                  </Button>
                </div>
              </div>

              {otpSent && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      인증코드
                    </label>
                    {otpExpiry > 0 && (
                      <span className={`text-xs font-bold ${otpExpiry <= 30 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {Math.floor(otpExpiry / 60)}:{(otpExpiry % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="6자리 인증코드"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                    maxLength={6}
                    disabled={isVerifyingOtp}
                    className="h-12 text-base text-center tracking-[0.3em] font-bold border-2 border-emerald-100 focus:border-teal-400 rounded-xl"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-yellow-500" />
                    카카오톡으로 발송된 인증코드를 입력해주세요
                  </p>
                  <Button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpCode.length !== 6 || isVerifyingOtp}
                    className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg"
                  >
                    {isVerifyingOtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />확인 중...</> : '인증하기'}
                  </Button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                ← 이전 단계로
              </button>
            </div>
          )}

          {/* Step 3: 새 비밀번호 설정 */}
          {step === 'reset' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <p className="text-sm text-emerald-700">본인인증이 완료되었습니다</p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Lock className="w-4 h-4 text-emerald-500" />
                  새 비밀번호
                </label>
                <Input
                  type="password"
                  placeholder="8자 이상 입력"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isResetting}
                  minLength={8}
                  className="h-12 text-base border-2 border-emerald-100 focus:border-teal-400 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Lock className="w-4 h-4 text-emerald-500" />
                  새 비밀번호 확인
                </label>
                <Input
                  type="password"
                  placeholder="비밀번호 재입력"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isResetting}
                  minLength={8}
                  className="h-12 text-base border-2 border-emerald-100 focus:border-teal-400 rounded-xl"
                />
              </div>

              <Button
                type="button"
                onClick={handleResetPassword}
                disabled={isResetting || newPassword.length < 8 || newPassword !== confirmPassword}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg"
              >
                {isResetting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />변경 중...</> : '비밀번호 변경'}
              </Button>
            </div>
          )}

          {/* Step 4: 완료 */}
          {step === 'done' && (
            <div className="space-y-6 text-center">
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-lg font-bold text-gray-800 mb-2">비밀번호 변경 완료</p>
                <p className="text-sm text-gray-600">새 비밀번호로 로그인해주세요.</p>
              </div>
              <Link href="/login">
                <Button className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg">
                  로그인하기
                </Button>
              </Link>
            </div>
          )}

          {/* 하단 링크 */}
          <div className="text-center pt-2">
            <Link href="/login" className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 hover:underline font-medium">
              <ArrowLeft className="w-4 h-4" />
              로그인으로 돌아가기
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
