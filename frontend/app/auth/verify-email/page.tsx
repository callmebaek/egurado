'use client'

/**
 * 이메일 확인 대기 페이지
 * 회원가입 후 이메일 인증을 기다리는 페이지
 */
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Inbox, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

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
            회원가입을 완료하려면 이메일 인증이 필요합니다
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 이메일 주소 표시 */}
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">인증 이메일 발송 완료</p>
            <p className="text-lg font-semibold text-gray-900 break-all">
              {email || '등록하신 이메일'}
            </p>
          </div>

          {/* 안내 메시지 */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Inbox className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">📬 이메일을 확인하세요</p>
                <p>
                  위 이메일로 인증 메일을 발송했습니다. 
                  이메일의 <strong>"이메일 확인"</strong> 버튼을 클릭하여 
                  회원가입을 완료해주세요.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">⚠️ 이메일이 오지 않았나요?</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>스팸 메일함을 확인해보세요</li>
                  <li>이메일 주소가 올바른지 확인해보세요</li>
                  <li>몇 분 정도 기다려보세요</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 도움말 */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              이메일 확인 후 자동으로 로그인됩니다
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
