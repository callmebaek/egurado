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
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          </div>
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
