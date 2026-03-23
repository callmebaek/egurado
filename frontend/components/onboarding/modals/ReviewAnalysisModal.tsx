'use client';

import { useState, useEffect } from 'react';
import { 
  Store, 
  Loader2, 
  CheckCircle2, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Minus
} from 'lucide-react';
import { api } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import OnboardingModal from './OnboardingModal';
import StoreSelector from './StoreSelector';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ReviewAnalysisModalProps {
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

interface ReviewStats {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
}

export default function ReviewAnalysisModal({
  isOpen,
  onClose,
  onComplete,
}: ReviewAnalysisModalProps) {
  console.log('🚀 ReviewAnalysisModal 컴포넌트 로드됨! isOpen:', isOpen);
  
  const { getToken } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [stores, setStores] = useState<RegisteredStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null);
  
  // 기간 선택
  const [datePeriod, setDatePeriod] = useState<string>('today');
  
  // 리뷰 통계
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 4;

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

  const getDateRange = () => {
    const today = new Date();
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const todayStr = formatDate(today);
    
    switch (datePeriod) {
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatDate(yesterday);
        return { start_date: yesterdayStr, end_date: yesterdayStr };
      case 'last7days':
        const endDate7 = new Date(today);
        endDate7.setDate(endDate7.getDate() - 1);
        const startDate7 = new Date(endDate7);
        startDate7.setDate(startDate7.getDate() - 6);
        return { start_date: formatDate(startDate7), end_date: formatDate(endDate7) };
      case 'last30days':
        const endDate30 = new Date(today);
        endDate30.setDate(endDate30.getDate() - 1);
        const startDate30 = new Date(endDate30);
        startDate30.setDate(startDate30.getDate() - 29);
        return { start_date: formatDate(startDate30), end_date: formatDate(endDate30) };
      case 'today':
      default:
        return { start_date: todayStr, end_date: todayStr };
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
    
    // Step 2: 기간 선택
    if (currentStep === 2) {
      handleExtractReviews();
      return;
    }
    
    // Step 4: 완료 - 리뷰 분석 페이지로 이동
    if (currentStep === 4) {
      const dateRange = getDateRange();
      router.push(`/dashboard/naver/reviews?storeId=${selectedStore!.id}&period=${datePeriod}&startDate=${dateRange.start_date}&endDate=${dateRange.end_date}&autoStart=true`);
      onComplete();
      handleClose();
      return;
    }
  };

  const handleExtractReviews = async () => {
    setExtracting(true);
    setCurrentStep(3); // 추출 중 단계
    
    try {
      const dateRange = getDateRange();
      
      // 토큰 가져오기
      const token = getToken();
      if (!token) {
        throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
      }
      
      const response = await fetch(api.reviews.extract(), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          store_id: selectedStore!.id,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date
        })
      });

      if (!response.ok) {
        throw new Error('리뷰 추출에 실패했습니다');
      }

      const data = await response.json();
      const extractedReviews = data.reviews || [];
      
      // 기본 통계 계산
      const stats = {
        total: extractedReviews.length,
        positive: extractedReviews.filter((r: any) => r.sentiment === 'positive').length,
        neutral: extractedReviews.filter((r: any) => r.sentiment === 'neutral').length,
        negative: extractedReviews.filter((r: any) => r.sentiment === 'negative').length,
      };

      setReviewStats(stats);
      setCurrentStep(4); // 결과 단계
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '리뷰 추출 중 오류가 발생했습니다');
      setCurrentStep(2); // 기간 선택 단계로 돌아가기
    } finally {
      setExtracting(false);
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1 && currentStep !== 3) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedStore(null);
    setDatePeriod('today');
    setReviewStats(null);
    setError('');
    onClose();
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'today': return '오늘';
      case 'yesterday': return '어제';
      case 'last7days': return '지난 7일';
      case 'last30days': return '지난 30일';
      default: return '';
    }
  };

  const getPeriodDescription = (period: string) => {
    switch (period) {
      case 'today': return '가장 빠르게 분석할 수 있어요 (약 10초)';
      case 'yesterday': return '빠르게 분석할 수 있어요 (약 15초)';
      case 'last7days': return '일주일치 리뷰를 꼼꼼히 분석해요 (약 1분)';
      case 'last30days': return '한달치 리뷰를 상세히 분석해요 (약 3분)';
      default: return '';
    }
  };

  // Step 1: 매장 선택
  const renderStep1 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          어떤 매장의 리뷰를 분석할까요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          AI가 고객 리뷰를 분석하여 긍정/부정 감성과 핵심 인사이트를 도출해드려요
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

  // Step 2: 기간 선택
  const renderStep2 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          어느 기간의 리뷰를 분석할까요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          기간이 짧을수록 더 빨리 결과를 확인할 수 있어요
        </p>
      </div>

      <div className="space-y-2">
        {['today', 'yesterday', 'last7days', 'last30days'].map((period) => (
          <Card
            key={period}
            className={`cursor-pointer transition-all duration-200 hover:shadow-card-hover ${
              datePeriod === period
                ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20'
                : 'border-neutral-200 hover:border-primary-300'
            }`}
            onClick={() => setDatePeriod(period)}
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm md:text-base font-bold text-neutral-900 mb-1">
                    {getPeriodLabel(period)}
                  </p>
                  <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
                    {getPeriodDescription(period)}
                  </p>
                </div>
                {datePeriod === period && (
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
        <AlertTitle>💡 입력 팁</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          짧은 기간을 선택하면 빠르게 최신 트렌드를 파악할 수 있어요!
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  // Step 3: 리뷰 추출 중
  const renderStep3 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center py-8 md:py-12">
        <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-emerald-600 animate-spin mx-auto mb-4" />
        <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-2 leading-tight">
          리뷰를 추출하고 있어요
        </h3>
        <p className="text-sm text-neutral-600 leading-relaxed mb-4">
          선택한 기간의 리뷰를 정확하게 가져오는 중입니다...
        </p>
        <Badge variant="secondary" className="text-xs">
          기간: {getPeriodLabel(datePeriod)}
        </Badge>
      </div>
    </div>
  );

  // Step 4: 결과 미리보기
  const renderStep4 = () => (
    <div className="space-y-4 md:space-y-5">
      <div className="text-center space-y-2 mb-4 md:mb-5">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-success-bg rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-success" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-neutral-900 leading-tight">
          리뷰를 추출했어요! 🎉
        </h3>
        <p className="text-sm text-neutral-600 leading-relaxed">
          {getPeriodLabel(datePeriod)} 동안 등록된 리뷰를 확인했습니다
        </p>
      </div>

      {/* 전체 리뷰 수 */}
      <Card className="bg-neutral-50 border-neutral-200 shadow-sm">
        <CardContent className="p-4 md:p-5 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <MessageSquare className="w-6 h-6 text-info-500" />
            <p className="text-3xl md:text-4xl font-bold text-neutral-900">
              {reviewStats?.total || 0}
            </p>
          </div>
          <p className="text-sm text-neutral-600">총 리뷰 수</p>
        </CardContent>
      </Card>

      {/* 감성 분석 결과 */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <Card className="border-success shadow-sm">
          <CardContent className="p-3 md:p-4 text-center">
            <ThumbsUp className="w-5 h-5 md:w-6 md:h-6 text-success mx-auto mb-2" />
            <p className="text-xl md:text-2xl font-bold text-success mb-1">
              {reviewStats?.positive || 0}
            </p>
            <p className="text-xs md:text-sm text-neutral-600">긍정</p>
          </CardContent>
        </Card>

        <Card className="border-neutral-300 shadow-sm">
          <CardContent className="p-3 md:p-4 text-center">
            <Minus className="w-5 h-5 md:w-6 md:h-6 text-neutral-500 mx-auto mb-2" />
            <p className="text-xl md:text-2xl font-bold text-neutral-700 mb-1">
              {reviewStats?.neutral || 0}
            </p>
            <p className="text-xs md:text-sm text-neutral-600">중립</p>
          </CardContent>
        </Card>

        <Card className="border-error shadow-sm">
          <CardContent className="p-3 md:p-4 text-center">
            <ThumbsDown className="w-5 h-5 md:w-6 md:h-6 text-error mx-auto mb-2" />
            <p className="text-xl md:text-2xl font-bold text-error mb-1">
              {reviewStats?.negative || 0}
            </p>
            <p className="text-xs md:text-sm text-neutral-600">부정</p>
          </CardContent>
        </Card>
      </div>

      <Alert variant="success" className="p-3 md:p-4">
        <AlertTitle>✨ 다음 단계</AlertTitle>
        <AlertDescription className="text-xs md:text-sm">
          확인 버튼을 누르면 상세 분석 페이지로 이동합니다!
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
      title="리뷰 분석"
      icon={MessageSquare}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      onNext={handleNext}
      nextButtonText={
        currentStep === 1 ? '다음' :
        currentStep === 2 ? (extracting ? '추출 중...' : '리뷰 추출하기') :
        currentStep === 3 ? '' :
        '상세 분석 보기'
      }
      nextButtonDisabled={
        (currentStep === 1 && !selectedStore) ||
        (currentStep === 2 && extracting) ||
        currentStep === 3
      }
      showBackButton={currentStep === 2 && !extracting}
      hideNextButton={currentStep === 3}
    >
      {renderCurrentStep()}
    </OnboardingModal>
  );
}
