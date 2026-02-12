"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Mail, Lock, User, Phone, ShieldCheck, MessageSquare, CheckCircle2, ArrowRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { startKakaoLogin } from "@/lib/social-login"

// 동적 렌더링 강제
export const dynamic = 'force-dynamic'

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { signup, sendOtp, verifyOtp } = useAuth()
  
  // 기본 정보
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)

  // 전화번호 OTP 인증
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)
  const [otpExpiry, setOtpExpiry] = useState(0)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)

  // OTP 재발송 쿨다운 타이머
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
          toast({
            variant: "destructive",
            title: "⏰ 인증코드 만료",
            description: "인증코드가 만료되었습니다. 다시 요청해주세요.",
          })
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

  // OTP 발송
  const handleSendOtp = async () => {
    const cleanPhone = phoneNumber.replace(/[^\d]/g, '')
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
      const result = await sendOtp(cleanPhone)
      setOtpSent(true)
      setOtpCooldown(60)
      setOtpExpiry(180)
      setOtpCode("")
      setPhoneVerified(false)
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

  // OTP 검증
  const handleVerifyOtp = async () => {
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
      const cleanPhone = phoneNumber.replace(/[^\d]/g, '')
      const result = await verifyOtp(cleanPhone, otpCode, 'signup')
      
      if (result.success && result.verified) {
        setPhoneVerified(true)
        setOtpSent(false)
        setOtpExpiry(0)
        toast({
          title: "✅ 전화번호 인증 완료",
          description: "전화번호가 인증되었습니다.",
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

  // 회원가입
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== passwordConfirm) {
      toast({ variant: "destructive", title: "❌ 비밀번호 불일치", description: "비밀번호가 일치하지 않습니다." })
      return
    }

    if (!phoneVerified) {
      toast({ variant: "destructive", title: "❌ 전화번호 인증 필요", description: "전화번호 인증을 완료해주세요." })
      return
    }

    if (!agreed) {
      toast({ variant: "destructive", title: "❌ 약관 동의 필요", description: "개인정보 수집 및 이용에 동의해주세요." })
      return
    }

    setIsLoading(true)

    try {
      const cleanPhone = phoneNumber.replace(/[^\d]/g, '')
      await signup(email, password, displayName || undefined, cleanPhone, true)
      
      toast({
        title: "✅ 회원가입 성공",
        description: "환영합니다! 온보딩을 진행해주세요.",
      })
    } catch (error: any) {
      console.error("회원가입 오류:", error)
      toast({
        variant: "destructive",
        title: "❌ 회원가입 실패",
        description: error.message || "회원가입 처리 중 오류가 발생했습니다.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKakaoLogin = async () => {
    if (!agreed) {
      toast({ variant: "destructive", title: "❌ 약관 동의 필요", description: "개인정보 수집 및 이용에 동의해주세요." })
      return
    }
    try {
      await startKakaoLogin()
    } catch (error: any) {
      toast({ variant: "destructive", title: "❌ 카카오 로그인 오류", description: error.message })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50/30 via-green-50/20 to-teal-50/20 p-4">
      <Card className="w-full max-w-md border-2 border-emerald-200/50 shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            <Image
              src="/whiplace-logo.svg"
              alt="WhiPlace"
              width={180}
              height={60}
              priority
              className="w-full max-w-[200px] h-auto"
            />
          </div>
          <CardTitle className="text-xl font-bold text-center">
            회원가입
          </CardTitle>
          <CardDescription className="text-center">
            네이버 플레이스 마케팅을 시작하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {/* 소셜 회원가입 - 임시 숨김 처리 */}
          {/* <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 bg-[#FEE500] hover:bg-[#FDD835] text-black border-0 font-bold rounded-xl shadow-md"
              onClick={handleKakaoLogin}
              disabled={isLoading}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3zm5.907 8.06l1.47-1.424a.472.472 0 0 0-.656-.678l-1.928 1.866V9.282a.472.472 0 0 0-.944 0v2.557a.471.471 0 0 0 0 .222V13.5a.472.472 0 0 0 .944 0v-1.363l.427-.413 1.428 2.033a.472.472 0 1 0 .773-.544l-1.514-2.153zm-2.958 1.924h-1.46V9.297a.472.472 0 0 0-.943 0v4.159c0 .26.21.472.471.472h1.932a.472.472 0 1 0 0-.944zm-5.857-1.092l.696-1.707.638 1.707H9.092zm2.523.488l.002-.016a.469.469 0 0 0-.127-.32l-1.046-2.8a.69.69 0 0 0-.627-.474.69.69 0 0 0-.627.474l-1.063 2.839a.469.469 0 0 0 .874.327l.218-.581h1.978l.218.581a.469.469 0 0 0 .874-.327l.002-.016-.002.016.326-.103zm-4.347.613a.472.472 0 0 0 .472-.472V9.297a.472.472 0 1 0-.944 0v2.623H5.577a.472.472 0 1 0 0 .944h2.219c.26 0 .472-.212.472-.472z"/>
              </svg>
              카카오로 3초만에 시작하기
            </Button>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">
                또는 이메일로 가입
              </span>
            </div>
          </div> */}

          {/* 이메일 회원가입 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이메일 */}
            <div className="space-y-2">
              <label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Mail className="w-4 h-4 text-emerald-500" />
                이메일 <span className="text-red-500">*</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 rounded-xl"
              />
            </div>

            {/* 이름 */}
            <div className="space-y-2">
              <label htmlFor="displayName" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <User className="w-4 h-4 text-emerald-500" />
                이름 (선택)
              </label>
              <Input
                id="displayName"
                type="text"
                placeholder="홍길동"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
                className="h-12 text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 rounded-xl"
              />
            </div>

            {/* 비밀번호 */}
            <div className="space-y-2">
              <label htmlFor="password" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Lock className="w-4 h-4 text-emerald-500" />
                비밀번호 <span className="text-red-500">*</span>
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
                className="h-12 text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">최소 8자 이상 입력해주세요</p>
            </div>

            {/* 비밀번호 확인 */}
            <div className="space-y-2">
              <label htmlFor="passwordConfirm" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Lock className="w-4 h-4 text-emerald-500" />
                비밀번호 확인 <span className="text-red-500">*</span>
              </label>
              <Input
                id="passwordConfirm"
                type="password"
                placeholder="••••••••"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
                className="h-12 text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 rounded-xl"
              />
            </div>

            {/* 전화번호 인증 섹션 */}
            <div className="space-y-3 bg-emerald-50/50 border-2 border-emerald-200/50 rounded-xl p-4">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <Phone className="w-4 h-4 text-emerald-500" />
                휴대전화 인증 <span className="text-red-500">*</span>
                {phoneVerified && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    인증완료
                  </span>
                )}
              </label>
              
              {!phoneVerified ? (
                <>
                  {/* 전화번호 입력 + 발송 */}
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      placeholder="010-1234-5678"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(formatPhoneNumber(e.target.value))
                        setPhoneVerified(false)
                        setOtpSent(false)
                      }}
                      maxLength={13}
                      disabled={isSendingOtp || isVerifyingOtp}
                      className="flex-1 h-12 text-base border-2 border-emerald-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 rounded-xl"
                    />
                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp || otpCooldown > 0 || phoneNumber.replace(/[^\d]/g, '').length !== 11}
                      className="h-12 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-md whitespace-nowrap text-sm"
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

                  {/* OTP 입력 */}
                  {otpSent && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                          인증코드 6자리
                        </label>
                        {otpExpiry > 0 && (
                          <span className={`text-xs font-bold ${otpExpiry <= 30 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {Math.floor(otpExpiry / 60)}:{(otpExpiry % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="인증코드 입력"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                          maxLength={6}
                          disabled={isVerifyingOtp}
                          className="flex-1 h-12 text-base text-center tracking-[0.2em] font-bold border-2 border-emerald-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 rounded-xl"
                          autoFocus
                        />
                        <Button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={otpCode.length !== 6 || isVerifyingOtp}
                          className="h-12 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md whitespace-nowrap text-sm"
                        >
                          {isVerifyingOtp ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            '확인'
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
              ) : (
                /* 인증 완료 상태 */
                <div className="flex items-center gap-3 bg-emerald-100 rounded-lg p-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">{phoneNumber}</p>
                    <p className="text-xs text-emerald-600">전화번호 인증이 완료되었습니다</p>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-gray-500 leading-relaxed">
                💡 하나의 전화번호로 하나의 계정만 생성할 수 있습니다.
              </p>
            </div>

            {/* 약관 동의 */}
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 accent-emerald-600"
                disabled={isLoading}
              />
              <label htmlFor="agree" className="text-sm leading-tight">
                <span className="text-red-500">*</span> [필수] 개인정보 수집 및 이용에 동의합니다.
                <br />
                <span className="text-xs text-muted-foreground">
                  (수집 항목: 이메일, 이름, 휴대전화번호 / 이용 목적: 회원관리, 본인확인, 서비스 제공, 부정이용 방지)
                </span>
              </label>
            </div>

            {/* 회원가입 버튼 */}
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
              disabled={isLoading || !phoneVerified}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  회원가입
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          {/* 로그인 링크 */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-teal-600 hover:text-teal-700 hover:underline font-bold">
                로그인
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
