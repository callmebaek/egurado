'use client';

import { CheckCircle2, Circle } from 'lucide-react';

interface ActionItemProps {
  title: string;
  completed: boolean;
  onClick: () => void;
}

export default function ActionItem({ title, completed, onClick }: ActionItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 w-full px-4 py-3 rounded-lg
        transition-all duration-200
        hover:bg-gray-50
        ${completed ? 'text-gray-400' : 'text-gray-700'}
      `}
    >
      {completed ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
      ) : (
        <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
      )}
      <span className={`text-sm ${completed ? 'line-through' : ''}`}>
        {title}
      </span>
    </button>
  );
}
