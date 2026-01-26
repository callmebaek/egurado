"use client"

import { useState, useEffect } from "react"
import { Store, Loader2, CheckCircle2, AlertCircle, X, ExternalLink, TrendingUp, TrendingDown, Calendar, FileText } from "lucide-react"
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
  Divider,
  ThemeIcon,
  Accordion,
  ActionIcon,
  Box,
  Center,
  Loader,
  Avatar,
} from '@mantine/core'
import '@mantine/core/styles.css'

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
  announcements?: any[]
  promotions?: {
    total: number
    coupons?: any[]
  }
  payment_methods?: string[]
  conveniences?: string[]
  micro_reviews?: string[]
  menus?: any[]
  [key: string]: any  // 추가 속성 허용
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

interface DiagnosisHistoryItem {
  id: string
  place_id: string
  store_name: string
  diagnosed_at: string
  total_score: number
  max_score: number
  grade: string
}

interface DiagnosisHistoryDetail {
  id: string
  user_id: string
  store_id: string
  place_id: string
  store_name: string
  diagnosed_at: string
  total_score: number
  max_score: number
  grade: string
  diagnosis_result: DiagnosisResult
  place_details: PlaceDetails
  created_at: string
}

export default function AuditPage() {
  const { toast } = useToast()
  const { user, getToken } = useAuth()
  const [stores, setStores] = useState<RegisteredStore[]>([])
  const [isLoadingStores, setIsLoadingStores] = useState(false)
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null)
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null)
  
  // 진단 히스토리 관련 state
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [diagnosisHistory, setDiagnosisHistory] = useState<DiagnosisHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<DiagnosisHistoryDetail | null>(null)
  const [isLoadingHistoryDetail, setIsLoadingHistoryDetail] = useState(false)

  // 등록된 매장 목록 가져오기
  useEffect(() => {
    if (user) {
      fetchStores()
    }
  }, [user])

  const fetchStores = async () => {
    const token = getToken()
    if (!user || !token) return

    setIsLoadingStores(true)
    try {
      const response = await fetch(api.stores.list(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      const url = api.naver.analyzePlaceDetails(selectedStore.place_id, selectedStore.name, selectedStore.id)
      console.log("📡 API URL:", url)
      
      const token = getToken()
      const headers: Record<string, string> = {}
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(url, { headers })
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

  // 진단 히스토리 조회
  const handleViewHistory = async (store: RegisteredStore) => {
    setSelectedStore(store)
    setShowHistoryModal(true)
    setIsLoadingHistory(true)
    setDiagnosisHistory([])
    
    try {
      const token = getToken()
      if (!token) {
        throw new Error("로그인이 필요합니다.")
      }
      
      const url = api.naver.diagnosisHistory(store.id)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error("히스토리 조회에 실패했습니다.")
      }
      
      const data = await response.json()
      setDiagnosisHistory(data.history || [])
      
    } catch (error) {
      console.error("Error loading history:", error)
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
    
    try {
      const token = getToken()
      if (!token) {
        throw new Error("로그인이 필요합니다.")
      }
      
      const url = api.naver.diagnosisHistoryDetail(historyId)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error("히스토리 상세 조회에 실패했습니다.")
      }
      
      const data = await response.json()
      const historyDetail = data.history
      
      // 과거 진단 결과를 현재 진단 결과처럼 표시
      setPlaceDetails(historyDetail.place_details)
      setDiagnosisResult(historyDetail.diagnosis_result)
      setShowHistoryModal(false)
      
      toast({
        title: "📜 과거 진단 결과",
        description: `${new Date(historyDetail.diagnosed_at).toLocaleString('ko-KR')}의 진단 결과입니다.`,
      })
      
    } catch (error) {
      console.error("Error loading history detail:", error)
      toast({
        variant: "destructive",
        title: "❌ 상세 조회 실패",
        description: error instanceof Error ? error.message : "상세 조회에 실패했습니다.",
      })
    } finally {
      setIsLoadingHistoryDetail(false)
    }
  }

  const handleCloseHistoryModal = () => {
    setShowHistoryModal(false)
    setDiagnosisHistory([])
    setSelectedHistoryDetail(null)
  }

  // Helper functions
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return '#9b59b6' // 보라
      case 'A': return '#3498db' // 파랑
      case 'B': return '#2ecc71' // 녹색
      case 'C': return '#f39c12' // 주황
      default: return '#e74c3c' // 빨강
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'red'
      case 'high': return 'orange'
      case 'medium': return 'yellow'
      default: return 'blue'
    }
  }

  // 진단 결과가 있으면 결과 화면 표시
  if (placeDetails && selectedStore) {
    return (
      <Container size="xl" px="md" py="xl" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        {/* Report Header */}
        <Paper shadow="sm" p="xl" mb="xl" style={{ borderLeft: '6px solid #635bff' }}>
          <Group justify="space-between" align="flex-start">
            <div>
              <Group gap="sm" mb="xs">
                <FileText size={32} color="#635bff" />
                <Title order={1} style={{ color: '#212529' }}>플레이스 진단 리포트</Title>
              </Group>
              <Text size="lg" c="dimmed">
                {selectedStore.name} - 네이버 플레이스 종합 진단
              </Text>
              {diagnosisResult && (
                <Group gap="xs" mt="md">
                  <Calendar size={16} />
                  <Text size="sm" c="dimmed">
                    진단일: {new Date(diagnosisResult.diagnosis_date).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </Group>
              )}
            </div>
            <Button
              variant="outline"
              color="gray"
              leftSection={<X size={16} />}
              onClick={handleCloseResults}
            >
              닫기
            </Button>
          </Group>
        </Paper>

        {/* Executive Summary */}
        {diagnosisResult && (
          <Paper shadow="md" p="xl" mb="xl" style={{ border: '2px solid #635bff' }}>
            <Title order={2} mb="xl" style={{ color: '#212529' }}>
              📊 Executive Summary
            </Title>
            
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Stack gap="md">
                  <Paper p="lg" style={{ backgroundColor: '#f8f9fa' }}>
                    <Text size="sm" fw={600} c="dimmed" mb="xs">종합 점수</Text>
                    <Text size="48px" fw={900} style={{ color: getGradeColor(diagnosisResult.grade) }}>
                      {diagnosisResult.total_score.toFixed(1)}
                      <Text component="span" size="xl" c="dimmed"> / {diagnosisResult.max_score}</Text>
                    </Text>
                    {diagnosisResult.bonus_score > 0 && (
                      <Badge color="green" size="lg" mt="sm">
                        보너스 +{diagnosisResult.bonus_score}점
                      </Badge>
                    )}
                  </Paper>
                  
                  <Paper p="lg" style={{ backgroundColor: '#f8f9fa' }}>
                    <Text size="sm" fw={600} c="dimmed" mb="xs">플레이스 정보</Text>
                    <Stack gap="xs">
                      <Group gap="xs">
                        <Text size="sm" fw={600}>매장명:</Text>
                        <Text size="sm">{placeDetails.name}</Text>
                      </Group>
                      <Group gap="xs">
                        <Text size="sm" fw={600}>카테고리:</Text>
                        <Text size="sm">{placeDetails.category}</Text>
                      </Group>
                      <Group gap="xs">
                        <Text size="sm" fw={600}>주소:</Text>
                        <Text size="sm">{placeDetails.address}</Text>
                      </Group>
                      <Button
                        variant="light"
                        size="xs"
                        color="blue"
                        leftSection={<ExternalLink size={14} />}
                        onClick={() => window.open(`https://m.place.naver.com/place/${placeDetails.place_id}`, '_blank')}
                        mt="xs"
                      >
                        네이버에서 보기
                      </Button>
                    </Stack>
                  </Paper>
                </Stack>
              </Grid.Col>
              
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Center style={{ height: '100%' }}>
                  <div style={{ textAlign: 'center' }}>
                    <RingProgress
                      size={250}
                      thickness={24}
                      sections={[
                        {
                          value: (diagnosisResult.total_score / diagnosisResult.max_score) * 100,
                          color: getGradeColor(diagnosisResult.grade)
                        }
                      ]}
                      label={
                        <Center>
                          <div>
                            <Text size="80px" fw={900} ta="center" style={{ color: getGradeColor(diagnosisResult.grade) }}>
                              {diagnosisResult.grade}
                            </Text>
                            <Text size="sm" ta="center" c="dimmed" fw={600}>등급</Text>
                          </div>
                        </Center>
                      }
                    />
                    <Text size="lg" fw={600} mt="md" c="dimmed">
                      상위 {diagnosisResult.grade === 'S' ? '5%' : 
                             diagnosisResult.grade === 'A' ? '20%' :
                             diagnosisResult.grade === 'B' ? '40%' :
                             diagnosisResult.grade === 'C' ? '60%' : '80%'} 수준
                    </Text>
                  </div>
                </Center>
              </Grid.Col>
            </Grid>
          </Paper>
        )}

        {/* Detailed Analysis - 항목별 점수 */}
        {diagnosisResult && (
          <Paper shadow="sm" p="xl" mb="xl">
            <Title order={2} mb="xl" style={{ color: '#212529' }}>
              📈 Detailed Analysis
            </Title>
            
            <Grid>
              {Object.entries(diagnosisResult.evaluations).map(([key, evaluation]) => {
                const percentage = (evaluation.score / evaluation.max_score) * 100
                
                return (
                  <Grid.Col key={key} span={{ base: 12, sm: 6, md: 4 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder style={{ height: '100%' }}>
                      <Group justify="space-between" mb="md">
                        <Text fw={600} size="sm">{evaluation.category_name}</Text>
                        {evaluation.is_bonus && (
                          <Badge color="green" size="sm">보너스</Badge>
                        )}
                      </Group>
                      
                      <Text size="36px" fw={900} mb="xs" style={{ color: getGradeColor(evaluation.grade) }}>
                        {evaluation.grade}
                      </Text>
                      
                      <Progress
                        value={percentage}
                        color={getGradeColor(evaluation.grade)}
                        size="lg"
                        radius="xl"
                        mb="xs"
                      />
                      
                      <Text size="xs" c="dimmed">
                        {evaluation.score.toFixed(1)} / {evaluation.max_score} 점
                      </Text>
                    </Card>
                  </Grid.Col>
                )
              })}
            </Grid>
          </Paper>
        )}

        {/* Priority Recommendations */}
        {diagnosisResult && diagnosisResult.priority_actions.length > 0 && (
          <Paper shadow="sm" p="xl" mb="xl">
            <Title order={2} mb="xl" style={{ color: '#212529' }}>
              🎯 Priority Recommendations
            </Title>
            
            <Timeline active={diagnosisResult.priority_actions.length} bulletSize={24} lineWidth={2}>
              {diagnosisResult.priority_actions.slice(0, 5).map((action, idx) => (
                <Timeline.Item
                  key={idx}
                  bullet={<Text size="xs" fw={700}>{idx + 1}</Text>}
                  title={
                    <Group gap="xs">
                      <Badge color={getPriorityColor(action.priority)} size="sm">
                        {action.priority.toUpperCase()}
                      </Badge>
                      <Badge color="green" size="sm">+{action.estimated_gain}점</Badge>
                    </Group>
                  }
                >
                  <Paper p="md" mt="xs" style={{ backgroundColor: '#f8f9fa' }}>
                    <Text fw={600} size="sm" mb="xs">{action.action}</Text>
                    <Text size="xs" c="dimmed" mb="xs">
                      💡 방법: {action.method}
                    </Text>
                    {action.copy_example && (
                      <Paper p="xs" mt="xs" style={{ backgroundColor: 'white', border: '1px dashed #dee2e6' }}>
                        <Text size="xs" c="dimmed" fs="italic">
                          ✏️ 예시: {action.copy_example}
                        </Text>
                      </Paper>
                    )}
                    {action.note && (
                      <Text size="xs" c="dimmed" mt="xs">
                        📌 {action.note}
                      </Text>
                    )}
                  </Paper>
                </Timeline.Item>
              ))}
            </Timeline>
          </Paper>
        )}

        {/* Detailed Findings Table */}
        <Paper shadow="sm" p="xl" mb="xl">
          <Title order={2} mb="xl" style={{ color: '#212529' }}>
            📋 Detailed Findings
          </Title>
          
          <div style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '160px', fontWeight: 700 }}>카테고리</Table.Th>
                  <Table.Th style={{ width: '200px', fontWeight: 700 }}>항목</Table.Th>
                  <Table.Th style={{ fontWeight: 700 }}>현재 상태</Table.Th>
                  <Table.Th style={{ width: '120px', fontWeight: 700 }}>등급</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {/* 기본 정보 */}
                <Table.Tr>
                  <Table.Td rowSpan={6} style={{ backgroundColor: '#e3f2fd', fontWeight: 600 }}>기본 정보</Table.Td>
                  <Table.Td>매장명</Table.Td>
                  <Table.Td>{placeDetails.name}</Table.Td>
                  <Table.Td><Text size="xs" c="dimmed">-</Text></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>카테고리</Table.Td>
                  <Table.Td>{placeDetails.category}</Table.Td>
                  <Table.Td><Text size="xs" c="dimmed">-</Text></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>주소</Table.Td>
                  <Table.Td>{placeDetails.address}</Table.Td>
                  <Table.Td><Text size="xs" c="dimmed">-</Text></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>도로명주소</Table.Td>
                  <Table.Td>{placeDetails.road_address || '-'}</Table.Td>
                  <Table.Td><Text size="xs" c="dimmed">-</Text></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>전화번호</Table.Td>
                  <Table.Td>{placeDetails.phone_number || '-'}</Table.Td>
                  <Table.Td><Text size="xs" c="dimmed">-</Text></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>플레이스 ID</Table.Td>
                  <Table.Td>{placeDetails.place_id}</Table.Td>
                  <Table.Td><Text size="xs" c="dimmed">-</Text></Table.Td>
                </Table.Tr>

                {/* 평점 및 리뷰 */}
                <Table.Tr>
                  <Table.Td rowSpan={3} style={{ backgroundColor: '#e8f5e9', fontWeight: 600 }}>평점 및 리뷰</Table.Td>
                  <Table.Td>방문자 평점</Table.Td>
                  <Table.Td>{placeDetails.visitor_review_score || '-'}</Table.Td>
                  <Table.Td><Text size="xs" c="dimmed">-</Text></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>방문자 리뷰 수</Table.Td>
                  <Table.Td>{(placeDetails.visitor_review_count || 0).toLocaleString()}개</Table.Td>
                  <Table.Td>
                    {diagnosisResult?.evaluations.visitor_reviews && (
                      <Badge color={getGradeColor(diagnosisResult.evaluations.visitor_reviews.grade)}>
                        {diagnosisResult.evaluations.visitor_reviews.grade}등급
                      </Badge>
                    )}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>블로그 리뷰 수</Table.Td>
                  <Table.Td>{(placeDetails.blog_review_count || 0).toLocaleString()}개</Table.Td>
                  <Table.Td>
                    {diagnosisResult?.evaluations.blog_reviews && (
                      <Badge color={getGradeColor(diagnosisResult.evaluations.blog_reviews.grade)}>
                        {diagnosisResult.evaluations.blog_reviews.grade}등급
                      </Badge>
                    )}
                  </Table.Td>
                </Table.Tr>

                {/* 이미지 */}
                <Table.Tr>
                  <Table.Td rowSpan={2} style={{ backgroundColor: '#f3e5f5', fontWeight: 600 }}>이미지</Table.Td>
                  <Table.Td>대표 이미지</Table.Td>
                  <Table.Td>{placeDetails.image_url ? '있음' : '없음'}</Table.Td>
                  <Table.Td rowSpan={2}>
                    {diagnosisResult?.evaluations.images && (
                      <Badge color={getGradeColor(diagnosisResult.evaluations.images.grade)}>
                        {diagnosisResult.evaluations.images.grade}등급
                      </Badge>
                    )}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>전체 이미지 수</Table.Td>
                  <Table.Td>{placeDetails.image_count || 0}개</Table.Td>
                </Table.Tr>

                {/* 메뉴 */}
                <Table.Tr>
                  <Table.Td style={{ backgroundColor: '#fff3e0', fontWeight: 600 }}>메뉴</Table.Td>
                  <Table.Td>등록된 메뉴</Table.Td>
                  <Table.Td>
                    {placeDetails.menus && placeDetails.menus.length > 0 ? (
                      <div>
                        <Text size="sm" fw={600} mb="xs">총 {placeDetails.menus.length}개</Text>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {placeDetails.menus.slice(0, 5).map((menu: any, idx: number) => (
                            <Paper key={idx} p="xs" mb="xs" style={{ backgroundColor: '#f8f9fa' }}>
                              <Text size="sm" fw={600}>{menu.name}</Text>
                              {menu.price && <Text size="xs" c="dimmed">{Number(menu.price).toLocaleString()}원</Text>}
                              {menu.description && (
                                <Text size="xs" c="dimmed" lineClamp={1}>{menu.description}</Text>
                              )}
                            </Paper>
                          ))}
                          {placeDetails.menus.length > 5 && (
                            <Text size="xs" c="dimmed">외 {placeDetails.menus.length - 5}개</Text>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Text size="sm" c="dimmed">등록된 메뉴 없음</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {diagnosisResult?.evaluations.menus && (
                      <Badge color={getGradeColor(diagnosisResult.evaluations.menus.grade)}>
                        {diagnosisResult.evaluations.menus.grade}등급
                      </Badge>
                    )}
                  </Table.Td>
                </Table.Tr>

                {/* 편의시설 */}
                <Table.Tr>
                  <Table.Td style={{ backgroundColor: '#fce4ec', fontWeight: 600 }}>편의시설</Table.Td>
                  <Table.Td>편의시설 목록</Table.Td>
                  <Table.Td>
                    {(placeDetails as any).conveniences && (placeDetails as any).conveniences.length > 0 ? (
                      <Group gap="xs">
                        {(placeDetails as any).conveniences.map((item: string, idx: number) => (
                          <Badge key={idx} size="sm" variant="light">{item}</Badge>
                        ))}
                      </Group>
                    ) : (
                      <Text size="sm" c="dimmed">정보 없음</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {diagnosisResult?.evaluations.conveniences && (
                      <Badge color={getGradeColor(diagnosisResult.evaluations.conveniences.grade)}>
                        {diagnosisResult.evaluations.conveniences.grade}등급
                      </Badge>
                    )}
                  </Table.Td>
                </Table.Tr>

                {/* 네이버페이 */}
                <Table.Tr>
                  <Table.Td style={{ backgroundColor: '#e8f5e9', fontWeight: 600 }}>네이버페이</Table.Td>
                  <Table.Td>사용 여부</Table.Td>
                  <Table.Td>
                    {(placeDetails as any).has_naverpay_in_search ? (
                      <Badge color="green">✓ 사용 중</Badge>
                    ) : (
                      <Badge color="red">미사용</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {diagnosisResult?.evaluations.naverpay && (
                      <Badge color={getGradeColor(diagnosisResult.evaluations.naverpay.grade)}>
                        {diagnosisResult.evaluations.naverpay.grade}등급
                      </Badge>
                    )}
                  </Table.Td>
                </Table.Tr>

                {/* 공지사항 */}
                <Table.Tr>
                  <Table.Td style={{ backgroundColor: '#fff9c4', fontWeight: 600 }}>공지사항</Table.Td>
                  <Table.Td>최신 공지</Table.Td>
                  <Table.Td>
                    {placeDetails.announcements && placeDetails.announcements.length > 0 ? (
                      <Stack gap="xs">
                        {placeDetails.announcements.slice(0, 2).map((notice: any, idx: number) => (
                          <Text key={idx} size="xs">• {notice.title} ({notice.relativeCreated})</Text>
                        ))}
                      </Stack>
                    ) : (
                      <Text size="sm" c="dimmed">없음</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {diagnosisResult?.evaluations.announcements && (
                      <Badge color={getGradeColor(diagnosisResult.evaluations.announcements.grade)}>
                        {diagnosisResult.evaluations.announcements.grade}등급
                      </Badge>
                    )}
                  </Table.Td>
                </Table.Tr>

                {/* 플레이스 플러스 */}
                <Table.Tr>
                  <Table.Td style={{ backgroundColor: '#fff3e0', fontWeight: 600 }}>플레이스 플러스</Table.Td>
                  <Table.Td>사용 여부</Table.Td>
                  <Table.Td>
                    {placeDetails.is_place_plus ? (
                      <Badge color="green">✓ 사용 중</Badge>
                    ) : (
                      <Badge color="gray">미사용</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {diagnosisResult?.evaluations.place_plus && (
                      <Badge color={getGradeColor(diagnosisResult.evaluations.place_plus.grade)}>
                        {diagnosisResult.evaluations.place_plus.grade}등급
                      </Badge>
                    )}
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </div>
        </Paper>

        {/* Footer */}
        <Paper p="md" style={{ backgroundColor: '#f8f9fa', textAlign: 'center' }}>
          <Text size="xs" c="dimmed">
            © {new Date().getFullYear()} Egurado Place Diagnosis Report • Generated on {new Date().toLocaleString('ko-KR')}
          </Text>
        </Paper>
      </Container>
    )
  }

  // 매장 선택 화면
  return (
    <Container size="xl" px="md" py="xl" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <Paper shadow="sm" p="xl" mb="xl" style={{ borderLeft: '6px solid #635bff' }}>
        <Group gap="sm" mb="xs">
          <FileText size={32} color="#635bff" />
          <Title order={1} style={{ color: '#212529' }}>플레이스 진단</Title>
        </Group>
        <Text size="lg" c="dimmed">
          진단할 매장을 선택하세요
        </Text>
      </Paper>

      {/* Loading State */}
      {isLoadingStores && (
        <Paper shadow="sm" p="xl">
          <Center>
            <Stack align="center" gap="md">
              <Loader size="lg" color="#635bff" />
              <Text c="dimmed">등록된 매장을 불러오는 중...</Text>
            </Stack>
          </Center>
        </Paper>
      )}

      {/* Analyzing State */}
      {isAnalyzing && (
        <Paper shadow="sm" p="xl">
          <Center>
            <Stack align="center" gap="md">
              <Loader size="xl" color="#635bff" />
              <div style={{ textAlign: 'center' }}>
                <Text size="lg" fw={600} mb="xs">플레이스 진단 중...</Text>
                <Text c="dimmed">
                  {selectedStore?.name} 매장의 정보를 가져오고 있습니다.
                </Text>
              </div>
            </Stack>
          </Center>
        </Paper>
      )}

      {/* No Stores */}
      {!isLoadingStores && !isAnalyzing && stores.length === 0 && (
        <Paper shadow="sm" p="xl" style={{ backgroundColor: '#e3f2fd', border: '1px solid #90caf9' }}>
          <Center>
            <Stack align="center" gap="md">
              <Store size={64} color="#2196f3" />
              <Text c="dimmed" mb="md">
                등록된 네이버 플레이스 매장이 없습니다.
              </Text>
              <Button
                size="lg"
                color="#635bff"
                onClick={() => window.location.href = '/dashboard/connect-store'}
              >
                매장 등록하러 가기
              </Button>
            </Stack>
          </Center>
        </Paper>
      )}

      {/* Store Cards Grid */}
      {!isLoadingStores && !isAnalyzing && stores.length > 0 && (
        <Grid>
          {stores.map((store) => (
            <Grid.Col key={store.id} span={{ base: 12, sm: 6, md: 4 }}>
              <Card
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
                style={{ height: '100%', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
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
                        alt={store.name}
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
                  <Text fw={600} size="lg" lineClamp={1}>{store.name}</Text>
                  <Text size="sm" c="dimmed" lineClamp={1}>{store.category}</Text>
                  <Text size="xs" c="dimmed" lineClamp={2}>{store.address}</Text>
                </Stack>

                {/* Buttons */}
                <Stack gap="xs" mt="md">
                  <Button
                    fullWidth
                    color="#635bff"
                    onClick={() => handleStoreSelect(store)}
                  >
                    진단 시작하기
                  </Button>
                  <Button
                    fullWidth
                    variant="light"
                    color="gray"
                    onClick={() => handleViewHistory(store)}
                  >
                    📜 과거 진단 보기
                  </Button>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}

      {/* Confirm Modal */}
      <Modal
        opened={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false)
          setSelectedStore(null)
        }}
        title={<Text fw={700} size="lg">플레이스 진단</Text>}
        centered
      >
        <Stack gap="md">
          <Text>
            <Text component="span" fw={600}>{selectedStore?.name}</Text> 매장의
            플레이스 진단을 시작하시겠습니까?
          </Text>

          <Paper p="md" style={{ backgroundColor: '#e3f2fd', border: '1px solid #90caf9' }}>
            <Group gap="xs" align="flex-start">
              <AlertCircle size={20} color="#2196f3" />
              <div>
                <Text size="sm" fw={600} mb="xs">진단 내용</Text>
                <Text size="sm">네이버 플레이스에 등록된 모든 정보를 가져와서 분석합니다.</Text>
              </div>
            </Group>
          </Paper>

          <Group justify="flex-end" gap="xs">
            <Button
              variant="outline"
              color="gray"
              onClick={() => {
                setShowConfirmModal(false)
                setSelectedStore(null)
              }}
            >
              취소하기
            </Button>
            <Button
              color="#635bff"
              leftSection={<CheckCircle2 size={16} />}
              onClick={handleStartAudit}
            >
              바로 시작하기
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* History Modal */}
      <Modal
        opened={showHistoryModal}
        onClose={handleCloseHistoryModal}
        title={
          <div>
            <Text fw={700} size="lg">과거 진단 기록</Text>
            <Text size="sm" c="dimmed">{selectedStore?.name} - 최근 30개까지 저장됩니다</Text>
          </div>
        }
        size="xl"
        centered
      >
        {isLoadingHistory && (
          <Center py="xl">
            <Loader size="lg" color="#635bff" />
          </Center>
        )}

        {!isLoadingHistory && diagnosisHistory.length === 0 && (
          <Center py="xl">
            <Text c="dimmed">아직 진단 기록이 없습니다.</Text>
          </Center>
        )}

        {!isLoadingHistory && diagnosisHistory.length > 0 && (
          <Stack gap="sm">
            {diagnosisHistory.map((history) => (
              <Card
                key={history.id}
                shadow="sm"
                padding="md"
                radius="md"
                withBorder
                style={{ cursor: 'pointer' }}
                onClick={() => handleViewHistoryDetail(history.id)}
              >
                <Group justify="space-between">
                  <div>
                    <Group gap="xs" mb="xs">
                      <Text fw={600}>
                        {new Date(history.diagnosed_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                      <Badge color={getGradeColor(history.grade)}>
                        {history.grade}등급
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed">
                      점수: {history.total_score}점 / {history.max_score}점
                    </Text>
                  </div>
                  <Button variant="light" size="sm">
                    자세히 보기 →
                  </Button>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Modal>
    </Container>
  )
}
