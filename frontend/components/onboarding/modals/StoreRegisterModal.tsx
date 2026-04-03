'use client';

import { useState } from 'react';
import { Search, CheckCircle2, Sparkles, Store as StoreIcon } from 'lucide-react';
import OnboardingModal from './OnboardingModal';
import StoreSelector from './StoreSelector';
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
  place_x?: string;
  place_y?: string;
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
          place_x: selectedStore.place_x || null,
          place_y: selectedStore.place_y || null,
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

  // Step 1 컨텐츠 - 모바일 최적화
  const renderStep1 = () => (
    <div className="space-y-3 md:space-y-4">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          매장을 등록하고 모든 기능을 사용하세요
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          관리하실 매장명을 입력하고 조회해주세요.<br />
          <span className="text-xs md:text-sm text-neutral-500">
            💡 정확한 매장명을 입력하면 빠르게 찾을 수 있어요!
          </span>
        </p>
      </div>

      <div>
        <label className="block text-sm font-bold text-neutral-900 mb-2">
          매장명
        </label>
        <div className="relative">
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && handleNext()}
            placeholder="예: 스타벅스 강남점"
            className="w-full h-12 md:h-14 pl-4 pr-12 text-base md:text-lg border-2 border-neutral-300 rounded-button focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-neutral-100 disabled:cursor-not-allowed transition-all duration-200"
            disabled={loading}
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 text-neutral-400" />
        </div>
      </div>

      {error && (
        <div className="p-3 md:p-4 bg-error-bg border border-error rounded-button">
          <p className="text-sm md:text-base text-error font-medium">{error}</p>
        </div>
      )}
    </div>
  );

  // Step 2 컨텐츠 - StoreSelector 사용
  const renderStep2 = () => {
    // StoreSearchResult를 StoreSelector가 기대하는 형식으로 변환
    const formattedStores = searchResults.map(store => ({
      id: store.place_id,
      place_id: store.place_id,
      name: store.name,
      address: store.address,
      thumbnail: store.thumbnail,
      platform: 'naver',
      category: store.category,
    }));

    const formattedSelected = selectedStore ? {
      id: selectedStore.place_id,
      place_id: selectedStore.place_id,
      name: selectedStore.name,
      address: selectedStore.address,
      thumbnail: selectedStore.thumbnail,
      platform: 'naver',
      category: selectedStore.category,
    } : null;

    return (
      <div className="space-y-3 md:space-y-4">
        <div className="text-center space-y-2 mb-4 md:mb-5">
          <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
            매장을 선택하고 등록하세요
          </h3>
          <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
            총 <span className="font-bold text-emerald-600">{searchResults.length}개</span>의 매장을 찾았습니다.
          </p>
        </div>

        <StoreSelector
          stores={formattedStores}
          selectedStore={formattedSelected}
          onSelect={(store) => {
            const original = searchResults.find(s => s.place_id === store.id);
            if (original) {
              setSelectedStore(original);
            }
          }}
          emptyMessage="검색 결과가 없습니다."
        />

        {error && (
          <div className="p-3 md:p-4 bg-error-bg border border-error rounded-button">
            <p className="text-sm md:text-base text-error font-medium">{error}</p>
          </div>
        )}
      </div>
    );
  };

  // Step 3 컨텐츠 (완료) - TurboTax 스타일
  const renderStep3 = () => (
    <div className="text-center py-6 md:py-8">
      <div className="relative inline-block mb-6">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-success-bg rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-success" />
        </div>
        <Sparkles className="w-6 h-6 text-brand-red absolute -top-1 -right-1 animate-pulse" />
      </div>
      
      <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-3 leading-tight">
        매장 등록 완료! 🎉
      </h3>
      
      <p className="text-sm md:text-base text-neutral-600 mb-6 leading-relaxed">
        이제 모든 기능을 사용하실 수 있습니다.
      </p>

      {selectedStore && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 max-w-sm mx-auto">
          <p className="text-xs md:text-sm text-neutral-600 mb-1">등록된 매장</p>
          <p className="text-base md:text-lg font-bold text-emerald-700 leading-tight">
            {selectedStore.name}
          </p>
        </div>
      )}
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
      icon={StoreIcon}
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
