'use client'

/**
 * 비밀번호 재설정 완료 페이지
 * 이메일 링크를 클릭하면 이 페이지로 리다이렉트됨
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // URL 해시에서 access_token 추출
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const token = hashParams.get('access_token')
    const type = hashParams.get('type')
    const error = hashParams.get('error')

    if (error) {
      toast({
        variant: "destructive",
        title: "❌ 링크 오류",
        description: "비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다.",
      })
      setIsVerifying(false)
      return
    }

    if (type === 'recovery' && token) {
      setAccessToken(token)
      setIsVerifying(false)
    } else {
      toast({
        variant: "destructive",
        title: "❌ 잘못된 접근",
        description: "올바른 비밀번호 재설정 링크가 아닙니다.",
      })
      setTimeout(() => {
        router.push('/forgot-password')
      }, 3000)
    }
  }, [router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "❌ 비밀번호 불일치",
        description: "비밀번호가 일치하지 않습니다.",
      })
      return
    }

    if (newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "❌ 비밀번호 길이 오류",
        description: "비밀번호는 최소 8자 이상이어야 합니다.",
      })
      return
    }

    if (!accessToken) {
      toast({
        variant: "destructive",
        title: "❌ 토큰 오류",
        description: "유효한 인증 토큰이 없습니다.",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          new_password: newPassword,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || '비밀번호 재설정에 실패했습니다')
      }

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
      console.error('비밀번호 재설정 오류:', error)
      toast({
        variant: "destructive",
        title: "❌ 재설정 실패",
        description: error.message || "비밀번호 재설정 처리 중 오류가 발생했습니다.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">링크를 확인하는 중...</p>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">
              비밀번호 변경 완료!
            </CardTitle>
            <CardDescription>
              새로운 비밀번호로 로그인할 수 있습니다
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✅ 비밀번호가 성공적으로 변경되었습니다.
              </p>
            </div>
            <p className="text-sm text-gray-600">
              잠시 후 로그인 페이지로 이동합니다...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold">
              유효하지 않은 링크
            </CardTitle>
            <CardDescription>
              비밀번호 재설정 링크가 만료되었거나 잘못되었습니다
            </CardDescription>
          </CardHeader>

          <CardContent className="text-center space-y-4">
            <Button
              onClick={() => router.push('/forgot-password')}
              className="w-full"
            >
              다시 요청하기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            새 비밀번호 설정
          </CardTitle>
          <CardDescription className="text-center">
            새로운 비밀번호를 입력해주세요
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium">
                새 비밀번호
              </label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
              />
              <p className="text-xs text-gray-500">
                최소 8자 이상 입력해주세요
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                비밀번호 확인
              </label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  변경 중...
                </>
              ) : (
                "비밀번호 변경"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <button
              onClick={() => router.push('/login')}
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >
              로그인 페이지로 돌아가기
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
