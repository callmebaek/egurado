'use client';

import { useState, useEffect } from 'react';
import { 
  Store, 
  Loader2, 
  Calendar, 
  CheckCircle2, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Minus,
  Sparkles,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import OnboardingModal from './OnboardingModal';
import { api } from '@/lib/config';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

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
        const last7days = new Date(today);
        last7days.setDate(last7days.getDate() - 6);
        return { start_date: formatDate(last7days), end_date: todayStr };
      case 'last30days':
        const last30days = new Date(today);
        last30days.setDate(last30days.getDate() - 29);
        return { start_date: formatDate(last30days), end_date: todayStr };
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
      
      const response = await fetch(api.reviews.extract(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      
      // 기본 통계 계산 (sentiment가 있는 경우만 카운트)
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
    <div className="space-y-4">
      <div className="text-center mb-6">
        <MessageSquare className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          어떤 매장의 리뷰를 분석할까요?
        </h3>
        <p className="text-sm text-gray-600">
          AI가 고객 리뷰를 분석하여 긍정/부정 감성과 핵심 인사이트를 도출해드려요
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-8">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">{error || '등록된 매장이 없습니다'}</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {stores.map((store) => (
            <button
              key={store.id}
              onClick={() => setSelectedStore(store)}
              className={`
                w-full p-4 border-2 rounded-lg text-left transition-all
                ${selectedStore?.id === store.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 bg-white'
                }
              `}
            >
              <div className="flex items-center gap-3">
                {store.thumbnail ? (
                  <img 
                    src={store.thumbnail} 
                    alt={store.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-blue-100 flex items-center justify-center">
                    <Store className="w-6 h-6 text-blue-600" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{store.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{store.address}</div>
                </div>
                {selectedStore?.id === store.id && (
                  <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {error && stores.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-4">
          <p className="text-sm text-red-600 font-semibold">{error}</p>
        </div>
      )}
    </div>
  );

  // Step 2: 기간 선택
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Calendar className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          어느 기간의 리뷰를 분석할까요?
        </h3>
        <p className="text-sm text-gray-600">
          기간이 짧을수록 더 빨리 결과를 확인할 수 있어요
        </p>
      </div>

      <div className="space-y-3">
        {['today', 'yesterday', 'last7days', 'last30days'].map((period) => (
          <button
            key={period}
            onClick={() => setDatePeriod(period)}
            className={`
              w-full p-4 border-2 rounded-lg text-left transition-all
              ${datePeriod === period
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300 bg-white'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">
                  {getPeriodLabel(period)}
                </div>
                <div className="text-xs text-gray-500">
                  {getPeriodDescription(period)}
                </div>
              </div>
              {datePeriod === period && (
                <CheckCircle2 className="w-6 h-6 text-purple-600 flex-shrink-0 ml-3" />
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> 짧은 기간을 선택하면 빠르게 최신 트렌드를 파악할 수 있어요!
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-4">
          <p className="text-sm text-red-600 font-semibold">{error}</p>
        </div>
      )}
    </div>
  );

  // Step 3: 리뷰 추출 중
  const renderStep3 = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      </div>
      
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          리뷰를 추출하고 있어요
        </h3>
        <p className="text-sm text-gray-600">
          선택한 기간의 리뷰를 정확하게 가져오는 중입니다...
        </p>
      </div>

      <div className="text-xs text-gray-400">
        기간: {getPeriodLabel(datePeriod)}
      </div>
    </div>
  );

  // Step 4: 결과 미리보기
  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          리뷰를 추출했어요! 🎉
        </h3>
        <p className="text-sm text-gray-600">
          기본 통계를 확인하고, AI 분석을 시작하세요
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="grid grid-cols-4 gap-4">
          {/* 전체 리뷰 */}
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <MessageSquare className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{reviewStats?.total || 0}</div>
            <div className="text-xs text-gray-600 mt-1">전체</div>
          </div>
          
          {/* 긍정 리뷰 */}
          <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-green-200">
            <ThumbsUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">{reviewStats?.positive || 0}</div>
            <div className="text-xs text-gray-600 mt-1">긍정</div>
          </div>
          
          {/* 중립 리뷰 */}
          <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <Minus className="w-6 h-6 text-gray-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-600">{reviewStats?.neutral || 0}</div>
            <div className="text-xs text-gray-600 mt-1">중립</div>
          </div>
          
          {/* 부정 리뷰 */}
          <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-red-200">
            <ThumbsDown className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-600">{reviewStats?.negative || 0}</div>
            <div className="text-xs text-gray-600 mt-1">부정</div>
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-800 font-medium mb-1">
              AI 분석이 필요해요
            </p>
            <p className="text-xs text-yellow-700">
              리뷰 온도, 감성 분석, 핵심 키워드 추출 등 상세한 분석은 "리뷰 분석하기" 버튼을 눌러 시작할 수 있어요.
            </p>
          </div>
        </div>
      </div>

      {/* 선택된 정보 요약 */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="text-xs text-gray-600 space-y-2">
          <div className="flex items-center justify-between">
            <span>매장</span>
            <span className="font-medium text-gray-900">{selectedStore?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>기간</span>
            <span className="font-medium text-gray-900">{getPeriodLabel(datePeriod)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <OnboardingModal isOpen={isOpen} onClose={handleClose}>
      <div className="p-6 space-y-6">
        {/* 진행률 */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-gray-700">
            {currentStep < 3 ? `${currentStep} / ${totalSteps - 1} 단계` : currentStep === 3 ? '추출 중' : '완료'}
          </div>
          <div className="text-xs text-gray-500">
            {Math.round((currentStep / totalSteps) * 100)}%
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* 단계별 콘텐츠 */}
        <div className="min-h-[400px]">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* 버튼 */}
        {currentStep !== 3 && (
          <div className="flex items-center justify-between pt-4 border-t">
            {currentStep > 1 && currentStep < 4 ? (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                이전
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={handleNext}
              disabled={loading || extracting || (currentStep === 1 && !selectedStore)}
              className={`
                px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2
                ${loading || extracting || (currentStep === 1 && !selectedStore)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                }
              `}
            >
              {currentStep === 4 ? (
                <>
                  <TrendingUp className="w-4 h-4" />
                  리뷰 분석하기
                </>
              ) : (
                <>
                  다음
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </OnboardingModal>
  );
}
