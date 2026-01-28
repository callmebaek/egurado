"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
  Badge,
  Select,
  Switch,
  Paper,
  Loader,
  Box,
  TextInput,
  Progress,
  ActionIcon,
  Grid,
  Flex,
  ThemeIcon,
  Alert,
  Center,
} from '@mantine/core'
import { 
  Store, 
  TrendingUp, 
  Search, 
  Clock, 
  Bell, 
  CheckCircle2,
  ChevronRight,
  Plus,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/config'
import { useToast } from '@/components/ui/use-toast'

interface RankTrackingModalProps {
  opened: boolean
  onClose: () => void
  onComplete?: () => void
}

interface RegisteredStore {
  id: string
  name: string
  place_id: string
  thumbnail?: string
}

interface ExtractedKeyword {
  keyword: string
  total_volume: number
  comp_idx: string
  rank?: number
  total_count?: number
}

interface KeywordOption {
  keyword: string
  volume?: number
  isCustom?: boolean
}

export function RankTrackingModal({ opened, onClose, onComplete }: RankTrackingModalProps) {
  const { getToken } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  
  // Step 1: 매장 선택
  const [stores, setStores] = useState<RegisteredStore[]>([])
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null)
  const [loadingStores, setLoadingStores] = useState(false)
  
  // Step 2: 키워드 선택
  const [keywordOptions, setKeywordOptions] = useState<KeywordOption[]>([])
  const [selectedKeyword, setSelectedKeyword] = useState<string>('')
  const [customKeyword, setCustomKeyword] = useState<string>('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [loadingKeywords, setLoadingKeywords] = useState(false)
  
  // Step 3: 수집 주기
  const [updateFrequency, setUpdateFrequency] = useState<'daily_once' | 'daily_twice' | 'daily_thrice'>('daily_once')
  
  // Step 4: 수집 시간
  const [updateTimes, setUpdateTimes] = useState<number[]>([9])
  
  // Step 5: 알림 설정
  const [notificationEnabled, setNotificationEnabled] = useState(false)
  const [notificationType, setNotificationType] = useState<'email' | 'sms' | 'kakao' | ''>('')
  
  // 에러 메시지
  const [error, setError] = useState<string>('')

  const totalSteps = 6

  // 매장 목록 로드
  useEffect(() => {
    if (opened && currentStep === 1) {
      loadStores()
    }
  }, [opened, currentStep])

  // 타겟키워드 로드
  useEffect(() => {
    if (selectedStore && currentStep === 2) {
      loadTargetKeywords()
    }
  }, [selectedStore, currentStep])

  const loadStores = async () => {
    setLoadingStores(true)
    try {
      const token = getToken()
      if (!token) throw new Error('인증이 필요합니다')

      const response = await fetch(api.stores.list(), {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('매장 목록을 불러올 수 없습니다')

      const data = await response.json()
      const naverStores = data.stores?.filter((s: any) => s.platform === 'naver') || []
      setStores(naverStores)
    } catch (err: any) {
      console.error('매장 로드 오류:', err)
      setError(err.message)
    } finally {
      setLoadingStores(false)
    }
  }

  const loadTargetKeywords = async () => {
    if (!selectedStore) return
    
    setLoadingKeywords(true)
    try {
      const token = getToken()
      if (!token) throw new Error('인증이 필요합니다')

      console.log('🔍 타겟키워드 히스토리 로드 시작:', selectedStore.id, selectedStore.name)
      
      const response = await fetch(api.targetKeywords.history(selectedStore.id), {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      console.log('📡 API 응답 상태:', response.status, response.ok)

      if (!response.ok) {
        console.log('⚠️ 타겟키워드 히스토리가 없거나 에러:', response.status)
        setKeywordOptions([])
        return
      }

      const data = await response.json()
      console.log('📦 받은 히스토리 데이터:', data)
      
      const histories = data.histories || []
      console.log('📋 히스토리 배열:', histories)
      
      if (histories && histories.length > 0) {
        // 가장 최근 히스토리의 추출된 키워드 가져오기 (상위 10개)
        const latestHistory = histories[0]
        console.log('✅ 최신 히스토리:', latestHistory)
        
        const extractedKeywords: ExtractedKeyword[] = latestHistory.extracted_keywords || []
        console.log('🎯 추출된 키워드:', extractedKeywords)
        
        const options: KeywordOption[] = extractedKeywords
          .slice(0, 10)
          .map(k => ({
            keyword: k.keyword,
            volume: k.total_volume,
            isCustom: false
          }))
        
        console.log('✨ 최종 키워드 옵션:', options)
        setKeywordOptions(options)
      } else {
        console.log('⚠️ 히스토리 배열이 비어있음')
        setKeywordOptions([])
      }
    } catch (err: any) {
      console.error('❌ 타겟키워드 로드 오류:', err)
      setKeywordOptions([])
    } finally {
      setLoadingKeywords(false)
    }
  }

  const handleNext = async () => {
    setError('')

    // Step 1 검증: 매장 선택
    if (currentStep === 1) {
      if (!selectedStore) {
        setError('매장을 선택해주세요')
        return
      }
      setCurrentStep(2)
      return
    }

    // Step 2 검증: 키워드 선택
    if (currentStep === 2) {
      const finalKeyword = showCustomInput ? customKeyword.trim() : selectedKeyword
      if (!finalKeyword) {
        setError('키워드를 선택하거나 입력해주세요')
        return
      }
      setCurrentStep(3)
      return
    }

    // Step 3: 수집 주기 설정 (자동으로 시간 설정)
    if (currentStep === 3) {
      if (updateFrequency === 'daily_once') {
        setUpdateTimes([9])
      } else if (updateFrequency === 'daily_twice') {
        setUpdateTimes([9, 18])
      } else {
        setUpdateTimes([9, 14, 20])
      }
      setCurrentStep(4)
      return
    }

    // Step 4: 수집 시간 확인
    if (currentStep === 4) {
      setCurrentStep(5)
      return
    }

    // Step 5: 알림 설정 확인 후 추적 시작
    if (currentStep === 5) {
      if (notificationEnabled && !notificationType) {
        setError('알림 방법을 선택해주세요')
        return
      }
      await handleStartTracking()
      return
    }

    // Step 6: 완료 - 키워드 순위 추적 페이지로 이동
    if (currentStep === 6) {
      router.push('/dashboard/naver/metrics-tracker')
      handleClose()
      return
    }
  }

  const handleStartTracking = async () => {
    setIsLoading(true)
    setError('')

    try {
      const token = getToken()
      if (!token) throw new Error('인증이 필요합니다')

      const finalKeyword = showCustomInput ? customKeyword.trim() : selectedKeyword

      // 1. 먼저 순위를 조회하여 keyword_id를 얻습니다
      const rankResponse = await fetch(api.naver.checkRank(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          place_id: selectedStore!.place_id,
          keyword: finalKeyword,
          store_id: selectedStore!.id
        })
      })

      if (!rankResponse.ok) {
        throw new Error('키워드 순위를 확인할 수 없습니다')
      }

      const rankData = await rankResponse.json()

      // 2. keywords 테이블에서 keyword_id 가져오기
      const keywordsResponse = await fetch(api.naver.keywords(selectedStore!.id), {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!keywordsResponse.ok) {
        throw new Error('키워드 정보를 가져올 수 없습니다')
      }

      const keywordsData = await keywordsResponse.json()
      const keywords = keywordsData.keywords || []
      const keywordData = keywords.find((k: any) => k.keyword === finalKeyword)

      if (!keywordData) {
        throw new Error('키워드를 찾을 수 없습니다')
      }

      // 3. 추적 추가
      const trackingPayload = {
        store_id: selectedStore!.id,
        keyword_id: keywordData.id,
        keyword: finalKeyword,
        update_frequency: updateFrequency,
        update_times: updateTimes,
        notification_enabled: notificationEnabled,
        notification_type: notificationEnabled ? notificationType : null
      }

      const trackingResponse = await fetch(api.metrics.create(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(trackingPayload)
      })

      if (!trackingResponse.ok) {
        const errorText = await trackingResponse.text()
        let errorMessage = '추적 추가에 실패했습니다'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.detail || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      // 성공!
      setCurrentStep(6)
    } catch (err: any) {
      console.error('추적 시작 오류:', err)
      setError(err.message || '추적 시작 중 오류가 발생했습니다')
      toast({
        title: '❌ 오류',
        description: err.message || '추적 시작 중 오류가 발생했습니다',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setError('')
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleClose = () => {
    // 상태 초기화
    setCurrentStep(1)
    setSelectedStore(null)
    setSelectedKeyword('')
    setCustomKeyword('')
    setShowCustomInput(false)
    setUpdateFrequency('daily_once')
    setUpdateTimes([9])
    setNotificationEnabled(false)
    setNotificationType('')
    setError('')
    
    onClose()
    
    if (currentStep === 6 && onComplete) {
      onComplete()
    }
  }

  const renderStep1 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        어떤 매장의 순위를 추적할까요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        순위를 추적할 네이버 플레이스 매장을 선택해주세요
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
                  border: selectedStore?.id === store.id 
                    ? '2px solid #635bff' 
                    : '1px solid #e0e7ff',
                  background: selectedStore?.id === store.id
                    ? 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)'
                    : '#ffffff',
                  transition: 'all 0.2s'
                }}
                onClick={() => setSelectedStore(store)}
              >
                <Group gap="md">
                  {store.thumbnail ? (
                    <img 
                      src={store.thumbnail} 
                      alt={store.name}
                      style={{ 
                        width: 48, 
                        height: 48, 
                        borderRadius: 8,
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <ThemeIcon size={48} radius="md" variant="light" color="brand">
                      <Store size={24} />
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

  const renderStep2 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        어떤 키워드를 추적할까요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        순위를 추적할 검색 키워드를 선택하거나 직접 입력하세요
      </Text>

      {loadingKeywords ? (
        <Center style={{ minHeight: 200 }}>
          <Loader size="lg" />
        </Center>
      ) : (
        <>
          {/* 과거 추출한 타겟키워드 목록 (항상 표시) */}
          {keywordOptions.length > 0 && (
            <Paper p="md" radius="md" style={{ border: '1px solid #e0e7ff' }}>
              <Group justify="space-between" mb="sm">
                <Text size="sm" fw={600}>🎯 과거 추출한 키워드</Text>
                <Badge size="sm" variant="light" color="brand">
                  최신 {keywordOptions.length}개
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" mb="md">
                최근 추출한 타겟키워드 중 하나를 선택하세요
              </Text>
              <Stack gap="xs">
                {keywordOptions.map((option, index) => (
                  <Paper
                    key={index}
                    p="sm"
                    radius="md"
                    style={{
                      cursor: 'pointer',
                      border: selectedKeyword === option.keyword 
                        ? '2px solid #635bff' 
                        : '1px solid #e8e8e8',
                      background: selectedKeyword === option.keyword
                        ? 'rgba(99, 91, 255, 0.05)'
                        : '#ffffff',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => {
                      setSelectedKeyword(option.keyword)
                      // 직접 입력창 닫기
                      if (showCustomInput) {
                        setShowCustomInput(false)
                        setCustomKeyword('')
                      }
                    }}
                  >
                    <Group justify="space-between">
                      <Group gap="xs">
                        <Text fw={600} size="sm">{option.keyword}</Text>
                        {selectedKeyword === option.keyword && (
                          <ThemeIcon size={20} radius="xl" color="brand" variant="light">
                            <CheckCircle2 size={14} />
                          </ThemeIcon>
                        )}
                      </Group>
                      <Badge variant="light" color="violet" size="sm">
                        월 {option.volume?.toLocaleString() || 0}회
                      </Badge>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          )}

          {/* 직접 입력 토글 버튼 */}
          <Flex direction="column" gap="sm">
            <Button
              variant={showCustomInput ? 'filled' : 'light'}
              color="gray"
              leftSection={<Plus size={16} />}
              onClick={() => {
                setShowCustomInput(!showCustomInput)
                // 직접 입력 켤 때 기존 선택 초기화
                if (!showCustomInput) {
                  setSelectedKeyword('')
                } else {
                  setCustomKeyword('')
                }
              }}
              fullWidth
            >
              {showCustomInput ? '입력창 닫기' : '직접 키워드 입력하기'}
            </Button>

            {showCustomInput && (
              <Paper p="md" radius="md" style={{ border: '1px solid #e0e7ff' }}>
                <TextInput
                  size="md"
                  placeholder="예: 강남 카페"
                  value={customKeyword}
                  onChange={(e) => setCustomKeyword(e.target.value)}
                  leftSection={<Search size={16} />}
                  styles={{
                    input: {
                      borderColor: '#e0e7ff',
                      '&:focus': { borderColor: '#635bff' }
                    }
                  }}
                />
                <Text size="xs" c="dimmed" mt="xs">
                  💡 네이버 지도에서 검색할 키워드를 정확히 입력하세요
                </Text>
              </Paper>
            )}
          </Flex>

          {/* 타겟키워드가 없을 때 안내 메시지 */}
          {keywordOptions.length === 0 && !showCustomInput && (
            <Alert color="blue" title="💡 안내">
              <Text size="xs">
                아직 추출된 타겟키워드가 없습니다. "직접 키워드 입력하기"를 클릭하여 키워드를 입력하세요.
              </Text>
            </Alert>
          )}
        </>
      )}

      {error && (
        <Alert color="red" title="오류">
          {error}
        </Alert>
      )}
    </Stack>
  )

  const renderStep3 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        얼마나 자주 순위를 확인할까요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        자동으로 순위를 수집할 주기를 선택하세요
      </Text>

      <Stack gap="sm">
        {[
          { value: 'daily_once' as const, label: '하루 1회', desc: '매일 1번 순위 확인' },
          { value: 'daily_twice' as const, label: '하루 2회', desc: '매일 2번 순위 확인' },
          { value: 'daily_thrice' as const, label: '하루 3회', desc: '매일 3번 순위 확인' },
        ].map((option) => (
          <Paper
            key={option.value}
            p="md"
            radius="md"
            style={{
              cursor: 'pointer',
              border: updateFrequency === option.value 
                ? '2px solid #635bff' 
                : '1px solid #e0e7ff',
              background: updateFrequency === option.value
                ? 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)'
                : '#ffffff',
              transition: 'all 0.2s'
            }}
            onClick={() => setUpdateFrequency(option.value)}
          >
            <Group justify="space-between">
              <div>
                <Text fw={600} size="sm">{option.label}</Text>
                <Text size="xs" c="dimmed">{option.desc}</Text>
              </div>
              {updateFrequency === option.value && (
                <ThemeIcon size={32} radius="xl" color="brand">
                  <CheckCircle2 size={20} />
                </ThemeIcon>
              )}
            </Group>
          </Paper>
        ))}
      </Stack>
    </Stack>
  )

  const renderStep4 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        몇 시에 확인할까요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        순위를 수집할 시간을 설정하세요
      </Text>

      <Paper p="md" radius="md" style={{ border: '1px solid #e0e7ff' }}>
        <Stack gap="md">
          {updateTimes.map((time, index) => (
            <div key={index}>
              <Group gap="sm" mb="xs">
                <Badge size="lg" variant="light" color="brand" style={{ width: 60 }}>
                  {index + 1}차
                </Badge>
                <Select
                  size="md"
                  flex={1}
                  value={time.toString()}
                  onChange={(value) => {
                    const newTimes = [...updateTimes]
                    newTimes[index] = parseInt(value || '9')
                    setUpdateTimes(newTimes)
                  }}
                  data={Array.from({ length: 24 }, (_, i) => ({
                    value: i.toString(),
                    label: `${i}시`
                  }))}
                  styles={{
                    input: {
                      borderColor: '#e0e7ff',
                      '&:focus': { borderColor: '#635bff' }
                    }
                  }}
                />
              </Group>
            </div>
          ))}
        </Stack>
      </Paper>

      <Alert color="blue" title="💡 추천 시간">
        <Text size="xs">
          {updateFrequency === 'daily_once' && '오전 9시 - 업무 시작 전 확인'}
          {updateFrequency === 'daily_twice' && '오전 9시, 오후 6시 - 업무 시작/종료 시'}
          {updateFrequency === 'daily_thrice' && '오전 9시, 오후 2시, 저녁 8시 - 아침/점심/저녁 시간대'}
        </Text>
      </Alert>
    </Stack>
  )

  const renderStep5 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        순위 변동 시 알림을 받으시겠어요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        순위가 변동되면 즉시 알림을 받을 수 있습니다
      </Text>

      <Paper p="md" radius="md" style={{ border: '1px solid #e0e7ff' }}>
        <Group justify="space-between" mb="md">
          <div>
            <Text size="sm" fw={600}>알림 받기</Text>
            <Text size="xs" c="dimmed">순위 변동 시 알림을 받습니다</Text>
          </div>
          <Switch
            size="lg"
            color="brand"
            checked={notificationEnabled}
            onChange={(event) => {
              const checked = event.currentTarget.checked
              setNotificationEnabled(checked)
              if (!checked) {
                setNotificationType('')
                setError('')
              }
            }}
          />
        </Group>

        {notificationEnabled && (
          <Box pl="md" style={{ borderLeft: '2px solid #635bff' }}>
            <Text size="sm" fw={500} mb="xs">알림 방법</Text>
            <Stack gap="xs">
              {[
                { value: 'email' as const, label: '📧 이메일', desc: '이메일로 알림 받기' },
                { value: 'sms' as const, label: '📱 SMS', desc: '문자 메시지로 알림 받기' },
                { value: 'kakao' as const, label: '💬 카카오톡', desc: '카카오톡으로 알림 받기' },
              ].map((option) => (
                <Paper
                  key={option.value}
                  p="sm"
                  radius="md"
                  style={{
                    cursor: 'pointer',
                    border: notificationType === option.value 
                      ? '2px solid #635bff' 
                      : '1px solid #e8e8e8',
                    background: notificationType === option.value
                      ? 'rgba(99, 91, 255, 0.05)'
                      : '#ffffff',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setNotificationType(option.value)}
                >
                  <Group justify="space-between">
                    <div>
                      <Text fw={600} size="sm">{option.label}</Text>
                      <Text size="xs" c="dimmed">{option.desc}</Text>
                    </div>
                    {notificationType === option.value && (
                      <ThemeIcon size={24} radius="xl" color="brand" variant="light">
                        <CheckCircle2 size={16} />
                      </ThemeIcon>
                    )}
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}
      </Paper>

      {error && (
        <Alert color="red" title="오류">
          {error}
        </Alert>
      )}

      {!notificationEnabled && (
        <Alert color="gray" title="💡 알림 설정">
          <Text size="xs">
            알림을 받지 않아도 언제든지 대시보드에서 순위를 확인할 수 있습니다
          </Text>
        </Alert>
      )}
    </Stack>
  )

  const renderStep6 = () => (
    <Stack gap="xl" align="center">
      <ThemeIcon size={80} radius="xl" color="brand" variant="light">
        <Sparkles size={40} />
      </ThemeIcon>
      
      <div style={{ textAlign: 'center' }}>
        <Text size="xl" fw={700} mb="xs">
          추적이 시작되었습니다!
        </Text>
        <Text size="sm" c="dimmed">
          설정한 시간에 자동으로 순위를 수집합니다
        </Text>
      </div>

      <Paper p="lg" radius="md" style={{ 
        border: '1px solid #e0e7ff',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        width: '100%'
      }}>
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">매장</Text>
            <Text size="sm" fw={600}>{selectedStore?.name}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">키워드</Text>
            <Text size="sm" fw={600}>
              {showCustomInput ? customKeyword : selectedKeyword}
            </Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">수집 주기</Text>
            <Text size="sm" fw={600}>
              {updateFrequency === 'daily_once' && '하루 1회'}
              {updateFrequency === 'daily_twice' && '하루 2회'}
              {updateFrequency === 'daily_thrice' && '하루 3회'}
            </Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">수집 시간</Text>
            <Text size="sm" fw={600}>
              {updateTimes.map(t => `${t}시`).join(', ')}
            </Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">알림</Text>
            <Text size="sm" fw={600}>
              {notificationEnabled 
                ? `${notificationType === 'email' ? '이메일' : notificationType === 'sms' ? 'SMS' : '카카오톡'}`
                : '설정 안 함'}
            </Text>
          </Group>
        </Stack>
      </Paper>

      <Alert color="blue" title="📊 순위 확인하기" style={{ width: '100%' }}>
        <Text size="xs">
          키워드 순위 추적 페이지에서 실시간 순위와 변화 추이를 확인할 수 있습니다
        </Text>
      </Alert>
    </Stack>
  )

  return (
    <Modal
      opened={opened}
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
              {currentStep < 6 ? `${currentStep} / ${totalSteps - 1} 단계` : '완료'}
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
          {currentStep > 1 && currentStep < 6 ? (
            <Button 
              variant="light" 
              color="gray"
              onClick={handleBack}
              disabled={isLoading}
            >
              이전
            </Button>
          ) : (
            <div />
          )}
          
          <Button
            variant="gradient"
            gradient={{ from: 'brand', to: 'brand.7', deg: 135 }}
            onClick={handleNext}
            disabled={isLoading || (currentStep === 1 && !selectedStore)}
            rightSection={
              isLoading ? (
                <Loader size={16} color="white" />
              ) : currentStep < 6 ? (
                <ChevronRight size={16} />
              ) : null
            }
            style={{ minWidth: 120 }}
          >
            {isLoading 
              ? '처리 중...' 
              : currentStep === 5 
                ? '추적 시작' 
                : currentStep === 6 
                  ? '순위 확인하러 가기'
                  : '다음'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
