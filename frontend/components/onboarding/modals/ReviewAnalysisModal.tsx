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
} from '@mantine/core';
import { 
  Store, 
  Loader2, 
  Calendar, 
  CheckCircle2, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Minus,
  Sparkles,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { api } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface ReviewAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface RegisteredStore {
  id: string;
  place_id: string;
  name: string;
  address: string;
  platform: string;
  thumbnail?: string;
}

interface ReviewStats {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
}

export default function ReviewAnalysisModal({
  isOpen,
  onClose,
  onComplete,
}: ReviewAnalysisModalProps) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [stores, setStores] = useState<RegisteredStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null);
  
  // 기간 선택
  const [datePeriod, setDatePeriod] = useState<string>('today');
  
  // 리뷰 통계
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 4;

  // 매장 목록 로드
  useEffect(() => {
    if (isOpen && currentStep === 1) {
      loadStores();
    }
  }, [isOpen, currentStep]);

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

  const getDateRange = () => {
    const today = new Date();
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const todayStr = formatDate(today);
    
    switch (datePeriod) {
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatDate(yesterday);
        return { start_date: yesterdayStr, end_date: yesterdayStr };
      case 'last7days':
        const last7days = new Date(today);
        last7days.setDate(last7days.getDate() - 6);
        return { start_date: formatDate(last7days), end_date: todayStr };
      case 'last30days':
        const last30days = new Date(today);
        last30days.setDate(last30days.getDate() - 29);
        return { start_date: formatDate(last30days), end_date: todayStr };
      case 'today':
      default:
        return { start_date: todayStr, end_date: todayStr };
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
    
    // Step 2: 기간 선택
    if (currentStep === 2) {
      handleExtractReviews();
      return;
    }
    
    // Step 4: 완료 - 리뷰 분석 페이지로 이동
    if (currentStep === 4) {
      const dateRange = getDateRange();
      router.push(`/dashboard/naver/reviews?storeId=${selectedStore!.id}&period=${datePeriod}&startDate=${dateRange.start_date}&endDate=${dateRange.end_date}&autoStart=true`);
      onComplete();
      handleClose();
      return;
    }
  };

  const handleExtractReviews = async () => {
    setExtracting(true);
    setCurrentStep(3); // 추출 중 단계
    
    try {
      const dateRange = getDateRange();
      
      const response = await fetch(api.reviews.extract(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: selectedStore!.id,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date
        })
      });

      if (!response.ok) {
        throw new Error('리뷰 추출에 실패했습니다');
      }

      const data = await response.json();
      const extractedReviews = data.reviews || [];
      
      // 기본 통계 계산 (sentiment가 있는 경우만 카운트)
      const stats = {
        total: extractedReviews.length,
        positive: extractedReviews.filter((r: any) => r.sentiment === 'positive').length,
        neutral: extractedReviews.filter((r: any) => r.sentiment === 'neutral').length,
        negative: extractedReviews.filter((r: any) => r.sentiment === 'negative').length,
      };

      setReviewStats(stats);
      setCurrentStep(4); // 결과 단계
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '리뷰 추출 중 오류가 발생했습니다');
      setCurrentStep(2); // 기간 선택 단계로 돌아가기
    } finally {
      setExtracting(false);
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1 && currentStep !== 3) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedStore(null);
    setDatePeriod('today');
    setReviewStats(null);
    setError('');
    onClose();
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'today': return '오늘';
      case 'yesterday': return '어제';
      case 'last7days': return '지난 7일';
      case 'last30days': return '지난 30일';
      default: return '';
    }
  };

  const getPeriodDescription = (period: string) => {
    switch (period) {
      case 'today': return '가장 빠르게 분석할 수 있어요 (약 10초)';
      case 'yesterday': return '빠르게 분석할 수 있어요 (약 15초)';
      case 'last7days': return '일주일치 리뷰를 꼼꼼히 분석해요 (약 1분)';
      case 'last30days': return '한달치 리뷰를 상세히 분석해요 (약 3분)';
      default: return '';
    }
  };

  // Step 1: 매장 선택
  const renderStep1 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        어떤 매장의 리뷰를 분석할까요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        AI가 고객 리뷰를 분석하여 긍정/부정 감성과 핵심 인사이트를 도출해드려요
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

  // Step 2: 기간 선택
  const renderStep2 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        어느 기간의 리뷰를 분석할까요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        기간이 짧을수록 더 빨리 결과를 확인할 수 있어요
      </Text>

      <Stack gap="xs">
        {['today', 'yesterday', 'last7days', 'last30days'].map((period) => (
          <Paper
            key={period}
            p="md"
            radius="md"
            style={{
              cursor: 'pointer',
              border: datePeriod === period ? '2px solid #635bff' : '1px solid #e0e7ff',
              background: datePeriod === period ? 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)' : '#ffffff',
              transition: 'all 0.2s'
            }}
            onClick={() => setDatePeriod(period)}
          >
            <Group justify="space-between">
              <div style={{ flex: 1 }}>
                <Text fw={600} mb={4}>
                  {getPeriodLabel(period)}
                </Text>
                <Text size="xs" c="dimmed">
                  {getPeriodDescription(period)}
                </Text>
              </div>
              {datePeriod === period && (
                <ThemeIcon size={28} radius="xl" color="brand">
                  <CheckCircle2 size={18} />
                </ThemeIcon>
              )}
            </Group>
          </Paper>
        ))}
      </Stack>

      <Alert color="blue" title="💡 입력 팁">
        <Text size="xs">
          짧은 기간을 선택하면 빠르게 최신 트렌드를 파악할 수 있어요!
        </Text>
      </Alert>

      {error && (
        <Alert color="red" title="오류">
          {error}
        </Alert>
      )}
    </Stack>
  );

  // Step 3: 리뷰 추출 중
  const renderStep3 = () => (
    <Stack gap="xl" align="center">
      <ThemeIcon size={80} radius="xl" color="brand" variant="light">
        <Loader2 size={40} className="animate-spin" />
      </ThemeIcon>
      
      <div style={{ textAlign: 'center' }}>
        <Text size="xl" fw={700} mb="xs">
          리뷰를 추출하고 있어요
        </Text>
        <Text size="sm" c="dimmed">
          선택한 기간의 리뷰를 정확하게 가져오는 중입니다...
        </Text>
      </div>

      <Text size="xs" c="dimmed">
        기간: {getPeriodLabel(datePeriod)}
      </Text>
    </Stack>
  );

  // Step 4: 결과 미리보기
  const renderStep4 = () => (
    <Stack gap="md">
      <div style={{ textAlign: 'center' }}>
        <ThemeIcon size={60} radius="xl" color="brand" variant="light" style={{ margin: '0 auto 1rem' }}>
          <CheckCircle2 size={30} />
        </ThemeIcon>
        <Text size="xl" fw={700} mb="xs">
          리뷰를 추출했어요! 🎉
        </Text>
        <Text size="sm" c="dimmed">
          기본 통계를 확인하고, AI 분석을 시작하세요
        </Text>
      </div>

      {/* 통계 카드 */}
      <Paper p="lg" radius="md" style={{ 
        border: '1px solid #e0e7ff',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
      }}>
        <Group grow>
          <Paper p="md" radius="md" style={{ textAlign: 'center' }}>
            <ThemeIcon size={32} radius="md" variant="light" color="blue" style={{ margin: '0 auto 0.5rem' }}>
              <MessageSquare size={18} />
            </ThemeIcon>
            <Text size="xl" fw={700}>{reviewStats?.total || 0}</Text>
            <Text size="xs" c="dimmed" mt={4}>전체</Text>
          </Paper>
          
          <Paper p="md" radius="md" style={{ textAlign: 'center', border: '1px solid #d1fae5' }}>
            <ThemeIcon size={32} radius="md" variant="light" color="green" style={{ margin: '0 auto 0.5rem' }}>
              <ThumbsUp size={18} />
            </ThemeIcon>
            <Text size="xl" fw={700} c="green">{reviewStats?.positive || 0}</Text>
            <Text size="xs" c="dimmed" mt={4}>긍정</Text>
          </Paper>
          
          <Paper p="md" radius="md" style={{ textAlign: 'center' }}>
            <ThemeIcon size={32} radius="md" variant="light" color="gray" style={{ margin: '0 auto 0.5rem' }}>
              <Minus size={18} />
            </ThemeIcon>
            <Text size="xl" fw={700} c="gray">{reviewStats?.neutral || 0}</Text>
            <Text size="xs" c="dimmed" mt={4}>중립</Text>
          </Paper>
          
          <Paper p="md" radius="md" style={{ textAlign: 'center', border: '1px solid #fecaca' }}>
            <ThemeIcon size={32} radius="md" variant="light" color="red" style={{ margin: '0 auto 0.5rem' }}>
              <ThumbsDown size={18} />
            </ThemeIcon>
            <Text size="xl" fw={700} c="red">{reviewStats?.negative || 0}</Text>
            <Text size="xs" c="dimmed" mt={4}>부정</Text>
          </Paper>
        </Group>
      </Paper>

      {/* 안내 메시지 */}
      <Alert color="yellow" title="AI 분석이 필요해요">
        <Text size="sm">
          리뷰 온도, 감성 분석, 핵심 키워드 추출 등 상세한 분석은 "리뷰 분석하기" 버튼을 눌러 시작할 수 있어요.
        </Text>
      </Alert>

      {/* 선택된 정보 요약 */}
      <Paper p="md" radius="md" style={{ background: '#f9fafb' }}>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">매장</Text>
            <Text size="sm" fw={600}>{selectedStore?.name}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">기간</Text>
            <Text size="sm" fw={600}>{getPeriodLabel(datePeriod)}</Text>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );

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
              {currentStep < 3 ? `${currentStep} / ${totalSteps - 1} 단계` : currentStep === 3 ? '추출 중' : '완료'}
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
          {currentStep === 4 && renderStep4()}
        </div>

        {/* 버튼 */}
        {currentStep !== 3 && (
          <Group justify="space-between">
            {currentStep > 1 && currentStep < 4 ? (
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
              disabled={loading || extracting || (currentStep === 1 && !selectedStore)}
              rightSection={currentStep < 4 ? <ChevronRight size={16} /> : <TrendingUp size={16} />}
              style={{ minWidth: 120 }}
            >
              {currentStep === 4 ? '리뷰 분석하기' : '다음'}
            </Button>
          </Group>
        )}
      </Stack>
    </Modal>
  );
}
