"use client"

import { useState, useEffect } from "react"
import { Store, Loader2, CheckCircle2, AlertCircle, X, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { api } from "@/lib/config"

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
  menu_images?: string[]
  facility_images?: string[]
  
  // 영업 정보
  business_hours?: any
  closed_days?: string[]
  is_open?: boolean
  holiday_business_hours?: any
  
  // 메뉴
  menu_list?: Array<{
    name: string
    price: string
    image?: string
  }>
  
  // 편의시설
  parking?: string
  booking_available?: boolean
  takeout?: boolean
  delivery?: boolean
  wifi?: boolean
  pet_friendly?: boolean
  group_seating?: boolean
  
  // 키워드
  keyword_list?: string[]
  
  // SNS 및 웹사이트
  homepage_url?: string
  homepage?: string
  instagram?: string
  facebook?: string
  blog?: string
  tv_program?: string
  
  // 기타
  description?: string
  ai_briefing?: string
  tags?: string[]
  bookmark_count?: number
  is_claimed?: boolean
  is_ad?: boolean
}

interface DiagnosisEvaluation {
  score: number
  max_score: number
  status: "PASS" | "WARN" | "FAIL"
  grade: string
  category_name: string
  is_bonus?: boolean
  evidence: any
  recommendations: Array<{
    action: string
    method: string
    copy_example?: string
    estimated_gain: number
    priority: string
  }>
}

interface DiagnosisResult {
  total_score: number
  base_score: number
  bonus_score: number
  max_score: number
  grade: string
  evaluations: {
    [key: string]: DiagnosisEvaluation
  }
  priority_actions: Array<{
    category: string
    status: string
    action: string
    method: string
    estimated_gain: number
    priority: string
    copy_example?: string
    note?: string
  }>
  diagnosis_date: string
  place_name: string
  place_id: string
}

export default function AuditPage() {
  const { toast } = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [stores, setStores] = useState<RegisteredStore[]>([])
  const [isLoadingStores, setIsLoadingStores] = useState(false)
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null)
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null)

  // 현재 로그인한 사용자 ID 가져오기
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserId(session.user.id)
      }
    }
    getCurrentUser()
  }, [])

  // 등록된 매장 목록 가져오기
  useEffect(() => {
    if (userId) {
      fetchStores()
    }
  }, [userId])

  const fetchStores = async () => {
    if (!userId) return

    setIsLoadingStores(true)
    try {
      const response = await fetch(api.stores.list(userId))

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
      setIsLoadingStores(false)
    }
  }

  const handleStoreSelect = (store: RegisteredStore) => {
    setSelectedStore(store)
    setShowConfirmModal(true)
  }

  const handleStartAudit = async () => {
    if (!selectedStore) return

    setShowConfirmModal(false)
    setIsAnalyzing(true)
    setPlaceDetails(null)

    try {
      console.log("🔍 플레이스 진단 시작:", selectedStore.place_id, selectedStore.name)
      const url = api.naver.analyzePlaceDetails(selectedStore.place_id, selectedStore.name)
      console.log("📡 API URL:", url)
      
      const response = await fetch(url)
      console.log("📥 Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Response error:", errorText)
        throw new Error("플레이스 진단에 실패했습니다.")
      }

      const data = await response.json()
      console.log("✅ Response data:", data)
      console.log("📊 Details:", data.details)
      console.log("📈 Diagnosis:", data.diagnosis)
      
      setPlaceDetails(data.details)
      setDiagnosisResult(data.diagnosis)

      toast({
        title: "✅ 진단 완료",
        description: `${selectedStore.name} 매장의 진단이 완료되었습니다.`,
      })
    } catch (error) {
      console.error("❌ Error analyzing place:", error)
      toast({
        variant: "destructive",
        title: "❌ 진단 실패",
        description: error instanceof Error ? error.message : "플레이스 진단에 실패했습니다.",
      })
      setSelectedStore(null)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleCloseResults = () => {
    setSelectedStore(null)
    setPlaceDetails(null)
    setDiagnosisResult(null)
  }

  // 진단 평가 렌더링 헬퍼
  const renderDiagnosisCell = (category: string) => {
    if (!diagnosisResult) {
      return <td className="p-4 text-gray-400 text-sm">평가 대기</td>
    }

    const evaluation = diagnosisResult.evaluations[category]
    if (!evaluation) {
      return <td className="p-4 text-gray-400 text-sm">평가항목 아님</td>
    }

    const gradeColor = 
      evaluation.grade === 'S' ? 'text-purple-600 bg-purple-50' :
      evaluation.grade === 'A' ? 'text-blue-600 bg-blue-50' :
      evaluation.grade === 'B' ? 'text-green-600 bg-green-50' :
      evaluation.grade === 'C' ? 'text-yellow-600 bg-yellow-50' :
      'text-red-600 bg-red-50'

    return (
      <td className="p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-sm font-bold ${gradeColor}`}>
              {evaluation.grade}등급
            </span>
          </div>
          {evaluation.recommendations && evaluation.recommendations.length > 0 && (
            <div className="text-xs text-gray-600">
              <div className="font-medium mb-1">개선 액션:</div>
              <ul className="list-disc list-inside space-y-1">
                {evaluation.recommendations.slice(0, 2).map((rec, idx) => (
                  <li key={idx} className="text-xs">
                    <div className="font-medium">{rec.action}</div>
                    {rec.method && (
                      <div className="text-xs text-gray-500 mt-1 whitespace-pre-line ml-4">
                        {rec.method}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </td>
    )
  }

  // 진단 결과가 있으면 결과 화면 표시
  if (placeDetails && selectedStore) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
              플레이스 진단 결과
            </h1>
            <p className="text-muted-foreground">
              {selectedStore.name} - 네이버 플레이스 상세 정보
            </p>
          </div>
          <Button variant="outline" onClick={handleCloseResults}>
            <X className="w-4 h-4 mr-2" />
            닫기
          </Button>
        </div>

        {/* 매장 기본 정보 카드 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {placeDetails.image_url ? (
                <img
                  src={placeDetails.image_url}
                  alt={placeDetails.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              ) : (
                <div className="w-24 h-24 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Store className="h-12 w-12 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">{placeDetails.name}</h2>
                <p className="text-sm text-muted-foreground mb-1">{placeDetails.category}</p>
                <p className="text-sm text-muted-foreground">{placeDetails.address}</p>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://m.place.naver.com/place/${placeDetails.place_id}`, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    네이버에서 보기
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 진단 평가 결과 */}
        {diagnosisResult && (
          <div className="mb-8 space-y-6">
            {/* 총점 카드 */}
            <Card className="border-2 border-primary shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-gray-900">
                      종합 등급
                    </h3>
                    <p className="text-sm text-gray-500 mt-2">
                      진단일: {new Date(diagnosisResult.diagnosis_date).toLocaleDateString('ko-KR')}
                    </p>
                    {diagnosisResult.bonus_score > 0 && (
                      <div className="mt-3 flex gap-2">
                        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          보너스 +{diagnosisResult.bonus_score}점
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-center mr-16">
                    <div className={`text-7xl font-bold ${
                      diagnosisResult.grade === 'S' ? 'text-purple-600' :
                      diagnosisResult.grade === 'A' ? 'text-blue-600' :
                      diagnosisResult.grade === 'B' ? 'text-green-600' :
                      diagnosisResult.grade === 'C' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {diagnosisResult.grade}
                    </div>
                    <div className="text-sm text-gray-500 mt-2 font-medium">등급</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 항목별 점수 */}
            <Card>
              <CardContent className="pt-6">
                <h4 className="text-lg font-semibold mb-4">📊 항목별 점수</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(diagnosisResult.evaluations).map(([key, evaluation]) => {
                    const categoryNames: {[key: string]: string} = {
                      'visitor_reviews': '방문자 리뷰',
                      'blog_reviews': '블로그 리뷰',
                      'images': '이미지',
                      'menus': '메뉴',
                      'conveniences': '편의시설',
                      'naverpay': '네이버페이',
                      'coupons': '쿠폰',
                      'announcements': '공지사항',
                      'description_seo': '업체소개 SEO',
                      'directions_seo': '찾아오는길 SEO',
                      'sns_web': 'SNS/웹',
                      'tv_program': 'TV방송',
                      'place_plus': '플레이스플러스',
                    }
                    
                    return (
                      <div
                        key={key}
                        className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                          evaluation.grade === 'S' ? 'border-purple-200 bg-purple-50' :
                          evaluation.grade === 'A' ? 'border-blue-200 bg-blue-50' :
                          evaluation.grade === 'B' ? 'border-green-200 bg-green-50' :
                          evaluation.grade === 'C' ? 'border-yellow-200 bg-yellow-50' :
                          'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {evaluation.category_name}
                            {evaluation.is_bonus && (
                              <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">
                                보너스
                              </span>
                            )}
                          </span>
                          {evaluation.grade === 'S' ? (
                            <CheckCircle2 className="w-5 h-5 text-purple-600" />
                          ) : evaluation.grade === 'A' ? (
                            <CheckCircle2 className="w-5 h-5 text-blue-600" />
                          ) : evaluation.grade === 'B' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : evaluation.grade === 'C' ? (
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                          ) : (
                            <X className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div className={`text-5xl font-bold ${
                          evaluation.grade === 'S' ? 'text-purple-600' :
                          evaluation.grade === 'A' ? 'text-blue-600' :
                          evaluation.grade === 'B' ? 'text-green-600' :
                          evaluation.grade === 'C' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {evaluation.grade}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 우선순위 액션 Top 5 */}
            <Card>
              <CardContent className="pt-6">
                <h4 className="text-lg font-semibold mb-4 flex items-center">
                  🎯 우선순위 개선 액션 Top 5
                </h4>
                <div className="space-y-4">
                  {diagnosisResult.priority_actions.slice(0, 5).map((action, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-l-4 transition-all hover:shadow-md ${
                        action.priority === 'critical' ? 'border-red-500 bg-red-50' :
                        action.priority === 'high' ? 'border-orange-500 bg-orange-50' :
                        action.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                        'border-blue-500 bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg font-bold text-gray-700">
                              {idx + 1}.
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              action.priority === 'critical' ? 'bg-red-200 text-red-800' :
                              action.priority === 'high' ? 'bg-orange-200 text-orange-800' :
                              action.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                              'bg-blue-200 text-blue-800'
                            }`}>
                              {action.priority.toUpperCase()}
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                              +{action.estimated_gain}점
                            </span>
                          </div>
                          <h5 className="font-semibold text-gray-900 mb-2">
                            {action.action}
                          </h5>
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">💡 방법:</span> {action.method}
                          </p>
                          {action.copy_example && (
                            <p className="text-sm text-gray-500 italic bg-white/50 p-2 rounded mt-2">
                              <span className="font-medium">✏️ 예시:</span> {action.copy_example}
                            </p>
                          )}
                          {action.note && (
                            <p className="text-xs text-gray-400 mt-2">
                              📌 {action.note}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 진단 결과 테이블 */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">상세 정보 및 진단</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-4 font-bold text-gray-700 border-b-2 border-gray-300 w-40">카테고리</th>
                    <th className="text-left p-4 font-bold text-gray-700 border-b-2 border-gray-300 w-52">항목</th>
                    <th className="text-left p-4 font-bold text-gray-700 border-b-2 border-gray-300">현재 상태</th>
                    <th className="text-left p-4 font-bold text-gray-700 border-b-2 border-gray-300 w-64">진단 평가</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 1. 기본 정보 */}
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 font-semibold bg-blue-50 text-blue-900 border-r" rowSpan={6}>기본 정보</td>
                    <td className="p-4 text-gray-700">매장명</td>
                    <td className="p-4 font-medium text-gray-900">{placeDetails.name}</td>
                    <td className="p-4 text-gray-400 text-sm">평가항목 아님</td>
                  </tr>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-700">카테고리</td>
                    <td className="p-4 font-medium text-gray-900">{placeDetails.category}</td>
                    <td className="p-4 text-gray-400 text-sm">평가항목 아님</td>
                  </tr>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-700">주소</td>
                    <td className="p-4 font-medium text-gray-900">{placeDetails.address}</td>
                    <td className="p-4 text-gray-400 text-sm">평가항목 아님</td>
                  </tr>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-700">도로명 주소</td>
                    <td className="p-4 font-medium text-gray-900">{placeDetails.road_address || '-'}</td>
                    <td className="p-4 text-gray-400 text-sm">평가항목 아님</td>
                  </tr>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-700">전화번호</td>
                    <td className="p-4 font-medium text-gray-900">{placeDetails.phone_number || '-'}</td>
                    <td className="p-4 text-gray-400 text-sm">평가항목 아님</td>
                  </tr>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-700">플레이스 ID</td>
                    <td className="p-4 font-medium text-gray-900">{placeDetails.place_id}</td>
                    <td className="p-4 text-gray-400 text-sm">평가항목 아님</td>
                  </tr>

                  {/* 2. 평점 및 리뷰 */}
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 font-semibold bg-green-50 text-green-900 border-r" rowSpan={3}>평점 및 리뷰</td>
                    <td className="p-4 text-gray-700">방문자 평점</td>
                    <td className="p-4 font-medium text-gray-900">{placeDetails.visitor_review_score || '-'}</td>
                    <td className="p-4 text-gray-400 text-sm">평가항목 아님</td>
                  </tr>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-700">방문자 리뷰 수</td>
                    <td className="p-4 font-medium text-gray-900">
                      {(placeDetails.visitor_review_count || 0).toLocaleString()}개
                    </td>
                    {renderDiagnosisCell('visitor_reviews')}
                  </tr>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-700">블로그 리뷰 수</td>
                    <td className="p-4 font-medium text-gray-900">
                      {(placeDetails.blog_review_count || 0).toLocaleString()}개
                    </td>
                    {renderDiagnosisCell('blog_reviews')}
                  </tr>

                  {/* 3. 이미지 */}
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 font-semibold bg-purple-50 text-purple-900 border-r" rowSpan={2}>이미지</td>
                    <td className="p-4 text-gray-700">대표 이미지</td>
                    <td className="p-4 font-medium text-gray-900">{placeDetails.image_url ? '있음' : '없음'}</td>
                    {renderDiagnosisCell('images')}
                  </tr>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-700">전체 이미지 수</td>
                    <td className="p-4 font-medium text-gray-900">{placeDetails.image_count || 0}개</td>
                    {renderDiagnosisCell('images')}
                  </tr>

                  {/* 4. 메뉴 */}
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 font-semibold bg-orange-50 text-orange-900 border-r">메뉴</td>
                    <td className="p-4 text-gray-700">등록된 메뉴</td>
                    <td className="p-4">
                      {placeDetails.menus && placeDetails.menus.length > 0 ? (
                        <div className="text-sm space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded p-3 bg-gray-50">
                          <div className="font-bold mb-2 sticky top-0 bg-gray-50 text-gray-900">총 {placeDetails.menus.length}개</div>
                          {placeDetails.menus.map((menu: any, idx: number) => (
                            <div key={idx} className="border-l-3 border-orange-400 pl-3 py-1">
                              <div className="font-semibold text-gray-900">{menu.name}</div>
                              {menu.price && <div className="text-xs text-gray-600">{Number(menu.price).toLocaleString()}원</div>}
                              {menu.description && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {menu.description.length > 50 
                                    ? menu.description.slice(0, 50) + '...' 
                                    : menu.description}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : <span className="text-gray-400 text-sm">등록된 메뉴 없음</span>}
                    </td>
                    {renderDiagnosisCell('menus')}
                  </tr>

                  {/* 5. 편의시설 */}
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 font-semibold bg-pink-50 text-pink-900 border-r">편의시설</td>
                    <td className="p-4 text-gray-700">편의시설 목록</td>
                    <td className="p-4">
                      {placeDetails.conveniences && placeDetails.conveniences.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {placeDetails.conveniences.map((item: string, idx: number) => (
                            <span key={idx} className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-xs font-medium">
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-gray-400 text-sm">정보 없음</span>}
                    </td>
                    {renderDiagnosisCell('conveniences')}
                  </tr>

                  {/* 6. 결제 수단 */}
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 font-semibold bg-purple-50 text-purple-900 border-r">결제 수단</td>
                    <td className="p-4 text-gray-700">지원 결제 방식</td>
                    <td className="p-4">
                      {placeDetails.payment_methods && placeDetails.payment_methods.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {placeDetails.payment_methods.map((method: string, idx: number) => (
                            <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                              {method}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-gray-400 text-sm">정보 없음</span>}
                    </td>
                    {renderDiagnosisCell('naverpay')}
                  </tr>

                  {/* 7. 마이크로 리뷰 (한줄평) */}
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 font-semibold bg-teal-50 text-teal-900 border-r">마이크로 리뷰</td>
                    <td className="p-4 text-gray-700">대표 한줄평</td>
                    <td className="p-4">
                      {placeDetails.micro_reviews && placeDetails.micro_reviews.length > 0 ? (
                        <div className="text-sm italic text-teal-700 font-medium">
                          "{placeDetails.micro_reviews[0]}"
                        </div>
                      ) : <span className="text-gray-400 text-sm">정보 없음</span>}
                    </td>
                    <td className="p-4 text-gray-400 text-sm">평가항목 아님</td>
                  </tr>

                  {/* 8. 프로모션/쿠폰 */}
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 font-semibold bg-red-50 text-red-900 border-r">프로모션/쿠폰</td>
                    <td className="p-4 text-gray-700">사용 가능한 쿠폰</td>
                    <td className="p-4">
                      {placeDetails.promotions && placeDetails.promotions.total > 0 ? (
                        <div className="text-sm">
                          <span className="font-bold text-red-600">
                            {placeDetails.promotions.total}개
                          </span>
                          {placeDetails.promotions.coupons?.slice(0, 2).map((coupon: any, idx: number) => (
                            <div key={idx} className="text-xs text-gray-600 mt-1">
                              • {coupon.title}
                            </div>
                          ))}
                        </div>
                      ) : <span className="text-gray-400 text-sm">없음</span>}
                    </td>
                    {renderDiagnosisCell('coupons')}
                  </tr>

                  {/* 9. 공지사항 */}
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 font-semibold bg-yellow-50 text-yellow-900 border-r">공지사항</td>
                    <td className="p-4 text-gray-700">최신 공지</td>
                    <td className="p-4">
                      {placeDetails.announcements && placeDetails.announcements.length > 0 ? (
                        <div className="text-sm space-y-1">
                          {placeDetails.announcements.slice(0, 2).map((notice: any, idx: number) => (
                            <div key={idx} className="text-xs text-gray-700">
                              • {notice.title} <span className="text-gray-500">({notice.relativeCreated})</span>
                            </div>
                          ))}
                        </div>
                      ) : <span className="text-gray-400 text-sm">없음</span>}
                    </td>
                    {renderDiagnosisCell('announcements')}
                  </tr>

                  {/* 10. 업체 소개글 */}
                  <tr className="border-b">
                    <td className="p-4 font-semibold bg-indigo-50 text-indigo-900">업체 소개글</td>
                    <td className="p-4 text-gray-700">상세 설명</td>
                    <td className="p-4">
                      {placeDetails.description ? (
                        <div className="text-sm whitespace-pre-line max-h-64 overflow-y-auto border border-gray-200 rounded p-3 bg-gray-50">
                          {placeDetails.description}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">
                          업체가 등록하지 않음
                        </span>
                      )}
                    </td>
                    {renderDiagnosisCell('description_seo')}
                  </tr>

                  {/* 11. AI 브리핑 */}
                  <tr className="border-b">
                    <td className="p-4 font-semibold bg-violet-50 text-violet-900">AI 브리핑</td>
                    <td className="p-4 text-gray-700">AI 요약 정보</td>
                    <td className="p-4">
                      {placeDetails.ai_briefing ? (
                        <div className="text-sm whitespace-pre-line max-h-48 overflow-y-auto border border-violet-200 rounded p-3 bg-violet-50">
                          {placeDetails.ai_briefing}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">
                          정보 없음
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-400 text-sm">평가항목 아님</td>
                  </tr>

                  {/* 12. 찾아오는 길 */}
                  <tr className="border-b">
                    <td className="p-4 font-semibold bg-cyan-50 text-cyan-900">찾아오는 길</td>
                    <td className="p-4 text-gray-700">상세 안내</td>
                    <td className="p-4">
                      {placeDetails.directions ? (
                        <div className="text-sm whitespace-pre-line max-h-64 overflow-y-auto border border-gray-200 rounded p-3 bg-gray-50">
                          {placeDetails.directions}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">정보 없음</span>
                      )}
                    </td>
                    {renderDiagnosisCell('directions_seo')}
                  </tr>

                  {/* 13. SNS 및 웹사이트 */}
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 font-semibold bg-sky-50 text-sky-900 border-r" rowSpan={3}>SNS 및 웹사이트</td>
                    <td className="p-4 text-gray-700">홈페이지</td>
                    <td className="p-4">
                      {placeDetails.homepage || placeDetails.homepage_url ? (
                        <a 
                          href={placeDetails.homepage || placeDetails.homepage_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm break-all font-medium"
                        >
                          {placeDetails.homepage || placeDetails.homepage_url}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">등록되지 않음</span>
                      )}
                    </td>
                    {renderDiagnosisCell('sns_web')}
                  </tr>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-700">블로그</td>
                    <td className="p-4">
                      {placeDetails.blog ? (
                        <a 
                          href={placeDetails.blog} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm break-all font-medium"
                        >
                          {placeDetails.blog}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">등록되지 않음</span>
                      )}
                    </td>
                    {renderDiagnosisCell('sns_web')}
                  </tr>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-4 text-gray-700">인스타그램</td>
                    <td className="p-4">
                      {placeDetails.instagram ? (
                        <a 
                          href={placeDetails.instagram} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm break-all font-medium"
                        >
                          {placeDetails.instagram}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">등록되지 않음</span>
                      )}
                    </td>
                    {renderDiagnosisCell('sns_web')}
                  </tr>

                  {/* 14. TV 방송 정보 */}
                  <tr className="border-b">
                    <td className="p-4 font-semibold bg-pink-50 text-pink-900">TV 방송 정보</td>
                    <td className="p-4 text-gray-700">최근 방송</td>
                    <td className="p-4">
                      {placeDetails.tv_program ? (
                        <span className="text-sm font-medium text-gray-800">{placeDetails.tv_program}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">정보 없음</span>
                      )}
                    </td>
                    {renderDiagnosisCell('tv_program')}
                  </tr>

                  {/* 15. 플레이스 플러스 */}
                  <tr className="border-b">
                    <td className="p-4 font-semibold bg-amber-50 text-amber-900">플레이스 플러스</td>
                    <td className="p-4 text-gray-700">사용 여부</td>
                    <td className="p-4">
                      {placeDetails.is_place_plus ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                          ✓ 사용 중
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-600">
                          미사용
                        </span>
                      )}
                    </td>
                    {renderDiagnosisCell('place_plus')}
                  </tr>

                  {/* 16. 스마트콜 */}
                  <tr className="border-b">
                    <td className="p-4 font-semibold bg-indigo-50 text-indigo-900">스마트콜</td>
                    <td className="p-4 text-gray-700">사용 여부</td>
                    <td className="p-4">
                      {placeDetails.phone_number?.startsWith('0507') ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                          ✓ 사용 중 ({placeDetails.phone_number})
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-600">
                          미사용 {placeDetails.phone_number ? `(${placeDetails.phone_number})` : ''}
                        </span>
                      )}
                    </td>
                    {renderDiagnosisCell('smart_call')}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
          플레이스 진단
        </h1>
        <p className="text-muted-foreground">
          진단할 매장을 선택하세요
        </p>
      </div>

      {/* 로딩 상태 */}
      {isLoadingStores && (
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-muted-foreground">등록된 매장을 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 분석 중 상태 */}
      {isAnalyzing && (
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-semibold text-lg mb-2">플레이스 진단 중...</p>
                <p className="text-muted-foreground">
                  {selectedStore?.name} 매장의 정보를 가져오고 있습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 매장 없음 */}
      {!isLoadingStores && !isAnalyzing && stores.length === 0 && (
        <Card className="bg-blue-50/50 border-blue-200">
          <CardContent className="p-8 text-center">
            <Store className="h-16 w-16 text-blue-400 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              등록된 네이버 플레이스 매장이 없습니다.
            </p>
            <Button onClick={() => window.location.href = '/dashboard/connect-store'}>
              매장 등록하러 가기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 매장 카드 그리드 */}
      {!isLoadingStores && !isAnalyzing && stores.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <Card
              key={store.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleStoreSelect(store)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center gap-4">
                  {/* 썸네일 */}
                  {store.thumbnail ? (
                    <div className="w-full aspect-square rounded-lg overflow-hidden">
                      <img
                        src={store.thumbnail}
                        alt={store.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-primary/10 rounded-lg flex items-center justify-center">
                      <Store className="h-16 w-16 text-primary" />
                    </div>
                  )}

                  {/* 매장 정보 */}
                  <div className="w-full">
                    <h3 className="font-semibold text-lg mb-1 truncate">{store.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2 truncate">
                      {store.category}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {store.address}
                    </p>
                  </div>

                  {/* 진단 버튼 */}
                  <Button className="w-full">
                    진단 시작하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 확인 모달 */}
      {showConfirmModal && selectedStore && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">플레이스 진단</h2>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{selectedStore.name}</span> 매장의
                  플레이스 진단을 시작하시겠습니까?
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">진단 내용</p>
                    <p>네이버 플레이스에 등록된 모든 정보를 가져와서 분석합니다.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmModal(false)
                    setSelectedStore(null)
                  }}
                >
                  취소하기
                </Button>
                <Button onClick={handleStartAudit}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  바로 시작하기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
