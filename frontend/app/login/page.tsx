"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { startKakaoLogin, startNaverLogin } from "@/lib/social-login"
import { Noto_Serif_KR } from 'next/font/google'

const notoSerifKR = Noto_Serif_KR({ 
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
})

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
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="w-full max-w-md space-y-6">
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-6">
              <Image
                src="/whiplace-logo.svg"
                alt="WhiPlace"
                width={900}
                height={300}
                priority
                className="w-full max-w-xs h-auto"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
          {/* 이메일 로그인 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
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
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  비밀번호
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
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
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                "로그인"
              )}
            </Button>
          </form>

          {/* 구분선 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">
                또는
              </span>
            </div>
          </div>

          {/* 소셜 로그인 버튼 */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full bg-[#FEE500] hover:bg-[#FDD835] text-black border-0"
              onClick={handleKakaoLogin}
              disabled={isLoading}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3zm5.907 8.06l1.47-1.424a.472.472 0 0 0-.656-.678l-1.928 1.866V9.282a.472.472 0 0 0-.944 0v2.557a.471.471 0 0 0 0 .222V13.5a.472.472 0 0 0 .944 0v-1.363l.427-.413 1.428 2.033a.472.472 0 1 0 .773-.544l-1.514-2.153zm-2.958 1.924h-1.46V9.297a.472.472 0 0 0-.943 0v4.159c0 .26.21.472.471.472h1.932a.472.472 0 1 0 0-.944zm-5.857-1.092l.696-1.707.638 1.707H9.092zm2.523.488l.002-.016a.469.469 0 0 0-.127-.32l-1.046-2.8a.69.69 0 0 0-.627-.474.69.69 0 0 0-.627.474l-1.063 2.839a.469.469 0 0 0 .874.327l.218-.581h1.978l.218.581a.469.469 0 0 0 .874-.327l.002-.016-.002.016.326-.103zm-4.347.613a.472.472 0 0 0 .472-.472V9.297a.472.472 0 1 0-.944 0v2.623H5.577a.472.472 0 1 0 0 .944h2.219c.26 0 .472-.212.472-.472z"/>
              </svg>
              카카오로 시작하기
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full bg-[#03C75A] hover:bg-[#02B350] text-white border-0"
              onClick={handleNaverLogin}
              disabled={isLoading}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727z"/>
              </svg>
              네이버로 시작하기
            </Button>
          </div>

          {/* 회원가입 링크 */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              계정이 없으신가요?{" "}
              <Link
                href="/signup"
                className="text-primary hover:underline font-medium"
              >
                회원가입
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 명언 */}
      <div className="text-center px-4">
        <p 
          className={`${notoSerifKR.className} text-lg sm:text-xl text-gray-700 leading-relaxed transition-opacity duration-500 ${
            fadeIn ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ 
            minHeight: '3rem'
          }}
        >
          &ldquo;{currentQuote}&rdquo;
        </p>
      </div>
      </div>
    </div>
  )
}
