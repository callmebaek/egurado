'use client';

import { useState, useEffect } from 'react';
import { Modal, Stack, Text, Paper, Grid, Group, ThemeIcon, Alert, Button, Loader, Center, Badge, Box, Switch, Progress } from '@mantine/core';
import { Store, CheckCircle2, ChevronRight, TrendingUp, Bell, Sparkles, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/config';

interface RankAlertsModalProps {
  opened: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface RegisteredStore {
  id: string;
  name: string;
  thumbnail?: string;
  platform: string;
}

interface MetricTracker {
  id: string;
  store_id: string;
  keyword_id: string;
  store_name: string;
  keyword: string;
  platform: string;
  update_frequency: 'daily_once' | 'daily_twice' | 'daily_thrice';
  update_times: number[];
  is_active: boolean;
  last_collected_at?: string;
  created_at: string;
  notification_enabled: boolean;
  notification_type?: 'kakao' | 'sms' | 'email' | null;
}

type NotificationType = 'email' | 'sms' | 'kakao';

const FREQUENCY_LABELS = {
  daily_once: '하루 1회',
  daily_twice: '하루 2회',
  daily_thrice: '하루 3회',
};

export default function RankAlertsModal({ opened, onClose, onComplete }: RankAlertsModalProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [stores, setStores] = useState<RegisteredStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null);
  const [trackers, setTrackers] = useState<MetricTracker[]>([]);
  const [selectedTracker, setSelectedTracker] = useState<MetricTracker | null>(null);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationType, setNotificationType] = useState<NotificationType | ''>('');
  const [loading, setLoading] = useState(false);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingTrackers, setLoadingTrackers] = useState(false);
  const [error, setError] = useState('');

  // 매장 목록 로드
  useEffect(() => {
    if (opened) {
      loadStores();
    }
  }, [opened]);

  const loadStores = async () => {
    setLoadingStores(true);
    setError('');
    try {
      const token = getToken();
      if (!token) {
        throw new Error('로그인이 필요합니다.');
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
      const naverStores = data.stores?.filter((s: any) => s.platform === 'naver') || [];
      setStores(naverStores);
    } catch (err) {
      console.error('매장 목록 로드 실패:', err);
      setError(err instanceof Error ? err.message : '매장 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingStores(false);
    }
  };

  // 매장의 추적 키워드 목록 로드
  const loadTrackers = async (storeId: string) => {
    setLoadingTrackers(true);
    setError('');
    try {
      const token = getToken();
      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      const response = await fetch(api.metrics.trackers(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('추적 키워드 목록 조회에 실패했습니다.');
      }

      const data = await response.json();
      const storeTrackers = (data.trackers || []).filter((t: MetricTracker) => t.store_id === storeId);
      setTrackers(storeTrackers);
    } catch (err) {
      console.error('추적 키워드 로드 실패:', err);
      setError(err instanceof Error ? err.message : '추적 키워드를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingTrackers(false);
    }
  };

  const handleNext = async () => {
    setError('');

    if (currentStep === 1) {
      if (!selectedStore) {
        setError('매장을 선택해주세요.');
        return;
      }
      await loadTrackers(selectedStore.id);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!selectedTracker) {
        setError('추적 중인 키워드를 선택해주세요.');
        return;
      }
      // 기존 알림 설정 로드
      setNotificationEnabled(selectedTracker.notification_enabled);
      setNotificationType(selectedTracker.notification_type || '');
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // 알림 설정 업데이트
      if (notificationEnabled && !notificationType) {
        setError('알림 방법을 선택해주세요.');
        return;
      }
      await updateNotificationSettings();
    } else if (currentStep === 4) {
      // 완료 후 키워드 순위추적 페이지로 이동
      handleClose();
      router.push('/dashboard/naver/metrics-tracker');
    }
  };

  const updateNotificationSettings = async () => {
    if (!selectedTracker) return;

    setLoading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      const response = await fetch(api.metrics.update(selectedTracker.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notification_enabled: notificationEnabled,
          notification_type: notificationEnabled ? notificationType : null
        })
      });

      if (!response.ok) {
        throw new Error('알림 설정 업데이트에 실패했습니다.');
      }

      // 업데이트된 정보 반영
      const updatedData = await response.json();
      setSelectedTracker({
        ...selectedTracker,
        notification_enabled: notificationEnabled,
        notification_type: notificationEnabled ? notificationType as ('kakao' | 'sms' | 'email') : null
      });

      setCurrentStep(4);
    } catch (err) {
      console.error('알림 설정 업데이트 실패:', err);
      setError(err instanceof Error ? err.message : '알림 설정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedStore(null);
    setTrackers([]);
    setSelectedTracker(null);
    setNotificationEnabled(false);
    setNotificationType('');
    setError('');
    onClose();

    if (currentStep === 4 && onComplete) {
      onComplete();
    }
  };

  const formatUpdateTimes = (times: number[]) => {
    if (!times || times.length === 0) return '미설정';
    return times.map(t => `${t}시`).join(', ');
  };

  const renderStep1 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        어떤 매장의 알림을 설정할까요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        순위 추적 중인 키워드의 알림 설정을 변경할 매장을 선택해주세요
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
  );

  const renderStep2 = () => (
    <Stack gap="md">
      <Text size="lg" fw={600} ta="center">
        어떤 키워드의 알림을 받으실래요?
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        현재 추적 중인 키워드 중 하나를 선택해주세요
      </Text>

      {loadingTrackers ? (
        <Center style={{ minHeight: 200 }}>
          <Loader size="lg" />
        </Center>
      ) : trackers.length === 0 ? (
        <Alert color="yellow" title="추적 중인 키워드가 없습니다">
          먼저 "플레이스 순위 추적하기"를 통해 키워드를 추적 등록해주세요
        </Alert>
      ) : (
        <Stack gap="xs">
          {trackers.map((tracker) => (
            <Paper
              key={tracker.id}
              p="md"
              radius="md"
              style={{
                cursor: 'pointer',
                border: selectedTracker?.id === tracker.id 
                  ? '2px solid #635bff' 
                  : '1px solid #e0e7ff',
                background: selectedTracker?.id === tracker.id
                  ? 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)'
                  : '#ffffff',
                transition: 'all 0.2s'
              }}
              onClick={() => setSelectedTracker(tracker)}
            >
              <Group justify="space-between">
                <div style={{ flex: 1 }}>
                  <Group gap="xs" mb={4}>
                    <Text fw={600} size="sm">
                      {tracker.keyword}
                    </Text>
                    <Badge 
                      size="sm" 
                      variant="light" 
                      color={tracker.notification_enabled ? 'green' : 'gray'}
                      leftSection={tracker.notification_enabled ? <Bell size={12} /> : undefined}
                    >
                      {tracker.notification_enabled ? '알림 켜짐' : '알림 꺼짐'}
                    </Badge>
                  </Group>
                  <Group gap="md">
                    <Text size="xs" c="dimmed">
                      {FREQUENCY_LABELS[tracker.update_frequency]}
                    </Text>
                    <Text size="xs" c="dimmed">
                      수집시간: {formatUpdateTimes(tracker.update_times)}
                    </Text>
                  </Group>
                </div>
                {selectedTracker?.id === tracker.id && (
                  <ThemeIcon size={28} radius="xl" color="brand">
                    <CheckCircle2 size={18} />
                  </ThemeIcon>
                )}
              </Group>
            </Paper>
          ))}
        </Stack>
      )}

      {error && (
        <Alert color="red" title="오류">
          {error}
        </Alert>
      )}
    </Stack>
  );

  const renderStep3 = () => (
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
              const checked = event.currentTarget.checked;
              setNotificationEnabled(checked);
              if (!checked) {
                setNotificationType('');
                setError('');
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
  );

  const renderStep4 = () => (
    <Stack gap="xl" align="center">
      <ThemeIcon size={80} radius="xl" color="brand" variant="light">
        <Sparkles size={40} />
      </ThemeIcon>
      
      <div style={{ textAlign: 'center' }}>
        <Text size="xl" fw={700} mb="xs">
          알림 설정이 완료되었습니다!
        </Text>
        <Text size="sm" c="dimmed">
          순위 변동 시 선택하신 방법으로 알림을 받으실 수 있습니다
        </Text>
      </div>

      {selectedTracker && (
        <Paper p="xl" radius="md" style={{ border: '1px solid #e0e7ff', width: '100%' }}>
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size={40} radius="md" variant="light" color="brand">
                <TrendingUp size={20} />
              </ThemeIcon>
              <div>
                <Text fw={600} size="sm" c="dimmed">추적 키워드</Text>
                <Text fw={700} size="lg">{selectedTracker.keyword}</Text>
              </div>
            </Group>

            <div style={{ height: 1, background: '#e0e7ff' }} />

            <Group gap="md">
              <div style={{ flex: 1 }}>
                <Group gap="xs" mb={4}>
                  <Clock size={16} color="#635bff" />
                  <Text size="sm" fw={600}>수집 시간</Text>
                </Group>
                <Text size="sm" c="dimmed">
                  {formatUpdateTimes(selectedTracker.update_times)}
                </Text>
              </div>

              <div style={{ flex: 1 }}>
                <Group gap="xs" mb={4}>
                  <Bell size={16} color="#635bff" />
                  <Text size="sm" fw={600}>알림 설정</Text>
                </Group>
                <Text size="sm" c="dimmed">
                  {notificationEnabled 
                    ? `${notificationType === 'email' ? '이메일' : notificationType === 'sms' ? 'SMS' : '카카오톡'} 알림`
                    : '알림 꺼짐'
                  }
                </Text>
              </div>
            </Group>
          </Stack>
        </Paper>
      )}

      <Alert color="blue" title="💡 알림 설정 변경">
        <Text size="sm">
          설정한 시간에 자동으로 순위를 수집합니다.<br />
          순위가 변동되면 선택하신 방법으로 알림을 받으실 수 있습니다.<br />
          언제든지 키워드 순위추적 페이지에서 알림 설정을 변경하실 수 있습니다.
        </Text>
      </Alert>
    </Stack>
  );

  const progress = (currentStep / 4) * 100;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      size="xl"
      centered
      padding="xl"
      radius="md"
      title={
        <div>
          <Text size="xl" fw={700} style={{ 
            background: 'linear-gradient(135deg, #635bff 0%, #9b87ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            순위추적 알림 설정하기
          </Text>
          <Text size="sm" c="dimmed" mt={4}>
            {currentStep === 1 && '매장 선택'}
            {currentStep === 2 && '키워드 선택'}
            {currentStep === 3 && '알림 설정'}
            {currentStep === 4 && '설정 완료'}
          </Text>
        </div>
      }
    >
      <Stack gap="lg">
        {/* Progress Bar */}
        <Progress 
          value={progress} 
          size="sm" 
          radius="xl" 
          color="brand"
          style={{ 
            background: '#f0f4ff'
          }}
        />

        {/* Step Content */}
        <div style={{ minHeight: 400 }}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Navigation Buttons */}
        <Group justify="space-between">
          {currentStep > 1 && currentStep < 4 ? (
            <Button 
              variant="light" 
              color="gray"
              onClick={handleBack}
              disabled={loading || loadingTrackers}
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
              loadingStores || 
              loadingTrackers ||
              (currentStep === 1 && !selectedStore) ||
              (currentStep === 2 && !selectedTracker)
            }
            rightSection={
              loading ? (
                <Loader size={16} color="white" />
              ) : currentStep < 4 ? (
                <ChevronRight size={16} />
              ) : null
            }
            style={{ minWidth: 140 }}
          >
            {loading 
              ? '처리 중...' 
              : currentStep === 1
                ? '다음'
                : currentStep === 2
                  ? '다음'
                  : currentStep === 3
                    ? '알림 설정 완료'
                    : '네 알겠습니다'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
