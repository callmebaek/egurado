'use client';

import { Check, Sparkles, Target, MessageCircle, BarChart2, ClipboardCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Container, Grid, Card, Title, Text, Stack, Badge, Button } from '@mantine/core';
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
      icon: Target,
      iconBg: 'from-blue-100 to-cyan-100',
      iconColor: 'text-blue-500',
      newBadge: true,
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
      icon: MessageCircle,
      iconBg: 'from-emerald-100 to-teal-100',
      iconColor: 'text-emerald-500',
      newBadge: true,
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
      icon: BarChart2,
      iconBg: 'from-lime-100 to-green-100',
      iconColor: 'text-lime-600',
      newBadge: false,
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
      icon: ClipboardCheck,
      iconBg: 'from-cyan-100 to-blue-100',
      iconColor: 'text-cyan-600',
      newBadge: false,
    },
  ];

  return (
    <section id="service-intro" className="py-16 sm:py-20 md:py-24 bg-gradient-to-b from-white via-emerald-50/20 to-teal-50/20">
      <Container size="xl" px={{ base: 'md', sm: 'lg', md: 'xl' }}>
        {/* 섹션 헤더 */}
        <div className="text-center mb-12 sm:mb-14 md:mb-16">
          <div className="inline-block mb-4">
            <Badge 
              size="lg" 
              radius="xl" 
              className="bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-2 border-emerald-200 px-4 py-2 font-bold text-sm"
            >
              핵심 기능
            </Badge>
          </div>
          
          <Title 
            order={2} 
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6 px-4"
          >
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              /윕플.의 핵심 기능으로
            </span>
            <br />
            <span className="text-gray-700">하루에 5분만에 플레이스 관리하세요</span>
          </Title>
          
          <div className="mt-6 flex justify-center px-4">
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl leading-relaxed text-center">
              플레이스 관리의 모든 과정을 자동화하고,
              <br />
              데이터로 입증된 전략을 제공합니다
            </p>
          </div>
        </div>

        {/* 서비스 목록 - 지그재그 레이아웃 */}
        <Stack gap={{ base: 96, sm: 112, md: 128 }}>
          {services.map((service, index) => {
            const isEven = index % 2 === 0;
            
            return (
              <Grid
                key={service.title}
                gutter={{ base: 'xl', md: 48 }}
                align="center"
              >
                {/* 텍스트 콘텐츠 */}
                <Grid.Col 
                  span={{ base: 12, lg: 6 }}
                  order={{ base: 1, lg: isEven ? 1 : 2 }}
                >
                  <Stack gap="md" className="h-full justify-center">
                    {/* 아이콘 박스 - 파스텔 */}
                    <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br ${service.iconBg} shadow-md`}>
                      <service.icon className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ${service.iconColor}`} strokeWidth={2.5} />
                    </div>

                    {/* NEW 배지 - 파스텔 */}
                    {service.newBadge && (
                      <Badge
                        size="md"
                        radius="xl"
                        className="bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-2 border-emerald-200 w-fit animate-bounce-slow shadow-sm text-xs"
                        leftSection={<Sparkles size={12} />}
                      >
                        NEW
                      </Badge>
                    )}

                    {/* 제목 - 파스텔 그라데이션 */}
                    <Title 
                      order={3} 
                      className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight"
                    >
                      <span className={`bg-gradient-to-r ${service.gradientFrom} ${service.gradientTo} bg-clip-text text-transparent`}>
                        {service.title}
                      </span>
                    </Title>

                    {/* 설명 */}
                    <Text className="text-gray-600 leading-relaxed text-base sm:text-lg mb-2">
                      {service.description}
                    </Text>

                    {/* 기능 목록 */}
                    <Stack gap="sm" className="mt-6">
                      {service.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-gradient-to-br ${service.iconBg} flex items-center justify-center`}>
                            <Check size={12} className={`${service.iconColor}`} strokeWidth={3} />
                          </div>
                          <Text className="text-gray-700 leading-relaxed flex-1 text-sm sm:text-base">
                            {feature}
                          </Text>
                        </div>
                      ))}
                    </Stack>
                  </Stack>
                </Grid.Col>

                {/* 이미지 - 스크린샷 스타일 */}
                <Grid.Col 
                  span={{ base: 12, lg: 6 }}
                  order={{ base: 2, lg: isEven ? 2 : 1 }}
                >
                  <div className="relative w-full mt-8 lg:mt-0 flex items-center justify-center">
                    {/* 이미지 컨테이너 - 풀 사이즈 */}
                    <div className="relative w-full">
                      {/* 배경 블러 - 파스텔 */}
                      <div className={`absolute -inset-3 bg-gradient-to-br ${service.gradientFrom} ${service.gradientTo} opacity-15 blur-2xl rounded-2xl`}></div>
                      
                      {/* 스크린샷 스타일 카드 */}
                      <Card
                        shadow="2xl"
                        radius="lg"
                        padding={0}
                        className={`relative border-4 border-gray-200 overflow-hidden group hover:scale-105 transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)]`}
                        style={{
                          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.5)'
                        }}
                      >
                        {/* 상단 바 (브라우저/앱 느낌) */}
                        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200 flex items-center px-3 gap-1.5 z-10">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                        </div>
                        
                        <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 mt-8">
                          <Image
                            src={service.image}
                            alt={service.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                            quality={90}
                            priority={index === 0}
                            loading={index === 0 ? undefined : 'lazy'}
                          />
                          
                          {/* 이미지 오버레이 - 파스텔 */}
                          <div className={`absolute inset-0 bg-gradient-to-t ${service.gradientFrom} ${service.gradientTo} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </Grid.Col>
              </Grid>
            );
          })}
        </Stack>

        {/* 하단 CTA - 개선된 스타일 */}
        <div className="mt-16 sm:mt-20 md:mt-24">
          <Card 
            shadow="lg" 
            padding="xl"
            radius="xl"
            className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-200 max-w-3xl mx-auto text-center"
          >
            <Stack gap="lg">
              <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto bg-gradient-to-br from-emerald-200 to-teal-200 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" strokeWidth={2.5} />
              </div>
              <Title order={3} className="text-2xl sm:text-3xl font-bold text-gray-800">
                지금 바로 /윕플.을 시작하세요
              </Title>
              <Text className="text-gray-600 text-base sm:text-lg leading-relaxed">
                무료 플랜으로 시작해서 매장 관리의 변화를 경험하세요.
                <br className="hidden sm:block" />
                신용카드 등록 없이 3분이면 시작할 수 있습니다.
              </Text>
              <Button
                component={Link}
                href="/dashboard"
                size="lg"
                radius="xl"
                rightSection={<ArrowRight size={20} />}
                className="bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 text-white font-bold mx-auto shadow-lg hover:shadow-xl transition-all text-base sm:text-lg w-full sm:w-auto"
              >
                무료로 시작하기
              </Button>
            </Stack>
          </Card>
        </div>
      </Container>

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};
