"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from 'next/navigation'
import { Users, Search, Loader2, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, Store, Target, FileText, ExternalLink } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/config"
import {
  Paper,
  Card,
  Badge,
  Progress,
  RingProgress,
  Table,
  Timeline,
  Modal,
  Grid,
  Group,
  Stack,
  Title,
  Text,
  Button,
  TextInput,
  Container,
  ThemeIcon,
  Center,
  Loader,
  SimpleGrid,
  Divider,
} from '@mantine/core'
import '@mantine/core/styles.css'

interface RegisteredStore {
  id: string
  place_id: string
  store_name: string
  name?: string // API 응답에서 name으로 올 수도 있음
  category: string
  address: string
  platform: string
  thumbnail?: string
}

interface KeywordInfo {
  id: string
  keyword: string
  store_id: string
}

interface CompetitorStore {
  rank: number
  place_id: string
  name: string
  category: string
  address: string
  diagnosis_score?: number
  diagnosis_grade?: string
  visitor_review_count?: number
  blog_review_count?: number
  total_review_count?: number
  visitor_reviews_7d_avg?: number
  blog_reviews_7d_avg?: number
  announcements_7d?: number
  has_coupon?: boolean
  is_place_plus?: boolean
  is_new_business?: boolean
  supports_naverpay?: boolean
  has_naver_talk?: boolean
  has_naver_order?: boolean
  has_naver_booking?: boolean
  store_search_volume?: number
  important_review?: string
}

interface ComparisonGap {
  my_value: number | boolean
  competitor_avg?: number
  competitor_avg_top5?: number
  competitor_avg_top20?: number
  competitor_rate?: number
  gap?: number
  status: "good" | "bad"
  status_top5?: "good" | "bad"
  status_top20?: "good" | "bad"
}

interface ComparisonResult {
  my_store: CompetitorStore
  competitor_count: number
  gaps: {
    diagnosis_score: ComparisonGap
    visitor_reviews_7d_avg: ComparisonGap
    blog_reviews_7d_avg: ComparisonGap
    announcements_7d: ComparisonGap
    has_coupon: ComparisonGap
    is_place_plus: ComparisonGap
    supports_naverpay: ComparisonGap
    has_naver_talk: ComparisonGap
    has_naver_order: ComparisonGap
  }
  recommendations: Array<{
    priority: string
    category: string
    title: string
    description: string
    impact: string
  }>
  score_distribution: {
    S: number
    A: number
    B: number
    C: number
    D: number
  }
}

export default function CompetitorsPage() {
  const { toast } = useToast()
  const { user, getToken } = useAuth()
  const searchParams = useSearchParams()
  
  // 단계 관리
  const [step, setStep] = useState<1 | 2 | 3>(1)
  
  // 1단계: 매장 선택
  const [stores, setStores] = useState<RegisteredStore[]>([])
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null)
  const [loadingStores, setLoadingStores] = useState(false)
  
  // 2단계: 키워드 입력
  const [keyword, setKeyword] = useState("")
  const [registeredKeywords, setRegisteredKeywords] = useState<KeywordInfo[]>([])
  const [loadingKeywords, setLoadingKeywords] = useState(false)
  
  // 3단계: 상위 매장 목록
  const [topStores, setTopStores] = useState<CompetitorStore[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  
  // 4단계: 분석 결과
  const [analyzedStores, setAnalyzedStores] = useState<CompetitorStore[]>([])
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 })

  // 분석 결과 섹션 ref
  const summaryRef = useRef<HTMLDivElement>(null)
  
  // 초기 로드: 등록된 매장 가져오기
  useEffect(() => {
    fetchStores()
  }, [])
  
  // URL 파라미터로 자동 분석 시작
  useEffect(() => {
    const autoStart = searchParams.get('autoStart')
    const storeId = searchParams.get('storeId')
    const keywordParam = searchParams.get('keyword')
    
    if (autoStart === 'true' && storeId && keywordParam && stores.length > 0 && !selectedStore) {
      // 매장 찾기
      const store = stores.find(s => s.id === storeId)
      if (store) {
        console.log('[경쟁매장 분석] 자동 분석 시작:', store.store_name, keywordParam)
        setSelectedStore(store)
        setKeyword(keywordParam)
        setStep(2)
      }
    }
  }, [searchParams, stores])
  
  // 매장과 키워드가 설정되면 자동으로 검색 시작
  useEffect(() => {
    const autoStart = searchParams.get('autoStart')
    
    if (autoStart === 'true' && selectedStore && keyword && step === 2 && !loadingSearch) {
      console.log('[경쟁매장 분석] 검색 시작:', keyword)
      // 한 번만 실행하도록 autoStart 파라미터 제거 (브라우저 히스토리 변경 없이)
      window.history.replaceState({}, '', window.location.pathname)
      handleKeywordSubmit()
    }
  }, [selectedStore, keyword, step])
  
  const fetchStores = async () => {
    setLoadingStores(true)
    try {
      const token = getToken()
      if (!user || !token) {
        toast({
          title: "로그인 필요",
          description: "로그인이 필요한 서비스입니다.",
          variant: "destructive",
        })
        return
      }
      
      const response = await fetch(api.stores.list(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error("Failed to fetch stores")
      }
      
      const data = await response.json()
      // API는 'name' 필드를 반환하지만, 이 컴포넌트는 'store_name'을 기대함
      const naverStores = (data.stores || [])
        .filter((s: any) => s.platform === "naver")
        .map((s: any) => ({
          ...s,
          store_name: s.name || s.store_name // name을 store_name으로 매핑
        }))
      setStores(naverStores)
    } catch (error) {
      console.error("매장 로드 실패:", error)
      toast({
        title: "오류",
        description: "매장 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoadingStores(false)
    }
  }
  
  const handleStoreSelect = async (store: RegisteredStore) => {
    setSelectedStore(store)
    setStep(2)
    
    // 해당 매장의 등록된 키워드 가져오기
    setLoadingKeywords(true)
    try {
      const response = await fetch(api.keywords.list(store.id))
      
      if (!response.ok) {
        throw new Error("Failed to fetch keywords")
      }
      
      const data = await response.json()
      setRegisteredKeywords(data.keywords || [])
    } catch (error) {
      console.error("키워드 조회 실패:", error)
    } finally {
      setLoadingKeywords(false)
    }
  }
  
  const handleKeywordSubmit = async () => {
    if (!keyword.trim()) {
      toast({
        title: "키워드 입력 필요",
        description: "분석할 키워드를 입력해주세요.",
        variant: "destructive",
      })
      return
    }
    
    setLoadingSearch(true)
    
    try {
      const response = await fetch(`${api.baseUrl}/api/v1/naver/competitor/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword,
          limit: 20,
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`검색 실패: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      
      if (!data.stores || data.stores.length === 0) {
        toast({
          title: "검색 결과 없음",
          description: "해당 키워드로 검색된 매장이 없습니다.",
          variant: "destructive",
        })
        return
      }
      
      // 기본 정보만 있는 매장 목록
      const basicStores = data.stores.map((store: any, index: number) => ({
        rank: index + 1,
        place_id: store.place_id,
        name: store.name || store.store_name,
        category: store.category,
        address: store.address,
      }))
      
      setTopStores(basicStores)
      setStep(3)
      
      toast({
        title: "검색 완료",
        description: `상위 ${basicStores.length}개 매장을 찾았습니다. 상세 분석을 시작합니다.`,
      })
      
      // 자동으로 상세 분석 시작 (basicStores를 직접 전달)
      setTimeout(() => {
        handleStartAnalysis(basicStores)
      }, 500)
      
    } catch (error: any) {
      toast({
        title: "검색 실패",
        description: error.message || "경쟁매장 검색 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoadingSearch(false)
    }
  }
  
  const handleStartAnalysis = async (storesToAnalyze?: CompetitorStore[]) => {
    if (!selectedStore) return
    
    // topStores 대신 파라미터로 받은 stores 사용 (React 상태 업데이트 비동기 문제 해결)
    const stores = storesToAnalyze || topStores
    
    if (stores.length === 0) {
      toast({
        title: "오류",
        description: "분석할 경쟁매장이 없습니다.",
        variant: "destructive",
      })
      return
    }
    
    setLoadingAnalysis(true)
    setAnalysisProgress({ current: 0, total: stores.length + 1 })
    
    try {
      // 점진적 분석: 우리 매장 먼저
      const myStoreUrl = `${api.baseUrl}/api/v1/naver/competitor/analyze-single/${selectedStore.place_id}?rank=0&store_name=${encodeURIComponent(selectedStore.store_name)}`
      
      setAnalysisProgress({ current: 1, total: stores.length + 1 })
      
      const myStoreResponse = await fetch(myStoreUrl)
      
      if (!myStoreResponse.ok) {
        const errorText = await myStoreResponse.text()
        throw new Error(`우리 매장 분석 실패: ${myStoreResponse.status} - ${errorText}`)
      }
      
      const myStoreData = await myStoreResponse.json()
      const myStore = myStoreData.result
      
      // 경쟁사 분석 (점진적)
      const analyzed: CompetitorStore[] = []
      
      for (let i = 0; i < stores.length; i++) {
        const store = stores[i]
        setAnalysisProgress({ current: i + 2, total: stores.length + 1 })
        
        try {
          const competitorUrl = `${api.baseUrl}/api/v1/naver/competitor/analyze-single/${store.place_id}?rank=${store.rank}&store_name=${encodeURIComponent(store.name)}`
          
          const response = await fetch(competitorUrl)
          
          if (response.ok) {
            const data = await response.json()
            analyzed.push(data.result)
            
            // 실시간 업데이트
            setAnalyzedStores([...analyzed])
          }
        } catch (error) {
          console.error(`${store.name} 분석 실패:`, error)
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      // 비교 분석 생성
      const token = await getToken()
      if (!token) {
        throw new Error("인증 토큰이 없습니다")
      }
      
      console.log('[경쟁매장] 비교 분석 요청 시작')
      console.log('[경쟁매장] 우리 매장:', myStore.name, myStore.diagnosis_score)
      console.log('[경쟁매장] 경쟁사 수:', analyzed.length)
      console.log('[경쟁매장] 경쟁사 데이터 샘플:', analyzed.slice(0, 2).map(c => ({
        name: c.name,
        diagnosis_score: c.diagnosis_score,
        visitor_reviews_7d_avg: c.visitor_reviews_7d_avg,
        blog_reviews_7d_avg: c.blog_reviews_7d_avg
      })))
      
      const comparisonResponse = await fetch(
        `${api.url("/api/v1/naver/competitor/compare")}`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            my_store: myStore,
            competitors: analyzed,
          }),
        }
      )
      
      console.log('[경쟁매장] 비교 분석 응답 상태:', comparisonResponse.status)
      
      const comparisonResult = await comparisonResponse.json()
      
      console.log('[경쟁매장] 비교 분석 결과:', comparisonResult)
      
      if (!comparisonResponse.ok) {
        // 402 (크레딧 부족) 또는 기타 에러 시 백엔드 메시지 표시
        throw new Error(comparisonResult.detail || "비교 분석 중 오류가 발생했습니다")
      }
      
      setComparison(comparisonResult)

      // 분석 완료 후 결과 섹션으로 스크롤
      setTimeout(() => {
        summaryRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
      }, 100)
      
      toast({
        title: "분석 완료",
        description: `${analyzed.length}개 경쟁매장 분석이 완료되었습니다.`,
      })
    } catch (error: any) {
      let errorMessage = "경쟁매장 분석 중 오류가 발생했습니다."
      
      if (error.message.includes("404")) {
        errorMessage = "매장 정보를 찾을 수 없습니다. 매장이 올바르게 등록되었는지 확인해주세요."
      } else if (error.message.includes("우리 매장")) {
        errorMessage = "우리 매장 분석에 실패했습니다. place_id를 확인해주세요."
      }
      
      toast({
        title: "분석 실패",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoadingAnalysis(false)
    }
  }
  
  const generateComparison = (myStore: CompetitorStore, competitors: CompetitorStore[]): ComparisonResult => {
    if (competitors.length === 0) {
      return {
        my_store: myStore,
        competitor_count: 0,
        gaps: {} as any,
        recommendations: [],
        score_distribution: { S: 0, A: 0, B: 0, C: 0, D: 0 },
      }
    }
    
    const avgScore = competitors.reduce((sum, c) => sum + (c.diagnosis_score || 0), 0) / competitors.length
    const avgVisitorReviews = competitors.reduce((sum, c) => sum + (c.visitor_reviews_7d_avg || 0), 0) / competitors.length
    const avgBlogReviews = competitors.reduce((sum, c) => sum + (c.blog_reviews_7d_avg || 0), 0) / competitors.length
    const avgAnnouncements = competitors.reduce((sum, c) => sum + (c.announcements_7d || 0), 0) / competitors.length
    
    const couponRate = (competitors.filter(c => c.has_coupon).length / competitors.length) * 100
    const placePlusRate = (competitors.filter(c => c.is_place_plus).length / competitors.length) * 100
    const naverpayRate = (competitors.filter(c => c.supports_naverpay).length / competitors.length) * 100
    const naverTalkRate = (competitors.filter(c => c.has_naver_talk).length / competitors.length) * 100
    const naverOrderRate = (competitors.filter(c => c.has_naver_order).length / competitors.length) * 100
    
    const scoreDistribution = {
      S: competitors.filter(c => c.diagnosis_grade === "S").length,
      A: competitors.filter(c => c.diagnosis_grade === "A").length,
      B: competitors.filter(c => c.diagnosis_grade === "B").length,
      C: competitors.filter(c => c.diagnosis_grade === "C").length,
      D: competitors.filter(c => c.diagnosis_grade === "D").length,
    }
    
    const gaps: {
      diagnosis_score: ComparisonGap
      visitor_reviews_7d_avg: ComparisonGap
      blog_reviews_7d_avg: ComparisonGap
      announcements_7d: ComparisonGap
      has_coupon: ComparisonGap
      is_place_plus: ComparisonGap
      supports_naverpay: ComparisonGap
      has_naver_talk: ComparisonGap
      has_naver_order: ComparisonGap
    } = {
      diagnosis_score: {
        my_value: myStore.diagnosis_score || 0,
        competitor_avg: avgScore,
        gap: (myStore.diagnosis_score || 0) - avgScore,
        status: ((myStore.diagnosis_score || 0) >= avgScore ? "good" : "bad") as "good" | "bad",
      },
      visitor_reviews_7d_avg: {
        my_value: myStore.visitor_reviews_7d_avg || 0,
        competitor_avg: avgVisitorReviews,
        gap: (myStore.visitor_reviews_7d_avg || 0) - avgVisitorReviews,
        status: ((myStore.visitor_reviews_7d_avg || 0) >= avgVisitorReviews ? "good" : "bad") as "good" | "bad",
      },
      blog_reviews_7d_avg: {
        my_value: myStore.blog_reviews_7d_avg || 0,
        competitor_avg: avgBlogReviews,
        gap: (myStore.blog_reviews_7d_avg || 0) - avgBlogReviews,
        status: ((myStore.blog_reviews_7d_avg || 0) >= avgBlogReviews ? "good" : "bad") as "good" | "bad",
      },
      announcements_7d: {
        my_value: myStore.announcements_7d || 0,
        competitor_avg: avgAnnouncements,
        gap: (myStore.announcements_7d || 0) - avgAnnouncements,
        status: ((myStore.announcements_7d || 0) >= avgAnnouncements ? "good" : "bad") as "good" | "bad",
      },
      has_coupon: {
        my_value: myStore.has_coupon || false,
        competitor_rate: couponRate,
        status: (myStore.has_coupon ? "good" : "bad") as "good" | "bad",
      },
      is_place_plus: {
        my_value: myStore.is_place_plus || false,
        competitor_rate: placePlusRate,
        status: (myStore.is_place_plus ? "good" : "bad") as "good" | "bad",
      },
      supports_naverpay: {
        my_value: myStore.supports_naverpay || false,
        competitor_rate: naverpayRate,
        status: (myStore.supports_naverpay ? "good" : "bad") as "good" | "bad",
      },
      has_naver_talk: {
        my_value: myStore.has_naver_talk || false,
        competitor_rate: naverTalkRate,
        status: (myStore.has_naver_talk ? "good" : "bad") as "good" | "bad",
      },
      has_naver_order: {
        my_value: myStore.has_naver_order || false,
        competitor_rate: naverOrderRate,
        status: (myStore.has_naver_order ? "good" : "bad") as "good" | "bad",
      },
    }
    
    const recommendations: any[] = []
    
    if (gaps.diagnosis_score.status === "bad") {
      recommendations.push({
        priority: "high",
        category: "overall",
        title: "전체 플레이스 진단 점수 개선 필요",
        description: `경쟁매장 평균 대비 ${Math.abs(gaps.diagnosis_score.gap || 0).toFixed(1)}점 낮습니다.`,
        impact: "high",
      })
    }
    
    if (gaps.visitor_reviews_7d_avg.status === "bad") {
      recommendations.push({
        priority: "high",
        category: "reviews",
        title: "방문자 리뷰 활성화 필요",
        description: `경쟁매장은 일평균 ${gaps.visitor_reviews_7d_avg.competitor_avg?.toFixed(1)}개의 리뷰를 받고 있습니다.`,
        impact: "high",
      })
    }
    
    return {
      my_store: myStore,
      competitor_count: competitors.length,
      gaps,
      recommendations,
      score_distribution: scoreDistribution,
    }
  }
  
  const resetAnalysis = () => {
    setStep(1)
    setSelectedStore(null)
    setKeyword("")
    setTopStores([])
    setAnalyzedStores([])
    setComparison(null)
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return '#9b59b6'
      case 'A': return '#3498db'
      case 'B': return '#2ecc71'
      case 'C': return '#f39c12'
      default: return '#e74c3c'
    }
  }
  
  return (
    <Container size="xl" px="md" py="xl" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <Paper shadow="sm" p="xl" mb="xl" style={{ borderLeft: '6px solid #635bff' }}>
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="sm" mb="xs">
              <Users size={32} color="#635bff" />
              <Title order={1} style={{ color: '#212529' }}>경쟁매장 분석</Title>
            </Group>
            <Text size="lg" c="dimmed">
              키워드 기반으로 상위 노출 경쟁매장을 분석하고 우리 매장과 비교합니다
            </Text>
          </div>
          {step > 1 && (
            <Button
              variant="outline"
              color="gray"
              onClick={resetAnalysis}
            >
              처음으로
            </Button>
          )}
        </Group>
      </Paper>

      {/* 진행 단계 표시 */}
      <Paper shadow="sm" p="lg" mb="xl">
        <Group justify="space-between">
          {[1, 2, 3].map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
              <ThemeIcon
                size="xl"
                radius="xl"
                color={step >= s ? '#635bff' : 'gray'}
                variant={step >= s ? 'filled' : 'light'}
              >
                <Text fw={700}>{s}</Text>
              </ThemeIcon>
              <Text size="sm" fw={600} ml="xs">
                {s === 1 && "매장 선택"}
                {s === 2 && "키워드 입력"}
                {s === 3 && "분석 결과"}
              </Text>
              {s < 3 && (
                <div style={{
                  width: '80px',
                  height: '3px',
                  marginLeft: '16px',
                  marginRight: '16px',
                  backgroundColor: step > s ? '#635bff' : '#dee2e6',
                  borderRadius: '3px'
                }} />
              )}
            </div>
          ))}
        </Group>
      </Paper>

      {/* 1단계: 매장 선택 */}
      {step === 1 && (
        <Paper shadow="sm" p="xl">
          <Group mb="lg">
            <ThemeIcon size="lg" radius="md" color="blue" variant="light">
              <Store size={20} />
            </ThemeIcon>
            <div>
              <Title order={2}>1단계: 분석할 매장 선택</Title>
              <Text size="sm" c="dimmed">경쟁 분석을 진행할 우리 매장을 선택하세요</Text>
            </div>
          </Group>

          {loadingStores ? (
            <Center py="xl">
              <Stack align="center" gap="md">
                <Loader size="lg" color="#635bff" />
                <Text c="dimmed">매장 목록을 불러오는 중...</Text>
              </Stack>
            </Center>
          ) : stores.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="md">
                <AlertCircle size={64} color="#dee2e6" />
                <Text c="dimmed">등록된 매장이 없습니다.</Text>
                <Text size="sm" c="dimmed">먼저 네이버 플레이스 매장을 등록해주세요.</Text>
              </Stack>
            </Center>
          ) : (
            <Grid>
              {stores.map((store) => (
                <Grid.Col key={store.id} span={{ base: 12, sm: 6, md: 4 }}>
                  <Card
                    shadow="sm"
                    padding="lg"
                    radius="md"
                    withBorder
                    style={{ height: '100%', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onClick={() => handleStoreSelect(store)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = ''
                    }}
                  >
                    {/* Thumbnail */}
                    {store.thumbnail ? (
                      <Card.Section>
                        <div style={{ position: 'relative', width: '100%', paddingTop: '100%' }}>
                          <img
                            src={store.thumbnail}
                            alt={store.store_name}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        </div>
                      </Card.Section>
                    ) : (
                      <Card.Section>
                        <div style={{
                          backgroundColor: '#f8f9fa',
                          paddingTop: '100%',
                          position: 'relative'
                        }}>
                          <Center style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%'
                          }}>
                            <Store size={64} color="#635bff" />
                          </Center>
                        </div>
                      </Card.Section>
                    )}

                    {/* Store Info */}
                    <Stack gap="xs" mt="md" style={{ textAlign: 'center' }}>
                      <Text fw={600} size="lg" lineClamp={1}>{store.store_name || "매장명 없음"}</Text>
                      <Text size="sm" c="dimmed" lineClamp={1}>{store.category || "카테고리 없음"}</Text>
                      <Text size="xs" c="dimmed" lineClamp={2}>{store.address || "주소 없음"}</Text>
                    </Stack>

                    <Button
                      fullWidth
                      mt="md"
                      color="#635bff"
                      leftSection={<Target size={16} />}
                    >
                      이 매장 선택
                    </Button>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          )}
        </Paper>
      )}

      {/* 2단계: 키워드 입력 */}
      {step === 2 && selectedStore && (
        <Paper shadow="sm" p="xl">
          <Group mb="lg">
            <ThemeIcon size="lg" radius="md" color="green" variant="light">
              <Target size={20} />
            </ThemeIcon>
            <div>
              <Title order={2}>2단계: 타겟 키워드 입력</Title>
              <Text size="sm" c="dimmed">경쟁 분석을 진행할 키워드를 입력하세요</Text>
            </div>
          </Group>

          <Stack gap="md">
            <Paper p="md" style={{ backgroundColor: '#f8f9fa' }}>
              <Text size="sm" fw={600} mb="xs">선택된 매장</Text>
              <Text size="lg" fw={700}>{selectedStore.store_name}</Text>
              <Text size="sm" c="dimmed">{selectedStore.category || "카테고리 정보 없음"}</Text>
            </Paper>

            <div>
              <Text size="sm" fw={600} mb="xs">분석할 키워드 입력</Text>
              <Group>
                <TextInput
                  placeholder="예: 강남 맛집, 성수동 카페"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleKeywordSubmit()}
                  style={{ flex: 1 }}
                  size="lg"
                />
                <Button
                  onClick={handleKeywordSubmit}
                  disabled={loadingSearch || !keyword.trim()}
                  size="lg"
                  color="#635bff"
                  leftSection={loadingSearch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search size={16} />}
                >
                  검색
                </Button>
              </Group>
            </div>

            {loadingKeywords ? (
              <Center py="md">
                <Loader size="md" color="gray" />
              </Center>
            ) : registeredKeywords.length > 0 && (
              <div>
                <Text size="sm" fw={600} mb="xs">등록된 키워드에서 선택</Text>
                <Group gap="xs">
                  {registeredKeywords.map((kw) => (
                    <Badge
                      key={kw.id}
                      size="lg"
                      variant="light"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setKeyword(kw.keyword)}
                    >
                      {kw.keyword}
                    </Badge>
                  ))}
                </Group>
              </div>
            )}
          </Stack>
        </Paper>
      )}

      {/* 3단계: 분석 결과 */}
      {step === 3 && topStores.length > 0 && (
        <>
          {/* 진행 상황 (작게 표시) */}
          {loadingAnalysis && (
            <Paper shadow="sm" p="md" mb="md" style={{ backgroundColor: '#f0f7ff', border: '1px solid #635bff' }}>
              <Group>
                <Loader size="md" color="#635bff" />
                <div>
                  <Text fw={600} size="sm">
                    경쟁매장 분석 중... ({analysisProgress.current}/{analysisProgress.total})
                  </Text>
                  <Progress
                    value={(analysisProgress.current / analysisProgress.total) * 100}
                    color="#635bff"
                    size="sm"
                    radius="xl"
                    mt="xs"
                    style={{ width: '200px' }}
                  />
                </div>
              </Group>
            </Paper>
          )}

          {/* 경쟁매장 상세 목록 (항상 표시) */}
          <Paper shadow="sm" p="xl" mb="xl">
            <Title order={2} mb="md" style={{ color: '#212529' }}>
              📋 경쟁매장 상세 분석
            </Title>
            
            <Text size="sm" c="dimmed" mb="md">
              분석 완료: {analyzedStores.length} / {topStores.length}개
            </Text>

            <div style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ fontWeight: 700, minWidth: '60px' }}>순위</Table.Th>
                    <Table.Th style={{ fontWeight: 700, minWidth: '150px' }}>매장명</Table.Th>
                    <Table.Th style={{ fontWeight: 700, minWidth: '100px' }}>업종</Table.Th>
                    <Table.Th style={{ fontWeight: 700, minWidth: '200px' }}>주소</Table.Th>
                    <Table.Th style={{ fontWeight: 700, minWidth: '120px' }}>진단점수</Table.Th>
                    <Table.Th style={{ fontWeight: 700, minWidth: '100px' }}>전체리뷰</Table.Th>
                    <Table.Th style={{ fontWeight: 700, minWidth: '100px' }}>방문자(7일)</Table.Th>
                    <Table.Th style={{ fontWeight: 700, minWidth: '100px' }}>블로그(7일)</Table.Th>
                    <Table.Th style={{ fontWeight: 700, minWidth: '90px' }}>공지(7일)</Table.Th>
                    <Table.Th style={{ fontWeight: 700, minWidth: '70px', textAlign: 'center' }}>쿠폰</Table.Th>
                    <Table.Th style={{ fontWeight: 700, minWidth: '70px', textAlign: 'center' }}>플플</Table.Th>
                    <Table.Th style={{ fontWeight: 700, minWidth: '90px', textAlign: 'center' }}>새로오픈</Table.Th>
                    <Table.Th style={{ fontWeight: 700, minWidth: '80px', textAlign: 'center' }}>네페이</Table.Th>
                    <Table.Th style={{ fontWeight: 700, minWidth: '80px', textAlign: 'center' }}>네톡</Table.Th>
                    <Table.Th style={{ fontWeight: 700, minWidth: '80px', textAlign: 'center' }}>네주문</Table.Th>
                    <Table.Th style={{ fontWeight: 700, minWidth: '90px', textAlign: 'center' }}>네예약</Table.Th>
                    <Table.Th style={{ fontWeight: 700, minWidth: '100px' }}>검색량</Table.Th>
                    <Table.Th style={{ fontWeight: 700, minWidth: '250px' }}>하이라이트 리뷰</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {topStores.map((store) => {
                    const analyzed = analyzedStores.find(s => s.place_id === store.place_id)
                    const isLoading = !analyzed && loadingAnalysis
                    
                    return (
                      <Table.Tr key={store.place_id}>
                        <Table.Td>{store.rank}</Table.Td>
                        <Table.Td><Text fw={600}>{store.name}</Text></Table.Td>
                        <Table.Td><Text size="sm" c="dimmed">{store.category}</Text></Table.Td>
                        <Table.Td><Text size="xs" c="dimmed">{store.address}</Text></Table.Td>
                        <Table.Td>
                          {isLoading ? (
                            <Loader size="xs" />
                          ) : analyzed ? (
                            <Badge color={getGradeColor(analyzed.diagnosis_grade || 'D')}>
                              {analyzed.diagnosis_score?.toFixed(1)}점 ({analyzed.diagnosis_grade})
                            </Badge>
                          ) : (
                            <Text size="xs" c="dimmed">-</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {isLoading ? (
                            <Loader size="xs" />
                          ) : analyzed ? (
                            <Text size="sm">{analyzed.visitor_review_count || 0}+{analyzed.blog_review_count || 0}</Text>
                          ) : '-'}
                        </Table.Td>
                        <Table.Td>
                          {isLoading ? (
                            <Loader size="xs" />
                          ) : analyzed ? (
                            analyzed.visitor_reviews_7d_avg?.toFixed(1) || 0
                          ) : '-'}
                        </Table.Td>
                        <Table.Td>
                          {isLoading ? (
                            <Loader size="xs" />
                          ) : analyzed ? (
                            analyzed.blog_reviews_7d_avg?.toFixed(1) || 0
                          ) : '-'}
                        </Table.Td>
                        <Table.Td>
                          {isLoading ? (
                            <Loader size="xs" />
                          ) : analyzed ? (
                            analyzed.announcements_7d || 0
                          ) : '-'}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          {isLoading ? (
                            <Loader size="xs" />
                          ) : analyzed ? (
                            analyzed.has_coupon ? <CheckCircle2 size={16} color="#2ecc71" /> : <Minus size={16} color="#dee2e6" />
                          ) : '-'}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          {isLoading ? (
                            <Loader size="xs" />
                          ) : analyzed ? (
                            analyzed.is_place_plus ? <CheckCircle2 size={16} color="#2ecc71" /> : <Minus size={16} color="#dee2e6" />
                          ) : '-'}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          {isLoading ? (
                            <Loader size="xs" />
                          ) : analyzed ? (
                            analyzed.is_new_business ? <CheckCircle2 size={16} color="#2ecc71" /> : <Minus size={16} color="#dee2e6" />
                          ) : '-'}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          {isLoading ? (
                            <Loader size="xs" />
                          ) : analyzed ? (
                            analyzed.supports_naverpay ? <CheckCircle2 size={16} color="#2ecc71" /> : <Minus size={16} color="#dee2e6" />
                          ) : '-'}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          {isLoading ? (
                            <Loader size="xs" />
                          ) : analyzed ? (
                            analyzed.has_naver_talk ? <CheckCircle2 size={16} color="#2ecc71" /> : <Minus size={16} color="#dee2e6" />
                          ) : '-'}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          {isLoading ? (
                            <Loader size="xs" />
                          ) : analyzed ? (
                            analyzed.has_naver_order ? <CheckCircle2 size={16} color="#2ecc71" /> : <Minus size={16} color="#dee2e6" />
                          ) : '-'}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          {isLoading ? (
                            <Loader size="xs" />
                          ) : analyzed ? (
                            analyzed.has_naver_booking ? <CheckCircle2 size={16} color="#2ecc71" /> : <Minus size={16} color="#dee2e6" />
                          ) : '-'}
                        </Table.Td>
                        <Table.Td>
                          {isLoading ? (
                            <Loader size="xs" />
                          ) : analyzed ? (
                            <Text size="sm">{analyzed.store_search_volume ? analyzed.store_search_volume.toLocaleString() : '0'}</Text>
                          ) : '-'}
                        </Table.Td>
                        <Table.Td style={{ maxWidth: '250px' }}>
                          {isLoading ? (
                            <Loader size="xs" />
                          ) : analyzed ? (
                            <Text size="xs" c="dimmed" lineClamp={2}>{analyzed.important_review || '-'}</Text>
                          ) : '-'}
                        </Table.Td>
                      </Table.Tr>
                    )
                  })}
                </Table.Tbody>
              </Table>
            </div>
          </Paper>

          {/* 비교 분석 요약 (분석 완료 후에만 표시) */}
          {!loadingAnalysis && analyzedStores.length > 0 && comparison && (
            <>
              <Paper ref={summaryRef} shadow="sm" p="xl" mb="xl">
                <Group mb="md" justify="space-between">
                  <Title order={2} style={{ color: '#212529' }}>
                    📊 비교 분석 요약
                  </Title>
                  <Badge size="lg" color="blue" variant="light">
                    {selectedStore?.store_name} vs 상위 {comparison.competitor_count}개
                  </Badge>
                </Group>
                
                <Divider mb="xl" />

                {/* 핵심 지표 카드 (플레이스 활성화 스타일) */}
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="xl">
                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Stack gap="xs">
                      <Text size="sm" c="dimmed" fw={500}>플레이스 진단 점수</Text>
                      <Group gap="xs" align="baseline">
                        <Text size="32px" fw={700} style={{ color: '#635bff' }}>
                          {comparison.gaps.diagnosis_score.my_value?.toFixed(1) || '0.0'}
                        </Text>
                        <Text size="sm" c="dimmed">점</Text>
                      </Group>
                      <Divider />
                      <Stack gap={4}>
                        <Text size="xs" c="dimmed">
                          경쟁매장 평균: <Text component="span" fw={600}>{comparison.gaps.diagnosis_score.competitor_avg?.toFixed(1) || '0.0'}점</Text>
                        </Text>
                        <Group gap="xs">
                          {comparison.gaps.diagnosis_score.status === 'good' ? (
                            <ThemeIcon size="sm" radius="xl" color="green" variant="light">
                              <TrendingUp size={14} />
                            </ThemeIcon>
                          ) : (
                            <ThemeIcon size="sm" radius="xl" color="red" variant="light">
                              <TrendingDown size={14} />
                            </ThemeIcon>
                          )}
                          <Text size="xs" fw={600} c={comparison.gaps.diagnosis_score.status === 'good' ? 'green' : 'red'}>
                            {Math.abs((comparison.gaps.diagnosis_score.my_value || 0) - (comparison.gaps.diagnosis_score.competitor_avg || 0)).toFixed(1)}점 {comparison.gaps.diagnosis_score.status === 'good' ? '우수' : '부족'}
                          </Text>
                        </Group>
                      </Stack>
                    </Stack>
                  </Card>

                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Stack gap="xs">
                      <Text size="sm" c="dimmed" fw={500}>일평균 방문자 리뷰 (7일)</Text>
                      <Group gap="xs" align="baseline">
                        <Text size="32px" fw={700} style={{ color: '#635bff' }}>
                          {comparison.gaps.visitor_reviews_7d_avg.my_value?.toFixed(1) || '0.0'}
                        </Text>
                        <Text size="sm" c="dimmed">개</Text>
                      </Group>
                      <Divider />
                      <Stack gap={4}>
                        <Text size="xs" c="dimmed">
                          경쟁매장 평균: <Text component="span" fw={600}>{comparison.gaps.visitor_reviews_7d_avg.competitor_avg?.toFixed(1) || '0.0'}개</Text>
                        </Text>
                        <Group gap="xs">
                          {comparison.gaps.visitor_reviews_7d_avg.status === 'good' ? (
                            <ThemeIcon size="sm" radius="xl" color="green" variant="light">
                              <TrendingUp size={14} />
                            </ThemeIcon>
                          ) : (
                            <ThemeIcon size="sm" radius="xl" color="red" variant="light">
                              <TrendingDown size={14} />
                            </ThemeIcon>
                          )}
                          <Text size="xs" fw={600} c={comparison.gaps.visitor_reviews_7d_avg.status === 'good' ? 'green' : 'red'}>
                            {Math.abs((comparison.gaps.visitor_reviews_7d_avg.my_value || 0) - (comparison.gaps.visitor_reviews_7d_avg.competitor_avg || 0)).toFixed(1)}개 {comparison.gaps.visitor_reviews_7d_avg.status === 'good' ? '우수' : '부족'}
                          </Text>
                        </Group>
                      </Stack>
                    </Stack>
                  </Card>

                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Stack gap="xs">
                      <Text size="sm" c="dimmed" fw={500}>일평균 블로그 리뷰 (7일)</Text>
                      <Group gap="xs" align="baseline">
                        <Text size="32px" fw={700} style={{ color: '#635bff' }}>
                          {comparison.gaps.blog_reviews_7d_avg.my_value?.toFixed(1) || '0.0'}
                        </Text>
                        <Text size="sm" c="dimmed">개</Text>
                      </Group>
                      <Divider />
                      <Stack gap={4}>
                        <Text size="xs" c="dimmed">
                          경쟁매장 평균: <Text component="span" fw={600}>{comparison.gaps.blog_reviews_7d_avg.competitor_avg?.toFixed(1) || '0.0'}개</Text>
                        </Text>
                        <Group gap="xs">
                          {comparison.gaps.blog_reviews_7d_avg.status === 'good' ? (
                            <ThemeIcon size="sm" radius="xl" color="green" variant="light">
                              <TrendingUp size={14} />
                            </ThemeIcon>
                          ) : (
                            <ThemeIcon size="sm" radius="xl" color="red" variant="light">
                              <TrendingDown size={14} />
                            </ThemeIcon>
                          )}
                          <Text size="xs" fw={600} c={comparison.gaps.blog_reviews_7d_avg.status === 'good' ? 'green' : 'red'}>
                            {Math.abs((comparison.gaps.blog_reviews_7d_avg.my_value || 0) - (comparison.gaps.blog_reviews_7d_avg.competitor_avg || 0)).toFixed(1)}개 {comparison.gaps.blog_reviews_7d_avg.status === 'good' ? '우수' : '부족'}
                          </Text>
                        </Group>
                      </Stack>
                    </Stack>
                  </Card>

                  <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Stack gap="xs">
                      <Text size="sm" c="dimmed" fw={500}>7일간 공지 등록 수</Text>
                      <Group gap="xs" align="baseline">
                        <Text size="32px" fw={700} style={{ color: '#635bff' }}>
                          {comparison.gaps.announcements_7d.my_value?.toFixed(1) || '0.0'}
                        </Text>
                        <Text size="sm" c="dimmed">개</Text>
                      </Group>
                      <Divider />
                      <Stack gap={4}>
                        <Text size="xs" c="dimmed">
                          경쟁매장 평균: <Text component="span" fw={600}>{comparison.gaps.announcements_7d.competitor_avg?.toFixed(1) || '0.0'}개</Text>
                        </Text>
                        <Group gap="xs">
                          {comparison.gaps.announcements_7d.status === 'good' ? (
                            <ThemeIcon size="sm" radius="xl" color="green" variant="light">
                              <TrendingUp size={14} />
                            </ThemeIcon>
                          ) : (
                            <ThemeIcon size="sm" radius="xl" color="red" variant="light">
                              <TrendingDown size={14} />
                            </ThemeIcon>
                          )}
                          <Text size="xs" fw={600} c={comparison.gaps.announcements_7d.status === 'good' ? 'green' : 'red'}>
                            {Math.abs((comparison.gaps.announcements_7d.my_value || 0) - (comparison.gaps.announcements_7d.competitor_avg || 0)).toFixed(1)}개 {comparison.gaps.announcements_7d.status === 'good' ? '우수' : '부족'}
                          </Text>
                        </Group>
                      </Stack>
                    </Stack>
                  </Card>
                </SimpleGrid>
              </Paper>

              {/* 개선 권장사항 */}
              {comparison.recommendations.length > 0 && (
                <Paper shadow="sm" p="xl" mb="xl">
                  <Title order={2} mb="xl" style={{ color: '#212529' }}>
                    🎯 개선 권장사항
                  </Title>
                  
                  <Timeline active={comparison.recommendations.length} bulletSize={24} lineWidth={2}>
                    {comparison.recommendations.map((rec, idx) => (
                      <Timeline.Item
                        key={idx}
                        bullet={<Text size="xs" fw={700}>{idx + 1}</Text>}
                        title={
                          <Badge color={rec.priority === "high" ? "red" : "orange"} size="sm">
                            {rec.priority === "high" ? "높음" : "보통"}
                          </Badge>
                        }
                      >
                        <Paper p="md" mt="xs" style={{ backgroundColor: '#f8f9fa' }}>
                          <Text fw={600} mb="xs">{rec.title}</Text>
                          <Text size="sm" c="dimmed">{rec.description}</Text>
                        </Paper>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                </Paper>
              )}
            </>
          )}
        </>
      )}

      {/* Footer */}
      <Paper p="md" mt="xl" style={{ backgroundColor: '#f8f9fa', textAlign: 'center' }}>
        <Text size="xs" c="dimmed">
          © {new Date().getFullYear()} Egurado Competitor Analysis Report • Generated on {new Date().toLocaleString('ko-KR')}
        </Text>
      </Paper>
    </Container>
  )
}

