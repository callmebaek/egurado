'use client';

import { useState, useEffect } from 'react';
import { Store, Loader2, TrendingUp, ExternalLink, CheckCircle2 } from 'lucide-react';
import OnboardingModal from './OnboardingModal';
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

      const data = await response.json();
      setDiagnosisResult(data.diagnosis);
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
    // 실제 플레이스 진단 페이지로 이동
    router.push('/dashboard/naver/audit');
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

  // Helper: 등급 색상
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'text-purple-600';
      case 'A': return 'text-blue-600';
      case 'B': return 'text-green-600';
      case 'C': return 'text-orange-600';
      default: return 'text-red-600';
    }
  };

  // Step 1 컨텐츠: 매장 선택
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          어떤 매장을 진단하시겠습니까?
        </h3>
        <p className="text-sm text-gray-600">
          네이버 플레이스에 등록된 모든 정보를 가져와서 분석합니다.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : error && stores.length === 0 ? (
        <div className="text-center py-8">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {stores.map((store) => (
            <button
              key={store.id}
              onClick={() => setSelectedStore(store)}
              className={`
                w-full p-4 border-2 rounded-lg text-left transition-all
                ${
                  selectedStore?.id === store.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-start gap-3">
                {/* 라디오 버튼 */}
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                  ${
                    selectedStore?.id === store.id
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }
                `}>
                  {selectedStore?.id === store.id && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                
                {/* 썸네일 */}
                {store.thumbnail ? (
                  <img
                    src={store.thumbnail}
                    alt={store.name}
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Store className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                
                {/* 매장 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 truncate">{store.name}</span>
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full flex-shrink-0">
                      네이버
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{store.category}</p>
                  <p className="text-xs text-gray-500 mt-1 truncate">{store.address}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {error && stores.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );

  // Step 2 컨텐츠: 진단 진행 중
  const renderStep2 = () => (
    <div className="text-center py-12">
      <div className="relative inline-block mb-6">
        <Loader2 className="w-20 h-20 animate-spin text-blue-600 mx-auto" />
        <TrendingUp className="w-8 h-8 text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3">플레이스 진단 중...</h3>
      <p className="text-gray-600 mb-2">
        {selectedStore?.name} 매장의 정보를 분석하고 있습니다.
      </p>
      <p className="text-sm text-gray-500">
        잠시만 기다려주세요. (약 10~20초 소요)
      </p>
    </div>
  );

  // Step 3 컨텐츠: 진단 완료
  const renderStep3 = () => {
    if (!diagnosisResult) return null;

    return (
      <div className="space-y-6">
        {/* 성공 아이콘 */}
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">진단 완료! 🎉</h3>
          <p className="text-gray-600">
            {selectedStore?.name} 매장의 진단이 완료되었습니다.
          </p>
        </div>

        {/* 종합 점수 */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-600 mb-2">종합 점수</p>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className={`text-6xl font-black ${getGradeColor(diagnosisResult.grade)}`}>
                {diagnosisResult.grade}
              </span>
              <span className="text-2xl text-gray-500">등급</span>
            </div>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-3xl font-bold text-gray-800">
                {diagnosisResult.total_score.toFixed(1)}
              </span>
              <span className="text-lg text-gray-500">
                / {diagnosisResult.max_score} 점
              </span>
            </div>
            {diagnosisResult.bonus_score > 0 && (
              <div className="mt-3">
                <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                  보너스 +{diagnosisResult.bonus_score}점
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 상세 리포트 안내 */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-start gap-3">
            <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">
                상세 리포트에서 더 자세한 정보를 확인하세요
              </p>
              <p className="text-xs text-gray-600">
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
