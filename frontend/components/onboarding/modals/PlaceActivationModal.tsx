"use client"

import { useState, useEffect } from 'react'
import {
  Modal,
  Stack,
  Text,
  Button,
  Paper,
  Group,
  Loader,
  Progress,
  ThemeIcon,
  Center,
  Alert,
  Grid,
  Badge,
  Divider,
} from '@mantine/core'
import {
  Activity,
  Store,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  MessageSquare,
  FileText,
  Gift,
  Megaphone,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/config'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

interface PlaceActivationModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

interface RegisteredStore {
  id: string
  name: string
  place_id: string
  thumbnail?: string
  address?: string
}

interface SummaryCard {
  type: string
  title: string
  value: number
  vs_7d_pct?: number
  vs_30d_pct?: number
  reply_rate?: number
  has_active?: boolean
  days_since_last?: number
}

interface ActivationData {
  store_name: string
  place_id: string
  thumbnail?: string
  summary_cards: SummaryCard[]
}

export default function PlaceActivationModal({ isOpen, onClose, onComplete }: PlaceActivationModalProps) {
  const { getToken } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4
  
  const [stores, setStores] = useState<RegisteredStore[]>([])
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null)
  const [loadingStores, setLoadingStores] = useState(false)
  
  const [activationData, setActivationData] = useState<ActivationData | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')

  // 매장 목록 로드
  useEffect(() => {
    if (isOpen && currentStep === 1) {
      loadStores()
    }
  }, [isOpen, currentStep])

  // 모달 닫기 및 초기화
  const handleClose = () => {
    setCurrentStep(1)
    setStores([])
    setSelectedStore(null)
    setActivationData(null)
    setIsAnalyzing(false)
    setError('')
    onClose()
  }

  const loadStores = async () => {
    setLoadingStores(true)
    try {
      const token = getToken()
      if (!token) return

      const response = await fetch(api.stores.list(), {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('매장 목록 조회 실패')

      const data = await response.json()
      const naverStores = data.stores?.filter((s: any) => s.platform === 'naver') || []
      setStores(naverStores)
    } catch (err) {
      console.error('매장 로드 오류:', err)
      setError('매장 목록을 불러오는데 실패했습니다')
    } finally {
      setLoadingStores(false)
    }
  }

  const analyzeActivation = async () => {
    if (!selectedStore) return

    setIsAnalyzing(true)
    setError('')

    try {
      const token = getToken()
      if (!token) throw new Error('인증 토큰이 없습니다')

      const response = await fetch(api.naver.activation(selectedStore.id), {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('활성화 분석 실패')

      const data = await response.json()
      setActivationData(data.data)
      setCurrentStep(4)
    } catch (err) {
      console.error('활성화 분석 오류:', err)
      setError('활성화 분석 중 오류가 발생했습니다')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleNext = () => {
    setError('')
    
    // Step 1 → 2
    if (currentStep === 1) {
      setCurrentStep(2)
      return
    }
    
    // Step 2: 매장 선택 → 분석
    if (currentStep === 2) {
      if (!selectedStore) {
        setError('매장을 선택해주세요')
        return
      }
      setCurrentStep(3)
      analyzeActivation()
      return
    }
  }

  const handleBack = () => {
    setError('')
    if (currentStep > 1 && currentStep < 3) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getCardIcon = (type: string) => {
    switch (type) {
      case 'visitor_review': return <MessageSquare size={24} />
      case 'blog_review': return <FileText size={24} />
      case 'reply': return <MessageSquare size={24} />
      case 'promotion': return <Gift size={24} />
      case 'announcement': return <Megaphone size={24} />
      default: return <Activity size={24} />
    }
  }

  const getCardColor = (type: string) => {
    switch (type) {
      case 'visitor_review': return 'blue'
      case 'blog_review': return 'grape'
      case 'reply': return 'cyan'
      case 'promotion': return 'pink'
      case 'announcement': return 'orange'
      default: return 'gray'
    }
  }

  const getTrendIcon = (pct?: number) => {
    if (!pct) return <Minus size={14} color="#868e96" />
    if (pct > 0) return <ArrowUp size={14} color="#51cf66" />
    if (pct < 0) return <ArrowDown size={14} color="#ff6b6b" />
    return <Minus size={14} color="#868e96" />
  }

  const getTrendColor = (pct?: number) => {
    if (!pct) return 'gray'
    if (pct > 0) return 'green'
    if (pct < 0) return 'red'
    return 'gray'
  }

  // Step 1: 환영 메시지
  const renderStep1 = () => (
    <Stack gap="lg" py="xs">
      <Center>
        <ThemeIcon size={90} radius={90} variant="light" color="blue" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' }}>
          <Activity size={45} />
        </ThemeIcon>
      </Center>
      
      <Stack gap="xs" ta="center" px="sm">
        <Text size="24px" fw={700} style={{ lineHeight: 1.3 }}>
          플레이스 활성화<br />확인하기
        </Text>
        <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
          우리 매장이 활성화된 플레이스라는 것을<br />
          지속적으로 시그널을 만들어야 순위를 올릴 수 있습니다
        </Text>
      </Stack>

      <Paper p="md" radius="md" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', border: 'none' }}>
        <Stack gap="md">
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size={40} radius="md" variant="light" color="blue">
              <TrendingUp size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600} size="sm">최근 활성화 수준 확인</Text>
              <Text size="xs" c="dimmed">리뷰, 프로모션, 공지사항 등 5가지 핵심 지표를 확인하세요</Text>
            </div>
          </Group>
          
          <Divider />
          
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size={40} radius="md" variant="light" color="grape">
              <Activity size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600} size="sm">개선이 필요한 부분 파악</Text>
              <Text size="xs" c="dimmed">우리 매장에 뭐가 더 필요한지를 수시로 판단하세요</Text>
            </div>
          </Group>
          
          <Divider />
          
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size={40} radius="md" variant="light" color="green">
              <CheckCircle2 size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600} size="sm">과거 이력 자동 저장</Text>
              <Text size="xs" c="dimmed">분석 결과는 자동으로 저장되어 변화 추이를 확인할 수 있습니다</Text>
            </div>
          </Group>
        </Stack>
      </Paper>

      <Alert color="blue" radius="md" p="sm">
        <Text size="xs">
          💡 <strong>TIP:</strong> 정기적으로 활성화 수준을 확인하고 개선 활동을 이어가면 플레이스 순위 상승에 도움이 됩니다!
        </Text>
      </Alert>
    </Stack>
  )

  // Step 2: 매장 선택
  const renderStep2 = () => (
    <Stack gap="lg" py="xs">
      <Stack gap="xs" ta="center">
        <Text size="24px" fw={700}>어떤 매장의 활성화 수준을<br />확인할까요?</Text>
        <Text size="sm" c="dimmed">
          매장을 선택하면 현재 활성화 상태를 분석해드려요
        </Text>
      </Stack>

      {loadingStores ? (
        <Center style={{ minHeight: 200 }}>
          <Loader size="lg" />
        </Center>
      ) : stores.length === 0 ? (
        <Alert color="yellow" title="등록된 매장이 없습니다" radius="md">
          먼저 네이버 플레이스 매장을 등록해주세요
        </Alert>
      ) : (
        <Grid gutter="md">
          {stores.map((store) => (
            <Grid.Col key={store.id} span={{ base: 12, sm: 6 }}>
              <Paper
                p="md"
                radius="md"
                style={{
                  cursor: 'pointer',
                  border: selectedStore?.id === store.id ? '2px solid #228be6' : '1px solid #e0e7ff',
                  background: selectedStore?.id === store.id ? 'linear-gradient(135deg, #e7f5ff 0%, #d0ebff 100%)' : '#ffffff',
                  transition: 'all 0.2s'
                }}
                onClick={() => setSelectedStore(store)}
              >
                <Group gap="md">
                  {store.thumbnail ? (
                    <img 
                      src={store.thumbnail} 
                      alt={store.name}
                      style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
                    />
                  ) : (
                    <ThemeIcon size={48} radius="md" variant="light" color="blue">
                      <Store size={24} />
                    </ThemeIcon>
                  )}
                  <div style={{ flex: 1 }}>
                    <Text fw={600} size="sm">{store.name}</Text>
                    {store.address && (
                      <Text size="xs" c="dimmed">{store.address}</Text>
                    )}
                  </div>
                  {selectedStore?.id === store.id && (
                    <ThemeIcon size={32} radius="xl" color="blue">
                      <CheckCircle2 size={20} />
                    </ThemeIcon>
                  )}
                </Group>
              </Paper>
            </Grid.Col>
          ))}
        </Grid>
      )}

      {error && (
        <Alert color="red" radius="md">
          {error}
        </Alert>
      )}
    </Stack>
  )

  // Step 3: 분석 중
  const renderStep3 = () => (
    <Center style={{ minHeight: 300 }}>
      <Stack gap="xl" align="center">
        <Loader size={80} />
        <Stack gap="xs" align="center">
          <Text size="24px" fw={700}>활성화 수준을 분석하고 있습니다...</Text>
          <Text size="sm" c="dimmed" ta="center">
            잠시만 기다려주세요
          </Text>
        </Stack>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <Progress value={100} animated radius="md" size="lg" />
        </div>
      </Stack>
    </Center>
  )

  // Step 4: 결과 요약
  const renderStep4 = () => {
    if (!activationData) return null

    // 값 포맷팅 함수
    const formatValue = (value: number, type: string) => {
      // 방문자/블로그 리뷰: 소수점 있으면 1자리, 없으면 정수
      if (type === 'visitor_review' || type === 'blog_review') {
        if (value % 1 === 0) {
          return Math.round(value).toString()
        }
        return value.toFixed(1)
      }
      // 답글, 쿠폰, 공지: 정수
      return Math.round(value).toString()
    }

    // 공지사항/프로모션 메시지
    const getStatusMessage = (card: any) => {
      if (card.has_active) {
        return '✅ 현재 활성화 중'
      }
      // 3일 동안 없으면 특별 메시지
      if (card.days_since_last && card.days_since_last >= 3) {
        return '❌ 지난 3일동안 공지사항이 없습니다'
      }
      return `❌ ${card.days_since_last || 0}일 전 마지막`
    }

    return (
      <Stack gap="sm" py="xs">
        <Center>
          <ThemeIcon size={60} radius={60} variant="light" color="green" style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' }}>
            <CheckCircle2 size={30} />
          </ThemeIcon>
        </Center>

        <Stack gap={2} ta="center">
          <Text size="20px" fw={700}>활성화 분석 완료!</Text>
          <Text size="xs" c="dimmed">
            현재 활성화 수준을 5가지 지표로 요약했어요
          </Text>
        </Stack>

        <div style={{ maxHeight: 350, overflowY: 'auto' }}>
          <Stack gap={6}>
            {activationData.summary_cards.map((card) => (
              <Paper key={card.type} p="xs" radius="md" withBorder>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap">
                    <ThemeIcon size={28} radius="md" variant="light" color={getCardColor(card.type)}>
                      {getCardIcon(card.type)}
                    </ThemeIcon>
                    <div>
                      <Text fw={600} size="xs">{card.title}</Text>
                      <Text size="10px" c="dimmed">지난 3일 평균</Text>
                    </div>
                  </Group>
                  <Group gap={4} wrap="nowrap">
                    <Text size="lg" fw={700}>{formatValue(card.value, card.type)}</Text>
                    <Text size="xs" c="dimmed" fw={400}>개</Text>
                  </Group>
                </Group>

                {(card.type === 'visitor_review' || card.type === 'blog_review') && (
                  <Group gap="xs" mt={4}>
                    <Badge 
                      size="xs" 
                      variant="light" 
                      color={getTrendColor(card.vs_7d_pct)}
                      leftSection={getTrendIcon(card.vs_7d_pct)}
                    >
                      7일 {card.vs_7d_pct?.toFixed(1) || '0'}%
                    </Badge>
                    <Badge 
                      size="xs" 
                      variant="light" 
                      color={getTrendColor(card.vs_30d_pct)}
                      leftSection={getTrendIcon(card.vs_30d_pct)}
                    >
                      30일 {card.vs_30d_pct?.toFixed(1) || '0'}%
                    </Badge>
                  </Group>
                )}

                {card.type === 'reply' && card.reply_rate !== undefined && (
                  <Badge size="xs" variant="light" color={card.reply_rate >= 80 ? 'green' : card.reply_rate >= 50 ? 'yellow' : 'red'} mt={4}>
                    답글 비율 {card.reply_rate.toFixed(1)}%
                  </Badge>
                )}

                {(card.type === 'promotion' || card.type === 'announcement') && (
                  <Text size="10px" c="dimmed" mt={4}>
                    {getStatusMessage(card)}
                  </Text>
                )}
              </Paper>
            ))}
          </Stack>
        </div>

        <Alert color="blue" radius="md" p="xs">
          <Text size="10px">💡 상세 페이지에서 트렌드 분석, 개선 제안 등 더 많은 정보를 확인하세요!</Text>
        </Alert>

        <Button
          size="sm"
          fullWidth
          radius="md"
          onClick={() => {
            router.push(`/dashboard/naver/activation?storeId=${selectedStore?.id}`)
            handleClose()
            onComplete?.()
          }}
        >
          상세 내역 확인하기
        </Button>
      </Stack>
    )
  }

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      size="lg"
      centered
      padding="xl"
      radius="md"
      title={
        currentStep <= 3 ? (
          <Stack gap={8}>
            <Text size="sm" c="dimmed">
              플레이스 활성화 확인하기 ({currentStep}/{totalSteps})
            </Text>
            <Progress value={(currentStep / totalSteps) * 100} radius="md" />
          </Stack>
        ) : null
      }
      closeOnClickOutside={false}
      closeOnEscape={false}
      styles={{
        body: {
          maxHeight: '70vh',
          overflowY: 'auto'
        }
      }}
    >
      <Stack gap="xl">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        {currentStep > 1 && currentStep < 3 && (
          <Group justify="space-between">
            <Button
              variant="subtle"
              onClick={handleBack}
              leftSection={<ChevronLeft size={18} />}
              radius="md"
            >
              이전
            </Button>
            <Button
              onClick={handleNext}
              rightSection={<ChevronRight size={18} />}
              radius="md"
            >
              {currentStep === 2 ? '분석 시작하기' : '다음'}
            </Button>
          </Group>
        )}

        {currentStep === 1 && (
          <Button
            size="lg"
            fullWidth
            rightSection={<ChevronRight size={20} />}
            onClick={handleNext}
            radius="md"
          >
            시작하기
          </Button>
        )}
      </Stack>
    </Modal>
  )
}
