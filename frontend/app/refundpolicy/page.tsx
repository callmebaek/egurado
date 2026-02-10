'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* 상단 네비게이션 */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로 돌아가기
          </Link>
        </div>
      </div>

      {/* 본문 */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 md:p-10">
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2">
            환불정책
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            최종 수정일: 2026년 2월 10일
          </p>

          <div className="prose prose-neutral max-w-none text-sm md:text-base leading-relaxed space-y-6">
            <p className="text-neutral-600">
              본 환불정책의 상세 내용은 준비 중입니다. 빠른 시일 내에 업데이트될 예정입니다.
            </p>
            <p className="text-neutral-600">
              문의사항이 있으시면{' '}
              <a
                href="mailto:business@whiplace.com"
                className="text-[#405D99] hover:underline font-medium"
              >
                business@whiplace.com
              </a>
              으로 연락해 주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
