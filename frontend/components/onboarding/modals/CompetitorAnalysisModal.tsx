'use client';

import { useState, useEffect } from 'react';
import { Modal, Text, Button, Stack, TextInput, Group, Card, Alert, Badge, Radio } from '@mantine/core';
import { 
  Users,
  Search,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Store as StoreIcon,
  Lightbulb,
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

interface Store {
  id: string;
  name: string;
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
  const [error, setError] = useState('');

  const handleClose = () => {
    setStep(1);
    setSelectedStore(null);
    setKeyword('');
    setSelectedHistoryKeyword('');
    setKeywordMode('history');
    setError('');
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
      handleStartAnalysis();
    } else {
      setStep(step + 1);
    }
  };

  const handleStartAnalysis = () => {
    if (!selectedStore) return;

    const finalKeyword = keywordMode === 'history' ? selectedHistoryKeyword : keyword;
    
    // 분석 완료 처리
    if (onComplete) onComplete();
    
    // 경쟁매장 분석 페이지로 이동
    handleClose();
    router.push('/dashboard/naver/competitors');
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      size="xl"
      padding="xl"
      centered
      withCloseButton
      closeOnClickOutside
      closeOnEscape
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
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                marginBottom: '24px'
              }}>
                <Users size={48} color="white" />
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
                      border: selectedStore?.id === store.id ? '2px solid #667eea' : '1px solid #e9ecef',
                      background: selectedStore?.id === store.id ? '#f5f3ff' : 'white',
                    }}
                    onClick={() => setSelectedStore(store)}
                  >
                    <Group>
                      {store.thumbnail && (
                        <img 
                          src={store.thumbnail} 
                          alt={store.name}
                          style={{ width: 48, height: 48, borderRadius: '8px', objectFit: 'cover' }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <Text fw={600} size="16px">{store.name}</Text>
                        <Text size="13px" c="dimmed">플레이스 ID: {store.place_id}</Text>
                      </div>
                      {selectedStore?.id === store.id && (
                        <CheckCircle size={24} color="#667eea" />
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
                style={{ background: selectedStore ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined }}
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
                    color="grape"
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
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
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
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                marginBottom: '24px'
              }}>
                <Sparkles size={48} color="white" />
              </div>
              
              <Text size="28px" fw={700} mb="md">
                지금 바로 분석을<br />시작할까요?
              </Text>
              
              <Text size="16px" c="dimmed" mb="xl">
                경쟁매장 분석 페이지에서 상세한 분석을 진행합니다
              </Text>
            </div>

            <Card withBorder p="xl" radius="md" style={{ background: '#f5f3ff' }}>
              <Stack gap="lg">
                <div>
                  <Text fw={600} size="18px" mb="sm" c="#667eea">📊 분석 내용</Text>
                  <Text size="15px" style={{ lineHeight: 1.6 }}>
                    선택하신 <strong>"{keywordMode === 'history' ? selectedHistoryKeyword : keyword}"</strong> 키워드로 
                    플레이스 상위노출 중인 <strong>20개 매장</strong>의 현재 플레이스 활동 전반적인 내용을 
                    한번에 보실 수 있습니다.
                  </Text>
                </div>

                <div>
                  <Text fw={600} size="18px" mb="sm" c="#667eea">🎯 분석 항목</Text>
                  <Stack gap="xs">
                    <Text size="14px">✓ 매장별 순위 및 기본 정보</Text>
                    <Text size="14px">✓ 리뷰 개수 및 평점</Text>
                    <Text size="14px">✓ 플레이스 진단 점수</Text>
                    <Text size="14px">✓ 경쟁 강도 비교</Text>
                    <Text size="14px">✓ 개선 권장사항</Text>
                  </Stack>
                </div>

                <Alert color="grape" variant="light">
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
                rightSection={<ArrowRight size={18} />}
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                분석 시작
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
