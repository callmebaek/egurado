"use client"

import { useState } from 'react'
import {
  Modal,
  Stack,
  Text,
  Button,
  TextInput,
  Paper,
  Group,
  Badge,
  Loader,
  Progress,
  ThemeIcon,
  Center,
  Alert,
  Grid,
  Divider,
} from '@mantine/core'
import {
  Lightbulb,
  MapPin,
  Package,
  Building2,
  Sparkles,
  ChevronRight,
  Plus,
  X,
  CheckCircle2,
  Search,
  TrendingUp,
  Monitor,
  Smartphone,
  ChevronLeft,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/config'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

interface AdditionalKeywordsModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

interface SearchVolumeData {
  id: string
  keyword: string
  monthly_pc_qc_cnt: number | string
  monthly_mobile_qc_cnt: number | string
  monthly_ave_pc_clk_cnt: number
  monthly_ave_mobile_clk_cnt: number
  monthly_ave_pc_ctr: number
  monthly_ave_mobile_ctr: number
  comp_idx: string
  created_at: string
}

export default function AdditionalKeywordsModal({ isOpen, onClose, onComplete }: AdditionalKeywordsModalProps) {
  const { user, getToken } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 8
  
  // 입력 필드
  const [locationKeywords, setLocationKeywords] = useState<string[]>([])
  const [productKeywords, setProductKeywords] = useState<string[]>([])
  const [industryKeywords, setIndustryKeywords] = useState<string[]>([])
  
  // 임시 입력값
  const [tempInput, setTempInput] = useState('')
  
  // 조합 결과
  const [combinations, setCombinations] = useState<string[]>([])
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set())
  
  // 검색 결과
  const [searchResults, setSearchResults] = useState<SearchVolumeData[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')

  // 모달 닫기 및 초기화
  const handleClose = () => {
    setCurrentStep(1)
    setLocationKeywords([])
    setProductKeywords([])
    setIndustryKeywords([])
    setTempInput('')
    setCombinations([])
    setSelectedKeywords(new Set())
    setSearchResults([])
    setIsSearching(false)
    setError('')
    onClose()
  }

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

  // 조합 생성
  const generateCombinations = () => {
    const locations = locationKeywords
    const products = productKeywords
    const industries = industryKeywords

    if (locations.length === 0 || products.length === 0 || industries.length === 0) {
      setError('모든 카테고리에 최소 1개 이상의 키워드를 입력해주세요')
      return []
    }

    const newCombinations: string[] = []

    // A + B (지역 + 상품)
    locations.forEach(loc => {
      products.forEach(prod => {
        newCombinations.push(`${loc} ${prod}`)
      })
    })

    // A + B + C (지역 + 상품 + 업종)
    locations.forEach(loc => {
      products.forEach(prod => {
        industries.forEach(ind => {
          newCombinations.push(`${loc} ${prod} ${ind}`)
        })
      })
    })

    // A + C (지역 + 업종)
    locations.forEach(loc => {
      industries.forEach(ind => {
        newCombinations.push(`${loc} ${ind}`)
      })
    })

    // B + C (상품 + 업종)
    products.forEach(prod => {
      industries.forEach(ind => {
        newCombinations.push(`${prod} ${ind}`)
      })
    })

    // 중복 제거
    return Array.from(new Set(newCombinations))
  }

  // 키워드 검색
  const handleSearch = async () => {
    if (!user?.id) {
      toast({
        title: "오류",
        description: "사용자 정보를 불러올 수 없습니다.",
        variant: "destructive",
      })
      return
    }

    const keywordsToSearch = Array.from(selectedKeywords)
    
    if (keywordsToSearch.length === 0) {
      setError('최소 1개 이상의 키워드를 선택해주세요')
      return
    }

    if (keywordsToSearch.length > 5) {
      setError('한 번에 최대 5개의 키워드만 검색할 수 있습니다')
      return
    }

    setIsSearching(true)
    setError('')
    
    try {
      const token = await getToken()
      if (!token) {
        toast({
          title: "인증 오류",
          description: "로그인이 필요합니다.",
          variant: "destructive",
        })
        setIsSearching(false)
        return
      }

      const response = await fetch(
        `${api.baseUrl}/api/v1/keyword-search-volume/search-volume`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            keywords: keywordsToSearch,
          }),
        }
      )

      if (!response.ok) throw new Error("검색 실패")

      const result = await response.json()
      
      // API 응답에서 키워드 데이터 추출 및 변환
      const keywordList = result.data?.keywordList || []
      const displayResults: SearchVolumeData[] = []
      
      // saved_history가 있으면 우선 사용
      if (result.saved_history && result.saved_history.length > 0) {
        displayResults.push(...result.saved_history)
      } 
      // saved_history가 없어도 keywordList가 있으면 임시로 표시
      else if (keywordList.length > 0) {
        keywordList.forEach((item: any, index: number) => {
          displayResults.push({
            id: `temp-${Date.now()}-${index}`,
            keyword: item.relKeyword,
            monthly_pc_qc_cnt: typeof item.monthlyPcQcCnt === 'string' && item.monthlyPcQcCnt.includes('<') ? 5 : item.monthlyPcQcCnt,
            monthly_mobile_qc_cnt: typeof item.monthlyMobileQcCnt === 'string' && item.monthlyMobileQcCnt.includes('<') ? 5 : item.monthlyMobileQcCnt,
            monthly_ave_pc_clk_cnt: item.monthlyAvePcClkCnt || 0,
            monthly_ave_mobile_clk_cnt: item.monthlyAveMobileClkCnt || 0,
            monthly_ave_pc_ctr: item.monthlyAvePcCtr || 0,
            monthly_ave_mobile_ctr: item.monthlyAveMobileCtr || 0,
            comp_idx: item.compIdx || '-',
            created_at: new Date().toISOString(),
          })
        })
      }
      
      setSearchResults(displayResults)
      setCurrentStep(8)
      
    } catch (err) {
      console.error('검색 오류:', err)
      setError('검색 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleNext = () => {
    setError('')
    
    // Step 1 → 2
    if (currentStep === 1) {
      setCurrentStep(2)
      return
    }
    
    // Step 2: 지역 키워드
    if (currentStep === 2) {
      if (locationKeywords.length === 0) {
        setError('최소 1개 이상의 지역 키워드를 추가해주세요')
        return
      }
      setCurrentStep(3)
      return
    }
    
    // Step 3: 상품 키워드
    if (currentStep === 3) {
      if (productKeywords.length === 0) {
        setError('최소 1개 이상의 상품 키워드를 추가해주세요')
        return
      }
      setCurrentStep(4)
      return
    }
    
    // Step 4: 업종 키워드
    if (currentStep === 4) {
      if (industryKeywords.length === 0) {
        setError('최소 1개 이상의 업종 키워드를 추가해주세요')
        return
      }
      // 조합 생성
      const generated = generateCombinations()
      if (generated.length === 0) return
      setCombinations(generated)
      setCurrentStep(5)
      return
    }
    
    // Step 5: 조합 결과 확인 → 선택
    if (currentStep === 5) {
      setCurrentStep(6)
      return
    }
    
    // Step 6: 키워드 선택 → 검색
    if (currentStep === 6) {
      if (selectedKeywords.size === 0) {
        setError('최소 1개 이상의 키워드를 선택해주세요')
        return
      }
      setCurrentStep(7)
      handleSearch()
      return
    }
  }

  const handleBack = () => {
    setError('')
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const toggleKeywordSelection = (keyword: string) => {
    const newSelected = new Set(selectedKeywords)
    if (newSelected.has(keyword)) {
      newSelected.delete(keyword)
    } else {
      if (newSelected.size >= 5) {
        setError('최대 5개까지만 선택할 수 있습니다')
        return
      }
      newSelected.add(keyword)
    }
    setSelectedKeywords(newSelected)
    setError('')
  }

  // Step 1: 환영 메시지
  const renderStep1 = () => (
    <Stack gap="lg" py="xs">
      <Center>
        <ThemeIcon size={90} radius={90} variant="light" color="yellow" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>
          <Lightbulb size={45} />
        </ThemeIcon>
      </Center>
      
      <Stack gap="xs" ta="center" px="sm">
        <Text size="24px" fw={700} style={{ lineHeight: 1.3 }}>
          숨은 알짜 키워드를<br />찾아보세요!
        </Text>
        <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
          우리 고객들은 항상 대형키워드로만 움직이지 않습니다.<br />
          숨은 알짜키워드를 찾기 위해서 다양한 키워드를 고민하고<br />
          유의미한 검색량을 찾아야 합니다.
        </Text>
      </Stack>

      <Stack gap="sm">
        <Paper p="md" radius="md" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', border: 'none' }}>
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size={40} radius="md" variant="light" color="blue">
              <Sparkles size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600} size="sm">키워드 조합으로 기회 발굴</Text>
              <Text size="xs" c="dimmed">지역, 상품, 업종을 조합하여 숨은 키워드를 찾습니다</Text>
            </div>
          </Group>
        </Paper>
        
        <Paper p="md" radius="md" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', border: 'none' }}>
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size={40} radius="md" variant="light" color="grape">
              <Search size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600} size="sm">실시간 검색량 확인</Text>
              <Text size="xs" c="dimmed">네이버 검색광고 API로 정확한 검색량을 조회합니다</Text>
            </div>
          </Group>
        </Paper>
        
        <Paper p="md" radius="md" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: 'none' }}>
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size={40} radius="md" variant="light" color="green">
              <TrendingUp size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600} size="sm">검색 이력 자동 저장</Text>
              <Text size="xs" c="dimmed">조회한 키워드는 검색 이력에 자동으로 저장됩니다</Text>
            </div>
          </Group>
        </Paper>
      </Stack>
    </Stack>
  )

  // Step 2: 지역 키워드 입력
  const renderStep2 = () => (
    <Stack gap="xl" py="md">
      <Stack gap="xs" ta="center">
        <Group justify="center" gap="sm">
          <ThemeIcon size={36} radius="xl" variant="light" color="blue">
            <MapPin size={20} />
          </ThemeIcon>
        </Group>
        <Text size="24px" fw={700}>지역 키워드를 추가해주세요</Text>
        <Text size="sm" c="dimmed">
          고객들이 검색할 것 같은 지역명을 입력해주세요
        </Text>
        <Text size="xs" c="dimmed" fs="italic">
          예: 강남, 강남역, 서초, 역삼동
        </Text>
      </Stack>

      <Stack gap="sm">
        <Group grow>
          <TextInput
            placeholder="지역명 입력 후 추가 버튼 클릭"
            value={tempInput}
            onChange={(e) => setTempInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addKeyword(locationKeywords, setLocationKeywords)
              }
            }}
            size="md"
            radius="md"
          />
          <Button
            leftSection={<Plus size={18} />}
            onClick={() => addKeyword(locationKeywords, setLocationKeywords)}
            disabled={!tempInput.trim()}
            size="md"
            radius="md"
            style={{ minWidth: 100 }}
          >
            추가
          </Button>
        </Group>

        {locationKeywords.length > 0 && (
          <Paper p="md" radius="md" withBorder>
            <Text size="sm" fw={600} mb="xs" c="dimmed">추가된 키워드 ({locationKeywords.length}개)</Text>
            <Group gap="xs">
              {locationKeywords.map((keyword, index) => (
                <Badge
                  key={index}
                  size="lg"
                  variant="light"
                  color="blue"
                  rightSection={
                    <X
                      size={14}
                      style={{ cursor: 'pointer' }}
                      onClick={() => removeKeyword(index, locationKeywords, setLocationKeywords)}
                    />
                  }
                  style={{ paddingRight: 4 }}
                >
                  {keyword}
                </Badge>
              ))}
            </Group>
          </Paper>
        )}
      </Stack>

      {error && (
        <Alert color="red" radius="md">
          {error}
        </Alert>
      )}
    </Stack>
  )

  // Step 3: 상품 키워드 입력
  const renderStep3 = () => (
    <Stack gap="xl" py="md">
      <Stack gap="xs" ta="center">
        <Group justify="center" gap="sm">
          <ThemeIcon size={36} radius="xl" variant="light" color="grape">
            <Package size={20} />
          </ThemeIcon>
        </Group>
        <Text size="24px" fw={700}>상품/서비스 키워드를 추가해주세요</Text>
        <Text size="sm" c="dimmed">
          제공하는 상품이나 서비스를 입력해주세요
        </Text>
        <Text size="xs" c="dimmed" fs="italic">
          예: 커피, 아메리카노, 케이크, 브런치
        </Text>
      </Stack>

      <Stack gap="sm">
        <Group grow>
          <TextInput
            placeholder="상품/서비스 입력 후 추가 버튼 클릭"
            value={tempInput}
            onChange={(e) => setTempInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addKeyword(productKeywords, setProductKeywords)
              }
            }}
            size="md"
            radius="md"
          />
          <Button
            leftSection={<Plus size={18} />}
            onClick={() => addKeyword(productKeywords, setProductKeywords)}
            disabled={!tempInput.trim()}
            size="md"
            radius="md"
            style={{ minWidth: 100 }}
          >
            추가
          </Button>
        </Group>

        {productKeywords.length > 0 && (
          <Paper p="md" radius="md" withBorder>
            <Text size="sm" fw={600} mb="xs" c="dimmed">추가된 키워드 ({productKeywords.length}개)</Text>
            <Group gap="xs">
              {productKeywords.map((keyword, index) => (
                <Badge
                  key={index}
                  size="lg"
                  variant="light"
                  color="grape"
                  rightSection={
                    <X
                      size={14}
                      style={{ cursor: 'pointer' }}
                      onClick={() => removeKeyword(index, productKeywords, setProductKeywords)}
                    />
                  }
                  style={{ paddingRight: 4 }}
                >
                  {keyword}
                </Badge>
              ))}
            </Group>
          </Paper>
        )}
      </Stack>

      {error && (
        <Alert color="red" radius="md">
          {error}
        </Alert>
      )}
    </Stack>
  )

  // Step 4: 업종 키워드 입력
  const renderStep4 = () => (
    <Stack gap="xl" py="md">
      <Stack gap="xs" ta="center">
        <Group justify="center" gap="sm">
          <ThemeIcon size={36} radius="xl" variant="light" color="green">
            <Building2 size={20} />
          </ThemeIcon>
        </Group>
        <Text size="24px" fw={700}>업종 키워드를 추가해주세요</Text>
        <Text size="sm" c="dimmed">
          업종이나 카테고리를 입력해주세요
        </Text>
        <Text size="xs" c="dimmed" fs="italic">
          예: 카페, 맛집, 디저트카페, 브런치카페
        </Text>
      </Stack>

      <Stack gap="sm">
        <Group grow>
          <TextInput
            placeholder="업종 입력 후 추가 버튼 클릭"
            value={tempInput}
            onChange={(e) => setTempInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addKeyword(industryKeywords, setIndustryKeywords)
              }
            }}
            size="md"
            radius="md"
          />
          <Button
            leftSection={<Plus size={18} />}
            onClick={() => addKeyword(industryKeywords, setIndustryKeywords)}
            disabled={!tempInput.trim()}
            size="md"
            radius="md"
            style={{ minWidth: 100 }}
          >
            추가
          </Button>
        </Group>

        {industryKeywords.length > 0 && (
          <Paper p="md" radius="md" withBorder>
            <Text size="sm" fw={600} mb="xs" c="dimmed">추가된 키워드 ({industryKeywords.length}개)</Text>
            <Group gap="xs">
              {industryKeywords.map((keyword, index) => (
                <Badge
                  key={index}
                  size="lg"
                  variant="light"
                  color="green"
                  rightSection={
                    <X
                      size={14}
                      style={{ cursor: 'pointer' }}
                      onClick={() => removeKeyword(index, industryKeywords, setIndustryKeywords)}
                    />
                  }
                  style={{ paddingRight: 4 }}
                >
                  {keyword}
                </Badge>
              ))}
            </Group>
          </Paper>
        )}
      </Stack>

      {error && (
        <Alert color="red" radius="md">
          {error}
        </Alert>
      )}
    </Stack>
  )

  // Step 5: 조합 결과 미리보기
  const renderStep5 = () => (
    <Stack gap="xl" py="md">
      <Center>
        <ThemeIcon size={80} radius={80} variant="light" color="yellow" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>
          <Sparkles size={40} />
        </ThemeIcon>
      </Center>

      <Stack gap="xs" ta="center">
        <Text size="24px" fw={700}>
          키워드 조합이 완성되었습니다!
        </Text>
        <Text size="sm" c="dimmed">
          총 {combinations.length}개의 키워드 조합이 생성되었습니다
        </Text>
      </Stack>

      <Paper p="xl" radius="md" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', border: 'none' }}>
        <Stack gap="md">
          <Group justify="center" gap="xs">
            <Badge size="lg" variant="filled" color="blue">지역: {locationKeywords.length}개</Badge>
            <Badge size="lg" variant="filled" color="grape">상품: {productKeywords.length}개</Badge>
            <Badge size="lg" variant="filled" color="green">업종: {industryKeywords.length}개</Badge>
          </Group>
          
          <Divider />
          
          <div>
            <Text size="sm" fw={600} mb="xs" ta="center">조합 예시 (일부)</Text>
            <Stack gap="xs">
              {combinations.slice(0, 8).map((combo, index) => (
                <Paper key={index} p="sm" withBorder style={{ textAlign: 'center' }}>
                  <Text size="sm">{combo}</Text>
                </Paper>
              ))}
              {combinations.length > 8 && (
                <Text size="xs" c="dimmed" ta="center">
                  외 {combinations.length - 8}개...
                </Text>
              )}
            </Stack>
          </div>
        </Stack>
      </Paper>

      <Alert color="blue" radius="md" title="다음 단계">
        검색량을 조회할 키워드를 선택해주세요 (최대 5개)
      </Alert>
    </Stack>
  )

  // Step 6: 키워드 선택
  const renderStep6 = () => (
    <Stack gap="xl" py="md">
      <Stack gap="xs" ta="center">
        <Text size="24px" fw={700}>
          검색량을 조회할 키워드를<br />선택해주세요
        </Text>
        <Text size="sm" c="dimmed">
          최대 5개까지 선택 가능합니다
        </Text>
        <Badge size="lg" color="blue">
          선택: {selectedKeywords.size} / 5개
        </Badge>
      </Stack>

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        <Stack gap="xs">
          {combinations.map((combo, index) => (
            <Paper
              key={index}
              p="md"
              radius="md"
              withBorder
              style={{
                cursor: 'pointer',
                borderColor: selectedKeywords.has(combo) ? '#228be6' : '#dee2e6',
                background: selectedKeywords.has(combo) ? 'linear-gradient(135deg, #e7f5ff 0%, #d0ebff 100%)' : 'white',
                transition: 'all 0.2s'
              }}
              onClick={() => toggleKeywordSelection(combo)}
            >
              <Group justify="space-between">
                <Text size="sm">{combo}</Text>
                {selectedKeywords.has(combo) && (
                  <ThemeIcon size="sm" color="blue" variant="light" radius="xl">
                    <CheckCircle2 size={16} />
                  </ThemeIcon>
                )}
              </Group>
            </Paper>
          ))}
        </Stack>
      </div>

      {error && (
        <Alert color="red" radius="md">
          {error}
        </Alert>
      )}
    </Stack>
  )

  // Step 7: 검색 중
  const renderStep7 = () => (
    <Center style={{ minHeight: 300 }}>
      <Stack gap="xl" align="center">
        <Loader size={80} />
        <Stack gap="xs" align="center">
          <Text size="24px" fw={700}>검색량을 조회하고 있습니다...</Text>
          <Text size="sm" c="dimmed" ta="center">
            네이버 검색광고 API에서 데이터를 가져오는 중입니다
          </Text>
        </Stack>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <Progress value={100} animated radius="md" size="lg" />
        </div>
      </Stack>
    </Center>
  )

  // Step 8: 검색 결과
  const renderStep8 = () => {
    const formatNumber = (num: number | string) => {
      if (typeof num === 'string') return num
      return num.toLocaleString()
    }

    const getTotalVolume = (item: SearchVolumeData) => {
      const pc = typeof item.monthly_pc_qc_cnt === 'string' ? 5 : item.monthly_pc_qc_cnt
      const mobile = typeof item.monthly_mobile_qc_cnt === 'string' ? 5 : item.monthly_mobile_qc_cnt
      return pc + mobile
    }

    return (
      <Stack gap="lg" py="xs">
        <Center>
          <ThemeIcon size={80} radius={80} variant="light" color="green" style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' }}>
            <CheckCircle2 size={40} />
          </ThemeIcon>
        </Center>

        <Stack gap={4} ta="center">
          <Text size="24px" fw={700}>검색량 조회 완료!</Text>
          <Text size="sm" c="dimmed">
            {searchResults.length}개 키워드의 검색량을 조회했습니다
          </Text>
        </Stack>

        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <Stack gap="xs">
            {searchResults.map((result, index) => (
              <Paper key={index} p="sm" radius="md" withBorder>
                <Group justify="space-between" mb={4}>
                  <Text fw={600} size="sm">{result.keyword}</Text>
                  <Badge size="lg" variant="light" color="blue">
                    월 {formatNumber(getTotalVolume(result))}회
                  </Badge>
                </Group>
                
                <Group gap="lg" mb={4}>
                  <Group gap={6}>
                    <Monitor size={14} color="#228be6" />
                    <Text size="xs" c="dimmed">
                      PC: {formatNumber(result.monthly_pc_qc_cnt)}
                    </Text>
                  </Group>
                  <Group gap={6}>
                    <Smartphone size={14} color="#228be6" />
                    <Text size="xs" c="dimmed">
                      모바일: {formatNumber(result.monthly_mobile_qc_cnt)}
                    </Text>
                  </Group>
                  <Group gap={6}>
                    <Text size="xs" c="dimmed">경쟁: {result.comp_idx}</Text>
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        </div>

        <Alert color="blue" radius="md" title="💡 이제 어떻게 하나요?" p="sm">
          <Text size="xs">조회한 키워드는 "키워드 검색량조회" 페이지의 검색 이력에서 언제든지 다시 확인할 수 있습니다!</Text>
        </Alert>

        <Button
          size="md"
          fullWidth
          radius="md"
          onClick={() => {
            router.push('/dashboard/naver/keywords')
            handleClose()
            onComplete?.()
          }}
        >
          검색 이력 보러가기
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
        currentStep <= 7 ? (
          <Stack gap={8}>
            <Text size="sm" c="dimmed">
              추가 키워드 발굴하기 ({currentStep}/{totalSteps})
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
        {currentStep === 5 && renderStep5()}
        {currentStep === 6 && renderStep6()}
        {currentStep === 7 && renderStep7()}
        {currentStep === 8 && renderStep8()}

        {currentStep > 1 && currentStep < 7 && (
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
              {currentStep === 4 ? '조합 생성하기' : currentStep === 6 ? '검색량 조회하기' : '다음'}
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
