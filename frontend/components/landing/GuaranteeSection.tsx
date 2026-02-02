'use client';

import { ShieldCheck, RefreshCw, Clock, Award } from 'lucide-react';

interface Guarantee {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  gradient: string;
  iconColor: string;
  hasLogo?: boolean;
}

export const GuaranteeSection = () => {
  const guarantees: Guarantee[] = [
    {
      icon: ShieldCheck,
      title: '끊임없이 신규기능 출시',
      description: '멈추지 않고, 더 편한, 더 좋은 기능들을 개발하고 고객들에게 퍼줄 것을 약속합니다.',
      gradient: 'from-blue-100 to-cyan-100',
      iconColor: 'text-blue-500',
    },
    {
      icon: RefreshCw,
      title: '언제든지 플랜 변경',
      description: '필요에 따라 언제든지 플랜을 업그레이드하거나 다운그레이드할 수 있습니다',
      gradient: 'from-purple-100 to-pink-100',
      iconColor: 'text-purple-500',
    },
    {
      icon: Clock,
      title: '빠른 고객 지원',
      description: '평일 10시~18시, 문의사항에 24시간 이내 답변드립니다',
      gradient: 'from-orange-100 to-rose-100',
      iconColor: 'text-orange-500',
    },
    {
      icon: Award,
      title: '결제가격 보장',
      description: '/윕플.은 항상 "지금"이 제일 저렴합니다. 먼저 결제하신 고객들에게는 그 가격으로 계속 제공합니다.',
      gradient: 'from-emerald-100 to-teal-100',
      iconColor: 'text-emerald-500',
      hasLogo: true,
    },
  ];

  return (
    <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-b from-white via-emerald-50/30 to-teal-50/30">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        {/* 섹션 헤더 */}
        <div className="text-center mb-10 md:mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 md:mb-6">
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              확실한 보장으로
            </span>
            <br />
            <span className="text-gray-700">안심하세요</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            <span className="font-millenial">/윕플.</span>은 데이터 기반의 검증된 서비스를 제공합니다
          </p>
        </div>

        {/* 보장 항목 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {guarantees.map((guarantee, index) => {
            const IconComponent = guarantee.icon;
            return (
              <div
                key={index}
                className="border-2 border-gray-200 rounded-2xl p-6 md:p-8 flex flex-col items-center text-center bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                {/* 아이콘 */}
                <div className={`w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br ${guarantee.gradient} rounded-2xl flex items-center justify-center shadow-sm mb-4`}>
                  <IconComponent className={`w-7 h-7 md:w-8 md:h-8 ${guarantee.iconColor}`} strokeWidth={2.5} />
                </div>

                {/* 제목 */}
                <h3 className="text-base md:text-lg font-bold text-gray-800 mb-2">
                  {guarantee.title}
                </h3>

                {/* 설명 */}
                <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                  {guarantee.hasLogo ? (
                    <>
                      <span className="font-millenial">/윕플.</span>은 항상 &quot;지금&quot;이 제일 저렴합니다. 먼저 결제하신 고객들에게는 그 가격으로 계속 제공합니다.
                    </>
                  ) : (
                    guarantee.description
                  )}
                </p>
              </div>
            );
          })}
        </div>

        {/* 하단 CTA 카드 */}
        <div className="mt-12 md:mt-16 lg:mt-20">
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-200 rounded-2xl p-8 md:p-10 lg:p-12 max-w-3xl mx-auto text-center shadow-lg">
            <div className="space-y-4 md:space-y-6">
              {/* 아이콘 */}
              <div className="w-12 h-12 md:w-14 md:h-14 mx-auto bg-gradient-to-br from-emerald-200 to-teal-200 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 md:w-7 md:h-7 text-emerald-600" strokeWidth={2.5} />
              </div>

              {/* 제목 */}
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-800">
                100% 안심하고 시작하세요
              </h3>

              {/* 설명 */}
              <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed">
                지금 무료로 시작하고, 필요할 때 업그레이드하세요.
                <br className="hidden sm:block" />
                언제든지 플랜 변경이 가능하며, 신규 기능이 계속 추가됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
