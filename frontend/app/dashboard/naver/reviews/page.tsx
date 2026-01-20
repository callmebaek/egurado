"use client"

import { useState, useEffect, useMemo, memo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { api } from "@/lib/config"
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
  Store,
  FileText,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from "lucide-react"

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
  const truncatedContent = review.content.length > 20 
    ? review.content.substring(0, 20) + "..." 
    : review.content

  return (
    <Card className="p-3">
      {/* 리뷰 헤더 - Compact */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="font-medium text-sm">{review.author_name}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date(review.review_date).toLocaleDateString("ko-KR")}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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
          <Badge className={`${getSentimentColor(review.sentiment)} text-xs py-0 px-2`}>
            {getSentimentIcon(review.sentiment)}
            <span className="ml-1">{getSentimentLabel(review.sentiment)}</span>
          </Badge>
        </div>
      </div>
      
      {/* 리뷰 내용 미리보기 - Compact */}
      <p className="text-sm leading-snug mb-1">
        {isExpanded ? review.content : truncatedContent}
      </p>
      
      {/* 펼치기/접기 버튼 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onToggle(review.id)}
        className="w-full mt-1 text-xs h-7"
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
        <div className="mt-3 pt-3 border-t">
          {/* 이미지 */}
          {review.images && review.images.length > 0 && (
            <div className="flex gap-2 mb-3">
              {review.images.slice(0, 4).map((img: string, idx: number) => (
                <img 
                  key={idx}
                  src={img} 
                  alt={`리뷰 이미지 ${idx + 1}`}
                  className="w-16 h-16 object-cover rounded"
                />
              ))}
              {review.images.length > 4 && (
                <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-600">
                  +{review.images.length - 4}
                </div>
              )}
            </div>
          )}
          
          {/* 상세 메타 정보 */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
  const { user } = useAuth()
  
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
  
  // 매장 목록 로드
  useEffect(() => {
    loadStores()
  }, [])
  
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
      
      if (!user) {
        console.log("❌ 로그인된 사용자 없음")
        return
      }
      
      const apiUrl = api.stores.list(user.id)
      console.log("🌐 API URL:", apiUrl)
      
      const response = await fetch(apiUrl)
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
        const last7days = new Date(today)
        last7days.setDate(last7days.getDate() - 6) // 오늘 포함 7일
        return { start_date: formatDate(last7days), end_date: todayStr }
      case "last30days":
        const last30days = new Date(today)
        last30days.setDate(last30days.getDate() - 29) // 오늘 포함 30일
        return { start_date: formatDate(last30days), end_date: todayStr }
      case "today":
      default:
        return { start_date: todayStr, end_date: todayStr }
    }
  }
  
  const handleAnalyze = async () => {
    if (!selectedStoreId) return
    
    const dateRange = getDateRange()
    console.log("========================================")
    console.log("🔄 하이브리드 리뷰 분석 시작")
    console.log("========================================")
    console.log("📅 선택된 기간:", datePeriod)
    console.log("📅 시작 날짜:", dateRange.start_date)
    console.log("📅 종료 날짜:", dateRange.end_date)
    console.log("🏪 Store ID:", selectedStoreId)
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
    setAnalysisProgress(0)
    
    try {
      // 1단계: 리뷰 추출 (빠름)
      console.log("📥 1단계: 리뷰 추출 중...")
      const extractResponse = await fetch(api.reviews.extract(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: selectedStoreId,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date
        })
      })
      
      if (!extractResponse.ok) {
        throw new Error("리뷰 추출 실패")
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
      
      const eventSource = new EventSource(
        api.reviews.analyzeStream(selectedStoreId, dateRange.start_date, dateRange.end_date)
      )
      
      eventSource.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data)
          
          switch (data.type) {
            case 'init':
              console.log(`📊 분석 초기화: 총 ${data.total}개`)
              break
              
            case 'progress':
              const progress = Math.round((data.current / data.total) * 100)
              setAnalysisProgress(progress)
              setAnalyzedCount(data.current)
              console.log(`⏳ 진행: ${data.current}/${data.total} (${progress}%)`)
              break
              
            case 'review_analyzed':
              console.log(`✅ 리뷰 분석 완료:`, data.review)
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
              eventSource.close()
              
              setAnalysisProgress(100)
              
              // 통계와 리뷰 목록 새로고침 (오늘 날짜 기준)
              const today = new Date().toISOString().split('T')[0]
              console.log("📊 통계 로딩 시작 (날짜:", today, ")...")
              await loadStats(today)
              console.log("📝 리뷰 목록 로딩 시작...")
              await loadReviews()
              console.log("✅ 통계 및 리뷰 로딩 완료")
              
              toast({
                title: "리뷰 분석 완료",
                description: `${data.total_analyzed}개의 리뷰를 분석했습니다.`,
              })
              
              setAnalyzing(false)
              setTimeout(() => setAnalysisProgress(0), 1000)
              break
              
            case 'error':
              console.error("❌ 분석 오류:", data.message)
              eventSource.close()
              throw new Error(data.message)
          }
        } catch (err) {
          console.error("SSE 파싱 오류:", err)
        }
      }
      
      eventSource.onerror = (error) => {
        console.error("❌ SSE 연결 오류:", error)
        eventSource.close()
        setAnalyzing(false)
        toast({
          title: "분석 중 오류 발생",
          description: "네트워크 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
      
    } catch (error) {
      console.error("리뷰 분석 실패:", error)
      setExtracting(false)
      setAnalyzing(false)
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
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
      <div>
          <h1 className="text-3xl font-bold">리뷰 관리</h1>
          <p className="text-muted-foreground mt-1">
            리뷰 통계 및 현황 분석
        </p>
      </div>

        <div className="flex items-center gap-3">
          {/* 기간 선택 */}
          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            value={datePeriod}
            onChange={(e) => setDatePeriod(e.target.value)}
            disabled={analyzing}
          >
            <option value="today">오늘</option>
            <option value="yesterday">어제</option>
            <option value="last7days">지난 7일</option>
            <option value="last30days">지난 30일</option>
          </select>
          
          <Button onClick={handleAnalyze} disabled={!selectedStoreId || analyzing}>
            {analyzing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                리뷰 분석
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* 매장 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>매장 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
          >
            <option value="">매장을 선택하세요</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>
      
      {/* 매장 정보 (선택 시 표시) */}
      {loadingPlaceInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              매장 정보 로딩 중...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              네이버 플레이스에서 매장 정보를 가져오고 있습니다.
            </div>
          </CardContent>
        </Card>
      )}
      
      {!loadingPlaceInfo && placeInfo && (
        <Card className="bg-gradient-to-r from-gray-50 to-blue-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              {/* 매장명 + 평점 */}
              <div className="flex items-center gap-3">
                <Store className="w-5 h-5 text-gray-600" />
                <div>
                  <h3 className="text-base font-bold text-gray-900">{placeInfo.name}</h3>
                  {placeInfo.rating !== null && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-semibold text-gray-700">{placeInfo.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 리뷰 수 - Compact & 가독성 개선 */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-xs font-medium text-blue-700">방문자</div>
                    <div className="text-base font-bold text-blue-900">{placeInfo.visitor_review_count.toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="text-xs font-medium text-green-700">블로그</div>
                    <div className="text-base font-bold text-green-900">{placeInfo.blog_review_count.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 리뷰 추출 중 로딩 UI - Compact */}
      {extracting && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <RefreshCw className="w-8 h-8 text-green-500 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-base font-semibold text-green-900 mb-1">리뷰 추출 중...</h3>
                <p className="text-sm text-green-700">선택한 기간의 리뷰를 정확히 추출하고 있습니다.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 리뷰 분석 중 로딩 + Progress Bar - Compact */}
      {analyzing && !extracting && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 pb-4">
            <div className="space-y-3">
              {/* 상단: 진행 상황 */}
              <div className="flex items-center gap-3">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-blue-900">리뷰 분석 중...</h3>
                  <p className="text-sm text-blue-700">
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
      
      {/* 실시간 리뷰온도별 현황 - 분석 중이거나 완료 후에도 표시 */}
      {(analyzing || (reviews.length > 0 && (currentStats.positive > 0 || currentStats.neutral > 0 || currentStats.negative > 0))) && (
        <Card className="border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50">
          <CardContent className="pt-5 pb-5">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-gray-900">
                {analyzing ? "🔄 실시간 분석 현황" : "✅ 분석 결과"}
              </h4>
            </div>
            
            {/* 전체 리뷰 수 + 일별 리뷰 추이 그래프 */}
            <div className="mb-4 p-4 bg-white rounded-xl shadow-sm border-2 border-blue-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                {/* 왼쪽: 전체 리뷰 수 */}
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                  <div>
                    <div className="text-sm text-gray-600 mb-1">기간내 전체 리뷰</div>
                    <div className="text-4xl font-bold text-blue-600">{reviews.length}</div>
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
                      <div className="text-xs text-gray-500 mb-2 text-right">일별 리뷰 추이</div>
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
            
            {/* 통계 카드들 */}
            <div className="grid grid-cols-5 gap-3">
              {/* 긍정 리뷰 */}
              <div className="relative text-center p-4 bg-white rounded-xl shadow-sm border border-green-200 hover:shadow-md transition-shadow">
                {analyzing && (
                  <div className="absolute top-2 right-2">
                    <RefreshCw className="w-3 h-3 text-green-500 animate-spin" />
                  </div>
                )}
                <div className="text-3xl font-bold text-green-600">{currentStats.positive}</div>
                <div className="text-xs font-medium text-gray-600 mt-2">긍정</div>
                <div className="text-xs text-gray-400 mt-1">
                  {reviews.length > 0 ? Math.round((currentStats.positive / reviews.length) * 100) : 0}%
                </div>
              </div>
              
              {/* 중립 리뷰 */}
              <div className="relative text-center p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                {analyzing && (
                  <div className="absolute top-2 right-2">
                    <RefreshCw className="w-3 h-3 text-gray-500 animate-spin" />
                  </div>
                )}
                <div className="text-3xl font-bold text-gray-600">{currentStats.neutral}</div>
                <div className="text-xs font-medium text-gray-600 mt-2">중립</div>
                <div className="text-xs text-gray-400 mt-1">
                  {reviews.length > 0 ? Math.round((currentStats.neutral / reviews.length) * 100) : 0}%
                </div>
              </div>
              
              {/* 부정 리뷰 */}
              <div className="relative text-center p-4 bg-white rounded-xl shadow-sm border border-red-200 hover:shadow-md transition-shadow">
                {analyzing && (
                  <div className="absolute top-2 right-2">
                    <RefreshCw className="w-3 h-3 text-red-500 animate-spin" />
                  </div>
                )}
                <div className="text-3xl font-bold text-red-600">{currentStats.negative}</div>
                <div className="text-xs font-medium text-gray-600 mt-2">부정</div>
                <div className="text-xs text-gray-400 mt-1">
                  {reviews.length > 0 ? Math.round((currentStats.negative / reviews.length) * 100) : 0}%
                </div>
              </div>
              
              {/* 사진 리뷰 */}
              <div className="relative text-center p-4 bg-white rounded-xl shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
                {analyzing && (
                  <div className="absolute top-2 right-2">
                    <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                  </div>
                )}
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <div className="text-xl font-bold text-blue-600">
                    {reviews.filter(r => r.images && r.images.length > 0).length}
                  </div>
                  <span className="text-sm text-gray-400">/</span>
                  <div className="text-sm text-gray-500">{reviews.length}</div>
                </div>
                <div className="text-xs font-medium text-gray-600 mt-1">사진리뷰</div>
                <div className="text-xs text-gray-400 mt-1">
                  {reviews.length > 0 
                    ? Math.round((reviews.filter(r => r.images && r.images.length > 0).length / reviews.length) * 100) 
                    : 0}%
                </div>
              </div>
              
              {/* 평균 온도 */}
              <div className="relative text-center p-4 bg-white rounded-xl shadow-sm border border-orange-200 hover:shadow-md transition-shadow">
                {analyzing && (
                  <div className="absolute top-2 right-2">
                    <RefreshCw className="w-3 h-3 text-orange-500 animate-spin" />
                  </div>
                )}
                <div className="text-3xl font-bold text-orange-600">
                  {reviews.length > 0 
                    ? Math.round(reviews.reduce((sum, r) => sum + (r.temperature_score || 0), 0) / reviews.length) 
                    : 0}°
                </div>
                <div className="text-xs font-medium text-gray-600 mt-2">평균온도</div>
                <div className="text-xs text-gray-400 mt-1">리뷰온도</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 통계 요약 */}
      {stats && (
        <div className="space-y-4">
          {/* 조회 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                조회 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>조회 일자: {stats.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>조회 시간: {new Date(stats.checked_at).toLocaleString("ko-KR")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* AI 요약 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI 요약
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{stats.summary}</p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* 리뷰 없음 메시지 - 분석 시도 후에만 표시 */}
      {hasAttemptedAnalysis && !analyzing && !extracting && reviews.length === 0 && (
        <Card className="border-gray-200">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 mb-2">등록된 리뷰가 없습니다</h3>
              <p className="text-sm text-muted-foreground">
                선택한 기간 동안 등록된 리뷰가 없습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 리뷰 목록 */}
      {reviews.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                리뷰 목록 ({filteredReviews.length}개)
                {sentimentFilter !== "all" && <span className="text-sm text-gray-500 ml-2">/ 전체 {reviews.length}개</span>}
              </CardTitle>
              
              {/* 필터 */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                
                <select
                  className="flex h-10 w-[130px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
            <div className="space-y-3">
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
                <div className="text-center py-8 text-muted-foreground">
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
