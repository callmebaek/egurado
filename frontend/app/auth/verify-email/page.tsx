"use client"

/**
 * 이메일 인증 대기 페이지
 * 회원가입 후 이메일 확인을 기다리는 페이지
 */
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mail, ArrowLeft, Loader2 } from "lucide-react"

// 동적 렌더링 강제
export const dynamic = 'force-dynamic'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || ''

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
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
              <Mail className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">이메일을 확인해주세요</CardTitle>
          <CardDescription className="text-center">
            회원가입이 거의 완료되었습니다!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-700">
              <strong className="text-blue-700">{email}</strong> 로 인증 이메일을 발송했습니다.
            </p>
            <p className="text-sm text-gray-600">
              이메일의 <strong>인증 링크</strong>를 클릭하시면 회원가입이 완료됩니다.
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

          <p className="text-xs text-center text-gray-500">
            이메일 인증 후 로그인하시면 모든 기능을 이용하실 수 있습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </CardContent>
        </Card>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
