"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Mail, Lock, Sparkles, ArrowRight, Check } from "lucide-react"
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
  const { login } = useAuth()
  
  // 이메일 로그인
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
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
    setCurrentQuote(getRandomQuote())

    const interval = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setCurrentQuote(prev => getRandomQuote(prev))
        setFadeIn(true)
      }, 500)
    }, 4500)

    return () => clearInterval(interval)
  }, [])

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50/30 via-green-50/20 to-teal-50/20 p-4 md:p-6 lg:p-8 relative overflow-hidden">
      {/* 배경 장식 요소 */}
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
              
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                다시 오신 것을 환영합니다
              </h1>

              <div className="inline-flex items-start gap-2 md:gap-3 justify-center text-left max-w-lg mx-auto">
                <div className="w-7 h-7 md:w-8 md:h-8 min-w-[28px] md:min-w-[32px] rounded-lg bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center shadow-md -translate-y-[2px]">
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
                  이메일과 비밀번호로 로그인하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 md:space-y-6 p-6 md:p-8">
                {/* 이메일 로그인 폼 */}
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
                    <label htmlFor="password" className="flex items-center gap-2 text-sm md:text-base font-semibold text-gray-700">
                      <Lock className="w-4 h-4 text-emerald-500" />
                      비밀번호
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
                      className="h-12 md:h-14 text-base border-2 border-emerald-100 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 rounded-xl transition-all"
                    />
                  </div>

                  {/* 아이디 찾기 / 비밀번호 찾기 */}
                  <div className="flex items-center justify-center gap-3 text-sm">
                    <Link
                      href="/find-id"
                      className="text-teal-600 hover:text-teal-700 hover:underline font-medium"
                    >
                      아이디 찾기
                    </Link>
                    <span className="text-gray-300">|</span>
                    <Link
                      href="/find-password"
                      className="text-teal-600 hover:text-teal-700 hover:underline font-medium"
                    >
                      비밀번호 찾기
                    </Link>
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

                {/* 구분선 */}
                {/* 소셜 로그인 - 임시 숨김 처리 */}
                {/* <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t-2 border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs md:text-sm uppercase">
                    <span className="bg-white px-3 md:px-4 text-gray-500 font-semibold">
                      또는
                    </span>
                  </div>
                </div>
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
                </div> */}

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
