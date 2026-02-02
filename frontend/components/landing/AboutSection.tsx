'use client';

import { BarChart2, Users, Award, Heart } from 'lucide-react';
import { Container, Grid, Card, Text, Title, Stack } from '@mantine/core';

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
    <section id="about" className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-teal-50/50 via-emerald-50/50 to-cyan-50/50">
      <Container size="xl" px={{ base: 'md', sm: 'lg', md: 'xl' }}>
        <Grid gutter={{ base: 'xl', md: 48 }} align="center">
          {/* 텍스트 콘텐츠 */}
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Stack gap="lg">
              {/* 제목 - 파스텔 그라데이션 */}
              <Title 
                order={2}
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight"
              >
                <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  소상공인의 성장을 돕는
                </span>
                <br />
                <span className="text-gray-700">데이터 파트너</span>
              </Title>

              <Stack gap="md">
                <Text size="lg" className="text-base sm:text-lg text-gray-600 leading-relaxed">
                  /윕플.은 네이버 플레이스 관리가 어려운 소상공인들을 위해 시작되었습니다.
                  복잡한 데이터 분석과 번거로운 관리 작업을 자동화하고,
                  누구나 쉽게 사용할 수 있는 도구를 만들고자 합니다.
                </Text>

                <Text size="lg" className="text-base sm:text-lg text-gray-600 leading-relaxed">
                  매일 순위를 확인하고, 리뷰에 답글을 달고, 경쟁매장을 분석하는
                  모든 과정이 이제 자동으로 이루어집니다. 여러분은 오직 장사에만 집중하세요.
                </Text>
              </Stack>
            </Stack>
          </Grid.Col>

          {/* 가치 그리드 - 파스텔 */}
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Grid gutter="md">
              {values.map((value, index) => (
                <Grid.Col key={index} span={6}>
                  <Card
                    shadow="md"
                    padding="lg"
                    radius="xl"
                    className="border-2 border-gray-200 h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-white"
                  >
                    <Stack gap="sm" align="center" className="text-center">
                      {/* 아이콘 배경 - 파스텔 그라데이션 */}
                      <div className={`w-14 h-14 bg-gradient-to-br ${value.gradient} rounded-xl flex items-center justify-center shadow-sm`}>
                        <value.icon className={`w-7 h-7 ${value.iconColor}`} strokeWidth={2.5} />
                      </div>
                      <Text className="text-base font-bold text-gray-800">
                        {value.title}
                      </Text>
                      <Text size="sm" className="text-gray-600 leading-relaxed">
                        {value.description}
                      </Text>
                    </Stack>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          </Grid.Col>
        </Grid>
      </Container>
    </section>
  );
};
