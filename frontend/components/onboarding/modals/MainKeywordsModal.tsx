'use client';

import { useState } from 'react';
import { Modal, Text, Button, Stack, TextInput, Group, Badge, Card, Loader, Alert } from '@mantine/core';
import { 
  Star, 
  TrendingUp, 
  Search, 
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { api } from '@/lib/config';
import { useRouter } from 'next/navigation';

interface MainKeywordsModalProps {
  opened: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface StoreKeywordInfo {
  rank: number;
  place_id: string;
  name: string;
  category: string;
  address: string;
  thumbnail?: string;
  rating?: number;
  review_count: string;
  keywords: string[];
}

interface AnalysisResult {
  status: string;
  query: string;
  total_stores: number;
  stores_analyzed: StoreKeywordInfo[];
}

export default function MainKeywordsModal({ opened, onClose, onComplete }: MainKeywordsModalProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  const handleClose = () => {
    setStep(1);
    setKeyword('');
    setResult(null);
    setError('');
    onClose();
  };

  const handleNext = () => {
    if (step === 2 && !keyword.trim()) {
      setError('검색 키워드를 입력해주세요.');
      return;
    }
    setError('');
    
    if (step === 2) {
      handleAnalyze();
    } else {
      setStep(step + 1);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setStep(3); // 분석 진행 단계로 이동
    
    try {
      const response = await fetch(api.naver.analyzeMainKeywords(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: keyword.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '분석에 실패했습니다');
      }
      
      const data: AnalysisResult = await response.json();
      setResult(data);
      setStep(4); // 결과 단계로 이동
      
    } catch (err) {
      console.error('분석 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      setStep(2); // 입력 단계로 돌아감
    } finally {
      setLoading(false);
    }
  };

  const handleViewFullPage = () => {
    handleClose();
    router.push('/dashboard/naver/main-keywords');
  };

  const getTopKeywords = () => {
    if (!result) return [];
    
    const keywordCount: Record<string, number> = {};
    
    result.stores_analyzed.forEach(store => {
      store.keywords.forEach(kw => {
        keywordCount[kw] = (keywordCount[kw] || 0) + 1;
      });
    });
    
    return Object.entries(keywordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));
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
        {/* Step 1: 환영 및 설명 */}
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
                <Star size={48} color="white" />
              </div>
              
              <Text size="28px" fw={700} mb="md">
                대표키워드를 분석해보세요
              </Text>
              
              <Text size="16px" c="dimmed" mb="xl">
                경쟁 매장들이 어떤 키워드로 노출되는지<br />
                한눈에 파악할 수 있습니다
              </Text>
            </div>

            <Card withBorder p="xl" radius="md" style={{ background: '#f8f9fa' }}>
              <Stack gap="lg">
                <Group gap="sm">
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: '#667eea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700
                  }}>
                    1
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text fw={600} size="16px" mb={4}>경쟁 상황 파악</Text>
                    <Text size="14px" c="dimmed">
                      상위 15개 매장이 어떤 키워드로 노출되는지 확인하세요
                    </Text>
                  </div>
                </Group>

                <Group gap="sm">
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: '#667eea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700
                  }}>
                    2
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text fw={600} size="16px" mb={4}>SEO 전략 수립</Text>
                    <Text size="14px" c="dimmed">
                      효과적인 키워드를 발견하고 내 매장에 적용하세요
                    </Text>
                  </div>
                </Group>

                <Group gap="sm">
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: '#667eea',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700
                  }}>
                    3
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text fw={600} size="16px" mb={4}>트렌드 분석</Text>
                    <Text size="14px" c="dimmed">
                      가장 많이 사용되는 대표키워드 트렌드를 파악하세요
                    </Text>
                  </div>
                </Group>
              </Stack>
            </Card>

            <Alert icon={<Sparkles size={16} />} color="blue" variant="light">
              <Text size="14px">
                <strong>Tip:</strong> "강남맛집", "홍대카페" 같은 지역+업종 키워드로 검색하면 가장 정확한 결과를 얻을 수 있어요!
              </Text>
            </Alert>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleClose}>
                취소
              </Button>
              <Button
                onClick={handleNext}
                size="md"
                rightSection={<ArrowRight size={18} />}
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                시작하기
              </Button>
            </Group>
          </>
        )}

        {/* Step 2: 키워드 입력 */}
        {step === 2 && (
          <>
            <div style={{ textAlign: 'center' }}>
              <Text size="24px" fw={700} mb="sm">
                어떤 키워드를 분석할까요?
              </Text>
              <Text size="14px" c="dimmed">
                지역명과 업종을 함께 입력하면 더 정확해요
              </Text>
            </div>

            <TextInput
              size="lg"
              placeholder="예: 강남맛집, 성수카페, 혜화데이트"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setError('');
              }}
              error={error}
              leftSection={<Search size={20} />}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNext();
                }
              }}
              styles={{
                input: {
                  fontSize: '16px',
                  padding: '24px 16px 24px 44px',
                }
              }}
            />

            <Card withBorder p="md" radius="md" style={{ background: '#f1f3f5' }}>
              <Text size="13px" c="dimmed" fw={500}>
                💡 추천 검색어 예시
              </Text>
              <Group gap="xs" mt="sm">
                {['강남맛집', '성수카페', '홍대술집', '이태원레스토랑'].map((example) => (
                  <Badge
                    key={example}
                    variant="light"
                    size="lg"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setKeyword(example)}
                  >
                    {example}
                  </Badge>
                ))}
              </Group>
            </Card>

            <Group justify="space-between" mt="md">
              <Button variant="default" onClick={() => setStep(1)}>
                이전
              </Button>
              <Button
                onClick={handleNext}
                disabled={!keyword.trim()}
                size="md"
                rightSection={<Search size={18} />}
                style={{ background: keyword.trim() ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined }}
              >
                분석하기
              </Button>
            </Group>
          </>
        )}

        {/* Step 3: 분석 진행 */}
        {step === 3 && loading && (
          <>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Loader size="xl" mb="xl" />
              
              <Text size="24px" fw={700} mb="md">
                상위 매장을 분석하고 있어요
              </Text>
              <Text size="14px" c="dimmed" mb="xl">
                "{keyword}"로 검색된 상위 15개 매장의<br />
                대표키워드를 수집하고 있습니다
              </Text>

              <Card withBorder p="lg" radius="md" style={{ background: '#f8f9fa' }}>
                <Stack gap="sm">
                  <Group gap="xs">
                    <Loader size="xs" />
                    <Text size="14px" c="dimmed">매장 정보 수집 중...</Text>
                  </Group>
                  <Group gap="xs">
                    <Loader size="xs" />
                    <Text size="14px" c="dimmed">대표키워드 추출 중...</Text>
                  </Group>
                  <Group gap="xs">
                    <Loader size="xs" />
                    <Text size="14px" c="dimmed">분석 결과 정리 중...</Text>
                  </Group>
                </Stack>
              </Card>
            </div>
          </>
        )}

        {/* Step 4: 결과 요약 */}
        {step === 4 && result && (
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
                "{result.query}"로 검색된 {result.stores_analyzed.length}개 매장을 분석했습니다
              </Text>
            </div>

            <Card withBorder p="xl" radius="md" style={{ background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)' }}>
              <Text size="16px" fw={600} mb="md">
                🏆 가장 많이 사용된 대표키워드 TOP 10
              </Text>
              
              <Stack gap="xs">
                {getTopKeywords().map(({ keyword: kw, count }, index) => (
                  <Group key={kw} justify="space-between" p="sm" style={{ 
                    background: 'white', 
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <Group gap="sm">
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: index < 3 ? '#667eea' : '#e9ecef',
                        color: index < 3 ? 'white' : '#868e96',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700
                      }}>
                        {index + 1}
                      </div>
                      <Text fw={500} size="15px">{kw}</Text>
                    </Group>
                    <Badge color="grape" variant="light">
                      {count}개 매장
                    </Badge>
                  </Group>
                ))}
              </Stack>
            </Card>

            <Alert icon={<TrendingUp size={16} />} color="blue" variant="light">
              <Text size="14px">
                상세 분석 결과에서 각 매장별 대표키워드와 순위를 확인할 수 있어요
              </Text>
            </Alert>

            <Group justify="space-between" mt="md">
              <Button variant="default" onClick={handleClose}>
                닫기
              </Button>
              <Button
                onClick={() => {
                  if (onComplete) onComplete();
                  handleViewFullPage();
                }}
                size="md"
                rightSection={<ArrowRight size={18} />}
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                상세 결과 보기
              </Button>
            </Group>
          </>
        )}

        {/* Error State */}
        {error && step === 2 && (
          <Alert icon={<AlertCircle size={16} />} color="red" variant="light">
            {error}
          </Alert>
        )}
      </Stack>
    </Modal>
  );
}
