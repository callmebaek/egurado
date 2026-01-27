'use client'

import { useState, useEffect } from 'react'
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
  Tooltip
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
  ExternalLink
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
}

export default function ActivationPage() {
  const { user, getToken } = useAuth()
  const { toast } = useToast()
  
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

      const response = await fetch(api.naver.activation(store.id), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error("플레이스 활성화 정보 조회에 실패했습니다.")
      }

      const data = await response.json()
      setActivationData(data.data) // API 응답의 data 필드만 추출
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
                  <Text size="xl" fw={700}>{card.value.toFixed(2)}</Text>
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
                        <Text size="xl" fw={700}>{card.value}개</Text>
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
                  <Text size="xl" fw={700}>{card.value}개</Text>
                  <Badge color={card.has_active ? 'green' : 'gray'} variant="light" size="sm">
                    {card.has_active ? '활성' : '비활성'}
                  </Badge>
                </>
              ) : null}
              
              {card.type === 'announcement' ? (
                <>
                  <Text size="xl" fw={700}>{card.value}개</Text>
                  <Text size="xs" c="dimmed">최근 7일 내</Text>
                  <Badge 
                    color={card.value > 0 ? 'green' : 'orange'} 
                    variant="light" 
                    size="sm"
                  >
                    {card.days_since_last !== undefined && card.days_since_last !== null && card.days_since_last <= 7
                      ? `${card.days_since_last}일 전` 
                      : card.value > 0 
                        ? '최근 업데이트' 
                        : `${card.days_since_last || 999}일 전`}
                  </Badge>
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
                    <Text size="xs" c="dimmed">지난 7일 일평균 대비</Text>
                    <Text size="sm" fw={600}>
                      {activationData.visitor_review_trends?.comparisons?.vs_last_7days?.change.toFixed(2) || '0.00'} ({activationData.visitor_review_trends?.comparisons?.vs_last_7days?.change.toFixed(1) || '0.0'}%) {
                        (activationData.visitor_review_trends?.comparisons?.vs_last_7days?.direction === 'up') ? '높습니다' :
                        (activationData.visitor_review_trends?.comparisons?.vs_last_7days?.direction === 'down') ? '낮습니다' :
                        '동일합니다'
                      }
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">지난 30일 일평균 대비</Text>
                    <Text size="sm" fw={600}>
                      {activationData.visitor_review_trends?.comparisons?.vs_last_30days?.change.toFixed(2) || '0.00'} ({activationData.visitor_review_trends?.comparisons?.vs_last_30days?.change.toFixed(1) || '0.0'}%) {
                        (activationData.visitor_review_trends?.comparisons?.vs_last_30days?.direction === 'up') ? '높습니다' :
                        (activationData.visitor_review_trends?.comparisons?.vs_last_30days?.direction === 'down') ? '낮습니다' :
                        '동일합니다'
                      }
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">지난 60일 일평균 대비</Text>
                    <Text size="sm" fw={600}>
                      {activationData.visitor_review_trends?.comparisons?.vs_last_60days?.change.toFixed(2) || '0.00'} ({activationData.visitor_review_trends?.comparisons?.vs_last_60days?.change.toFixed(1) || '0.0'}%) {
                        (activationData.visitor_review_trends?.comparisons?.vs_last_60days?.direction === 'up') ? '높습니다' :
                        (activationData.visitor_review_trends?.comparisons?.vs_last_60days?.direction === 'down') ? '낮습니다' :
                        '동일합니다'
                      }
                    </Text>
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
                    <Text size="xs" c="dimmed">지난 7일 일평균 대비</Text>
                    <Text size="sm" fw={600}>
                      {activationData.blog_review_trends?.comparisons?.vs_last_7days?.change.toFixed(2) || '0.00'} ({activationData.blog_review_trends?.comparisons?.vs_last_7days?.change.toFixed(1) || '0.0'}%) {
                        (activationData.blog_review_trends?.comparisons?.vs_last_7days?.direction === 'up') ? '높습니다' :
                        (activationData.blog_review_trends?.comparisons?.vs_last_7days?.direction === 'down') ? '낮습니다' :
                        '동일합니다'
                      }
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">지난 30일 일평균 대비</Text>
                    <Text size="sm" fw={600}>
                      {activationData.blog_review_trends?.comparisons?.vs_last_30days?.change.toFixed(2) || '0.00'} ({activationData.blog_review_trends?.comparisons?.vs_last_30days?.change.toFixed(1) || '0.0'}%) {
                        (activationData.blog_review_trends?.comparisons?.vs_last_30days?.direction === 'up') ? '높습니다' :
                        (activationData.blog_review_trends?.comparisons?.vs_last_30days?.direction === 'down') ? '낮습니다' :
                        '동일합니다'
                      }
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">지난 60일 일평균 대비</Text>
                    <Text size="sm" fw={600}>
                      {activationData.blog_review_trends?.comparisons?.vs_last_60days?.change.toFixed(2) || '0.00'} ({activationData.blog_review_trends?.comparisons?.vs_last_60days?.change.toFixed(1) || '0.0'}%) {
                        (activationData.blog_review_trends?.comparisons?.vs_last_60days?.direction === 'up') ? '높습니다' :
                        (activationData.blog_review_trends?.comparisons?.vs_last_60days?.direction === 'down') ? '낮습니다' :
                        '동일합니다'
                      }
                    </Text>
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
              SEO 최적화하여 생성하기
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
              SEO 최적화하여 생성하기
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
                  <Box style={{ flex: 1 }}>
                    <Text size="xs" c="dimmed">홈페이지</Text>
                    <Text size="sm" lineClamp={1}>{activationData.homepage || '미등록'}</Text>
                  </Box>
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
                  <Box style={{ flex: 1 }}>
                    <Text size="xs" c="dimmed">인스타그램</Text>
                    <Text size="sm" lineClamp={1}>{activationData.instagram || '미등록'}</Text>
                  </Box>
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
                  <Box style={{ flex: 1 }}>
                    <Text size="xs" c="dimmed">페이스북</Text>
                    <Text size="sm" lineClamp={1}>{activationData.facebook || '미등록'}</Text>
                  </Box>
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
                  <Box style={{ flex: 1 }}>
                    <Text size="xs" c="dimmed">블로그</Text>
                    <Text size="sm" lineClamp={1}>{activationData.blog || '미등록'}</Text>
                  </Box>
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
                  <Text size="sm">플레이스 플러스</Text>
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
                  <Text size="sm">스마트콜</Text>
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
                  <Text size="sm">네이버페이</Text>
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
                  <Text size="sm">네이버예약</Text>
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
                  <Text size="sm">네이버톡톡</Text>
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
            </SimpleGrid>
            
            {(!activationData.has_smart_call || !activationData.has_naver_pay || 
              !activationData.has_naver_booking || !activationData.has_naver_talk) && (
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
          setDescriptionPrompt('')
          setGeneratedText('')
        }}
        title="업체소개글 SEO 최적화 생성"
        size="lg"
      >
        <Stack gap="md">
          <Textarea
            label="프롬프트 입력"
            placeholder="예: 강남역 근처 프리미엄 카페, 조용한 분위기, 디저트 맛집"
            value={descriptionPrompt}
            onChange={(e) => setDescriptionPrompt(e.target.value)}
            minRows={3}
          />
          <Button
            onClick={async () => {
              setIsGenerating(true)
              try {
                const token = getToken()
                const response = await fetch(api.naver.generateDescription(), {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    store_id: selectedStore?.id,
                    prompt: descriptionPrompt
                  })
                })
                
                if (!response.ok) throw new Error('생성 실패')
                
                const data = await response.json()
                setGeneratedText(data.generated_text)
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
            disabled={!descriptionPrompt.trim()}
          >
            생성하기
          </Button>
          
          {generatedText && (
            <Paper p="md" withBorder>
              <Text size="sm" fw={600} mb="xs">생성된 업체소개글:</Text>
              <Text size="sm">{generatedText}</Text>
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
          setGeneratedText('')
        }}
        title="찾아오는길 SEO 최적화 생성"
        size="lg"
      >
        <Stack gap="md">
          <Textarea
            label="프롬프트 입력"
            placeholder="예: 강남역 10번 출구에서 도보 5분, 스타벅스 건물 2층"
            value={directionsPrompt}
            onChange={(e) => setDirectionsPrompt(e.target.value)}
            minRows={3}
          />
          <Button
            onClick={async () => {
              setIsGenerating(true)
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
                    prompt: directionsPrompt
                  })
                })
                
                if (!response.ok) throw new Error('생성 실패')
                
                const data = await response.json()
                setGeneratedText(data.generated_text)
              } catch (error) {
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
            disabled={!directionsPrompt.trim()}
          >
            생성하기
          </Button>
          
          {generatedText && (
            <Paper p="md" withBorder>
              <Text size="sm" fw={600} mb="xs">생성된 찾아오는길:</Text>
              <Text size="sm">{generatedText}</Text>
            </Paper>
          )}
        </Stack>
      </Modal>
    </Container>
  )
}
