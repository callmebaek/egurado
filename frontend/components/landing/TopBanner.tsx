'use client';

import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

export const TopBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 shadow-md">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-center md:justify-between h-12 md:h-10 relative">
          {/* 텍스트 */}
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <p className="text-sm md:text-base font-bold">
              현재 베타 서비스 기간 입니다!
            </p>
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>

          {/* 닫기 버튼 */}
          <button
            onClick={() => setIsVisible(false)}
            className="absolute right-0 md:relative p-1.5 rounded-lg hover:bg-white/20 transition-all duration-200 group"
            aria-label="배너 닫기"
          >
            <X className="w-4 h-4 text-white group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>
      </div>
    </div>
  );
};
