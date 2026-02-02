'use client';

import { ArrowRight, Check, Sparkles, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';
import { Container, Grid, Button, Card, Text, Title, Stack, Group, TextInput } from '@mantine/core';
import { useState } from 'react';

export const HeroSection = () => {
  const [email, setEmail] = useState('');

  return (
    <section className="relative bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 pt-24 sm:pt-28 md:pt-32 lg:pt-36 pb-16 sm:pb-20 md:pb-24 overflow-hidden">
      {/* 배경 장식 요소 - 파스텔 톤 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-cyan-200/30 rounded-full blur-3xl animate-pulse delay-500" />
        
        {/* 떠다니는 아이콘 - 모바일에서 우측 배치 */}
        <div className="hidden md:block absolute top-1/4 left-1/4 animate-float">
          <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-emerald-400/40" strokeWidth={2} />
        </div>
        <div className="absolute top-[15%] right-[8%] md:top-1/3 md:right-1/4 animate-float delay-300">
          <Sparkles className="w-6 h-6 md:w-10 md:h-10 text-teal-400/50" strokeWidth={2} />
        </div>
        <div className="absolute top-[35%] right-[12%] md:bottom-1/4 md:right-1/3 animate-float delay-700">
          <Zap className="w-5 h-5 md:w-9 md:h-9 text-cyan-400/50" strokeWidth={2} />
        </div>
        <div className="absolute top-[55%] right-[6%] md:hidden animate-float delay-500">
          <TrendingUp className="w-5 h-5 text-emerald-400/50" strokeWidth={2} />
        </div>
      </div>

      <Container size="xl" px={{ base: 'md', sm: 'lg', md: 'xl' }}>
        <Grid gutter={{ base: 'xl', md: 'xl' }} align="center">
          {/* 왼쪽: 메인 콘텐츠 */}
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Stack gap="lg">
                   {/* 상단 배지 - 파스텔 */}
                   <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-emerald-100 to-teal-100 border-2 border-emerald-200/50 rounded-full w-fit shadow-sm">
                     <Sparkles className="w-4 h-4 text-teal-600" />
                     <span className="text-sm md:text-base font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">AI 기반 자동화 솔루션</span>
                   </div>

                   {/* 메인 헤드라인 - 파스텔 그라데이션 */}
                   <Title 
                     order={1}
                     className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
                   >
                     <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                       플레이스 리뷰와
                     </span>
                     <br />
                     <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                       플레이스 순위를
                     </span>
                     <br />
                     <span className="text-gray-700">
                       가장 쉽게 관리하는
                     </span>
                     <br />
                     <span className="bg-gradient-to-r from-lime-400 to-emerald-400 bg-clip-text text-transparent">
                       자영업자 전용 에이전트
                     </span>
                   </Title>

              {/* 서브 헤드라인 */}
              <Text 
                className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed max-w-xl"
              >
                AI가 자동으로 리뷰 답글을 작성하고, 순위를 추적하며, 데이터 분석까지. 
                이제 매장 운영에만 집중하세요.
              </Text>

                   {/* CTA 버튼 그룹 - 개선된 디자인 */}
                   <Group gap="md" className="flex-col sm:flex-row">
                     <Button
                       component={Link}
                       href="/dashboard"
                       size="xl"
                       radius="md"
                       className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white h-14 px-8 text-base font-bold shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                       rightSection={<ArrowRight size={20} />}
                     >
                       무료로 시작하기
                     </Button>
                     <Button
                       component={Link}
                       href="#service-intro"
                       size="xl"
                       radius="md"
                       variant="outline"
                       className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 h-14 px-8 text-base font-semibold w-full sm:w-auto transition-all"
                     >
                       더 알아보기
                     </Button>
                   </Group>

                   {/* 안심 메시지 - 심플한 텍스트 스타일 */}
                   <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm text-gray-600">
                     <div className="flex items-center gap-2">
                       <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                         <Check size={14} className="text-emerald-600" strokeWidth={3} />
                       </div>
                       <span>신용카드 등록 불필요</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                         <Check size={14} className="text-teal-600" strokeWidth={3} />
                       </div>
                       <span>3분이면 완료</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                         <Check size={14} className="text-cyan-600" strokeWidth={3} />
                       </div>
                       <span>2,847개 매장 이용 중</span>
                     </div>
                   </div>
            </Stack>
          </Grid.Col>

          {/* 오른쪽: 로그인 카드 - 원본 */}
          <Grid.Col span={{ base: 12, lg: 6 }} className="mt-12 lg:mt-0">
             <div className="relative max-w-lg mx-auto">
               {/* 배경 장식 */}
               <div className="absolute inset-0 bg-gradient-to-br from-emerald-200/40 to-teal-200/40 rounded-3xl blur-2xl opacity-60 animate-pulse"></div>
               
               <Card 
                 shadow="xl" 
                 padding="lg"
                 radius="xl"
                 className="border-2 border-emerald-200/50 relative z-10 bg-white/95 backdrop-blur-sm"
               >
                 <Stack gap="md">
                   <div>
                     <Title order={3} size="h3" className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent mb-2">
                       /윕플. 시작하기
                     </Title>
                    <Text size="sm" c="dimmed" className="text-sm">
                      무료로 시작하고 언제든지 업그레이드하세요
                    </Text>
                  </div>

                  <form 
                    onSubmit={(e) => { 
                      e.preventDefault(); 
                      window.location.href = '/login'; 
                    }}
                  >
                    <Stack gap="sm">
                       <TextInput
                         size="lg"
                         radius="md"
                         placeholder="이메일 또는 전화번호"
                         value={email}
                         onChange={(e) => setEmail(e.target.value)}
                         className="w-full"
                         styles={{
                           input: {
                             border: '2px solid #ccfbf1',
                             fontSize: '16px',
                             height: '48px'
                           }
                         }}
                       />

                       <Button
                         type="submit"
                         size="lg"
                         radius="xl"
                         fullWidth
                         className="bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 text-white h-12 text-base font-bold shadow-md"
                       >
                         로그인
                       </Button>
                     </Stack>
                   </form>

                   <Text size="sm" c="dimmed" className="text-center text-sm">
                     처음이신가요?{' '}
                     <Link href="/signup" className="text-teal-600 font-semibold hover:underline">
                       회원가입
                     </Link>
                   </Text>
                </Stack>
              </Card>

              {/* Free badge */}
              <div className="flex justify-center mt-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-emerald-300 rounded-full shadow-md">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <Text className="text-sm font-bold text-gray-700">
                    간단한 매장 <span className="text-emerald-500">100% 무료</span>
                  </Text>
                </div>
              </div>
            </div>
          </Grid.Col>
        </Grid>
      </Container>

      {/* CSS 애니메이션 */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .delay-300 {
          animation-delay: 300ms;
        }
        .delay-500 {
          animation-delay: 500ms;
        }
        .delay-700 {
          animation-delay: 700ms;
        }
        .delay-1000 {
          animation-delay: 1000ms;
        }
      `}</style>
    </section>
  );
};
