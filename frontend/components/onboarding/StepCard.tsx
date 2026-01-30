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
      <div className="p-6">
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
    </div>
  );
}
