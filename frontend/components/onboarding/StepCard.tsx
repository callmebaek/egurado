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
    <div className="bg-white rounded-card border border-neutral-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden w-full min-w-0">
      {/* 헤더 */}
      <div className="p-3 md:p-4 lg:p-5 w-full overflow-x-hidden">
        <div className="flex items-center justify-between mb-2.5 md:mb-3 lg:mb-4 w-full min-w-0">
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1">
            <span className="text-xl md:text-2xl flex-shrink-0">{icon}</span>
            <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight truncate">{title}</h3>
          </div>
          <span className="text-xs md:text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {completedCount}/{totalCount}
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
