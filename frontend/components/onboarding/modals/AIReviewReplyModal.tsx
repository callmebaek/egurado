'use client';

import { useState, useEffect } from 'react';
import { 
  Store, 
  MessageSquare, 
  CheckCircle2, 
  Sparkles,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import OnboardingModal from './OnboardingModal';
import StoreSelector from './StoreSelector';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

interface AIReviewReplyModalProps {
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

export default function AIReviewReplyModal({
  isOpen,
  onClose,
  onComplete,
}: AIReviewReplyModalProps) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [stores, setStores] = useState<RegisteredStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<RegisteredStore | null>(null);
  
  // 리뷰 개수 선택
  const [reviewLimit, setReviewLimit] = useState<string>('50');
  
  // 답글 대기 중인 리뷰 개수
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalSteps = 3;

  // 매장 목록 로드
  useEffect(() => {
    if (isOpen && currentStep === 1) {
      loadStores();
    }
  }, [isOpen, currentStep]);

  // Step 3: 답글 대기 중인 리뷰 개수 로드
  useEffect(() => {
    if (currentStep === 3 && selectedStore) {
      loadPendingReviewCount();
    }
  }, [currentStep, selectedStore, reviewLimit]);

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

  const loadPendingReviewCount = async () => {
    if (!selectedStore) return;

    setLoadingCount(true);
    setError('');

    try {
      const token = getToken();
      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      // 리뷰 목록 조회 (답글 대기 중인 것만 카운트)
      const limit = reviewLimit === 'all' ? 0 : parseInt(reviewLimit);
      
      const response = await fetch(
        `${api.baseUrl}/api/v1/ai-reply/reviews`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            store_id: selectedStore.id,
            limit: limit
          })
        }
      );

      if (!response.ok) {
        throw new Error('리뷰 목록 조회에 실패했습니다.');
      }

      const data = await response.json();
      const pendingReviews = data.reviews.filter((review: any) => !review.has_reply);
      setPendingCount(pendingReviews.length);

    } catch (err) {
      console.error('답글 대기 중인 리뷰 개수 조회 실패:', err);
      setError(err instanceof Error ? err.message : '리뷰 개수 조회 중 오류가 발생했습니다.');
      setPendingCount(0);
    } finally {
      setLoadingCount(false);
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
    
    // Step 2: 리뷰 개수 선택
    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }
    
    // Step 3: AI 리뷰답글 페이지로 이동
    if (currentStep === 3) {
      handleStartReply();
      return;
    }
  };

  const handleStartReply = () => {
    if (!selectedStore) return;

    // 완료 처리
    if (onComplete) onComplete();
    
    // AI 리뷰답글 페이지로 이동
    handleClose();
    router.push(`/dashboard/naver/reviews/ai-reply?storeId=${selectedStore.id}&reviewLimit=${reviewLimit}&autoStart=true`);
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1 && !loadingCount) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedStore(null);
    setReviewLimit('50');
    setPendingCount(0);
    setError('');
    onClose();
  };

  // Step 1: 매장 선택
  const renderStep1 = () => (
    <div className="space-y-2 md:space-y-3">
      <div className="text-center space-y-1.5 mb-2 md:mb-3">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          어떤 매장의 리뷰에<br />답글을 달까요?
        </h3>
        <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
          AI가 자동으로 맞춤형 답글을 생성해드립니다
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

  // Step 2: 리뷰 개수 선택
  const renderStep2 = () => (
    <div className="space-y-2 md:space-y-3">
      <div className="text-center space-y-1.5 mb-2 md:mb-3">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          최근 몇 개의 리뷰를<br />검토할까요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          선택한 개수만큼 최근 리뷰를 불러와 답글 대기 중인 리뷰를 찾아드립니다
        </p>
      </div>

      <Alert variant="info" className="p-3 md:p-4">
        <Sparkles className="w-4 h-4 text-info-500" />
        <AlertTitle>💡 리뷰 개수 선택 안내</AlertTitle>
        <AlertDescription className="text-xs md:text-sm leading-relaxed">
          최근 몇개의 리뷰를 검토해보실것인지를 선택해주세요.<br />
          답글대기중인 리뷰들을 보여드립니다!!
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        {[
          { value: '10', label: '최근 10개 리뷰', desc: '빠르게 최근 리뷰만 확인 (약 5초)' },
          { value: '20', label: '최근 20개 리뷰', desc: '최근 2-3주 정도의 리뷰 확인 (약 10초)' },
          { value: '50', label: '최근 50개 리뷰', desc: '최근 1-2개월 정도의 리뷰 확인 (약 15초)' },
          { value: '100', label: '최근 100개 리뷰', desc: '최근 2-3개월 정도의 리뷰 확인 (약 30초)' },
        ].map((option) => (
          <Card
            key={option.value}
            className={`cursor-pointer transition-all duration-200 hover:shadow-card-hover ${
              reviewLimit === option.value
                ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20'
                : 'border-neutral-200 hover:border-primary-300'
            }`}
            onClick={() => setReviewLimit(option.value)}
          >
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm md:text-base font-bold text-neutral-900 mb-1">
                    {option.label}
                  </p>
                  <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
                    {option.desc}
                  </p>
                </div>
                {reviewLimit === option.value && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  // Step 3: 답글 대기 중인 리뷰 개수 표시
  const renderStep3 = () => (
    <div className="space-y-2 md:space-y-3">
      <div className="text-center space-y-2 mb-2 md:mb-3">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
          AI로 리뷰답글을<br />생성할까요?
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed">
          답글 대기 중인 리뷰를 확인했습니다
        </p>
      </div>

      {loadingCount ? (
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-neutral-600">답글 대기 중인 리뷰 확인 중...</p>
          </div>
        </div>
      ) : (
        <>
          {/* 답글 대기 중인 리뷰 개수 */}
          <Card className="bg-neutral-50 border-neutral-200 shadow-sm">
            <CardContent className="p-5 md:p-6 text-center">
              <p className="text-xs md:text-sm text-neutral-600 mb-2">답글 대기 중인 리뷰</p>
              <div className="flex items-end justify-center gap-1 mb-2">
                <p className="text-4xl md:text-5xl font-bold text-primary-600">
                  {pendingCount}
                </p>
                <p className="text-base md:text-lg text-neutral-600 mb-2">개</p>
              </div>
              <p className="text-xs md:text-sm text-neutral-600">
                최근 {reviewLimit}개 리뷰 중 답글이 없는 리뷰입니다
              </p>
            </CardContent>
          </Card>

          {/* AI 답글 생성 안내 */}
          {pendingCount > 0 ? (
            <Card className="bg-warning-bg border-warning shadow-sm">
              <CardContent className="p-3 md:p-4">
                <div className="flex gap-2">
                  <Sparkles className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm md:text-base font-bold text-neutral-900">
                      AI가 자동으로 답글을 생성해드립니다
                    </p>
                    <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
                      각 리뷰의 내용을 분석하여 맞춤형 답글을 작성합니다.<br />
                      생성된 답글은 수정할 수 있으며, 직접 게시할 수 있습니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert variant="info">
              <AlertCircle className="w-4 h-4 text-info-500" />
              <AlertDescription className="text-xs md:text-sm">
                답글 대기 중인 리뷰가 없습니다.<br />
                모든 리뷰에 답글이 달려있어요! 👍
              </AlertDescription>
            </Alert>
          )}

          {/* 선택 정보 요약 */}
          <Card className="bg-neutral-50 border-neutral-200 shadow-sm">
            <CardContent className="p-3 md:p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-neutral-600">매장</p>
                <p className="text-xs md:text-sm font-bold text-neutral-900">{selectedStore?.name}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-neutral-600">검토할 리뷰</p>
                <p className="text-xs md:text-sm font-bold text-neutral-900">최근 {reviewLimit}개</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
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
      default:
        return null;
    }
  };

  return (
    <OnboardingModal
      isOpen={isOpen}
      onClose={handleClose}
      title="AI 리뷰답글"
      icon={Sparkles}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      onNext={handleNext}
      nextButtonText={
        currentStep === 3 ? 'AI로 리뷰답글 달기' : '다음'
      }
      nextButtonDisabled={
        loading || 
        loadingCount ||
        (currentStep === 1 && !selectedStore) ||
        (currentStep === 3 && pendingCount === 0)
      }
      showBackButton={currentStep > 1 && !loadingCount}
    >
      {renderCurrentStep()}
    </OnboardingModal>
  );
}
