'use client';

import { useState } from 'react';
import { ExternalLink, ArrowRight } from 'lucide-react';
import OnboardingModal from './OnboardingModal';

interface GenericActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  title: string;
  description: string;
  pageUrl?: string;
  pageLabel?: string;
}

export default function GenericActionModal({
  isOpen,
  onClose,
  onComplete,
  title,
  description,
  pageUrl,
  pageLabel = '해당 페이지로 이동',
}: GenericActionModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    onComplete();
    onClose();
    setCurrentStep(1);
  };

  // Step 1: 설명
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          {description}
        </h3>
        <p className="text-gray-600">
          이 기능을 사용하려면 전용 페이지에서 더 많은 옵션과 상세한 설정을 할 수 있습니다.
        </p>
      </div>

      {pageUrl && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <a
            href={pageUrl}
            className="flex items-center justify-between text-blue-600 hover:text-blue-700"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="font-medium">{pageLabel}</span>
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      )}
    </div>
  );

  // Step 2: 완료
  const renderStep2 = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg
          className="w-10 h-10 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2">완료! 🎉</h3>
      <p className="text-gray-600">
        이 기능에 대해 알아보셨습니다. 언제든 다시 시작할 수 있습니다.
      </p>
    </div>
  );

  const renderContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      default:
        return null;
    }
  };

  return (
    <OnboardingModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={handleNext}
      nextButtonText={currentStep === 1 ? '다음' : '완료'}
      showBackButton={false}
    >
      {renderContent()}
    </OnboardingModal>
  );
}
