"use client"

import { useState } from "react"
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

// 동적 렌더링 강제
export const dynamic = 'force-dynamic'

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { signup } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== passwordConfirm) {
      toast({
        variant: "destructive",
        title: "❌ 비밀번호 불일치",
        description: "비밀번호가 일치하지 않습니다.",
      })
      return
    }

    if (!agreed) {
      toast({
        variant: "destructive",
        title: "❌ 약관 동의 필요",
        description: "개인정보 수집 및 이용에 동의해주세요.",
      })
      return
    }

    setIsLoading(true)

    try {
      await signup(email, password, displayName || undefined)
      
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
      toast({
        variant: "destructive",
        title: "❌ 약관 동의 필요",
        description: "개인정보 수집 및 이용에 동의해주세요.",
      })
      return
    }

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
    if (!agreed) {
      toast({
        variant: "destructive",
        title: "❌ 약관 동의 필요",
        description: "개인정보 수집 및 이용에 동의해주세요.",
      })
      return
    }

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
      <Card className="w-full max-w-md">
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
        <CardContent className="space-y-4">
          {/* 소셜 회원가입 버튼 */}
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
              카카오로 3초만에 시작하기
            </Button>

            {/* 네이버 로그인 - 추후 오픈 예정
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
              네이버로 3초만에 시작하기
            </Button>
            */}
          </div>

          {/* 구분선 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">
                또는 이메일로 가입
              </span>
            </div>
          </div>

          {/* 이메일 회원가입 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
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
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium">
                이름 (선택)
              </label>
              <Input
                id="displayName"
                type="text"
                placeholder="홍길동"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
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
              />
              <p className="text-xs text-muted-foreground">
                최소 8자 이상 입력해주세요
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="passwordConfirm" className="text-sm font-medium">
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
              />
            </div>

            {/* 약관 동의 */}
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1"
                disabled={isLoading}
              />
              <label htmlFor="agree" className="text-sm leading-tight">
                <span className="text-red-500">*</span> [필수] 개인정보 수집 및 이용에 동의합니다.
                <br />
                <span className="text-xs text-muted-foreground">
                  (수집 항목: 이메일, 이름 / 이용 목적: 서비스 제공 및 고객 분석)
                </span>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                "회원가입"
              )}
            </Button>
          </form>

          {/* 로그인 링크 */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link
                href="/login"
                className="text-primary hover:underline font-medium"
              >
                로그인
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
