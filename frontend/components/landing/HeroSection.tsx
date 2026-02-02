'use client';

import { ArrowRight, Check, Sparkles, TrendingUp, Zap, Star } from 'lucide-react';
import Link from 'next/link';
import { Container, Grid, Button, Card, Text, Title, Stack, Group, TextInput } from '@mantine/core';
import { useState } from 'react';

export const HeroSection = () => {
  const [email, setEmail] = useState('');

  return (
    <section className="relative bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 pt-28 sm:pt-32 md:pt-36 lg:pt-40 pb-12 sm:pb-16 md:pb-24 overflow-hidden">
      {/* 배경 장식 요소 - 파스텔 톤 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-cyan-200/30 rounded-full blur-3xl animate-pulse delay-500" />
        
        <div className="absolute top-1/4 left-1/4 animate-float">
          <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-emerald-400/40" strokeWidth={2} />
        </div>
        <div className="absolute top-1/3 right-1/4 animate-float delay-300">
          <Sparkles className="w-7 h-7 md:w-10 md:h-10 text-teal-400/40" strokeWidth={2} />
        </div>
        <div className="absolute bottom-1/4 right-1/3 animate-float delay-700">
          <Zap className="w-6 h-6 md:w-9 md:h-9 text-cyan-400/40" strokeWidth={2} />
        </div>
      </div>

      <Container size="xl" px={{ base: 'xs', sm: 'md' }}>
        <Grid gutter={{ base: 'md', sm: 'lg', md: 60 }} align="center">
          {/* 왼쪽: 메인 콘텐츠 */}
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Stack gap={{ base: 'md', sm: 'lg', md: 'xl' }}>
                   {/* 상단 배지 - 파스텔 */}
                   <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-emerald-100 to-teal-100 border-2 border-emerald-200/50 rounded-full w-fit shadow-sm">
                     <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-teal-600" />
                     <span className="text-xs md:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">AI 기반 자동화 솔루션</span>
                   </div>

                   {/* 메인 헤드라인 - 파스텔 그라데이션 */}
                   <Title 
                     order={1}
                     className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight"
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
                className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 leading-relaxed max-w-xl"
              >
                AI가 자동으로 리뷰 답글을 작성하고, 순위를 추적하며, 데이터 분석까지. 
                이제 매장 운영에만 집중하세요.
              </Text>

                   {/* CTA 버튼 그룹 - 파스텔 */}
                   <Group gap={{ base: 'xs', sm: 'md' }} className="flex-col sm:flex-row">
                     <Button
                       component={Link}
                       href="/dashboard"
                       size="lg"
                       radius="xl"
                       className="bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 text-white h-11 sm:h-12 md:h-14 px-6 sm:px-8 md:px-10 text-sm md:text-base font-bold shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                       rightSection={<ArrowRight size={18} />}
                     >
                       시작하기
                     </Button>
                     <Button
                       component={Link}
                       href="#service-intro"
                       size="lg"
                       radius="xl"
                       variant="outline"
                       className="border-2 border-teal-300 text-teal-600 hover:bg-teal-50 h-11 sm:h-12 md:h-14 px-6 sm:px-8 md:px-10 text-sm md:text-base font-semibold w-full sm:w-auto"
                     >
                       더 알아보기
                     </Button>
                   </Group>

                   {/* 안심 메시지 - 파스텔 */}
                   <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-3 text-xs sm:text-xs md:text-sm">
                     <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 md:py-2 bg-emerald-50 border border-emerald-200 rounded-lg shadow-sm">
                       <Check size={14} className="text-emerald-500 flex-shrink-0 sm:w-4 sm:h-4" />
                       <span className="font-semibold text-emerald-700 whitespace-nowrap">신용카드 등록 불필요</span>
                     </div>
                     <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 md:py-2 bg-teal-50 border border-teal-200 rounded-lg shadow-sm">
                       <Check size={14} className="text-teal-500 flex-shrink-0 sm:w-4 sm:h-4" />
                       <span className="font-semibold text-teal-700 whitespace-nowrap">3분이면 완료</span>
                     </div>
                     <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 md:py-2 bg-cyan-50 border border-cyan-200 rounded-lg shadow-sm">
                       <Check size={14} className="text-cyan-500 flex-shrink-0 sm:w-4 sm:h-4" />
                       <span className="font-semibold text-cyan-700 whitespace-nowrap">2,847개 매장 이용 중</span>
                     </div>
                   </div>
            </Stack>
          </Grid.Col>

          {/* 오른쪽: 로그인 카드 */}
          <Grid.Col span={{ base: 12, lg: 6 }} className="mt-8 lg:mt-0">
             <div className="relative max-w-lg mx-auto">
               {/* 배경 장식 - 파스텔 */}
               <div className="absolute inset-0 bg-gradient-to-br from-emerald-200/40 to-teal-200/40 rounded-3xl blur-2xl opacity-60 animate-pulse"></div>
               
               <Card 
                 shadow="xl" 
                 padding={{ base: 'md', sm: 'lg', md: 'xl' }}
                 radius="xl"
                 className="border-2 border-emerald-200/50 relative z-10 bg-white/95 backdrop-blur-sm"
               >
                 <Stack gap={{ base: 'sm', sm: 'md', md: 'lg' }}>
                   <div>
                     <Title order={3} size="h3" className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent mb-2">
                       /윕플. 시작하기
                     </Title>
                    <Text size="sm" c="dimmed" className="text-xs sm:text-sm">
                      무료로 시작하고 언제든지 업그레이드하세요
                    </Text>
                  </div>

                  <form 
                    onSubmit={(e) => { 
                      e.preventDefault(); 
                      window.location.href = '/dashboard'; 
                    }}
                  >
                    <Stack gap="sm">
                       <TextInput
                         size="md"
                         radius="md"
                         placeholder="이메일 또는 전화번호"
                         value={email}
                         onChange={(e) => setEmail(e.target.value)}
                         className="w-full"
                         styles={{
                           input: {
                             border: '2px solid #ccfbf1',
                             fontSize: '14px',
                             height: '42px',
                             '@media (min-width: 640px)': {
                               fontSize: '16px',
                               height: '48px'
                             }
                           }
                         }}
                       />

                       <Button
                         type="submit"
                         size="md"
                         radius="xl"
                         fullWidth
                         className="bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 text-white h-10 sm:h-12 text-sm sm:text-base font-bold shadow-md"
                       >
                         로그인
                       </Button>
                     </Stack>
                   </form>

                   <Text size="sm" c="dimmed" className="text-center text-xs sm:text-sm">
                     처음이신가요?{' '}
                     <Link href="/signup" className="text-teal-600 font-semibold hover:underline">
                       회원가입
                     </Link>
                   </Text>

                   {/* 성과 지표 - 파스텔 */}
                   <div className="pt-4 sm:pt-6 border-t-2 border-emerald-100">
                     <Grid gutter={{ base: 'xs', sm: 'sm', md: 'md' }}>
                       <Grid.Col span={6}>
                         <div className="text-center p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-100">
                           <Text className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent mb-0.5 sm:mb-1">
                             84.5점
                           </Text>
                           <Text size="xs" c="dimmed" className="font-semibold text-[10px] sm:text-xs">평균 진단점수</Text>
                         </div>
                       </Grid.Col>
                       <Grid.Col span={6}>
                         <div className="text-center p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg border border-cyan-100">
                           <Text className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent mb-0.5 sm:mb-1">
                             25.3위
                           </Text>
                           <Text size="xs" c="dimmed" className="font-semibold text-[10px] sm:text-xs">평균 순위 상승</Text>
                         </div>
                       </Grid.Col>
                     </Grid>
                   </div>
                </Stack>
              </Card>

              {/* Free badge - 파스텔 */}
              <div className="flex justify-center mt-3 sm:mt-4">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white border-2 border-emerald-300 rounded-full shadow-md">
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 fill-emerald-400" />
                  <Text className="text-xs sm:text-sm font-bold text-gray-700">
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
