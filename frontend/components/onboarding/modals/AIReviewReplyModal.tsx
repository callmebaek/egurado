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
  MessageSquare, 
  CheckCircle2, 
  ChevronRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface AIReviewReplyModalProps {
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

export default function AIReviewReplyModal({
  opened,
  onClose,
  onComplete,
}: AIReviewReplyModalProps) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [stores, setStores] = useState<RegisteredStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null);
  
  // 리뷰 개수 선택
  const [reviewLimit, setReviewLimit] = useState<string>('50');
  
  // 답글 대기 중인 리뷰 개수
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 3;

  // 매장 목록 로드
  useEffect(() => {
    if (opened && currentStep === 1) {
      loadStores();
    }
  }, [opened, currentStep]);

  // Step 3: 답글 대기 중인 리뷰 개수 로드
  useEffect(() => {
    if (currentStep === 3 && selectedStore) {
      loadPendingReviewCount();
    }
  }, [currentStep, selectedStore, reviewLimit]);

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

  const loadPendingReviewCount = async () => {
    if (!selectedStore) return;

    setLoadingCount(true);
    setError('');

    try {
      const token = getToken();
      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      // 리뷰 목록 조회 (답글 대기 중인 것만 카운트)
      const limit = reviewLimit === 'all' ? 0 : parseInt(reviewLimit);
      
      const response = await fetch(
        `${api.baseUrl}/api/v1/ai-reply/reviews`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            store_id: selectedStore.id,
            limit: limit
          })
        }
      );

      if (!response.ok) {
        throw new Error('리뷰 목록 조회에 실패했습니다.');
      }

      const data = await response.json();
      const pendingReviews = data.reviews.filter((review: any) => !review.has_reply);
      setPendingCount(pendingReviews.length);

    } catch (err) {
      console.error('답글 대기 중인 리뷰 개수 조회 실패:', err);
      setError(err instanceof Error ? err.message : '리뷰 개수 조회 중 오류가 발생했습니다.');
      setPendingCount(0);
    } finally {
      setLoadingCount(false);
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
    
    // Step 2: 리뷰 개수 선택
    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }
    
    // Step 3: AI 리뷰답글 페이지로 이동
    if (currentStep === 3) {
      handleStartReply();
      return;
    }
  };

  const handleStartReply = () => {
    if (!selectedStore) return;

    // 완료 처리
    if (onComplete) onComplete();
    
    // AI 리뷰답글 페이지로 이동
    handleClose();
    router.push(`/dashboard/naver/reviews/ai-reply?storeId=${selectedStore.id}&reviewLimit=${reviewLimit}&autoStart=true`);
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(currentStep - 1);
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedStore(null);
    setReviewLimit('50');
    setPendingCount(0);
    setError('');
    onClose();
  };

  // Step 1: 매장 선택
  const renderStep1 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        어떤 매장의 리뷰에<br />답글을 달까요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        AI가 자동으로 맞춤형 답글을 생성해드립니다
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

  // Step 2: 리뷰 개수 선택
  const renderStep2 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        최근 몇 개의 리뷰를<br />검토할까요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        선택한 개수만큼 최근 리뷰를 불러와 답글 대기 중인 리뷰를 찾아드립니다
      </Text>

      <Alert color="blue" variant="light" icon={<Sparkles size={16} />}>
        <Text size="sm" fw={500} mb="xs">
          💡 리뷰 개수 선택 안내
        </Text>
        <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
          최근 몇개의 리뷰를 검토해보실것인지를 선택해주세요.<br />
          답글대기중인 리뷰들을 보여드립니다!!
        </Text>
      </Alert>

      <Stack gap="xs">
        {['10', '20', '50', '100'].map((limit) => (
          <Paper
            key={limit}
            p="md"
            radius="md"
            style={{
              cursor: 'pointer',
              border: reviewLimit === limit ? '2px solid #635bff' : '1px solid #e0e7ff',
              background: reviewLimit === limit ? 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)' : '#ffffff',
              transition: 'all 0.2s'
            }}
            onClick={() => setReviewLimit(limit)}
          >
            <Group justify="space-between">
              <div style={{ flex: 1 }}>
                <Text fw={600} mb={4}>
                  최근 {limit}개 리뷰
                </Text>
                <Text size="xs" c="dimmed">
                  {limit === '10' && '빠르게 최근 리뷰만 확인 (약 5초)'}
                  {limit === '20' && '최근 2-3주 정도의 리뷰 확인 (약 10초)'}
                  {limit === '50' && '최근 1-2개월 정도의 리뷰 확인 (약 15초)'}
                  {limit === '100' && '최근 2-3개월 정도의 리뷰 확인 (약 30초)'}
                </Text>
              </div>
              {reviewLimit === limit && (
                <ThemeIcon size={28} radius="xl" color="brand">
                  <CheckCircle2 size={18} />
                </ThemeIcon>
              )}
            </Group>
          </Paper>
        ))}
      </Stack>

      {error && (
        <Alert color="red" title="오류">
          {error}
        </Alert>
      )}
    </Stack>
  );

  // Step 3: 답글 대기 중인 리뷰 개수 표시
  const renderStep3 = () => (
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
          <MessageSquare size={40} />
        </ThemeIcon>
        
        <Text size="lg" fw={600} mb="sm">
          AI로 리뷰답글을<br />생성할까요?
        </Text>
        <Text size="sm" c="dimmed">
          답글 대기 중인 리뷰를 확인했습니다
        </Text>
      </div>

      {loadingCount ? (
        <Center style={{ minHeight: 150 }}>
          <Stack align="center" gap="md">
            <Loader size="lg" color="brand" />
            <Text size="sm" c="dimmed">답글 대기 중인 리뷰 확인 중...</Text>
          </Stack>
        </Center>
      ) : (
        <>
          {/* 답글 대기 중인 리뷰 개수 */}
          <Paper withBorder p="xl" radius="md" bg="#f9fafb">
            <Stack gap="md" align="center">
              <div style={{ textAlign: 'center' }}>
                <Text size="xs" c="dimmed" mb={4}>답글 대기 중인 리뷰</Text>
                <Group gap="xs" justify="center">
                  <Text size="48px" fw={700} c="brand" style={{ lineHeight: 1 }}>
                    {pendingCount}
                  </Text>
                  <Text size="lg" c="dimmed" mt="md">개</Text>
                </Group>
              </div>

              <Text size="xs" c="dimmed" ta="center">
                최근 {reviewLimit}개 리뷰 중 답글이 없는 리뷰입니다
              </Text>
            </Stack>
          </Paper>

          {/* AI 답글 생성 안내 */}
          {pendingCount > 0 ? (
            <Paper 
              p="md" 
              radius="md" 
              withBorder
              style={{ 
                borderColor: '#ffc078',
                backgroundColor: '#fff9e6'
              }}
            >
              <Group gap="sm" align="flex-start">
                <Sparkles size={20} color="#fd7e14" style={{ flexShrink: 0, marginTop: 2 }} />
                <Stack gap="xs" style={{ flex: 1 }}>
                  <Text size="sm" fw={600}>
                    AI가 자동으로 답글을 생성해드립니다
                  </Text>
                  <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
                    각 리뷰의 내용을 분석하여 맞춤형 답글을 작성합니다.<br />
                    생성된 답글은 수정할 수 있으며, 직접 게시할 수 있습니다.
                  </Text>
                </Stack>
              </Group>
            </Paper>
          ) : (
            <Alert color="blue" icon={<AlertCircle size={16} />}>
              <Text size="sm">
                답글 대기 중인 리뷰가 없습니다.<br />
                모든 리뷰에 답글이 달려있어요! 👍
              </Text>
            </Alert>
          )}

          {/* 선택 정보 요약 */}
          <Paper p="sm" radius="md" withBorder bg="#f9fafb">
            <Group justify="space-between">
              <Text size="xs" c="dimmed">매장</Text>
              <Text size="xs" fw={500}>{selectedStore?.name}</Text>
            </Group>
            <Group justify="space-between" mt="xs">
              <Text size="xs" c="dimmed">검토할 리뷰</Text>
              <Text size="xs" fw={500}>최근 {reviewLimit}개</Text>
            </Group>
          </Paper>
        </>
      )}

      {error && (
        <Alert color="red" title="오류">
          {error}
        </Alert>
      )}
    </Stack>
  );

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
              loadingCount ||
              (currentStep === 1 && !selectedStore) ||
              (currentStep === 3 && pendingCount === 0)
            }
            rightSection={currentStep < 3 ? <ChevronRight size={16} /> : <Sparkles size={16} />}
            style={{ minWidth: 120 }}
          >
            {currentStep === 3 ? 'AI로 리뷰답글 달기' : '다음'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
