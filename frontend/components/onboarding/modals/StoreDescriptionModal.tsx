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
  Divider,
  Loader,
  Progress,
  ThemeIcon,
  Grid,
  Center,
  Alert,
} from '@mantine/core'
import { Copy, Sparkles, Store as StoreIcon, MapPin, Building2, Package, Heart, CheckCircle2, ChevronRight, Plus, X } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/config'
import { useToast } from '@/components/ui/use-toast'

interface StoreDescriptionModalProps {
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

export default function StoreDescriptionModal({ isOpen, onClose, onComplete }: StoreDescriptionModalProps) {
  const { getToken } = useAuth()
  const { toast } = useToast()
  
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 8
  
  const [stores, setStores] = useState<RegisteredStore[]>([])
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null)
  const [loadingStores, setLoadingStores] = useState(false)
  
  // 입력 필드
  const [regionKeyword, setRegionKeyword] = useState('')
  const [landmarks, setLandmarks] = useState<string[]>([])
  const [businessTypeKeyword, setBusinessTypeKeyword] = useState('')
  const [products, setProducts] = useState<string[]>([])
  const [storeFeatures, setStoreFeatures] = useState('')
  
  // 임시 입력값
  const [tempInput, setTempInput] = useState('')
  
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

  // 키워드 추가
  const addKeyword = (array: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (tempInput.trim()) {
      setter([...array, tempInput.trim()])
      setTempInput('')
    }
  }

  // 키워드 제거
  const removeKeyword = (index: number, array: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(array.filter((_, i) => i !== index))
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
    
    // Step 4: 업종
    if (currentStep === 4) {
      if (!businessTypeKeyword.trim()) {
        setError('업종을 입력해주세요')
        return
      }
      setCurrentStep(5)
      return
    }
    
    // Step 5: 상품/서비스 (선택사항)
    if (currentStep === 5) {
      setCurrentStep(6)
      return
    }
    
    // Step 6: 매장 특색
    if (currentStep === 6) {
      if (!storeFeatures.trim()) {
        setError('매장의 특색을 입력해주세요')
        return
      }
      handleGenerate()
      return
    }
    
    // Step 8: 완료
    if (currentStep === 8) {
      handleClose()
      return
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setCurrentStep(7) // 생성 중 단계
    
    try {
      const token = getToken()
      if (!token) throw new Error('인증이 필요합니다')

      const response = await fetch(api.naver.generateDescription(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          store_id: selectedStore!.id,
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

      toast({
        title: "✅ 생성 완료",
        description: "업체소개글이 성공적으로 생성되었습니다!",
      })
      
      setCurrentStep(8) // 완료 단계
      
      // 완료 마킹
      if (onComplete) {
        onComplete()
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ 오류",
        description: error.message || "업체소개글 생성에 실패했습니다.",
      })
      setCurrentStep(6) // 입력 단계로 돌아가기
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
    if (currentStep > 1 && currentStep !== 7) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleClose = () => {
    setCurrentStep(1)
    setSelectedStore(null)
    setRegionKeyword('')
    setLandmarks([])
    setBusinessTypeKeyword('')
    setProducts([])
    setStoreFeatures('')
    setTempInput('')
    setGeneratedText('')
    setError('')
    onClose()
  }

  // Step 1: 매장 선택
  const renderStep1 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        어떤 매장의 업체소개글을 만들까요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        AI가 매장 특성에 맞는 완벽한 소개글을 작성해드려요
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
          동 단위나 역명보다는 더 큰 지역명이 좋아요. (예: 강남동 → 강남)
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
        근처에 유명한 장소가 있나요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        역, 상권, 건물, 관광지 등 (선택사항)
      </Text>

      <Paper p="md" radius="md" style={{ border: '1px solid #e0e7ff', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
        <Group gap="xs" mb="xs">
          <MapPin size={16} color="#635bff" />
          <Text size="sm" fw={600}>랜드마크 키워드</Text>
          <Badge size="sm" variant="light">선택</Badge>
        </Group>
        <Group gap="xs">
          <TextInput
            size="lg"
            placeholder="예: 합정역"
            value={tempInput}
            onChange={(e) => setTempInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addKeyword(landmarks, setLandmarks)}
            styles={{
              root: { flex: 1 },
              input: {
                borderColor: '#e0e7ff',
                '&:focus': { borderColor: '#635bff' }
              }
            }}
          />
          <Button
            variant="light"
            color="brand"
            onClick={() => addKeyword(landmarks, setLandmarks)}
          >
            <Plus size={16} />
          </Button>
        </Group>
        
        {/* 추가된 키워드 목록 */}
        {landmarks.length > 0 && (
          <Group gap="xs" mt="md">
            {landmarks.map((keyword, index) => (
              <Badge
                key={index}
                size="lg"
                variant="light"
                color="blue"
                rightSection={
                  <X
                    size={14}
                    style={{ cursor: 'pointer' }}
                    onClick={() => removeKeyword(index, landmarks, setLandmarks)}
                  />
                }
                style={{ paddingRight: 8 }}
              >
                {keyword}
              </Badge>
            ))}
          </Group>
        )}
      </Paper>

      <Alert color="blue" title="💡 입력 팁">
        <Text size="xs">
          없다면 비워두고 다음으로 넘어가셔도 괜찮아요!
        </Text>
      </Alert>
    </Stack>
  )

  // Step 4: 업종
  const renderStep4 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        어떤 업종인가요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        매장의 업종을 1개만 입력해주세요
      </Text>

      <Paper p="md" radius="md" style={{ border: '1px solid #e0e7ff', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
        <Group gap="xs" mb="xs">
          <Building2 size={16} color="#635bff" />
          <Text size="sm" fw={600}>업종</Text>
        </Group>
        <TextInput
          size="lg"
          placeholder="예: 카페, 식당, 사진관, 헤어샵"
          value={businessTypeKeyword}
          onChange={(e) => setBusinessTypeKeyword(e.target.value)}
          styles={{
            input: {
              borderColor: '#e0e7ff',
              '&:focus': { borderColor: '#635bff' }
            }
          }}
        />
      </Paper>

      {error && (
        <Alert color="red" title="오류">
          {error}
        </Alert>
      )}
    </Stack>
  )

  // Step 5: 상품/서비스
  const renderStep5 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        어떤 상품이나 서비스를 제공하시나요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        대표 메뉴나 서비스를 알려주세요 (선택사항)
      </Text>

      <Paper p="md" radius="md" style={{ border: '1px solid #e0e7ff', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
        <Group gap="xs" mb="xs">
          <Package size={16} color="#635bff" />
          <Text size="sm" fw={600}>상품/서비스</Text>
          <Badge size="sm" variant="light">선택</Badge>
        </Group>
        <Group gap="xs">
          <TextInput
            size="lg"
            placeholder="예: 칼국수"
            value={tempInput}
            onChange={(e) => setTempInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addKeyword(products, setProducts)}
            styles={{
              root: { flex: 1 },
              input: {
                borderColor: '#e0e7ff',
                '&:focus': { borderColor: '#635bff' }
              }
            }}
          />
          <Button
            variant="light"
            color="brand"
            onClick={() => addKeyword(products, setProducts)}
          >
            <Plus size={16} />
          </Button>
        </Group>
        
        {/* 추가된 키워드 목록 */}
        {products.length > 0 && (
          <Group gap="xs" mt="md">
            {products.map((keyword, index) => (
              <Badge
                key={index}
                size="lg"
                variant="light"
                color="green"
                rightSection={
                  <X
                    size={14}
                    style={{ cursor: 'pointer' }}
                    onClick={() => removeKeyword(index, products, setProducts)}
                  />
                }
                style={{ paddingRight: 8 }}
              >
                {keyword}
              </Badge>
            ))}
          </Group>
        )}
      </Paper>

      <Alert color="blue" title="💡 입력 팁">
        <Text size="xs">
          없다면 비워두고 다음으로 넘어가셔도 괜찮아요!
        </Text>
      </Alert>
    </Stack>
  )

  // Step 6: 매장 특색
  const renderStep6 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        매장만의 특별한 점을 알려주세요
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        매장의 강점, 차별화 포인트, 방문해야 하는 이유 등
      </Text>

      <Paper p="md" radius="md" style={{ border: '1px solid #e0e7ff', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
        <Group gap="xs" mb="xs">
          <Heart size={16} color="#635bff" />
          <Text size="sm" fw={600}>매장 특색 및 강점</Text>
        </Group>
        <Textarea
          size="lg"
          placeholder="예: 저희 매장은 처음 방문하시는 분들도 부담 없이 이용할 수 있도록 공간 동선과 서비스 흐름을 단순하고 편안하게 구성했습니다..."
          value={storeFeatures}
          onChange={(e) => setStoreFeatures(e.target.value)}
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
          자세하게 입력할수록 더 좋은 소개글이 만들어져요!
        </Text>
      </Alert>

      {error && (
        <Alert color="red" title="오류">
          {error}
        </Alert>
      )}
    </Stack>
  )

  // Step 7: 생성 중
  const renderStep7 = () => (
    <Stack gap="xl" align="center">
      <ThemeIcon size={80} radius="xl" color="brand" variant="light">
        <Sparkles size={40} />
      </ThemeIcon>
      
      <div style={{ textAlign: 'center' }}>
        <Text size="xl" fw={700} mb="xs">
          완벽한 업체소개글을 만들고 있어요
        </Text>
        <Text size="sm" c="dimmed">
          AI가 입력하신 정보를 바탕으로 SEO 최적화된 소개글을 작성중입니다...
        </Text>
      </div>

      <Loader size="xl" />
      
      <Text size="xs" c="dimmed">
        보통 10~15초 정도 소요됩니다
      </Text>
    </Stack>
  )

  // Step 8: 완료
  const renderStep8 = () => (
    <Stack gap="md">
      <div style={{ textAlign: 'center' }}>
        <ThemeIcon size={60} radius="xl" color="brand" variant="light" style={{ margin: '0 auto 1rem' }}>
          <CheckCircle2 size={30} />
        </ThemeIcon>
        <Text size="xl" fw={700} mb="xs">
          완성되었어요! 🎉
        </Text>
        <Text size="sm" c="dimmed">
          생성된 업체소개글을 복사해서 사용하세요
        </Text>
      </div>

      {/* AI 생성 콘텐츠 주의사항 */}
      <Alert color="yellow" title="⚠️ 꼭 확인해주세요">
        <Text size="sm">
          AI가 작성한 콘텐츠는 입력하신 정보를 기반으로 자동 생성되었습니다. 
          사실과 다르거나 부정확한 내용이 포함될 수 있으니, <strong>반드시 검토 후 수정하여 사용</strong>해주시기 바랍니다.
        </Text>
      </Alert>

      <Paper p="md" withBorder style={{ background: '#f8fafc' }}>
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Text size="sm" fw={600}>생성된 업체소개글</Text>
            <Group gap="xs">
              <Badge color="blue" variant="light">
                {generatedText.length}자
              </Badge>
              <Button
                variant="subtle"
                size="xs"
                leftSection={<Copy className="w-3 h-3" />}
                onClick={handleCopy}
              >
                복사
              </Button>
            </Group>
          </Group>
          <Divider />
          <Paper p="sm" withBorder style={{ background: 'white' }}>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
              {generatedText}
            </Text>
          </Paper>
          <Button
            fullWidth
            size="lg"
            leftSection={<Copy size={16} />}
            onClick={handleCopy}
            variant="gradient"
            gradient={{ from: 'brand', to: 'brand.7', deg: 135 }}
          >
            클립보드에 복사하기
          </Button>
        </Stack>
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
              {currentStep < 7 ? `${currentStep} / ${totalSteps - 2} 단계` : currentStep === 7 ? '생성 중' : '완료'}
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
          {currentStep === 7 && renderStep7()}
          {currentStep === 8 && renderStep8()}
        </div>

        {/* 버튼 */}
        <Group justify="space-between">
          {currentStep > 1 && currentStep < 7 ? (
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
          
          {currentStep !== 7 && (
            <Button
              variant="gradient"
              gradient={{ from: 'brand', to: 'brand.7', deg: 135 }}
              onClick={handleNext}
              disabled={isGenerating || (currentStep === 1 && !selectedStore)}
              rightSection={currentStep < 8 ? <ChevronRight size={16} /> : null}
              style={{ minWidth: 120 }}
            >
              {currentStep === 6 ? 'AI로 생성하기' : currentStep === 8 ? '완료' : '다음'}
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  )
}
