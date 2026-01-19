"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isSignUp) {
        // 회원가입
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        if (data.user) {
          // 프로필 생성
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              email: data.user.email,
              subscription_tier: "free",
            })

          if (profileError) {
            console.error("Profile creation error:", profileError)
          }

          toast({
            variant: "success",
            title: "✅ 회원가입 완료",
            description: "로그인되었습니다!",
          })

          router.push("/dashboard")
        }
      } else {
        // 로그인
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        toast({
          variant: "success",
          title: "✅ 로그인 성공",
          description: "대시보드로 이동합니다.",
        })

        router.push("/dashboard")
      }
    } catch (error: any) {
      console.error("Auth error:", error)
      toast({
        variant: "destructive",
        title: "❌ 오류 발생",
        description: error.message || "인증에 실패했습니다.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-olive-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Whiplace
          </CardTitle>
          <CardDescription className="text-center">
            {isSignUp
              ? "새 계정을 만들어주세요"
              : "계정에 로그인하세요"}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <label htmlFor="password" className="text-sm font-medium">
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
                minLength={6}
              />
              {isSignUp && (
                <p className="text-xs text-muted-foreground">
                  최소 6자 이상 입력해주세요
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리중...
                </>
              ) : isSignUp ? (
                "회원가입"
              ) : (
                "로그인"
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary hover:underline"
                disabled={isLoading}
              >
                {isSignUp
                  ? "이미 계정이 있으신가요? 로그인"
                  : "계정이 없으신가요? 회원가입"}
              </button>
            </div>
          </form>

          {/* 개발용 테스트 계정 안내 */}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 font-semibold mb-1">
              💡 개발 테스트용
            </p>
            <p className="text-xs text-gray-500">
              이메일: test@whiplace.com<br />
              비밀번호: test123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
