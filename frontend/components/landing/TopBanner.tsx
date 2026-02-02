'use client';

import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

export const TopBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="h-10 flex items-center justify-center md:justify-between">
          {/* 텍스트 - 정중앙 */}
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="w-4 h-4 animate-pulse flex-shrink-0" />
            <p className="text-sm font-bold">
              현재 베타 서비스 기간 입니다!
            </p>
            <Sparkles className="w-4 h-4 animate-pulse flex-shrink-0" />
          </div>

          {/* 닫기 버튼 - 데스크톱에서만 보임 */}
          <button
            onClick={() => setIsVisible(false)}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-white/20 transition-all duration-200 group items-center justify-center"
            aria-label="배너 닫기"
          >
            <X className="w-4 h-4 text-white group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>
      </div>
    </div>
  );
};
