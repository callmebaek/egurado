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
        flex items-start gap-2 w-full px-2.5 md:px-3 py-1.5 md:py-2 rounded-button
        transition-all duration-200
        hover:bg-emerald-50 active:scale-98
        min-h-[44px] touch-manipulation
        ${completed ? 'text-neutral-400' : 'text-neutral-700'}
      `}
    >
      {completed ? (
        <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
      ) : (
        <Circle className="w-3.5 h-3.5 md:w-4 md:h-4 text-neutral-300 flex-shrink-0 mt-0.5" />
      )}
      <span className={`text-sm leading-snug line-clamp-2 text-left ${completed ? 'line-through' : ''}`}>
        {title}
      </span>
    </button>
  );
}
