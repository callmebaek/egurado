'use client'

/**
 * 이메일 확인 콜백 페이지
 * Supabase에서 이메일 인증 후 리다이렉트되는 페이지
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export const dynamic = 'force-dynamic'

export default function ConfirmEmailPage() {
  const router = useRouter()
  const { confirmEmail } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (isProcessing) return
    setIsProcessing(true)

    const handleEmailConfirmation = async () => {
      try {
        // URL 해시에서 토큰 추출
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const type = hashParams.get('type')
        const error = hashParams.get('error')
        const errorDescription = hashParams.get('error_description')

        // 에러가 있는 경우
        if (error) {
          throw new Error(errorDescription || error)
        }

        // 이메일 확인 타입인지 확인
        if (type === 'signup' && accessToken) {
          // Supabase에서 제공하는 access_token을 사용하여 사용자 정보 가져오기
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              }
            }
          )

          if (!response.ok) {
            throw new Error('사용자 정보를 가져올 수 없습니다')
          }

          const userData = await response.json()
          const userId = userData.id
          const email = userData.email
          const displayName = userData.user_metadata?.display_name

          // 백엔드에 프로필 생성 요청
          await confirmEmail(userId, email, displayName)

          setStatus('success')
          setMessage('이메일 인증이 완료되었습니다!')

          // 3초 후 온보딩 페이지로 이동 (confirmEmail 함수가 이미 리다이렉트하지만 안전장치)
          setTimeout(() => {
            // confirmEmail 내부에서 이미 리다이렉트되지만, 만약을 대비
          }, 3000)
        } else {
          throw new Error('유효하지 않은 인증 링크입니다')
        }
      } catch (error: any) {
        console.error('이메일 확인 오류:', error)
        setStatus('error')
        setMessage(error.message || '이메일 인증에 실패했습니다')
      } finally {
        setIsProcessing(false)
      }
    }

    // 약간의 지연 후 실행 (URL 해시가 제대로 로드되도록)
    const timer = setTimeout(() => {
      handleEmailConfirmation()
    }, 100)

    return () => clearTimeout(timer)
  }, [confirmEmail, router, isProcessing])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-white rounded-full flex items-center justify-center">
            {status === 'loading' && (
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="w-8 h-8 text-red-600" />
            )}
          </div>

          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && '⏳ 이메일 확인 중...'}
            {status === 'success' && '✅ 이메일 인증 완료!'}
            {status === 'error' && '❌ 이메일 인증 실패'}
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center">
          {status === 'loading' && (
            <div className="space-y-2">
              <p className="text-gray-600">잠시만 기다려주세요...</p>
              <div className="flex justify-center gap-1 mt-4">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <p className="text-lg text-gray-900 font-medium">{message}</p>
              <p className="text-sm text-gray-600">
                곧 온보딩 페이지로 이동합니다...
              </p>
              <div className="pt-4">
                <div className="inline-block px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
                  🎉 회원가입이 완료되었습니다!
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-gray-900">{message}</p>
              <div className="pt-4">
                <button
                  onClick={() => router.push('/signup')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  다시 회원가입하기
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
