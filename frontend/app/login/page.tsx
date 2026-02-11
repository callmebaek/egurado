"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Mail, Lock, Sparkles, ArrowRight, Check, Phone, MessageSquare, ShieldCheck } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { startKakaoLogin, startNaverLogin } from "@/lib/social-login"

// 동적 렌더링 강제
export const dynamic = 'force-dynamic'

// 명언 배열
const QUOTES = [
  "데이터를 확인하는 순간, 장사가 아닌 경영이 시작된다.",
  "데이터를 기반으로 판단할 때 비로소 사업이 된다.",
  "데이터 없이 하는 판단은 장사이고, 데이터 위의 판단은 사업이다.",
  "데이터를 보는 사람은 경영하고, 보지 않는 사람은 장사한다.",
  "숫자를 읽는 순간, 매출이 아니라 구조가 보인다.",
  "감이 아닌 데이터가 기준이 되는 순간, 사업이 된다.",
  "측정되지 않는 것은 개선되지 않는다.",
  "의사결정의 속도는 감이 빠르지만, 정확도는 데이터가 만든다.",
  "경험은 과거를 말하고, 데이터는 현재를 증명한다.",
  "성공은 우연 같아 보이지만, 데이터 안에서는 재현 가능하다.",
  "잘되는 이유를 설명할 수 없다면, 다시 안 될 가능성도 설명할 수 없다.",
  "확장 가능한 것은 감이 아니라 데이터다.",
  "데이터가 없는 성장 전략은 희망 사항에 가깝다.",
  "성장은 운이 아니라 반복 가능한 수치에서 나온다.",
  "데이터는 실패를 줄이고, 성공의 확률을 높인다.",
  "숫자를 이해하는 순간, 사업의 크기가 달라진다.",
]

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { login, sendOtp, verifyOtpAndLogin } = useAuth()
  
  // 탭 상태: 'email' | 'phone'
  const [loginTab, setLoginTab] = useState<'email' | 'phone'>('email')
  
  // 이메일 로그인
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  // 전화번호 OTP 로그인
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)
  const [otpExpiry, setOtpExpiry] = useState(0)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  
  // 명언
  const [currentQuote, setCurrentQuote] = useState("")
  const [fadeIn, setFadeIn] = useState(true)

  // 랜덤 명언 선택
  const getRandomQuote = (excludeCurrent?: string) => {
    let availableQuotes = QUOTES
    if (excludeCurrent) {
      availableQuotes = QUOTES.filter(q => q !== excludeCurrent)
    }
    const randomIndex = Math.floor(Math.random() * availableQuotes.length)
    return availableQuotes[randomIndex]
  }

  // 초기 명언 설정 및 4.5초마다 변경
  useEffect(() => {
    // 초기 명언 설정
    setCurrentQuote(getRandomQuote())

    const interval = setInterval(() => {
      // 페이드 아웃
      setFadeIn(false)
      
      // 0.5초 후 명언 변경 및 페이드 인
      setTimeout(() => {
        setCurrentQuote(prev => getRandomQuote(prev))
        setFadeIn(true)
      }, 500)
    }, 4500)

    return () => clearInterval(interval)
  }, [])

  // OTP 재발송 쿨다운 타이머
  useEffect(() => {
    if (otpCooldown <= 0) return
    const timer = setInterval(() => {
      setOtpCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
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

  // 전화번호 포맷팅 (010-1234-5678)
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
      setOtpCooldown(60) // 60초 재발송 쿨다운
      setOtpExpiry(180)  // 3분 만료
      setOtpCode("")
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

  // OTP 검증 및 로그인
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
      await verifyOtpAndLogin(cleanPhone, otpCode)
      toast({
        title: "✅ 로그인 성공",
        description: "환영합니다!",
      })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await login(email, password)
      
      toast({
        title: "✅ 로그인 성공",
        description: "환영합니다!",
      })
    } catch (error: any) {
      console.error("로그인 오류:", error)
      toast({
        variant: "destructive",
        title: "❌ 로그인 실패",
        description: error.message || "이메일 또는 비밀번호를 확인해주세요.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKakaoLogin = async () => {
    try {
      await startKakaoLogin()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ 카카오 로그인 오류",
        description: error.message,
      })
    }
  }

  const handleNaverLogin = () => {
    try {
      startNaverLogin()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ 네이버 로그인 오류",
        description: error.message,
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50/30 via-green-50/20 to-teal-50/20 p-4 md:p-6 lg:p-8 relative overflow-hidden">
      {/* 배경 장식 요소 - 파스텔 톤 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-lime-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1000ms' }} />
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-teal-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '500ms' }} />
      </div>

      {/* 2열 레이아웃 컨테이너 */}
      <div className="w-full max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* 좌측: 로고 + 명언 + 안심 메시지 */}
          <div className="space-y-4 lg:space-y-8 text-center lg:-mt-16">
            {/* 로고 섹션 */}
            <div className="space-y-4 md:space-y-6">
              <div className="flex justify-center">
                <Image
                  src="/whiplace-logo.svg"
                  alt="WhiPlace"
                  width={900}
                  height={300}
                  priority
                  className="w-full max-w-[200px] md:max-w-[280px] h-auto"
                />
              </div>
              
              {/* 환영 메시지 */}
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                다시 오신 것을 환영합니다
              </h1>

              {/* 명언 */}
              <div className="inline-flex items-start gap-2 md:gap-3 justify-center text-left max-w-lg mx-auto">
                <div className="w-7 h-7 md:w-8 md:h-8 min-w-[28px] md:min-w-[32px] rounded-lg bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center shadow-md -translate-y-[2px] md:-translate-y-[2px]">
                  <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                </div>
                <p 
                  className={`text-sm md:text-base text-gray-800 leading-relaxed font-medium transition-opacity duration-500 ${
                    fadeIn ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {currentQuote}
                </p>
              </div>
            </div>

            {/* 안심 메시지 */}
            <div className="space-y-3 -translate-y-[8px]">
              <div className="flex items-center justify-center gap-2">
                <Check size={16} className="text-emerald-600 flex-shrink-0" strokeWidth={3} />
                <span className="text-sm md:text-base text-gray-700 font-medium">신용카드 등록 불필요</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Check size={16} className="text-teal-600 flex-shrink-0" strokeWidth={3} />
                <span className="text-sm md:text-base text-gray-700 font-medium">간단한 매장 100% 무료</span>
              </div>
            </div>
          </div>

          {/* 우측: 로그인 카드 */}
          <div className="lg:mt-0">
            <Card className="w-full border-2 border-emerald-200/50 shadow-2xl bg-white/95 backdrop-blur-sm">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl md:text-2xl font-bold text-center">
                  로그인
                </CardTitle>
                <CardDescription className="text-center text-sm md:text-base">
                  이메일 또는 소셜 계정으로 로그인하세요
                </CardDescription>
              </CardHeader>
          <CardContent className="space-y-5 md:space-y-6 p-6 md:p-8">
          {/* 로그인 방식 탭 */}
          <div className="flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setLoginTab('email')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all min-h-[44px] ${
                loginTab === 'email'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="w-4 h-4" />
              이메일
            </button>
            <button
              type="button"
              onClick={() => setLoginTab('phone')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all min-h-[44px] ${
                loginTab === 'phone'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Phone className="w-4 h-4" />
              전화번호
            </button>
          </div>

          {/* === 이메일 로그인 폼 === */}
          {loginTab === 'email' && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="flex items-center gap-2 text-sm md:text-base font-semibold text-gray-700">
                    <Mail className="w-4 h-4 text-emerald-500" />
                    이메일
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 md:h-14 text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 rounded-xl transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="flex items-center gap-2 text-sm md:text-base font-semibold text-gray-700">
                      <Lock className="w-4 h-4 text-emerald-500" />
                      비밀번호
                    </label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs md:text-sm text-teal-600 hover:text-teal-700 hover:underline font-medium"
                    >
                      비밀번호를 잊으셨나요?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={8}
                    className="h-12 md:h-14 text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 rounded-xl transition-all"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 md:h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-base md:text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      로그인 중...
                    </>
                  ) : (
                    <>
                      로그인
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            </>
          )}

          {/* === 전화번호 OTP 로그인 폼 === */}
          {loginTab === 'phone' && (
            <div className="space-y-4 md:space-y-5">
              {/* 전화번호 입력 + 발송 버튼 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm md:text-base font-semibold text-gray-700">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  전화번호
                </label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="010-1234-5678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                    maxLength={13}
                    disabled={isSendingOtp || isVerifyingOtp}
                    className="flex-1 h-12 md:h-14 text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 rounded-xl transition-all"
                  />
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || otpCooldown > 0 || phoneNumber.replace(/[^\d]/g, '').length !== 11}
                    className="h-12 md:h-14 px-4 md:px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-md whitespace-nowrap text-sm"
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

              {/* OTP 입력 (발송 후 표시) */}
              {otpSent && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm md:text-base font-semibold text-gray-700">
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
                    placeholder="6자리 인증코드 입력"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                    maxLength={6}
                    disabled={isVerifyingOtp}
                    className="h-12 md:h-14 text-base text-center tracking-[0.3em] font-bold border-2 border-emerald-100 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 rounded-xl transition-all"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-yellow-500" />
                    카카오톡으로 발송된 인증코드를 입력해주세요
                  </p>
                </div>
              )}

              {/* 로그인 버튼 */}
              <Button
                type="button"
                onClick={handleVerifyOtp}
                className="w-full h-12 md:h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-base md:text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                disabled={!otpSent || otpCode.length !== 6 || isVerifyingOtp}
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    인증 중...
                  </>
                ) : (
                  <>
                    로그인
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              {/* 신규 가입 안내 */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-xs text-emerald-700 text-center leading-relaxed">
                  💡 처음 이용하시나요? 전화번호로 인증하면<br />
                  <strong>자동으로 계정이 생성</strong>됩니다.
                </p>
              </div>
            </div>
          )}

          {/* 구분선 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t-2 border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs md:text-sm uppercase">
              <span className="bg-white px-3 md:px-4 text-gray-500 font-semibold">
                또는
              </span>
            </div>
          </div>

          {/* 소셜 로그인 버튼 */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 md:h-14 bg-[#FEE500] hover:bg-[#FDD835] text-black border-0 text-base md:text-lg font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
              onClick={handleKakaoLogin}
              disabled={isLoading}
            >
              <svg className="mr-2 h-5 w-5 md:h-6 md:w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3zm5.907 8.06l1.47-1.424a.472.472 0 0 0-.656-.678l-1.928 1.866V9.282a.472.472 0 0 0-.944 0v2.557a.471.471 0 0 0 0 .222V13.5a.472.472 0 0 0 .944 0v-1.363l.427-.413 1.428 2.033a.472.472 0 1 0 .773-.544l-1.514-2.153zm-2.958 1.924h-1.46V9.297a.472.472 0 0 0-.943 0v4.159c0 .26.21.472.471.472h1.932a.472.472 0 1 0 0-.944zm-5.857-1.092l.696-1.707.638 1.707H9.092zm2.523.488l.002-.016a.469.469 0 0 0-.127-.32l-1.046-2.8a.69.69 0 0 0-.627-.474.69.69 0 0 0-.627.474l-1.063 2.839a.469.469 0 0 0 .874.327l.218-.581h1.978l.218.581a.469.469 0 0 0 .874-.327l.002-.016-.002.016.326-.103zm-4.347.613a.472.472 0 0 0 .472-.472V9.297a.472.472 0 1 0-.944 0v2.623H5.577a.472.472 0 1 0 0 .944h2.219c.26 0 .472-.212.472-.472z"/>
              </svg>
              카카오로 시작하기
            </Button>

            {/* 네이버 로그인 - 추후 오픈 예정
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 md:h-14 bg-[#03C75A] hover:bg-[#02B350] text-white border-0 text-base md:text-lg font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
              onClick={handleNaverLogin}
              disabled={isLoading}
            >
              <svg className="mr-2 h-5 w-5 md:h-6 md:w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727z"/>
              </svg>
              네이버로 시작하기
            </Button>
            */}
          </div>

          {/* 회원가입 링크 */}
          <div className="text-center pt-2">
            <p className="text-sm md:text-base text-gray-600">
              계정이 없으신가요?{" "}
              <Link
                href="/signup"
                className="text-teal-600 hover:text-teal-700 hover:underline font-bold"
              >
                회원가입
              </Link>
            </p>
          </div>
        </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
