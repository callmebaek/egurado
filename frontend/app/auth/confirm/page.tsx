"use client"

/**
 * 이메일 인증 확인 페이지
 * Supabase에서 이메일 인증 링크를 클릭하면 이 페이지로 리다이렉트됨
 */
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

// 동적 렌더링 강제
export const dynamic = 'force-dynamic'

export default function ConfirmEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { confirmEmail } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('이메일 인증을 처리 중입니다...')

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // URL 해시에서 토큰 추출 (Supabase는 #access_token=... 형식으로 전달)
        const hash = window.location.hash
        if (!hash) {
          throw new Error('인증 토큰이 없습니다')
        }

        // 해시에서 토큰 파싱
        const params = new URLSearchParams(hash.substring(1)) // '#' 제거
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (!accessToken) {
          throw new Error('유효하지 않은 인증 링크입니다')
        }

        // Supabase 세션 설정
        const { data: { user }, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        })

        if (error || !user) {
          throw new Error('이메일 인증에 실패했습니다')
        }

        console.log('[이메일 인증] 사용자 확인됨:', user.id, user.email)

        // 백엔드에 프로필 생성 요청
        await confirmEmail(
          user.id,
          user.email || '',
          user.user_metadata?.display_name
        )

        setStatus('success')
        setMessage('이메일 인증이 완료되었습니다! 온보딩 페이지로 이동합니다...')

        // 3초 후 온보딩 페이지로 이동 (confirmEmail이 자동으로 처리)
        setTimeout(() => {
          // confirmEmail 함수가 이미 리다이렉트를 처리하므로 여기서는 추가 처리 불필요
        }, 2000)

      } catch (error: any) {
        console.error('[이메일 인증 오류]', error)
        setStatus('error')
        setMessage(error.message || '이메일 인증 중 오류가 발생했습니다')

        // 5초 후 로그인 페이지로 이동
        setTimeout(() => {
          router.push('/login')
        }, 5000)
      }
    }

    handleEmailConfirmation()
  }, [confirmEmail, router])

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
            {status === 'loading' && (
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-16 h-16 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="w-16 h-16 text-red-500" />
            )}
          </div>
          <CardTitle className="text-2xl text-center">
            {status === 'loading' && '이메일 인증 중...'}
            {status === 'success' && '인증 완료!'}
            {status === 'error' && '인증 실패'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600">{message}</p>
        </CardContent>
      </Card>
    </div>
  )
}
