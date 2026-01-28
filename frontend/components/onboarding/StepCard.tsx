'use client';

import { ReactNode } from 'react';

interface StepCardProps {
  title: string;
  completedCount: number;
  totalCount: number;
  children: ReactNode;
}

export default function StepCard({ title, completedCount, totalCount, children }: StepCardProps) {
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500">
            {completedCount}/{totalCount}개 완료
          </span>
        </div>

        {/* 액션 리스트 */}
        <div className="space-y-1">
          {children}
        </div>
      </div>

      {/* 진행도 바 */}
      <div className="h-2 bg-gray-100">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}
