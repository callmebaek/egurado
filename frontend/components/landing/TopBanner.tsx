'use client';

import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

export const TopBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 shadow-md">
      <div className="w-full max-w-7xl mx-auto px-4">
        {/* 모바일: h-10 (40px), 데스크톱: h-11 (44px) */}
        <div className="relative h-10 md:h-11">
          {/* 중앙: 텍스트 - absolute로 완벽한 중앙 배치 */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-white">
            <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 animate-pulse flex-shrink-0" />
            <span className="text-xs md:text-sm font-bold whitespace-nowrap">
              현재 베타 서비스 기간입니다!
            </span>
            <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 animate-pulse flex-shrink-0" />
          </div>

          {/* 오른쪽: 닫기 버튼 - absolute로 우측 배치 */}
          <button
            onClick={() => setIsVisible(false)}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg hover:bg-white/20 active:bg-white/30 transition-colors duration-200 group"
            aria-label="배너 닫기"
          >
            <X className="w-4 h-4 md:w-5 md:h-5 text-white group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>
      </div>
    </div>
  );
};
