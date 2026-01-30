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
        flex items-start gap-2 w-full px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg
        transition-all duration-200
        hover:bg-gray-50 active:scale-98
        ${completed ? 'text-gray-400' : 'text-gray-700'}
      `}
    >
      {completed ? (
        <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500 flex-shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-300 flex-shrink-0 mt-0.5" />
      )}
      <span className={`text-[11px] md:text-xs leading-snug line-clamp-2 text-left ${completed ? 'line-through' : ''}`}>
        {title}
      </span>
    </button>
  );
}
