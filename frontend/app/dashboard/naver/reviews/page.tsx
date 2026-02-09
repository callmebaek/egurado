"use client"

import { useState, useEffect, useMemo, memo, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { api } from "@/lib/config"
import { notifyCreditUsed } from "@/lib/credit-utils"
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Minus, 
  Star,
  Clock,
  TrendingUp,
  Filter,
  RefreshCw,
  Sparkles,
  Store as StoreIcon,
  FileText,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ============================================
// 메모이제이션된 리뷰 아이템 컴포넌트 (성능 최적화)
// ============================================
interface ReviewItemProps {
  review: any
  isExpanded: boolean
  onToggle: (id: string) => void
  getTemperatureColor: (score: number) => string
  getSentimentColor: (sentiment: string) => string
  getSentimentIcon: (sentiment: string) => any
  getSentimentLabel: (sentiment: string) => string
}

const ReviewItem = memo(({ 
  review, 
  isExpanded, 
  onToggle,
  getTemperatureColor,
  getSentimentColor,
  getSentimentIcon,
  getSentimentLabel
}: ReviewItemProps) => {
  const truncatedContent = review.content.length > 100 
    ? review.content.substring(0, 100) + "..." 
    : review.content

  return (
    <Card className="p-3 md:p-4 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* 리뷰 헤더 - Compact */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="font-medium text-sm text-gray-900">{review.author_name}</div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {new Date(review.review_date).toLocaleDateString("ko-KR")}
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {review.images && review.images.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <ImageIcon className="w-3 h-3" />
              {review.images.length}
            </div>
          )}
          {/* 리뷰 온도 */}
          {review.temperature_score !== null && review.temperature_score !== undefined && (
            <div className={`text-xs font-semibold ${getTemperatureColor(review.temperature_score)}`}>
              {review.temperature_score}°
            </div>
          )}
          {/* 감성 */}
          <Badge className={`${getSentimentColor(review.sentiment)} text-xs py-0.5 px-2`}>
            {getSentimentIcon(review.sentiment)}
            <span className="ml-1">{getSentimentLabel(review.sentiment)}</span>
          </Badge>
        </div>
      </div>
      
      {/* 리뷰 내용 미리보기 - Compact */}
      <p className="text-sm leading-relaxed mb-2 text-gray-800">
        {isExpanded ? review.content : truncatedContent}
      </p>
      
      {/* 펼치기/접기 버튼 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onToggle(review.id)}
        className="w-full mt-1 text-xs h-7 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-3 h-3 mr-1" />
            접기
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3 mr-1" />
            펼쳐보기
          </>
        )}
      </Button>
      
      {/* 펼쳤을 때만 표시되는 상세 정보 */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          {/* 이미지 */}
          {review.images && review.images.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {review.images.slice(0, 4).map((img: string, idx: number) => (
                <img 
                  key={idx}
                  src={img} 
                  alt={`리뷰 이미지 ${idx + 1}`}
                  className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg flex-shrink-0"
                />
              ))}
              {review.images.length > 4 && (
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-600 flex-shrink-0">
                  +{review.images.length - 4}
                </div>
              )}
            </div>
          )}
          
          {/* 상세 메타 정보 */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-gray-600">
            {/* 별점 */}
            {review.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                <span>{review.rating.toFixed(1)}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              {review.like_count}
            </div>
            {review.confidence !== null && review.confidence !== undefined && (
              <div>
                확신도 {Math.round(review.confidence * 100)}%
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
})

ReviewItem.displayName = 'ReviewItem'

// ============================================
// 타입 정의
// ============================================
interface Store {
  id: string
  name: string
  platform: string
  naver_place_id?: string
  thumbnail?: string
  category?: string
}

interface ReviewStats {
  status: string
  store_id: string
  date: string
  checked_at: string
  visitor_review_count: number
  visitor_positive_count: number
  visitor_neutral_count: number
  visitor_negative_count: number
  visitor_receipt_count: number
  visitor_reservation_count: number
  photo_review_count: number
  average_temperature: number
  blog_review_count: number
  summary: string
}

interface Review {
  id: string
  naver_review_id: string
  review_type: string
  author_name: string
  is_power_reviewer: boolean
  is_receipt_review: boolean
  is_reservation_review: boolean
  rating: number | null
  content: string
  images: string[]
  sentiment: string
  temperature_score: number
  confidence: number
  review_date: string
  like_count: number
}

export default function ReviewManagementPage() {
  const { toast } = useToast()
  const { user, getToken } = useAuth()
  const searchParams = useSearchParams()
  
  // 상태
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>("")
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [placeInfo, setPlaceInfo] = useState<{
    name: string
    visitor_review_count: number
    blog_review_count: number
    rating: number | null
    description: string
  } | null>(null)
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([])
  
  // 필터 상태
  const [sentimentFilter, setSentimentFilter] = useState<string>("all")
  
  // 기간 선택 상태
  const [datePeriod, setDatePeriod] = useState<string>("today") // today, yesterday, last7days, last30days
  
  // 로딩 상태
  const [loadingStores, setLoadingStores] = useState(false)
  const [loadingPlaceInfo, setLoadingPlaceInfo] = useState(false)
  const [extracting, setExtracting] = useState(false) // 리뷰 추출 중
  const [analyzing, setAnalyzing] = useState(false) // 리뷰 분석 중
  const [extractingSummary, setExtractingSummary] = useState(false) // AI 요약 추출 중
  const [loadingReviews, setLoadingReviews] = useState(false)
  
  // 분석 진행률 상태
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [totalReviewsCount, setTotalReviewsCount] = useState(0) // 전체 리뷰 수
  const [analyzedCount, setAnalyzedCount] = useState(0) // 분석 완료 수
  const [currentStats, setCurrentStats] = useState({ positive: 0, neutral: 0, negative: 0 }) // 실시간 통계
  const [estimatedTime, setEstimatedTime] = useState(0)
  
  // 리뷰 펼치기/접기 상태
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())
  
  // 분석 시도 여부 (리뷰 없음 메시지 표시 조건)
  const [hasAttemptedAnalysis, setHasAttemptedAnalysis] = useState(false)
  
  // autoStart 처리를 위한 ref (한 번만 실행)
  const autoStartProcessedRef = useRef(false)
  const autoStartPendingRef = useRef(false)
  
  // 매장 목록 로드
  useEffect(() => {
    loadStores()
  }, [])
  
  // URL 파라미터 처리 (모달에서 넘어온 경우)
  useEffect(() => {
    if (autoStartProcessedRef.current) return
    
    const storeId = searchParams.get('storeId')
    const period = searchParams.get('period')
    const autoStart = searchParams.get('autoStart')
    
    if (storeId && period && autoStart === 'true') {
      console.log("🔄 URL 파라미터로 자동 분석 준비:", { storeId, period })
      autoStartProcessedRef.current = true
      autoStartPendingRef.current = true
      
      // 매장 선택 및 기간 설정
      setSelectedStoreId(storeId)
      setDatePeriod(period)
    }
  }, [searchParams])
  
  // autoStart가 대기 중이고, selectedStoreId와 datePeriod가 설정되면 자동 분석 시작
  useEffect(() => {
    if (autoStartPendingRef.current && selectedStoreId && stores.length > 0 && user) {
      console.log("✅ 자동 분석 시작:", { selectedStoreId, datePeriod, hasUser: !!user })
      autoStartPendingRef.current = false
      
      // 매장 정보 로딩을 위해 약간의 딜레이
      const timer = setTimeout(() => {
        handleAnalyze()
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [selectedStoreId, datePeriod, stores, user])
  
  // 매장 선택 시 이전 데이터 초기화 및 매장 정보 로드
  useEffect(() => {
    if (selectedStoreId) {
      // 매장 변경 시 이전 데이터 모두 초기화
      setPlaceInfo(null)
      setStats(null)
      setReviews([])
      setFilteredReviews([])
      setAnalysisProgress(0)
      setHasAttemptedAnalysis(false)
      setTotalReviewsCount(0)
      
      // 새 매장 정보 로드
      loadPlaceInfo()
    } else {
      // 매장 선택 해제 시 초기화
      setPlaceInfo(null)
      setStats(null)
      setReviews([])
      setFilteredReviews([])
      setAnalysisProgress(0)
      setHasAttemptedAnalysis(false)
      setTotalReviewsCount(0)
    }
  }, [selectedStoreId])
  
  // 필터 적용
  useEffect(() => {
    applyFilters()
  }, [sentimentFilter, reviews])
  
  // stats 변경 감지
  useEffect(() => {
    console.log("📊 stats 변경됨:", stats)
    if (stats) {
      console.log("✅ stats 있음 - AI 요약이 표시되어야 함")
      console.log("📝 AI 요약 내용:", stats.summary)
    } else {
      console.log("❌ stats 없음 - AI 요약이 표시되지 않음")
    }
  }, [stats])
  
  const loadStores = async () => {
    console.log("🔍 loadStores 호출됨")
    setLoadingStores(true)
    try {
      console.log("👤 User:", user?.id)
      
      const token = getToken()
      if (!user || !token) {
        console.log("❌ 로그인된 사용자 또는 토큰 없음")
        return
      }
      
      const apiUrl = api.stores.list()
      console.log("🌐 API URL:", apiUrl)
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      console.log("📡 Response status:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("📦 전체 매장 수:", data.stores?.length)
        console.log("📦 전체 매장 데이터 (첫 번째):", data.stores?.[0])
        
        const naverStores = data.stores.filter((s: Store) => s.platform === "naver" && (s as any).place_id)
        console.log("🏪 네이버 매장 수:", naverStores.length)
        console.log("🏪 네이버 매장 목록:", naverStores)
        
        setStores(naverStores)
        // 기본값: 매장을 선택하지 않음
      } else {
        console.error("❌ API 응답 오류:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("❌ 매장 로드 실패:", error)
    } finally {
      setLoadingStores(false)
    }
  }
  
  const loadPlaceInfo = async () => {
    if (!selectedStoreId) return
    
    setLoadingPlaceInfo(true)
    console.log("🏪 매장 정보 조회 중 - Store ID:", selectedStoreId)
    try {
      const apiUrl = api.reviews.placeInfo(selectedStoreId)
      console.log("🏪 API URL:", apiUrl)
      
      const response = await fetch(apiUrl)
      console.log("🏪 응답 상태:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("🏪 매장 정보:", data)
        setPlaceInfo(data.place_info)
      } else {
        console.error("❌ 매장 정보 조회 실패:", response.status)
        toast({
          title: "매장 정보 조회 실패",
          description: "네이버 플레이스 정보를 불러올 수 없습니다.",
          variant: "destructive",
        })
        setPlaceInfo(null)
      }
    } catch (error) {
      console.error("❌ 매장 정보 조회 실패:", error)
      toast({
        title: "매장 정보 조회 실패",
        description: "오류가 발생했습니다.",
        variant: "destructive",
      })
      setPlaceInfo(null)
    } finally {
      setLoadingPlaceInfo(false)
    }
  }
  
  const loadStats = async (date?: string) => {
    if (!selectedStoreId) {
      console.log("⚠️ loadStats: selectedStoreId가 없음")
      return
    }
    
    // 날짜가 제공되지 않으면 오늘 날짜 사용
    const targetDate = date || new Date().toISOString().split('T')[0]
    console.log("📊 통계 조회 중")
    console.log("  - Store ID:", selectedStoreId)
    console.log("  - Target Date:", targetDate)
    
    try {
      const apiUrl = api.reviews.stats(selectedStoreId, targetDate)
      console.log("📊 API URL:", apiUrl)
      const response = await fetch(apiUrl)
      console.log("📊 응답 상태:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("📊 통계 데이터:", data)
        console.log("📊 AI 요약:", data.summary)
        setStats(data)
        console.log("📊 stats 설정 완료")
      } else {
        const errorText = await response.text()
        console.error("❌ 통계 조회 실패:", response.status, errorText)
        setStats(null)
      }
    } catch (error) {
      console.error("❌ 통계 로드 실패:", error)
      setStats(null)
    }
  }
  
  const loadReviews = async () => {
    if (!selectedStoreId) return
    
    console.log("📝 리뷰 목록 조회 중 - Store ID:", selectedStoreId)
    setLoadingReviews(true)
    try {
      const response = await fetch(api.reviews.list(selectedStoreId))
      console.log("📝 리뷰 응답 상태:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("📝 리뷰 개수:", data.length)
        setReviews(data)
      } else {
        console.error("❌ 리뷰 조회 실패:", response.status)
        setReviews([])
      }
    } catch (error) {
      console.error("리뷰 로드 실패:", error)
      setReviews([])
    } finally {
      setLoadingReviews(false)
    }
  }
  
  const getDateRange = () => {
    const today = new Date()
    
    // 로컬 시간대 기준으로 YYYY-MM-DD 형식 생성 (UTC 문제 방지)
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    const todayStr = formatDate(today)
    
    switch (datePeriod) {
      case "yesterday":
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = formatDate(yesterday)
        return { start_date: yesterdayStr, end_date: yesterdayStr }
      case "last7days":
        // 오늘 제외하고 지난 7일 (어제부터 7일 전까지)
        const endDate7 = new Date(today)
        endDate7.setDate(endDate7.getDate() - 1) // 어제
        const startDate7 = new Date(endDate7)
        startDate7.setDate(startDate7.getDate() - 6) // 어제로부터 6일 전
        return { start_date: formatDate(startDate7), end_date: formatDate(endDate7) }
      case "last30days":
        // 오늘 제외하고 지난 30일 (어제부터 30일 전까지)
        const endDate30 = new Date(today)
        endDate30.setDate(endDate30.getDate() - 1) // 어제
        const startDate30 = new Date(endDate30)
        startDate30.setDate(startDate30.getDate() - 29) // 어제로부터 29일 전
        return { start_date: formatDate(startDate30), end_date: formatDate(endDate30) }
      case "today":
      default:
        return { start_date: todayStr, end_date: todayStr }
    }
  }
  
  const handleAnalyze = async () => {
    if (!selectedStoreId) return
    
    // 사용자 및 토큰 확인 (인증 필수)
    if (!user) {
      console.log("⚠️ 사용자 정보 없음")
      toast({
        title: "인증 오류",
        description: "로그인이 필요합니다.",
        variant: "destructive",
      })
      return
    }
    
    const token = getToken()
    if (!token) {
      console.log("⚠️ 토큰 없음")
      toast({
        title: "인증 오류",
        description: "로그인이 필요합니다. 다시 로그인해주세요.",
        variant: "destructive",
      })
      return
    }
    
    const dateRange = getDateRange()
    console.log("========================================")
    console.log("🔄 하이브리드 리뷰 분석 시작")
    console.log("========================================")
    console.log("📅 선택된 기간:", datePeriod)
    console.log("📅 시작 날짜:", dateRange.start_date)
    console.log("📅 종료 날짜:", dateRange.end_date)
    console.log("🏪 Store ID:", selectedStoreId)
    console.log("👤 User ID:", user.id)
    console.log("🔑 Token:", token ? "있음" : "없음")
    console.log("========================================")
    
    // 분석 시도 플래그 설정
    setHasAttemptedAnalysis(true)
    
    // 분석 시작 전 이전 결과 완전 초기화
    setStats(null)
    setReviews([])
    setFilteredReviews([])
    setAnalyzedCount(0)
    setCurrentStats({ positive: 0, neutral: 0, negative: 0 })
    setTotalReviewsCount(0)
    
    setExtracting(true) // 추출 중 상태
    setExtractingSummary(false) // AI 요약 추출 상태 초기화
    setAnalysisProgress(0)
    
    try {
      
      // 1단계: 리뷰 추출 (빠름)
      console.log("📥 1단계: 리뷰 추출 중...")
      const extractResponse = await fetch(api.reviews.extract(), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          store_id: selectedStoreId,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date
        })
      })
      
      if (!extractResponse.ok) {
        const errorData = await extractResponse.json().catch(() => ({}))
        
        // 402 에러 (크레딧 부족)를 명시적으로 처리
        if (extractResponse.status === 402) {
          throw new Error(errorData.detail || "크레딧이 부족합니다. 크레딧을 충전하거나 플랜을 업그레이드해주세요.")
        }
        
        throw new Error(errorData.detail || errorData.message || "리뷰 추출 실패")
      }
      
      const extractData = await extractResponse.json()
      const extractedReviews = extractData.reviews || []
      const actualReviewCount = extractedReviews.length
      
      console.log(`✅ 리뷰 추출 완료: ${actualReviewCount}개 (백엔드 total: ${extractData.total_reviews})`)
      
      // 추출 완료
      setExtracting(false)
      setTotalReviewsCount(actualReviewCount)
      
      // 리뷰가 0개인 경우
      if (actualReviewCount === 0) {
        toast({
          title: "리뷰 없음",
          description: "선택한 기간 동안 등록된 리뷰가 없습니다.",
          variant: "default",
        })
        return
      }
      
      // 추출된 리뷰를 즉시 표시 (sentiment는 "analyzing"으로)
      const pendingReviews = extractedReviews.map((review: any) => ({
        ...review,
        sentiment: "analyzing", // 분석 중 상태
        temperature_score: null,
        confidence: null,
        evidence_quotes: [],
        aspect_sentiments: {}
      }))
      
      console.log(`📊 pendingReviews.length = ${pendingReviews.length}`)
      console.log(`📊 actualReviewCount = ${actualReviewCount}`)
      
      setReviews(pendingReviews)
      setFilteredReviews(pendingReviews)
      
      setEstimatedTime(Math.max(10, Math.ceil(actualReviewCount * 0.3)))
      
      toast({
        title: "리뷰 추출 완료",
        description: `${actualReviewCount}개의 리뷰를 추출했습니다. 분석을 시작합니다...`,
      })
      
      // 분석 시작
      setAnalyzing(true)
      
      // 2단계: 스트리밍 분석 (실시간 SSE)
      console.log("🔄 2단계: 실시간 분석 시작...")
      
      // SSE URL 생성 (토큰은 이미 위에서 가져옴)
      const baseUrl = api.reviews.analyzeStream(selectedStoreId, dateRange.start_date, dateRange.end_date)
      const urlWithToken = `${baseUrl}&token=${encodeURIComponent(token)}`
      
      console.log("📡 SSE URL:", baseUrl)
      
      const eventSource = new EventSource(urlWithToken)
      
      // SSE 타임아웃 설정 (5분)
      const sseTimeout = setTimeout(() => {
        console.error("⏰ SSE 타임아웃: 5분 초과")
        eventSource.close()
        
        // 타임아웃 시 모든 상태 초기화
        setAnalyzing(false)
        setExtractingSummary(false)
        setAnalysisProgress(0)
        setAnalyzedCount(0)
        setCurrentStats({ positive: 0, neutral: 0, negative: 0 })
        setTotalReviewsCount(0)
        setHasAttemptedAnalysis(false)
        setStats(null)
        setReviews([])
        setFilteredReviews([])
        
        toast({
          title: "분석 시간 초과",
          description: "분석 시간이 너무 오래 걸립니다. 다시 시도해주세요.",
          variant: "destructive",
        })
      }, 300000) // 5분
      
      eventSource.onopen = () => {
        console.log("✅ SSE 연결 성공")
      }
      
      eventSource.onmessage = async (event) => {
        try {
          console.log("📨 SSE 메시지 수신:", event.data.substring(0, 100))
          const data = JSON.parse(event.data)
          console.log("📊 파싱된 데이터 타입:", data.type)
          
          switch (data.type) {
            case 'init':
              console.log(`📊 분석 초기화: 총 ${data.total}개`)
              break
              
            case 'progress':
              const progress = Math.round((data.current / data.total) * 100)
              setAnalysisProgress(progress)
              setAnalyzedCount(data.current)
              console.log(`⏳ 진행: ${data.current}/${data.total} (${progress}%)`)
              
              // 100% 도달 시 즉시 AI 요약 추출 메시지 표시
              if (progress === 100) {
                console.log("✨ 100% 도달! AI 요약 추출 메시지 표시")
                setExtractingSummary(true)
              }
              break
              
            case 'review_analyzed':
              console.log(`✅ 리뷰 분석 완료:`, data.review?.id)
              // 개별 리뷰 업데이트
              setReviews(prev => prev.map(review => 
                review.naver_review_id === data.review.id
                  ? {
                      ...review,
                      sentiment: data.review.sentiment,
                      temperature_score: data.review.temperature_score
                    }
                  : review
              ))
              setFilteredReviews(prev => prev.map(review =>
                review.naver_review_id === data.review.id
                  ? {
                      ...review,
                      sentiment: data.review.sentiment,
                      temperature_score: data.review.temperature_score
                    }
                  : review
              ))
              break
              
            case 'stats_update':
              const updatedStats = {
                positive: data.positive || 0,
                neutral: data.neutral || 0,
                negative: data.negative || 0
              }
              setCurrentStats(updatedStats)
              console.log(`📈 통계 업데이트:`, updatedStats)
              break
              
            case 'complete':
              console.log("🎉 분석 완료!", data)
              clearTimeout(sseTimeout) // 타임아웃 클리어
              eventSource.close()

              // ✨ 크레딧 실시간 차감 알림 (리뷰 분석 10 크레딧)
              notifyCreditUsed(10, token)
              
              // savedDate를 먼저 추출 (closure 문제 방지)
              const savedDate = data.saved_date || dateRange.end_date
              const totalAnalyzed = data.total_analyzed
              
              // complete 이벤트에서 즉시 데이터 로드 시작 (extractingSummary는 이미 progress에서 true로 설정됨)
              ;(async () => {
                try {
                  // 통계 및 리뷰 목록 새로고침 (백엔드가 저장한 날짜로 조회)
                  console.log("📊 통계 로딩 시작 (AI 요약 포함)")
                  console.log("   - 사용할 날짜:", savedDate)
                  console.log("   - API URL:", api.reviews.stats(selectedStoreId, savedDate))
                  await loadStats(savedDate)
                  console.log("✅ 통계 로딩 완료 (AI 요약 포함)")
                  
                  // DB에서 분석된 리뷰 목록 다시 로드 (날짜별로 필터링됨)
                  console.log("📝 리뷰 목록 다시 로드 중 (날짜:", savedDate, ")")
                  try {
                    const reloadToken = getToken()
                    const reviewsApiUrl = `https://api.whiplace.com/api/v1/reviews/list/${selectedStoreId}?date=${savedDate}`
                    console.log("📝 리뷰 API URL:", reviewsApiUrl)
                    const reviewsResponse = await fetch(reviewsApiUrl, {
                      headers: {
                        'Authorization': `Bearer ${reloadToken}`,
                        'Content-Type': 'application/json'
                      }
                    })
                    if (reviewsResponse.ok) {
                      const reviewsData = await reviewsResponse.json()
                      console.log("📝 리뷰 로드 성공:", reviewsData.length, "개")
                      setReviews(reviewsData)
                      setFilteredReviews(reviewsData)
                    } else {
                      console.error("❌ 리뷰 로드 실패:", reviewsResponse.status)
                    }
                  } catch (error) {
                    console.error("❌ 리뷰 로드 에러:", error)
                  }
                  
                  console.log("✅ AI 요약 추출 완료 - extractingSummary를 false로 설정")
                  
                  toast({
                    title: "리뷰 분석 완료",
                    description: `${totalAnalyzed}개의 리뷰를 분석했습니다.`,
                  })
                  
                  setExtractingSummary(false) // AI 요약 추출 완료
                  setAnalyzing(false) // 전체 분석 프로세스 완료
                  setTimeout(() => setAnalysisProgress(0), 1000)
                } catch (error) {
                  console.error("❌ 완료 처리 중 오류:", error)
                  setExtractingSummary(false)
                  setAnalyzing(false)
                }
              })()
              break
              
            case 'error':
              console.error("❌ 백엔드 분석 오류:", data.message)
              clearTimeout(sseTimeout)
              eventSource.close()
              
              // 에러 발생 시 모든 상태 초기화
              setAnalyzing(false)
              setExtractingSummary(false)
              setAnalysisProgress(0)
              setAnalyzedCount(0)
              setCurrentStats({ positive: 0, neutral: 0, negative: 0 })
              setTotalReviewsCount(0)
              setHasAttemptedAnalysis(false)
              setStats(null)
              setReviews([])
              setFilteredReviews([])
              
              toast({
                title: "분석 실패",
                description: data.message || "리뷰 분석 중 오류가 발생했습니다.",
                variant: "destructive",
              })
              break
          }
        } catch (err) {
          console.error("❌ SSE 메시지 파싱 오류:", err, "원본 데이터:", event.data)
        }
      }
      
      eventSource.onerror = (error) => {
        console.error("❌ SSE 연결 오류:", error)
        console.error("   readyState:", eventSource.readyState)
        clearTimeout(sseTimeout)
        eventSource.close()
        
        // 에러 발생 시 모든 상태 초기화
        setAnalyzing(false)
        setExtractingSummary(false)
        setAnalysisProgress(0)
        setAnalyzedCount(0)
        setCurrentStats({ positive: 0, neutral: 0, negative: 0 })
        setTotalReviewsCount(0)
        setHasAttemptedAnalysis(false)
        setStats(null)
        setReviews([])
        setFilteredReviews([])
        
        toast({
          title: "분석 중 연결 오류 발생",
          description: "서버 연결이 끊어졌습니다. 다시 시도해주세요.",
          variant: "destructive",
        })
      }
      
    } catch (error) {
      console.error("리뷰 분석 실패:", error)
      
      // 에러 발생 시 모든 상태 초기화
      setExtracting(false)
      setAnalyzing(false)
      setExtractingSummary(false)
      setAnalysisProgress(0)
      setAnalyzedCount(0)
      setCurrentStats({ positive: 0, neutral: 0, negative: 0 })
      setTotalReviewsCount(0)
      
      // 분석 시도 플래그 초기화 (초기 화면으로 복귀)
      setHasAttemptedAnalysis(false)
      
      // 분석 결과 데이터 초기화
      setStats(null)
      setReviews([])
      setFilteredReviews([])
      
      toast({
        title: "리뷰 분석 실패",
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }
  
  // 리뷰 펼치기/접기 토글
  const toggleReviewExpanded = useCallback((reviewId: string) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId)
      } else {
        newSet.add(reviewId)
      }
      return newSet
    })
  }, [])
  
  const applyFilters = () => {
    let filtered = [...reviews]
    
    // 감성 필터
    if (sentimentFilter !== "all") {
      filtered = filtered.filter(r => r.sentiment === sentimentFilter)
    }
    
    setFilteredReviews(filtered)
  }
  
  // 일별 리뷰 수 계산 (라인 그래프용) - 기간 내 모든 날짜 포함
  const dailyReviewCounts = useMemo(() => {
    if (!reviews.length) return []
    
    // 날짜별로 리뷰 수 집계
    const countByDate: { [key: string]: number } = {}
    reviews.forEach(review => {
      const date = review.review_date?.split('T')[0] || review.visited || ''
      if (date) {
        countByDate[date] = (countByDate[date] || 0) + 1
      }
    })
    
    // 날짜 범위 계산 (모든 날짜 포함)
    const dates = Object.keys(countByDate).sort()
    if (dates.length === 0) return []
    
    const startDate = new Date(dates[0])
    const endDate = new Date(dates[dates.length - 1])
    
    // 모든 날짜 생성 (리뷰 없는 날도 포함)
    const allDates: { date: string; count: number; displayDate: string }[] = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      allDates.push({
        date: dateStr,
        count: countByDate[dateStr] || 0,
        displayDate: dateStr.split('-').slice(1).join('.')  // MM.DD 형식
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    console.log('📊 dailyReviewCounts (모든 날짜):', allDates)
    console.log('📊 총 날짜 수:', allDates.length)
    console.log('📊 첫 날짜:', allDates[0]?.displayDate, '마지막 날짜:', allDates[allDates.length - 1]?.displayDate)
    
    return allDates
  }, [reviews])
  
  const getSentimentIcon = useCallback((sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <ThumbsUp className="w-4 h-4 text-green-600" />
      case "negative":
        return <ThumbsDown className="w-4 h-4 text-red-600" />
      case "analyzing":
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      default:
        return <Minus className="w-4 h-4 text-gray-600" />
    }
  }, [])
  
  const getSentimentColor = useCallback((sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 text-green-800"
      case "negative":
        return "bg-red-100 text-red-800"
      case "analyzing":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }, [])
  
  const getSentimentLabel = useCallback((sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "긍정"
      case "negative":
        return "부정"
      case "analyzing":
        return "분석 중"
      default:
        return "중립"
    }
  }, [])
  
  const getTemperatureColor = useCallback((score: number) => {
    if (score >= 75) return "text-green-600"
    if (score >= 50) return "text-yellow-600"
    if (score >= 25) return "text-orange-600"
    return "text-red-600"
  }, [])
  
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10 space-y-8 md:space-y-10">
      {/* 헤더 섹션 - 홈페이지 스타일 */}
      <header className="text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <MessageSquare className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight">
            리뷰 분석
          </h1>
        </div>
        <p className="text-base md:text-lg text-neutral-600 leading-relaxed max-w-3xl mx-auto mb-4">
          방문자 리뷰와 블로그 리뷰를 AI로 분석하여<br className="md:hidden" />
          <span className="hidden md:inline"> </span>긍정/부정 감성과 핵심 키워드를 파악합니다
        </p>
        <Badge 
          variant="secondary"
          className="bg-purple-100 text-purple-700 border-purple-200 px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" />
          AI 분석
        </Badge>
      </header>
      
      {/* 매장 선택 + 기간 선택 (PC에서 한 행) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 매장 선택 */}
        <Card className="border-gray-200 shadow-sm lg:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">매장 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger className="h-11 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all">
                {selectedStoreId && stores.find(s => s.id === selectedStoreId) ? (
                  <div className="flex items-center gap-2">
                    {stores.find(s => s.id === selectedStoreId)?.thumbnail ? (
                      <img src={stores.find(s => s.id === selectedStoreId)!.thumbnail} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-md bg-neutral-100 flex items-center justify-center flex-shrink-0">
                        <StoreIcon className="w-4 h-4 text-neutral-400" />
                      </div>
                    )}
                    <span className="text-sm truncate">{stores.find(s => s.id === selectedStoreId)?.name}</span>
                  </div>
                ) : (
                  <SelectValue placeholder="매장을 선택하세요" />
                )}
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id} className="py-2">
                    <div className="flex items-center gap-2">
                      {store.thumbnail ? (
                        <img src={store.thumbnail} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-md bg-neutral-100 flex items-center justify-center flex-shrink-0">
                          <StoreIcon className="w-4 h-4 text-neutral-400" />
                        </div>
                      )}
                      <span className="truncate">{store.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* 기간 선택 + 분석 버튼 */}
        <Card className="border-gray-200 shadow-sm lg:col-span-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">분석 기간 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
              {/* 기간 선택 버튼 그룹 */}
              <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2">
                <button
                  onClick={() => setDatePeriod("today")}
                  disabled={analyzing}
                  className={`h-10 px-2 sm:px-3 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap transition-all flex items-center justify-center ${
                    datePeriod === "today"
                      ? "bg-blue-500 text-white shadow-md border-2 border-blue-500"
                      : "bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  오늘
                </button>
                <button
                  onClick={() => setDatePeriod("yesterday")}
                  disabled={analyzing}
                  className={`h-10 px-2 sm:px-3 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap transition-all flex items-center justify-center ${
                    datePeriod === "yesterday"
                      ? "bg-blue-500 text-white shadow-md border-2 border-blue-500"
                      : "bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  어제
                </button>
                <button
                  onClick={() => setDatePeriod("last7days")}
                  disabled={analyzing}
                  className={`h-10 px-2 sm:px-3 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap transition-all flex items-center justify-center ${
                    datePeriod === "last7days"
                      ? "bg-blue-500 text-white shadow-md border-2 border-blue-500"
                      : "bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  지난 7일
                </button>
                <button
                  onClick={() => setDatePeriod("last30days")}
                  disabled={analyzing}
                  className={`h-10 px-2 sm:px-3 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap transition-all flex items-center justify-center ${
                    datePeriod === "last30days"
                      ? "bg-blue-500 text-white shadow-md border-2 border-blue-500"
                      : "bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  지난 30일
                </button>
              </div>

              {/* 리뷰 분석 버튼 */}
              <Button 
                onClick={handleAnalyze} 
                disabled={!selectedStoreId || analyzing}
                className="h-10 px-5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all lg:min-w-[140px]"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    분석 중
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    리뷰 분석
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 매장 정보 (선택 시 표시) */}
      {loadingPlaceInfo && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <RefreshCw className="w-4 h-4 animate-spin text-primary-500" />
              매장 정보 로딩 중...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              네이버 플레이스에서 매장 정보를 가져오고 있습니다.
            </div>
          </CardContent>
        </Card>
      )}
      
      {!loadingPlaceInfo && placeInfo && (
        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* 왼쪽: 썸네일 */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                  {(() => {
                    // 백엔드가 반환하는 image_url 또는 thumbnail 필드 사용
                    const imgUrl = (placeInfo as any).image_url || (placeInfo as any).thumbnail || ''
                    
                    return imgUrl ? (
                      <img 
                        src={imgUrl} 
                        alt={placeInfo.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const parent = e.currentTarget.parentElement
                          if (parent) {
                            parent.innerHTML = `<svg class="w-8 h-8 md:w-10 md:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>`
                          }
                        }}
                      />
                    ) : (
                      <StoreIcon className="w-8 h-8 md:w-10 md:h-10 text-gray-400" />
                    )
                  })()}
                </div>
              </div>

              {/* 중앙: 매장 정보 */}
              <div className="flex-1 min-w-0">
                {/* 매장명 + 평점 */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 truncate">{placeInfo.name}</h3>
                    {placeInfo.rating !== null && (
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-semibold text-gray-900">{placeInfo.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 기본 정보 */}
                <div className="space-y-2 mb-3">
                  {(placeInfo as any).category && (
                    <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                      <span className="font-medium">업종:</span>
                      <span className="text-gray-800">{(placeInfo as any).category}</span>
                    </div>
                  )}
                  {(placeInfo as any).address && (
                    <div className="flex items-start gap-2 text-xs md:text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5"></div>
                      <span className="font-medium">주소:</span>
                      <span className="text-gray-800 flex-1 line-clamp-1">{(placeInfo as any).address}</span>
                    </div>
                  )}
                  {placeInfo.description && (
                    <div className="flex items-start gap-2 text-xs md:text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5"></div>
                      <span className="font-medium">설명:</span>
                      <span className="text-gray-800 flex-1 line-clamp-2">{placeInfo.description}</span>
                    </div>
                  )}
                </div>

                {/* 리뷰 수 - TurboTax 스타일 */}
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-primary-500 px-3 py-1.5 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-white" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-white/95">방문자</span>
                      <span className="text-sm font-semibold text-white">{placeInfo.visitor_review_count.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-700 px-3 py-1.5 rounded-lg">
                    <FileText className="w-4 h-4 text-white" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-white/95">블로그</span>
                      <span className="text-sm font-semibold text-white">{placeInfo.blog_review_count.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 리뷰 추출 중 로딩 UI - Compact */}
      {extracting && (
        <Card className="border-green-200 bg-green-50 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 md:gap-4">
              <RefreshCw className="w-6 h-6 md:w-8 md:h-8 text-green-500 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm md:text-base font-semibold text-green-900 mb-1">리뷰 추출 중...</h3>
                <p className="text-xs md:text-sm text-green-700">선택한 기간의 리뷰를 정확히 추출하고 있습니다.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 리뷰 분석 중 로딩 + Progress Bar - Compact */}
      {analyzing && !extracting && !extractingSummary && (
        <Card className="border-blue-200 bg-blue-50 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="space-y-3">
              {/* 상단: 진행 상황 */}
              <div className="flex items-center gap-3">
                <RefreshCw className="w-6 h-6 md:w-8 md:h-8 text-blue-500 animate-spin flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm md:text-base font-semibold text-blue-900">리뷰 분석 중...</h3>
                  <p className="text-xs md:text-sm text-blue-700">
                    전체 {reviews.length}개 중 {analyzedCount}개 분석 완료 ({Math.round(analysisProgress)}%)
                  </p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* AI 요약 추출 중 로딩 UI - Compact */}
      {extractingSummary && (
        <Card className="border-purple-200 bg-purple-50 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 md:gap-4">
              <RefreshCw className="w-6 h-6 md:w-8 md:h-8 text-purple-500 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm md:text-base font-semibold text-purple-900">리뷰 분석결과를 추출 중입니다</h3>
                <p className="text-xs md:text-sm text-purple-700">잠시만 기다려주세요! ✨</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 실시간 리뷰온도별 현황 - 분석 중이거나 완료 후에도 표시 */}
      {(analyzing || (reviews.length > 0 && (currentStats.positive > 0 || currentStats.neutral > 0 || currentStats.negative > 0))) && (
        <div className="space-y-3">
          {/* 상단: 전체 리뷰 수 히어로 카드 */}
          <Card className="border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50 shadow-sm">
            <CardContent className="pt-4 md:pt-5 pb-4 md:pb-5">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm md:text-base font-bold text-gray-900">
                  {analyzing ? "🔄 실시간 분석 현황" : "✅ 분석 결과"}
                </h4>
              </div>
            
            {/* 전체 리뷰 수 - 히어로 카드 (TurboTax 스타일) */}
            <div className="mb-4 p-6 md:p-8 bg-white rounded-xl shadow-md border border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                {/* 왼쪽: 전체 리뷰 수 */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-14 h-14 md:w-16 md:h-16 bg-primary-500 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-7 h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <div>
                    <div className="text-sm md:text-base text-gray-600 mb-1 font-medium">기간내 전체 리뷰</div>
                    <div className="text-5xl md:text-6xl font-bold text-gray-900 tracking-tight">{reviews.length}</div>
                    <div className="text-xs md:text-sm text-gray-500 mt-1">총 리뷰 분석 완료</div>
                  </div>
                </div>
                
                {/* 오른쪽: 일별 리뷰 수 라인 그래프 (2일 이상만 표시) */}
                {dailyReviewCounts.length > 1 && (() => {
                  const maxCount = Math.max(...dailyReviewCounts.map(d => d.count))
                  const minCount = Math.min(...dailyReviewCounts.map(d => d.count))
                  const range = maxCount - minCount || 1
                  
                  const padding = 30
                  const svgWidth = 400
                  const width = svgWidth - padding * 2
                  const height = 80 - 20
                  
                  // 좌표 계산
                  const points = dailyReviewCounts.map((item, idx) => {
                    const x = padding + (idx / (dailyReviewCounts.length - 1)) * width
                    const y = 10 + ((maxCount - item.count) / range) * height
                    return { x, y, ...item }
                  })
                  
                  // 날짜 레이블용 포인트 (첫, 중간, 마지막)
                  const labelIndices = [0, Math.floor(dailyReviewCounts.length / 2), dailyReviewCounts.length - 1]
                  
                  return (
                    <div className="flex-1 min-w-0 max-w-full sm:max-w-lg">
                      <div className="text-xs md:text-sm text-gray-600 mb-2 text-right font-medium">일별 리뷰 추이</div>
                      <div className="relative w-full h-32 pb-6">
                        <svg 
                          className="w-full h-full" 
                          viewBox="0 0 400 100" 
                          preserveAspectRatio="xMidYMid meet"
                          onMouseLeave={() => setExpandedReviews(new Set())}
                        >
                          <defs>
                            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                            </linearGradient>
                          </defs>
                          
                          {/* 그라데이션 영역 */}
                          <path 
                            d={`M ${padding} 80 L ${points.map(p => `${p.x} ${p.y}`).join(' L ')} L ${padding + width} 80 Z`}
                            fill="url(#areaGradient)" 
                          />
                          
                          {/* 날짜 레이블 배경 (흰색 박스) */}
                          <rect x="0" y="85" width="400" height="15" fill="white" />
                          
                          {/* 라인 */}
                          <path 
                            d={points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          
                          {/* 포인트 + 호버 영역 */}
                          {points.map((point, idx) => (
                            <g key={idx}>
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="3"
                                fill="white"
                                stroke="#3b82f6"
                                strokeWidth="2"
                              />
                              {/* 호버 영역 */}
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="12"
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect()
                                  if (rect) {
                                    const tooltip = document.getElementById(`tooltip-${idx}`)
                                    if (tooltip) {
                                      tooltip.style.display = 'block'
                                    }
                                  }
                                }}
                                onMouseLeave={() => {
                                  const tooltip = document.getElementById(`tooltip-${idx}`)
                                  if (tooltip) {
                                    tooltip.style.display = 'none'
                                  }
                                }}
                              />
                            </g>
                          ))}
                          
                          {/* 날짜 레이블 (SVG 내부) */}
                          {labelIndices.map((idx) => {
                            const point = points[idx]
                            return (
                              <text
                                key={`label-${idx}`}
                                x={point.x}
                                y="94"
                                textAnchor="middle"
                                fill="#9ca3af"
                                fontSize="10"
                                fontFamily="system-ui, -apple-system, sans-serif"
                              >
                                {point.displayDate}
                              </text>
                            )
                          })}
                        </svg>
                        
                        {/* 커스텀 툴팁 */}
                        {points.map((point, idx) => (
                          <div
                            key={`tooltip-${idx}`}
                            id={`tooltip-${idx}`}
                            className="absolute bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none z-20"
                            style={{
                              display: 'none',
                              left: `${(point.x / svgWidth) * 100}%`,
                              top: '0',
                              transform: 'translate(-50%, -100%)',
                              marginTop: '-8px'
                            }}
                          >
                            {point.displayDate}: {point.count}개
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
            
            {/* 통계 카드들 - TurboTax 스타일 */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
              {/* 긍정 리뷰 */}
              <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm hover:shadow-md transition-all border border-gray-200">
                {analyzing && (
                  <div className="absolute top-1.5 right-1.5">
                    <RefreshCw className="w-2.5 h-2.5 text-primary-500 animate-spin" />
                  </div>
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-success rounded-lg flex items-center justify-center mb-1">
                    <ThumbsUp className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-gray-900">{currentStats.positive}</div>
                  <div className="text-[10px] md:text-xs font-medium text-gray-600 mt-0.5">긍정</div>
                  <div className="text-[9px] md:text-[10px] text-gray-500">
                    {reviews.length > 0 ? Math.round((currentStats.positive / reviews.length) * 100) : 0}%
                  </div>
                </div>
              </div>
              
              {/* 중립 리뷰 */}
              <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm hover:shadow-md transition-all border border-gray-200">
                {analyzing && (
                  <div className="absolute top-1.5 right-1.5">
                    <RefreshCw className="w-2.5 h-2.5 text-primary-500 animate-spin" />
                  </div>
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-gray-400 rounded-lg flex items-center justify-center mb-1">
                    <Minus className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-gray-900">{currentStats.neutral}</div>
                  <div className="text-[10px] md:text-xs font-medium text-gray-600 mt-0.5">중립</div>
                  <div className="text-[9px] md:text-[10px] text-gray-500">
                    {reviews.length > 0 ? Math.round((currentStats.neutral / reviews.length) * 100) : 0}%
                  </div>
                </div>
              </div>
              
              {/* 부정 리뷰 */}
              <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm hover:shadow-md transition-all border border-gray-200">
                {analyzing && (
                  <div className="absolute top-1.5 right-1.5">
                    <RefreshCw className="w-2.5 h-2.5 text-primary-500 animate-spin" />
                  </div>
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-error rounded-lg flex items-center justify-center mb-1">
                    <ThumbsDown className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-gray-900">{currentStats.negative}</div>
                  <div className="text-[10px] md:text-xs font-medium text-gray-600 mt-0.5">부정</div>
                  <div className="text-[9px] md:text-[10px] text-gray-500">
                    {reviews.length > 0 ? Math.round((currentStats.negative / reviews.length) * 100) : 0}%
                  </div>
                </div>
              </div>
              
              {/* 사진 리뷰 */}
              <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm hover:shadow-md transition-all border border-gray-200">
                {analyzing && (
                  <div className="absolute top-1.5 right-1.5">
                    <RefreshCw className="w-2.5 h-2.5 text-primary-500 animate-spin" />
                  </div>
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-primary-500 rounded-lg flex items-center justify-center mb-1">
                    <ImageIcon className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-gray-900">
                    {reviews.filter(r => r.images && r.images.length > 0).length}
                  </div>
                  <div className="text-[10px] md:text-xs font-medium text-gray-600 mt-0.5">사진리뷰</div>
                  <div className="text-[9px] md:text-[10px] text-gray-500">
                    {reviews.length > 0 
                      ? Math.round((reviews.filter(r => r.images && r.images.length > 0).length / reviews.length) * 100) 
                      : 0}%
                  </div>
                </div>
              </div>
              
              {/* 평균 온도 */}
              <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm hover:shadow-md transition-all border border-gray-200">
                {analyzing && (
                  <div className="absolute top-1.5 right-1.5">
                    <RefreshCw className="w-2.5 h-2.5 text-primary-500 animate-spin" />
                  </div>
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-warning rounded-lg flex items-center justify-center mb-1">
                    <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-gray-900">
                    {reviews.length > 0 
                      ? Math.round(reviews.reduce((sum, r) => sum + (r.temperature_score || 0), 0) / reviews.length) 
                      : 0}°
                  </div>
                  <div className="text-[10px] md:text-xs font-medium text-gray-600 mt-0.5">온도</div>
                  <div className="text-[9px] md:text-[10px] text-gray-500">평균</div>
                </div>
              </div>
            </div>

            {/* 조회 정보 - 컴팩트 버전 */}
            {stats && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center gap-2 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span className="font-medium">조회 일자:</span>
                    <span>{stats.date}</span>
                  </div>
                  <span className="hidden md:inline text-gray-300">|</span>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span className="font-medium">조회 시간:</span>
                    <span>{new Date(stats.checked_at).toLocaleString("ko-KR")}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      )}
      
      {/* AI 요약 */}
      {stats && (
          <Card className="border-gray-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary-500" />
                AI 요약
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  // AI 요약을 섹션으로 분리 (개선된 파싱 로직)
                  const text = stats.summary.trim()
                  const sections: { title: string; content: string }[] = []
                  
                  // "### 1️⃣ 제목" 또는 "1. 제목" 형식을 모두 처리
                  // 먼저 ### 패턴 시도
                  const hashPattern = /###\s*[0-9️⃣①②③④⑤]+\s*([^\n]+)/g
                  let match
                  
                  while ((match = hashPattern.exec(text)) !== null) {
                    const title = match[1].trim()
                    // 다음 섹션 시작 위치까지의 내용 추출
                    const currentIndex = match.index + match[0].length
                    const nextMatch = hashPattern.exec(text)
                    const endIndex = nextMatch ? nextMatch.index : text.length
                    hashPattern.lastIndex = nextMatch ? nextMatch.index : text.length
                    
                    const content = text.substring(currentIndex, endIndex).trim()
                    sections.push({ title, content })
                  }
                  
                  // ### 패턴이 안 되면 숫자. 패턴 시도
                  if (sections.length === 0) {
                    const numberPattern = /(\d+)\.\s*([^\n]+?)(?:\n([^\d][^\n]*?))?(?=\n\d+\.|$)/g
                    while ((match = numberPattern.exec(text)) !== null) {
                      const title = match[2].trim()
                      const content = match[3] ? match[3].trim() : ''
                      sections.push({ title, content })
                    }
                  }
                  
                  // 섹션이 제대로 파싱되었으면 분리해서 표시
                  if (sections.length >= 2) {
                    return sections.map((section, idx) => (
                      <div 
                        key={idx} 
                        className="group relative"
                      >
                        {/* 메인 카드 - TurboTax 스타일 */}
                        <div className="relative flex items-start gap-4 p-4 md:p-5 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-gray-100 transition-all">
                          {/* 번호 아이콘 - TurboTax 스타일 */}
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary-500 flex items-center justify-center">
                              <span className="text-white text-base md:text-lg font-bold">{idx + 1}</span>
                            </div>
                          </div>
                          
                          {/* 섹션 내용 */}
                          <div className="flex-1 min-w-0">
                            {/* 제목 - 크고 bold */}
                            <h4 className="text-lg md:text-xl font-bold text-gray-900 mb-2 leading-snug">
                              {section.title}
                            </h4>
                            
                            {/* 구분선 - TurboTax 스타일 */}
                            {section.content && (
                              <div className="w-12 h-0.5 bg-primary-500 rounded-full mb-3"></div>
                            )}
                            
                            {/* 내용 */}
                            {section.content && (
                              <p className="text-sm md:text-base leading-relaxed text-gray-700">
                                {section.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  } else {
                    // 파싱 실패 시 기존대로 표시
                    return (
                      <p className="text-sm md:text-base leading-relaxed text-gray-800 whitespace-pre-wrap">
                        {stats.summary}
                      </p>
                    )
                  }
                })()}
              </div>
            </CardContent>
          </Card>
      )}
      
      {/* 리뷰 없음 메시지 - 분석 시도 후에만 표시 */}
      {hasAttemptedAnalysis && !analyzing && !extracting && reviews.length === 0 && (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-2">등록된 리뷰가 없습니다</h3>
              <p className="text-xs md:text-sm text-gray-600">
                선택한 기간 동안 등록된 리뷰가 없습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 리뷰 목록 */}
      {reviews.length > 0 && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <CardTitle className="text-base font-semibold text-gray-900">
                리뷰 목록 ({filteredReviews.length}개)
                {sentimentFilter !== "all" && <span className="text-sm text-gray-500 ml-2">/ 전체 {reviews.length}개</span>}
              </CardTitle>
              
              {/* 필터 */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                
                <select
                  className="h-9 md:h-10 w-full md:w-[130px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  value={sentimentFilter}
                  onChange={(e) => setSentimentFilter(e.target.value)}
                >
                  <option value="all">전체</option>
                  <option value="positive">긍정 리뷰</option>
                  <option value="neutral">중립 리뷰</option>
                  <option value="negative">부정 리뷰</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 md:space-y-3">
              {filteredReviews.map((review) => (
                <ReviewItem
                  key={review.naver_review_id || review.id}
                  review={review}
                  isExpanded={expandedReviews.has(review.id)}
                  onToggle={toggleReviewExpanded}
                  getTemperatureColor={getTemperatureColor}
                  getSentimentColor={getSentimentColor}
                  getSentimentIcon={getSentimentIcon}
                  getSentimentLabel={getSentimentLabel}
                />
              ))}
              
              {filteredReviews.length === 0 && (
                <div className="text-center py-8 text-gray-600 text-sm">
                  필터에 맞는 리뷰가 없습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
