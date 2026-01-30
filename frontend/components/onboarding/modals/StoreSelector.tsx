'use client';

import { CheckCircle2, Store as StoreIcon } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
        {stores.map((store) => {
          const isSelected = selectedStore?.id === store.id;
          
          return (
            <Card
              key={store.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-card-hover",
                isSelected
                  ? "border-primary-500 bg-primary-50 ring-2 ring-primary-500/20"
                  : "border-neutral-200 hover:border-primary-300"
              )}
              onClick={() => onSelect(store)}
            >
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  {/* 썸네일 */}
                  {store.thumbnail ? (
                    <Image 
                      src={store.thumbnail} 
                      alt={store.name}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <StoreIcon className="w-6 h-6 text-primary-500" />
                    </div>
                  )}
                  
                  {/* 매장 정보 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm md:text-base font-bold text-neutral-900 truncate">
                      {store.name}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {store.category || (store.platform === 'naver' ? '네이버 플레이스' : store.platform === 'google' ? '구글 비즈니스' : '매장')}
                    </p>
                  </div>
                  
                  {/* 선택 표시 */}
                  {isSelected && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
