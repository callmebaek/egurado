'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  Container, 
  Title, 
  Text, 
  Button, 
  Card, 
  Grid, 
  Stack, 
  Group,
  Badge,
  Loader,
  Center,
  Alert,
  Divider,
  Paper,
  Textarea,
  Modal,
  Box,
  SimpleGrid,
  ThemeIcon,
  Progress,
  Tooltip,
  TextInput,
  ActionIcon
} from '@mantine/core'
import { 
  Store, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  MessageSquare,
  FileText,
  Gift,
  Megaphone,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Globe,
  Instagram,
  Facebook,
  BookOpen,
  Phone,
  CreditCard,
  Calendar,
  MessageCircle,
  Award,
  Copy
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/use-toast'
import { api } from '@/lib/config'

interface RegisteredStore {
  id: string
  name: string
  place_id: string
  category: string
  address: string
  thumbnail?: string
  platform: string
}

interface SummaryCard {
  type: string
  title: string
  value: number
  daily_avg?: number
  vs_7d_pct?: number
  vs_30d_pct?: number
  avg_7d?: number
  avg_30d?: number
  total?: number
  reply_rate?: number
  has_active?: boolean
  days_since_last?: number
}

interface ReviewTrends {
  last_3days_avg: number
  last_7days_avg: number
  last_30days_avg: number
  last_60days_avg: number
  comparisons: {
    vs_last_7days: { direction: string; change: number }
    vs_last_30days: { direction: string; change: number }
    vs_last_60days: { direction: string; change: number }
  }
}

interface PendingReplyInfo {
  total_reviews: number
  pending_count: number
  replied_count: number
  reply_rate: number
  oldest_pending_date: string | null
}

interface PromotionItem {
  title: string
  description: string
  discount: string
}

interface AnnouncementItem {
  title: string
  content: string
  days_ago: number
  relative: string
}

interface ActivationData {
  store_name: string
  place_id: string
  thumbnail?: string
  summary_cards: SummaryCard[]
  visitor_review_trends: ReviewTrends
  blog_review_trends: ReviewTrends
  current_visitor_review_count: number
  current_blog_review_count: number
  promotion_items: PromotionItem[]
  announcement_items: AnnouncementItem[]
  is_place_plus: boolean
  pending_reply_info: PendingReplyInfo
  naver_api_limited: boolean
  has_promotion: boolean
  promotion_count: number
  has_announcement: boolean
  announcement_count: number
  last_announcement_date?: string
  days_since_last_announcement?: number
  description?: string
  directions?: string
  homepage?: string
  instagram?: string
  facebook?: string
  blog?: string
  has_smart_call: boolean
  has_naver_pay: boolean
  has_naver_booking: boolean
  has_naver_talk: boolean
  has_naver_order: boolean
}

export default function ActivationPage() {
  const { user, getToken } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  
  const [stores, setStores] = useState<RegisteredStore[]>([])
  const [isLoadingStores, setIsLoadingStores] = useState(false)
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activationData, setActivationData] = useState<ActivationData | null>(null)
  
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)
  const [showDirectionsModal, setShowDirectionsModal] = useState(false)
  const [descriptionPrompt, setDescriptionPrompt] = useState('')
  const [directionsPrompt, setDirectionsPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedText, setGeneratedText] = useState('')
  
  // 업체소개글 생성을 위한 5개 입력 필드
  const [regionKeyword, setRegionKeyword] = useState('')
  const [landmarkKeywords, setLandmarkKeywords] = useState('')
  const [businessTypeKeyword, setBusinessTypeKeyword] = useState('')
  const [productKeywords, setProductKeywords] = useState('')
  const [storeFeatures, setStoreFeatures] = useState('')
  const [generatedTextCharCount, setGeneratedTextCharCount] = useState(0)
  
  // 찾아오는길용 state
  const [directionsRegionKeyword, setDirectionsRegionKeyword] = useState('')
  const [directionsLandmarkKeywords, setDirectionsLandmarkKeywords] = useState('')
  const [directionsDescription, setDirectionsDescription] = useState('')
  const [generatedDirectionsText, setGeneratedDirectionsText] = useState('')
  const [generatedDirectionsCharCount, setGeneratedDirectionsCharCount] = useState(0)

  // 과거 이력 관련 state
  const [activationHistories, setActivationHistories] = useState<any[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [isLoadingHistories, setIsLoadingHistories] = useState(false)

  // 등록된 매장 목록 가져오기
  useEffect(() => {
    if (user) {
      fetchStores()
    }
  }, [user])

  // URL 파라미터로부터 storeId 읽어서 자동 선택
  useEffect(() => {
    const storeId = searchParams.get('storeId')
    if (storeId && stores.length > 0 && !selectedStore) {
      const targetStore = stores.find(s => s.id === storeId)
      if (targetStore) {
        console.log('[활성화] URL에서 매장 자동 선택:', targetStore.name)
        handleStoreSelect(targetStore)
      }
    }
  }, [searchParams, stores])

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

  const handleStoreSelect = async (store: RegisteredStore) => {
    setSelectedStore(store)
    setActivationData(null)
    setIsLoading(true)

    try {
      const token = getToken()
      if (!token) {
        throw new Error("인증 토큰이 없습니다.")
      }

      // 활성화 정보와 과거 이력 병렬로 가져오기
      const [activationResponse, historyResponse] = await Promise.all([
        fetch(api.naver.activation(store.id), {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(api.naver.activationHistory(store.id), {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => null) // 이력 조회 실패해도 계속 진행
      ])

      const response = activationResponse

      if (!response.ok) {
        throw new Error("플레이스 활성화 정보 조회에 실패했습니다.")
      }

      const data = await response.json()
      console.log('[활성화 디버그] API 응답:', data.data)
      console.log('[활성화 디버그] summary_cards[0] (visitor):', data.data.summary_cards?.[0])
      console.log('[활성화 디버그] visitor_review_trends:', data.data.visitor_review_trends)
      setActivationData(data.data) // API 응답의 data 필드만 추출

      // 과거 이력 처리
      if (historyResponse && historyResponse.ok) {
        const historyData = await historyResponse.json()
        setActivationHistories(historyData.histories || [])
        console.log('[활성화 이력] 조회 완료:', historyData.histories?.length || 0, '개')
      } else {
        setActivationHistories([])
      }
    } catch (error) {
      console.error("Error fetching activation data:", error)
      toast({
        variant: "destructive",
        title: "❌ 오류",
        description: "플레이스 활성화 정보를 불러오는데 실패했습니다.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getTrendIcon = (direction: string) => {
    if (direction === 'up') return <ArrowUp className="w-4 h-4 text-green-600" />
    if (direction === 'down') return <ArrowDown className="w-4 h-4 text-red-600" />
    return <Minus className="w-4 h-4 text-gray-400" />
  }

  const getTrendColor = (direction: string) => {
    if (direction === 'up') return 'green'
    if (direction === 'down') return 'red'
    return 'gray'
  }

  const renderSummaryCards = () => {
    if (!activationData?.summary_cards) return null

    return (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 5 }} spacing="md" mb="xl">
        {activationData.summary_cards.map((card) => (
          <Card key={card.type} shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
              <Text size="sm" c="dimmed" fw={500}>{card.title}</Text>
              
              {card.type === 'visitor_review' || card.type === 'blog_review' ? (
                <>
                  <Group gap="xs" align="center">
                    <Text size="xl" fw={700}>{card.value.toFixed(2)}</Text>
                    <Text size="xl">
                      {((card.vs_7d_pct || 0) + (card.vs_30d_pct || 0)) / 2 > 0 ? '👏' : 
                       ((card.vs_7d_pct || 0) + (card.vs_30d_pct || 0)) / 2 < 0 ? '😢' : ''}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">지난 3일 일평균</Text>
                  
                  <Divider />
                  
                  <Stack gap={4}>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">vs 지난 7일</Text>
                      <Badge 
                        color={(card.vs_7d_pct || 0) > 0 ? 'red' : (card.vs_7d_pct || 0) < 0 ? 'blue' : 'gray'} 
                        variant="light" 
                        size="xs"
                        leftSection={(card.vs_7d_pct || 0) > 0 ? <ArrowUp size={12} /> : (card.vs_7d_pct || 0) < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
                      >
                        {Math.abs(card.vs_7d_pct || 0).toFixed(1)}%
                      </Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">vs 지난 30일</Text>
                      <Badge 
                        color={(card.vs_30d_pct || 0) > 0 ? 'red' : (card.vs_30d_pct || 0) < 0 ? 'blue' : 'gray'} 
                        variant="light" 
                        size="xs"
                        leftSection={(card.vs_30d_pct || 0) > 0 ? <ArrowUp size={12} /> : (card.vs_30d_pct || 0) < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
                      >
                        {Math.abs(card.vs_30d_pct || 0).toFixed(1)}%
                      </Badge>
                    </Group>
                  </Stack>
                </>
              ) : null}
              
              {card.type === 'pending_reply' ? (
                <Tooltip label="최근 300개 리뷰만 분석한 수치입니다" position="top" withArrow>
                  <Box>
                    {card.value === 0 ? (
                      <>
                        <Text size="xl" fw={700}>없음 👏</Text>
                        <Text size="xs" c="dimmed">답글 대기</Text>
                        <Progress value={100} size="sm" color="green" mt="xs" />
                        <Text size="xs" c="green" mt={4}>답글률: 100%</Text>
                      </>
                    ) : (
                      <>
                        <Group gap="xs" align="center">
                          <Text size="xl" fw={700}>{card.value}개</Text>
                          <Text size="xl">
                            {(card.reply_rate || 0) >= 90 ? '👏' : 
                             (card.reply_rate || 0) >= 70 ? '💪' : '😢'}
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed">답글 대기</Text>
                        <Progress value={card.reply_rate || 0} size="sm" color="blue" mt="xs" />
                        <Text size="xs" c="dimmed" mt={4}>답글률: {card.reply_rate?.toFixed(1)}%</Text>
                      </>
                    )}
                  </Box>
                </Tooltip>
              ) : null}
              
              {card.type === 'coupon' ? (
                <>
                  <Group gap="xs" align="center">
                    <Text size="xl" fw={700}>{card.value}개</Text>
                    <Text size="xl">{card.value >= 1 ? '👏' : '😢'}</Text>
                  </Group>
                  <Badge color={card.has_active ? 'green' : 'gray'} variant="light" size="sm">
                    {card.has_active ? '활성' : '비활성'}
                  </Badge>
                </>
              ) : null}
              
              {card.type === 'announcement' ? (
                <>
                  {card.value === 0 ? (
                    <>
                      <Group gap="xs" align="center">
                        <Text size="xl" fw={700}>0개</Text>
                        <Text size="xl">😢</Text>
                      </Group>
                      <Text size="xs" c="dimmed">최근 7일동안 공지사항 없습니다</Text>
                    </>
                  ) : (
                    <>
                      <Group gap="xs" align="center">
                        <Text size="xl" fw={700}>{card.value}개</Text>
                        <Text size="xl">👏</Text>
                      </Group>
                      <Text size="xs" c="dimmed">최근 7일 내</Text>
                      <Badge 
                        color="green" 
                        variant="light" 
                        size="sm"
                      >
                        {card.days_since_last !== undefined && card.days_since_last !== null && card.days_since_last <= 7
                          ? `${card.days_since_last}일 전` 
                          : '최근 업데이트'}
                      </Badge>
                    </>
                  )}
                </>
              ) : null}
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    )
  }

  const renderReviewTrends = () => {
    if (!activationData || !activationData.visitor_review_trends || !activationData.blog_review_trends) return null

    const hasVisitorTrendData = activationData.visitor_review_trends.last_3days_avg > 0
    const hasBlogTrendData = activationData.blog_review_trends.last_3days_avg > 0

    return (
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600} size="lg">방문자 리뷰 추이</Text>
                <ThemeIcon variant="light" size="lg" color="blue">
                  <MessageSquare className="w-5 h-5" />
                </ThemeIcon>
              </Group>
              
              <Divider />
              
              <SimpleGrid cols={2} spacing="xs">
                <Box>
                  <Text size="xs" c="dimmed">지난 3일 일평균</Text>
                  <Text fw={700} size="lg">{(activationData.visitor_review_trends?.last_3days_avg || 0).toFixed(2)}</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed">지난 7일 일평균</Text>
                  <Text fw={600}>{(activationData.visitor_review_trends?.last_7days_avg || 0).toFixed(2)}</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed">지난 30일 일평균</Text>
                  <Text fw={600}>{(activationData.visitor_review_trends?.last_30days_avg || 0).toFixed(2)}</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed">지난 60일 일평균</Text>
                  <Text fw={600}>{(activationData.visitor_review_trends?.last_60days_avg || 0).toFixed(2)}</Text>
                </Box>
              </SimpleGrid>
              
              <Divider />
              
              <Box>
                <Text size="sm" fw={600} mb="xs">지난 3일 일평균 비교</Text>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">vs 지난 7일 일평균</Text>
                    <Group gap={4}>
                      <Text size="sm" fw={600}>
                        {Math.abs((activationData.visitor_review_trends?.last_3days_avg || 0) - (activationData.visitor_review_trends?.last_7days_avg || 0)).toFixed(2)}개
                      </Text>
                      <Text 
                        size="sm" 
                        fw={600}
                        c={
                          (activationData.visitor_review_trends?.comparisons?.vs_last_7days?.change || 0) > 0 ? 'red' :
                          (activationData.visitor_review_trends?.comparisons?.vs_last_7days?.change || 0) < 0 ? 'blue' : 'dimmed'
                        }
                      >
                        ({Math.abs(activationData.visitor_review_trends?.comparisons?.vs_last_7days?.change || 0).toFixed(1)}%)
                      </Text>
                      <Text size="sm" fw={600}>
                        {(activationData.visitor_review_trends?.comparisons?.vs_last_7days?.direction === 'up') ? '👍 높습니다' :
                         (activationData.visitor_review_trends?.comparisons?.vs_last_7days?.direction === 'down') ? '👎 낮습니다' :
                         '➡️ 동일합니다'}
                      </Text>
                    </Group>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">vs 지난 30일 일평균</Text>
                    <Group gap={4}>
                      <Text size="sm" fw={600}>
                        {Math.abs((activationData.visitor_review_trends?.last_3days_avg || 0) - (activationData.visitor_review_trends?.last_30days_avg || 0)).toFixed(2)}개
                      </Text>
                      <Text 
                        size="sm" 
                        fw={600}
                        c={
                          (activationData.visitor_review_trends?.comparisons?.vs_last_30days?.change || 0) > 0 ? 'red' :
                          (activationData.visitor_review_trends?.comparisons?.vs_last_30days?.change || 0) < 0 ? 'blue' : 'dimmed'
                        }
                      >
                        ({Math.abs(activationData.visitor_review_trends?.comparisons?.vs_last_30days?.change || 0).toFixed(1)}%)
                      </Text>
                      <Text size="sm" fw={600}>
                        {(activationData.visitor_review_trends?.comparisons?.vs_last_30days?.direction === 'up') ? '👍 높습니다' :
                         (activationData.visitor_review_trends?.comparisons?.vs_last_30days?.direction === 'down') ? '👎 낮습니다' :
                         '➡️ 동일합니다'}
                      </Text>
                    </Group>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">vs 지난 60일 일평균</Text>
                    <Group gap={4}>
                      <Text size="sm" fw={600}>
                        {Math.abs((activationData.visitor_review_trends?.last_3days_avg || 0) - (activationData.visitor_review_trends?.last_60days_avg || 0)).toFixed(2)}개
                      </Text>
                      <Text 
                        size="sm" 
                        fw={600}
                        c={
                          (activationData.visitor_review_trends?.comparisons?.vs_last_60days?.change || 0) > 0 ? 'red' :
                          (activationData.visitor_review_trends?.comparisons?.vs_last_60days?.change || 0) < 0 ? 'blue' : 'dimmed'
                        }
                      >
                        ({Math.abs(activationData.visitor_review_trends?.comparisons?.vs_last_60days?.change || 0).toFixed(1)}%)
                      </Text>
                      <Text size="sm" fw={600}>
                        {(activationData.visitor_review_trends?.comparisons?.vs_last_60days?.direction === 'up') ? '👍 높습니다' :
                         (activationData.visitor_review_trends?.comparisons?.vs_last_60days?.direction === 'down') ? '👎 낮습니다' :
                         '➡️ 동일합니다'}
                      </Text>
                    </Group>
                  </Group>
                </Stack>
              </Box>
            </Stack>
          </Card>
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600} size="lg">블로그 리뷰 추이</Text>
                <ThemeIcon variant="light" size="lg" color="violet">
                  <FileText className="w-5 h-5" />
                </ThemeIcon>
              </Group>
              
              <Divider />
              
              <SimpleGrid cols={2} spacing="xs">
                <Box>
                  <Text size="xs" c="dimmed">지난 3일 일평균</Text>
                  <Text fw={700} size="lg">{(activationData.blog_review_trends?.last_3days_avg || 0).toFixed(2)}</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed">지난 7일 일평균</Text>
                  <Text fw={600}>{(activationData.blog_review_trends?.last_7days_avg || 0).toFixed(2)}</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed">지난 30일 일평균</Text>
                  <Text fw={600}>{(activationData.blog_review_trends?.last_30days_avg || 0).toFixed(2)}</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed">지난 60일 일평균</Text>
                  <Text fw={600}>{(activationData.blog_review_trends?.last_60days_avg || 0).toFixed(2)}</Text>
                </Box>
              </SimpleGrid>
              
              <Divider />
              
              <Box>
                <Text size="sm" fw={600} mb="xs">지난 3일 일평균 비교</Text>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">vs 지난 7일 일평균</Text>
                    <Group gap={4}>
                      <Text size="sm" fw={600}>
                        {Math.abs((activationData.blog_review_trends?.last_3days_avg || 0) - (activationData.blog_review_trends?.last_7days_avg || 0)).toFixed(2)}개
                      </Text>
                      <Text 
                        size="sm" 
                        fw={600}
                        c={
                          (activationData.blog_review_trends?.comparisons?.vs_last_7days?.change || 0) > 0 ? 'red' :
                          (activationData.blog_review_trends?.comparisons?.vs_last_7days?.change || 0) < 0 ? 'blue' : 'dimmed'
                        }
                      >
                        ({Math.abs(activationData.blog_review_trends?.comparisons?.vs_last_7days?.change || 0).toFixed(1)}%)
                      </Text>
                      <Text size="sm" fw={600}>
                        {(activationData.blog_review_trends?.comparisons?.vs_last_7days?.direction === 'up') ? '👍 높습니다' :
                         (activationData.blog_review_trends?.comparisons?.vs_last_7days?.direction === 'down') ? '👎 낮습니다' :
                         '➡️ 동일합니다'}
                      </Text>
                    </Group>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">vs 지난 30일 일평균</Text>
                    <Group gap={4}>
                      <Text size="sm" fw={600}>
                        {Math.abs((activationData.blog_review_trends?.last_3days_avg || 0) - (activationData.blog_review_trends?.last_30days_avg || 0)).toFixed(2)}개
                      </Text>
                      <Text 
                        size="sm" 
                        fw={600}
                        c={
                          (activationData.blog_review_trends?.comparisons?.vs_last_30days?.change || 0) > 0 ? 'red' :
                          (activationData.blog_review_trends?.comparisons?.vs_last_30days?.change || 0) < 0 ? 'blue' : 'dimmed'
                        }
                      >
                        ({Math.abs(activationData.blog_review_trends?.comparisons?.vs_last_30days?.change || 0).toFixed(1)}%)
                      </Text>
                      <Text size="sm" fw={600}>
                        {(activationData.blog_review_trends?.comparisons?.vs_last_30days?.direction === 'up') ? '👍 높습니다' :
                         (activationData.blog_review_trends?.comparisons?.vs_last_30days?.direction === 'down') ? '👎 낮습니다' :
                         '➡️ 동일합니다'}
                      </Text>
                    </Group>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">vs 지난 60일 일평균</Text>
                    <Group gap={4}>
                      <Text size="sm" fw={600}>
                        {Math.abs((activationData.blog_review_trends?.last_3days_avg || 0) - (activationData.blog_review_trends?.last_60days_avg || 0)).toFixed(2)}개
                      </Text>
                      <Text 
                        size="sm" 
                        fw={600}
                        c={
                          (activationData.blog_review_trends?.comparisons?.vs_last_60days?.change || 0) > 0 ? 'red' :
                          (activationData.blog_review_trends?.comparisons?.vs_last_60days?.change || 0) < 0 ? 'blue' : 'dimmed'
                        }
                      >
                        ({Math.abs(activationData.blog_review_trends?.comparisons?.vs_last_60days?.change || 0).toFixed(1)}%)
                      </Text>
                      <Text size="sm" fw={600}>
                        {(activationData.blog_review_trends?.comparisons?.vs_last_60days?.direction === 'up') ? '👍 높습니다' :
                         (activationData.blog_review_trends?.comparisons?.vs_last_60days?.direction === 'down') ? '👎 낮습니다' :
                         '➡️ 동일합니다'}
                      </Text>
                    </Group>
                  </Group>
                </Stack>
              </Box>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    )
  }

  const renderPendingReply = () => {
    if (!activationData || !activationData.pending_reply_info) return null

    const { pending_reply_info, naver_api_limited } = activationData

    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={600} size="lg">답글 대기 현황</Text>
            <ThemeIcon variant="light" size="lg" color="orange">
              <MessageSquare className="w-5 h-5" />
            </ThemeIcon>
          </Group>
          
          <Divider />
          
          {naver_api_limited ? (
            <Alert icon={<AlertCircle className="w-4 h-4" />} color="yellow" variant="light">
              <Text size="sm" fw={600}>네이버 API 제한</Text>
              <Text size="xs" c="dimmed" mt="xs">
                현재 네이버 API 제한으로 리뷰 정보를 가져올 수 없습니다. "AI 리뷰답글" 메뉴에서 직접 확인해주세요.
              </Text>
              <Button
                size="xs"
                variant="light"
                mt="xs"
                component="a"
                href="/dashboard/naver/reviews/ai-reply"
              >
                AI 리뷰답글 바로가기
              </Button>
            </Alert>
          ) : (
            <>
              {(pending_reply_info?.pending_count || 0) === 0 ? (
                <Alert icon={<CheckCircle className="w-4 h-4" />} color="green" variant="light">
                  <Text size="sm" fw={600}>답글 대기중 리뷰: 없음 👏</Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    모든 리뷰에 답글을 완료했습니다! 훌륭합니다!
                  </Text>
                </Alert>
              ) : (
                <Alert icon={<AlertCircle className="w-4 h-4" />} color="orange" variant="light">
                  <Text size="sm" fw={600}>답글 대기중 리뷰 수: {pending_reply_info?.pending_count || 0}개</Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    최근 300개 리뷰 중 {pending_reply_info?.pending_count || 0}개의 리뷰에 답글이 필요합니다
                  </Text>
                </Alert>
              )}
          
          <Group grow>
            <Box>
              <Text size="xs" c="dimmed">답글 완료</Text>
              <Text fw={600} size="lg">{pending_reply_info?.replied_count || 0}개</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">답글률</Text>
              <Text fw={600} size="lg" c="blue">{(pending_reply_info?.reply_rate || 0).toFixed(1)}%</Text>
            </Box>
          </Group>
          
          <Progress value={pending_reply_info?.reply_rate || 0} size="lg" color="blue" />
          
          {pending_reply_info?.oldest_pending_date && (
            <Text size="xs" c="dimmed">
              가장 오래된 답글 대기 리뷰: {new Date(pending_reply_info.oldest_pending_date).toLocaleDateString('ko-KR')}
            </Text>
          )}
          
          <Button
            fullWidth
            color="blue"
            leftSection={<MessageSquare className="w-4 h-4" />}
            component="a"
            href="/dashboard/naver/reviews/ai-reply"
          >
            AI 답글생성으로 빠르게 업데이트하기
          </Button>
            </>
          )}
        </Stack>
      </Card>
    )
  }

  const renderOtherInfo = () => {
    if (!activationData) return null

    return (
      <Stack gap="md">
        {/* 프로모션/쿠폰 */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600}>프로모션/쿠폰</Text>
              <Badge color={activationData.has_promotion ? 'green' : 'gray'} variant="light">
                {activationData.has_promotion ? `${activationData.promotion_count}개 활성` : '비활성'}
              </Badge>
            </Group>
            
            {activationData.has_promotion && activationData.promotion_items && activationData.promotion_items.length > 0 ? (
              <Stack gap="xs">
                {activationData.promotion_items.map((item, index) => (
                  <Paper key={index} p="sm" withBorder>
                    <Text size="sm" fw={600}>{item.title}</Text>
                    {item.description && <Text size="xs" c="dimmed" mt={4}>{item.description}</Text>}
                    {item.discount && (
                      <Badge color="red" variant="light" size="sm" mt={4}>
                        {item.discount}
                      </Badge>
                    )}
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Alert icon={<AlertCircle className="w-4 h-4" />} color="yellow" variant="light">
                <Text size="sm">쿠폰을 등록하여 고객 유입을 늘려보세요!</Text>
                <Button
                  size="xs"
                  variant="light"
                  mt="xs"
                  rightSection={<ExternalLink className="w-3 h-3" />}
                  component="a"
                  href="https://blog.naver.com/businessinsight/223000000000"
                  target="_blank"
                >
                  쿠폰 등록 가이드
                </Button>
              </Alert>
            )}
          </Stack>
        </Card>

        {/* 공지사항 */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600}>공지사항</Text>
              <Badge 
                color={activationData.days_since_last_announcement && activationData.days_since_last_announcement <= 7 ? 'green' : 'orange'} 
                variant="light"
              >
                {activationData.has_announcement ? `${activationData.announcement_count}개` : '없음'}
              </Badge>
            </Group>
            
            {activationData.has_announcement && activationData.announcement_items && activationData.announcement_items.length > 0 ? (
              <Stack gap="xs">
                {activationData.announcement_items.map((item, index) => (
                  <Paper key={index} p="sm" withBorder>
                    <Group justify="space-between" mb={4}>
                      <Text size="sm" fw={600}>{item.title}</Text>
                      <Badge color="green" variant="light" size="sm">
                        {item.days_ago}일 전
                      </Badge>
                    </Group>
                    {item.content && (
                      <Text size="xs" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                        {item.content}
                      </Text>
                    )}
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Alert icon={<AlertCircle className="w-4 h-4" />} color="yellow" variant="light">
                <Text size="sm">지난 7일간 공지사항이 없습니다. 새로운 소식을 공유해보세요!</Text>
                <Button
                  size="xs"
                  variant="light"
                  mt="xs"
                  rightSection={<ExternalLink className="w-3 h-3" />}
                  component="a"
                  href="https://blog.naver.com/businessinsight/223000000001"
                  target="_blank"
                >
                  공지사항 등록 가이드
                </Button>
              </Alert>
            )}
          </Stack>
        </Card>

        {/* 업체소개글 */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text fw={600}>업체소개글</Text>
            {activationData.description ? (
              <Paper p="sm" withBorder bg="gray.0">
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{activationData.description}</Text>
              </Paper>
            ) : (
              <Text size="sm" c="dimmed">등록된 업체소개글이 없습니다.</Text>
            )}
            <Button
              variant="light"
              color="blue"
              onClick={() => setShowDescriptionModal(true)}
            >
              AI로 완벽한 업체소개글 생성하기
            </Button>
          </Stack>
        </Card>

        {/* 찾아오는길 */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text fw={600}>찾아오는길</Text>
            {activationData.directions ? (
              <Paper p="sm" withBorder bg="gray.0">
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{activationData.directions}</Text>
              </Paper>
            ) : (
              <Text size="sm" c="dimmed">등록된 찾아오는길 정보가 없습니다.</Text>
            )}
            <Button
              variant="light"
              color="blue"
              onClick={() => setShowDirectionsModal(true)}
            >
              AI로 완벽한 찾아오는길 생성
            </Button>
          </Stack>
        </Card>

        {/* SNS 및 웹사이트 */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text fw={600}>SNS 및 웹사이트</Text>
            <SimpleGrid cols={2} spacing="md">
              <Paper p="sm" withBorder>
                <Group justify="space-between">
                  <Group gap="xs" style={{ flex: 1 }}>
                    <ThemeIcon variant="light" size="sm" color="blue">
                      <Globe className="w-3 h-3" />
                    </ThemeIcon>
                    <Box style={{ flex: 1 }}>
                      <Text size="xs" c="dimmed">홈페이지</Text>
                      <Text size="sm" lineClamp={1}>{activationData.homepage || '미등록'}</Text>
                    </Box>
                  </Group>
                  {activationData.homepage ? (
                    <Badge color="green" variant="light" leftSection={<CheckCircle className="w-3 h-3" />}>
                      등록
                    </Badge>
                  ) : (
                    <Badge color="gray" variant="light">
                      미등록
                    </Badge>
                  )}
                </Group>
              </Paper>
              <Paper p="sm" withBorder>
                <Group justify="space-between">
                  <Group gap="xs" style={{ flex: 1 }}>
                    <ThemeIcon variant="light" size="sm" color="pink">
                      <Instagram className="w-3 h-3" />
                    </ThemeIcon>
                    <Box style={{ flex: 1 }}>
                      <Text size="xs" c="dimmed">인스타그램</Text>
                      <Text size="sm" lineClamp={1}>{activationData.instagram || '미등록'}</Text>
                    </Box>
                  </Group>
                  {activationData.instagram ? (
                    <Badge color="green" variant="light" leftSection={<CheckCircle className="w-3 h-3" />}>
                      등록
                    </Badge>
                  ) : (
                    <Badge color="gray" variant="light">
                      미등록
                    </Badge>
                  )}
                </Group>
              </Paper>
              <Paper p="sm" withBorder>
                <Group justify="space-between">
                  <Group gap="xs" style={{ flex: 1 }}>
                    <ThemeIcon variant="light" size="sm" color="indigo">
                      <Facebook className="w-3 h-3" />
                    </ThemeIcon>
                    <Box style={{ flex: 1 }}>
                      <Text size="xs" c="dimmed">페이스북</Text>
                      <Text size="sm" lineClamp={1}>{activationData.facebook || '미등록'}</Text>
                    </Box>
                  </Group>
                  {activationData.facebook ? (
                    <Badge color="green" variant="light" leftSection={<CheckCircle className="w-3 h-3" />}>
                      등록
                    </Badge>
                  ) : (
                    <Badge color="gray" variant="light">
                      미등록
                    </Badge>
                  )}
                </Group>
              </Paper>
              <Paper p="sm" withBorder>
                <Group justify="space-between">
                  <Group gap="xs" style={{ flex: 1 }}>
                    <ThemeIcon variant="light" size="sm" color="green">
                      <BookOpen className="w-3 h-3" />
                    </ThemeIcon>
                    <Box style={{ flex: 1 }}>
                      <Text size="xs" c="dimmed">블로그</Text>
                      <Text size="sm" lineClamp={1}>{activationData.blog || '미등록'}</Text>
                    </Box>
                  </Group>
                  {activationData.blog ? (
                    <Badge color="green" variant="light" leftSection={<CheckCircle className="w-3 h-3" />}>
                      등록
                    </Badge>
                  ) : (
                    <Badge color="gray" variant="light">
                      미등록
                    </Badge>
                  )}
                </Group>
              </Paper>
            </SimpleGrid>
            
            {!activationData.instagram && (
              <Alert icon={<AlertCircle className="w-4 h-4" />} color="blue" variant="light">
                <Text size="sm">인스타그램 공식계정이 있다면, 업체정보에 반드시 추가해주세요!</Text>
              </Alert>
            )}
            
            {!activationData.blog && (
              <Alert icon={<AlertCircle className="w-4 h-4" />} color="blue" variant="light">
                <Text size="sm">현재 운영중인 네이버블로그를 반드시 추가해주세요!</Text>
              </Alert>
            )}
          </Stack>
        </Card>

        {/* 네이버 서비스 */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text fw={600}>네이버 서비스</Text>
            <SimpleGrid cols={2} spacing="md">
              <Paper p="sm" withBorder>
                <Group justify="space-between">
                  <Group gap="xs">
                    <ThemeIcon variant="light" size="sm" color="yellow">
                      <Award className="w-3 h-3" />
                    </ThemeIcon>
                    <Text size="sm">플레이스 플러스</Text>
                  </Group>
                  {activationData.is_place_plus ? (
                    <Badge color="green" variant="light" leftSection={<CheckCircle className="w-3 h-3" />}>
                      사용중
                    </Badge>
                  ) : (
                    <Badge color="gray" variant="light">
                      미사용
                    </Badge>
                  )}
                </Group>
              </Paper>
              <Paper p="sm" withBorder>
                <Group justify="space-between">
                  <Group gap="xs">
                    <ThemeIcon variant="light" size="sm" color="blue">
                      <Phone className="w-3 h-3" />
                    </ThemeIcon>
                    <Text size="sm">스마트콜</Text>
                  </Group>
                  {activationData.has_smart_call ? (
                    <Badge color="green" variant="light" leftSection={<CheckCircle className="w-3 h-3" />}>
                      사용중
                    </Badge>
                  ) : (
                    <Badge color="gray" variant="light">
                      미사용
                    </Badge>
                  )}
                </Group>
              </Paper>
              <Paper p="sm" withBorder>
                <Group justify="space-between">
                  <Group gap="xs">
                    <ThemeIcon variant="light" size="sm" color="green">
                      <CreditCard className="w-3 h-3" />
                    </ThemeIcon>
                    <Text size="sm">네이버페이</Text>
                  </Group>
                  {activationData.has_naver_pay ? (
                    <Badge color="green" variant="light" leftSection={<CheckCircle className="w-3 h-3" />}>
                      사용중
                    </Badge>
                  ) : (
                    <Badge color="gray" variant="light">
                      미사용
                    </Badge>
                  )}
                </Group>
              </Paper>
              <Paper p="sm" withBorder>
                <Group justify="space-between">
                  <Group gap="xs">
                    <ThemeIcon variant="light" size="sm" color="teal">
                      <Calendar className="w-3 h-3" />
                    </ThemeIcon>
                    <Text size="sm">네이버예약</Text>
                  </Group>
                  {activationData.has_naver_booking ? (
                    <Badge color="green" variant="light" leftSection={<CheckCircle className="w-3 h-3" />}>
                      사용중
                    </Badge>
                  ) : (
                    <Badge color="gray" variant="light">
                      미사용
                    </Badge>
                  )}
                </Group>
              </Paper>
              <Paper p="sm" withBorder>
                <Group justify="space-between">
                  <Group gap="xs">
                    <ThemeIcon variant="light" size="sm" color="violet">
                      <MessageCircle className="w-3 h-3" />
                    </ThemeIcon>
                    <Text size="sm">네이버톡톡</Text>
                  </Group>
                  {activationData.has_naver_talk ? (
                    <Badge color="green" variant="light" leftSection={<CheckCircle className="w-3 h-3" />}>
                      사용중
                    </Badge>
                  ) : (
                    <Badge color="gray" variant="light">
                      미사용
                    </Badge>
                  )}
                </Group>
              </Paper>
              <Paper p="sm" withBorder>
                <Group justify="space-between">
                  <Group gap="xs">
                    <ThemeIcon variant="light" size="sm" color="orange">
                      <CreditCard className="w-3 h-3" />
                    </ThemeIcon>
                    <Text size="sm">네이버주문</Text>
                  </Group>
                  {activationData.has_naver_order ? (
                    <Badge color="green" variant="light" leftSection={<CheckCircle className="w-3 h-3" />}>
                      사용중
                    </Badge>
                  ) : (
                    <Badge color="gray" variant="light">
                      미사용
                    </Badge>
                  )}
                </Group>
              </Paper>
            </SimpleGrid>
            
            {(!activationData.has_smart_call || !activationData.has_naver_pay || 
              !activationData.has_naver_booking || !activationData.has_naver_talk || !activationData.has_naver_order) && (
              <Alert icon={<AlertCircle className="w-4 h-4" />} color="yellow" variant="light">
                <Text size="sm" mb="xs">미사용 중인 네이버 서비스가 있습니다.</Text>
                <Group gap="xs">
                  {!activationData.has_smart_call && (
                    <Button size="xs" variant="light" component="a" href="https://smartplace.naver.com" target="_blank">
                      스마트콜 설정
                    </Button>
                  )}
                  {!activationData.has_naver_pay && (
                    <Button size="xs" variant="light" component="a" href="https://pay.naver.com" target="_blank">
                      네이버페이 설정
                    </Button>
                  )}
                  {!activationData.has_naver_booking && (
                    <Button size="xs" variant="light" component="a" href="https://booking.naver.com" target="_blank">
                      네이버예약 설정
                    </Button>
                  )}
                  {!activationData.has_naver_talk && (
                    <Button size="xs" variant="light" component="a" href="https://talk.naver.com" target="_blank">
                      네이버톡톡 설정
                    </Button>
                  )}
                  {!activationData.has_naver_order && (
                    <Button size="xs" variant="light" component="a" href="https://order.store.naver.com" target="_blank">
                      네이버주문 설정
                    </Button>
                  )}
                </Group>
              </Alert>
            )}
          </Stack>
        </Card>
      </Stack>
    )
  }

  if (isLoadingStores) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ minHeight: '60vh' }}>
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text c="dimmed">매장 정보를 불러오는 중...</Text>
          </Stack>
        </Center>
      </Container>
    )
  }

  if (!selectedStore) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="xl">
          <div>
            <Title order={2} mb="xs">플레이스 활성화</Title>
            <Text c="dimmed">매장의 플레이스 활성화 현황을 확인하고 개선하세요</Text>
          </div>

          {stores.length === 0 ? (
            <Alert icon={<AlertCircle className="w-4 h-4" />} color="yellow">
              등록된 네이버 플레이스 매장이 없습니다. 먼저 매장을 등록해주세요.
            </Alert>
          ) : (
            <Grid gutter="xl">
              {stores.map((store) => (
                <Grid.Col key={store.id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                  <Card
                    shadow="sm"
                    padding="md"
                    radius="md"
                    withBorder
                    style={{ 
                      height: '100%', 
                      cursor: 'pointer', 
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = ''
                    }}
                    onClick={() => handleStoreSelect(store)}
                  >
                    {store.thumbnail ? (
                      <Card.Section>
                        <div style={{ position: 'relative', width: '100%', paddingTop: '66.67%' }}>
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
                          paddingTop: '66.67%',
                          position: 'relative'
                        }}>
                          <Center style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%'
                          }}>
                            <Store size={48} color="#635bff" />
                          </Center>
                        </div>
                      </Card.Section>
                    )}

                    <Stack gap="xs" mt="md" style={{ textAlign: 'center' }}>
                      <Text fw={600} size="md" lineClamp={1}>{store.name}</Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>{store.category}</Text>
                      <Text size="xs" c="dimmed" lineClamp={2}>{store.address}</Text>
                    </Stack>

                    <Button
                      fullWidth
                      color="#635bff"
                      mt="md"
                      size="sm"
                    >
                      활성화 현황 보기
                    </Button>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          )}
        </Stack>
      </Container>
    )
  }

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ minHeight: '60vh' }}>
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text c="dimmed">플레이스 활성화 정보를 분석하는 중...</Text>
          </Stack>
        </Center>
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* 헤더 */}
        <Group justify="space-between">
          <Group>
            {activationData?.thumbnail && (
              <img 
                src={activationData.thumbnail} 
                alt={activationData.store_name}
                style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
              />
            )}
            <div>
              <Title order={2}>{activationData?.store_name}</Title>
              <Text size="sm" c="dimmed">플레이스 ID: {activationData?.place_id}</Text>
            </div>
          </Group>
          <Button variant="light" onClick={() => setSelectedStore(null)}>
            다른 매장 선택
          </Button>
        </Group>

        {/* 활성화 요약 */}
        <div>
          <Title order={3} mb="md">활성화 요약</Title>
          {renderSummaryCards()}
        </div>

        {/* 과거 활성화 이력 */}
        {activationHistories.length > 0 && (
          <Paper shadow="xs" p="md" radius="md" withBorder>
            <Title order={4} mb="md">📜 과거 활성화 이력</Title>
            <Stack gap="xs">
              {activationHistories.map((history: any) => (
                <Paper
                  key={history.id}
                  p="sm"
                  radius="md"
                  withBorder
                  style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                  }}
                  onClick={() => {
                    if (expandedHistoryId === history.id) {
                      setExpandedHistoryId(null)
                    } else {
                      setExpandedHistoryId(history.id)
                    }
                  }}
                >
                  <Group justify="space-between">
                    <Group gap="xs">
                      <Badge color="blue" variant="light">
                        {new Date(history.created_at).toLocaleDateString('ko-KR')}
                      </Badge>
                      <Text size="sm" fw={500}>
                        {new Date(history.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </Group>
                    <ActionIcon variant="subtle" size="sm">
                      {expandedHistoryId === history.id ? '▲' : '▼'}
                    </ActionIcon>
                  </Group>

                  {expandedHistoryId === history.id && history.summary_cards && (
                    <Stack gap="xs" mt="md" pt="md" style={{ borderTop: '1px solid #e9ecef' }}>
                      {history.summary_cards.map((card: any) => (
                        <Paper key={card.type} p="xs" radius="md" withBorder bg="gray.0">
                          <Group justify="space-between">
                            <Text size="sm" fw={500}>{card.title}</Text>
                            <Group gap={4} wrap="nowrap">
                              <Text size="sm" fw={700}>
                                {card.type === 'visitor_review' || card.type === 'blog_review'
                                  ? (card.value % 1 === 0 ? Math.round(card.value) : card.value.toFixed(1))
                                  : Math.round(card.value)
                                }
                              </Text>
                              <Text size="xs" c="dimmed">개</Text>
                            </Group>
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Paper>
              ))}
            </Stack>
          </Paper>
        )}

        {/* 리뷰 추이 현황 */}
        <div>
          <Title order={3} mb="md">리뷰 추이 현황</Title>
          {renderReviewTrends()}
        </div>

        {/* 답글 대기 */}
        <div>
          <Title order={3} mb="md">답글 대기</Title>
          {renderPendingReply()}
        </div>

        {/* 기타 정보 */}
        <div>
          <Title order={3} mb="md">플레이스 정보</Title>
          {renderOtherInfo()}
        </div>
      </Stack>

      {/* 업체소개글 생성 모달 */}
      <Modal
        opened={showDescriptionModal}
        onClose={() => {
          setShowDescriptionModal(false)
          setRegionKeyword('')
          setLandmarkKeywords('')
          setBusinessTypeKeyword('')
          setProductKeywords('')
          setStoreFeatures('')
          setGeneratedText('')
        }}
        title="AI로 완벽한 업체소개글 생성하기"
        size="xl"
      >
        <Stack gap="md">
          <Alert color="blue" variant="light">
            <Text size="sm">
              SEO 최적화된 업체소개글을 생성합니다. 모든 필드를 입력하면 더 정확한 결과를 얻을 수 있습니다.
            </Text>
          </Alert>
          
          <TextInput
            label="1. 지역 키워드"
            placeholder="예: 합정, 종로, 성수 등"
            description="가장 메인 지역 1개만 입력"
            value={regionKeyword}
            onChange={(e) => setRegionKeyword(e.target.value)}
            required
          />
          
          <TextInput
            label="2. 랜드마크 키워드"
            placeholder="예: 합정역, 홍대입구역, 성수역 등"
            description="역, 상권, 건물, 관광지 등 (최대 2개, 쉼표로 구분)"
            value={landmarkKeywords}
            onChange={(e) => setLandmarkKeywords(e.target.value)}
          />
          
          <TextInput
            label="3. 업종 키워드"
            placeholder="예: 카페, 식당, 사진관, 헤어샵 등"
            description="업종 1개만 입력"
            value={businessTypeKeyword}
            onChange={(e) => setBusinessTypeKeyword(e.target.value)}
            required
          />
          
          <TextInput
            label="4. 상품/서비스 키워드"
            placeholder="예: 칼국수, 보쌈, 커피, 콜드브루 등"
            description="최대 3개 (쉼표로 구분)"
            value={productKeywords}
            onChange={(e) => setProductKeywords(e.target.value)}
          />
          
          <Textarea
            label="5. 매장 특색 및 강점, 우리 매장을 꼭 방문해야 하는 이유"
            placeholder="예: 저희 매장은 처음 방문하시는 분들도 부담 없이 이용할 수 있도록 공간 동선과 서비스 흐름을 단순하고 편안하게 구성했습니다..."
            description="매장의 특별한 점, 강점, 차별화 포인트를 자유롭게 입력해주세요"
            value={storeFeatures}
            onChange={(e) => setStoreFeatures(e.target.value)}
            minRows={5}
            required
          />
          
          <Button
            onClick={async () => {
              setIsGenerating(true)
              try {
                const token = getToken()
                
                // 랜드마크와 상품 키워드를 배열로 변환
                const landmarks = landmarkKeywords.split(',').map(k => k.trim()).filter(k => k)
                const products = productKeywords.split(',').map(k => k.trim()).filter(k => k)
                
                const response = await fetch(api.naver.generateDescription(), {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    store_id: selectedStore?.id,
                    region_keyword: regionKeyword,
                    landmark_keywords: landmarks,
                    business_type_keyword: businessTypeKeyword,
                    product_keywords: products,
                    store_features: storeFeatures
                  })
                })
                
                if (!response.ok) throw new Error('생성 실패')
                
                const data = await response.json()
                setGeneratedText(data.generated_text)
                setGeneratedTextCharCount(data.generated_text.length)
                
                toast({
                  title: "✅ 생성 완료",
                  description: "업체소개글이 성공적으로 생성되었습니다!",
                })
              } catch (error) {
                toast({
                  variant: "destructive",
                  title: "❌ 오류",
                  description: "업체소개글 생성에 실패했습니다.",
                })
              } finally {
                setIsGenerating(false)
              }
            }}
            loading={isGenerating}
            disabled={!regionKeyword.trim() || !businessTypeKeyword.trim() || !storeFeatures.trim()}
            fullWidth
            size="lg"
          >
            AI로 업체소개글 생성하기
          </Button>
          
          {generatedText && (
            <Paper p="md" withBorder bg="gray.0">
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <Text size="sm" fw={600}>생성된 업체소개글:</Text>
                  <Group gap="xs">
                    <Badge color="blue" variant="light">
                      {generatedText.length}자
                    </Badge>
                    <Button
                      variant="subtle"
                      size="xs"
                      leftSection={<Copy className="w-3 h-3" />}
                      onClick={() => {
                        navigator.clipboard.writeText(generatedText)
                        toast({
                          title: "✅ 복사 완료",
                          description: "클립보드에 복사되었습니다!",
                        })
                      }}
                    >
                      복사
                    </Button>
                  </Group>
                </Group>
                <Divider />
                <Paper p="sm" withBorder bg="white">
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                    {generatedText}
                  </Text>
                </Paper>
                <Button
                  fullWidth
                  size="md"
                  leftSection={<Copy className="w-4 h-4" />}
                  onClick={() => {
                    navigator.clipboard.writeText(generatedText)
                    toast({
                      title: "✅ 복사 완료",
                      description: "클립보드에 복사되었습니다!",
                    })
                  }}
                >
                  클립보드에 복사하기
                </Button>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Modal>

      {/* 찾아오는길 생성 모달 */}
      <Modal
        opened={showDirectionsModal}
        onClose={() => {
          setShowDirectionsModal(false)
          setDirectionsPrompt('')
          setDirectionsRegionKeyword('')
          setDirectionsLandmarkKeywords('')
          setDirectionsDescription('')
          setGeneratedDirectionsText('')
          setGeneratedDirectionsCharCount(0)
        }}
        title="AI로 완벽한 찾아오는길 생성"
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="1. 지역 키워드 (필수)"
            placeholder="예: 합정, 종로, 성수"
            description="매장의 가장 메인 지역 키워드 1개를 입력해주세요."
            value={directionsRegionKeyword}
            onChange={(event) => setDirectionsRegionKeyword(event.currentTarget.value)}
            required
          />
          <TextInput
            label="2. 랜드마크 키워드 (선택)"
            placeholder="예: 합정역, 홍대입구역, 메세나폴리스 (쉼표로 구분)"
            description="매장 주변의 주요 랜드마크 키워드를 입력해주세요."
            value={directionsLandmarkKeywords}
            onChange={(event) => setDirectionsLandmarkKeywords(event.currentTarget.value)}
          />
          <Textarea
            label="3. 찾아오는 길 설명 (필수)"
            placeholder="예: 합정역 7번 출구에서 직진 200m, GS25 편의점 옆 건물 2층입니다. 주차는 건물 지하 1층에 가능하며, 방문 시 건물 입구에서 연락주시면 안내해드립니다."
            description="매장까지 오는 길을 자유롭게 상세하게 설명해주세요."
            value={directionsDescription}
            onChange={(event) => setDirectionsDescription(event.currentTarget.value)}
            minRows={5}
            required
          />
          <Button
            onClick={async () => {
              setIsGenerating(true)
              setGeneratedDirectionsText('')
              setGeneratedDirectionsCharCount(0)
              try {
                const token = getToken()
                const response = await fetch(api.naver.generateDirections(), {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    store_id: selectedStore?.id,
                    region_keyword: directionsRegionKeyword,
                    landmark_keywords: directionsLandmarkKeywords.split(',').map(k => k.trim()).filter(Boolean),
                    directions_description: directionsDescription,
                  })
                })
                
                if (!response.ok) throw new Error('생성 실패')
                
                const data = await response.json()
                setGeneratedDirectionsText(data.generated_text)
                setGeneratedDirectionsCharCount(data.generated_text.length)
              } catch (error) {
                console.error("Error generating directions:", error)
                toast({
                  variant: "destructive",
                  title: "❌ 오류",
                  description: "찾아오는길 생성에 실패했습니다.",
                })
              } finally {
                setIsGenerating(false)
              }
            }}
            loading={isGenerating}
            disabled={!directionsRegionKeyword.trim() || !directionsDescription.trim()}
          >
            생성하기
          </Button>
          
          {generatedDirectionsText && (
            <Paper p="md" withBorder>
              <Group justify="space-between" align="center" mb="xs">
                <Text size="sm" fw={600}>생성된 찾아오는길: ({generatedDirectionsCharCount}자)</Text>
                <ActionIcon variant="subtle" color="gray" onClick={() => copyToClipboard(generatedDirectionsText)}>
                  <Copy size={16} />
                </ActionIcon>
              </Group>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{generatedDirectionsText}</Text>
              <Button
                fullWidth
                mt="md"
                leftSection={<Copy size={16} />}
                onClick={() => copyToClipboard(generatedDirectionsText)}
              >
                클립보드에 복사하기
              </Button>
            </Paper>
          )}
        </Stack>
      </Modal>
    </Container>
  )
}
