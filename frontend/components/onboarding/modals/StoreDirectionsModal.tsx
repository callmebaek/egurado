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
  Loader,
  ActionIcon,
} from '@mantine/core'
import { Copy, Sparkles, AlertCircle } from 'lucide-react'
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
    setGeneratedText('')
    
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
          store_id: selectedStore.id,
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
    setDirectionsDescription('')
    setGeneratedText('')
    onClose()
  }

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      title="AI로 완벽한 찾아오는길 생성"
      size="lg"
      centered
    >
      <Stack gap="md">
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
              label="1. 지역 키워드 (필수)"
              placeholder="예: 합정, 종로, 성수"
              description="매장의 가장 메인 지역 키워드 1개를 입력해주세요."
              value={regionKeyword}
              onChange={(e) => setRegionKeyword(e.target.value)}
              required
            />

            <TextInput
              label="2. 랜드마크 키워드 (선택)"
              placeholder="예: 합정역, 홍대입구역, 메세나폴리스 (쉼표로 구분)"
              description="매장 주변의 주요 랜드마크 키워드를 입력해주세요."
              value={landmarkKeywords}
              onChange={(e) => setLandmarkKeywords(e.target.value)}
            />

            <Textarea
              label="3. 찾아오는 길 설명 (필수)"
              placeholder="예: 합정역 7번 출구에서 직진 200m, GS25 편의점 옆 건물 2층입니다. 주차는 건물 지하 1층에 가능하며, 방문 시 건물 입구에서 연락주시면 안내해드립니다."
              description="매장까지 오는 길을 자유롭게 상세하게 설명해주세요."
              value={directionsDescription}
              onChange={(e) => setDirectionsDescription(e.target.value)}
              minRows={5}
              required
            />

            <Button
              onClick={handleGenerate}
              loading={isGenerating}
              disabled={!regionKeyword.trim() || !directionsDescription.trim()}
              fullWidth
              size="lg"
              leftSection={<Sparkles size={16} />}
              variant="gradient"
              gradient={{ from: 'brand', to: 'brand.7', deg: 135 }}
            >
              AI로 찾아오는길 생성하기
            </Button>

            {generatedText && (
              <Paper p="md" withBorder style={{ background: '#f8fafc' }}>
                <Group justify="space-between" align="center" mb="xs">
                  <Text size="sm" fw={600}>생성된 찾아오는길: ({generatedText.length}자)</Text>
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
                  leftSection={<Copy size={16} />}
                  onClick={handleCopy}
                >
                  클립보드에 복사하기
                </Button>
              </Paper>
            )}
          </>
        )}
      </Stack>
    </Modal>
  )
}
