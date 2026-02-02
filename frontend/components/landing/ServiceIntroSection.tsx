'use client';

import { Check, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const ServiceIntroSection = () => {
  const services = [
    {
      title: '자동 순위 추적',
      description: '매일 자동으로 키워드 순위를 수집하고, 변동이 있으면 즉시 알려드립니다. 경쟁사보다 빠르게 변화에 대응하여 상위 노출을 유지하세요.',
      features: [
        '실시간 순위 변동 알림',
        '경쟁사 순위 비교 분석',
        '기간별 순위 변화 리포트',
      ],
      image: '/service-rank-tracking.png',
      gradientFrom: 'from-blue-300',
      gradientTo: 'to-cyan-300',
      checkBg: 'from-blue-100 to-cyan-100',
      checkColor: 'text-blue-500',
    },
    {
      title: 'AI 리뷰 답글',
      description: '리뷰 내용을 분석해서 적절한 답글을 자동으로 생성해드립니다. 고객과의 소통을 놓치지 않고, 긍정적인 이미지를 유지하세요.',
      features: [
        '리뷰 감성 분석',
        '맞춤형 답글 자동 생성',
        '답글 작성 시간 90% 단축',
      ],
      image: '/service-ai-reply.png',
      gradientFrom: 'from-emerald-300',
      gradientTo: 'to-teal-300',
      checkBg: 'from-emerald-100 to-teal-100',
      checkColor: 'text-emerald-500',
    },
    {
      title: '경쟁매장 분석',
      description: '경쟁 매장과 비교해서 어떤 부분을 개선해야 할지 명확히 알려드립니다. 우리 매장의 강점과 약점을 파악하여 효과적인 전략을 수립하세요.',
      features: [
        '경쟁사 키워드 분석',
        '경쟁사 리뷰 트렌드 분석',
        '상위 노출 전략 벤치마킹',
      ],
      image: '/service-competitor-analysis.png',
      gradientFrom: 'from-lime-300',
      gradientTo: 'to-green-300',
      checkBg: 'from-lime-100 to-green-100',
      checkColor: 'text-lime-600',
    },
    {
      title: '플레이스 진단',
      description: 'AI가 내 플레이스의 현재 상태를 종합 분석하고, 개선이 필요한 부분을 명확하게 알려드립니다. 데이터 기반의 정확한 진단으로 최적화 방향을 제시합니다.',
      features: [
        '플레이스 상태 종합 분석',
        '개선점 우선순위 제시',
        '최적화 액션 플랜 제공',
      ],
      image: '/service-place-diagnosis.png',
      gradientFrom: 'from-cyan-300',
      gradientTo: 'to-blue-300',
      checkBg: 'from-cyan-100 to-blue-100',
      checkColor: 'text-cyan-600',
    },
  ];

  return (
    <section id="service-intro" className="py-12 md:py-16 lg:py-20 bg-gradient-to-b from-white via-emerald-50/20 to-teal-50/20">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        {/* 섹션 헤더 */}
        <div className="text-center mb-12 md:mb-16 lg:mb-20">
          <div className="inline-block mb-3 md:mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border border-emerald-200 rounded-full font-bold text-xs md:text-sm">
              핵심 기능
            </div>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 md:mb-6 px-4">
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              <span className="font-millenial">/윕플.</span>의 핵심 기능으로
            </span>
            <br />
            <span className="text-gray-700">하루에 5분만에 플레이스를 관리하세요!!</span>
          </h2>
          
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
            플레이스 관리의 모든 과정을 자동화하고,
            <br className="hidden sm:block" />
            데이터로 입증된 전략을 제공합니다
          </p>
        </div>

        {/* 서비스 목록 - 지그재그 레이아웃 */}
        <div className="space-y-16 md:space-y-24 lg:space-y-32">
          {services.map((service, index) => {
            const isEven = index % 2 === 0;
            
            return (
              <div
                key={service.title}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center"
              >
                {/* 텍스트 콘텐츠 */}
                <div 
                  className={`space-y-4 md:space-y-6 ${
                    isEven ? 'lg:order-1' : 'lg:order-2'
                  }`}
                >
                  {/* 제목 */}
                  <div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight mb-3">
                      <span className={`bg-gradient-to-r ${service.gradientFrom} ${service.gradientTo} bg-clip-text text-transparent`}>
                        {service.title}
                      </span>
                    </h3>
                    {/* Divider - 그라데이션 */}
                    <div className={`h-1 w-16 bg-gradient-to-r ${service.gradientFrom} ${service.gradientTo} rounded-full`}></div>
                  </div>

                  {/* 설명 */}
                  <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed">
                    {service.description}
                  </p>

                  {/* 기능 목록 */}
                  <div className="space-y-2 md:space-y-3 pt-2">
                    {service.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2 md:gap-3">
                        <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-gradient-to-br ${service.checkBg} flex items-center justify-center`}>
                          <Check className={`w-3 h-3 ${service.checkColor}`} strokeWidth={3} />
                        </div>
                        <span className="text-sm sm:text-base text-gray-700 leading-relaxed">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 이미지 - 스크린샷 스타일 */}
                <div 
                  className={`${
                    isEven ? 'lg:order-2' : 'lg:order-1'
                  }`}
                >
                  <div className="relative w-full">
                    {/* 배경 블러 */}
                    <div className={`absolute -inset-3 bg-gradient-to-br ${service.gradientFrom} ${service.gradientTo} opacity-15 blur-2xl rounded-2xl`}></div>
                    
                    {/* 스크린샷 카드 */}
                    <div
                      className="relative border-4 border-gray-200 rounded-lg overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.15)] hover:scale-105 transition-transform duration-300"
                    >
                      {/* 상단 바 (브라우저 느낌) */}
                      <div className="absolute top-0 left-0 right-0 h-6 md:h-8 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200 flex items-center px-2 md:px-3 gap-1 md:gap-1.5 z-10">
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-red-400"></div>
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-yellow-400"></div>
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-green-400"></div>
                      </div>
                      
                      {/* 이미지 */}
                      <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 mt-6 md:mt-8">
                        <Image
                          src={service.image}
                          alt={service.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          quality={85}
                          priority={index === 0}
                          loading={index === 0 ? undefined : 'lazy'}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 CTA */}
        <div className="mt-16 md:mt-20 lg:mt-24">
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-200 rounded-2xl p-8 md:p-10 lg:p-12 max-w-3xl mx-auto text-center shadow-lg">
            <div className="space-y-4 md:space-y-6">
              {/* 아이콘 */}
              <div className="w-12 h-12 md:w-14 md:h-14 mx-auto bg-gradient-to-br from-emerald-200 to-teal-200 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-emerald-600" strokeWidth={2.5} />
              </div>

              {/* 제목 */}
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-800">
                지금 바로 <span className="font-millenial">/윕플.</span>을 시작하세요
              </h3>

              {/* 설명 */}
              <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed">
                무료 플랜으로 시작해서 매장 관리의 변화를 경험하세요.
                <br className="hidden sm:block" />
                신용카드 등록 없이 3분이면 시작할 수 있습니다.
              </p>

              {/* 버튼 */}
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-6 md:px-8 h-12 md:h-14 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 text-white text-base md:text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                무료로 시작하기
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
