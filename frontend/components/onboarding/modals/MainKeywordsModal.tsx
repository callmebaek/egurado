'use client';

import { useState } from 'react';
import { 
  Star, 
  TrendingUp, 
  Search, 
  CheckCircle2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/config';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import OnboardingModal from './OnboardingModal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MainKeywordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface StoreKeywordInfo {
  rank: number;
  place_id: string;
  name: string;
  category: string;
  address: string;
  thumbnail?: string;
  rating?: number;
  review_count: string;
  keywords: string[];
}

interface AnalysisResult {
  status: string;
  query: string;
  total_stores: number;
  stores_analyzed: StoreKeywordInfo[];
}

export default function MainKeywordsModal({ isOpen, onClose, onComplete }: MainKeywordsModalProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  const totalSteps = 4;

  const handleClose = () => {
    setCurrentStep(1);
    setKeyword('');
    setResult(null);
    setError('');
    onClose();
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep === 2 && !keyword.trim()) {
      setError('검색 키워드를 입력해주세요.');
      return;
    }
    setError('');
    
    if (currentStep === 2) {
      handleAnalyze();
    } else if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setCurrentStep(3); // 분석 진행 단계로 이동
    
    try {
      const token = await getToken();
      const response = await fetch(api.naver.analyzeMainKeywords(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: keyword.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '분석에 실패했습니다');
      }
      
      const data: AnalysisResult = await response.json();
      setResult(data);
      
      // 🆕 캐싱: 결과를 localStorage에 저장 (2분간 유효)
      try {
        const cacheKey = `main_keywords_cache_${keyword.trim().toLowerCase()}`
        const cacheData = {
          data: data,
          timestamp: Date.now(),
          query: keyword.trim()
        }
        localStorage.setItem(cacheKey, JSON.stringify(cacheData))
        console.log('[대표키워드 모달] 캐시 저장 완료:', cacheKey)
      } catch (err) {
        console.warn('[대표키워드 모달] 캐시 저장 실패:', err)
      }
      
      setCurrentStep(4); // 결과 단계로 이동
      
    } catch (err) {
      console.error('분석 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      setCurrentStep(2); // 입력 단계로 돌아감
    } finally {
      setLoading(false);
    }
  };

  const handleViewFullPage = () => {
    handleClose();
    // URL 파라미터로 키워드를 전달하여 페이지에서 자동 분석
    router.push(`/dashboard/naver/main-keywords?query=${encodeURIComponent(keyword)}`);
  };

  const getTopKeywords = () => {
    if (!result) return [];
    
    const keywordCount: Record<string, number> = {};
    
    result.stores_analyzed.forEach(store => {
      store.keywords.forEach(kw => {
        keywordCount[kw] = (keywordCount[kw] || 0) + 1;
      });
    });
    
    return Object.entries(keywordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }));
  };

  // Step 1: 환영 및 설명
  const renderStep1 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <Star className="w-8 h-8 md:w-10 md:h-10 text-white" />
        </div>
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          대표키워드를 분석해보세요
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          경쟁 매장들이 어떤 키워드로 노출되는지<br />
          한눈에 파악할 수 있습니다
        </p>
      </div>

      <Card className="bg-neutral-50 border-neutral-200 shadow-sm p-4 md:p-5">
        <CardContent className="p-0 space-y-3 md:space-y-4">
          <div className="flex gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <p className="text-sm md:text-base font-bold text-neutral-900 mb-1">경쟁 상황 파악</p>
              <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
                상위 15개 매장이 어떤 키워드로 노출되는지 확인하세요
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              2
            </div>
            <div className="flex-1">
              <p className="text-sm md:text-base font-bold text-neutral-900 mb-1">SEO 전략 수립</p>
              <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
                효과적인 키워드를 발견하고 내 매장에 적용하세요
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              3
            </div>
            <div className="flex-1">
              <p className="text-sm md:text-base font-bold text-neutral-900 mb-1">트렌드 분석</p>
              <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
                가장 많이 사용되는 대표키워드 트렌드를 파악하세요
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert variant="info" className="p-3 md:p-4">
        <Sparkles className="w-4 h-4 text-info-500" />
        <AlertTitle className="text-sm md:text-base font-bold text-neutral-900">
          💡 Tip
        </AlertTitle>
        <AlertDescription className="text-xs md:text-sm text-neutral-600">
          "강남맛집", "홍대카페" 같은 지역+업종 키워드로 검색하면 가장 정확한 결과를 얻을 수 있어요!
        </AlertDescription>
      </Alert>
    </div>
  );

  // Step 2: 키워드 입력
  const renderStep2 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          어떤 키워드를 분석할까요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          지역명과 업종을 함께 입력하면 더 정확해요
        </p>
      </div>

      <div className="relative">
        <Input
          type="text"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setError('');
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && keyword.trim()) {
              handleNext();
            }
          }}
          placeholder="예: 강남맛집, 성수카페, 혜화데이트"
          className={cn("pl-12 h-12 md:h-14 text-base", error && "border-error")}
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-neutral-50 border-neutral-200 shadow-sm p-3 md:p-4">
        <CardContent className="p-0 space-y-2">
          <p className="text-xs md:text-sm text-neutral-600 font-medium">
            💡 추천 검색어 예시
          </p>
          <div className="flex flex-wrap gap-2">
            {['강남맛집', '성수카페', '홍대술집', '이태원레스토랑'].map((example) => (
              <Badge
                key={example}
                variant="outline"
                className="cursor-pointer hover:bg-primary-50 hover:border-primary-300 text-xs md:text-sm px-3 py-1"
                onClick={() => setKeyword(example)}
              >
                {example}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Step 3: 분석 진행
  const renderStep3 = () => (
    <div className="text-center py-8 md:py-10 space-y-4 md:space-y-5">
      <div className="relative inline-block mb-4">
        <Loader2 className="w-16 h-16 md:w-20 md:h-20 animate-spin text-purple-500 mx-auto" />
        <Search className="w-6 h-6 md:w-8 md:h-8 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-2 leading-tight">
        상위 매장을 분석하고 있어요
      </h3>
      <p className="text-sm text-neutral-600 leading-relaxed">
        "{keyword}"로 검색된 상위 15개 매장의<br />
        대표키워드를 수집하고 있습니다
      </p>

      <Card className="bg-neutral-50 border-neutral-200 shadow-sm p-4 md:p-5 max-w-sm mx-auto">
        <CardContent className="p-0 space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
            <p className="text-xs md:text-sm text-neutral-600">매장 정보 수집 중...</p>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
            <p className="text-xs md:text-sm text-neutral-600">대표키워드 추출 중...</p>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
            <p className="text-xs md:text-sm text-neutral-600">분석 결과 정리 중...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Step 4: 결과 요약
  const renderStep4 = () => {
    if (!result) return null;

    return (
      <div className="space-y-4 md:space-y-5">
        <div className="text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-success-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-success" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-2 leading-tight">
            분석이 완료되었어요! 🎉
          </h3>
          <p className="text-sm text-neutral-600 leading-relaxed">
            "{result.query}"로 검색된 {result.stores_analyzed.length}개 매장을 분석했습니다
          </p>
        </div>

        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 shadow-sm">
          <CardContent className="p-4 md:p-5">
            <p className="text-sm md:text-base font-bold text-neutral-900 mb-3 md:mb-4">
              🏆 가장 많이 사용된 대표키워드 TOP 10
            </p>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {getTopKeywords().map(({ keyword: kw, count }, index) => (
                <div
                  key={kw}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-neutral-200 shadow-sm"
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                        index < 3
                          ? "bg-purple-500 text-white"
                          : "bg-neutral-200 text-neutral-600"
                      )}
                    >
                      {index + 1}
                    </div>
                    <p className="text-sm md:text-base font-medium text-neutral-900">{kw}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    {count}개 매장
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Alert variant="info" className="p-3 md:p-4">
          <TrendingUp className="w-4 h-4 text-info-500" />
          <AlertTitle className="text-sm md:text-base font-bold text-neutral-900">
            상세 분석 결과 확인하기
          </AlertTitle>
          <AlertDescription className="text-xs md:text-sm text-neutral-600">
            상세 분석 결과에서 각 매장별 대표키워드와 순위를 확인할 수 있어요
          </AlertDescription>
        </Alert>
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
      title="대표키워드 분석"
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      onNext={currentStep === 4 ? () => {
        if (onComplete) onComplete();
        handleViewFullPage();
      } : handleNext}
      nextButtonText={currentStep === 1 ? '시작하기' : currentStep === 2 ? '분석하기' : currentStep === 4 ? '상세 결과 보기' : '다음'}
      nextButtonDisabled={loading || (currentStep === 2 && !keyword.trim())}
      showBackButton={currentStep > 1 && currentStep < 3}
    >
      {renderCurrentStep()}
    </OnboardingModal>
  );
}
