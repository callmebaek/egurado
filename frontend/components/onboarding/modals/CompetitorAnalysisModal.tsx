'use client';

import { useState, useEffect } from 'react';
import { Modal, Text, Button, Stack, TextInput, Group, Card, Loader, Alert, Badge, Radio } from '@mantine/core';
import { 
  Target,
  Search,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Store,
  Lightbulb
} from 'lucide-react';
import { api } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface CompetitorAnalysisModalProps {
  opened: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface Store {
  id: string;
  store_name: string;
  place_id: string;
  thumbnail?: string;
}

interface KeywordHistory {
  id: string;
  input_keywords: string[];
  extracted_keywords: { keyword: string; volume: number }[];
  created_at: string;
}

export default function CompetitorAnalysisModal({ opened, onClose, onComplete }: CompetitorAnalysisModalProps) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [keyword, setKeyword] = useState('');
  const [keywordHistory, setKeywordHistory] = useState<KeywordHistory[]>([]);
  const [keywordMode, setKeywordMode] = useState<'history' | 'manual'>('history');
  const [selectedHistoryKeyword, setSelectedHistoryKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleClose = () => {
    setStep(1);
    setSelectedStore(null);
    setKeyword('');
    setSelectedHistoryKeyword('');
    setKeywordMode('history');
    setError('');
    setResult(null);
    onClose();
  };

  // Step 1: 매장 로드
  useEffect(() => {
    if (opened && step === 1) {
      loadStores();
    }
  }, [opened, step]);

  // Step 2: 키워드 히스토리 로드
  useEffect(() => {
    if (step === 2 && selectedStore) {
      loadKeywordHistory();
    }
  }, [step, selectedStore]);

  const loadStores = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(api.stores.list(), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStores(data.stores || []);
      }
    } catch (error) {
      console.error('[경쟁매장 분석] 매장 로드 실패:', error);
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
    if (step === 1 && !selectedStore) {
      setError('분석할 매장을 선택해주세요.');
      return;
    }

    if (step === 2) {
      const finalKeyword = keywordMode === 'history' ? selectedHistoryKeyword : keyword;
      if (!finalKeyword.trim()) {
        setError('키워드를 입력하거나 선택해주세요.');
        return;
      }
    }

    setError('');
    
    if (step === 3) {
      handleAnalyze();
    } else {
      setStep(step + 1);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedStore) return;

    const finalKeyword = keywordMode === 'history' ? selectedHistoryKeyword : keyword;
    
    setLoading(true);
    setStep(4); // 분석 진행 단계로 이동
    setError('');

    try {
      const token = getToken();
      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      const response = await fetch(api.naver.competitorAnalyze(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: finalKeyword.trim(),
          my_place_id: selectedStore.place_id,
          limit: 20
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '분석에 실패했습니다');
      }

      const data = await response.json();
      setResult(data);
      setStep(5); // 완료 단계로 이동

    } catch (err) {
      console.error('분석 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      setStep(3); // 시작 단계로 돌아감
    } finally {
      setLoading(false);
    }
  };

  const handleViewResults = () => {
    // 상세 결과 페이지로 이동 (향후 구현)
    if (onComplete) onComplete();
    handleClose();
    alert('경쟁매장 분석 상세 페이지는 곧 추가될 예정입니다!');
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      size="xl"
      padding="xl"
      centered
      withCloseButton={!loading}
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      <Stack gap="xl">
        {/* Step 1: 매장 선택 */}
        {step === 1 && (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                display: 'inline-flex', 
                padding: '16px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A6F 100%)',
                marginBottom: '24px'
              }}>
                <Target size={48} color="white" />
              </div>
              
              <Text size="28px" fw={700} mb="md">
                어떤 매장을 기준으로<br />분석할까요?
              </Text>
              
              <Text size="16px" c="dimmed">
                선택하신 매장의 경쟁 상황을 분석해드립니다
              </Text>
            </div>

            {stores.length === 0 ? (
              <Alert icon={<AlertCircle size={16} />} color="yellow">
                등록된 매장이 없습니다. 먼저 매장을 등록해주세요.
              </Alert>
            ) : (
              <Stack gap="sm">
                {stores.map((store) => (
                  <Card
                    key={store.id}
                    withBorder
                    padding="lg"
                    radius="md"
                    style={{
                      cursor: 'pointer',
                      border: selectedStore?.id === store.id ? '2px solid #FF6B6B' : '1px solid #e9ecef',
                      background: selectedStore?.id === store.id ? '#fff5f5' : 'white',
                    }}
                    onClick={() => setSelectedStore(store)}
                  >
                    <Group>
                      {store.thumbnail && (
                        <img 
                          src={store.thumbnail} 
                          alt={store.store_name}
                          style={{ width: 48, height: 48, borderRadius: '8px', objectFit: 'cover' }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <Text fw={600} size="16px">{store.store_name}</Text>
                        <Text size="13px" c="dimmed">플레이스 ID: {store.place_id}</Text>
                      </div>
                      {selectedStore?.id === store.id && (
                        <CheckCircle size={24} color="#FF6B6B" />
                      )}
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}

            {error && (
              <Alert icon={<AlertCircle size={16} />} color="red" variant="light">
                {error}
              </Alert>
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleClose}>
                취소
              </Button>
              <Button
                onClick={handleNext}
                disabled={!selectedStore}
                size="md"
                rightSection={<ArrowRight size={18} />}
                style={{ background: selectedStore ? 'linear-gradient(135deg, #FF6B6B 0%, #EE5A6F 100%)' : undefined }}
              >
                다음
              </Button>
            </Group>
          </>
        )}

        {/* Step 2: 키워드 선택 */}
        {step === 2 && (
          <>
            <div style={{ textAlign: 'center' }}>
              <Text size="24px" fw={700} mb="sm">
                어떤 키워드로<br />경쟁사를 찾아볼까요?
              </Text>
              <Text size="14px" c="dimmed">
                해당 키워드로 상위 20개 매장을 분석합니다
              </Text>
            </div>

            <Radio.Group value={keywordMode} onChange={(value) => setKeywordMode(value as 'history' | 'manual')}>
              <Stack gap="md">
                <Radio
                  value="history"
                  label="과거 추출한 키워드에서 선택"
                  description="타겟키워드 분석에서 찾은 키워드를 사용합니다"
                />
                <Radio
                  value="manual"
                  label="직접 입력"
                  description="새로운 키워드를 입력합니다"
                />
              </Stack>
            </Radio.Group>

            {keywordMode === 'history' ? (
              keywordHistory.length > 0 ? (
                <Stack gap="xs">
                  <Text size="14px" fw={500}>추출된 키워드 선택</Text>
                  <Group gap="xs">
                    {keywordHistory.flatMap(history => 
                      history.extracted_keywords.slice(0, 10).map((kw, idx) => (
                        <Badge
                          key={`${history.id}-${idx}`}
                          size="lg"
                          variant={selectedHistoryKeyword === kw.keyword ? 'filled' : 'light'}
                          color="red"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedHistoryKeyword(kw.keyword)}
                        >
                          {kw.keyword}
                        </Badge>
                      ))
                    )}
                  </Group>
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

            <Group justify="space-between" mt="md">
              <Button variant="default" onClick={() => setStep(1)}>
                이전
              </Button>
              <Button
                onClick={handleNext}
                disabled={keywordMode === 'history' ? !selectedHistoryKeyword : !keyword.trim()}
                size="md"
                rightSection={<ArrowRight size={18} />}
                style={{ 
                  background: (keywordMode === 'history' ? selectedHistoryKeyword : keyword.trim()) 
                    ? 'linear-gradient(135deg, #FF6B6B 0%, #EE5A6F 100%)' 
                    : undefined 
                }}
              >
                다음
              </Button>
            </Group>
          </>
        )}

        {/* Step 3: 분석 시작 */}
        {step === 3 && (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                display: 'inline-flex', 
                padding: '16px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A6F 100%)',
                marginBottom: '24px'
              }}>
                <TrendingUp size={48} color="white" />
              </div>
              
              <Text size="28px" fw={700} mb="md">
                지금 바로 분석을<br />시작할까요?
              </Text>
            </div>

            <Card withBorder p="xl" radius="md" style={{ background: '#fff5f5' }}>
              <Stack gap="lg">
                <div>
                  <Text fw={600} size="18px" mb="sm" c="#FF6B6B">📊 분석 내용</Text>
                  <Text size="15px" style={{ lineHeight: 1.6 }}>
                    선택하신 <strong>"{keywordMode === 'history' ? selectedHistoryKeyword : keyword}"</strong> 키워드로 
                    플레이스 상위노출 중인 <strong>20개 매장</strong>의 현재 플레이스 활동 전반적인 내용을 
                    한번에 보실 수 있습니다.
                  </Text>
                </div>

                <div>
                  <Text fw={600} size="18px" mb="sm" c="#FF6B6B">🎯 분석 항목</Text>
                  <Stack gap="xs">
                    <Text size="14px">✓ 매장별 순위 및 기본 정보</Text>
                    <Text size="14px">✓ 리뷰 개수 및 평점</Text>
                    <Text size="14px">✓ 대표 키워드 분석</Text>
                    <Text size="14px">✓ 경쟁 강도 비교</Text>
                  </Stack>
                </div>

                <Alert color="red" variant="light">
                  <Text size="14px" fw={500}>
                    💡 "나만 잘하는게 아니라, 남들은 어떻게 하는지 알아야 합니다"
                  </Text>
                </Alert>
              </Stack>
            </Card>

            <Group justify="space-between" mt="md">
              <Button variant="default" onClick={() => setStep(2)}>
                이전
              </Button>
              <Button
                onClick={handleNext}
                size="md"
                rightSection={<TrendingUp size={18} />}
                style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A6F 100%)' }}
              >
                분석 시작
              </Button>
            </Group>
          </>
        )}

        {/* Step 4: 분석 진행 중 */}
        {step === 4 && loading && (
          <>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Loader size="xl" mb="xl" color="red" />
              
              <Text size="24px" fw={700} mb="md">
                상위 20개 매장을<br />분석하고 있어요
              </Text>
              <Text size="14px" c="dimmed" mb="xl">
                잠시만 기다려주세요<br />
                각 매장의 정보를 수집하고 분석 중입니다
              </Text>

              <Card withBorder p="lg" radius="md" style={{ background: '#f8f9fa' }}>
                <Stack gap="sm">
                  <Group gap="xs">
                    <Loader size="xs" color="red" />
                    <Text size="14px" c="dimmed">매장 정보 수집 중...</Text>
                  </Group>
                  <Group gap="xs">
                    <Loader size="xs" color="red" />
                    <Text size="14px" c="dimmed">활동 데이터 분석 중...</Text>
                  </Group>
                  <Group gap="xs">
                    <Loader size="xs" color="red" />
                    <Text size="14px" c="dimmed">경쟁 강도 계산 중...</Text>
                  </Group>
                </Stack>
              </Card>
            </div>
          </>
        )}

        {/* Step 5: 완료 */}
        {step === 5 && result && (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                display: 'inline-flex', 
                padding: '16px', 
                borderRadius: '50%', 
                background: '#51cf66',
                marginBottom: '16px'
              }}>
                <CheckCircle size={48} color="white" />
              </div>
              
              <Text size="24px" fw={700} mb="sm">
                분석이 완료되었어요!
              </Text>
              <Text size="14px" c="dimmed">
                {result.competitors?.length || 0}개 경쟁 매장의 데이터를 분석했습니다
              </Text>
            </div>

            <Card withBorder p="xl" radius="md" style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffe9e9 100%)' }}>
              <Stack gap="md">
                <div>
                  <Text size="13px" c="dimmed" mb={4}>분석 키워드</Text>
                  <Text size="18px" fw={700} c="#FF6B6B">{result.keyword}</Text>
                </div>
                
                <div>
                  <Text size="13px" c="dimmed" mb={4}>내 매장</Text>
                  <Text size="16px" fw={600}>{result.my_store?.name || selectedStore?.store_name}</Text>
                </div>

                <div>
                  <Text size="13px" c="dimmed" mb={4}>분석된 경쟁사 수</Text>
                  <Text size="16px" fw={600}>{result.competitors?.length || 0}개</Text>
                </div>
              </Stack>
            </Card>

            <Alert icon={<Lightbulb size={16} />} color="blue" variant="light">
              <Text size="14px">
                상세 분석 결과에서 각 매장의 활동 현황과 비교 데이터를 확인할 수 있어요
              </Text>
            </Alert>

            <Group justify="space-between" mt="md">
              <Button variant="default" onClick={handleClose}>
                닫기
              </Button>
              <Button
                onClick={handleViewResults}
                size="md"
                rightSection={<ArrowRight size={18} />}
                style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A6F 100%)' }}
              >
                상세 결과 보기
              </Button>
            </Group>
          </>
        )}

        {/* Error State */}
        {error && step !== 1 && step !== 2 && (
          <Alert icon={<AlertCircle size={16} />} color="red" variant="light">
            {error}
          </Alert>
        )}
      </Stack>
    </Modal>
  );
}
