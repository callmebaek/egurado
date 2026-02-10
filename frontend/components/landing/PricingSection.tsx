'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';

export const PricingSection = () => {
  const plans = [
    {
      name: 'Free',
      tier: 'free',
      price: '0원',
      priceNote: '영구 무료',
      description: '플레이스 관리를 처음 시작하는 분',
      popular: false,
      features: [
        '매장 1개',
        '키워드 1개',
        '월 100 크레딧',
        '플레이스 진단',
        '키워드 순위 조회',
        '리뷰 분석',
        '대시보드 기본 기능',
      ],
      cta: '무료로 시작하기',
      ctaVariant: 'filled',
    },
    {
      name: 'Basic',
      tier: 'basic',
      price: '₩24,900',
      priceNote: '/ 월',
      description: '플레이스를 본격적으로 관리하는 분',
      popular: false,
      features: [
        '매장 1개',
        '키워드 3개',
        '월 600 크레딧',
        '자동 순위 수집 3개',
        '플레이스 진단',
        '키워드 순위 조회',
        '리뷰 분석',
        '경쟁매장 분석',
      ],
      cta: '구독하기',
      ctaVariant: 'outline',
    },
    {
      name: 'Basic+',
      tier: 'basic_plus',
      price: '₩37,900',
      priceNote: '/ 월',
      description: '여러 매장을 체계적으로 관리하는 분',
      popular: true,
      features: [
        '매장 2개',
        '키워드 8개',
        '월 1,500 크레딧',
        '자동 순위 수집 8개',
        '플레이스 진단',
        '키워드 순위 조회',
        '리뷰 분석',
        '경쟁매장 분석',
      ],
      cta: '구독하기',
      ctaVariant: 'filled',
    },
    {
      name: 'Pro',
      tier: 'pro',
      price: '₩69,900',
      priceNote: '/ 월',
      description: '파워 유저 및 다점포 관리자',
      popular: false,
      features: [
        '매장 5개',
        '키워드 20개',
        '월 3,500 크레딧',
        '자동 순위 수집 20개',
        '모든 기능 사용 가능',
        'AI 답글 생성',
        '우선 고객 지원',
        '전담 매니저 배정',
      ],
      cta: '구독하기',
      ctaVariant: 'outline',
    },
    {
      name: 'Custom',
      tier: 'custom',
      price: '협의',
      priceNote: '맞춤 견적',
      description: '대형 매장, 프랜차이즈',
      popular: false,
      features: [
        '매장 수 협의',
        '키워드 수 협의',
        '크레딧 협의',
        '자동 수집 협의',
        '모든 기능 사용 가능',
        '전담 매니저 배정',
        '맞춤형 솔루션',
        '24시간 우선 지원',
      ],
      cta: '상담 신청하기',
      ctaVariant: 'outline',
    },
  ];

  return (
    <section id="pricing" className="py-12 md:py-16 lg:py-20 bg-gradient-to-br from-teal-50/50 via-cyan-50/50 to-emerald-50/50">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        {/* 섹션 헤더 */}
        <div className="text-center mb-10 md:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 md:mb-6 px-4">
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              원하는 방식으로
            </span>
            <br />
            <span className="text-gray-700">플레이스를 관리하세요</span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-4 leading-relaxed">
            모든 플랜에서 100% 정확한 진단과 데이터 기반 분석을 제공합니다
          </p>
        </div>

        {/* 플랜 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={`relative rounded-2xl border-2 p-6 md:p-8 flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                plan.popular
                  ? 'border-teal-300 bg-gradient-to-br from-teal-50/50 to-cyan-50/50 shadow-lg'
                  : 'border-gray-200 bg-white shadow-md'
              }`}
            >
              {/* Popular 배지 */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-full shadow-md">
                    인기
                  </div>
                </div>
              )}

              <div className="space-y-4 flex-1 flex flex-col">
                {/* 플랜 헤더 */}
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500 min-h-[40px]">
                    {plan.description}
                  </p>
                </div>

                {/* 가격 */}
                <div className="pb-4 border-b border-gray-200">
                  <div className={`text-3xl md:text-4xl font-bold ${
                    plan.tier === 'free' 
                      ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent' 
                      : 'text-gray-800'
                  }`}>
                    {plan.price}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {plan.priceNote}
                  </div>
                </div>

                {/* 기능 리스트 */}
                <div className="space-y-2 flex-1">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5 ${
                        plan.popular 
                          ? 'bg-gradient-to-br from-teal-200 to-cyan-200' 
                          : 'bg-gray-100'
                      }`}>
                        <Check 
                          size={10} 
                          className={plan.popular ? 'text-teal-700' : 'text-gray-600'} 
                          strokeWidth={3} 
                        />
                      </div>
                      <span className="text-xs md:text-sm text-gray-700 leading-relaxed">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA 버튼 */}
                <Link
                  href={plan.tier === 'free' ? '/dashboard' : plan.tier === 'custom' ? '/dashboard/support' : '/dashboard/membership'}
                  className={`block text-center px-6 py-3 rounded-xl text-sm md:text-base font-bold transition-all ${
                    plan.ctaVariant === 'filled'
                      ? plan.popular
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md hover:shadow-lg'
                        : 'bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-md hover:shadow-lg'
                      : 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  {plan.cta}
                </Link>

                {plan.tier === 'free' && (
                  <p className="text-xs text-center text-gray-400">
                    신용카드 등록 불필요
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 하단 안내 */}
        <div className="flex flex-col items-center gap-3 mt-10 md:mt-12">
          <div className="inline-flex items-center px-4 py-2 bg-white border-2 border-emerald-200 rounded-full shadow-sm">
            <span className="text-xs md:text-sm text-gray-600">
              모든 플랜에서 14일 환불 보장 | 언제든지 플랜 변경 가능
            </span>
          </div>
          <div className="inline-flex items-center px-4 py-2 bg-white border-2 border-teal-200 rounded-full shadow-sm">
            <span className="text-xs md:text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              2,847개 매장이 <span className="font-millenial">/윕플.</span>을 사용하고 있습니다
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
