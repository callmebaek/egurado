'use client';

import { useState, useEffect } from 'react';
import { 
  Store, 
  CheckCircle2, 
  TrendingUp, 
  Bell, 
  Sparkles, 
  Clock,
  Loader2,
  MessageCircle,
  Mail
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/config';
import OnboardingModal from './OnboardingModal';
import StoreSelector from './StoreSelector';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface RankAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface RegisteredStore {
  id: string;
  name: string;
  thumbnail?: string;
  platform: string;
  address: string;
}

interface MetricTracker {
  id: string;
  store_id: string;
  keyword_id: string;
  store_name: string;
  keyword: string;
  platform: string;
  update_frequency: 'daily_once' | 'daily_twice';
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
};

export default function RankAlertsModal({ isOpen, onClose, onComplete }: RankAlertsModalProps) {
  const router = useRouter();
  const { user, getToken } = useAuth();
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

  const totalSteps = 4;

  // 매장 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadStores();
    }
  }, [isOpen]);

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
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notification_enabled: notificationEnabled,
          notification_type: notificationEnabled ? notificationType : null,
          notification_phone: notificationEnabled && notificationType === 'kakao' ? (user?.phone_number || null) : null,
          notification_email: notificationEnabled && notificationType === 'email' ? (user?.email || null) : null,
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
    if (currentStep > 1 && !loadingTrackers && !loading) {
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

  // Step 1: 매장 선택
  const renderStep1 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          어떤 매장의 알림을 설정할까요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          순위 추적 중인 키워드의 알림 설정을 변경할 매장을 선택해주세요
        </p>
      </div>

      <StoreSelector
        stores={stores}
        selectedStore={selectedStore}
        onSelect={setSelectedStore}
        loading={loadingStores}
        emptyMessage="등록된 네이버 플레이스 매장이 없습니다."
      />

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  // Step 2: 추적 키워드 선택
  const renderStep2 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          어떤 키워드의 알림을 받으실래요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          현재 추적 중인 키워드 중 하나를 선택해주세요
        </p>
      </div>

      {loadingTrackers ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-neutral-600">추적 키워드 목록을 불러오는 중...</p>
          </div>
        </div>
      ) : trackers.length === 0 ? (
        <Alert variant="warning">
          <AlertTitle>추적 중인 키워드가 없습니다</AlertTitle>
          <AlertDescription className="text-xs md:text-sm">
            먼저 "플레이스 순위 추적하기"를 통해 키워드를 추적 등록해주세요
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          {trackers.map((tracker) => (
            <Card
              key={tracker.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-card-hover ${
                selectedTracker?.id === tracker.id
                  ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20'
                  : 'border-neutral-200 hover:border-primary-300'
              }`}
              onClick={() => setSelectedTracker(tracker)}
            >
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm md:text-base font-bold text-neutral-900">
                        {tracker.keyword}
                      </p>
                      <Badge 
                        variant={tracker.notification_enabled ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {tracker.notification_enabled ? (
                          <><Bell className="w-3 h-3 mr-1" /> 알림 켜짐</>
                        ) : (
                          '알림 꺼짐'
                        )}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                      <span>{FREQUENCY_LABELS[tracker.update_frequency]}</span>
                      <span className="text-neutral-400">•</span>
                      <span>수집시간: {formatUpdateTimes(tracker.update_times)}</span>
                    </div>
                  </div>
                  {selectedTracker?.id === tracker.id && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  // Step 3: 알림 설정
  const renderStep3 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          순위 변동 시 알림을 받으시겠어요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          순위가 변동되면 즉시 알림을 받을 수 있습니다
        </p>
      </div>

      <Card className="border-neutral-200 shadow-sm">
        <CardContent className="p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm md:text-base font-bold text-neutral-900 mb-1">알림 받기</p>
              <p className="text-xs md:text-sm text-neutral-600">순위 변동 시 알림을 받습니다</p>
            </div>
            <Switch
              checked={notificationEnabled}
              onCheckedChange={(checked) => {
                setNotificationEnabled(checked);
                if (!checked) {
                  setNotificationType('');
                  setError('');
                }
              }}
              className="ml-4"
            />
          </div>

          {notificationEnabled && (
            <div className="pl-4 border-l-2 border-emerald-600 space-y-2">
              <p className="text-sm font-bold text-neutral-900 mb-3">알림 방법</p>
              <div className="space-y-2">
                {[
                  { value: 'email' as const, label: '📧 이메일', desc: '이메일로 알림 받기', disabled: false },
                  { value: 'kakao' as const, label: '💬 카카오톡', desc: '템플릿 승인 대기중', disabled: true },
                  { value: 'sms' as const, label: '📱 SMS', desc: '문자 메시지로 알림 받기 (준비중)', disabled: true },
                ].map((option) => (
                  <Card
                    key={option.value}
                    className={`transition-all duration-200 ${
                      option.disabled
                        ? 'opacity-50 cursor-not-allowed border-neutral-100 bg-neutral-50'
                        : notificationType === option.value
                          ? 'cursor-pointer border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20'
                          : 'cursor-pointer border-neutral-200 hover:border-primary-300 hover:shadow-card-hover'
                    }`}
                    onClick={() => !option.disabled && setNotificationType(option.value)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-neutral-900 mb-0.5">{option.label}</p>
                          <p className="text-xs text-neutral-600">{option.desc}</p>
                        </div>
                        {!option.disabled && notificationType === option.value && (
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 카카오톡 선택 시 전화번호 표시 */}
              {notificationType === 'kakao' && (
                <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <label className="text-xs font-bold text-neutral-700 flex items-center gap-1 mb-1.5">
                    <MessageCircle className="w-3 h-3 text-yellow-600" />
                    알림 받을 전화번호
                  </label>
                  {user?.phone_number ? (
                    <div className="w-full h-10 px-3 border border-neutral-200 rounded-lg bg-neutral-50 text-sm font-medium text-neutral-700 flex items-center">
                      {user.phone_number.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}
                      <span className="ml-2 text-xs text-emerald-600 font-medium">✓ 인증됨</span>
                    </div>
                  ) : (
                    <div className="p-2.5 border border-amber-300 rounded-lg bg-amber-50 text-sm text-amber-700">
                      <p className="font-medium text-xs mb-1">📱 등록된 전화번호가 없습니다</p>
                      <p className="text-[10px] text-amber-600">
                        카카오톡 알림을 받으려면 계정 설정에서 전화번호를 등록해주세요.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 이메일 선택 시 이메일 표시 */}
              {notificationType === 'email' && user?.email && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="text-xs font-bold text-neutral-700 flex items-center gap-1 mb-1.5">
                    <Mail className="w-3 h-3 text-blue-600" />
                    알림 받을 이메일
                  </label>
                  <div className="w-full h-10 px-3 border border-neutral-200 rounded-lg bg-neutral-50 text-sm font-medium text-neutral-700 flex items-center">
                    {user.email}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!notificationEnabled && (
        <Alert variant="default" className="bg-neutral-50">
          <AlertTitle>💡 알림 설정</AlertTitle>
          <AlertDescription className="text-xs md:text-sm">
            알림을 받지 않아도 언제든지 대시보드에서 순위를 확인할 수 있습니다
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  // Step 4: 완료
  const renderStep4 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center py-6 md:py-8">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-success-bg rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-success" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-2 leading-tight">
          알림 설정이 완료되었습니다!
        </h3>
        <p className="text-sm text-neutral-600 leading-relaxed">
          순위 변동 시 선택하신 방법으로 알림을 받으실 수 있습니다
        </p>
      </div>

      {selectedTracker && (
        <Card className="border-neutral-200 shadow-card">
          <CardContent className="p-4 md:p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs md:text-sm text-neutral-600 mb-0.5">추적 키워드</p>
                <p className="text-base md:text-lg font-bold text-neutral-900">{selectedTracker.keyword}</p>
              </div>
            </div>

            <div className="h-px bg-neutral-200" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs md:text-sm font-bold text-neutral-900">수집 시간</p>
                </div>
                <p className="text-xs md:text-sm text-neutral-600">
                  {formatUpdateTimes(selectedTracker.update_times)}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs md:text-sm font-bold text-neutral-900">알림 설정</p>
                </div>
                <p className="text-xs md:text-sm text-neutral-600">
                  {notificationEnabled 
                    ? `${notificationType === 'email' ? '이메일' : notificationType === 'sms' ? 'SMS' : '카카오톡'} 알림`
                    : '알림 꺼짐'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Alert variant="info" className="p-3 md:p-4">
        <AlertTitle>💡 알림 설정 변경</AlertTitle>
        <AlertDescription className="text-xs md:text-sm leading-relaxed">
          설정한 시간에 자동으로 순위를 수집합니다.<br />
          순위가 변동되면 선택하신 방법으로 알림을 받으실 수 있습니다.<br />
          언제든지 키워드 순위추적 페이지에서 알림 설정을 변경하실 수 있습니다.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  return (
    <OnboardingModal
      isOpen={isOpen}
      onClose={handleClose}
      title="순위추적 알림 설정하기"
      icon={Bell}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      onNext={handleNext}
      nextButtonText={
        loading ? '처리 중...' :
        currentStep === 1 ? '다음' :
        currentStep === 2 ? '다음' :
        currentStep === 3 ? '알림 설정 완료' :
        '확인'
      }
      nextButtonDisabled={
        loading || 
        loadingStores || 
        loadingTrackers ||
        (currentStep === 1 && !selectedStore) ||
        (currentStep === 2 && !selectedTracker)
      }
      showBackButton={currentStep > 1 && currentStep < 4 && !loadingTrackers && !loading}
    >
      {renderCurrentStep()}
    </OnboardingModal>
  );
}
