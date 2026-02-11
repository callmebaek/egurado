"use client"

import { useState, useEffect, useRef } from "react"
import { Store, CheckCircle2, AlertCircle, X, ExternalLink, FileText, Calendar, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/config"
import { notifyCreditUsed } from "@/lib/credit-utils"
import { useCreditConfirm } from "@/lib/hooks/useCreditConfirm"
import { useSearchParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface RegisteredStore {
  id: string
  place_id: string
  name: string
  category: string
  address: string
  road_address?: string
  thumbnail?: string
  platform: string
  status: string
  created_at: string
}

interface PlaceDetails {
  // 기본 정보
  place_id: string
  name: string
  category: string
  address: string
  road_address: string
  phone_number?: string
  latitude?: string
  longitude?: string
  
  // 평점 및 리뷰
  visitor_review_score?: number
  visitor_review_count?: number
  blog_review_count?: number
  
  // 이미지
  image_url?: string
  image_count?: number
  menu_images?: string[]
  facility_images?: string[]
  
  // 영업 정보
  business_hours?: any
  closed_days?: string[]
  menus?: Array<{
    name: string
    price?: number
    description?: string
  }>
  
  // 편의시설
  parking?: string
  booking_available?: boolean
  conveniences?: string[]
  payment_methods?: string[]
  pet_friendly?: boolean
  group_seating?: boolean
  
  // 키워드
  keyword_list?: string[]
  
  // SNS 및 웹사이트
  homepage_url?: string
  homepage?: string
  blog?: string
  instagram?: string
  
  // 기타
  description?: string
  ai_briefing?: string
  directions?: string
  micro_reviews?: string[]
  promotions?: {
    total: number
    coupons?: Array<{ title: string }>
  }
  announcements?: Array<{ title: string; relativeCreated: string }>
  tv_program?: string
  
  is_place_plus?: boolean
  has_naverpay_in_search?: boolean
  [key: string]: any  // 추가 속성 허용
}

interface DiagnosisResult {
  diagnosis_date: string
  total_score: number
  max_score: number
  bonus_score: number
  grade: string
  evaluations: {
    [key: string]: {
      category_name: string
      score: number
      max_score: number
      grade: string
      is_bonus: boolean
      recommendations?: Array<{
        action: string
        method: string
        copy_example?: string
        note?: string
        estimated_gain: number
      }>
    }
  }
  priority_actions: Array<{
    action: string
    method: string
    copy_example?: string
    note?: string
    estimated_gain: number
    category: string
    priority: number
  }>
}

interface DiagnosisHistoryItem {
  id: string
  diagnosed_at: string
  total_score: number
  max_score: number
  grade: string
}

export default function NaverAuditPage() {
  const { user, getToken } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  
  const [stores, setStores] = useState<RegisteredStore[]>([])
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null)
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null)
  
  // 진단 히스토리 관련 state
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [diagnosisHistory, setDiagnosisHistory] = useState<DiagnosisHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isLoadingHistoryDetail, setIsLoadingHistoryDetail] = useState(false)

  // 종합 요약 섹션 ref
  const summaryRef = useRef<HTMLDivElement>(null)
  
  // 크레딧 확인 모달
  const { showCreditConfirm, CreditModal } = useCreditConfirm()

  // URL 파라미터에서 historyId를 가져와서 자동으로 로드
  useEffect(() => {
    const historyId = searchParams.get('historyId')
    if (historyId && user) {
      handleViewHistoryDetail(historyId)
    }
  }, [searchParams, user])

  // 등록된 매장 목록 가져오기
  useEffect(() => {
    if (user) {
      fetchStores()
    }
  }, [user])

  const fetchStores = async () => {
    try {
      setIsLoading(true)
      const token = getToken()
      if (!token) return

      const response = await fetch(api.stores.list(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("매장 목록 조회에 실패했습니다.")
      }

      const data = await response.json()
      // 네이버 플레이스만 필터링
      const naverStores = data.stores.filter((store: RegisteredStore) => store.platform === "naver")
      setStores(naverStores)
    } catch (error) {
      console.error("Error fetching stores:", error)
      toast({
        variant: "destructive",
        title: "❌ 오류",
        description: "등록된 매장 목록을 불러오는데 실패했습니다.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 매장 선택 시 바로 진단 시작 (모달 없이)
  const executeStoreDiagnosis = async (store: RegisteredStore) => {
    try {
      setIsAnalyzing(true)
      console.log("🔍 플레이스 진단 시작:", store.place_id, store.name)
      const url = api.naver.analyzePlaceDetails(store.place_id, store.name, store.id)
      console.log("📡 API URL:", url)
      
      const token = getToken()
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      
      const response = await fetch(url, { headers })
      console.log("📥 Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Response error:", errorText)
        
        // 402 에러 (크레딧 부족)를 명시적으로 처리
        if (response.status === 402) {
          try {
            const errorData = JSON.parse(errorText)
            throw new Error(errorData.detail || "크레딧이 부족합니다.")
          } catch (parseError) {
            throw new Error("크레딧이 부족합니다.")
          }
        }
        
        throw new Error("플레이스 진단에 실패했습니다.")
      }

      const data = await response.json()
      console.log("✅ Response data:", data)
      console.log("📊 Details:", data.details)
      console.log("📈 Diagnosis:", data.diagnosis)
      
      setPlaceDetails(data.details)
      setDiagnosisResult(data.diagnosis)

      // ✨ 크레딧 실시간 차감 알림 (진단 8 크레딧, 인증된 경우만)
      if (token) {
        notifyCreditUsed(8, token)
      }

      toast({
        title: "✅ 진단 완료",
        description: `${store.name} 매장의 진단이 완료되었습니다.`,
      })

      // 진단 완료 후 종합 요약 섹션으로 스크롤
      setTimeout(() => {
        summaryRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        })
      }, 100)
    } catch (error) {
      console.error("❌ Error analyzing place:", error)
      const errorMessage = error instanceof Error ? error.message : "플레이스 진단에 실패했습니다."
      const isCreditsError = errorMessage.includes("크레딧")
      
      toast({
        variant: "destructive",
        title: isCreditsError ? "💳 크레딧 부족" : "❌ 진단 실패",
        description: errorMessage,
      })
      setSelectedStore(null)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleStoreSelect = (store: RegisteredStore) => {
    setSelectedStore(store)
    showCreditConfirm({
      featureName: "플레이스 진단",
      creditAmount: 8,
      onConfirm: () => executeStoreDiagnosis(store),
      onCancel: () => setSelectedStore(null),
    })
  }

  // 진단 히스토리 조회
  const handleViewHistory = async (store: RegisteredStore) => {
    setSelectedStore(store)
    setShowHistoryModal(true)
    setIsLoadingHistory(true)
    
    try {
      const token = getToken()
      if (!token) {
        throw new Error("로그인이 필요합니다.")
      }
      
      const response = await fetch(api.naver.diagnosisHistory(store.id), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (!response.ok) {
        throw new Error("히스토리 조회에 실패했습니다.")
      }
      
      const data = await response.json()
      setDiagnosisHistory(data.history || [])
    } catch (error) {
      console.error("Error fetching diagnosis history:", error)
      toast({
        variant: "destructive",
        title: "❌ 히스토리 조회 실패",
        description: error instanceof Error ? error.message : "히스토리 조회에 실패했습니다.",
      })
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // 특정 히스토리 상세 보기
  const handleViewHistoryDetail = async (historyId: string) => {
    setIsLoadingHistoryDetail(true)
    setShowHistoryModal(false)
    
    try {
      const token = getToken()
      if (!token) {
        throw new Error("로그인이 필요합니다.")
      }
      
      const response = await fetch(api.naver.diagnosisHistoryDetail(historyId), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (!response.ok) {
        throw new Error("히스토리 상세 조회에 실패했습니다.")
      }
      
      const data = await response.json()
      const historyDetail = data.history
      
      // 과거 진단 결과를 현재 진단 결과처럼 표시
      setPlaceDetails(historyDetail.place_details)
      setDiagnosisResult(historyDetail.diagnosis_result)
      
      // selectedStore도 히스토리 데이터에서 재구성하여 설정
      const storeFromHistory: RegisteredStore = {
        id: historyDetail.store_id,
        place_id: historyDetail.place_details.place_id,
        name: historyDetail.place_details.name,
        category: historyDetail.place_details.category,
        address: historyDetail.place_details.address,
        road_address: historyDetail.place_details.road_address,
        platform: "naver",
        status: "active",
        created_at: historyDetail.diagnosed_at,
      }
      setSelectedStore(storeFromHistory)
      
      toast({
        title: "📜 과거 진단 결과",
        description: `${new Date(historyDetail.diagnosed_at).toLocaleString('ko-KR')}의 진단 결과입니다.`,
      })

      // 히스토리 조회 후에도 종합 요약 섹션으로 스크롤
      setTimeout(() => {
        summaryRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        })
      }, 100)
    } catch (error) {
      console.error("Error fetching diagnosis history detail:", error)
      toast({
        variant: "destructive",
        title: "❌ 상세 조회 실패",
        description: error instanceof Error ? error.message : "상세 조회에 실패했습니다.",
      })
    } finally {
      setIsLoadingHistoryDetail(false)
    }
  }

  // 등급별 색상
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'bg-purple-500 hover:bg-purple-600'
      case 'A': return 'bg-blue-500 hover:bg-blue-600'
      case 'B': return 'bg-green-500 hover:bg-green-600'
      case 'C': return 'bg-yellow-500 hover:bg-yellow-600'
      case 'D': return 'bg-orange-500 hover:bg-orange-600'
      case 'F': return 'bg-red-500 hover:bg-red-600'
      default: return 'bg-neutral-500 hover:bg-neutral-600'
    }
  }

  const getGradeTextColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'text-purple-600'
      case 'A': return 'text-blue-600'
      case 'B': return 'text-green-600'
      case 'C': return 'text-yellow-600'
      case 'D': return 'text-orange-600'
      case 'F': return 'text-red-600'
      default: return 'text-neutral-600'
    }
  }

  const getPriorityColor = (priority: number) => {
    if (priority <= 3) return 'bg-red-500 hover:bg-red-600 text-white'
    if (priority <= 6) return 'bg-orange-500 hover:bg-orange-600 text-white'
    return 'bg-blue-500 hover:bg-blue-600 text-white'
  }

  // 진단 결과 셀 렌더링 (등급 + 개선사항)
  const renderDiagnosisCell = (evaluationKey: string) => {
    if (!diagnosisResult) {
      return <Badge variant="outline" className="text-xs">진단 전</Badge>
    }

    const evaluation = diagnosisResult.evaluations[evaluationKey]
    if (!evaluation) {
      return <Badge variant="outline" className="text-xs">평가항목 아님</Badge>
    }

    return (
      <div className="space-y-2">
        <Badge className={`${getGradeColor(evaluation.grade)} text-white text-xs md:text-sm`}>
          {evaluation.grade}등급
        </Badge>
        {evaluation.recommendations && evaluation.recommendations.length > 0 && (
          <Card className="bg-orange-50 border-orange-200 border-dashed">
            <CardContent className="p-2 md:p-3">
              <p className="text-xs font-semibold text-orange-600 mb-1.5">📌 개선사항</p>
              {evaluation.recommendations?.slice(0, 2).map((rec: any, idx: number) => (
                <div key={idx} className={idx < (evaluation.recommendations?.slice(0, 2).length ?? 0) - 1 ? 'mb-2' : ''}>
                  <p className="text-xs font-semibold text-neutral-900 mb-0.5">{rec.action}</p>
                  <p className="text-xs text-neutral-600 whitespace-pre-line">
                    {rec.method}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // 진단 결과가 있으면 결과 화면 표시
  if (placeDetails && selectedStore) {
    return (
      <div className="w-full max-w-4xl mx-auto p-3 md:p-6 lg:p-8">
        {/* 헤더 */}
        <div className="mb-4 md:mb-8 flex items-start justify-between gap-3 md:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-2xl font-bold text-neutral-900 mb-1 md:mb-1.5 leading-tight">
              플레이스 진단 리포트
            </h1>
            <p className="text-xs md:text-base text-neutral-600 leading-relaxed mb-1.5 md:mb-2 break-words">
              {selectedStore.name} - 네이버 플레이스 종합 진단
            </p>
            {diagnosisResult && (
              <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm text-neutral-500">
                <Calendar className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                <span className="truncate">
                  진단일: {new Date(diagnosisResult.diagnosis_date).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="font-semibold h-8 md:h-10 text-xs md:text-sm border-neutral-300 hover:border-primary-400 flex-shrink-0"
            onClick={() => {
              setSelectedStore(null)
              setPlaceDetails(null)
              setDiagnosisResult(null)
            }}
          >
            <X className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            닫기
          </Button>
        </div>

        {/* 종합 요약 */}
        {diagnosisResult && (
          <Card ref={summaryRef} className="mb-4 md:mb-8 rounded-card border-2 border-primary-500 shadow-card">
            <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
              <CardTitle className="text-sm md:text-lg font-bold text-neutral-900">
                📊 종합 요약
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
                {/* 좌측: 점수 및 정보 */}
                <div className="space-y-2 md:space-y-4">
                  {/* 종합 점수 */}
                  <Card className="rounded-lg bg-neutral-50 border-neutral-200">
                    <CardContent className="p-3 md:p-6">
                      <p className="text-xs md:text-sm font-semibold text-neutral-600 mb-1.5 md:mb-2">종합 점수</p>
                      <div className="flex items-baseline gap-1.5 md:gap-2">
                        <span className={`text-3xl md:text-5xl lg:text-6xl font-black ${getGradeTextColor(diagnosisResult.grade)}`}>
                          {diagnosisResult.total_score.toFixed(1)}
                        </span>
                        <span className="text-base md:text-xl text-neutral-500">
                          / {diagnosisResult.max_score}
                        </span>
                      </div>
                      {diagnosisResult.bonus_score > 0 && (
                        <Badge className="mt-1.5 md:mt-3 text-xs bg-green-500 hover:bg-green-600 text-white">
                          보너스 +{diagnosisResult.bonus_score}점
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* 플레이스 정보 */}
                  <Card className="bg-neutral-50 border-neutral-200">
                    <CardContent className="p-3 md:p-6">
                      <p className="text-xs md:text-sm font-semibold text-neutral-600 mb-2 md:mb-3">플레이스 정보</p>
                      <div className="space-y-1.5 md:space-y-2">
                        <div className="flex gap-1.5 md:gap-2 text-xs md:text-sm">
                          <span className="font-semibold text-neutral-700 min-w-[55px] md:min-w-[70px] flex-shrink-0">매장명:</span>
                          <span className="text-neutral-900 break-words">{placeDetails.name}</span>
                        </div>
                        <div className="flex gap-1.5 md:gap-2 text-xs md:text-sm">
                          <span className="font-semibold text-neutral-700 min-w-[55px] md:min-w-[70px] flex-shrink-0">카테고리:</span>
                          <span className="text-neutral-900">{placeDetails.category}</span>
                        </div>
                        <div className="flex gap-1.5 md:gap-2 text-xs md:text-sm">
                          <span className="font-semibold text-neutral-700 min-w-[55px] md:min-w-[70px] flex-shrink-0">주소:</span>
                          <span className="text-neutral-900 break-words">{placeDetails.address}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-1.5 md:mt-2 h-9 md:h-10 text-xs md:text-sm font-semibold border-neutral-300 hover:border-primary-400"
                          onClick={() => window.open(`https://pcmap.place.naver.com/place/${placeDetails.place_id}`, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-1.5" />
                          네이버에서 보기
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* 우측: 등급 원형 표시 */}
                <div className="flex items-center justify-center py-4 md:py-0">
                  <div className="text-center">
                    {/* 등급 원형 */}
                    <div className="relative w-40 h-40 md:w-64 md:h-64 mx-auto mb-3 md:mb-6">
                      <svg className="w-full h-full transform -rotate-90">
                        {/* 배경 원 */}
                        <circle
                          cx="50%"
                          cy="50%"
                          r="40%"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                        />
                        {/* 진행 원 */}
                        <circle
                          cx="50%"
                          cy="50%"
                          r="40%"
                          fill="none"
                          stroke={getGradeTextColor(diagnosisResult.grade).replace('text-', '')}
                          strokeWidth="8"
                          strokeDasharray={`${(diagnosisResult.total_score / diagnosisResult.max_score) * 251.2} 251.2`}
                          strokeLinecap="round"
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div>
                          <div className={`text-4xl md:text-6xl lg:text-7xl font-black ${getGradeTextColor(diagnosisResult.grade)}`}>
                            {diagnosisResult.grade}
                          </div>
                          <div className="text-xs md:text-sm text-neutral-600 font-semibold mt-0.5 md:mt-1">등급</div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs md:text-base lg:text-lg font-semibold text-neutral-600">
                      상위 {diagnosisResult.grade === 'S' ? '5%' : 
                            diagnosisResult.grade === 'A' ? '20%' :
                            diagnosisResult.grade === 'B' ? '40%' :
                            diagnosisResult.grade === 'C' ? '60%' : '80%'} 수준
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 항목별 상세 분석 */}
        {diagnosisResult && (
          <Card className="mb-4 md:mb-6 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg md:text-xl font-bold text-neutral-900">
                📈 항목별 상세 분석
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {Object.entries(diagnosisResult.evaluations).map(([key, evaluation]: [string, any]) => {
                  // 보너스 항목은 마지막에 따로 표시
                  if (evaluation.is_bonus) return null
                  
                  return (
                    <Card key={key} className="border-neutral-200 hover:shadow-lg transition-shadow">
                      <CardContent className="p-3 md:p-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs md:text-sm font-semibold text-neutral-700 flex-1 break-words">
                            {evaluation.category_name}
                          </p>
                          {evaluation.is_bonus && (
                            <Badge className="ml-1 text-[10px] md:text-xs bg-green-500 hover:bg-green-600 text-white flex-shrink-0">
                              보너스
                            </Badge>
                          )}
                        </div>
                        
                        <Badge className={`${getGradeColor(evaluation.grade)} text-white mb-2 text-xs md:text-sm`}>
                          {evaluation.grade}등급
                        </Badge>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-neutral-200 rounded-full h-2 md:h-2.5 mb-2">
                          <div 
                            className={`${getGradeColor(evaluation.grade)} h-2 md:h-2.5 rounded-full transition-all`}
                            style={{ width: `${(evaluation.score / evaluation.max_score) * 100}%` }}
                          />
                        </div>
                        
                        <p className="text-[10px] md:text-xs text-neutral-600">
                          {evaluation.score.toFixed(1)} / {evaluation.max_score} 점
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 우선순위 개선 권장사항 */}
        {diagnosisResult && diagnosisResult.priority_actions.length > 0 && (
          <Card className="mb-4 md:mb-6 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg md:text-xl font-bold text-neutral-900">
                🎯 우선순위 개선 권장사항
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0">
              <div className="space-y-3 md:space-y-4">
                {diagnosisResult.priority_actions.slice(0, 5).map((action, idx) => (
                  <Card key={idx} className="border-neutral-200 bg-neutral-50">
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`text-xs md:text-sm ${getPriorityColor(action.priority)}`}>
                              우선순위 {action.priority}
                            </Badge>
                            <Badge className="text-[10px] md:text-xs bg-green-500 hover:bg-green-600 text-white">
                              +{action.estimated_gain}점
                            </Badge>
                          </div>
                          <p className="font-semibold text-sm md:text-base text-neutral-900 mb-2">
                            {action.action}
                          </p>
                          <p className="text-xs md:text-sm text-neutral-600 mb-2">
                            💡 방법: {action.method}
                          </p>
                          {action.copy_example && (
                            <Card className="border border-dashed border-neutral-300 bg-white mt-2">
                              <CardContent className="p-2 md:p-3">
                                <p className="text-xs text-neutral-600 italic">
                                  ✏️ 예시: {action.copy_example}
                                </p>
                              </CardContent>
                            </Card>
                          )}
                          {action.note && (
                            <p className="text-xs text-neutral-600 mt-2">
                              📌 {action.note}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 상세 정보 및 진단 (17개 섹션) */}
        <Card className="mb-4 md:mb-6 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg md:text-xl font-bold text-neutral-900">
              📋 상세 정보 및 진단
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="space-y-4 md:space-y-6">
              {/* 1. 기본 정보 */}
              <Card className="border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Store className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold text-neutral-900">1. 기본 정보</CardTitle>
                      <p className="text-xs text-neutral-600">플레이스 기본 정보 및 식별자</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="font-semibold text-xs md:text-sm text-neutral-700">매장명</div>
                      <div className="md:col-span-2 text-xs md:text-sm text-neutral-900">{placeDetails.name}</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="font-semibold text-xs md:text-sm text-neutral-700">카테고리</div>
                      <div className="md:col-span-2 text-xs md:text-sm text-neutral-900">{placeDetails.category}</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="font-semibold text-xs md:text-sm text-neutral-700">주소</div>
                      <div className="md:col-span-2 text-xs md:text-sm text-neutral-900 break-words">{placeDetails.address}</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="font-semibold text-xs md:text-sm text-neutral-700">도로명주소</div>
                      <div className="md:col-span-2 text-xs md:text-sm text-neutral-900 break-words">{placeDetails.road_address || '-'}</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="font-semibold text-xs md:text-sm text-neutral-700">전화번호</div>
                      <div className="md:col-span-2 text-xs md:text-sm text-neutral-900">{placeDetails.phone_number || '-'}</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="font-semibold text-xs md:text-sm text-neutral-700">플레이스 ID</div>
                      <div className="md:col-span-2 text-xs md:text-sm text-neutral-900">{placeDetails.place_id}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. 평점 및 리뷰 */}
              <Card className="border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">⭐</span>
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold text-neutral-900">2. 평점 및 리뷰</CardTitle>
                      <p className="text-xs text-neutral-600">방문자 평점 및 리뷰 통계</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      <div className="md:col-span-3 font-semibold text-xs md:text-sm text-neutral-700">방문자 평점</div>
                      <div className="md:col-span-9 text-xs md:text-sm text-neutral-900">
                        {placeDetails.visitor_review_score ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg md:text-xl font-bold text-green-600">{placeDetails.visitor_review_score}</span>
                            <span className="text-neutral-500">/ 5.0</span>
                          </div>
                        ) : '-'}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-3">
                      <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                        <div className="md:col-span-5 font-semibold text-xs md:text-sm text-neutral-700">방문자 리뷰 수</div>
                        <div className="md:col-span-7">
                          <p className="text-xs md:text-sm font-semibold text-neutral-900 mb-1">
                            {(placeDetails.visitor_review_count || 0).toLocaleString()}개
                          </p>
                        </div>
                      </div>
                      <div className="lg:col-span-5">
                        {renderDiagnosisCell('visitor_reviews')}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-3">
                      <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                        <div className="md:col-span-5 font-semibold text-xs md:text-sm text-neutral-700">블로그 리뷰 수</div>
                        <div className="md:col-span-7">
                          <p className="text-xs md:text-sm font-semibold text-neutral-900 mb-1">
                            {(placeDetails.blog_review_count || 0).toLocaleString()}개
                          </p>
                        </div>
                      </div>
                      <div className="lg:col-span-5">
                        {renderDiagnosisCell('blog_reviews')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. 이미지 */}
              <Card className="border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">🖼️</span>
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold text-neutral-900">3. 이미지</CardTitle>
                      <p className="text-xs text-neutral-600">대표 이미지 및 전체 이미지 수</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-3">
                    <div className="lg:col-span-7">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200 mb-2">
                        <div className="md:col-span-5 font-semibold text-xs md:text-sm text-neutral-700">대표 이미지</div>
                        <div className="md:col-span-7">
                          {placeDetails.image_url ? (
                            <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">✓ 있음</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">없음</Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                        <div className="md:col-span-5 font-semibold text-xs md:text-sm text-neutral-700">전체 이미지 수</div>
                        <div className="md:col-span-7">
                          <p className="text-xs md:text-sm font-semibold text-neutral-900">{placeDetails.image_count || 0}개</p>
                        </div>
                      </div>
                    </div>
                    <div className="lg:col-span-5">
                      {renderDiagnosisCell('images')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4. 메뉴 */}
              <Card className="border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">🍽️</span>
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold text-neutral-900">4. 메뉴</CardTitle>
                      <p className="text-xs text-neutral-600">등록된 메뉴 및 가격 정보</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-3">
                    <div className="lg:col-span-7 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      {placeDetails.menus && placeDetails.menus.length > 0 ? (
                        <div>
                          <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-xs md:text-sm mb-3">
                            총 {placeDetails.menus.length}개
                          </Badge>
                          <div className="max-h-[300px] overflow-y-auto space-y-2">
                            {placeDetails.menus.map((menu: any, idx: number) => (
                              <Card key={idx} className="bg-white border-neutral-200">
                                <CardContent className="p-2 md:p-3">
                                  <p className="text-xs md:text-sm font-bold text-neutral-900">{menu.name}</p>
                                  {menu.price && <p className="text-xs md:text-sm text-blue-600 font-semibold">{Number(menu.price).toLocaleString()}원</p>}
                                  {menu.description && (
                                    <p className="text-xs text-neutral-600 mt-1">{menu.description}</p>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">등록된 메뉴 없음</Badge>
                      )}
                    </div>
                    <div className="lg:col-span-5">
                      {renderDiagnosisCell('menus')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 5. 편의시설 */}
              <Card className="border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">🏢</span>
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold text-neutral-900">5. 편의시설</CardTitle>
                      <p className="text-xs text-neutral-600">제공 가능한 편의시설 정보</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-3">
                    <div className="lg:col-span-7 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      {placeDetails.conveniences && placeDetails.conveniences.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                          {placeDetails.conveniences.map((conv: string, idx: number) => (
                            <Badge key={idx} className="bg-green-500 hover:bg-green-600 text-white text-xs">
                              {conv}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">정보 없음</Badge>
                      )}
                    </div>
                    <div className="lg:col-span-5">
                      {renderDiagnosisCell('conveniences')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 6. 결제 수단 */}
              <Card className="border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">💳</span>
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold text-neutral-900">6. 결제 수단</CardTitle>
                      <p className="text-xs text-neutral-600">지원 가능한 결제 방식</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    {placeDetails.payment_methods && placeDetails.payment_methods.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {placeDetails.payment_methods.map((payment: string, idx: number) => (
                          <Badge key={idx} className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs">
                            {payment}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">정보 없음</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 7. 마이크로 리뷰 */}
              <Card className="border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">💬</span>
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold text-neutral-900">7. 마이크로 리뷰 (한줄평)</CardTitle>
                      <p className="text-xs text-neutral-600">대표 한줄평</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    {placeDetails.micro_reviews && placeDetails.micro_reviews.length > 0 ? (
                      <p className="text-xs md:text-sm italic text-teal-700 font-medium">
                        "{placeDetails.micro_reviews[0]}"
                      </p>
                    ) : (
                      <Badge variant="outline" className="text-xs">정보 없음</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 8. 프로모션/쿠폰 */}
              <Card className="border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">🎫</span>
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold text-neutral-900">8. 프로모션/쿠폰</CardTitle>
                      <p className="text-xs text-neutral-600">사용 가능한 쿠폰 및 프로모션</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-3">
                    <div className="lg:col-span-7 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      {placeDetails.promotions && placeDetails.promotions.total > 0 ? (
                        <div>
                          <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs md:text-sm mb-2">
                            {placeDetails.promotions.total}개
                          </Badge>
                          {placeDetails.promotions.coupons?.slice(0, 3).map((coupon: any, idx: number) => (
                            <p key={idx} className="text-xs md:text-sm text-neutral-900 mb-1">• {coupon.title}</p>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">없음</Badge>
                      )}
                    </div>
                    <div className="lg:col-span-5">
                      {renderDiagnosisCell('promotions')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 9. 공지사항 */}
              <Card className="border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">📢</span>
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold text-neutral-900">9. 공지사항</CardTitle>
                      <p className="text-xs text-neutral-600">매장 공지사항 및 안내</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-3">
                    <div className="lg:col-span-7 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      {placeDetails.announcements && placeDetails.announcements.length > 0 ? (
                        <div className="space-y-1.5">
                          {placeDetails.announcements.slice(0, 3).map((notice: any, idx: number) => (
                            <p key={idx} className="text-xs md:text-sm text-neutral-900">
                              • {notice.title} <span className="text-neutral-500">({notice.relativeCreated})</span>
                            </p>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">없음</Badge>
                      )}
                    </div>
                    <div className="lg:col-span-5">
                      {renderDiagnosisCell('announcements')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 10. 업체 소개글 */}
              <Card className="border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">📝</span>
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold text-neutral-900">10. 업체 소개글</CardTitle>
                      <p className="text-xs text-neutral-600">업체가 직접 작성한 상세 설명</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-3">
                    <div className="lg:col-span-7 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      {placeDetails.description ? (
                        <Card className="bg-white border-neutral-200 max-h-[300px] overflow-y-auto">
                          <CardContent className="p-2 md:p-3">
                            <p className="text-xs md:text-sm text-neutral-900 whitespace-pre-line">{placeDetails.description}</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <Badge variant="outline" className="text-xs">업체가 등록하지 않음</Badge>
                      )}
                    </div>
                    <div className="lg:col-span-5">
                      {renderDiagnosisCell('description')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 11. AI 브리핑 */}
              <Card className="border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">🤖</span>
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold text-neutral-900">11. AI 브리핑</CardTitle>
                      <p className="text-xs text-neutral-600">AI가 생성한 요약 정보</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    {placeDetails.ai_briefing ? (
                      <Card className="bg-purple-50 border-purple-200 max-h-[200px] overflow-y-auto">
                        <CardContent className="p-2 md:p-3">
                          <p className="text-xs md:text-sm text-neutral-900 whitespace-pre-line">{placeDetails.ai_briefing}</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <Badge variant="outline" className="text-xs">정보 없음</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 12. 찾아오는 길 */}
              <Card className="border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">🗺️</span>
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold text-neutral-900">12. 찾아오는 길</CardTitle>
                      <p className="text-xs text-neutral-600">매장까지의 상세 안내</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-3">
                    <div className="lg:col-span-7 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      {placeDetails.directions ? (
                        <Card className="bg-white border-neutral-200 max-h-[300px] overflow-y-auto">
                          <CardContent className="p-2 md:p-3">
                            <p className="text-xs md:text-sm text-neutral-900 whitespace-pre-line">{placeDetails.directions}</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <Badge variant="outline" className="text-xs">정보 없음</Badge>
                      )}
                    </div>
                    <div className="lg:col-span-5">
                      {renderDiagnosisCell('directions')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 13. SNS 및 웹사이트 */}
              <Card className="border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">🌐</span>
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold text-neutral-900">13. SNS 및 웹사이트</CardTitle>
                      <p className="text-xs text-neutral-600">온라인 채널 정보</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-3">
                    <div className="lg:col-span-7 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                        <div className="md:col-span-3 font-semibold text-xs md:text-sm text-neutral-700">홈페이지</div>
                        <div className="md:col-span-9">
                          {placeDetails.homepage || placeDetails.homepage_url ? (
                            <a 
                              href={placeDetails.homepage || placeDetails.homepage_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs md:text-sm text-blue-600 hover:underline break-all"
                            >
                              {placeDetails.homepage || placeDetails.homepage_url}
                            </a>
                          ) : (
                            <Badge variant="outline" className="text-xs">등록되지 않음</Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                        <div className="md:col-span-3 font-semibold text-xs md:text-sm text-neutral-700">블로그</div>
                        <div className="md:col-span-9">
                          {placeDetails.blog ? (
                            <a 
                              href={placeDetails.blog} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs md:text-sm text-blue-600 hover:underline break-all"
                            >
                              {placeDetails.blog}
                            </a>
                          ) : (
                            <Badge variant="outline" className="text-xs">등록되지 않음</Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                        <div className="md:col-span-3 font-semibold text-xs md:text-sm text-neutral-700">인스타그램</div>
                        <div className="md:col-span-9">
                          {placeDetails.instagram ? (
                            <a 
                              href={placeDetails.instagram} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs md:text-sm text-blue-600 hover:underline break-all"
                            >
                              {placeDetails.instagram}
                            </a>
                          ) : (
                            <Badge variant="outline" className="text-xs">등록되지 않음</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="lg:col-span-5">
                      {renderDiagnosisCell('sns_website')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 14. TV 방송 정보 */}
              <Card className="border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">📺</span>
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold text-neutral-900">14. TV 방송 정보</CardTitle>
                      <p className="text-xs text-neutral-600">TV 방송 출연 내역</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-3">
                    <div className="lg:col-span-7 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      {placeDetails.tv_program ? (
                        <p className="text-xs md:text-sm font-semibold text-neutral-900">{placeDetails.tv_program}</p>
                      ) : (
                        <Badge variant="outline" className="text-xs">정보 없음</Badge>
                      )}
                    </div>
                    <div className="lg:col-span-5">
                      {renderDiagnosisCell('tv_program')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 15. 플레이스 플러스 */}
              <Card className="border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">⭐</span>
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold text-neutral-900">15. 플레이스 플러스</CardTitle>
                      <p className="text-xs text-neutral-600">플레이스 플러스 구독 여부</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-3">
                    <div className="lg:col-span-7 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      {placeDetails.is_place_plus ? (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm">✓ 사용 중</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs md:text-sm">미사용</Badge>
                      )}
                    </div>
                    <div className="lg:col-span-5">
                      {renderDiagnosisCell('place_plus')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 16. 네이버페이 */}
              <Card className="border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">💰</span>
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold text-neutral-900">16. 네이버페이</CardTitle>
                      <p className="text-xs text-neutral-600">네이버페이 결제 지원 여부</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-3">
                    <div className="lg:col-span-7 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      {placeDetails.has_naverpay_in_search ? (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm">✓ 사용 중</Badge>
                      ) : (
                        <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs md:text-sm">미사용</Badge>
                      )}
                    </div>
                    <div className="lg:col-span-5">
                      {renderDiagnosisCell('naverpay')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 17. 스마트콜 */}
              <Card className="border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-base md:text-lg">📞</span>
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold text-neutral-900">17. 스마트콜</CardTitle>
                      <p className="text-xs text-neutral-600">네이버 스마트콜 사용 여부</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-4 pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-3">
                    <div className="lg:col-span-7 p-2 md:p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                      {placeDetails.phone_number?.startsWith('0507') ? (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm">
                          ✓ 사용 중 ({placeDetails.phone_number})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs md:text-sm">
                          미사용 {placeDetails.phone_number ? `(${placeDetails.phone_number})` : ''}
                        </Badge>
                      )}
                    </div>
                    <div className="lg:col-span-5">
                      {renderDiagnosisCell('smart_call')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="bg-neutral-100 border-neutral-200 text-center">
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-neutral-600">
              © {new Date().getFullYear()} Egurado Place Diagnosis Report • Generated on {new Date().toLocaleString('ko-KR')}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 매장 선택 화면
  return (
    <div className="w-full max-w-6xl mx-auto px-3 py-4 md:px-6 md:py-8 lg:px-8 lg:py-10">
      {/* 헤더 섹션 - 홈페이지 스타일 */}
      <header className="mb-6 md:mb-10 text-center">
        <div className="flex items-center justify-center gap-2 md:gap-3 mb-2 md:mb-3">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-5 h-5 md:w-7 md:h-7 text-white" />
          </div>
          <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight">
            플레이스 진단
          </h1>
        </div>
        <p className="text-sm md:text-lg text-neutral-600 leading-relaxed max-w-3xl mx-auto mb-3 md:mb-4 px-2">
          매장의 플레이스 정보를 진단하고<br className="md:hidden" />
          <span className="hidden md:inline"> </span>개선점을 확인하세요
        </p>
        <Badge 
          variant="secondary"
          className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-semibold inline-flex items-center gap-1 md:gap-1.5"
        >
          💡 8 크레딧
        </Badge>
      </header>

      {/* 매장 목록 */}
      {isLoading ? (
        <Card className="shadow-card">
          <CardContent className="p-6 md:p-12">
            <div className="flex items-center justify-center gap-2 md:gap-3">
              <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin text-primary-500" />
              <p className="text-xs md:text-sm text-neutral-600">등록된 매장을 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      ) : isAnalyzing ? (
        <Card className="shadow-card">
          <CardContent className="p-6 md:p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 md:w-16 md:h-16 text-primary-500 animate-spin mb-3 md:mb-4" />
            <div className="text-center px-4">
              <p className="text-sm md:text-lg font-semibold text-neutral-900 mb-1 md:mb-2">플레이스 진단 중...</p>
              <p className="text-xs md:text-base text-neutral-600">
                {selectedStore?.name} 매장의 정보를 가져오고 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : stores.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-6 md:p-12 flex flex-col items-center justify-center">
            <Store className="w-10 h-10 md:w-16 md:h-16 text-blue-500 mb-3 md:mb-4" />
            <p className="text-xs md:text-base text-neutral-600 mb-3 md:mb-4 text-center px-4">
              등록된 네이버 플레이스 매장이 없습니다.
            </p>
            <Button
              className="font-semibold w-full sm:w-auto h-10 md:h-11 text-xs md:text-sm"
              onClick={() => window.location.href = '/dashboard/connect-store'}
            >
              매장 등록하러 가기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <Card
              key={store.id}
              className="border-neutral-200 hover:border-primary-300 hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => !isAnalyzing && handleStoreSelect(store)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {store.thumbnail ? (
                    <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden">
                      <img
                        src={store.thumbnail}
                        alt={store.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <Store className="w-6 h-6 text-neutral-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-neutral-900 line-clamp-2 break-words">
                      {store.name}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">
                      {store.category}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-neutral-600 line-clamp-1">
                  {store.address}
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    className="w-full group-hover:bg-primary-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStoreSelect(store)
                    }}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing && selectedStore?.id === store.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        진단 중...
                      </>
                    ) : (
                      "진단 시작하기"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-neutral-300 hover:border-primary-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewHistory(store)
                    }}
                    disabled={isAnalyzing}
                  >
                    📜 과거 진단 보기
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-[calc(100vw-32px)] md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl pr-8">과거 진단 기록</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              {selectedStore?.name} - 최근 30개까지 저장됩니다
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 pb-4 md:px-6 md:pb-6 space-y-3">
            {isLoadingHistory && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              </div>
            )}

            {!isLoadingHistory && diagnosisHistory.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <FileText className="w-12 h-12 text-neutral-300" />
                <p className="text-sm text-neutral-600">아직 진단 기록이 없습니다.</p>
              </div>
            )}

            {!isLoadingHistory && diagnosisHistory.length > 0 && diagnosisHistory.map((history) => (
              <Card
                key={history.id}
                className="border border-neutral-200 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleViewHistoryDetail(history.id)}
              >
                <CardContent className="p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                        <p className="font-semibold text-xs md:text-sm text-neutral-900">
                          {new Date(history.diagnosed_at).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })} {new Date(history.diagnosed_at).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <Badge className={`${getGradeColor(history.grade)} text-white text-xs font-bold flex-shrink-0`}>
                          {history.grade}등급
                        </Badge>
                      </div>
                      <p className="text-[10px] md:text-xs text-neutral-600 ml-6">
                        점수: <span className="font-semibold text-neutral-900">{history.total_score}점</span> / {history.max_score}점
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full sm:w-auto text-xs font-semibold h-9 flex-shrink-0"
                    >
                      자세히 보기 →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 크레딧 차감 확인 모달 */}
      {CreditModal}
    </div>
  )
}
