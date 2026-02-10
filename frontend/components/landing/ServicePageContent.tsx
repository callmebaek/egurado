'use client';

import Link from 'next/link';
import {
  TrendingUp,
  Search,
  MessageSquare,
  Sparkles,
  Users,
  Target,
  BarChart3,
  Bell,
  Shield,
  ArrowRight,
  Check,
  Zap,
  Eye,
  Clock,
  Star,
  ChevronRight,
  Activity,
  Key,
  Tag,
  LayoutDashboard,
} from 'lucide-react';
import { LandingHeader } from './LandingHeader';
import { Footer } from './Footer';

/* ───────────────────────── 데이터 ───────────────────────── */

/** 핵심 기능 개요 카드 */
const featureOverview = [
  {
    icon: TrendingUp,
    title: '플레이스 순위 조회',
    desc: '키워드를 검색하면 내 매장이 몇 위인지 바로 확인',
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-50 to-cyan-50',
  },
  {
    icon: BarChart3,
    title: '키워드 순위 추적',
    desc: '매일 자동으로 순위를 수집하고 변동이 생기면 알림',
    gradient: 'from-violet-500 to-purple-500',
    bgGradient: 'from-violet-50 to-purple-50',
  },
  {
    icon: Sparkles,
    title: 'AI 리뷰 답글',
    desc: 'AI가 리뷰를 분석해서 맞춤 답글을 자동으로 작성',
    gradient: 'from-emerald-500 to-teal-500',
    bgGradient: 'from-emerald-50 to-teal-50',
  },
  {
    icon: Search,
    title: '플레이스 진단',
    desc: 'AI가 매장 상태를 종합 분석하고 개선점을 알려줌',
    gradient: 'from-orange-500 to-amber-500',
    bgGradient: 'from-orange-50 to-amber-50',
  },
  {
    icon: Users,
    title: '경쟁매장 분석',
    desc: '경쟁 매장의 순위·리뷰·키워드를 한눈에 비교 분석',
    gradient: 'from-rose-500 to-pink-500',
    bgGradient: 'from-rose-50 to-pink-50',
  },
  {
    icon: Target,
    title: '타겟키워드 추출',
    desc: '내 매장에 최적화된 키워드를 AI가 추천',
    gradient: 'from-sky-500 to-blue-500',
    bgGradient: 'from-sky-50 to-blue-50',
  },
];

/** 상세 기능 섹션 */
const detailedFeatures = [
  /* ── 1. 플레이스 순위 조회 ── */
  {
    id: 'rank-check',
    category: '순위 관리',
    categoryColor: 'text-blue-600 bg-blue-100',
    icon: TrendingUp,
    iconGradient: 'from-blue-500 to-cyan-500',
    title: '플레이스 순위 조회',
    subtitle: '내 매장, 지금 몇 위인지 바로 확인하세요',
    description:
      '원하는 키워드를 검색하면 내 매장의 플레이스 순위를 실시간으로 확인할 수 있습니다. 경쟁 매장과의 순위 차이를 한눈에 파악하고, 어떤 키워드에서 강세인지 즉시 알 수 있습니다.',
    benefits: [
      '키워드별 내 매장 순위 즉시 확인',
      '상위 노출 매장과의 차이 비교',
      '여러 키워드 동시 조회 가능',
      '과거 순위 변동 이력 조회',
    ],
    effect:
      '순위를 정확히 알아야 전략을 세울 수 있습니다. 체감이 아닌 데이터로 현재 위치를 파악하세요.',
  },
  /* ── 2. 키워드 순위 추적 ── */
  {
    id: 'rank-tracking',
    category: '순위 관리',
    categoryColor: 'text-violet-600 bg-violet-100',
    icon: BarChart3,
    iconGradient: 'from-violet-500 to-purple-500',
    title: '키워드 순위 자동 추적',
    subtitle: '매일 자동으로 순위를 수집하고, 변동이 생기면 알려드립니다',
    description:
      '추적하고 싶은 키워드를 등록하면 매일 자동으로 순위를 수집합니다. 순위가 오르거나 떨어질 때 SMS, 카카오톡, 이메일로 즉시 알림을 받을 수 있어 빠르게 대응할 수 있습니다.',
    benefits: [
      '매일 자동으로 순위 수집',
      '순위 변동 시 SMS·카카오톡·이메일 알림',
      '일간/주간/월간 순위 변화 그래프',
      '경쟁매장과의 순위 비교 한눈에 확인',
    ],
    effect:
      '매일 직접 순위를 확인할 필요가 없습니다. 변동이 있을 때만 알림을 받아 시간을 절약하고 빠르게 대응하세요.',
  },
  /* ── 3. AI 리뷰 답글 ── */
  {
    id: 'ai-reply',
    category: '리뷰 관리',
    categoryColor: 'text-emerald-600 bg-emerald-100',
    icon: Sparkles,
    iconGradient: 'from-emerald-500 to-teal-500',
    title: 'AI 리뷰 답글',
    subtitle: '리뷰 답글, AI가 대신 써드립니다',
    description:
      'AI가 고객 리뷰의 내용과 감성을 분석하여, 매장 특성에 맞는 정성스러운 답글을 자동으로 생성합니다. 친근한 말투부터 격식체까지, 원하는 스타일로 설정할 수 있으며, 작성된 답글을 바로 게시할 수도 있습니다.',
    benefits: [
      '리뷰 내용 분석 후 맞춤형 답글 자동 생성',
      '답글 톤·길이·이모티콘 등 스타일 직접 설정',
      '생성된 답글 수정 후 바로 게시 가능',
      '답글 작성 시간 90% 이상 절약',
    ],
    effect:
      '리뷰 답글을 빠르게 관리하면 고객 신뢰도가 올라가고, 재방문 가능성이 높아집니다. 매일 바빠도 리뷰 관리를 놓치지 마세요.',
  },
  /* ── 4. 리뷰 분석 ── */
  {
    id: 'review-analysis',
    category: '리뷰 관리',
    categoryColor: 'text-teal-600 bg-teal-100',
    icon: MessageSquare,
    iconGradient: 'from-teal-500 to-cyan-500',
    title: '리뷰 분석',
    subtitle: '고객이 진짜 무슨 말을 하는지, 데이터로 파악하세요',
    description:
      '매장에 달린 모든 리뷰를 AI가 분석하여, 긍정/부정 비율, 자주 언급되는 키워드, 고객 만족도 트렌드를 한눈에 보여줍니다. 어떤 부분에서 칭찬을 받고, 어떤 부분에서 불만이 있는지 명확하게 알 수 있습니다.',
    benefits: [
      '전체 리뷰 긍정·부정 감성 분석',
      '자주 등장하는 키워드·주제 자동 분류',
      '기간별 고객 만족도 트렌드 확인',
      '개선이 필요한 포인트 우선순위 제시',
    ],
    effect:
      '고객의 목소리를 데이터로 정리하면, 무엇을 개선해야 매출이 오르는지 명확해집니다.',
  },
  /* ── 5. 플레이스 진단 ── */
  {
    id: 'place-diagnosis',
    category: '매장 최적화',
    categoryColor: 'text-orange-600 bg-orange-100',
    icon: Search,
    iconGradient: 'from-orange-500 to-amber-500',
    title: '플레이스 진단',
    subtitle: '내 플레이스, 지금 어떤 상태인지 AI가 진단해드립니다',
    description:
      'AI가 내 플레이스의 기본 정보, 사진, 메뉴, 영업시간, 리뷰, 키워드 등을 종합적으로 점검하여, 현재 상태를 점수로 보여드립니다. 어떤 항목이 부족하고, 어떤 순서로 개선하면 좋은지 구체적인 가이드를 제공합니다.',
    benefits: [
      '플레이스 상태 종합 점수 확인',
      '항목별(정보, 사진, 리뷰, 키워드 등) 세부 진단',
      '우선 개선 항목 및 실행 가이드 제공',
      '과거 진단 기록 비교로 개선 추이 확인',
    ],
    effect:
      '현재 매장 상태를 객관적으로 파악하면, 뭘 해야 할지 명확해집니다. 막연한 감이 아닌 데이터 기반의 개선 방향을 제시합니다.',
  },
  /* ── 6. 플레이스 활성화 분석 ── */
  {
    id: 'place-activation',
    category: '매장 최적화',
    categoryColor: 'text-lime-600 bg-lime-100',
    icon: Activity,
    iconGradient: 'from-lime-500 to-green-500',
    title: '플레이스 활성화 분석',
    subtitle: '매장의 온라인 활성도를 점검하고 개선하세요',
    description:
      '매장의 플레이스 활성화 현황을 다각도로 분석합니다. 블로그 리뷰, SNS 언급, 저장 수, 예약 설정, 사진 품질 등 매장의 온라인 존재감을 종합적으로 평가하고, 활성화 점수를 올릴 수 있는 구체적인 방법을 안내합니다.',
    benefits: [
      '블로그·SNS·저장 수 등 활성화 지표 분석',
      '매장 온라인 존재감 종합 점수 확인',
      '활성화 점수를 높이는 실행 가이드',
      '경쟁매장 대비 활성화 수준 비교',
    ],
    effect:
      '플레이스 활성도가 높을수록 검색 노출에 유리합니다. 매장의 온라인 존재감을 강화하세요.',
  },
  /* ── 7. 경쟁매장 분석 ── */
  {
    id: 'competitor-analysis',
    category: '경쟁 분석',
    categoryColor: 'text-rose-600 bg-rose-100',
    icon: Users,
    iconGradient: 'from-rose-500 to-pink-500',
    title: '경쟁매장 분석',
    subtitle: '경쟁매장과 나를 비교해서 이기는 전략을 세우세요',
    description:
      '같은 키워드에서 경쟁하는 매장들의 순위, 리뷰, 키워드 전략을 심층 비교 분석합니다. 경쟁매장이 잘하는 점과 내가 부족한 점을 한눈에 파악하여, 차별화된 전략을 수립할 수 있습니다.',
    benefits: [
      '같은 키워드 내 경쟁매장 순위 비교',
      '경쟁매장의 리뷰 수·평점·키워드 분석',
      '경쟁매장 대비 내 매장 강·약점 파악',
      '상위 노출 전략 벤치마킹 가능',
    ],
    effect:
      '경쟁을 알아야 이길 수 있습니다. 체계적인 경쟁 분석으로 더 효과적인 전략을 세우세요.',
  },
  /* ── 8. 대표키워드 분석 ── */
  {
    id: 'main-keyword',
    category: '키워드 전략',
    categoryColor: 'text-indigo-600 bg-indigo-100',
    icon: Key,
    iconGradient: 'from-indigo-500 to-blue-500',
    title: '대표키워드 분석',
    subtitle: '상위 매장들이 어떤 키워드를 쓰는지 한눈에 파악',
    description:
      '검색어를 입력하면 상위에 노출되는 15개 매장이 어떤 대표 키워드를 사용하고 있는지 분석해드립니다. 잘 되는 매장들의 키워드 전략을 참고하여 내 매장의 키워드를 최적화할 수 있습니다.',
    benefits: [
      '상위 15개 매장의 대표 키워드 분석',
      '자주 사용되는 키워드 트렌드 파악',
      '내 매장에 적용할 키워드 아이디어 제공',
      '업종별 효과적인 키워드 패턴 확인',
    ],
    effect:
      '잘 되는 매장은 이유가 있습니다. 상위 매장의 키워드 전략을 벤치마킹하여 내 매장에 적용하세요.',
  },
  /* ── 9. 타겟키워드 추출 ── */
  {
    id: 'target-keyword',
    category: '키워드 전략',
    categoryColor: 'text-sky-600 bg-sky-100',
    icon: Target,
    iconGradient: 'from-sky-500 to-blue-500',
    title: '타겟키워드 추출',
    subtitle: '내 매장에 딱 맞는 키워드, AI가 찾아드립니다',
    description:
      'AI가 내 매장의 업종, 위치, 경쟁 환경을 분석하여 가장 효과적인 타겟 키워드를 추천합니다. 검색량은 많지만 경쟁이 적은 "블루오션 키워드"를 발굴하고, 키워드별 SEO 최적화 상태를 점검합니다.',
    benefits: [
      'AI 기반 맞춤 키워드 추천',
      '검색량·경쟁도 고려한 최적 키워드 선별',
      '키워드별 SEO 최적화 상태 진단',
      '과거 추출 이력 비교 확인 가능',
    ],
    effect:
      '좋은 키워드 하나가 순위를 바꿉니다. AI가 찾아주는 최적의 키워드로 노출 기회를 잡으세요.',
  },
  /* ── 10. 키워드 검색량 조회 ── */
  {
    id: 'search-volume',
    category: '키워드 전략',
    categoryColor: 'text-cyan-600 bg-cyan-100',
    icon: Tag,
    iconGradient: 'from-cyan-500 to-teal-500',
    title: '키워드 검색량 조회',
    subtitle: '그 키워드, 사람들이 실제로 얼마나 검색하는지 알아보세요',
    description:
      '키워드별 월간 PC·모바일 검색량, 클릭률, 경쟁도를 확인할 수 있습니다. 여러 키워드를 한번에 비교하여 어떤 키워드에 집중해야 하는지 데이터 기반으로 판단할 수 있습니다.',
    benefits: [
      'PC·모바일 월간 검색량 확인',
      '키워드별 클릭률·경쟁도 비교',
      '여러 키워드 동시 조회·비교 가능',
      '키워드 조합 추천 기능',
    ],
    effect:
      '검색량을 모르면 방향을 잃습니다. 정확한 검색 데이터로 효율적인 키워드 전략을 수립하세요.',
  },
];

/** 부가 기능 */
const additionalFeatures = [
  {
    icon: Bell,
    title: '스마트 알림',
    desc: '순위 변동, 새 리뷰 등 중요한 변화를 SMS·카카오톡·이메일로 실시간 알림',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: LayoutDashboard,
    title: '통합 대시보드',
    desc: '등록한 모든 매장의 순위, 키워드, 진단 결과를 한 화면에서 관리',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Shield,
    title: '크레딧 시스템',
    desc: '사용한 만큼만 크레딧을 소모하는 합리적인 과금 방식. 무료 플랜도 제공',
    gradient: 'from-blue-500 to-indigo-500',
  },
  {
    icon: Eye,
    title: '기능 투표',
    desc: '원하는 기능에 투표하면 우선 개발! 고객의 목소리로 서비스가 성장합니다',
    gradient: 'from-purple-500 to-violet-500',
  },
];

/* ───────────────────────── 컴포넌트 ───────────────────────── */

export function ServicePageContent() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      <main>
        {/* ━━━━ HERO SECTION ━━━━ */}
        <section className="relative overflow-hidden pt-28 md:pt-32 lg:pt-40 pb-16 md:pb-24 bg-gradient-to-br from-gray-50/50 via-emerald-50/30 to-teal-50/30">
          {/* 배경 장식 */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/25 rounded-full blur-3xl" />
            <div className="absolute top-40 right-20 w-96 h-96 bg-teal-200/25 rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-cyan-200/25 rounded-full blur-3xl" />
          </div>

          <div className="relative w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 text-center">
            {/* 배지 */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-6 bg-gradient-to-r from-emerald-100 to-teal-100 border border-emerald-200/60 rounded-full shadow-sm">
              <Zap className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-xs md:text-sm font-bold text-teal-700">
                올인원 플레이스 관리 솔루션
              </span>
            </div>

            {/* 메인 헤드라인 */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                플레이스 순위부터 리뷰까지
              </span>
              <br />
              <span className="text-gray-800">한 곳에서 관리하세요</span>
            </h1>

            {/* 서브 헤드라인 */}
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8 md:mb-10 px-4">
              플레이스 순위 추적, AI 리뷰 답글, 경쟁매장 분석, 매장 진단까지.
              <br className="hidden sm:block" />
              <strong className="text-gray-800">
                자영업자와 소상공인을 위한
              </strong>{' '}
              가장 쉬운 매장 관리 도구입니다.
            </p>

            {/* CTA 버튼 */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-12">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-7 md:px-8 h-13 md:h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-base md:text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
              >
                무료로 시작하기
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-7 md:px-8 h-13 md:h-14 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 text-base font-semibold rounded-xl transition-all w-full sm:w-auto"
              >
                가격 보기
              </Link>
            </div>

            {/* 신뢰 지표 */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="w-3 h-3 text-emerald-600" strokeWidth={3} />
                </div>
                <span>신용카드 불필요</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center">
                  <Check className="w-3 h-3 text-teal-600" strokeWidth={3} />
                </div>
                <span>3분이면 시작</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center">
                  <Check className="w-3 h-3 text-cyan-600" strokeWidth={3} />
                </div>
                <span>무료 플랜 제공</span>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━ 핵심 기능 개요 ━━━━ */}
        <section className="py-16 md:py-24 bg-white">
          <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            {/* 섹션 헤더 */}
            <div className="text-center mb-12 md:mb-16">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-4 bg-gradient-to-r from-emerald-100 to-teal-100 border border-emerald-200 rounded-full">
                <Star className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs md:text-sm font-bold text-emerald-700">
                  핵심 기능
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight mb-4">
                <span className="text-gray-800">하루 5분이면 충분합니다</span>
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
                복잡한 매장 관리, <span className="font-millenial">/윕플.</span>이
                자동으로 해드립니다
              </p>
            </div>

            {/* 기능 그리드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {featureOverview.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className={`group relative bg-gradient-to-br ${feature.bgGradient} border border-gray-200/60 rounded-2xl p-6 md:p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
                  >
                    {/* 아이콘 */}
                    <div
                      className={`w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center shadow-lg mb-4`}
                    >
                      <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" strokeWidth={2} />
                    </div>

                    {/* 제목 */}
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                      {feature.title}
                    </h3>

                    {/* 설명 */}
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                      {feature.desc}
                    </p>

                    {/* 더 알아보기 화살표 */}
                    <div className="mt-4 flex items-center text-sm font-semibold text-gray-500 group-hover:text-gray-800 transition-colors">
                      <span>자세히 보기</span>
                      <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ━━━━ 상세 기능 섹션 ━━━━ */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-gray-50/50 to-white">
          <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            {/* 섹션 헤더 */}
            <div className="text-center mb-16 md:mb-20">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight mb-4">
                <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                  모든 기능을 자세히 살펴보세요
                </span>
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
                각 기능이 어떻게 매장 운영에 도움이 되는지 확인해보세요
              </p>
            </div>

            {/* 상세 기능 카드 - 지그재그 레이아웃 */}
            <div className="space-y-20 md:space-y-28 lg:space-y-32">
              {detailedFeatures.map((feature, index) => {
                const Icon = feature.icon;
                const isEven = index % 2 === 0;

                return (
                  <div
                    key={feature.id}
                    id={feature.id}
                    className="scroll-mt-32"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
                      {/* 텍스트 영역 */}
                      <div
                        className={`space-y-5 md:space-y-6 ${isEven ? 'lg:order-1' : 'lg:order-2'}`}
                      >
                        {/* 카테고리 */}
                        <span
                          className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${feature.categoryColor}`}
                        >
                          {feature.category}
                        </span>

                        {/* 제목 */}
                        <div>
                          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                            {feature.title}
                          </h3>
                          <p className="text-base md:text-lg text-gray-600 font-medium">
                            {feature.subtitle}
                          </p>
                        </div>

                        {/* 설명 */}
                        <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                          {feature.description}
                        </p>

                        {/* 주요 효과 */}
                        <div className="space-y-2.5 md:space-y-3">
                          {feature.benefits.map((benefit, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3"
                            >
                              <div
                                className={`flex-shrink-0 mt-0.5 w-5 h-5 bg-gradient-to-br ${feature.iconGradient} rounded-full flex items-center justify-center`}
                              >
                                <Check
                                  className="w-3 h-3 text-white"
                                  strokeWidth={3}
                                />
                              </div>
                              <span className="text-sm md:text-base text-gray-700">
                                {benefit}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* 기대 효과 */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 md:p-5">
                          <div className="flex items-start gap-2.5">
                            <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-700 leading-relaxed">
                              <strong className="text-gray-900">
                                이런 효과가 있어요
                              </strong>
                              <br />
                              {feature.effect}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 비주얼 영역 */}
                      <div
                        className={`${isEven ? 'lg:order-2' : 'lg:order-1'}`}
                      >
                        <div className="relative">
                          {/* 배경 블러 */}
                          <div
                            className={`absolute -inset-4 bg-gradient-to-br ${feature.iconGradient} opacity-10 blur-2xl rounded-3xl`}
                          />

                          {/* 카드 비주얼 */}
                          <div className="relative bg-white border-2 border-gray-200 rounded-2xl p-6 md:p-8 shadow-lg">
                            {/* 아이콘 */}
                            <div
                              className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br ${feature.iconGradient} rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-6`}
                            >
                              <Icon
                                className="w-8 h-8 md:w-10 md:h-10 text-white"
                                strokeWidth={1.5}
                              />
                            </div>

                            {/* 미니 UI 표현 */}
                            <div className="space-y-3">
                              {feature.benefits
                                .slice(0, 3)
                                .map((benefit, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
                                  >
                                    <div
                                      className={`w-8 h-8 bg-gradient-to-br ${feature.iconGradient} rounded-lg flex items-center justify-center flex-shrink-0 opacity-80`}
                                    >
                                      <span className="text-white text-xs font-bold">
                                        {idx + 1}
                                      </span>
                                    </div>
                                    <span className="text-xs md:text-sm text-gray-700 font-medium leading-snug">
                                      {benefit}
                                    </span>
                                  </div>
                                ))}
                            </div>

                            {/* 하단 데코 */}
                            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full bg-gradient-to-br ${feature.iconGradient}`}
                              />
                              <span className="text-xs text-gray-400 font-medium">
                                {feature.category}
                              </span>
                              <div
                                className={`w-2 h-2 rounded-full bg-gradient-to-br ${feature.iconGradient}`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ━━━━ 부가 기능 섹션 ━━━━ */}
        <section className="py-16 md:py-24 bg-white">
          <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight mb-4">
                <span className="text-gray-800">더 편한 관리를 위한</span>
                <br />
                <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  부가 기능
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {additionalFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="bg-white border-2 border-gray-200 rounded-2xl p-6 md:p-8 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <div
                      className={`w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mx-auto shadow-lg mb-4`}
                    >
                      <Icon
                        className="w-6 h-6 md:w-7 md:h-7 text-white"
                        strokeWidth={2}
                      />
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ━━━━ 최종 CTA 섹션 ━━━━ */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
          <div className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8 text-center">
            {/* 아이콘 */}
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-gradient-to-br from-emerald-400 to-teal-400 rounded-2xl flex items-center justify-center shadow-xl mb-6 md:mb-8">
              <Sparkles
                className="w-8 h-8 md:w-10 md:h-10 text-white"
                strokeWidth={2}
              />
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 md:mb-6">
              <span className="text-gray-800">지금 바로</span>
              <br className="sm:hidden" />{' '}
              <span className="font-millenial bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                /윕플.
              </span>
              <span className="text-gray-800">을 시작하세요</span>
            </h2>

            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8 md:mb-10">
              무료 플랜으로 시작해서 매장 관리의 변화를 직접 경험하세요.
              <br className="hidden sm:block" />
              신용카드 등록 없이, 3분이면 시작할 수 있습니다.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 md:px-10 h-13 md:h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-base md:text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
              >
                무료로 시작하기
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-8 md:px-10 h-13 md:h-14 border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-100 text-base font-semibold rounded-xl transition-all w-full sm:w-auto"
              >
                가격 및 플랜 보기
              </Link>
            </div>

            {/* 안심 마크 */}
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>평일 10시~18시 고객 지원</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>데이터 안전하게 보호</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
