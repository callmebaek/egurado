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
        flex items-center gap-2 md:gap-3 w-full px-3 md:px-4 py-2 md:py-2.5 rounded-lg
        transition-all duration-200
        hover:bg-gray-50 active:scale-98
        ${completed ? 'text-gray-400' : 'text-gray-700'}
      `}
    >
      {completed ? (
        <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0" />
      ) : (
        <Circle className="w-4 h-4 md:w-5 md:h-5 text-gray-300 flex-shrink-0" />
      )}
      <span className={`text-xs md:text-sm leading-tight ${completed ? 'line-through' : ''}`}>
        {title}
      </span>
    </button>
  );
}
