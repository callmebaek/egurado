"use client"

/**
 * 타겟 키워드 추출 및 진단 페이지
 * 매장의 최적 키워드를 추천하고 SEO 최적화 상태를 분석
 */
import { useState, useEffect } from "react"
import { useStores } from "@/lib/hooks/useStores"
import { useAuth } from "@/lib/auth-context"
import { EmptyStoreMessage } from "@/components/EmptyStoreMessage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Search, Target, TrendingUp, Plus, X, AlertCircle, CheckCircle2, Info } from "lucide-react"
import { api } from "@/lib/config"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface RegisteredStore {
  id: string
  name: string
  platform: string
  place_id?: string
  address?: string
  status: string
}

interface KeywordData {
  keyword: string
  type: string
  components: Record<string, string>
  monthly_pc_qc_cnt: number
  monthly_mobile_qc_cnt: number
  total_volume: number
  comp_idx: string
}

interface SEOAnalysis {
  field_analysis: Record<string, {
    total_matches: number
    keyword_counts: Record<string, number>
  }>
  keyword_total_counts: Record<string, number>
  keyword_field_matches: Record<string, {
    menu: number
    conveniences: number
    microReviews: number
    description: number
    ai_briefing: number
    road: number
    total: number
  }>
  all_keywords: string[]
}

interface AnalysisResult {
  store_info: {
    store_id: string
    place_id: string
    store_name: string
    address: string
  }
  input_keywords: {
    regions: string[]
    landmarks: string[]
    menus: string[]
    industries: string[]
    others: string[]
  }
  total_combinations: number
  top_keywords: KeywordData[]
  seo_analysis: SEOAnalysis
  place_details: any
}

export default function TargetKeywordsPage() {
  const { hasStores, isLoading: storesLoading, userId } = useStores()
  const { getToken } = useAuth()
  const { toast } = useToast()

  const [registeredStores, setRegisteredStores] = useState<RegisteredStore[]>([])
  const [selectedStore, setSelectedStore] = useState<string>("")
  const [storeAddress, setStoreAddress] = useState<string>("")
  
  // 입력 키워드
  const [regions, setRegions] = useState<string[]>([])
  const [landmarks, setLandmarks] = useState<string[]>([])
  const [menus, setMenus] = useState<string[]>([])
  const [industries, setIndustries] = useState<string[]>([])
  const [others, setOthers] = useState<string[]>([])
  
  // 임시 입력값
  const [tempRegion, setTempRegion] = useState("")
  const [tempLandmark, setTempLandmark] = useState("")
  const [tempMenu, setTempMenu] = useState("")
  const [tempIndustry, setTempIndustry] = useState("")
  const [tempOther, setTempOther] = useState("")
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)

  // 등록된 매장 불러오기
  useEffect(() => {
    if (userId) {
      fetchRegisteredStores()
    }
  }, [userId])

  // 매장 선택 시 주소 자동 입력
  useEffect(() => {
    if (selectedStore) {
      const store = registeredStores.find(s => s.id === selectedStore)
      if (store && store.address) {
        setStoreAddress(store.address)
        // 주소에서 구, 동 자동 추출
        autoExtractRegions(store.address)
      }
    }
  }, [selectedStore, registeredStores])

  const fetchRegisteredStores = async () => {
    try {
      const token = getToken()
      if (!token) throw new Error("인증 토큰 없음")
      
      const response = await fetch(api.stores.list(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) throw new Error("매장 조회 실패")
      
      const result = await response.json()
      const stores = result.stores || []
      
      // 네이버 매장만 필터링
      const naverStores = stores.filter((store: RegisteredStore) => store.platform === "naver")
      setRegisteredStores(naverStores)
      
      console.log(`[타겟 키워드] 매장 조회 완료: ${naverStores.length}개`)
    } catch (error) {
      console.error("매장 조회 에러:", error)
      toast({
        title: "오류",
        description: "등록된 매장을 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const autoExtractRegions = (address: string) => {
    // 주소에서 구, 동 추출
    const guMatch = address.match(/([가-힣]+구)/g)
    const dongMatch = address.match(/([가-힣]+동)/g)
    
    const extracted: string[] = []
    if (guMatch) extracted.push(...guMatch)
    if (dongMatch) extracted.push(...dongMatch)
    
    // 중복 제거 후 지역명에 추가
    const uniqueRegions = [...new Set([...regions, ...extracted])]
    setRegions(uniqueRegions)
  }

  // 키워드 추가 함수
  const addKeyword = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>, tempSetter: React.Dispatch<React.SetStateAction<string>>) => {
    if (value.trim()) {
      setter((prev) => [...prev, value.trim()])
      tempSetter("")
    }
  }

  // 키워드 제거 함수
  const removeKeyword = (index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => prev.filter((_, i) => i !== index))
  }

  // 분석 시작
  const handleAnalyze = async () => {
    if (!selectedStore) {
      toast({
        title: "매장을 선택해주세요",
        description: "분석할 매장을 먼저 선택해야 합니다.",
        variant: "destructive",
      })
      return
    }

    if (regions.length === 0 && landmarks.length === 0 && menus.length === 0 && industries.length === 0 && others.length === 0) {
      toast({
        title: "키워드를 입력해주세요",
        description: "최소 1개 이상의 키워드를 입력해야 합니다.",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)
    try {
      const response = await fetch(`${api.baseUrl}/api/v1/target-keywords/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          store_id: selectedStore,
          user_id: userId,
          regions,
          landmarks,
          menus,
          industries,
          others,
        }),
      })

      if (!response.ok) throw new Error("분석 실패")

      const result = await response.json()
      
      if (result.status === "success") {
        setAnalysisResult(result.data)
        toast({
          title: "분석 완료",
          description: `총 ${result.data.top_keywords.length}개의 타겟 키워드를 추출했습니다.`,
        })
      } else {
        throw new Error(result.message || "분석 실패")
      }
    } catch (error) {
      console.error("분석 에러:", error)
      toast({
        title: "분석 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 로딩 중
  if (storesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">페이지를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 등록된 매장이 없음
  if (!hasStores) {
    return <EmptyStoreMessage />
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-olive-900 flex items-center gap-2">
          <Target className="h-8 w-8 text-olive-600" />
          타겟 키워드 추출 및 진단
        </h1>
        <p className="text-muted-foreground mt-2">
          매장에 집중해야 할 키워드를 검색량 기반으로 추천하고, SEO 최적화 상태를 분석합니다.
        </p>
      </div>

      {/* 안내 메시지 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>사용 방법</AlertTitle>
        <AlertDescription>
          1. 매장을 선택하세요 (주소에서 자동으로 지역명이 추출됩니다)<br />
          2. 지역명, 랜드마크, 메뉴/상품명, 업종, 기타 키워드를 입력하세요<br />
          3. 분석 시작 버튼을 클릭하면 최적의 타겟 키워드 10개를 추천해드립니다
        </AlertDescription>
      </Alert>

      {/* 입력 폼 */}
      <Card>
        <CardHeader>
          <CardTitle>분석 설정</CardTitle>
          <CardDescription>매장과 키워드 정보를 입력하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 매장 선택 */}
          <div className="space-y-2">
            <Label htmlFor="store-select">매장 선택 *</Label>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger id="store-select">
                <SelectValue placeholder="분석할 매장을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {registeredStores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {storeAddress && (
              <p className="text-sm text-muted-foreground">📍 {storeAddress}</p>
            )}
          </div>

          {/* 지역명 입력 */}
          <div className="space-y-2">
            <Label>지역명 (구, 동, 역세권 등)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="예: 종로, 성수, 강남 등"
                value={tempRegion}
                onChange={(e) => setTempRegion(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addKeyword(tempRegion, setRegions, setTempRegion)
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => addKeyword(tempRegion, setRegions, setTempRegion)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {regions.map((region, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {region}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeKeyword(index, setRegions)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* 랜드마크 입력 */}
          <div className="space-y-2">
            <Label>랜드마크 (역, 건물, 명소 등)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="예: 성수역, 종로타워, 보신각 등"
                value={tempLandmark}
                onChange={(e) => setTempLandmark(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addKeyword(tempLandmark, setLandmarks, setTempLandmark)
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => addKeyword(tempLandmark, setLandmarks, setTempLandmark)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {landmarks.map((landmark, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {landmark}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeKeyword(index, setLandmarks)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* 메뉴/상품명 입력 */}
          <div className="space-y-2">
            <Label>메뉴 또는 상품명</Label>
            <div className="flex gap-2">
              <Input
                placeholder="예: 보쌈, 칼국수, 커피, 헤어컷 등"
                value={tempMenu}
                onChange={(e) => setTempMenu(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addKeyword(tempMenu, setMenus, setTempMenu)
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => addKeyword(tempMenu, setMenus, setTempMenu)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {menus.map((menu, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {menu}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeKeyword(index, setMenus)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* 업종 입력 */}
          <div className="space-y-2">
            <Label>업종</Label>
            <div className="flex gap-2">
              <Input
                placeholder="예: 맛집, 카페, 헤어샵, 사진관 등"
                value={tempIndustry}
                onChange={(e) => setTempIndustry(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addKeyword(tempIndustry, setIndustries, setTempIndustry)
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => addKeyword(tempIndustry, setIndustries, setTempIndustry)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {industries.map((industry, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {industry}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeKeyword(index, setIndustries)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* 기타 키워드 입력 */}
          <div className="space-y-2">
            <Label>기타 (판매형태, 특징 등)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="예: 단체주문, 회식, 데이트 등"
                value={tempOther}
                onChange={(e) => setTempOther(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    addKeyword(tempOther, setOthers, setTempOther)
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => addKeyword(tempOther, setOthers, setTempOther)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {others.map((other, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {other}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeKeyword(index, setOthers)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* 분석 버튼 */}
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !selectedStore}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <Search className="mr-2 h-5 w-5" />
                타겟 키워드 분석 시작
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 분석 결과 */}
      {analysisResult && (
        <div className="space-y-6">
          {/* 요약 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                분석 결과 요약
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-olive-50 rounded-lg border border-olive-200">
                  <p className="text-sm text-olive-700 font-medium">매장명</p>
                  <p className="text-xl font-bold text-olive-900">{analysisResult.store_info.store_name}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium">생성된 조합</p>
                  <p className="text-xl font-bold text-blue-900">{analysisResult.total_combinations}개</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 font-medium">타겟 키워드</p>
                  <p className="text-xl font-bold text-green-900">{analysisResult.top_keywords.length}개</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 타겟 키워드 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle>타겟 키워드 (검색량 상위 20개)</CardTitle>
              <CardDescription>검색량이 높은 순서로 정렬되었습니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">순위</TableHead>
                      <TableHead>키워드</TableHead>
                      <TableHead>구성 요소</TableHead>
                      <TableHead className="text-right">PC 검색량</TableHead>
                      <TableHead className="text-right">모바일 검색량</TableHead>
                      <TableHead className="text-right">전체 검색량</TableHead>
                      <TableHead className="text-right">검색 업체수</TableHead>
                      <TableHead>경쟁도</TableHead>
                      <TableHead className="w-[80px] text-center bg-indigo-50 font-semibold">순위</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysisResult.top_keywords.map((keyword, index) => {
                      const fieldMatches = analysisResult.seo_analysis.keyword_field_matches?.[keyword.keyword] || {
                        menu: 0,
                        conveniences: 0,
                        microReviews: 0,
                        description: 0,
                        ai_briefing: 0,
                        road: 0,
                        visitor_reviews: 0,
                        total: 0
                      }
                      
                      const rankInfo = analysisResult.rank_data?.[keyword.keyword] || { rank: 0, total_count: 0 }
                      const rank = rankInfo.rank || 0
                      const totalCount = rankInfo.total_count || 0
                      
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-bold">{index + 1}</TableCell>
                          <TableCell className="font-semibold text-olive-900">{keyword.keyword}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(keyword.components).map(([key, value]) => (
                                <Badge key={key} variant="secondary" className="text-xs">
                                  {value}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-gray-600">
                            {keyword.monthly_pc_qc_cnt.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-gray-600">
                            {keyword.monthly_mobile_qc_cnt.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-bold text-olive-900">
                            {keyword.total_volume.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-blue-600 font-semibold">
                            {totalCount > 0 ? totalCount.toLocaleString() : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                keyword.comp_idx === "높음" ? "destructive" :
                                keyword.comp_idx === "중간" ? "default" : "secondary"
                              }
                            >
                              {keyword.comp_idx}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center bg-indigo-50">
                            {rank > 0 ? (
                              <span className="text-indigo-700 font-bold">{rank}위</span>
                            ) : (
                              <span className="text-red-500 text-xs">300위권 밖</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* SEO 분석 */}
          <Card>
            <CardHeader>
              <CardTitle>플레이스 SEO 분석</CardTitle>
              <CardDescription>키워드가 플레이스 정보에 포함된 횟수를 분석합니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(analysisResult.seo_analysis.field_analysis).map(([field, data]) => {
                  const fieldNames: Record<string, string> = {
                    menu: "메뉴",
                    conveniences: "편의시설",
                    microReviews: "대표 한줄평",
                    description: "업체소개글",
                    ai_briefing: "AI 브리핑",
                    road: "찾아오는길",
                    visitor_reviews: "방문자 리뷰 (상위 50개)"
                  }
                  
                  return (
                    <div key={field} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-olive-900">{fieldNames[field] || field}</h4>
                        <Badge variant={data.total_matches > 0 ? "default" : "secondary"}>
                          {data.total_matches > 0 ? `${data.total_matches}회 매칭` : "매칭 없음"}
                        </Badge>
                      </div>
                      {data.total_matches > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.entries(data.keyword_counts).map(([keyword, count]) => (
                            <Badge key={keyword} variant="outline" className="text-xs">
                              {keyword}: {count}회
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* 개선 제안 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>SEO 최적화 제안</AlertTitle>
            <AlertDescription>
              {(() => {
                const totalMatches = Object.values(analysisResult.seo_analysis.field_analysis).reduce(
                  (sum, field) => sum + field.total_matches,
                  0
                )
                
                if (totalMatches === 0) {
                  return "타겟 키워드가 플레이스 정보에 전혀 포함되어 있지 않습니다. 메뉴, 업체소개글, 찾아오는길 등에 키워드를 추가하세요."
                } else if (totalMatches < 10) {
                  return "타겟 키워드 노출이 부족합니다. 업체소개글과 메뉴 설명에 더 많은 키워드를 자연스럽게 포함시키세요."
                } else if (totalMatches < 30) {
                  return "적절한 수준의 키워드 최적화가 되어 있습니다. 부족한 항목(대표 한줄평, AI 브리핑)을 보완하면 더 좋습니다."
                } else {
                  return "훌륭합니다! 키워드가 잘 최적화되어 있습니다. 정기적으로 업데이트하여 최신 상태를 유지하세요."
                }
              })()}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
