'use client';

import { ReactNode } from 'react';

interface StepCardProps {
  title: string;
  icon: string;
  completedCount: number;
  totalCount: number;
  children: ReactNode;
}

export default function StepCard({ title, icon, completedCount, totalCount, children }: StepCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="p-3 md:p-4 lg:p-6">
        <div className="flex items-center justify-between mb-2.5 md:mb-3 lg:mb-4">
          <div className="flex items-center gap-1.5 md:gap-2">
            <span className="text-xl md:text-2xl">{icon}</span>
            <h3 className="text-base md:text-lg font-bold text-gray-900 leading-tight">{title}</h3>
          </div>
          <span className="text-xs md:text-sm text-gray-500">
            {completedCount}/{totalCount}개 완료
          </span>
        </div>

        {/* 액션 리스트 */}
        <div className="space-y-1">
          {children}
        </div>
      </div>
    </div>
  );
}
