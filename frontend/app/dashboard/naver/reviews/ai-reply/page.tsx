"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useStores } from "@/lib/hooks/useStores"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { Loader2, Sparkles, Send, Check, X, AlertCircle, MessageSquare, Settings, Store as StoreIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { API_BASE_URL } from "@/lib/config"
import { notifyCreditUsed } from "@/lib/credit-utils"
import { useCreditConfirm } from "@/lib/hooks/useCreditConfirm"
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal"

interface Review {
  naver_review_id: string
  author: string  // GraphQL API author.nickname
  rating: number | null
  content: string
  date: string  // GraphQL API visited (파싱됨)
  has_reply: boolean
  reply_text: string | null
}

interface GeneratedReply {
  [key: string]: string
}

interface SessionStatus {
  has_session: boolean
  is_valid: boolean
}

export default function NaverAIReplyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, getToken } = useAuth()
  const { stores, hasStores, isLoading: storesLoading } = useStores()
  const { toast } = useToast()
  
  const [selectedStoreId, setSelectedStoreId] = useState<string>("")
  const [reviewLimit, setReviewLimit] = useState<string>("50")
  const [reviews, setReviews] = useState<Review[]>([])
  const [generatedReplies, setGeneratedReplies] = useState<GeneratedReply>({})
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null)
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [generatingReplyIds, setGeneratingReplyIds] = useState<Set<string>>(new Set())
  const [postingReplyIds, setPostingReplyIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [aiSettings, setAiSettings] = useState<any>(null)
  const [replyFilter, setReplyFilter] = useState<"all" | "replied" | "pending">("all")
  const [justPostedReviewIds, setJustPostedReviewIds] = useState<Set<string>>(new Set()) // 방금 게시한 리뷰 ID 목록
  const [postingProgress, setPostingProgress] = useState<{
    [key: string]: { 
      jobId: string;
      status: string; // "queued", "processing", "completed", "failed"
      positionInQueue: number;
      estimatedTime: number;
      startTime: number | null; // 처리 시작 시간 (timestamp)
      remainingTime: number; // 남은 시간 (초)
    }
  }>({}) // 답글 게시 진행 상황

  // 크레딧 확인 모달
  const { showCreditConfirm, CreditModal } = useCreditConfirm()
  // 업그레이드 모달
  const { handleLimitError, UpgradeModalComponent } = useUpgradeModal()

  // 리뷰 날짜 기반 예상 처리 시간 계산
  const calculateEstimatedTime = (dateString: string): number => {
    try {
      const today = new Date()
      const dateParts = dateString.match(/\d+/g)
      
      if (!dateParts || dateParts.length < 2) {
        return 15 // 기본값
      }
      
      let reviewDate: Date
      
      if (dateParts.length >= 3) {
        // 연도 포함: "25.12.28.목" 또는 "2025. 12. 28(목)"
        let year = parseInt(dateParts[0])
        const month = parseInt(dateParts[1])
        const day = parseInt(dateParts[2])
        
        // 2자리 연도는 20XX로 변환
        if (year < 100) {
          year = 2000 + year
        }
        
        reviewDate = new Date(year, month - 1, day)
      } else {
        // 월.일만: "1.9.금" -> 현재 년도 사용
        const month = parseInt(dateParts[0])
        const day = parseInt(dateParts[1])
        reviewDate = new Date(today.getFullYear(), month - 1, day)
      }
      
      // 날짜 차이 계산 (일 단위)
      const diffTime = today.getTime() - reviewDate.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      // 날짜 차이에 따른 예상 시간 (초)
      if (diffDays <= 3) return 8
      if (diffDays <= 14) return 12
      if (diffDays <= 60) return 18
      return 25
      
    } catch (error) {
      console.warn("예상 시간 계산 실패:", error)
      return 15 // 에러 시 기본값
    }
  }

  // 세션 확인 함수
  const checkSession = async (storeId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/naver-session/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ store_id: storeId })
      })
      
      if (response.ok) {
        const data = await response.json()
        setSessionStatus(data)
      }
    } catch (err) {
      console.error("세션 확인 실패:", err)
    }
  }

  // 매장 변경 시 리뷰 초기화 및 세션 확인, AI 설정 불러오기
  useEffect(() => {
    setReviews([])
    setGeneratedReplies({})
    setError(null)
    setSuccessMessage(null)
    setJustPostedReviewIds(new Set()) // 매장 변경 시 초기화
    
    if (selectedStoreId) {
      checkSession(selectedStoreId)
      loadAISettings(selectedStoreId)
    } else {
      setSessionStatus(null)
      setAiSettings(null)
    }
  }, [selectedStoreId])

  // 카운트다운 타이머 (매초 실행)
  useEffect(() => {
    console.log("[Timer] Countdown timer started")
    
    const interval = setInterval(() => {
      const now = Date.now()
      
      setPostingProgress(prev => {
        const updated = { ...prev }
        let hasChanges = false
        
        Object.keys(updated).forEach(reviewId => {
          const progress = updated[reviewId]
          
          // 처리 중인 작업만 카운트다운
          if (progress.status === "processing" && progress.startTime) {
            const elapsed = Math.floor((now - progress.startTime) / 1000)
            const remaining = Math.max(0, progress.estimatedTime - elapsed)
            
            if (progress.remainingTime !== remaining) {
              console.log(`[Timer] Review ${reviewId.substring(0, 8)}... - Remaining: ${remaining}s (elapsed: ${elapsed}s / ${progress.estimatedTime}s)`)
              updated[reviewId] = { ...progress, remainingTime: remaining }
              hasChanges = true
            }
          }
        })
        
        if (!hasChanges) {
          // 처리 중인 작업이 없으면 로그 출력
          const processingCount = Object.values(updated).filter(p => p.status === "processing").length
          if (processingCount > 0) {
            console.log(`[Timer] ${processingCount} processing job(s) but no countdown change`)
          }
        }
        
        return hasChanges ? updated : prev
      })
    }, 1000) // 매초 업데이트
    
    return () => {
      console.log("[Timer] Countdown timer stopped")
      clearInterval(interval)
    }
  }, [])

  // URL 파라미터로 자동 시작
  useEffect(() => {
    const autoStart = searchParams.get('autoStart')
    const storeId = searchParams.get('storeId')
    const limit = searchParams.get('reviewLimit')
    
    if (autoStart === 'true' && storeId && stores.length > 0 && !selectedStoreId) {
      console.log('[AI 리뷰답글] 자동 시작:', storeId, limit)
      setSelectedStoreId(storeId)
      if (limit) {
        setReviewLimit(limit)
      }
      // URL 파라미터 제거
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams, stores, selectedStoreId])
  
  // 매장 선택 후 자동 로드
  useEffect(() => {
    const autoStart = searchParams.get('autoStart')
    if (autoStart === 'true' && selectedStoreId && !isLoadingReviews && reviews.length === 0) {
      console.log('[AI 리뷰답글] 리뷰 자동 로드')
      loadReviews()
    }
  }, [selectedStoreId, searchParams])

  // AI 설정 불러오기
  const loadAISettings = async (storeId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai-reply/settings/${storeId}`)
      if (response.ok) {
        const data = await response.json()
        setAiSettings(data.settings)
      }
    } catch (err) {
      console.error("AI 설정 로드 실패:", err)
      setAiSettings(null)
    }
  }

  // 리뷰 불러오기
  const loadReviews = async () => {
    if (!selectedStoreId) {
      setError("매장을 선택해주세요")
      return
    }

    setIsLoadingReviews(true)
    setError(null)
    setJustPostedReviewIds(new Set()) // 리뷰 새로 불러올 때 초기화

    try {
      const limit = reviewLimit === "all" ? 0 : parseInt(reviewLimit)
      
      const response = await fetch(`${API_BASE_URL}/api/v1/ai-reply/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          store_id: selectedStoreId,
          limit: limit
        })
      })

      if (!response.ok) {
        throw new Error("리뷰 조회 실패")
      }

      const data = await response.json()
      setReviews(data.reviews || [])
      
    } catch (err: any) {
      setError(err.message || "리뷰 조회 중 오류가 발생했습니다")
    } finally {
      setIsLoadingReviews(false)
    }
  }

  // AI 답글 생성
  const generateReply = (review: Review) => {
    showCreditConfirm({
      featureName: "AI 답글 생성",
      creditAmount: 5,
      onConfirm: () => executeGenerateReply(review),
    })
  }

  const executeGenerateReply = async (review: Review) => {
    setGeneratingReplyIds(prev => new Set(prev).add(review.naver_review_id))
    setError(null)

    try {
      const selectedStore = stores.find(s => s.id === selectedStoreId)
      const storeName = selectedStore?.store_name || "저희 매장"
      const category = selectedStore?.category || "일반"

      const token = await getToken()
      const response = await fetch(`${API_BASE_URL}/api/v1/ai-reply/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          review_content: review.content,
          rating: review.rating,
          author_name: review.author,  // author 필드 사용
          store_name: storeName,
          category: category,
          place_settings: aiSettings  // AI 설정 추가
        })
      })

      if (!response.ok) {
        throw new Error("AI 답글 생성 실패")
      }

      const data = await response.json()
      
      setGeneratedReplies(prev => ({
        ...prev,
        [review.naver_review_id]: data.reply_text
      }))

      // ✨ 크레딧 실시간 차감 알림 (AI 답글 생성: 5 크레딧)
      notifyCreditUsed(5, token)
      
    } catch (err: any) {
      setError(err.message || "AI 답글 생성 중 오류가 발생했습니다")
    } finally {
      setGeneratingReplyIds(prev => {
        const next = new Set(prev)
        next.delete(review.naver_review_id)
        return next
      })
    }
  }

  // 큐 상태 폴링
  const pollQueueStatus = async (reviewId: string, jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/ai-reply/queue-status/${jobId}`)
        
        if (!response.ok) {
          console.log(`[Poll] Failed to get status (${response.status}). Stopping polling.`)
          clearInterval(pollInterval)
          
          // 404 에러면 작업이 사라진 것 (백엔드 재시작 등)
          if (response.status === 404) {
            setPostingReplyIds(prev => {
              const next = new Set(prev)
              next.delete(reviewId)
              return next
            })
            
            setPostingProgress(prev => {
              const next = { ...prev }
              delete next[reviewId]
              return next
            })
            
            setError("작업을 찾을 수 없습니다. 페이지를 새로고침 후 다시 시도해주세요.")
          }
          
          return
        }
        
        const data = await response.json()
        
        // 디버깅 로그
        console.log(`[Poll] Status: ${data.status}, started_at: ${data.started_at}, position: ${data.position_in_queue}, estimated: ${data.estimated_time}`)
        
        // 진행 상황 업데이트 (remainingTime은 타이머가 업데이트)
        setPostingProgress(prev => {
          const prevProgress = prev[reviewId]
          
          const newStartTime = data.started_at 
            ? new Date(data.started_at).getTime() 
            : null
          
          // 기존 startTime이 있고 새로운 startTime이 있으면 기존 것 유지 (중복 업데이트 방지)
          const startTime = prevProgress?.startTime || newStartTime
          
          // startTime이 새로 설정되면 로그 출력
          if (!prevProgress?.startTime && startTime) {
            console.log(`[Poll] Start time set: ${new Date(startTime).toISOString()}`)
          }
          
          // remainingTime: 기존 진행상황이 있으면 remainingTime 유지 (타이머가 관리), 없으면 초기값
          const remainingTime = prevProgress 
            ? prevProgress.remainingTime  // 기존 값 완전 유지
            : data.estimated_time  // 처음 생성 시에만 설정
          
          return {
            ...prev,
            [reviewId]: {
              jobId: data.job_id,
              status: data.status,
              positionInQueue: data.position_in_queue,
              estimatedTime: data.estimated_time,
              startTime: startTime,
              remainingTime: remainingTime
            }
          }
        })
        
        // 완료 또는 실패 시 폴링 중단
        if (data.status === "completed") {
          clearInterval(pollInterval)
          
          // 성공 처리
          setSuccessMessage(`✅ 답글 게시 완료! (${data.author}님) • 아래에서 결과를 확인하세요`)
          
          // 리뷰 목록 업데이트
          setReviews(prev => prev.map(r => 
            r.naver_review_id === reviewId
              ? { ...r, has_reply: true, reply_text: generatedReplies[reviewId] }
              : r
          ))
          
          // 생성된 답글 삭제
          setGeneratedReplies(prev => {
            const next = { ...prev }
            delete next[reviewId]
            return next
          })
          
          // 방금 게시한 리뷰 목록에 추가
          setJustPostedReviewIds(prev => new Set(prev).add(reviewId))
          
          // 포스팅 상태 제거
          setPostingReplyIds(prev => {
            const next = new Set(prev)
            next.delete(reviewId)
            return next
          })
          
          // 진행 상황 제거
          setPostingProgress(prev => {
            const next = { ...prev }
            delete next[reviewId]
            return next
          })
          
          // 5초 후 성공 메시지 제거
          setTimeout(() => setSuccessMessage(null), 5000)
          
        } else if (data.status === "failed") {
          clearInterval(pollInterval)
          
          // 실패 처리
          setError(data.error_message || "답글 게시 실패")
          
          // 포스팅 상태 제거
          setPostingReplyIds(prev => {
            const next = new Set(prev)
            next.delete(reviewId)
            return next
          })
          
          // 진행 상황 제거
          setPostingProgress(prev => {
            const next = { ...prev }
            delete next[reviewId]
            return next
          })
        }
        
      } catch (err) {
        console.error("큐 상태 폴링 오류:", err)
        clearInterval(pollInterval)
      }
    }, 2000) // 2초마다 폴링
  }

  // 답글 게시
  const postReply = (review: Review) => {
    const replyText = generatedReplies[review.naver_review_id]
    
    if (!replyText || replyText.trim().length === 0) {
      setError("답글 내용이 비어있습니다")
      return
    }

    showCreditConfirm({
      featureName: "AI 답글 게시",
      creditAmount: 8,
      onConfirm: () => executePostReply(review),
    })
  }

  const executePostReply = async (review: Review) => {
    const replyText = generatedReplies[review.naver_review_id]
    
    if (!replyText || replyText.trim().length === 0) {
      setError("답글 내용이 비어있습니다")
      return
    }

    setPostingReplyIds(prev => new Set(prev).add(review.naver_review_id))
    setError(null)
    setSuccessMessage(null)

    try {
      const token = await getToken()
      const response = await fetch(`${API_BASE_URL}/api/v1/ai-reply/post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          store_id: selectedStoreId,
          naver_review_id: review.naver_review_id,
          author: review.author,
          date: review.date,
          content: review.content,
          reply_text: replyText
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        // 403 에러 (Tier 제한) → 업그레이드 모달 표시
        if (handleLimitError(response.status, data.detail)) {
          return
        }
        throw new Error(data.detail || "답글 게시 요청 실패")
      }
      
      if (data.success && data.job_id) {
        // 큐에 추가 성공 - 폴링 시작
        // 리뷰 날짜 기반 예상 시간 계산
        const estimatedTime = calculateEstimatedTime(review.date)
        
        console.log(`[PostReply] Job created: ${data.job_id}, estimated time: ${estimatedTime}s, review date: ${review.date}`)
        
        setPostingProgress(prev => ({
          ...prev,
          [review.naver_review_id]: {
            jobId: data.job_id,
            status: "queued",
            positionInQueue: 0,
            estimatedTime: estimatedTime,
            startTime: null,
            remainingTime: estimatedTime
          }
        }))

        // ✨ 크레딧 실시간 차감 알림 (AI 답글 게시: 8 크레딧)
        notifyCreditUsed(8, token)
        
        // 상태 폴링 시작
        pollQueueStatus(review.naver_review_id, data.job_id)
        
      } else {
        throw new Error(data.message || "답글 게시 요청 실패")
      }
      
    } catch (err: any) {
      const errorMessage = err.message || "답글 게시 중 오류가 발생했습니다"
      
      // Tier 제한 에러는 특별한 스타일로 표시
      if (errorMessage.includes("Pro 플랜") || errorMessage.includes("업그레이드")) {
        toast({
          variant: "destructive",
          title: "🚀 Pro 플랜 전용 기능",
          description: errorMessage,
          duration: 7000, // 7초간 표시
        })
      } else {
        setError(errorMessage)
      }
      
      // 오류 발생 시 포스팅 상태 제거
      setPostingReplyIds(prev => {
        const next = new Set(prev)
        next.delete(review.naver_review_id)
        return next
      })
      
      // 진행 상황 초기화
      setPostingProgress(prev => {
        const next = { ...prev }
        delete next[review.naver_review_id]
        return next
      })
    }
  }

  // 답글 수동 수정
  const updateReplyText = (reviewId: string, text: string) => {
    setGeneratedReplies(prev => ({
      ...prev,
      [reviewId]: text
    }))
  }

  // 답글 상태 확인 (엄격한 검증)
  const hasValidReply = (review: Review) => {
    return review.has_reply && review.reply_text && review.reply_text.trim().length > 0
  }

  // 필터링된 리뷰 목록
  const filteredReviews = reviews.filter(review => {
    // 방금 게시한 리뷰는 필터와 관계없이 일시적으로 표시
    if (justPostedReviewIds.has(review.naver_review_id)) {
      return true
    }
    
    // 일반 필터링 로직
    if (replyFilter === "all") return true
    if (replyFilter === "replied") return hasValidReply(review)
    if (replyFilter === "pending") return !hasValidReply(review)
    return true
  })

  // 통계 계산
  const totalReviews = reviews.length
  const repliedCount = reviews.filter(r => hasValidReply(r)).length
  const pendingCount = reviews.filter(r => !hasValidReply(r)).length

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
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10 space-y-8 md:space-y-10">
      {/* 헤더 섹션 - 홈페이지 스타일 */}
      <header className="text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-pink-400 to-rose-500 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight">
            AI 리뷰답글
          </h1>
        </div>
        <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-3xl mx-auto mb-4">
          AI가 리뷰 내용을 분석하여 감성에 맞는<br className="md:hidden" />
          <span className="hidden md:inline"> </span>전문적인 답글을 자동으로 생성합니다
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
          <Badge 
            variant="secondary"
            className="bg-pink-100 text-pink-700 border-pink-200 px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
          >
            🤖 AI 자동 생성
          </Badge>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/naver/ai-settings')}
            className="h-11 px-5 border-2 border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold rounded-xl shadow-sm transition-all inline-flex items-center gap-2"
          >
            <Settings className="h-5 w-5" />
            AI 설정
          </Button>
        </div>
      </header>

      {/* 성공/오류 메시지 */}
      {successMessage && (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 md:p-5 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-5 duration-300">
          <div className="flex-shrink-0 bg-green-100 rounded-full p-1">
            <Check className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-green-900 font-semibold text-sm md:text-base mb-1">답글 게시 완료!</p>
            <p className="text-green-700 text-xs md:text-sm">{successMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 md:p-5 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-5 duration-300">
          <div className="flex-shrink-0 bg-red-100 rounded-full p-1">
            <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-red-900 font-semibold text-sm md:text-base mb-1">오류 발생</p>
            <p className="text-red-700 text-xs md:text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* 세션 경고 */}
      {sessionStatus && !sessionStatus.is_valid && selectedStoreId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3 shadow-sm">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-yellow-900 mb-1 text-sm md:text-base">
              네이버 로그인이 필요합니다
            </p>
            <p className="text-xs md:text-sm text-yellow-800 mb-3">
              답글 게시 기능을 사용하려면 네이버 스마트플레이스에 로그인해야 합니다.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/naver/session')}
              className="h-9 px-3 border-yellow-300 hover:bg-yellow-100 text-yellow-900 text-sm"
            >
              로그인하러 가기
            </Button>
          </div>
        </div>
      )}

      {/* 설정 영역 */}
      <Card className="p-4 md:p-6 border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {/* 매장 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">매장 선택</label>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger className="h-11 border-gray-300">
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

          {/* 리뷰 개수 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">리뷰 개수</label>
            <Select value={reviewLimit} onValueChange={setReviewLimit}>
              <SelectTrigger className="h-10 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">최근 50개</SelectItem>
                <SelectItem value="100">최근 100개</SelectItem>
                <SelectItem value="200">최근 200개</SelectItem>
                <SelectItem value="400">최근 400개</SelectItem>
                <SelectItem value="all">전체 리뷰</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 불러오기 버튼 */}
          <div className="flex items-end">
            <Button 
              onClick={loadReviews} 
              disabled={!selectedStoreId || isLoadingReviews}
              className="w-full h-10 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg shadow-sm transition-all"
            >
              {isLoadingReviews ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  불러오는 중...
                </>
              ) : (
                "리뷰 불러오기"
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* 리뷰 목록 */}
      {reviews.length > 0 && (
        <div className="space-y-3 md:space-y-4">
          {/* 제목 */}
          <h2 className="text-base md:text-lg font-semibold text-gray-900">리뷰 목록</h2>

          {/* 메시지 및 필터 */}
          <Card className="p-4 border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
              {/* 안내 메시지 */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MessageSquare className="h-4 w-4 text-primary-500" />
                <span className="font-medium">리뷰답글은 재방문을 유도합니다!</span>
              </div>

              {/* 필터 */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700">필터:</span>
                <Button
                  variant={replyFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setReplyFilter("all")
                    setJustPostedReviewIds(new Set()) // 필터 변경 시 일시적 표시 해제
                  }}
                  className={replyFilter === "all" ? "h-8 px-3 bg-primary-500 hover:bg-primary-600 text-white" : "h-8 px-3 border-gray-300 hover:bg-gray-100 text-gray-700"}
                >
                  전체 ({totalReviews})
                </Button>
                <Button
                  variant={replyFilter === "replied" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setReplyFilter("replied")
                    setJustPostedReviewIds(new Set()) // 필터 변경 시 일시적 표시 해제
                  }}
                  className={replyFilter === "replied" ? "h-8 px-3 bg-primary-500 hover:bg-primary-600 text-white" : "h-8 px-3 border-gray-300 hover:bg-gray-100 text-gray-700"}
                >
                  답글완료 ({repliedCount})
                </Button>
                <Button
                  variant={replyFilter === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setReplyFilter("pending")
                    setJustPostedReviewIds(new Set()) // 필터 변경 시 일시적 표시 해제
                  }}
                  className={replyFilter === "pending" ? "h-8 px-3 bg-primary-500 hover:bg-primary-600 text-white" : "h-8 px-3 border-gray-300 hover:bg-gray-100 text-gray-700"}
                >
                  답글대기 ({pendingCount})
                </Button>
              </div>
            </div>
          </Card>

          {/* 필터링된 리뷰 목록 */}
          {filteredReviews.length === 0 ? (
            <Card className="p-8 text-center border-gray-200 shadow-sm">
              <p className="text-gray-600 text-sm">
                {replyFilter === "replied" && "답글 완료된 리뷰가 없습니다."}
                {replyFilter === "pending" && "답글 대기 중인 리뷰가 없습니다."}
                {replyFilter === "all" && "리뷰가 없습니다."}
              </p>
            </Card>
          ) : (
            filteredReviews.map((review) => (
            <Card key={review.naver_review_id} className="p-4 md:p-6 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              {/* 리뷰 헤더 */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-gray-900">{review.author}</span>
                    {review.rating && (
                      <span className="text-yellow-500 text-sm">
                        {"★".repeat(Math.floor(review.rating))}
                      </span>
                    )}
                  </div>
                  <span className="text-xs md:text-sm text-gray-500">
                    {review.date}
                  </span>
                </div>
                
                {/* 답글 상태 배지 */}
                {hasValidReply(review) ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 h-fit">
                    답글 완료
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 h-fit">
                    답글 대기
                  </Badge>
                )}
              </div>

              {/* 리뷰 내용 */}
              <div className="mb-4">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {review.content || "(내용 없음)"}
                </p>
              </div>

              {/* 기존 답글 표시 */}
              {hasValidReply(review) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-4">
                  <p className="text-xs md:text-sm font-medium text-blue-900 mb-2">
                    💬 사장님 답글
                  </p>
                  <p className="text-sm text-blue-800 leading-relaxed">{review.reply_text}</p>
                </div>
              )}

              {/* 답글 작성 영역 (답글이 없는 경우만) */}
              {!hasValidReply(review) && (
                <div className="space-y-3">
                  {/* 답글 입력창 */}
                  <Textarea
                    value={generatedReplies[review.naver_review_id] || ""}
                    onChange={(e) => updateReplyText(review.naver_review_id, e.target.value)}
                    placeholder="답글을 입력하거나 AI 답글 생성 버튼을 눌러주세요"
                    rows={4}
                    className="resize-none border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                  
                  {/* 버튼 영역 */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* AI 답글 생성 버튼 */}
                    <Button
                      onClick={() => generateReply(review)}
                      disabled={
                        generatingReplyIds.has(review.naver_review_id) ||
                        postingReplyIds.size > 0  // 어떤 리뷰라도 게시 중이면 모두 비활성화
                      }
                      variant="outline"
                      className="flex-1 h-10 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium"
                    >
                      {generatingReplyIds.has(review.naver_review_id) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          AI 생성 중...
                        </>
                      ) : postingReplyIds.size > 0 && !generatingReplyIds.has(review.naver_review_id) ? (
                        <>
                          <Sparkles className="mr-2 h-4 w-4 opacity-50" />
                          다른 답글 게시 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          AI 답글 생성
                        </>
                      )}
                    </Button>
                    
                    {/* 답글 게시 버튼 */}
                    <Button
                      onClick={() => postReply(review)}
                      disabled={
                        postingReplyIds.has(review.naver_review_id) ||
                        !generatedReplies[review.naver_review_id] ||
                        generatedReplies[review.naver_review_id].trim().length === 0
                      }
                      className="flex-1 h-10 bg-primary-500 hover:bg-primary-600 text-white font-medium"
                    >
                      {postingReplyIds.has(review.naver_review_id) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span className="text-xs sm:text-sm">
                            {postingProgress[review.naver_review_id] ? (
                              <>
                                {postingProgress[review.naver_review_id].positionInQueue === 0 ? (
                                  <>처리 중 ({postingProgress[review.naver_review_id].remainingTime}초)</>
                                ) : (
                                  <>대기 중 ({postingProgress[review.naver_review_id].positionInQueue}개)</>
                                )}
                              </>
                            ) : (
                              <>게시 중...</>
                            )}
                          </span>
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          답글 게시
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
          )}
        </div>
      )}

      {/* 빈 상태 */}
      {!isLoadingReviews && reviews.length === 0 && selectedStoreId && (
        <Card className="p-8 text-center border-gray-200 shadow-sm">
          <p className="text-gray-600 text-sm">
            리뷰를 불러오려면 "리뷰 불러오기" 버튼을 클릭하세요
          </p>
        </Card>
      )}

      {/* 크레딧 차감 확인 모달 */}
      {CreditModal}
      {/* 업그레이드 모달 */}
      {UpgradeModalComponent}
    </div>
  )
}
