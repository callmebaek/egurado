'use client';

import { useState, useEffect } from 'react';
import { Store, Loader2, Plus, X, Target, CheckCircle2, Sparkles, MapPin } from 'lucide-react';
import OnboardingModal from './OnboardingModal';
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

  const addKeyword = (array: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (tempInput.trim()) {
      setter([...array, tempInput.trim()]);
      setTempInput('');
    }
  };

  const removeKeyword = (index: number, array: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(array.filter((_, i) => i !== index));
  };

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
      const token = getToken();
      if (!token || !user) {
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

      const response = await fetch(`${api.baseUrl}/api/v1/target-keywords/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id: selectedStore.id,
          user_id: user.id,
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

  // Step 1: 매장 선택
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Target className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          어떤 매장의 타겟 키워드를 찾을까요?
        </h3>
        <p className="text-sm text-gray-600">
          매장을 선택하시면 주소에서 자동으로 지역명을 추출해드려요
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
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{store.address}</span>
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Step 2: 지역명 입력
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <MapPin className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          매장 주변 지역명을 알려주세요
        </h3>
        <p className="text-sm text-gray-600">
          예: 강남, 역삼동, 서초 등 (주소에서 자동 추출되었습니다!)
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={tempInput}
          onChange={(e) => setTempInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addKeyword(regions, setRegions)}
          placeholder="지역명 입력 후 Enter"
          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={() => addKeyword(regions, setRegions)}
          className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[60px]">
        {regions.length === 0 ? (
          <p className="text-sm text-gray-400 italic">아직 추가된 지역명이 없습니다</p>
        ) : (
          regions.map((region, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
            >
              {region}
              <X
                className="w-4 h-4 cursor-pointer hover:text-purple-900"
                onClick={() => removeKeyword(index, regions, setRegions)}
              />
            </span>
          ))
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> 지역명을 입력하면 "강남 맛집", "역삼동 카페" 같은 조합이 만들어져요
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-4">
          <p className="text-sm text-red-600 font-semibold">{error}</p>
        </div>
      )}
    </div>
  );

  // Step 3: 랜드마크 입력
  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Sparkles className="w-16 h-16 text-orange-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          근처에 유명한 장소가 있나요?
        </h3>
        <p className="text-sm text-gray-600">
          예: 강남역, 코엑스, 타워팰리스 등 (선택사항)
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={tempInput}
          onChange={(e) => setTempInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addKeyword(landmarks, setLandmarks)}
          placeholder="랜드마크 입력 후 Enter"
          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={() => addKeyword(landmarks, setLandmarks)}
          className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[60px]">
        {landmarks.length === 0 ? (
          <p className="text-sm text-gray-400 italic">건너뛰셔도 괜찮아요</p>
        ) : (
          landmarks.map((landmark, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full text-sm font-medium"
            >
              {landmark}
              <X
                className="w-4 h-4 cursor-pointer hover:text-orange-900"
                onClick={() => removeKeyword(index, landmarks, setLandmarks)}
              />
            </span>
          ))
        )}
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
        <p className="text-sm text-orange-800">
          💡 <strong>Tip:</strong> 랜드마크를 추가하면 "강남역 맛집" 같은 조합이 추가로 만들어져요
        </p>
      </div>
    </div>
  );

  // Step 4: 메뉴/상품명 입력
  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Store className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          어떤 메뉴나 상품을 판매하시나요?
        </h3>
        <p className="text-sm text-gray-600">
          예: 보쌈, 칼국수, 커피, 헤어컷 등
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={tempInput}
          onChange={(e) => setTempInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addKeyword(menus, setMenus)}
          placeholder="메뉴/상품명 입력 후 Enter"
          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={() => addKeyword(menus, setMenus)}
          className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[60px]">
        {menus.length === 0 ? (
          <p className="text-sm text-gray-400 italic">대표 메뉴나 상품을 추가해보세요</p>
        ) : (
          menus.map((menu, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium"
            >
              {menu}
              <X
                className="w-4 h-4 cursor-pointer hover:text-green-900"
                onClick={() => removeKeyword(index, menus, setMenus)}
              />
            </span>
          ))
        )}
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
        <p className="text-sm text-green-800">
          💡 <strong>Tip:</strong> 메뉴를 추가하면 "강남 보쌈 맛집" 같은 조합이 만들어져요
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-4">
          <p className="text-sm text-red-600 font-semibold">{error}</p>
        </div>
      )}
    </div>
  );

  // Step 5: 업종 입력
  const renderStep5 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Target className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          어떤 업종인가요?
        </h3>
        <p className="text-sm text-gray-600">
          예: 맛집, 카페, 헤어샵, 네일샵 등
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={tempInput}
          onChange={(e) => setTempInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addKeyword(industries, setIndustries)}
          placeholder="업종 입력 후 Enter"
          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={() => addKeyword(industries, setIndustries)}
          className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[60px]">
        {industries.length === 0 ? (
          <p className="text-sm text-gray-400 italic">업종을 추가해보세요</p>
        ) : (
          industries.map((industry, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium"
            >
              {industry}
              <X
                className="w-4 h-4 cursor-pointer hover:text-indigo-900"
                onClick={() => removeKeyword(index, industries, setIndustries)}
              />
            </span>
          ))
        )}
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mt-4">
        <p className="text-sm text-indigo-800">
          💡 <strong>Tip:</strong> 업종을 추가하면 "강남 맛집" 같은 기본 조합이 만들어져요
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-4">
          <p className="text-sm text-red-600 font-semibold">{error}</p>
        </div>
      )}
    </div>
  );

  // Step 6: 기타 키워드 입력
  const renderStep6 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Sparkles className="w-16 h-16 text-pink-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          추가로 강조하고 싶은 특징이 있나요?
        </h3>
        <p className="text-sm text-gray-600">
          예: 데이트, 회식, 단체주문, 가성비 등 (선택사항)
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={tempInput}
          onChange={(e) => setTempInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addKeyword(others, setOthers)}
          placeholder="특징 입력 후 Enter"
          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={() => addKeyword(others, setOthers)}
          className="px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[60px]">
        {others.length === 0 ? (
          <p className="text-sm text-gray-400 italic">건너뛰셔도 괜찮아요</p>
        ) : (
          others.map((other, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-pink-100 text-pink-800 rounded-full text-sm font-medium"
            >
              {other}
              <X
                className="w-4 h-4 cursor-pointer hover:text-pink-900"
                onClick={() => removeKeyword(index, others, setOthers)}
              />
            </span>
          ))
        )}
      </div>

      <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mt-4">
        <p className="text-sm text-pink-800">
          💡 <strong>Tip:</strong> 특징을 추가하면 "강남 데이트 맛집" 같은 조합이 추가로 만들어져요
        </p>
      </div>

      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mt-6">
        <p className="text-sm text-blue-900 font-semibold mb-2">
          ✨ 지금까지 입력하신 내용으로 타겟 키워드를 분석할 준비가 되었어요!
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
          {regions.length > 0 && <div>📍 지역명: {regions.length}개</div>}
          {landmarks.length > 0 && <div>🏛️ 랜드마크: {landmarks.length}개</div>}
          {menus.length > 0 && <div>🍽️ 메뉴: {menus.length}개</div>}
          {industries.length > 0 && <div>🏢 업종: {industries.length}개</div>}
          {others.length > 0 && <div>✨ 기타: {others.length}개</div>}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-4">
          <p className="text-sm text-red-600 font-semibold">{error}</p>
        </div>
      )}
    </div>
  );

  // Step 7: 분석 중
  const renderStep7 = () => (
    <div className="text-center py-12">
      <div className="relative inline-block mb-6">
        <Loader2 className="w-20 h-20 animate-spin text-blue-600 mx-auto" />
        <Target className="w-8 h-8 text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3">타겟 키워드 분석 중...</h3>
      <p className="text-gray-600 mb-2">
        입력하신 키워드를 조합하고 검색량을 분석하고 있어요
      </p>
      <p className="text-sm text-gray-500">
        잠시만 기다려주세요 (약 10~20초 소요)
      </p>
    </div>
  );

  // Step 8: 완료
  const renderStep8 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">분석 완료! 🎉</h3>
        <p className="text-gray-600">
          타겟 키워드 {totalKeywords}개를 찾았어요!
        </p>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-1">선택한 매장</p>
            <p className="text-lg font-bold text-gray-900">{selectedStore?.name}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-1">추출된 키워드</p>
            <p className="text-3xl font-bold text-blue-600">{totalKeywords}개</p>
          </div>
        </div>
      </div>

      {/* 추출된 키워드 미리보기 (상위 10개) */}
      {extractedKeywords.length > 0 && (
        <div className="bg-white rounded-lg p-5 border-2 border-indigo-200">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-indigo-600" />
            <h4 className="text-sm font-bold text-gray-900">
              추출된 키워드 (상위 10개)
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {extractedKeywords.map((kw, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border border-indigo-200"
              >
                <span className="text-sm font-semibold text-gray-900">
                  {kw.keyword}
                </span>
                <span className="text-xs text-indigo-600 font-medium">
                  {kw.volume.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          {totalKeywords > 10 && (
            <p className="text-xs text-indigo-600 mt-3 text-center font-medium">
              나머지 {totalKeywords - 10}개 키워드는 상세 페이지에서 확인하세요 →
            </p>
          )}
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-sm font-semibold text-gray-900 mb-2">
          상세 페이지에서 확인하실 수 있어요:
        </p>
        <ul className="text-sm text-gray-600 space-y-1">
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
