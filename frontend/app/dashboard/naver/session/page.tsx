"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useStores } from "@/lib/hooks/useStores"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { Loader2, CheckCircle, XCircle, RefreshCw, Trash2, AlertCircle, Download, Chrome, ExternalLink, Store as StoreIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { API_BASE_URL } from "@/lib/config"

interface SessionStatus {
  has_session: boolean
  is_valid: boolean
  expires_at: string | null
  days_remaining: number | null
}

export default function NaverSessionPage() {
  const { stores, hasStores, isLoading: storesLoading } = useStores()
  
  const [selectedStoreId, setSelectedStoreId] = useState<string>("")
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)

  // 세션 상태 확인
  const checkSession = async (storeId: string) => {
    if (!storeId) return

    setIsChecking(true)
    setMessage(null)

    try {
      console.log("🔍 세션 확인 시작:", storeId)
      
      const response = await fetch(`${API_BASE_URL}/api/v1/naver-session/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ store_id: storeId })
      })

      console.log("📡 세션 확인 응답 상태:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("❌ 세션 확인 실패:", errorData)
        throw new Error(errorData.detail || "세션 확인 실패")
      }

      const data = await response.json()
      console.log("✅ 세션 확인 결과:", data)
      setSessionStatus(data)
      
    } catch (err: any) {
      console.error("💥 세션 확인 에러:", err)
      setMessage({ type: "error", text: err.message || "세션 확인 중 오류가 발생했습니다" })
    } finally {
      setIsChecking(false)
    }
  }

  // 세션 삭제
  const deleteSession = async () => {
    if (!selectedStoreId) return
    
    if (!confirm("네이버 세션을 삭제하시겠습니까?")) {
      return
    }

    setIsDeleting(true)
    setMessage(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/naver-session/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ store_id: selectedStoreId })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || "세션 삭제 실패")
      }

      setMessage({ type: "success", text: "세션이 삭제되었습니다" })
      setSessionStatus(null)
      
      // 세션 상태 재확인
      setTimeout(() => checkSession(selectedStoreId), 500)
      
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "세션 삭제 중 오류가 발생했습니다" })
    } finally {
      setIsDeleting(false)
    }
  }

  // 매장 변경 시 세션 확인
  useEffect(() => {
    if (selectedStoreId) {
      checkSession(selectedStoreId)
    } else {
      setSessionStatus(null)
    }
  }, [selectedStoreId])

  if (storesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">매장 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!hasStores) {
    return <EmptyStoreMessage />
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10">
      {/* 헤더 섹션 - 홈페이지 스타일 */}
      <header className="mb-8 md:mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
            <Chrome className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight">
            네이버 로그인 세션 관리
          </h1>
        </div>
        <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-3xl mx-auto mb-4">
          AI 답글 생성 기능을 사용하려면<br className="md:hidden" />
          <span className="hidden md:inline"> </span>네이버 스마트플레이스 로그인이 필요합니다
        </p>
        <Badge 
          variant="secondary"
          className="bg-indigo-100 text-indigo-700 border-indigo-200 px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
        >
          🔐 로그인 세션
        </Badge>
      </header>

      {/* 메시지 */}
      {message && (
        <Card className={`p-3 md:p-4 shadow-sm flex items-start gap-2 md:gap-3 ${
          message.type === "success" 
            ? "bg-green-50 border-green-200" 
            : "bg-red-50 border-red-200"
        }`}>
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-red-600 mt-0.5 flex-shrink-0" />
          )}
          <p className={`text-sm md:text-base ${message.type === "success" ? "text-green-800" : "text-red-800"}`}>
            {message.text}
          </p>
        </Card>
      )}

      {/* 매장 선택 */}
      <Card className="p-4 md:p-6 shadow-sm border-neutral-200">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">매장 선택</label>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger className="h-12">
                {selectedStoreId && stores.find(s => s.id === selectedStoreId) ? (
                  <div className="flex items-center gap-2">
                    {(stores.find(s => s.id === selectedStoreId) as any)?.thumbnail ? (
                      <img src={(stores.find(s => s.id === selectedStoreId) as any).thumbnail} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-md bg-neutral-100 flex items-center justify-center flex-shrink-0">
                        <StoreIcon className="w-4 h-4 text-neutral-400" />
                      </div>
                    )}
                    <span className="text-sm truncate">{stores.find(s => s.id === selectedStoreId)?.store_name || (stores.find(s => s.id === selectedStoreId) as any)?.name || '매장'}</span>
                  </div>
                ) : (
                  <SelectValue placeholder="매장을 선택하세요" />
                )}
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id} className="py-2">
                    <div className="flex items-center gap-2">
                      {(store as any).thumbnail ? (
                        <img src={(store as any).thumbnail} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-md bg-neutral-100 flex items-center justify-center flex-shrink-0">
                          <StoreIcon className="w-4 h-4 text-neutral-400" />
                        </div>
                      )}
                      <span className="truncate">{store.store_name || (store as any).name || '매장'}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 세션 상태 */}
          {selectedStoreId && (
            <div className="border-t border-neutral-200 pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-neutral-900">세션 상태</h3>
                <Button
                  onClick={() => checkSession(selectedStoreId)}
                  disabled={isChecking}
                  variant="outline"
                  size="sm"
                >
                  {isChecking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {sessionStatus && (
                <div className="space-y-2 md:space-y-3">
                  {/* 세션 존재 여부 */}
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <span className="text-sm text-neutral-700">로그인 상태</span>
                    {sessionStatus.has_session && sessionStatus.is_valid ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        로그인됨
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">
                        <XCircle className="h-3 w-3 mr-1" />
                        로그인 필요
                      </Badge>
                    )}
                  </div>

                  {/* 만료 정보 */}
                  {sessionStatus.has_session && sessionStatus.is_valid && sessionStatus.days_remaining !== null && (
                    <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                      <span className="text-sm text-neutral-700">남은 기간</span>
                      <span className="text-sm font-semibold text-neutral-900">
                        {sessionStatus.days_remaining}일
                      </span>
                    </div>
                  )}

                  {/* 세션 삭제 버튼 */}
                  {sessionStatus.has_session && (
                    <Button
                      onClick={deleteSession}
                      disabled={isDeleting}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          삭제 중...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          세션 삭제
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Chrome 확장 프로그램 안내 */}
      {selectedStoreId && (
        <Card className="p-4 md:p-6 shadow-sm border-neutral-200">
          <div className="space-y-4 md:space-y-6">
            {/* 헤더 */}
            <div className="flex items-start gap-2 md:gap-3">
              <Chrome className="h-6 w-6 md:h-8 md:w-8 text-blue-600 mt-0.5 md:mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-lg md:text-xl font-semibold text-neutral-900 mb-1 md:mb-2">
                  Chrome 확장 프로그램으로 간편 로그인
                </h2>
                <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
                  Chrome 확장 프로그램을 설치하면 버튼 클릭 한 번으로 네이버 세션을 저장할 수 있습니다
                </p>
              </div>
            </div>

            {/* 설치 방법 */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 md:p-6">
              <h3 className="font-semibold text-blue-900 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
                <Download className="h-4 w-4 md:h-5 md:w-5" />
                설치 방법 (3분 소요)
              </h3>
              
              <div className="space-y-3 md:space-y-4">
                {/* Step 1 */}
                <div className="bg-white rounded-lg p-3 md:p-4">
                  <p className="font-medium text-neutral-900 mb-1.5 md:mb-2 text-sm md:text-base">
                    1️⃣ 확장 프로그램 다운로드
                  </p>
                  <p className="text-xs md:text-sm text-neutral-700 mb-2 md:mb-3">
                    아래 버튼을 클릭하여 확장 프로그램 파일을 다운로드하세요
                  </p>
                  <Button 
                    onClick={() => {
                      // chrome-extension.zip 다운로드
                      const link = document.createElement('a')
                      link.href = '/chrome-extension.zip'
                      link.download = 'chrome-extension.zip'
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                    }}
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    chrome-extension.zip 다운로드
                  </Button>
                </div>

                {/* Step 2 */}
                <div className="bg-white rounded-lg p-3 md:p-4">
                  <p className="font-medium text-neutral-900 mb-1.5 md:mb-2 text-sm md:text-base">
                    2️⃣ 파일 압축 해제
                  </p>
                  <p className="text-xs md:text-sm text-neutral-700">
                    다운로드한 <code className="bg-neutral-100 px-2 py-0.5 rounded text-xs">chrome-extension.zip</code> 파일을 압축 해제하세요
                  </p>
                </div>

                {/* Step 3 */}
                <div className="bg-white rounded-lg p-3 md:p-4">
                  <p className="font-medium text-neutral-900 mb-1.5 md:mb-2 text-sm md:text-base">
                    3️⃣ Chrome에 설치
                  </p>
                  <ol className="text-xs md:text-sm text-neutral-700 space-y-1.5 md:space-y-2 list-decimal list-inside ml-1 md:ml-2">
                    <li>Chrome 브라우저에서 <code className="bg-neutral-100 px-1.5 md:px-2 py-0.5 rounded text-xs">chrome://extensions/</code> 접속</li>
                    <li>우측 상단의 <strong>"개발자 모드"</strong> 토글 켜기</li>
                    <li><strong>"압축해제된 확장 프로그램을 로드합니다"</strong> 버튼 클릭</li>
                    <li>압축 해제한 <code className="bg-neutral-100 px-1.5 md:px-2 py-0.5 rounded text-xs">chrome-extension</code> 폴더 선택</li>
                    <li>완료! 브라우저 우측 상단에 🔐 아이콘이 표시됩니다</li>
                  </ol>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="mt-2 md:mt-3 w-full sm:w-auto"
                    onClick={() => window.open('chrome://extensions/', '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    확장 프로그램 페이지 열기
                  </Button>
                </div>
              </div>
            </div>

            {/* 사용 방법 */}
            <div className="bg-neutral-50 rounded-lg p-3 md:p-4 space-y-2 md:space-y-3">
              <h3 className="font-semibold text-xs md:text-sm text-neutral-900">📖 사용 방법</h3>
              <ol className="text-xs md:text-sm text-neutral-700 space-y-1.5 md:space-y-2 list-decimal list-inside">
                <li>
                  <a 
                    href="https://new.smartplace.naver.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    네이버 스마트플레이스
                  </a>
                  에 로그인
                </li>
                <li>브라우저 우측 상단의 🔐 아이콘 클릭</li>
                <li>팝업 창에서 매장 선택</li>
                <li>"세션 저장하기" 버튼 클릭</li>
                <li>완료! 이 페이지로 돌아와서 "새로고침" 버튼으로 확인</li>
              </ol>
            </div>

            {/* 장점 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4">
              <h3 className="font-semibold text-green-900 mb-1.5 md:mb-2 text-xs md:text-sm">✨ 확장 프로그램의 장점</h3>
              <ul className="text-xs md:text-sm text-green-800 space-y-0.5 md:space-y-1 list-disc list-inside">
                <li>원클릭으로 세션 저장 (10초 소요)</li>
                <li>복잡한 설정 없이 간편하게 사용</li>
                <li>안전하고 빠른 쿠키 추출</li>
                <li>한 번 설치하면 계속 사용 가능</li>
              </ul>
            </div>

            {/* 보안 안내 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4">
              <div className="flex items-start gap-2 md:gap-3">
                <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs md:text-sm">
                  <p className="font-semibold text-yellow-900 mb-1">🔒 보안 안내</p>
                  <ul className="text-yellow-800 space-y-0.5 md:space-y-1 list-disc list-inside">
                    <li>비밀번호는 절대 저장되지 않습니다</li>
                    <li>세션 정보는 암호화되어 안전하게 저장됩니다</li>
                    <li>확장 프로그램은 네이버 도메인의 쿠키만 접근합니다</li>
                    <li>세션은 7일 후 자동으로 만료됩니다</li>
                    <li>언제든지 세션을 삭제할 수 있습니다</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 문제 해결 */}
            <details className="bg-neutral-50 rounded-lg p-3 md:p-4">
              <summary className="font-semibold text-xs md:text-sm cursor-pointer text-neutral-900">❓ 문제 해결 (FAQ)</summary>
              <div className="mt-2 md:mt-3 space-y-2 md:space-y-3 text-xs md:text-sm text-neutral-700">
                <div>
                  <p className="font-medium text-neutral-900">Q. 확장 프로그램 아이콘이 안 보여요</p>
                  <p className="text-neutral-600 mt-0.5 md:mt-1">
                    A. 퍼즐 모양(🧩) 아이콘을 클릭하여 "네이버 세션 저장"을 찾아 📌 아이콘으로 고정하세요
                  </p>
                </div>
                <div>
                  <p className="font-medium text-neutral-900">Q. "로그인이 필요합니다" 오류가 나와요</p>
                  <p className="text-neutral-600 mt-0.5 md:mt-1">
                    A. 이 웹사이트에 먼저 로그인한 후 확장 프로그램을 사용하세요
                  </p>
                </div>
                <div>
                  <p className="font-medium text-neutral-900">Q. 모바일에서도 사용할 수 있나요?</p>
                  <p className="text-neutral-600 mt-0.5 md:mt-1">
                    A. 죄송합니다. 현재는 PC Chrome 브라우저만 지원합니다
                  </p>
                </div>
              </div>
            </details>
          </div>
        </Card>
      )}

      {/* 선택 안내 */}
      {!selectedStoreId && (
        <Card className="p-6 md:p-8 shadow-sm border-neutral-200 text-center">
          <p className="text-sm md:text-base text-neutral-600">
            매장을 선택하여 네이버 로그인 세션을 관리하세요
          </p>
        </Card>
      )}
    </div>
  )
}
