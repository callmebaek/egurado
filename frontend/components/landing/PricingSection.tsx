'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { Container, Grid, Card, Text, Title, Stack, Button, Badge } from '@mantine/core';

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
        '플레이스 진단 (월 3회)',
        '키워드 순위 조회 (월 10회)',
        '리뷰 분석 (월 1회)',
        '대시보드 기본 기능',
      ],
      cta: '무료로 시작하기',
      ctaVariant: 'outline',
    },
    {
      name: 'Basic',
      tier: 'basic',
      price: '추후 공지',
      priceNote: '출시 예정',
      description: '주 2-3회 플레이스를 관리하는 분',
      popular: false,
      features: [
        '매장 3개',
        '키워드 10개',
        '월 600 크레딧',
        '자동 순위 수집 (3개)',
        '플레이스 진단 (무제한)',
        '키워드 순위 조회 (무제한)',
        '리뷰 분석 (제한 내)',
        '경쟁매장 분석 (제한 내)',
      ],
      cta: '출시 알림 받기',
      ctaVariant: 'outline',
    },
    {
      name: 'Basic+',
      tier: 'basic_plus',
      price: '추후 공지',
      priceNote: '출시 예정',
      description: '빡세게 플레이스를 관리하는 분',
      popular: true,
      features: [
        '매장 4개',
        '키워드 6개',
        '월 1,200 크레딧',
        '자동 순위 수집 (6개)',
        '플레이스 진단 (무제한)',
        '키워드 순위 조회 (무제한)',
        'AI 답글 생성 (제한 내)',
        '리뷰 분석 (무제한)',
        '경쟁매장 분석 (무제한)',
      ],
      cta: '출시 알림 받기',
      ctaVariant: 'filled',
    },
    {
      name: 'Pro',
      tier: 'pro',
      price: '추후 공지',
      priceNote: '출시 예정',
      description: '다점포를 운영하는 파워 유저',
      popular: false,
      features: [
        '매장 10개',
        '키워드 50개',
        '월 3,000 크레딧',
        '자동 순위 수집 (15개)',
        '모든 기능 무제한',
        'AI 답글 생성 (무제한)',
        '우선 고객 지원',
        '전담 매니저 배정',
      ],
      cta: '출시 알림 받기',
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
        '모든 기능 무제한',
        '전담 매니저 배정',
        '맞춤형 솔루션',
        '24시간 우선 지원',
      ],
      cta: '상담 신청하기',
      ctaVariant: 'outline',
    },
  ];

  return (
    <section id="pricing" className="py-12 sm:py-16 md:py-24 bg-gradient-to-br from-teal-50/50 via-cyan-50/50 to-emerald-50/50">
      <Container size="xl" px={{ base: 'xs', sm: 'md' }}>
        {/* 섹션 헤더 - 파스텔 그라데이션 */}
        <Stack gap={{ base: 'sm', sm: 'md', md: 'lg' }} align="center" className="text-center mb-8 sm:mb-12 md:mb-16">
          <Title 
            order={2}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold px-2"
            style={{ lineHeight: '1.1' }}
          >
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              원하는 방식으로
            </span>
            <br />
            <span className="text-gray-700">플레이스를 관리하세요</span>
          </Title>
          <Text className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl px-2">
            모든 플랜에서 100% 정확한 진단과 데이터 기반 분석을 제공합니다
          </Text>
        </Stack>

        {/* 플랜 그리드 - 파스텔 스타일 */}
        <Grid gutter={{ base: 'sm', sm: 'md', lg: 'lg' }}>
          {plans.map((plan) => (
            <Grid.Col key={plan.tier} span={{ base: 12, sm: 6, lg: 4, xl: 2.4 }}>
                <Card
                  shadow="md"
                  padding={{ base: 'md', sm: 'lg', md: 'xl' }}
                  radius="xl"
                  className={`border-2 h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                    plan.popular
                      ? 'border-teal-300 bg-gradient-to-br from-teal-50/50 to-cyan-50/50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <Stack gap={{ base: 'sm', sm: 'md', md: 'lg' }} className="h-full">
                    {/* 플랜 헤더 */}
                    <div>
                      {plan.popular && (
                        <Badge 
                          size="sm" 
                          radius="xl" 
                          className="mb-2 sm:mb-3 bg-gradient-to-r from-emerald-400 to-teal-400 text-white border-0 font-bold px-2 sm:px-3 py-0.5 sm:py-1 text-xs"
                        >
                          인기
                        </Badge>
                      )}
                    <Title order={3} className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">
                      {plan.name}
                    </Title>
                    <Text size="sm" c="dimmed" className="min-h-[32px] sm:min-h-[40px] text-xs sm:text-sm">
                      {plan.description}
                    </Text>
                  </div>

                  {/* 가격 */}
                  <div>
                    <Text className={`text-2xl sm:text-3xl md:text-4xl font-bold ${plan.tier === 'free' ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent' : 'text-gray-800'}`}>
                      {plan.price}
                    </Text>
                    <Text size="xs" c="dimmed" className="text-[10px] sm:text-xs">
                      {plan.priceNote}
                    </Text>
                  </div>

                    {/* 기능 리스트 */}
                    <Stack gap="xs" className="flex-1">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className={`flex-shrink-0 w-4 h-4 rounded-full ${plan.popular ? 'bg-gradient-to-br from-teal-200 to-cyan-200' : 'bg-gray-100'} flex items-center justify-center mt-0.5`}>
                            <Check size={10} className={plan.popular ? 'text-teal-700' : 'text-gray-600'} strokeWidth={3} />
                          </div>
                          <Text size="xs" className="text-gray-700">{feature}</Text>
                        </div>
                      ))}
                    </Stack>

                    {/* CTA 버튼 - 파스텔 */}
                    <Button
                      component={Link}
                      href={plan.tier === 'free' ? '/dashboard' : '/signup'}
                      size="md"
                      radius="xl"
                      fullWidth
                      className={
                        plan.ctaVariant === 'filled'
                          ? 'bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 text-white font-bold border-0 shadow-md hover:shadow-lg transition-all'
                          : plan.tier === 'free'
                          ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold border-0 shadow-md hover:shadow-lg transition-all'
                          : 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-semibold transition-all'
                      }
                    >
                      {plan.cta}
                    </Button>

                  {plan.tier === 'free' && (
                    <Text size="xs" c="dimmed" className="text-center">
                      신용카드 등록 불필요
                    </Text>
                  )}
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>

        {/* 하단 안내 */}
        <Stack gap="sm" align="center" className="mt-12">
          <div className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-emerald-200 rounded-full shadow-sm">
            <Text size="sm" className="text-gray-600">
              모든 플랜에서 14일 환불 보장 | 언제든지 플랜 변경 가능
            </Text>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-teal-200 rounded-full shadow-sm">
            <Text size="sm" className="font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              2,847개 매장이 /윕플.을 사용하고 있습니다
            </Text>
          </div>
        </Stack>
      </Container>
    </section>
  );
};
