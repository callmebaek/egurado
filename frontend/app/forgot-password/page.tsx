'use client'

/**
 * 비밀번호 재설정 요청 페이지
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || '비밀번호 재설정 요청에 실패했습니다')
      }

      setEmailSent(true)
      toast({
        title: "✅ 이메일 발송 완료",
        description: "비밀번호 재설정 링크를 이메일로 보냈습니다.",
      })
    } catch (error: any) {
      console.error('비밀번호 재설정 오류:', error)
      toast({
        variant: "destructive",
        title: "❌ 요청 실패",
        description: error.message || "비밀번호 재설정 요청 처리 중 오류가 발생했습니다.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">
              이메일을 확인해주세요
            </CardTitle>
            <CardDescription>
              비밀번호 재설정 링크를 보냈습니다
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 이메일 주소 표시 */}
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">이메일 발송 완료</p>
              <p className="text-lg font-semibold text-gray-900 break-all">
                {email}
              </p>
            </div>

            {/* 안내 메시지 */}
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  📬 이메일의 <strong>"비밀번호 재설정"</strong> 링크를 클릭하여 
                  새로운 비밀번호를 설정해주세요.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>이메일이 오지 않았나요?</strong>
                </p>
                <ul className="text-sm text-yellow-800 mt-2 ml-4 list-disc space-y-1">
                  <li>스팸 메일함을 확인해보세요</li>
                  <li>이메일 주소가 올바른지 확인해보세요</li>
                  <li>몇 분 정도 기다려보세요</li>
                </ul>
              </div>
            </div>

            {/* 버튼 */}
            <div className="space-y-2">
              <Button
                onClick={() => router.push('/login')}
                className="w-full"
                variant="default"
              >
                로그인 페이지로 돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/login')}
            className="w-fit -ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            로그인으로 돌아가기
          </Button>
          <CardTitle className="text-2xl font-bold text-center">
            비밀번호 재설정
          </CardTitle>
          <CardDescription className="text-center">
            가입하신 이메일 주소를 입력해주세요
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
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                비밀번호 재설정 링크를 이메일로 보내드립니다
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
                  전송 중...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  재설정 링크 받기
                </>
              )}
            </Button>
          </form>

          {/* 도움말 */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              계정이 없으신가요?{' '}
              <a href="/signup" className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                회원가입
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
