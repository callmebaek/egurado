"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Loader2, AlertCircle, CheckCircle2, MessageSquare, FileText, Users, Calendar, ExternalLink, Sparkles, ArrowRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/config"
import {
  Paper,
  Card,
  Badge,
  Progress,
  Table,
  Modal,
  Grid,
  Group,
  Stack,
  Title,
  Text,
  Button,
  Select,
  Container,
  Divider,
  ThemeIcon,
  Box,
  Center,
  Loader,
  Textarea,
  ActionIcon,
  Tooltip,
  Alert,
} from '@mantine/core'
import '@mantine/core/styles.css'
import { useStores } from "@/lib/hooks/useStores"

interface Store {
  id: string
  place_id: string
  store_name: string
  category: string
  address: string
  thumbnail?: string
}

interface ActivationData {
  store_name: string
  place_id: string
  
  // 리뷰 관련
  visitor_review_count: number
  visitor_review_trend_30d: {
    average: number
    change_percentage: number
    direction: 'up' | 'down' | 'stable'
  }
  visitor_review_trend_7d: {
    average: number
    change_percentage: number
    direction: 'up' | 'down' | 'stable'
  }
  
  pending_reply_count: number
  oldest_pending_review_date?: string
  
  blog_review_count: number
  blog_review_trend_30d: {
    average: number
    change_percentage: number
    direction: 'up' | 'down' | 'stable'
  }
  blog_review_trend_7d: {
    average: number
    change_percentage: number
    direction: 'up' | 'down' | 'stable'
  }
  
  // 플레이스 정보
  has_promotion: boolean
  promotion_count: number
  
  has_announcement: boolean
  announcement_count: number
  last_announcement_date?: string
  days_since_last_announcement?: number
  
  description?: string
  directions?: string
  
  // SNS 및 웹사이트
  homepage?: string
  instagram?: string
  facebook?: string
  blog?: string
  
  // 네이버 서비스
  has_smart_call: boolean
  has_naver_pay: boolean
  has_naver_booking: boolean
  has_naver_talk: boolean
  
  // 요약 정보
  issues: Array<{
    category: string
    severity: 'high' | 'medium' | 'low'
    message: string
    action?: string
  }>
}

export default function ActivationPage() {
  const { toast } = useToast()
  const { user, getToken } = useAuth()
  const { stores, hasStores, isLoading: storesLoading } = useStores()
  
  const [selectedStoreId, setSelectedStoreId] = useState<string>("")
  const [activationData, setActivationData] = useState<ActivationData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // LLM 생성 관련
  const [showDescriptionModal, setShowDescriptionModal] = useState(false)
  const [showDirectionsModal, setShowDirectionsModal] = useState(false)
  const [descriptionPrompt, setDescriptionPrompt] = useState("")
  const [directionsPrompt, setDirectionsPrompt] = useState("")
  const [generatedDescription, setGeneratedDescription] = useState("")
  const [generatedDirections, setGeneratedDirections] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  // 활성화 정보 조회
  const loadActivationData = async (storeId: string) => {
    if (!storeId) return
    
    setIsLoading(true)
    setError(null)
    setActivationData(null)
    
    try {
      const token = getToken()
      const response = await fetch(api.naver.activation(storeId), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (!response.ok) {
        throw new Error('활성화 정보를 불러오는데 실패했습니다')
      }
      
      const data = await response.json()
      setActivationData(data.data)
      
    } catch (err: any) {
      console.error('활성화 정보 조회 실패:', err)
      setError(err.message || '활성화 정보를 불러오는데 실패했습니다')
      toast({
        title: "오류",
        description: err.message || '활성화 정보를 불러오는데 실패했습니다',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 매장 선택 시
  const handleStoreChange = (value: string | null) => {
    if (value) {
      setSelectedStoreId(value)
      loadActivationData(value)
    }
  }

  // 업체소개글 생성
  const handleGenerateDescription = async () => {
    if (!descriptionPrompt.trim()) {
      toast({
        title: "입력 필요",
        description: "프롬프트를 입력해주세요",
        variant: "destructive",
      })
      return
    }
    
    setIsGenerating(true)
    try {
      const token = getToken()
      const response = await fetch(api.naver.generateDescription(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          store_id: selectedStoreId,
          prompt: descriptionPrompt,
        }),
      })
      
      if (!response.ok) {
        throw new Error('업체소개글 생성에 실패했습니다')
      }
      
      const data = await response.json()
      setGeneratedDescription(data.generated_text)
      
      toast({
        title: "생성 완료",
        description: "업체소개글이 생성되었습니다",
      })
      
    } catch (err: any) {
      console.error('업체소개글 생성 실패:', err)
      toast({
        title: "오류",
        description: err.message || '업체소개글 생성에 실패했습니다',
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // 찾아오는길 생성
  const handleGenerateDirections = async () => {
    if (!directionsPrompt.trim()) {
      toast({
        title: "입력 필요",
        description: "프롬프트를 입력해주세요",
        variant: "destructive",
      })
      return
    }
    
    setIsGenerating(true)
    try {
      const token = getToken()
      const response = await fetch(api.naver.generateDirections(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          store_id: selectedStoreId,
          prompt: directionsPrompt,
        }),
      })
      
      if (!response.ok) {
        throw new Error('찾아오는길 생성에 실패했습니다')
      }
      
      const data = await response.json()
      setGeneratedDirections(data.generated_text)
      
      toast({
        title: "생성 완료",
        description: "찾아오는길이 생성되었습니다",
      })
      
    } catch (err: any) {
      console.error('찾아오는길 생성 실패:', err)
      toast({
        title: "오류",
        description: err.message || '찾아오는길 생성에 실패했습니다',
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // 트렌드 아이콘 렌더링
  const renderTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    if (direction === 'up') {
      return <TrendingUp className="w-4 h-4 text-blue-600" />
    } else if (direction === 'down') {
      return <TrendingDown className="w-4 h-4 text-red-600" />
    }
    return <span className="text-gray-400">-</span>
  }

  // 트렌드 색상
  const getTrendColor = (direction: 'up' | 'down' | 'stable') => {
    if (direction === 'up') return 'blue'
    if (direction === 'down') return 'red'
    return 'gray'
  }

  if (storesLoading) {
    return (
      <Container size="xl" py="xl">
        <Center style={{ minHeight: '60vh' }}>
          <Stack align="center" gap="md">
            <Loader size="xl" />
            <Text c="dimmed">매장 정보를 불러오는 중...</Text>
          </Stack>
        </Center>
      </Container>
    )
  }

  if (!hasStores) {
    return (
      <Container size="xl" py="xl">
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Stack align="center" gap="md">
            <ThemeIcon size={64} radius="md" variant="light" color="gray">
              <AlertCircle className="w-8 h-8" />
            </ThemeIcon>
            <Title order={3}>등록된 매장이 없습니다</Title>
            <Text c="dimmed" ta="center">
              플레이스 활성화 기능을 사용하려면 먼저 매장을 등록해주세요.
            </Text>
            <Button component="a" href="/dashboard/connect-store">
              매장 등록하기
            </Button>
          </Stack>
        </Card>
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* 헤더 */}
        <Box>
          <Title order={1} mb="xs">플레이스 활성화</Title>
          <Text c="dimmed">
            플레이스 진단 결과를 기반으로 매장의 활성화 상태를 추적하고 개선 방안을 제시합니다.
          </Text>
        </Box>

        {/* 매장 선택 */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Select
            label="매장 선택"
            placeholder="활성화 정보를 확인할 매장을 선택하세요"
            data={stores.map(store => ({
              value: store.id,
              label: store.store_name || store.place_id,
            }))}
            value={selectedStoreId}
            onChange={handleStoreChange}
            size="md"
            searchable
          />
        </Card>

        {/* 로딩 상태 */}
        {isLoading && (
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Center>
              <Stack align="center" gap="md">
                <Loader size="lg" />
                <Text c="dimmed">활성화 정보를 불러오는 중...</Text>
              </Stack>
            </Center>
          </Card>
        )}

        {/* 에러 상태 */}
        {error && !isLoading && (
          <Alert icon={<AlertCircle className="w-4 h-4" />} title="오류" color="red">
            {error}
          </Alert>
        )}

        {/* 활성화 정보 표시 */}
        {activationData && !isLoading && (
          <>
            {/* 요약 카드 - 부족한 내용 우선 표시 */}
            {activationData.issues && activationData.issues.length > 0 && (
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={3} mb="md">⚠️ 개선이 필요한 항목</Title>
                <Stack gap="sm">
                  {activationData.issues.map((issue, index) => (
                    <Alert
                      key={index}
                      icon={<AlertCircle className="w-4 h-4" />}
                      title={issue.category}
                      color={issue.severity === 'high' ? 'red' : issue.severity === 'medium' ? 'yellow' : 'blue'}
                    >
                      <Text size="sm">{issue.message}</Text>
                      {issue.action && (
                        <Text size="sm" mt="xs" c="dimmed">
                          💡 {issue.action}
                        </Text>
                      )}
                    </Alert>
                  ))}
                </Stack>
              </Card>
            )}

            {/* 기본 정보 */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="apart" mb="md">
                <div>
                  <Title order={2}>{activationData.store_name}</Title>
                  <Text c="dimmed" size="sm">플레이스 ID: {activationData.place_id}</Text>
                </div>
              </Group>
            </Card>

            {/* 리뷰 추이 분석 */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={3} mb="md">📊 리뷰 추이 분석</Title>
              
              <Grid>
                {/* 방문자 리뷰 */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder>
                    <Group justify="apart" mb="xs">
                      <Text fw={600}>방문자 리뷰</Text>
                      <Badge size="lg" color="blue">{activationData.visitor_review_count}개</Badge>
                    </Group>
                    
                    <Divider my="sm" />
                    
                    <Stack gap="xs">
                      <Group justify="apart">
                        <Text size="sm" c="dimmed">최근 30일 평균</Text>
                        <Group gap="xs">
                          {renderTrendIcon(activationData.visitor_review_trend_30d.direction)}
                          <Badge color={getTrendColor(activationData.visitor_review_trend_30d.direction)}>
                            {activationData.visitor_review_trend_30d.change_percentage > 0 ? '+' : ''}
                            {activationData.visitor_review_trend_30d.change_percentage.toFixed(1)}%
                          </Badge>
                        </Group>
                      </Group>
                      
                      <Group justify="apart">
                        <Text size="sm" c="dimmed">최근 7일 평균</Text>
                        <Group gap="xs">
                          {renderTrendIcon(activationData.visitor_review_trend_7d.direction)}
                          <Badge color={getTrendColor(activationData.visitor_review_trend_7d.direction)}>
                            {activationData.visitor_review_trend_7d.change_percentage > 0 ? '+' : ''}
                            {activationData.visitor_review_trend_7d.change_percentage.toFixed(1)}%
                          </Badge>
                        </Group>
                      </Group>
                    </Stack>
                  </Paper>
                </Grid.Col>

                {/* 블로그 리뷰 */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" withBorder>
                    <Group justify="apart" mb="xs">
                      <Text fw={600}>블로그 리뷰</Text>
                      <Badge size="lg" color="green">{activationData.blog_review_count}개</Badge>
                    </Group>
                    
                    <Divider my="sm" />
                    
                    <Stack gap="xs">
                      <Group justify="apart">
                        <Text size="sm" c="dimmed">최근 30일 평균</Text>
                        <Group gap="xs">
                          {renderTrendIcon(activationData.blog_review_trend_30d.direction)}
                          <Badge color={getTrendColor(activationData.blog_review_trend_30d.direction)}>
                            {activationData.blog_review_trend_30d.change_percentage > 0 ? '+' : ''}
                            {activationData.blog_review_trend_30d.change_percentage.toFixed(1)}%
                          </Badge>
                        </Group>
                      </Group>
                      
                      <Group justify="apart">
                        <Text size="sm" c="dimmed">최근 7일 평균</Text>
                        <Group gap="xs">
                          {renderTrendIcon(activationData.blog_review_trend_7d.direction)}
                          <Badge color={getTrendColor(activationData.blog_review_trend_7d.direction)}>
                            {activationData.blog_review_trend_7d.change_percentage > 0 ? '+' : ''}
                            {activationData.blog_review_trend_7d.change_percentage.toFixed(1)}%
                          </Badge>
                        </Group>
                      </Group>
                    </Stack>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Card>

            {/* 답글 대기 */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="apart" mb="md">
                <Title order={3}>💬 답글 대기</Title>
                <Badge size="lg" color={activationData.pending_reply_count > 0 ? 'red' : 'green'}>
                  {activationData.pending_reply_count}개
                </Badge>
              </Group>
              
              {activationData.pending_reply_count > 0 ? (
                <>
                  <Text size="sm" c="dimmed" mb="md">
                    최근 300개 리뷰 기준 {activationData.pending_reply_count}개의 답글이 대기 중입니다.
                    {activationData.oldest_pending_review_date && (
                      <> 가장 오래된 답글 대기 글은 {activationData.oldest_pending_review_date}에 작성되었습니다.</>
                    )}
                  </Text>
                  
                  <Alert icon={<MessageSquare className="w-4 h-4" />} color="blue">
                    <Text size="sm" fw={500}>AI 답글생성을 이용해서 빠르게 업데이트 해보세요!</Text>
                    <Button
                      component="a"
                      href="/dashboard/naver/reviews/ai-reply"
                      size="sm"
                      variant="light"
                      rightSection={<ArrowRight className="w-4 h-4" />}
                      mt="sm"
                    >
                      AI 답글생성 바로가기
                    </Button>
                  </Alert>
                </>
              ) : (
                <Alert icon={<CheckCircle2 className="w-4 h-4" />} color="green">
                  모든 리뷰에 답글이 작성되었습니다!
                </Alert>
              )}
            </Card>

            {/* 프로모션 및 쿠폰 */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="apart" mb="md">
                <Title order={3}>🎁 프로모션 및 쿠폰</Title>
                <Badge size="lg" color={activationData.has_promotion ? 'green' : 'gray'}>
                  {activationData.promotion_count}개
                </Badge>
              </Group>
              
              {activationData.has_promotion ? (
                <Text size="sm" c="dimmed">
                  현재 {activationData.promotion_count}개의 프로모션/쿠폰이 진행 중입니다.
                </Text>
              ) : (
                <Alert icon={<AlertCircle className="w-4 h-4" />} color="yellow">
                  <Text size="sm" fw={500} mb="xs">현재 진행 중인 프로모션/쿠폰이 없습니다</Text>
                  <Text size="sm" c="dimmed">
                    💡 네이버 플레이스 스마트플레이스 센터에서 쿠폰을 등록하면 방문 유도에 효과적입니다.
                  </Text>
                </Alert>
              )}
            </Card>

            {/* 공지사항 */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="apart" mb="md">
                <Title order={3}>📢 공지사항</Title>
                <Badge size="lg" color={activationData.has_announcement ? 'green' : 'gray'}>
                  {activationData.announcement_count}개
                </Badge>
              </Group>
              
              {activationData.has_announcement ? (
                <Text size="sm" c="dimmed">
                  현재 {activationData.announcement_count}개의 공지사항이 등록되어 있습니다.
                  {activationData.last_announcement_date && (
                    <> 최근 공지사항: {activationData.last_announcement_date}</>
                  )}
                </Text>
              ) : (
                <Alert icon={<AlertCircle className="w-4 h-4" />} color="yellow">
                  <Text size="sm" fw={500} mb="xs">등록된 공지사항이 없습니다</Text>
                  <Text size="sm" c="dimmed">
                    💡 정기적으로 공지사항을 등록하면 고객과의 소통이 활발해집니다. 최소 주 1회 업데이트를 권장합니다.
                  </Text>
                </Alert>
              )}
              
              {activationData.days_since_last_announcement && activationData.days_since_last_announcement > 7 && (
                <Alert icon={<Calendar className="w-4 h-4" />} color="orange" mt="sm">
                  <Text size="sm">
                    마지막 공지사항이 {activationData.days_since_last_announcement}일 전에 작성되었습니다. 새로운 소식을 공유해보세요!
                  </Text>
                </Alert>
              )}
            </Card>

            {/* 업체소개글 */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="apart" mb="md">
                <Title order={3}>📝 업체소개글</Title>
                <Button
                  leftSection={<Sparkles className="w-4 h-4" />}
                  onClick={() => setShowDescriptionModal(true)}
                  variant="light"
                >
                  SEO 최적화 생성하기
                </Button>
              </Group>
              
              {activationData.description ? (
                <Paper p="md" withBorder>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {activationData.description}
                  </Text>
                </Paper>
              ) : (
                <Alert icon={<AlertCircle className="w-4 h-4" />} color="yellow">
                  <Text size="sm">업체소개글이 등록되지 않았습니다. SEO 최적화된 소개글을 생성해보세요!</Text>
                </Alert>
              )}
            </Card>

            {/* 찾아오는길 */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="apart" mb="md">
                <Title order={3}>🗺️ 찾아오는길</Title>
                <Button
                  leftSection={<Sparkles className="w-4 h-4" />}
                  onClick={() => setShowDirectionsModal(true)}
                  variant="light"
                >
                  SEO 최적화 생성하기
                </Button>
              </Group>
              
              {activationData.directions ? (
                <Paper p="md" withBorder>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {activationData.directions}
                  </Text>
                </Paper>
              ) : (
                <Alert icon={<AlertCircle className="w-4 h-4" />} color="yellow">
                  <Text size="sm">찾아오는길이 등록되지 않았습니다. SEO 최적화된 안내문을 생성해보세요!</Text>
                </Alert>
              )}
            </Card>

            {/* SNS 및 웹사이트 */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={3} mb="md">🌐 SNS 및 웹사이트</Title>
              
              <Stack gap="sm">
                <Group justify="apart">
                  <Text size="sm" fw={500}>홈페이지</Text>
                  {activationData.homepage ? (
                    <Badge color="green" leftSection={<CheckCircle2 className="w-3 h-3" />}>
                      등록됨
                    </Badge>
                  ) : (
                    <Badge color="gray">미등록</Badge>
                  )}
                </Group>
                
                <Group justify="apart">
                  <Text size="sm" fw={500}>인스타그램</Text>
                  {activationData.instagram ? (
                    <Badge color="green" leftSection={<CheckCircle2 className="w-3 h-3" />}>
                      등록됨
                    </Badge>
                  ) : (
                    <Badge color="gray">미등록</Badge>
                  )}
                </Group>
                
                <Group justify="apart">
                  <Text size="sm" fw={500}>블로그</Text>
                  {activationData.blog ? (
                    <Badge color="green" leftSection={<CheckCircle2 className="w-3 h-3" />}>
                      등록됨
                    </Badge>
                  ) : (
                    <Badge color="gray">미등록</Badge>
                  )}
                </Group>
                
                <Group justify="apart">
                  <Text size="sm" fw={500}>페이스북</Text>
                  {activationData.facebook ? (
                    <Badge color="green" leftSection={<CheckCircle2 className="w-3 h-3" />}>
                      등록됨
                    </Badge>
                  ) : (
                    <Badge color="gray">미등록</Badge>
                  )}
                </Group>
              </Stack>
              
              {!activationData.instagram && (
                <Alert icon={<AlertCircle className="w-4 h-4" />} color="blue" mt="md">
                  <Text size="sm">
                    💡 인스타그램 공식계정이 있다면, 업체정보에 반드시 추가해주세요! SNS 연결은 고객 신뢰도를 높입니다.
                  </Text>
                </Alert>
              )}
              
              {!activationData.blog && (
                <Alert icon={<AlertCircle className="w-4 h-4" />} color="blue" mt="md">
                  <Text size="sm">
                    💡 현재 운영중인 네이버블로그를 반드시 추가해주세요! 블로그는 SEO에 매우 효과적입니다.
                  </Text>
                </Alert>
              )}
            </Card>

            {/* 네이버 서비스 */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={3} mb="md">📱 네이버 서비스</Title>
              
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Paper p="md" withBorder>
                    <Group justify="apart">
                      <Text size="sm" fw={500}>스마트콜</Text>
                      {activationData.has_smart_call ? (
                        <Badge color="green" leftSection={<CheckCircle2 className="w-3 h-3" />}>
                          사용중
                        </Badge>
                      ) : (
                        <Badge color="gray">미사용</Badge>
                      )}
                    </Group>
                    {!activationData.has_smart_call && (
                      <Button
                        component="a"
                        href="https://help.naver.com/service/30016/contents/18440"
                        target="_blank"
                        size="xs"
                        variant="light"
                        mt="sm"
                        fullWidth
                        rightSection={<ExternalLink className="w-3 h-3" />}
                      >
                        설정 가이드
                      </Button>
                    )}
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Paper p="md" withBorder>
                    <Group justify="apart">
                      <Text size="sm" fw={500}>네이버페이</Text>
                      {activationData.has_naver_pay ? (
                        <Badge color="green" leftSection={<CheckCircle2 className="w-3 h-3" />}>
                          사용중
                        </Badge>
                      ) : (
                        <Badge color="gray">미사용</Badge>
                      )}
                    </Group>
                    {!activationData.has_naver_pay && (
                      <Button
                        component="a"
                        href="https://partner.pay.naver.com"
                        target="_blank"
                        size="xs"
                        variant="light"
                        mt="sm"
                        fullWidth
                        rightSection={<ExternalLink className="w-3 h-3" />}
                      >
                        설정 가이드
                      </Button>
                    )}
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Paper p="md" withBorder>
                    <Group justify="apart">
                      <Text size="sm" fw={500}>네이버예약</Text>
                      {activationData.has_naver_booking ? (
                        <Badge color="green" leftSection={<CheckCircle2 className="w-3 h-3" />}>
                          사용중
                        </Badge>
                      ) : (
                        <Badge color="gray">미사용</Badge>
                      )}
                    </Group>
                    {!activationData.has_naver_booking && (
                      <Button
                        component="a"
                        href="https://booking.naver.com/booking/13/bizes"
                        target="_blank"
                        size="xs"
                        variant="light"
                        mt="sm"
                        fullWidth
                        rightSection={<ExternalLink className="w-3 h-3" />}
                      >
                        설정 가이드
                      </Button>
                    )}
                  </Paper>
                </Grid.Col>
                
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Paper p="md" withBorder>
                    <Group justify="apart">
                      <Text size="sm" fw={500}>네이버톡톡</Text>
                      {activationData.has_naver_talk ? (
                        <Badge color="green" leftSection={<CheckCircle2 className="w-3 h-3" />}>
                          사용중
                        </Badge>
                      ) : (
                        <Badge color="gray">미사용</Badge>
                      )}
                    </Group>
                    {!activationData.has_naver_talk && (
                      <Button
                        component="a"
                        href="https://talk.naver.com"
                        target="_blank"
                        size="xs"
                        variant="light"
                        mt="sm"
                        fullWidth
                        rightSection={<ExternalLink className="w-3 h-3" />}
                      >
                        설정 가이드
                      </Button>
                    )}
                  </Paper>
                </Grid.Col>
              </Grid>
            </Card>
          </>
        )}
      </Stack>

      {/* 업체소개글 생성 모달 */}
      <Modal
        opened={showDescriptionModal}
        onClose={() => setShowDescriptionModal(false)}
        title="업체소개글 SEO 최적화 생성"
        size="lg"
      >
        <Stack gap="md">
          <Textarea
            label="프롬프트"
            placeholder="예: 강남역 근처 프리미엄 일식당, 신선한 재료와 정통 일본식 조리법 강조"
            value={descriptionPrompt}
            onChange={(e) => setDescriptionPrompt(e.target.value)}
            minRows={4}
            maxRows={8}
          />
          
          <Button
            onClick={handleGenerateDescription}
            loading={isGenerating}
            leftSection={<Sparkles className="w-4 h-4" />}
            fullWidth
          >
            생성하기
          </Button>
          
          {generatedDescription && (
            <Paper p="md" withBorder>
              <Text size="sm" fw={500} mb="xs">생성된 업체소개글:</Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {generatedDescription}
              </Text>
            </Paper>
          )}
        </Stack>
      </Modal>

      {/* 찾아오는길 생성 모달 */}
      <Modal
        opened={showDirectionsModal}
        onClose={() => setShowDirectionsModal(false)}
        title="찾아오는길 SEO 최적화 생성"
        size="lg"
      >
        <Stack gap="md">
          <Textarea
            label="프롬프트"
            placeholder="예: 지하철 2호선 강남역 11번 출구에서 도보 3분, 주차 가능"
            value={directionsPrompt}
            onChange={(e) => setDirectionsPrompt(e.target.value)}
            minRows={4}
            maxRows={8}
          />
          
          <Button
            onClick={handleGenerateDirections}
            loading={isGenerating}
            leftSection={<Sparkles className="w-4 h-4" />}
            fullWidth
          >
            생성하기
          </Button>
          
          {generatedDirections && (
            <Paper p="md" withBorder>
              <Text size="sm" fw={500} mb="xs">생성된 찾아오는길:</Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {generatedDirections}
              </Text>
            </Paper>
          )}
        </Stack>
      </Modal>
    </Container>
  )
}
