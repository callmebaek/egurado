"use client"

/**
 * 비밀번호 재설정 페이지
 * 이메일에서 링크를 클릭하면 이 페이지로 리다이렉트되어 새 비밀번호 설정
 */
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, CheckCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"

// 동적 렌더링 강제
export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)

  useEffect(() => {
    // URL 해시에서 토큰 확인
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      setIsValidToken(true)
    } else {
      toast({
        variant: "destructive",
        title: "❌ 유효하지 않은 링크",
        description: "비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다.",
      })
      setTimeout(() => {
        router.push('/auth/forgot-password')
      }, 3000)
    }
  }, [router, toast])

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

    if (password.length < 8) {
      toast({
        variant: "destructive",
        title: "❌ 비밀번호가 너무 짧습니다",
        description: "비밀번호는 최소 8자 이상이어야 합니다.",
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setIsSuccess(true)
      toast({
        title: "✅ 비밀번호 변경 완료",
        description: "새로운 비밀번호로 로그인해주세요.",
      })

      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (error: any) {
      console.error("비밀번호 재설정 오류:", error)
      toast({
        variant: "destructive",
        title: "❌ 오류 발생",
        description: error.message || "비밀번호 변경에 실패했습니다.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">유효하지 않은 링크입니다...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-6">
              <Image
                src="/whiplace-logo.png"
                alt="WhiPlace"
                width={180}
                height={60}
                priority
                className="w-full max-w-[200px] h-auto"
              />
            </div>
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-center">비밀번호 변경 완료!</CardTitle>
            <CardDescription className="text-center">
              로그인 페이지로 이동합니다...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-6">
            <Image
              src="/whiplace-logo.svg"
              alt="WhiPlace"
              width={180}
              height={60}
              priority
              className="w-full max-w-[200px] h-auto"
            />
          </div>
          <CardTitle className="text-2xl text-center">새 비밀번호 설정</CardTitle>
          <CardDescription className="text-center">
            새로운 비밀번호를 입력해주세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="새 비밀번호 (최소 8자)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                placeholder="비밀번호 확인"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={isLoading}
                required
                minLength={8}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-gray-600">
                💡 <strong>안전한 비밀번호:</strong> 8자 이상, 영문/숫자/특수문자 조합 권장
              </p>
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
                "비밀번호 변경"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
