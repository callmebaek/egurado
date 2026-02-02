'use client';

import { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';

interface KeywordInputProps {
  label: string;
  keywords: string[];
  onAdd: (keyword: string) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
  maxKeywords?: number;
  helperText?: string;
}

export default function KeywordInput({
  label,
  keywords,
  onAdd,
  onRemove,
  placeholder = '키워드 입력 후 엔터',
  maxKeywords,
  helperText,
}: KeywordInputProps) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (maxKeywords && keywords.length >= maxKeywords) {
      return;
    }

    onAdd(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const isMaxReached = maxKeywords ? keywords.length >= maxKeywords : false;

  return (
    <div className="space-y-2">
      {/* Label + 카운트 */}
      <div className="flex items-center justify-between">
        <label className="text-sm md:text-base font-bold text-neutral-900">
          {label}
        </label>
        {maxKeywords && (
          <span className={`text-xs md:text-sm font-bold ${isMaxReached ? 'text-error' : 'text-neutral-600'}`}>
            {keywords.length} / {maxKeywords}
          </span>
        )}
      </div>

      {/* 입력란 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isMaxReached}
          className="flex-1 h-11 md:h-12 px-4 text-sm md:text-base border-2 border-neutral-300 rounded-button focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-neutral-100 disabled:cursor-not-allowed transition-all duration-200"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim() || isMaxReached}
          className="px-4 h-11 md:h-12 bg-emerald-600 text-white font-bold rounded-button hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 flex items-center gap-1 flex-shrink-0 min-w-[88px]"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">추가</span>
        </button>
      </div>

      {/* Helper Text */}
      {helperText && (
        <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
          {helperText}
        </p>
      )}

      {/* 키워드 태그 목록 - 파스텔 톤, 작은 크기 */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {keywords.map((keyword, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-normal border border-emerald-100 transition-all duration-200 hover:bg-emerald-100"
            >
              {keyword}
              <button
                onClick={() => onRemove(index)}
                className="p-0.5 hover:bg-emerald-200 rounded-full transition-colors flex-shrink-0 min-w-[16px] min-h-[16px]"
                aria-label={`${keyword} 삭제`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 최대 개수 도달 시 안내 */}
      {isMaxReached && (
        <p className="text-xs md:text-sm text-error font-medium">
          최대 {maxKeywords}개까지만 추가할 수 있습니다.
        </p>
      )}
    </div>
  );
}
