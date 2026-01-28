"use client"

import { useState, useEffect } from 'react'
import {
  Modal,
  Stack,
  Text,
  Button,
  TextInput,
  Textarea,
  Paper,
  Group,
  Badge,
  Loader,
  Progress,
  ThemeIcon,
  Grid,
  Center,
  Alert,
  ActionIcon,
} from '@mantine/core'
import { Copy, Sparkles, Store as StoreIcon, MapPin, Navigation, CheckCircle2, ChevronRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/config'
import { useToast } from '@/components/ui/use-toast'

interface StoreDirectionsModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

interface RegisteredStore {
  id: string
  name: string
  place_id: string
  thumbnail?: string
}

export default function StoreDirectionsModal({ isOpen, onClose, onComplete }: StoreDirectionsModalProps) {
  const { getToken } = useAuth()
  const { toast } = useToast()
  
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 6
  
  const [stores, setStores] = useState<RegisteredStore[]>([])
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null)
  const [loadingStores, setLoadingStores] = useState(false)
  
  // 입력 필드
  const [regionKeyword, setRegionKeyword] = useState('')
  const [landmarkKeywords, setLandmarkKeywords] = useState('')
  const [directionsDescription, setDirectionsDescription] = useState('')
  
  // 생성 결과
  const [generatedText, setGeneratedText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  // 매장 목록 로드
  useEffect(() => {
    if (isOpen && currentStep === 1) {
      loadStores()
    }
  }, [isOpen, currentStep])

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
    } finally {
      setLoadingStores(false)
    }
  }

  const handleNext = () => {
    setError('')
    
    // Step 1: 매장 선택
    if (currentStep === 1) {
      if (!selectedStore) {
        setError('매장을 선택해주세요')
        return
      }
      setCurrentStep(2)
      return
    }
    
    // Step 2: 지역 키워드
    if (currentStep === 2) {
      if (!regionKeyword.trim()) {
        setError('지역 키워드를 입력해주세요')
        return
      }
      setCurrentStep(3)
      return
    }
    
    // Step 3: 랜드마크 (선택사항)
    if (currentStep === 3) {
      setCurrentStep(4)
      return
    }
    
    // Step 4: 찾아오는길 설명
    if (currentStep === 4) {
      if (!directionsDescription.trim()) {
        setError('찾아오는길 설명을 입력해주세요')
        return
      }
      handleGenerate()
      return
    }
    
    // Step 6: 완료
    if (currentStep === 6) {
      handleClose()
      return
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setCurrentStep(5) // 생성 중 단계
    
    try {
      const token = getToken()
      if (!token) throw new Error('인증이 필요합니다')

      const landmarks = landmarkKeywords.split(',').map(k => k.trim()).filter(Boolean)

      const response = await fetch(api.naver.generateDirections(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          store_id: selectedStore!.id,
          region_keyword: regionKeyword,
          landmark_keywords: landmarks,
          directions_description: directionsDescription,
        })
      })

      if (!response.ok) throw new Error('생성 실패')

      const data = await response.json()
      setGeneratedText(data.generated_text)

      toast({
        title: "✅ 생성 완료",
        description: "찾아오는길이 성공적으로 생성되었습니다!",
      })
      
      setCurrentStep(6) // 완료 단계
      
      // 완료 마킹
      if (onComplete) {
        onComplete()
      }
    } catch (error: any) {
      console.error("Error generating directions:", error)
      toast({
        variant: "destructive",
        title: "❌ 오류",
        description: error.message || "찾아오는길 생성에 실패했습니다.",
      })
      setCurrentStep(4) // 입력 단계로 돌아가기
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText)
    toast({
      title: "✅ 복사 완료",
      description: "클립보드에 복사되었습니다!",
    })
  }

  const handleBack = () => {
    setError('')
    if (currentStep > 1 && currentStep !== 5) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleClose = () => {
    setCurrentStep(1)
    setSelectedStore(null)
    setRegionKeyword('')
    setLandmarkKeywords('')
    setDirectionsDescription('')
    setGeneratedText('')
    setError('')
    onClose()
  }

  // Step 1: 매장 선택
  const renderStep1 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        어떤 매장의 찾아오는길을 만들까요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        AI가 고객이 쉽게 찾을 수 있는 안내문을 작성해드려요
      </Text>

      {loadingStores ? (
        <Center style={{ minHeight: 200 }}>
          <Loader size="lg" />
        </Center>
      ) : stores.length === 0 ? (
        <Alert color="yellow" title="등록된 매장이 없습니다">
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
                  border: selectedStore?.id === store.id ? '2px solid #635bff' : '1px solid #e0e7ff',
                  background: selectedStore?.id === store.id ? 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)' : '#ffffff',
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
                    <ThemeIcon size={48} radius="md" variant="light" color="brand">
                      <StoreIcon size={24} />
                    </ThemeIcon>
                  )}
                  <div style={{ flex: 1 }}>
                    <Text fw={600} size="sm">{store.name}</Text>
                    <Text size="xs" c="dimmed">네이버 플레이스</Text>
                  </div>
                  {selectedStore?.id === store.id && (
                    <ThemeIcon size={32} radius="xl" color="brand">
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
        <Alert color="red" title="오류">
          {error}
        </Alert>
      )}
    </Stack>
  )

  // Step 2: 지역 키워드
  const renderStep2 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        매장이 위치한 메인 지역을 알려주세요
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        가장 대표적인 지역 키워드 1개만 입력해주세요
      </Text>

      <Paper p="md" radius="md" style={{ border: '1px solid #e0e7ff', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
        <Group gap="xs" mb="xs">
          <MapPin size={16} color="#635bff" />
          <Text size="sm" fw={600}>지역 키워드</Text>
        </Group>
        <TextInput
          size="lg"
          placeholder="예: 합정, 종로, 성수"
          value={regionKeyword}
          onChange={(e) => setRegionKeyword(e.target.value)}
          styles={{
            input: {
              borderColor: '#e0e7ff',
              '&:focus': { borderColor: '#635bff' }
            }
          }}
        />
      </Paper>

      <Alert color="blue" title="💡 입력 팁">
        <Text size="xs">
          고객이 검색할 때 가장 많이 사용하는 지역명을 입력하세요
        </Text>
      </Alert>

      {error && (
        <Alert color="red" title="오류">
          {error}
        </Alert>
      )}
    </Stack>
  )

  // Step 3: 랜드마크
  const renderStep3 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        근처에 유명한 장소나 역이 있나요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        고객이 쉽게 찾을 수 있는 랜드마크를 알려주세요 (선택사항)
      </Text>

      <Paper p="md" radius="md" style={{ border: '1px solid #e0e7ff', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
        <Group gap="xs" mb="xs">
          <Navigation size={16} color="#635bff" />
          <Text size="sm" fw={600}>랜드마크 키워드</Text>
          <Badge size="sm" variant="light">선택</Badge>
        </Group>
        <TextInput
          size="lg"
          placeholder="예: 합정역, 메세나폴리스 (쉼표로 구분)"
          value={landmarkKeywords}
          onChange={(e) => setLandmarkKeywords(e.target.value)}
          styles={{
            input: {
              borderColor: '#e0e7ff',
              '&:focus': { borderColor: '#635bff' }
            }
          }}
        />
      </Paper>

      <Alert color="blue" title="💡 입력 팁">
        <Text size="xs">
          지하철역, 유명 건물, 상권 이름 등을 입력하면 좋아요
        </Text>
      </Alert>
    </Stack>
  )

  // Step 4: 찾아오는길 설명
  const renderStep4 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        매장까지 오는 길을 자세히 설명해주세요
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        출구 번호, 걷는 시간, 주변 건물, 주차 정보 등을 포함해주세요
      </Text>

      <Paper p="md" radius="md" style={{ border: '1px solid #e0e7ff', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
        <Group gap="xs" mb="xs">
          <Navigation size={16} color="#635bff" />
          <Text size="sm" fw={600}>찾아오는길 설명</Text>
        </Group>
        <Textarea
          size="lg"
          placeholder="예: 합정역 7번 출구에서 직진 200m, GS25 편의점 옆 건물 2층입니다. 주차는 건물 지하 1층에 가능하며, 방문 시 건물 입구에서 연락주시면 안내해드립니다."
          value={directionsDescription}
          onChange={(e) => setDirectionsDescription(e.target.value)}
          minRows={6}
          styles={{
            input: {
              borderColor: '#e0e7ff',
              '&:focus': { borderColor: '#635bff' }
            }
          }}
        />
      </Paper>

      <Alert color="blue" title="💡 입력 팁">
        <Text size="xs">
          자세하게 입력할수록 고객이 매장을 더 쉽게 찾을 수 있어요!
        </Text>
      </Alert>

      {error && (
        <Alert color="red" title="오류">
          {error}
        </Alert>
      )}
    </Stack>
  )

  // Step 5: 생성 중
  const renderStep5 = () => (
    <Stack gap="xl" align="center">
      <ThemeIcon size={80} radius="xl" color="brand" variant="light">
        <Sparkles size={40} />
      </ThemeIcon>
      
      <div style={{ textAlign: 'center' }}>
        <Text size="xl" fw={700} mb="xs">
          완벽한 찾아오는길을 만들고 있어요
        </Text>
        <Text size="sm" c="dimmed">
          AI가 고객이 쉽게 이해할 수 있는 안내문을 작성중입니다...
        </Text>
      </div>

      <Loader size="xl" />
      
      <Text size="xs" c="dimmed">
        보통 10~15초 정도 소요됩니다
      </Text>
    </Stack>
  )

  // Step 6: 완료
  const renderStep6 = () => (
    <Stack gap="md">
      <div style={{ textAlign: 'center' }}>
        <ThemeIcon size={60} radius="xl" color="brand" variant="light" style={{ margin: '0 auto 1rem' }}>
          <CheckCircle2 size={30} />
        </ThemeIcon>
        <Text size="xl" fw={700} mb="xs">
          완성되었어요! 🎉
        </Text>
        <Text size="sm" c="dimmed">
          생성된 찾아오는길을 복사해서 사용하세요
        </Text>
      </div>

      <Paper p="md" withBorder style={{ background: '#f8fafc' }}>
        <Group justify="space-between" align="center" mb="xs">
          <Text size="sm" fw={600}>생성된 찾아오는길 ({generatedText.length}자)</Text>
          <ActionIcon variant="subtle" color="gray" onClick={handleCopy}>
            <Copy size={16} />
          </ActionIcon>
        </Group>
        <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
          {generatedText}
        </Text>
        <Button
          fullWidth
          mt="md"
          size="lg"
          leftSection={<Copy size={16} />}
          onClick={handleCopy}
          variant="gradient"
          gradient={{ from: 'brand', to: 'brand.7', deg: 135 }}
        >
          클립보드에 복사하기
        </Button>
      </Paper>
    </Stack>
  )

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      size="lg"
      centered
      withCloseButton={false}
      styles={{
        header: {
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        }
      }}
    >
      <Stack gap="xl" p="md">
        {/* 진행률 표시 */}
        <div>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={600} c="brand">
              {currentStep < 5 ? `${currentStep} / ${totalSteps - 2} 단계` : currentStep === 5 ? '생성 중' : '완료'}
            </Text>
            <Text size="sm" c="dimmed">
              {Math.round((currentStep / totalSteps) * 100)}%
            </Text>
          </Group>
          <Progress 
            value={(currentStep / totalSteps) * 100} 
            color="brand"
            size="sm"
            radius="xl"
          />
        </div>

        {/* 단계별 콘텐츠 */}
        <div style={{ minHeight: 300 }}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
        </div>

        {/* 버튼 */}
        <Group justify="space-between">
          {currentStep > 1 && currentStep < 5 ? (
            <Button 
              variant="light" 
              color="gray"
              onClick={handleBack}
            >
              이전
            </Button>
          ) : (
            <div />
          )}
          
          {currentStep !== 5 && (
            <Button
              variant="gradient"
              gradient={{ from: 'brand', to: 'brand.7', deg: 135 }}
              onClick={handleNext}
              disabled={isGenerating || (currentStep === 1 && !selectedStore)}
              rightSection={currentStep < 6 ? <ChevronRight size={16} /> : null}
              style={{ minWidth: 120 }}
            >
              {currentStep === 4 ? 'AI로 생성하기' : currentStep === 6 ? '완료' : '다음'}
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  )
}
