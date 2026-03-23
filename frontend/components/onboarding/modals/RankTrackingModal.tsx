'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2,
  Sparkles,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/config';
import { useToast } from '@/components/ui/use-toast';
import OnboardingModal from './OnboardingModal';
import StoreSelector from './StoreSelector';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useUpgradeModal } from '@/lib/hooks/useUpgradeModal';

interface RankTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface RegisteredStore {
  id: string;
  name: string;
  place_id: string;
  thumbnail?: string;
  address: string;
  platform: string;
}

interface ExtractedKeyword {
  keyword: string;
  total_volume: number;
  comp_idx: string;
  rank?: number;
  total_count?: number;
}

interface KeywordOption {
  keyword: string;
  volume?: number;
  isCustom?: boolean;
}

export function RankTrackingModal({ isOpen, onClose, onComplete }: RankTrackingModalProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Step 1: 매장 선택
  const [stores, setStores] = useState<RegisteredStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null);
  const [loadingStores, setLoadingStores] = useState(false);
  
  // Step 2: 키워드 선택
  const [keywordOptions, setKeywordOptions] = useState<KeywordOption[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState<string>('');
  const [customKeyword, setCustomKeyword] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  
  // Step 3: 수집 주기
  const [updateFrequency, setUpdateFrequency] = useState<'daily_once' | 'daily_twice'>('daily_once');
  
  // Step 4: 수집 시간
  const [updateTimes, setUpdateTimes] = useState<number[]>([15]);
  
  // 에러 메시지
  const [error, setError] = useState<string>('');
  
  // 업그레이드 모달
  const { handleLimitError, UpgradeModalComponent } = useUpgradeModal();

  const totalSteps = 5;

  // 매장 목록 로드
  useEffect(() => {
    if (isOpen && currentStep === 1) {
      loadStores();
    }
  }, [isOpen, currentStep]);

  // 타겟키워드 로드
  useEffect(() => {
    if (selectedStore && currentStep === 2) {
      loadTargetKeywords();
    }
  }, [selectedStore, currentStep]);

  const loadStores = async () => {
    setLoadingStores(true);
    try {
      const token = getToken();
      if (!token) throw new Error('인증이 필요합니다');

      const response = await fetch(api.stores.list(), {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: "no-store"
      });

      if (!response.ok) throw new Error('매장 목록을 불러올 수 없습니다');

      const data = await response.json();
      const naverStores = data.stores?.filter((s: any) => s.platform === 'naver') || [];
      setStores(naverStores);
    } catch (err: any) {
      console.error('매장 로드 오류:', err);
      setError(err.message);
    } finally {
      setLoadingStores(false);
    }
  };

  const loadTargetKeywords = async () => {
    if (!selectedStore) return;
    
    setLoadingKeywords(true);
    try {
      const token = getToken();
      if (!token) throw new Error('인증이 필요합니다');

      const response = await fetch(api.targetKeywords.history(selectedStore.id), {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: "no-store"
      });

      if (!response.ok) {
        setKeywordOptions([]);
        return;
      }

      const data = await response.json();
      const histories = data.histories || [];
      
      if (histories && histories.length > 0) {
        const latestHistory = histories[0];
        const extractedKeywords: ExtractedKeyword[] = latestHistory.extracted_keywords || [];
        
        const options: KeywordOption[] = extractedKeywords
          .slice(0, 10)
          .map(k => ({
            keyword: k.keyword,
            volume: k.total_volume,
            isCustom: false
          }));
        
        setKeywordOptions(options);
      } else {
        setKeywordOptions([]);
      }
    } catch (err: any) {
      console.error('타겟키워드 로드 오류:', err);
      setKeywordOptions([]);
    } finally {
      setLoadingKeywords(false);
    }
  };

  const handleNext = async () => {
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

    // Step 2: 키워드 선택
    if (currentStep === 2) {
      const finalKeyword = showCustomInput ? customKeyword.trim() : selectedKeyword;
      if (!finalKeyword) {
        setError('키워드를 선택하거나 입력해주세요');
        return;
      }
      setCurrentStep(3);
      return;
    }

    // Step 3: 수집 주기 설정
    if (currentStep === 3) {
      if (updateFrequency === 'daily_once') {
        setUpdateTimes([15]);
      } else if (updateFrequency === 'daily_twice') {
        setUpdateTimes([9, 15]);
      } else {
        setUpdateTimes([9, 15, 20]);
      }
      setCurrentStep(4);
      return;
    }

    // Step 4: 추적 시작
    if (currentStep === 4) {
      await handleStartTracking();
      return;
    }

    // Step 5: 완료 - 키워드 순위 추적 페이지로 이동
    if (currentStep === 5) {
      router.push('/dashboard/naver/metrics-tracker');
      handleClose();
      return;
    }
  };

  const handleStartTracking = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) throw new Error('인증이 필요합니다');

      const finalKeyword = showCustomInput ? customKeyword.trim() : selectedKeyword;

      // 1. 순위 조회
      const rankResponse = await fetch(api.naver.checkRank(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          place_id: selectedStore!.place_id,
          keyword: finalKeyword,
          store_id: selectedStore!.id
        })
      });

      if (!rankResponse.ok) {
        const rankError = await rankResponse.json().catch(() => ({}));
        if (handleLimitError(rankResponse.status, rankError.detail)) {
          return;
        }
        throw new Error(rankError.detail || '키워드 순위를 확인할 수 없습니다');
      }

      const rankData = await rankResponse.json();

      // 2. keyword_id 가져오기
      const keywordsResponse = await fetch(api.naver.keywords(selectedStore!.id), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!keywordsResponse.ok) {
        throw new Error('키워드 정보를 가져올 수 없습니다');
      }

      const keywordsData = await keywordsResponse.json();
      const keywords = keywordsData.keywords || [];
      const keywordData = keywords.find((k: any) => k.keyword === finalKeyword);

      if (!keywordData) {
        throw new Error('키워드를 찾을 수 없습니다');
      }

      // 3. 추적 추가
      const trackingPayload = {
        store_id: selectedStore!.id,
        keyword_id: keywordData.id,
        keyword: finalKeyword,
        update_frequency: updateFrequency,
        update_times: updateTimes,
        notification_enabled: false,
      };

      const trackingResponse = await fetch(api.metrics.create(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(trackingPayload)
      });

      if (!trackingResponse.ok) {
        const errorData = await trackingResponse.json();
        if (handleLimitError(trackingResponse.status, errorData.detail)) {
          return;
        }
        throw new Error(errorData.detail || '추적 생성 실패');
      }

      toast({
        title: "✅ 추적 시작",
        description: `"${finalKeyword}" 키워드 순위 추적을 시작합니다!`,
      });

      setCurrentStep(5);
      
      if (onComplete) onComplete();
    } catch (err: any) {
      console.error('추적 시작 오류:', err);
      setError(err.message || '추적 생성 중 오류가 발생했습니다');
      toast({
        variant: "destructive",
        title: "오류",
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1 && !isLoading) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedStore(null);
    setSelectedKeyword('');
    setCustomKeyword('');
    setShowCustomInput(false);
    setUpdateFrequency('daily_once');
    setUpdateTimes([15]);
    setError('');
    onClose();
  };

  // Step 1: 매장 선택
  const renderStep1 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          어떤 매장의 순위를 추적할까요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          선택하신 매장의 키워드 순위를 자동으로 추적합니다
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

  // Step 2: 키워드 선택
  const renderStep2 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          추적할 키워드를 선택해주세요
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          타겟키워드 중 하나를 선택하거나 직접 입력하세요
        </p>
      </div>

      <RadioGroup value={showCustomInput ? 'custom' : 'history'} onValueChange={(value) => setShowCustomInput(value === 'custom')}>
        <div className="space-y-3">
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-card-hover ${
              !showCustomInput
                ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20'
                : 'border-neutral-200 hover:border-primary-300'
            }`}
            onClick={() => setShowCustomInput(false)}
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <RadioGroupItem value="history" id="history" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="history" className="text-sm md:text-base font-bold text-neutral-900 cursor-pointer">
                      타겟키워드에서 선택
                    </Label>
                    <p className="text-xs md:text-sm text-neutral-600 mt-0.5">
                      이전에 분석한 키워드 중에서 선택합니다
                    </p>
                  </div>
                </div>
                {!showCustomInput && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-card-hover ${
              showCustomInput
                ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20'
                : 'border-neutral-200 hover:border-primary-300'
            }`}
            onClick={() => setShowCustomInput(true)}
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <RadioGroupItem value="custom" id="custom" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="custom" className="text-sm md:text-base font-bold text-neutral-900 cursor-pointer">
                      직접 입력
                    </Label>
                    <p className="text-xs md:text-sm text-neutral-600 mt-0.5">
                      새로운 키워드를 입력합니다
                    </p>
                  </div>
                </div>
                {showCustomInput && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </RadioGroup>

      {!showCustomInput ? (
        loadingKeywords ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : keywordOptions.length > 0 ? (
          <Card className="border-neutral-200 shadow-sm">
            <CardContent className="p-4 md:p-5">
              <p className="text-sm font-bold text-neutral-900 mb-3">키워드 선택</p>
              <div className="flex flex-wrap gap-2">
                {keywordOptions.map((option, index) => (
                  <Badge
                    key={index}
                    variant={selectedKeyword === option.keyword ? 'default' : 'outline'}
                    className={`text-xs cursor-pointer transition-colors ${
                      selectedKeyword === option.keyword ? 'bg-emerald-600 text-white' : 'hover:bg-primary-100'
                    }`}
                    onClick={() => setSelectedKeyword(option.keyword)}
                  >
                    {option.keyword}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Alert variant="warning">
            <AlertDescription className="text-xs md:text-sm">
              타겟키워드가 없습니다. "직접 입력"을 선택하거나 먼저 타겟키워드를 분석해주세요.
            </AlertDescription>
          </Alert>
        )
      ) : (
        <Input
          placeholder="예: 강남맛집, 홍대카페"
          value={customKeyword}
          onChange={(e) => {
            setCustomKeyword(e.target.value);
            setError('');
          }}
          className="text-base"
        />
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  // Step 3: 수집 주기 선택
  const renderStep3 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          하루에 몇 번 순위를 확인할까요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          선택한 주기대로 자동으로 순위를 수집합니다
        </p>
      </div>

      <div className="space-y-2">
        {[
          { value: 'daily_once', label: '하루 1회', desc: '오후 3시(15:00)에 수집합니다', times: [15] },
          { value: 'daily_twice', label: '하루 2회', desc: '오전 9시, 오후 3시(15:00)에 수집합니다', times: [9, 15] },
        ].map((option) => (
          <Card
            key={option.value}
            className={`cursor-pointer transition-all duration-200 hover:shadow-card-hover ${
              updateFrequency === option.value
                ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20'
                : 'border-neutral-200 hover:border-primary-300'
            }`}
            onClick={() => setUpdateFrequency(option.value as any)}
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm md:text-base font-bold text-neutral-900 mb-1">{option.label}</p>
                  <p className="text-xs md:text-sm text-neutral-600">{option.desc}</p>
                </div>
                {updateFrequency === option.value && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert variant="info">
        <AlertTitle>💡 수집 시간 안내</AlertTitle>
        <AlertDescription className="text-xs md:text-sm leading-relaxed">
          네이버 플레이스 순위는 오전부터 지속적으로 변동되며, 일반적으로 <span className="font-bold">15시경에 확정</span>됩니다. 15시 이후 수집을 권장하며, 업종·지역 등 환경에 따라 확정 시점이 다를 수 있습니다.
        </AlertDescription>
      </Alert>
    </div>
  );

  // Step 4: 수집 시간 확인
  const renderStep4 = () => {
    const finalKeyword = showCustomInput ? customKeyword.trim() : selectedKeyword;
    const frequencyLabels = {
      'daily_once': '하루 1회',
      'daily_twice': '하루 2회',
    };

    return (
      <div className="space-y-4 md:space-y-5">
        <div className="text-center space-y-2 mb-4 md:mb-5">
          <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
            설정을 확인해주세요
          </h3>
          <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
            아래 설정으로 순위 추적을 시작합니다
          </p>
        </div>

        <Card className="border-neutral-200 shadow-card">
          <CardContent className="p-4 md:p-5 space-y-4">
            <div>
              <p className="text-xs md:text-sm text-neutral-600 mb-1">매장</p>
              <p className="text-sm md:text-base font-bold text-neutral-900">{selectedStore?.name}</p>
            </div>
            <div className="h-px bg-neutral-200" />
            <div>
              <p className="text-xs md:text-sm text-neutral-600 mb-1">키워드</p>
              <p className="text-sm md:text-base font-bold text-neutral-900">{finalKeyword}</p>
            </div>
            <div className="h-px bg-neutral-200" />
            <div>
              <p className="text-xs md:text-sm text-neutral-600 mb-1">수집 주기</p>
              <p className="text-sm md:text-base font-bold text-neutral-900">{frequencyLabels[updateFrequency]}</p>
            </div>
            <div className="h-px bg-neutral-200" />
            <div>
              <p className="text-xs md:text-sm text-neutral-600 mb-1">수집 시간</p>
              <div className="flex gap-2">
                {updateTimes.map((time) => (
                  <Badge key={time} variant="secondary" className="text-xs">
                    {time}시
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>오류</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert variant="success">
          <AlertTitle>✨ 준비 완료!</AlertTitle>
          <AlertDescription className="text-xs md:text-sm">
            "추적 시작" 버튼을 누르면 자동으로 순위를 수집합니다
          </AlertDescription>
        </Alert>
      </div>
    );
  };

  // Step 5: 완료
  const renderStep5 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center py-8">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-success-bg rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-success" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-2 leading-tight">
          순위 추적이 시작되었어요!
        </h3>
        <p className="text-sm text-neutral-600 leading-relaxed mb-4">
          설정한 시간에 자동으로 순위를 수집합니다
        </p>

        <Card className="bg-gradient-to-br from-emerald-50 to-indigo-50 border-primary-200 shadow-sm p-4 md:p-5">
          <p className="text-sm md:text-base text-neutral-700 leading-relaxed">
            💡 키워드 순위추적 페이지에서<br />
            실시간 순위와 변화 추이를 확인하세요!
          </p>
        </Card>
      </div>
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
      case 5:
        return renderStep5();
      default:
        return null;
    }
  };

  return (
    <>
      <OnboardingModal
        isOpen={isOpen}
        onClose={handleClose}
        title="플레이스 순위 추적하기"
        icon={BarChart3}
        currentStep={currentStep}
        totalSteps={totalSteps}
        onBack={handleBack}
        onNext={handleNext}
        nextButtonText={
          isLoading ? '처리 중...' :
          currentStep === 4 ? '추적 시작' :
          currentStep === 5 ? '순위 추적 보기' :
          '다음'
        }
        nextButtonDisabled={
          isLoading || 
          loadingStores || 
          loadingKeywords ||
          (currentStep === 1 && !selectedStore) ||
          (currentStep === 2 && !showCustomInput && !selectedKeyword) ||
          (currentStep === 2 && showCustomInput && !customKeyword.trim())
        }
        showBackButton={currentStep > 1 && currentStep < 5 && !isLoading}
      >
        {renderCurrentStep()}
      </OnboardingModal>
      {/* 업그레이드 모달 */}
      {UpgradeModalComponent}
    </>
  );
}

export default RankTrackingModal;
