'use client';

import { useState, useEffect } from 'react';
import { Loader2, Target, CheckCircle2, Sparkles, MapPin } from 'lucide-react';
import OnboardingModal from './OnboardingModal';
import StoreSelector from './StoreSelector';
import KeywordInput from './KeywordInput';
import { api } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface TargetKeywordsModalProps {
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

export default function TargetKeywordsModal({
  isOpen,
  onClose,
  onComplete,
}: TargetKeywordsModalProps) {
  const { getToken, user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [stores, setStores] = useState<RegisteredStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null);
  
  // 키워드 배열
  const [regions, setRegions] = useState<string[]>([]);
  const [landmarks, setLandmarks] = useState<string[]>([]);
  const [menus, setMenus] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [others, setOthers] = useState<string[]>([]);
  
  // 임시 입력값
  const [tempInput, setTempInput] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysisSuccess, setAnalysisSuccess] = useState(false);
  const [totalKeywords, setTotalKeywords] = useState(0);
  const [extractedKeywords, setExtractedKeywords] = useState<Array<{keyword: string, volume: number}>>([]);
  const [historyId, setHistoryId] = useState<string | null>(null);

  const totalSteps = 8;

  // 매장 목록 로드
  useEffect(() => {
    if (isOpen && currentStep === 1) {
      loadStores();
    }
  }, [isOpen, currentStep]);

  // 매장 선택 시 주소에서 지역명 자동 추출
  useEffect(() => {
    if (selectedStore && selectedStore.address) {
      // 매장이 바뀔 때마다 지역명 초기화 후 새로 추출
      setRegions([]);
      autoExtractRegions(selectedStore.address);
    }
  }, [selectedStore]);

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
        },
        cache: "no-store"
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

  const autoExtractRegions = (address: string) => {
    const guMatch = address.match(/([가-힣]+구)/g);
    const dongMatch = address.match(/([가-힣]+동)/g);
    
    const extracted: string[] = [];
    if (guMatch) extracted.push(...guMatch);
    if (dongMatch) extracted.push(...dongMatch);
    
    // 중복 제거
    const uniqueRegions = [...new Set(extracted)];
    setRegions(uniqueRegions);
  };

  // KeywordInput 컴포넌트가 사용하는 콜백 함수들
  const addRegion = (keyword: string) => setRegions([...regions, keyword]);
  const removeRegion = (index: number) => setRegions(regions.filter((_, i) => i !== index));
  
  const addLandmark = (keyword: string) => setLandmarks([...landmarks, keyword]);
  const removeLandmark = (index: number) => setLandmarks(landmarks.filter((_, i) => i !== index));
  
  const addMenu = (keyword: string) => setMenus([...menus, keyword]);
  const removeMenu = (index: number) => setMenus(menus.filter((_, i) => i !== index));
  
  const addIndustry = (keyword: string) => setIndustries([...industries, keyword]);
  const removeIndustry = (index: number) => setIndustries(industries.filter((_, i) => i !== index));
  
  const addOther = (keyword: string) => setOthers([...others, keyword]);
  const removeOther = (index: number) => setOthers(others.filter((_, i) => i !== index));

  // 분석 시작
  const handleAnalyze = async () => {
    if (!selectedStore) {
      setError('매장을 선택해주세요.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!user) {
        setError('로그인이 필요합니다.');
        setLoading(false);
        setCurrentStep(1);
        return;
      }

      console.log('[타겟 키워드] 분석 시작:', {
        store_id: selectedStore.id,
        user_id: user.id,
        regions,
        landmarks,
        menus,
        industries,
        others
      });

      const token = await getToken();
      if (!token) {
        setError('로그인이 필요합니다.');
        setLoading(false);
        setCurrentStep(1);
        return;
      }
      const response = await fetch(`${api.baseUrl}/api/v1/target-keywords/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          store_id: selectedStore.id,
          // user_id는 백엔드에서 current_user로부터 추출되므로 제거
          regions,
          landmarks,
          menus,
          industries,
          others,
        }),
      });

      console.log('[타겟 키워드] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[타겟 키워드] Error:', errorData);
        throw new Error(errorData.detail || errorData.message || '분석에 실패했습니다.');
      }

      const result = await response.json();
      console.log('[타겟 키워드] 분석 완료:', result);
      
      if (result.status === 'success' && result.data) {
        const keywords = result.data.top_keywords || [];
        setTotalKeywords(keywords.length);
        
        // 추출된 키워드 목록 저장 (상위 10개만)
        const keywordList = keywords.slice(0, 10).map((kw: any) => ({
          keyword: kw.keyword,
          volume: kw.total_volume || 0
        }));
        setExtractedKeywords(keywordList);
        
        setAnalysisSuccess(true);
        
        // 히스토리 ID 저장
        if (result.history_id) {
          setHistoryId(result.history_id);
          console.log('[타겟 키워드] 히스토리 ID 저장:', result.history_id);
        }
        
        setCurrentStep(8);
      } else {
        throw new Error(result.message || '분석 결과를 가져오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('[타겟 키워드] 분석 에러:', err);
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
      setLoading(false);
      setCurrentStep(6); // 기타 키워드 입력 단계로 돌아가기
    } finally {
      setLoading(false);
    }
  };

  // 다음 단계
  const handleNext = () => {
    if (currentStep === 1) {
      if (!selectedStore) {
        setError('매장을 선택해주세요.');
        return;
      }
      setError('');
      setTempInput(''); // 입력창 비우기
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // 지역명은 필수
      if (regions.length === 0) {
        setError('최소 1개 이상의 지역명을 입력해주세요.');
        return;
      }
      setError('');
      setTempInput(''); // 입력창 비우기
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // 랜드마크는 선택사항
      setError('');
      setTempInput(''); // 입력창 비우기
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // 메뉴는 필수
      if (menus.length === 0) {
        setError('최소 1개 이상의 메뉴나 상품명을 입력해주세요.');
        return;
      }
      setError('');
      setTempInput(''); // 입력창 비우기
      setCurrentStep(5);
    } else if (currentStep === 5) {
      // 업종은 필수
      if (industries.length === 0) {
        setError('최소 1개 이상의 업종을 입력해주세요.');
        return;
      }
      setError('');
      setTempInput(''); // 입력창 비우기
      setCurrentStep(6);
    } else if (currentStep === 6) {
      // 기타는 선택사항
      setError('');
      setTempInput(''); // 입력창 비우기
      setCurrentStep(7);
      handleAnalyze();
    } else if (currentStep === 8) {
      // 상세 페이지로 이동
      onComplete();
      onClose();
      
      // 히스토리 ID가 있으면 URL 파라미터로 전달
      const targetUrl = historyId 
        ? `/dashboard/naver/target-keywords?historyId=${historyId}`
        : '/dashboard/naver/target-keywords';
      
      router.push(targetUrl);
    }
  };

  // 이전 단계
  const handleBack = () => {
    if (currentStep > 1 && currentStep !== 7) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  // Step 1: 매장 선택 - StoreSelector 사용
  const renderStep1 = () => {
    const formattedStores = stores.map(store => ({
      id: store.id,
      place_id: store.place_id,
      name: store.name,
      address: store.address,
      thumbnail: store.thumbnail,
      platform: store.platform,
    }));

    const formattedSelected = selectedStore ? {
      id: selectedStore.id,
      place_id: selectedStore.place_id,
      name: selectedStore.name,
      address: selectedStore.address,
      thumbnail: selectedStore.thumbnail,
      platform: selectedStore.platform,
    } : null;

    return (
      <div className="space-y-3 md:space-y-4">
        <div className="text-center space-y-2">
          <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
            어떤 매장의 타겟 키워드를 찾을까요?
          </h3>
          <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
            매장 선택 시 주소에서 자동으로 지역명을 추출해드려요!
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
      </div>
    );
  };

  // Step 2: 지역명 입력 - KeywordInput 사용
  const renderStep2 = () => (
    <div className="space-y-3 md:space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          매장 주변 지역명을 알려주세요
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          예: 강남, 역삼동, 서초 등 (주소에서 자동 추출!)
        </p>
      </div>

      <KeywordInput
        label="지역명"
        keywords={regions}
        onAdd={addRegion}
        onRemove={removeRegion}
        placeholder="지역명 입력 후 엔터"
        helperText="💡 Tip: 지역명을 입력하면 '강남 맛집', '역삼동 카페' 같은 조합이 만들어져요"
      />

      {error && (
        <div className="p-3 md:p-4 bg-error-bg border border-error rounded-button">
          <p className="text-sm md:text-base text-error font-medium">{error}</p>
        </div>
      )}
    </div>
  );

  // Step 3: 랜드마크 입력 - KeywordInput 사용
  const renderStep3 = () => (
    <div className="space-y-3 md:space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          근처에 유명한 장소가 있나요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          예: 강남역, 코엑스, 타워팰리스 등 (선택사항)
        </p>
      </div>

      <KeywordInput
        label="랜드마크 (선택)"
        keywords={landmarks}
        onAdd={addLandmark}
        onRemove={removeLandmark}
        placeholder="랜드마크 입력 후 엔터"
        helperText="💡 Tip: 랜드마크를 추가하면 '강남역 맛집' 같은 조합이 추가로 만들어져요"
      />
    </div>
  );

  // Step 4: 메뉴/상품명 입력 - KeywordInput 사용
  const renderStep4 = () => (
    <div className="space-y-3 md:space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          어떤 메뉴나 상품을 판매하시나요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          예: 보쌈, 칼국수, 커피, 헤어컷 등
        </p>
      </div>

      <KeywordInput
        label="메뉴/상품명"
        keywords={menus}
        onAdd={addMenu}
        onRemove={removeMenu}
        placeholder="메뉴 입력 후 엔터"
        helperText="💡 Tip: 메뉴를 추가하면 '강남 보쌈 맛집' 같은 조합이 만들어져요"
      />

      {error && (
        <div className="p-3 md:p-4 bg-error-bg border border-error rounded-button">
          <p className="text-sm md:text-base text-error font-medium">{error}</p>
        </div>
      )}
    </div>
  );

  // Step 5: 업종 입력 - KeywordInput 사용
  const renderStep5 = () => (
    <div className="space-y-3 md:space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          어떤 업종인가요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          예: 맛집, 카페, 헤어샵, 네일샵 등
        </p>
      </div>

      <KeywordInput
        label="업종"
        keywords={industries}
        onAdd={addIndustry}
        onRemove={removeIndustry}
        placeholder="업종 입력 후 엔터"
        helperText="💡 Tip: 업종을 추가하면 '강남 맛집' 같은 기본 조합이 만들어져요"
      />

      {error && (
        <div className="p-3 md:p-4 bg-error-bg border border-error rounded-button">
          <p className="text-sm md:text-base text-error font-medium">{error}</p>
        </div>
      )}
    </div>
  );

  // Step 6: 기타 키워드 입력 - KeywordInput 사용
  const renderStep6 = () => (
    <div className="space-y-3 md:space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          추가로 강조하고 싶은 특징이 있나요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          예: 데이트, 회식, 단체주문, 가성비 등 (선택사항)
        </p>
      </div>

      <KeywordInput
        label="기타 특징 (선택)"
        keywords={others}
        onAdd={addOther}
        onRemove={removeOther}
        placeholder="특징 입력 후 엔터"
        helperText="💡 Tip: 특징을 추가하면 '강남 데이트 맛집' 같은 조합이 추가로 만들어져요"
      />

      {/* 입력 요약 */}
      <div className="bg-emerald-50 border-2 border-emerald-600/30 rounded-xl p-3 md:p-4">
        <p className="text-sm md:text-base text-neutral-900 font-bold mb-3 leading-tight">
          ✨ 입력 내용 요약
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs md:text-sm text-neutral-700">
          {regions.length > 0 && <div>📍 지역명: {regions.length}개</div>}
          {landmarks.length > 0 && <div>🏛️ 랜드마크: {landmarks.length}개</div>}
          {menus.length > 0 && <div>🍽️ 메뉴: {menus.length}개</div>}
          {industries.length > 0 && <div>🏢 업종: {industries.length}개</div>}
          {others.length > 0 && <div>✨ 기타: {others.length}개</div>}
        </div>
      </div>

      {error && (
        <div className="p-3 md:p-4 bg-error-bg border border-error rounded-button">
          <p className="text-sm md:text-base text-error font-medium">{error}</p>
        </div>
      )}
    </div>
  );

  // Step 7: 분석 중 - TurboTax 스타일
  const renderStep7 = () => (
    <div className="text-center py-8 md:py-12">
      <div className="relative inline-block mb-6">
        <Loader2 className="w-16 h-16 md:w-20 md:h-20 animate-spin text-emerald-600 mx-auto" />
        <Target className="w-6 h-6 md:w-8 md:h-8 text-primary-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-3 leading-tight">
        타겟 키워드 분석 중...
      </h3>
      <p className="text-sm md:text-base text-neutral-600 mb-2 leading-relaxed">
        키워드를 조합하고 검색량을 분석하고 있습니다
      </p>
      <p className="text-xs md:text-sm text-neutral-500">
        잠시만 기다려주세요 (약 10~20초 소요)
      </p>
    </div>
  );

  // Step 8: 완료 - TurboTax 스타일
  const renderStep8 = () => (
    <div className="space-y-3 md:space-y-4">
      <div className="text-center">
        <div className="relative inline-block mb-4">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-success-bg rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-success" />
          </div>
          <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-brand-red absolute -top-1 -right-1 animate-pulse" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-2 leading-tight">
          분석 완료! 🎉
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          타겟 키워드 <span className="font-bold text-emerald-600">{totalKeywords}개</span>를 찾았어요!
        </p>
      </div>

      <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl p-4 md:p-6 border-2 border-emerald-600/30">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs md:text-sm font-bold text-neutral-600 mb-1">선택한 매장</p>
            <p className="text-base md:text-lg font-bold text-neutral-900 leading-tight">{selectedStore?.name}</p>
          </div>
          <div>
            <p className="text-xs md:text-sm font-bold text-neutral-600 mb-1">추출된 키워드</p>
            <p className="text-2xl md:text-3xl font-extrabold text-emerald-600">{totalKeywords}개</p>
          </div>
        </div>
      </div>

      {/* 추출된 키워드 미리보기 (상위 10개) */}
      {extractedKeywords.length > 0 && (
        <div className="bg-white rounded-xl p-4 md:p-5 border-2 border-info/30">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 md:w-5 md:h-5 text-info" />
            <h4 className="text-sm md:text-base font-bold text-neutral-900 leading-tight">
              추출된 키워드 (상위 10개)
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {extractedKeywords.map((kw, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 px-3 py-2 bg-info-bg rounded-button border border-info/30"
              >
                <span className="text-sm font-bold text-neutral-900">
                  {kw.keyword}
                </span>
                <span className="text-xs text-info font-bold">
                  {kw.volume.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          {totalKeywords > 10 && (
            <p className="text-xs md:text-sm text-info mt-3 text-center font-medium">
              나머지 {totalKeywords - 10}개는 상세 페이지에서 확인하세요 →
            </p>
          )}
        </div>
      )}

      <div className="bg-neutral-50 rounded-xl p-3 md:p-4 border border-neutral-300">
        <p className="text-sm md:text-base font-bold text-neutral-900 mb-2 leading-tight">
          상세 페이지에서 확인하실 수 있어요:
        </p>
        <ul className="text-xs md:text-sm text-neutral-600 space-y-1 leading-relaxed">
          <li>• 검색량 기준 상위 20개 타겟 키워드</li>
          <li>• 키워드별 PC/모바일 검색량</li>
          <li>• 경쟁도 분석</li>
          <li>• 키워드별 플레이스 순위</li>
          <li>• 플레이스 SEO 최적화 상태</li>
          <li>• 개선 제안</li>
        </ul>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      case 6:
        return renderStep6();
      case 7:
        return renderStep7();
      case 8:
        return renderStep8();
      default:
        return null;
    }
  };

  return (
    <OnboardingModal
      isOpen={isOpen}
      onClose={onClose}
      title="타겟키워드 설정하기"
      icon={Target}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      onNext={handleNext}
      nextButtonText={
        currentStep === 1
          ? '다음: 지역명 입력'
          : currentStep === 2
          ? '다음: 랜드마크 입력'
          : currentStep === 3
          ? '다음: 메뉴 입력'
          : currentStep === 4
          ? '다음: 업종 입력'
          : currentStep === 5
          ? '다음: 기타 키워드'
          : currentStep === 6
          ? '분석 시작하기'
          : currentStep === 7
          ? '분석 중...'
          : '상세 결과 보기'
      }
      nextButtonDisabled={
        (currentStep === 1 && !selectedStore) ||
        currentStep === 7 ||
        loading
      }
      showBackButton={currentStep > 1 && currentStep !== 7 && currentStep !== 8}
    >
      {renderContent()}
    </OnboardingModal>
  );
}
