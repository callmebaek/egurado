'use client';

import { useState } from 'react';
import { Store, Search } from 'lucide-react';
import OnboardingModal from './OnboardingModal';
import { api } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';

interface StoreRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface StoreSearchResult {
  place_id: string;
  name: string;
  category: string;
  address: string;
  road_address?: string;
  thumbnail?: string;
}

export default function StoreRegisterModal({
  isOpen,
  onClose,
  onComplete,
}: StoreRegisterModalProps) {
  const { getToken } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [storeName, setStoreName] = useState('');
  const [searchResults, setSearchResults] = useState<StoreSearchResult[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 3;

  // Step 1: 매장 검색
  const handleSearch = async () => {
    if (!storeName.trim()) {
      setError('매장명을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 검색은 인증 불필요
      const response = await fetch(api.naver.searchStores(storeName));

      if (!response.ok) {
        throw new Error('매장 검색에 실패했습니다.');
      }

      const data = await response.json();
      setSearchResults(data.results || []);
      
      if (data.results && data.results.length > 0) {
        setCurrentStep(2);
      } else {
        setError('검색 결과가 없습니다. 다른 매장명으로 시도해주세요.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: 매장 등록
  const handleRegister = async () => {
    if (!selectedStore) {
      setError('매장을 선택해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) {
        setError('로그인이 필요합니다.');
        return;
      }
      const response = await fetch(api.stores.create(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          place_id: selectedStore.place_id,
          name: selectedStore.name,
          category: selectedStore.category,
          address: selectedStore.address,
          road_address: selectedStore.road_address || '',
          thumbnail: selectedStore.thumbnail || '',
          platform: 'naver',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || '매장 등록에 실패했습니다.');
      }

      setCurrentStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Step 완료 후 닫기
  const handleFinish = () => {
    onComplete();
    onClose();
    // 상태 초기화
    setCurrentStep(1);
    setStoreName('');
    setSearchResults([]);
    setSelectedStore(null);
    setError('');
  };

  // 이전 버튼
  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
      setSelectedStore(null);
      setError('');
    }
  };

  // 다음 버튼
  const handleNext = () => {
    if (currentStep === 1) {
      handleSearch();
    } else if (currentStep === 2) {
      handleRegister();
    } else if (currentStep === 3) {
      handleFinish();
    }
  };

  // Step 1 컨텐츠
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          윕플에서는 당신이 관리하는 매장을 등록해야 모든 기능을 사용할 수 있습니다.
        </h3>
        <p className="text-gray-600">
          당신의 매장명을 넣어주시고, 조회 해주세요!<br />
          <span className="text-sm text-gray-500">
            (정확한 매장명을 입력하시면 빨리 찾는데 도움이 됩니다!)
          </span>
        </p>
      </div>

      <div className="relative">
        <input
          type="text"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !loading && handleNext()}
          placeholder="예: 강남역 카페"
          className="w-full px-4 py-4 pr-12 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
          disabled={loading}
        />
        <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );

  // Step 2 컨텐츠
  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          자!! 이제 당신의 매장을 선택하시고, &apos;등록하기&apos; 버튼을 눌러주세요!
        </h3>
        <p className="text-gray-600 text-sm">
          총 {searchResults.length}개의 매장을 찾았습니다.
        </p>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {searchResults.map((store) => (
          <button
            key={store.place_id}
            onClick={() => setSelectedStore(store)}
            className={`
              w-full p-4 border-2 rounded-lg text-left transition-all
              ${
                selectedStore?.place_id === store.place_id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <div className={`
                w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                ${
                  selectedStore?.place_id === store.place_id
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }
              `}>
                {selectedStore?.place_id === store.place_id && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Store className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900">{store.name}</span>
                </div>
                <p className="text-sm text-gray-600">{store.address}</p>
                <p className="text-xs text-gray-500 mt-1">{store.category}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );

  // Step 3 컨텐츠 (완료)
  const renderStep3 = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg
          className="w-10 h-10 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2">등록되셨습니다! 🎉</h3>
      <p className="text-gray-600">
        이제 모든 기능을 사용하실 수 있습니다.
      </p>
    </div>
  );

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
      title="매장 등록하기"
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      onNext={handleNext}
      nextButtonText={
        currentStep === 1
          ? loading
            ? '검색 중...'
            : '조회하기'
          : currentStep === 2
          ? loading
            ? '등록 중...'
            : '등록하기'
          : '완료'
      }
      nextButtonDisabled={
        loading ||
        (currentStep === 1 && !storeName.trim()) ||
        (currentStep === 2 && !selectedStore)
      }
      showBackButton={currentStep !== 3}
    >
      {renderContent()}
    </OnboardingModal>
  );
}
