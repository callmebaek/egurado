"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

// 동적 렌더링 강제 (빌드 타임 prerender 방지)
export const dynamic = 'force-dynamic'

function NaverCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithNaver } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // 중복 실행 방지
    if (isProcessing) return

    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const errorParam = searchParams.get("error")

    if (errorParam) {
      setError("네이버 로그인이 취소되었습니다.")
      setTimeout(() => router.push("/login"), 2000)
      return
    }

    if (!code || !state) {
      setError("인증 정보가 없습니다.")
      setTimeout(() => router.push("/login"), 2000)
      return
    }

    // state 검증 (CSRF 방지)
    const savedState = sessionStorage.getItem("naver_state")
    if (savedState !== state) {
      setError("잘못된 요청입니다.")
      setTimeout(() => router.push("/login"), 2000)
      return
    }

    // 네이버 로그인 처리 (1회만 실행)
    setIsProcessing(true)
    loginWithNaver(code, state).catch((err) => {
      console.error("네이버 로그인 오류:", err)
      setError(err.message || "네이버 로그인에 실패했습니다.")
      setTimeout(() => router.push("/login"), 2000)
    })
  }, [searchParams, loginWithNaver, router, isProcessing])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <div className="text-4xl">❌</div>
            <h2 className="text-xl font-semibold text-gray-800">{error}</h2>
            <p className="text-gray-600">로그인 페이지로 돌아갑니다...</p>
          </>
        ) : (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-green-500" />
            <h2 className="text-xl font-semibold text-gray-800">네이버 로그인 처리 중...</h2>
            <p className="text-gray-600">잠시만 기다려주세요</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function NaverCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-green-500" />
          <h2 className="text-xl font-semibold text-gray-800">로딩 중...</h2>
        </div>
      </div>
    }>
      <NaverCallbackContent />
    </Suspense>
  )
}
