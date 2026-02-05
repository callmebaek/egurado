'use client';

import { useState } from 'react';
import { 
  MessageCircle, 
  CheckCircle2,
  Lightbulb,
  Bug,
  MessageSquare,
  ThumbsUp
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import OnboardingModal from './OnboardingModal';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function ContactModal({ isOpen, onClose, onComplete }: ContactModalProps) {
  const { user, getToken } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [category, setCategory] = useState<'feature' | 'bug' | 'payment' | 'other'>('other');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messageId, setMessageId] = useState('');

  const totalSteps = 3;

  const handleClose = () => {
    setCurrentStep(1);
    setCategory('other');
    setTitle('');
    setMessage('');
    setError('');
    setMessageId('');
    onClose();
  };

  const handleBack = () => {
    if (currentStep > 1 && !loading && !uploading) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep === 2) {
      if (!title.trim()) {
        setError('제목을 입력해주세요.');
        return;
      }
      if (!message.trim()) {
        setError('문의 내용을 입력해주세요.');
        return;
      }
    }
    setError('');
    
    if (currentStep === 2) {
      handleSubmit();
    } else if (currentStep === 3) {
      handleClose();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      // 새로운 support tickets API로 전송
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/support/tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: category,
          title: title.trim(),
          content: message.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '문의 제출에 실패했습니다');
      }

      const data = await response.json();
      setMessageId(data.id);
      setCurrentStep(3); // 완료 단계로 이동

    } catch (err) {
      console.error('문의 제출 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: 카테고리 선택
  const renderStep1 = () => (
    <div className="space-y-3 md:space-y-4">
      <div className="text-center">
        <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight mb-1">
          윕플에 문의하기
        </h3>
        <p className="text-xs md:text-sm text-neutral-600 leading-tight">
          무엇을 도와드릴까요?
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-neutral-900">
          문의 유형 선택 <span className="text-error">*</span>
        </label>
        
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => setCategory('feature')}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 ${
              category === 'feature' 
                ? 'border-yellow-400 bg-yellow-50' 
                : 'border-neutral-200 bg-white hover:border-yellow-300'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-bold text-neutral-900">💡 기능 제안</p>
              <p className="text-xs text-neutral-600">새로운 기능이나 개선 아이디어</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCategory('bug')}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 ${
              category === 'bug' 
                ? 'border-red-500 bg-red-50' 
                : 'border-neutral-200 bg-white hover:border-red-400'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
              <Bug className="w-4 h-4 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-bold text-neutral-900">🐛 버그 리포트</p>
              <p className="text-xs text-neutral-600">오류나 문제 발생 신고</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCategory('payment')}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 ${
              category === 'payment' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-neutral-200 bg-white hover:border-blue-400'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-bold text-neutral-900">💳 결제 문의</p>
              <p className="text-xs text-neutral-600">요금제, 결제, 환불 관련</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setCategory('other')}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 ${
              category === 'other' 
                ? 'border-green-500 bg-green-50' 
                : 'border-neutral-200 bg-white hover:border-green-400'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <ThumbsUp className="w-4 h-4 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-bold text-neutral-900">💬 기타 문의</p>
              <p className="text-xs text-neutral-600">일반 문의, 칭찬, 피드백</p>
            </div>
          </button>
        </div>
      </div>

      <Alert variant="info" className="p-3">
        <AlertTitle className="text-xs md:text-sm font-bold text-neutral-900">
          💌 답변 시간
        </AlertTitle>
        <AlertDescription className="text-xs text-neutral-600">
          보통 1-2일 내에 답변 드립니다. 답변은 대시보드 알림에서 확인하실 수 있습니다.
        </AlertDescription>
      </Alert>
    </div>
  );

  // Step 2: 문의 작성
  const renderStep2 = () => {
    const getCategoryLabel = () => {
      switch (category) {
        case 'feature': return '💡 기능 제안';
        case 'bug': return '🐛 버그 리포트';
        case 'payment': return '💳 결제 문의';
        case 'other': return '💬 기타 문의';
      }
    };

    return (
      <div className="space-y-3 md:space-y-4">
        <div className="text-center space-y-1">
          <Badge variant="secondary" className="mb-2">
            {getCategoryLabel()}
          </Badge>
          <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">
            무엇을 도와드릴까요?
          </h3>
          <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
            자세히 적어주실수록 더 정확한 답변을 드릴 수 있어요
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-neutral-900">
            제목 <span className="text-error">*</span>
          </label>
          <input
            type="text"
            placeholder="예: 리뷰 분석 기능이 작동하지 않아요"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError('');
            }}
            className={`w-full h-12 px-4 border-2 rounded-lg text-sm md:text-base ${
              error && !title.trim() ? 'border-error' : 'border-neutral-300'
            } focus:border-primary-500 focus:outline-none`}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-neutral-900">
            문의 내용 <span className="text-error">*</span>
          </label>
          <Textarea
            placeholder="예: 어제부터 리뷰 분석 페이지에서 날짜 필터를 선택해도 결과가 변경되지 않습니다. 크롬 브라우저를 사용하고 있습니다."
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setError('');
            }}
            rows={8}
            className={`resize-none text-sm md:text-base ${error && !message.trim() ? 'border-error' : ''}`}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>오류</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  // Step 3: 완료
  const renderStep3 = () => (
    <div className="space-y-3 md:space-y-4">
      <div className="text-center py-4 md:py-6">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-success-bg rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-success" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-neutral-900 mb-2 leading-tight">
          문의가 전달되었어요!
        </h3>
        <p className="text-sm md:text-base text-neutral-600 leading-relaxed mb-4">
          소중한 의견 감사합니다.<br />
          빠른 시일 내에 답변 드리겠습니다.
        </p>

        <Card className="bg-gradient-to-br from-emerald-50 to-indigo-50 border-primary-200 shadow-sm p-4 md:p-5 mb-4">
          <p className="text-sm md:text-base text-neutral-700 leading-relaxed font-medium">
            💌 답변 확인 방법
          </p>
          <p className="text-xs md:text-sm text-neutral-600 mt-2">
            대시보드 → 문의하기 페이지에서<br />
            답변을 확인하실 수 있습니다
          </p>
        </Card>

        <Button
          onClick={() => {
            handleClose();
            window.location.href = '/dashboard/support';
          }}
          variant="outline"
          className="w-full"
        >
          문의내역 보러가기
        </Button>
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
      default:
        return null;
    }
  };

  return (
    <OnboardingModal
      isOpen={isOpen}
      onClose={handleClose}
      title="문의하기"
      icon={MessageCircle}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onBack={handleBack}
      onNext={handleNext}
      nextButtonText={
        currentStep === 1 ? '다음' : 
        currentStep === 2 ? (loading ? '전송 중...' : '문의 전송') : 
        '확인'
      }
      nextButtonDisabled={
        (currentStep === 2 && (!title.trim() || !message.trim() || loading))
      }
      showBackButton={currentStep === 2 && !loading}
    >
      {renderCurrentStep()}
    </OnboardingModal>
  );
}
