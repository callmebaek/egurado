'use client';

import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, ExternalLink, CheckCircle2, Sparkles, Search } from 'lucide-react';
import OnboardingModal from './OnboardingModal';
import StoreSelector from './StoreSelector';
import { api } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface PlaceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface RegisteredStore {
  id: string;
  place_id: string;
  name: string;
  category: string;
  address: string;
  thumbnail?: string;
  platform: string;
}

interface DiagnosisResult {
  total_score: number;
  max_score: number;
  grade: string;
  base_score: number;
  bonus_score: number;
  place_name: string;
  place_id: string;
  diagnosis_date: string;
}

interface DiagnosisResponse {
  status: string;
  place_id: string;
  mode: string;
  fill_rate: number;
  details: any;
  diagnosis: DiagnosisResult;
  history_id?: string;
}

export default function PlaceAuditModal({
  isOpen,
  onClose,
  onComplete,
}: PlaceAuditModalProps) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [stores, setStores] = useState<RegisteredStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);

  const totalSteps = 3;

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
      // 네이버 매장만 필터링
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

  // Step 1: 매장 선택 후 진단 시작
  const handleStartDiagnosis = async () => {
    if (!selectedStore) {
      setError('매장을 선택해주세요.');
      return;
    }

    setCurrentStep(2);
    setLoading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const url = api.naver.analyzePlaceDetails(
        selectedStore.place_id,
        selectedStore.name,
        selectedStore.id
      );

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('플레이스 진단에 실패했습니다.');
      }

      const data: DiagnosisResponse = await response.json();
      setDiagnosisResult(data.diagnosis);
      setHistoryId(data.history_id || null);
      setCurrentStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : '진단 중 오류가 발생했습니다.');
      setCurrentStep(1);
    } finally {
      setLoading(false);
    }
  };

  // 상세 리포트 보기
  const handleViewDetailReport = () => {
    onComplete();
    onClose();
    // 실제 플레이스 진단 페이지로 이동 (history_id가 있으면 쿼리 파라미터로 전달)
    if (historyId) {
      router.push(`/dashboard/naver/audit?historyId=${historyId}`);
    } else {
      router.push('/dashboard/naver/audit');
    }
  };

  // 완료 후 닫기
  const handleFinish = () => {
    handleViewDetailReport();
  };

  // 이전 버튼
  const handleBack = () => {
    if (currentStep === 2) {
      // 진단 중에는 뒤로가기 불가
      return;
    }
  };

  // 다음 버튼
  const handleNext = () => {
    if (currentStep === 1) {
      handleStartDiagnosis();
    } else if (currentStep === 3) {
      handleFinish();
    }
  };

  // Helper: 등급 색상 (TurboTax 스타일)
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'text-brand-red';
      case 'A': return 'text-emerald-600';
      case 'B': return 'text-success';
      case 'C': return 'text-warning';
      default: return 'text-error';
    }
  };

  const getGradeBg = (grade: string) => {
    switch (grade) {
      case 'S': return 'bg-gradient-to-br from-red-50 to-pink-50 border-2 border-brand-red/30';
      case 'A': return 'bg-gradient-to-br from-emerald-50 to-blue-50 border-2 border-emerald-600/30';
      case 'B': return 'bg-gradient-to-br from-success-bg to-green-50 border-2 border-success/30';
      case 'C': return 'bg-gradient-to-br from-warning-bg to-yellow-50 border-2 border-warning/30';
      default: return 'bg-gradient-to-br from-error-bg to-red-50 border-2 border-error/30';
    }
  };

  // Step 1 컨텐츠: 매장 선택 - StoreSelector 사용
  const renderStep1 = () => {
    const formattedStores = stores.map(store => ({
      id: store.id,
      place_id: store.place_id,
      name: store.name,
      address: store.address,
      thumbnail: store.thumbnail,
      platform: store.platform,
      category: store.category,
    }));

    const formattedSelected = selectedStore ? {
      id: selectedStore.id,
      place_id: selectedStore.place_id,
      name: selectedStore.name,
      address: selectedStore.address,
      thumbnail: selectedStore.thumbnail,
      platform: selectedStore.platform,
      category: selectedStore.category,
    } : null;

    return (
      <div className="space-y-3 md:space-y-4">
        <div className="text-center space-y-2">
          <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
            어떤 매장을 진단하시겠습니까?
          </h3>
          <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
            네이버 플레이스의 모든 정보를 분석합니다.
          </p>
        </div>

        <StoreSelector
          stores={formattedStores}
          selectedStore={formattedSelected}
          onSelect={(store) => {
            const original = stores.find(s => s.id === store.id);
            if (original) {
              setSelectedStore(original);
            }
          }}
          loading={loading}
          emptyMessage={error || '등록된 네이버 플레이스 매장이 없습니다.'}
        />

        {error && stores.length > 0 && (
          <div className="p-3 md:p-4 bg-error-bg border border-error rounded-button">
            <p className="text-sm md:text-base text-error font-medium">{error}</p>
          </div>
        )}
      </div>
    );
  };

  // Step 2 컨텐츠: 진단 진행 중 - Emerald 스타일
  const renderStep2 = () => (
    <div className="text-center py-8 md:py-12">
      <div className="relative inline-block mb-6">
        <Loader2 className="w-16 h-16 md:w-20 md:h-20 animate-spin text-emerald-600 mx-auto" />
        <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-3 leading-tight">
        플레이스 진단 중...
      </h3>
      <p className="text-sm md:text-base text-neutral-600 mb-2 leading-relaxed">
        {selectedStore?.name} 매장을 분석하고 있습니다.
      </p>
      <p className="text-xs md:text-sm text-neutral-500">
        잠시만 기다려주세요. (약 10~20초 소요)
      </p>
    </div>
  );

  // Step 3 컨텐츠: 진단 완료 - TurboTax 스타일
  const renderStep3 = () => {
    if (!diagnosisResult) return null;

    return (
      <div className="space-y-3 md:space-y-4">
        {/* 성공 아이콘 */}
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-success-bg rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-success" />
            </div>
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-brand-red absolute -top-1 -right-1 animate-pulse" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-2 leading-tight">
            진단 완료! 🎉
          </h3>
          <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
            {selectedStore?.name} 매장을 분석했습니다.
          </p>
        </div>

        {/* 종합 점수 - 등급별 색상 */}
        <div className={`rounded-xl p-4 md:p-6 ${getGradeBg(diagnosisResult.grade)}`}>
          <div className="text-center">
            <p className="text-xs md:text-sm font-bold text-neutral-600 mb-2">종합 점수</p>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className={`text-5xl md:text-6xl font-extrabold ${getGradeColor(diagnosisResult.grade)}`}>
                {diagnosisResult.grade}
              </span>
              <span className="text-xl md:text-2xl text-neutral-500 font-bold">등급</span>
            </div>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-2xl md:text-3xl font-bold text-neutral-900">
                {diagnosisResult.total_score.toFixed(1)}
              </span>
              <span className="text-base md:text-lg text-neutral-600 font-medium">
                / {diagnosisResult.max_score} 점
              </span>
            </div>
            {diagnosisResult.bonus_score > 0 && (
              <div className="mt-3">
                <span className="inline-flex items-center px-3 py-1.5 bg-success-bg text-success rounded-button text-xs md:text-sm font-bold border border-success/30">
                  ✨ 보너스 +{diagnosisResult.bonus_score}점
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 상세 리포트 안내 */}
        <div className="bg-info-bg rounded-xl p-3 md:p-4 border border-info/30">
          <div className="flex items-start gap-2 md:gap-3">
            <ExternalLink className="w-4 h-4 md:w-5 md:h-5 text-info flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm md:text-base font-bold text-neutral-900 mb-1 leading-tight">
                상세 리포트에서 더 자세히 확인하세요
              </p>
              <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
                • 17개 항목별 상세 분석<br />
                • 우선순위 개선 권장사항<br />
                • 카테고리별 등급 및 점수<br />
                • 과거 진단 기록 조회
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 현재 단계에 따른 컨텐츠
  const renderContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  return (
    <OnboardingModal
      isOpen={isOpen}
      onClose={onClose}
      title="플레이스 진단하기"
      icon={Search}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      onNext={handleNext}
      nextButtonText={
        currentStep === 1
          ? loading
            ? '매장 불러오는 중...'
            : '진단 시작하기'
          : currentStep === 2
          ? '진단 중...'
          : '상세 리포트 보기'
      }
      nextButtonDisabled={
        (currentStep === 1 && (!selectedStore || loading)) ||
        currentStep === 2
      }
      showBackButton={currentStep === 1 && !loading}
    >
      {renderContent()}
    </OnboardingModal>
  );
}
