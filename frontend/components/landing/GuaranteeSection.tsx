'use client';

import { ShieldCheck, RefreshCw, Clock, Award } from 'lucide-react';
import { Container, Grid, Card, Text, Title, Stack } from '@mantine/core';

export const GuaranteeSection = () => {
  const guarantees = [
    {
      icon: ShieldCheck,
      title: '14일 환불 보장',
      description: '서비스가 만족스럽지 않으시면 14일 이내 전액 환불해드립니다',
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
      title: '데이터 정확도 보장',
      description: '네이버 플레이스 공식 데이터를 기반으로 100% 정확한 분석을 제공합니다',
      gradient: 'from-emerald-100 to-teal-100',
      iconColor: 'text-emerald-500',
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-white via-emerald-50/30 to-teal-50/30">
      <Container size="xl" px="md">
        {/* 섹션 헤더 - 파스텔 그라데이션 */}
        <Stack gap="lg" align="center" className="text-center mb-12 md:mb-16">
          <Title 
            order={2}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold"
            style={{ lineHeight: '1.1' }}
          >
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              확실한 보장으로
            </span>
            <br />
            <span className="text-gray-700">안심하세요</span>
          </Title>
          <Text size="xl" className="text-lg sm:text-xl text-gray-600 max-w-3xl">
            /윕플.은 데이터 기반의 검증된 서비스를 제공합니다
          </Text>
        </Stack>

        {/* 보장 항목 그리드 - 파스텔 */}
        <Grid gutter={{ base: 'md', md: 'lg' }}>
          {guarantees.map((guarantee, index) => (
            <Grid.Col key={index} span={{ base: 12, sm: 6, lg: 3 }}>
              <Card
                shadow="md"
                padding="xl"
                radius="xl"
                className="border-2 border-gray-200 h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-white"
              >
                <Stack gap="md" align="center" className="text-center">
                  {/* 아이콘 배경 - 파스텔 그라데이션 */}
                  <div className={`w-16 h-16 bg-gradient-to-br ${guarantee.gradient} rounded-2xl flex items-center justify-center shadow-sm`}>
                    <guarantee.icon className={`w-8 h-8 ${guarantee.iconColor}`} strokeWidth={2.5} />
                  </div>
                  <Text className="text-lg font-bold text-gray-800">
                    {guarantee.title}
                  </Text>
                  <Text size="sm" className="text-gray-600 leading-relaxed">
                    {guarantee.description}
                  </Text>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>

        {/* 하단 CTA 카드 - 파스텔 */}
        <div className="mt-16 md:mt-20">
          <Card
            shadow="lg"
            padding="xl"
            radius="xl"
            className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-200 max-w-3xl mx-auto text-center"
          >
            <Stack gap="md">
              <div className="w-12 h-12 mx-auto bg-gradient-to-br from-emerald-200 to-teal-200 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-emerald-600" strokeWidth={2.5} />
              </div>
              <Title order={3} className="text-2xl md:text-3xl font-bold text-gray-800">
                100% 안심하고 시작하세요
              </Title>
              <Text className="text-gray-600 text-base md:text-lg">
                만족하지 않으시면 14일 이내 전액 환불해드립니다.
                <br className="hidden sm:block" />
                질문이나 문의사항이 있으시면 언제든지 연락주세요.
              </Text>
            </Stack>
          </Card>
        </div>
      </Container>
    </section>
  );
};
