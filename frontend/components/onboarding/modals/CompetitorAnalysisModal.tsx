'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  TrendingUp,
  Search,
  Lightbulb,
  Users,
  Sparkles
} from 'lucide-react';
import { api } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import OnboardingModal from './OnboardingModal';
import StoreSelector from './StoreSelector';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface CompetitorAnalysisModalProps {
  isOpen: boolean;
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

interface KeywordHistory {
  id: string;
  input_keywords: string[];
  extracted_keywords: { keyword: string; volume: number }[];
  created_at: string;
}

export default function CompetitorAnalysisModal({
  isOpen,
  onClose,
  onComplete,
}: CompetitorAnalysisModalProps) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [stores, setStores] = useState<RegisteredStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null);
  
  // 키워드 선택
  const [keywordMode, setKeywordMode] = useState<'history' | 'manual'>('history');
  const [keyword, setKeyword] = useState('');
  const [keywordHistory, setKeywordHistory] = useState<KeywordHistory[]>([]);
  const [selectedHistoryKeyword, setSelectedHistoryKeyword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 3;

  // 매장 목록 로드
  useEffect(() => {
    if (isOpen && currentStep === 1) {
      loadStores();
    }
  }, [isOpen, currentStep]);

  // 타겟키워드 로드
  useEffect(() => {
    if (selectedStore && currentStep === 2) {
      loadKeywordHistory();
    }
  }, [selectedStore, currentStep]);

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

  const loadKeywordHistory = async () => {
    if (!selectedStore) return;

    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(api.targetKeywords.history(selectedStore.id), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setKeywordHistory(data.histories || []);
      }
    } catch (error) {
      console.error('[경쟁매장 분석] 키워드 히스토리 로드 실패:', error);
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
    
    // Step 2: 키워드 선택
    if (currentStep === 2) {
      const finalKeyword = keywordMode === 'history' ? selectedHistoryKeyword : keyword;
      if (!finalKeyword.trim()) {
        setError('키워드를 입력하거나 선택해주세요');
        return;
      }
      setCurrentStep(3);
      return;
    }
    
    // Step 3: 분석 시작
    if (currentStep === 3) {
      handleStartAnalysis();
      return;
    }
  };

  const handleStartAnalysis = () => {
    if (!selectedStore) return;

    const finalKeyword = keywordMode === 'history' ? selectedHistoryKeyword : keyword;
    
    // 분석 완료 처리
    if (onComplete) onComplete();
    
    // 경쟁매장 분석 페이지로 이동
    handleClose();
    router.push(`/dashboard/naver/competitors?storeId=${selectedStore.id}&keyword=${encodeURIComponent(finalKeyword.trim())}&autoStart=true`);
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
    setKeyword('');
    setSelectedHistoryKeyword('');
    setKeywordMode('history');
    setError('');
    onClose();
  };

  // Step 1: 매장 선택
  const renderStep1 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          어떤 매장을 기준으로 분석할까요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          선택하신 매장의 경쟁 상황을 분석해드립니다
        </p>
      </div>

      <StoreSelector
        stores={stores}
        selectedStore={selectedStore}
        onSelect={setSelectedStore}
        loading={loading}
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
          어떤 키워드로 경쟁사를 찾아볼까요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          해당 키워드로 상위 20개 매장을 분석합니다
        </p>
      </div>

      <RadioGroup value={keywordMode} onValueChange={(value) => setKeywordMode(value as 'history' | 'manual')}>
        <div className="space-y-3">
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-card-hover ${
              keywordMode === 'history'
                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20'
                : 'border-neutral-200 hover:border-primary-300'
            }`}
            onClick={() => setKeywordMode('history')}
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <RadioGroupItem value="history" id="history" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="history" className="text-sm md:text-base font-bold text-neutral-900 cursor-pointer">
                      과거 추출한 키워드에서 선택
                    </Label>
                    <p className="text-xs md:text-sm text-neutral-600 mt-0.5">
                      타겟키워드 분석에서 찾은 키워드를 사용합니다
                    </p>
                  </div>
                </div>
                {keywordMode === 'history' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-card-hover ${
              keywordMode === 'manual'
                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20'
                : 'border-neutral-200 hover:border-primary-300'
            }`}
            onClick={() => setKeywordMode('manual')}
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <RadioGroupItem value="manual" id="manual" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="manual" className="text-sm md:text-base font-bold text-neutral-900 cursor-pointer">
                      직접 입력
                    </Label>
                    <p className="text-xs md:text-sm text-neutral-600 mt-0.5">
                      새로운 키워드를 입력합니다
                    </p>
                  </div>
                </div>
                {keywordMode === 'manual' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </RadioGroup>

      {keywordMode === 'history' ? (
        keywordHistory.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-bold text-neutral-900">추출된 키워드 선택</p>
            <Card className="border-neutral-200 shadow-sm">
              <CardContent className="p-3 md:p-4">
                <div className="flex flex-wrap gap-2">
                  {keywordHistory.flatMap(history => 
                    history.extracted_keywords.slice(0, 10).map((kw, idx) => (
                      <Badge
                        key={`${history.id}-${idx}`}
                        variant={selectedHistoryKeyword === kw.keyword ? 'default' : 'secondary'}
                        className="text-xs md:text-sm px-2.5 py-1 cursor-pointer hover:bg-primary-600 transition-colors"
                        onClick={() => setSelectedHistoryKeyword(kw.keyword)}
                      >
                        {kw.keyword}
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Alert variant="info">
            <Lightbulb className="w-4 h-4 text-info-500" />
            <AlertDescription className="text-xs md:text-sm">
              추출된 키워드가 없습니다. "직접 입력"을 선택하거나 먼저 타겟키워드를 분석해주세요.
            </AlertDescription>
          </Alert>
        )
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <Input
            placeholder="예: 강남맛집, 성수카페"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setError('');
            }}
            className={`pl-10 text-base ${error ? 'border-error' : ''}`}
          />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert variant="info">
        <AlertTitle>💡 입력 팁</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          키워드가 구체적일수록 정확한 경쟁사를 찾을 수 있어요!
        </AlertDescription>
      </Alert>
    </div>
  );

  // Step 3: 분석 시작
  const renderStep3 = () => {
    const finalKeyword = keywordMode === 'history' ? selectedHistoryKeyword : keyword;
    
    return (
      <div className="space-y-4 md:space-y-5">
        <div className="text-center space-y-2 mb-4 md:mb-5">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
          <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
            지금 바로 분석을 시작할까요?
          </h3>
          <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
            경쟁매장 분석 페이지에서 상세한 분석을 진행합니다
          </p>
        </div>

        <Card className="bg-neutral-50 border-neutral-200 shadow-sm">
          <CardContent className="p-4 md:p-5 space-y-4">
            <div>
              <p className="text-sm md:text-base font-bold text-primary-600 mb-2">📊 분석 내용</p>
              <p className="text-xs md:text-sm text-neutral-700 leading-relaxed">
                선택하신 <strong>"{finalKeyword}"</strong> 키워드로 
                플레이스 상위노출 중인 <strong>20개 매장</strong>의 현재 플레이스 활동 전반적인 내용을 
                한번에 보실 수 있습니다.
              </p>
            </div>

            <div>
              <p className="text-sm md:text-base font-bold text-primary-600 mb-2">🎯 분석 항목</p>
              <div className="space-y-1.5 text-xs md:text-sm text-neutral-700">
                <p>✓ 매장별 순위 및 기본 정보</p>
                <p>✓ 리뷰 개수 및 평점</p>
                <p>✓ 플레이스 진단 점수</p>
                <p>✓ 경쟁 강도 비교</p>
                <p>✓ 개선 권장사항</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert variant="default" className="bg-purple-50 border-purple-200">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <AlertDescription className="text-xs md:text-sm text-neutral-700">
            💡 "나만 잘하는게 아니라, 남들은 어떻게 하는지 알아야 합니다"
          </AlertDescription>
        </Alert>

        {/* 선택 정보 요약 */}
        <Card className="bg-neutral-50 border-neutral-200 shadow-sm">
          <CardContent className="p-3 md:p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs md:text-sm text-neutral-600">매장</p>
              <p className="text-xs md:text-sm font-bold text-neutral-900">{selectedStore?.name}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs md:text-sm text-neutral-600">키워드</p>
              <p className="text-xs md:text-sm font-bold text-neutral-900">{finalKeyword}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCurrentStep = () => {
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
      onClose={handleClose}
      title="경쟁매장 분석"
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      onNext={handleNext}
      nextButtonText={
        currentStep === 3 ? '분석 시작' : '다음'
      }
      nextButtonDisabled={
        loading || 
        (currentStep === 1 && !selectedStore) ||
        (currentStep === 2 && (keywordMode === 'history' ? !selectedHistoryKeyword : !keyword.trim()))
      }
      showBackButton={currentStep > 1}
    >
      {renderCurrentStep()}
    </OnboardingModal>
  );
}
