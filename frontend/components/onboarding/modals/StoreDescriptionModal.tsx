"use client"

import { useState, useEffect } from 'react'
import {
  Modal,
  Stack,
  Text,
  Button,
  TextInput,
  Textarea,
  Alert,
  Paper,
  Group,
  Badge,
  Divider,
  Loader,
} from '@mantine/core'
import { Copy, Sparkles, AlertCircle } from 'lucide-react'
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
  
  const [stores, setStores] = useState<RegisteredStore[]>([])
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null)
  const [loadingStores, setLoadingStores] = useState(false)
  
  // 입력 필드
  const [regionKeyword, setRegionKeyword] = useState('')
  const [landmarkKeywords, setLandmarkKeywords] = useState('')
  const [businessTypeKeyword, setBusinessTypeKeyword] = useState('')
  const [productKeywords, setProductKeywords] = useState('')
  const [storeFeatures, setStoreFeatures] = useState('')
  
  // 생성 결과
  const [generatedText, setGeneratedText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // 매장 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadStores()
    }
  }, [isOpen])

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
      
      // 첫 번째 매장 자동 선택
      if (naverStores.length > 0) {
        setSelectedStore(naverStores[0])
      }
    } catch (err) {
      console.error('매장 로드 오류:', err)
    } finally {
      setLoadingStores(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedStore) return

    setIsGenerating(true)
    try {
      const token = getToken()
      if (!token) throw new Error('인증이 필요합니다')

      const landmarks = landmarkKeywords.split(',').map(k => k.trim()).filter(k => k)
      const products = productKeywords.split(',').map(k => k.trim()).filter(k => k)

      const response = await fetch(api.naver.generateDescription(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          store_id: selectedStore.id,
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

  const handleClose = () => {
    setRegionKeyword('')
    setLandmarkKeywords('')
    setBusinessTypeKeyword('')
    setProductKeywords('')
    setStoreFeatures('')
    setGeneratedText('')
    onClose()
  }

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      title="AI로 완벽한 업체소개글 생성하기"
      size="xl"
      centered
    >
      <Stack gap="md">
        <Alert color="blue" variant="light">
          <Text size="sm">
            SEO 최적화된 업체소개글을 생성합니다. 모든 필드를 입력하면 더 정확한 결과를 얻을 수 있습니다.
          </Text>
        </Alert>

        {loadingStores ? (
          <div className="flex justify-center py-8">
            <Loader size="lg" />
          </div>
        ) : stores.length === 0 ? (
          <Alert color="yellow" icon={<AlertCircle size={16} />}>
            등록된 네이버 플레이스 매장이 없습니다. 먼저 매장을 등록해주세요.
          </Alert>
        ) : (
          <>
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
              onClick={handleGenerate}
              loading={isGenerating}
              disabled={!regionKeyword.trim() || !businessTypeKeyword.trim() || !storeFeatures.trim()}
              fullWidth
              size="lg"
              leftSection={<Sparkles size={16} />}
              variant="gradient"
              gradient={{ from: 'brand', to: 'brand.7', deg: 135 }}
            >
              AI로 업체소개글 생성하기
            </Button>

            {generatedText && (
              <Paper p="md" withBorder style={{ background: '#f8fafc' }}>
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
                    size="md"
                    leftSection={<Copy className="w-4 h-4" />}
                    onClick={handleCopy}
                  >
                    클립보드에 복사하기
                  </Button>
                </Stack>
              </Paper>
            )}
          </>
        )}
      </Stack>
    </Modal>
  )
}
