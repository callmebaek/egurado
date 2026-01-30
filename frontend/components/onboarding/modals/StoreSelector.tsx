'use client';

import { CheckCircle2, Store as StoreIcon, MapPin } from 'lucide-react';
import Image from 'next/image';

interface Store {
  id: string;
  place_id?: string;
  name: string;
  address: string;
  thumbnail?: string;
  platform?: string;
  category?: string;
}

interface StoreSelectorProps {
  stores: Store[];
  selectedStore: Store | null;
  onSelect: (store: Store) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export default function StoreSelector({
  stores,
  selectedStore,
  onSelect,
  loading = false,
  emptyMessage = '등록된 매장이 없습니다.',
}: StoreSelectorProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-neutral-600">매장 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <StoreIcon className="w-8 h-8 text-neutral-400" />
          </div>
          <p className="text-base font-medium text-neutral-700 mb-2">{emptyMessage}</p>
          <p className="text-sm text-neutral-600">먼저 매장을 등록해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-600 mb-3">
        작업할 매장을 선택해주세요 ({stores.length}개)
      </p>
      
      <div className="space-y-2 md:space-y-3 max-h-[400px] overflow-y-auto">
        {stores.map((store) => {
          const isSelected = selectedStore?.id === store.id;
          
          return (
            <button
              key={store.id}
              onClick={() => onSelect(store)}
              className={`
                w-full p-3 md:p-4 rounded-xl border-2 transition-all duration-200
                flex items-center gap-3 text-left min-h-[80px]
                ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 shadow-md'
                    : 'border-neutral-300 bg-white hover:border-primary-400 hover:bg-primary-50/50'
                }
                active:scale-[0.98]
              `}
            >
              {/* 썸네일 */}
              <div className="flex-shrink-0">
                {store.thumbnail ? (
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 border-neutral-200 bg-neutral-100">
                    <Image
                      src={store.thumbnail}
                      alt={store.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-neutral-100 border-2 border-neutral-200 flex items-center justify-center">
                    <StoreIcon className="w-6 h-6 md:w-7 md:h-7 text-neutral-400" />
                  </div>
                )}
              </div>

              {/* 매장 정보 */}
              <div className="flex-1 min-w-0">
                {/* 매장명 + 플랫폼 뱃지 */}
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base md:text-lg font-bold text-neutral-900 truncate leading-tight">
                    {store.name}
                  </h3>
                  {store.platform && (
                    <span
                      className={`
                        px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0
                        ${
                          store.platform === 'naver'
                            ? 'bg-success text-white'
                            : 'bg-info text-white'
                        }
                      `}
                    >
                      {store.platform === 'naver' ? 'N' : 'G'}
                    </span>
                  )}
                </div>

                {/* 카테고리 (있으면) */}
                {store.category && (
                  <p className="text-xs text-neutral-600 mb-1">
                    {store.category}
                  </p>
                )}

                {/* 주소 */}
                <div className="flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-neutral-600 line-clamp-2 leading-relaxed">
                    {store.address}
                  </p>
                </div>
              </div>

              {/* 선택 표시 */}
              <div className="flex-shrink-0 ml-2">
                {isSelected ? (
                  <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7 text-primary-500" />
                ) : (
                  <div className="w-6 h-6 md:w-7 md:h-7 border-2 border-neutral-300 rounded-full" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
