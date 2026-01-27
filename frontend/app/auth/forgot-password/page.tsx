"use client"

/**
 * 비밀번호 찾기 페이지
 * 이메일을 입력하면 비밀번호 재설정 이메일 발송
 */
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, ArrowLeft, Mail } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"

// 동적 렌더링 강제
export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast({
        variant: "destructive",
        title: "❌ 이메일 입력 필요",
        description: "이메일을 입력해주세요.",
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      setEmailSent(true)
      toast({
        title: "✅ 이메일 발송 완료",
        description: "비밀번호 재설정 링크를 이메일로 발송했습니다.",
      })
    } catch (error: any) {
      console.error("비밀번호 재설정 요청 오류:", error)
      toast({
        variant: "destructive",
        title: "❌ 오류 발생",
        description: error.message || "비밀번호 재설정 요청에 실패했습니다.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
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
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <Mail className="w-10 h-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">이메일을 확인해주세요</CardTitle>
            <CardDescription className="text-center">
              비밀번호 재설정 링크를 발송했습니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-700">
                <strong className="text-green-700">{email}</strong> 로 비밀번호 재설정 이메일을 발송했습니다.
              </p>
              <p className="text-sm text-gray-600">
                이메일의 링크를 클릭하여 새로운 비밀번호를 설정해주세요.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">이메일이 오지 않나요?</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>스팸 메일함을 확인해주세요</li>
                <li>이메일 주소가 정확한지 확인해주세요</li>
                <li>몇 분 정도 시간이 걸릴 수 있습니다</li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <Link href="/login" className="block">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  로그인 페이지로 돌아가기
                </Button>
              </Link>
            </div>
          </CardContent>
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
          <CardTitle className="text-2xl text-center">비밀번호 찾기</CardTitle>
          <CardDescription className="text-center">
            가입하신 이메일을 입력해주세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
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
                  처리 중...
                </>
              ) : (
                "비밀번호 재설정 이메일 발송"
              )}
            </Button>

            <div className="text-center pt-4 border-t">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-primary inline-flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                로그인으로 돌아가기
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
