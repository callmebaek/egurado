'use client';

import { Star } from 'lucide-react';
import { Container, Grid, Card, Text, Title, Stack, Group } from '@mantine/core';

export const TestimonialsSection = () => {
  const testimonials = [
    {
      title: '순위가 정말 올랐어요!',
      content: '홍대맛집 키워드로 67위에서 12위까지 올랐습니다. AI 답글 기능도 정말 편해요. 이제 리뷰 관리가 부담이 아닙니다.',
      author: '김OO',
      location: '서울 마포구',
      plan: 'Pro 플랜',
      rating: 5,
    },
    {
      title: '무료로도 충분합니다',
      content: '작은 가게라 무료 플랜으로 시작했는데, 진단만으로도 뭘 개선해야 할지 명확히 알 수 있었어요. 3개월 사용 중입니다.',
      author: '이OO',
      location: '부산 해운대구',
      plan: 'Free 플랜',
      rating: 5,
    },
    {
      title: '시간이 정말 절약됩니다',
      content: '매일 순위를 확인하고 리뷰에 답글 다는 게 너무 힘들었는데, 이제 자동으로 다 되니까 장사에만 집중할 수 있어요.',
      author: '박OO',
      location: '대구 중구',
      plan: 'Pro 플랜',
      rating: 5,
    },
    {
      title: '데이터가 정확해요',
      content: '/윕플.을 사용하면서 우리 매장의 문제점을 명확히 파악할 수 있었습니다. 경쟁매장 분석 기능이 특히 유용해요.',
      author: '최OO',
      location: '인천 남동구',
      plan: 'Basic+ 플랜',
      rating: 5,
    },
    {
      title: '빠른 결과에 만족합니다',
      content: '2주 만에 주요 키워드 순위가 30위 이상 올랐어요. 체계적인 관리 덕분에 방문자 수도 눈에 띄게 증가했습니다.',
      author: '정OO',
      location: '경기 수원시',
      plan: 'Basic+ 플랜',
      rating: 5,
    },
    {
      title: '초보자도 쉽게 사용 가능',
      content: 'IT에 약한 제가 사용하기에도 너무 쉬워요. 대시보드가 직관적이고, 필요한 기능을 바로 찾을 수 있습니다.',
      author: '한OO',
      location: '광주 동구',
      plan: 'Free 플랜',
      rating: 5,
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-white">
      <Container size="xl" px="md">
        {/* 섹션 헤더 - Cal.com 스타일 */}
        <Stack gap="lg" align="center" className="text-center mb-12 md:mb-16">
          <Title 
            order={2}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black"
            style={{ lineHeight: '1.1' }}
          >
            /윕플. 사용자들의 평가
          </Title>
          
          {/* 평점 표시 */}
          <Group gap="md" className="items-center">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={28}
                  className={`fill-yellow-400 text-yellow-400 ${i === 5 ? 'opacity-60' : ''}`}
                />
              ))}
            </div>
            <Text className="text-4xl font-bold text-black">4.8</Text>
          </Group>
          <Text size="lg" c="dimmed">(2,847개 매장 리뷰)</Text>
        </Stack>

        {/* 리뷰 그리드 - Cal.com 스타일 미니멀 카드 */}
        <Grid gutter={{ base: 'md', md: 'lg' }}>
          {testimonials.map((testimonial, index) => (
            <Grid.Col key={index} span={{ base: 12, sm: 6, lg: 4 }}>
              <Card
                shadow="xs"
                padding="xl"
                radius="lg"
                className="border border-gray-200 h-full"
              >
                <Stack gap="md">
                  {/* 별점 */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>

                  {/* 제목 */}
                  <Text className="text-lg font-bold text-black">
                    {testimonial.title}
                  </Text>

                  {/* 리뷰 내용 */}
                  <Text size="sm" c="dimmed" className="text-gray-600 leading-relaxed">
                    {testimonial.content}
                  </Text>

                  {/* 작성자 정보 */}
                  <div className="pt-4 border-t border-gray-100">
                    <Text size="sm" className="font-semibold text-black">
                      {testimonial.author}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {testimonial.location} · {testimonial.plan}
                    </Text>
                  </div>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      </Container>
    </section>
  );
};
