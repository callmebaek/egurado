'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Text,
  Button,
  Paper,
  Group,
  Progress,
  Alert,
  ThemeIcon,
  Grid,
  Center,
  Loader,
  TextInput,
  Badge,
  Radio,
} from '@mantine/core';
import { 
  Store, 
  CheckCircle2, 
  ChevronRight,
  TrendingUp,
  Search,
  Lightbulb,
  Users,
  Sparkles
} from 'lucide-react';
import { api } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface CompetitorAnalysisModalProps {
  opened: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface RegisteredStore {
  id: string;
  place_id: string;
  name: string;
  address: string;
  platform: string;
  thumbnail?: string;
}

interface KeywordHistory {
  id: string;
  input_keywords: string[];
  extracted_keywords: { keyword: string; volume: number }[];
  created_at: string;
}

export default function CompetitorAnalysisModal({
  opened,
  onClose,
  onComplete,
}: CompetitorAnalysisModalProps) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [stores, setStores] = useState<RegisteredStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null);
  
  // 키워드 선택
  const [keywordMode, setKeywordMode] = useState<'history' | 'manual'>('history');
  const [keyword, setKeyword] = useState('');
  const [keywordHistory, setKeywordHistory] = useState<KeywordHistory[]>([]);
  const [selectedHistoryKeyword, setSelectedHistoryKeyword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 3;

  // 매장 목록 로드
  useEffect(() => {
    if (opened && currentStep === 1) {
      loadStores();
    }
  }, [opened, currentStep]);

  // 타겟키워드 로드
  useEffect(() => {
    if (selectedStore && currentStep === 2) {
      loadKeywordHistory();
    }
  }, [selectedStore, currentStep]);

  const loadStores = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = getToken();
      if (!token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const response = await fetch(api.stores.list(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('매장 목록 조회에 실패했습니다.');
      }

      const data = await response.json();
      const naverStores = data.stores.filter((store: RegisteredStore) => store.platform === 'naver');
      setStores(naverStores);

      if (naverStores.length === 0) {
        setError('등록된 네이버 플레이스 매장이 없습니다.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '매장 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadKeywordHistory = async () => {
    if (!selectedStore) return;

    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(api.targetKeywords.history(selectedStore.id), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setKeywordHistory(data.histories || []);
      }
    } catch (error) {
      console.error('[경쟁매장 분석] 키워드 히스토리 로드 실패:', error);
    }
  };

  const handleNext = () => {
    setError('');
    
    // Step 1: 매장 선택
    if (currentStep === 1) {
      if (!selectedStore) {
        setError('매장을 선택해주세요');
        return;
      }
      setCurrentStep(2);
      return;
    }
    
    // Step 2: 키워드 선택
    if (currentStep === 2) {
      const finalKeyword = keywordMode === 'history' ? selectedHistoryKeyword : keyword;
      if (!finalKeyword.trim()) {
        setError('키워드를 입력하거나 선택해주세요');
        return;
      }
      setCurrentStep(3);
      return;
    }
    
    // Step 3: 분석 시작
    if (currentStep === 3) {
      handleStartAnalysis();
      return;
    }
  };

  const handleStartAnalysis = () => {
    if (!selectedStore) return;

    const finalKeyword = keywordMode === 'history' ? selectedHistoryKeyword : keyword;
    
    // 분석 완료 처리
    if (onComplete) onComplete();
    
    // 경쟁매장 분석 페이지로 이동 (URL 파라미터로 storeId와 keyword 전달)
    handleClose();
    router.push(`/dashboard/naver/competitors?storeId=${selectedStore.id}&keyword=${encodeURIComponent(finalKeyword.trim())}&autoStart=true`);
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(currentStep - 1);
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedStore(null);
    setKeyword('');
    setSelectedHistoryKeyword('');
    setKeywordMode('history');
    setError('');
    onClose();
  };

  // Step 1: 매장 선택
  const renderStep1 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        어떤 매장을 기준으로 분석할까요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        선택하신 매장의 경쟁 상황을 분석해드립니다
      </Text>

      {loading ? (
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
                      <Store size={24} />
                    </ThemeIcon>
                  )}
                  <div style={{ flex: 1 }}>
                    <Text fw={600} size="sm">{store.name}</Text>
                    <Text size="xs" c="dimmed">{store.address}</Text>
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
  );

  // Step 2: 키워드 선택
  const renderStep2 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        어떤 키워드로 경쟁사를 찾아볼까요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        해당 키워드로 상위 20개 매장을 분석합니다
      </Text>

      <Radio.Group value={keywordMode} onChange={(value) => setKeywordMode(value as 'history' | 'manual')}>
        <Stack gap="md">
          <Paper
            p="md"
            radius="md"
            style={{
              cursor: 'pointer',
              border: keywordMode === 'history' ? '2px solid #635bff' : '1px solid #e0e7ff',
              background: keywordMode === 'history' ? 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)' : '#ffffff',
              transition: 'all 0.2s'
            }}
            onClick={() => setKeywordMode('history')}
          >
            <Group justify="space-between">
              <div style={{ flex: 1 }}>
                <Radio
                  value="history"
                  label="과거 추출한 키워드에서 선택"
                  description="타겟키워드 분석에서 찾은 키워드를 사용합니다"
                  styles={{ label: { fontWeight: 600 } }}
                />
              </div>
              {keywordMode === 'history' && (
                <ThemeIcon size={28} radius="xl" color="brand">
                  <CheckCircle2 size={18} />
                </ThemeIcon>
              )}
            </Group>
          </Paper>
          
          <Paper
            p="md"
            radius="md"
            style={{
              cursor: 'pointer',
              border: keywordMode === 'manual' ? '2px solid #635bff' : '1px solid #e0e7ff',
              background: keywordMode === 'manual' ? 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)' : '#ffffff',
              transition: 'all 0.2s'
            }}
            onClick={() => setKeywordMode('manual')}
          >
            <Group justify="space-between">
              <div style={{ flex: 1 }}>
                <Radio
                  value="manual"
                  label="직접 입력"
                  description="새로운 키워드를 입력합니다"
                  styles={{ label: { fontWeight: 600 } }}
                />
              </div>
              {keywordMode === 'manual' && (
                <ThemeIcon size={28} radius="xl" color="brand">
                  <CheckCircle2 size={18} />
                </ThemeIcon>
              )}
            </Group>
          </Paper>
        </Stack>
      </Radio.Group>

      {keywordMode === 'history' ? (
        keywordHistory.length > 0 ? (
          <Stack gap="xs">
            <Text size="sm" fw={500}>추출된 키워드 선택</Text>
            <Paper p="md" radius="md" withBorder>
              <Group gap="xs">
                {keywordHistory.flatMap(history => 
                  history.extracted_keywords.slice(0, 10).map((kw, idx) => (
                    <Badge
                      key={`${history.id}-${idx}`}
                      size="lg"
                      variant={selectedHistoryKeyword === kw.keyword ? 'filled' : 'light'}
                      color="brand"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedHistoryKeyword(kw.keyword)}
                    >
                      {kw.keyword}
                    </Badge>
                  ))
                )}
              </Group>
            </Paper>
          </Stack>
        ) : (
          <Alert icon={<Lightbulb size={16} />} color="blue" variant="light">
            추출된 키워드가 없습니다. "직접 입력"을 선택하거나 먼저 타겟키워드를 분석해주세요.
          </Alert>
        )
      ) : (
        <TextInput
          size="lg"
          placeholder="예: 강남맛집, 성수카페"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setError('');
          }}
          error={error}
          leftSection={<Search size={20} />}
          styles={{
            input: {
              fontSize: '16px',
              padding: '24px 16px 24px 44px',
            }
          }}
        />
      )}

      {error && (
        <Alert color="red" title="오류">
          {error}
        </Alert>
      )}

      <Alert color="blue" title="💡 입력 팁">
        <Text size="xs">
          키워드가 구체적일수록 정확한 경쟁사를 찾을 수 있어요!
        </Text>
      </Alert>
    </Stack>
  );

  // Step 3: 분석 시작
  const renderStep3 = () => {
    const finalKeyword = keywordMode === 'history' ? selectedHistoryKeyword : keyword;
    
    return (
      <Stack gap="md">
        <div style={{ textAlign: 'center' }}>
          <ThemeIcon
            size={80}
            radius="xl"
            variant="gradient"
            gradient={{ from: 'brand', to: 'brand.7', deg: 135 }}
            mb="md"
            mx="auto"
          >
            <Users size={40} />
          </ThemeIcon>
          
          <Text size="lg" fw={600} mb="sm">
            지금 바로 분석을 시작할까요?
          </Text>
          <Text size="sm" c="dimmed">
            경쟁매장 분석 페이지에서 상세한 분석을 진행합니다
          </Text>
        </div>

        <Paper withBorder p="xl" radius="md" bg="#f9fafb">
          <Stack gap="lg">
            <div>
              <Text fw={600} size="md" mb="sm" c="brand">📊 분석 내용</Text>
              <Text size="sm" style={{ lineHeight: 1.6 }}>
                선택하신 <strong>"{finalKeyword}"</strong> 키워드로 
                플레이스 상위노출 중인 <strong>20개 매장</strong>의 현재 플레이스 활동 전반적인 내용을 
                한번에 보실 수 있습니다.
              </Text>
            </div>

            <div>
              <Text fw={600} size="md" mb="sm" c="brand">🎯 분석 항목</Text>
              <Stack gap="xs">
                <Text size="sm">✓ 매장별 순위 및 기본 정보</Text>
                <Text size="sm">✓ 리뷰 개수 및 평점</Text>
                <Text size="sm">✓ 플레이스 진단 점수</Text>
                <Text size="sm">✓ 경쟁 강도 비교</Text>
                <Text size="sm">✓ 개선 권장사항</Text>
              </Stack>
            </div>
          </Stack>
        </Paper>

        <Alert color="grape" variant="light">
          <Group gap="sm">
            <Sparkles size={20} />
            <Text size="sm" fw={500}>
              💡 "나만 잘하는게 아니라, 남들은 어떻게 하는지 알아야 합니다"
            </Text>
          </Group>
        </Alert>

        {/* 선택 정보 요약 */}
        <Paper p="sm" radius="md" withBorder bg="#f9fafb">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">매장</Text>
            <Text size="xs" fw={500}>{selectedStore?.name}</Text>
          </Group>
          <Group justify="space-between" mt="xs">
            <Text size="xs" c="dimmed">키워드</Text>
            <Text size="xs" fw={500}>{finalKeyword}</Text>
          </Group>
        </Paper>
      </Stack>
    );
  };

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
              {currentStep} / {totalSteps} 단계
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
        <div style={{ minHeight: 400 }}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* 버튼 */}
        <Group justify="space-between">
          {currentStep > 1 ? (
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
          
          <Button
            variant="gradient"
            gradient={{ from: 'brand', to: 'brand.7', deg: 135 }}
            onClick={handleNext}
            disabled={
              loading || 
              (currentStep === 1 && !selectedStore) ||
              (currentStep === 2 && (keywordMode === 'history' ? !selectedHistoryKeyword : !keyword.trim()))
            }
            rightSection={currentStep < 3 ? <ChevronRight size={16} /> : <TrendingUp size={16} />}
            style={{ minWidth: 120 }}
          >
            {currentStep === 3 ? '분석 시작' : '다음'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
