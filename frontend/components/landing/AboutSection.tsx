'use client';

import { BarChart2, Users, Award, Heart } from 'lucide-react';

export const AboutSection = () => {
  const values = [
    {
      icon: BarChart2,
      title: '데이터 기반',
      description: '정확한 데이터로 검증된 전략만 제공합니다',
      gradient: 'from-blue-100 to-cyan-100',
      iconColor: 'text-blue-500',
    },
    {
      icon: Users,
      title: '소상공인 중심',
      description: '소상공인의 성장이 우리의 목표입니다',
      gradient: 'from-purple-100 to-pink-100',
      iconColor: 'text-purple-500',
    },
    {
      icon: Award,
      title: '전문성',
      description: '플레이스 최적화 전문가들이 만든 서비스',
      gradient: 'from-orange-100 to-rose-100',
      iconColor: 'text-orange-500',
    },
    {
      icon: Heart,
      title: '신뢰',
      description: '2,847개 매장이 선택한 믿을 수 있는 파트너',
      gradient: 'from-emerald-100 to-teal-100',
      iconColor: 'text-emerald-500',
    },
  ];

  return (
    <section id="about" className="py-12 md:py-16 lg:py-20 bg-gradient-to-br from-teal-50/50 via-emerald-50/50 to-cyan-50/50">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          {/* 텍스트 콘텐츠 */}
          <div className="space-y-6 md:space-y-8">
            {/* 제목 */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                소상공인의 성장을 돕는
              </span>
              <br />
              <span className="text-gray-700">데이터 파트너</span>
            </h2>

            {/* 설명 */}
            <div className="space-y-4 md:space-y-6">
              <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed">
                <span className="font-millenial">/윕플.</span>은 네이버 플레이스 관리가 어려운 소상공인들을 위해 시작되었습니다.
                복잡한 데이터 분석과 번거로운 관리 작업을 자동화하고,
                누구나 쉽게 사용할 수 있는 도구를 만들고자 합니다.
              </p>

              <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed">
                매일 순위를 확인하고, 리뷰에 답글을 달고, 경쟁매장을 분석하는
                모든 과정이 이제 자동으로 이루어집니다. 여러분은 오직 장사에만 집중하세요.
              </p>
            </div>
          </div>

          {/* 가치 그리드 */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {values.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <div
                  key={index}
                  className="border-2 border-gray-200 rounded-2xl p-4 md:p-6 flex flex-col items-center text-center bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  {/* 아이콘 */}
                  <div className={`w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br ${value.gradient} rounded-xl flex items-center justify-center shadow-sm mb-3 md:mb-4`}>
                    <IconComponent className={`w-6 h-6 md:w-7 md:h-7 ${value.iconColor}`} strokeWidth={2.5} />
                  </div>

                  {/* 제목 */}
                  <h3 className="text-sm md:text-base font-bold text-gray-800 mb-2">
                    {value.title}
                  </h3>

                  {/* 설명 */}
                  <p className="text-xs md:text-sm text-gray-600 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
