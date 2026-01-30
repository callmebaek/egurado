'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  currentStep: number;
  totalSteps: number;
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextButtonText?: string;
  nextButtonDisabled?: boolean;
  showBackButton?: boolean;
}

export default function OnboardingModal({
  isOpen,
  onClose,
  title,
  currentStep,
  totalSteps,
  children,
  onBack,
  onNext,
  nextButtonText = '다음',
  nextButtonDisabled = false,
  showBackButton = true,
}: OnboardingModalProps) {
  // ESC 키로 닫기 + body 스크롤 방지
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="fixed inset-0 z-[1000] overflow-y-auto">
      {/* Backdrop - TurboTax 스타일 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container - 모바일 최적화 */}
      <div className="flex min-h-full items-center justify-center p-3 md:p-4">
        <div
          className="relative w-full max-w-2xl bg-white rounded-modal shadow-modal transform transition-all"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header - 더 compact하게 */}
          <div className="px-4 md:px-5 lg:px-6 pt-3 md:pt-4 pb-2 md:pb-3 border-b border-neutral-200">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 
                id="modal-title"
                className="text-lg md:text-xl font-bold text-neutral-900 leading-tight"
              >
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-button hover:bg-neutral-100 active:scale-95 transition-all duration-200 flex-shrink-0 ml-2"
                aria-label="닫기"
              >
                <X className="w-5 h-5 md:w-6 md:h-6 text-neutral-600" />
              </button>
            </div>

            {/* Progress Bar - TurboTax 스타일, compact */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs md:text-sm text-neutral-600">
                <span className="font-medium">진행 상황</span>
                <span className="font-bold">{currentStep} / {totalSteps}</span>
              </div>
              <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                  role="progressbar"
                  aria-valuenow={currentStep}
                  aria-valuemin={1}
                  aria-valuemax={totalSteps}
                />
              </div>
            </div>
          </div>

          {/* Content - 더 compact하게 */}
          <div className="px-4 md:px-5 lg:px-6 py-3 md:py-4">
            {children}
          </div>

          {/* Footer - 더 compact하게 */}
          <div className="px-4 md:px-5 lg:px-6 pb-3 md:pb-4 pt-2 md:pt-3 border-t border-neutral-200">
            <div className="flex items-center justify-between gap-3">
              {showBackButton && currentStep > 1 ? (
                <button
                  onClick={onBack}
                  className="px-4 md:px-6 py-2.5 md:py-3 text-neutral-700 font-bold text-sm md:text-base hover:bg-neutral-100 rounded-button transition-all duration-200 active:scale-95 min-h-[44px]"
                  aria-label="이전 단계"
                >
                  이전
                </button>
              ) : (
                <div />
              )}

              {onNext && (
                <button
                  onClick={onNext}
                  disabled={nextButtonDisabled}
                  className="px-6 md:px-8 py-2.5 md:py-3 bg-primary-500 text-white font-bold text-sm md:text-base rounded-button shadow-button hover:bg-primary-600 hover:shadow-button-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 ml-auto min-h-[44px]"
                  aria-label={nextButtonText}
                >
                  {nextButtonText}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
