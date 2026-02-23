'use client';

import Link from 'next/link';
import {
  Camera,
  MapPin,
  Search,
  Target,
  Calendar,
  MessageCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Shield,
  Clock,
  Quote,
  Users,
  TrendingUp,
  Sparkles,
  Mail,
} from 'lucide-react';
import { LandingHeader } from './LandingHeader';
import { Footer } from './Footer';

/* ───────────────────────── 데이터 ───────────────────────── */

/** 현재 진행 중인 지역 */
const activeRegions = ['서울 강남', '홍대', '성수', '중랑'];

/** 사진관 키워드 구조 */
const keywordExamples = [
  '지역 + 증명사진',
  '지역 + 프로필',
  '지역 + 여권사진',
  '지역 + 학생증',
  '지역 + 취업사진',
];

/** 1차 무료 진단 항목 */
const diagnosisItems = [
  '현재 플레이스 구조 분석',
  '경쟁 매장 키워드 점유율 분석',
  '리뷰 구조 및 전환 동선 분석',
  '네이버예약 연결 구조 확인',
];

/** 시즌 전략 체크리스트 */
const seasonChecklist = [
  '플레이스 대표 키워드 조정',
  '예약 메뉴 구조 변경',
  '시즌 썸네일 조정',
  '설명 영역 키워드 구조 조정',
];

/** 이런 사진관과 맞습니다 */
const fitCases = [
  '이미 어느 정도 운영은 되고 있지만, 정체기인 곳',
  '플레이스 상위권에 한 번은 올라가보고 싶은 곳',
  '예약은 있지만 더 안정적으로 만들고 싶은 곳',
  '단순 광고가 아니라 구조를 바꾸고 싶은 곳',
];

/** 이런 분과는 맞지 않습니다 */
const notFitCases = [
  '빠른 노출만 원하는 경우',
  '리뷰 숫자만 늘리고 싶은 경우',
  '단기 이벤트만 원하는 경우',
];

/* ───────────────────────── 컴포넌트 ───────────────────────── */

export function PhotoStudioPageContent() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      <main>
        {/* ━━━━ HERO ━━━━ */}
        <section className="relative overflow-hidden pt-28 md:pt-36 lg:pt-44 pb-16 md:pb-24 bg-gradient-to-br from-neutral-50 via-stone-50 to-amber-50/30">
          {/* 배경 장식 */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-20 left-10 w-72 h-72 bg-amber-200/20 rounded-full blur-3xl" />
            <div className="absolute top-40 right-20 w-96 h-96 bg-stone-200/20 rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-orange-200/15 rounded-full blur-3xl" />
          </div>

          <div className="relative w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
            {/* 배지 */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200/60 rounded-full shadow-sm">
                <Camera className="w-4 h-4 text-amber-700" />
                <span className="text-xs md:text-sm font-bold text-amber-800">
                  사진관 전용 · 지역 1곳 한정
                </span>
              </div>
            </div>

            {/* 메인 헤드라인 */}
            <h1 className="text-center text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-8">
              <span className="text-gray-900">
                네이버플레이스
              </span>
              <br />
              <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 bg-clip-text text-transparent">
                상위권 전략 프로그램
              </span>
            </h1>

            {/* 대표의 한 마디 — 진정성 */}
            <div className="max-w-2xl mx-auto">
              <div className="relative bg-white/80 backdrop-blur-sm border border-stone-200 rounded-2xl p-6 md:p-8 shadow-sm">
                <Quote className="absolute top-4 left-4 w-6 h-6 text-amber-300/60" />
                <div className="space-y-4 text-base md:text-lg text-gray-700 leading-relaxed pl-4">
                  <p>
                    사진관은 다른 업종과 다릅니다.
                  </p>
                  <p className="text-gray-500 text-sm md:text-base">
                    맛집처럼 회전이 빠르지도 않고,
                    <br className="hidden sm:block" />
                    카페처럼 충동 방문이 일어나지도 않습니다.
                  </p>
                  <p>
                    대신, 고객은{' '}
                    <strong className="text-gray-900 font-semibold">
                      "검색 → 비교 → 고민 → 예약"
                    </strong>
                    의 과정을 거칩니다.
                  </p>
                  <p>
                    그리고 그 과정은{' '}
                    <span className="underline decoration-amber-400 decoration-2 underline-offset-4">
                      거의 100% 네이버플레이스 안에서 이루어집니다.
                    </span>
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                    W
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Whiplace</p>
                    <p className="text-xs text-gray-500">대표</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━ 왜 사진관은 따로 관리해야 하는가 ━━━━ */}
        <section className="py-16 md:py-24 bg-white">
          <div className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="mb-12 md:mb-16">
              <span className="inline-block px-3 py-1 text-xs font-bold rounded-full text-amber-700 bg-amber-100 mb-4">
                왜 따로인가
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                사진관 키워드는
                <br />
                단순 노출 싸움이 아닙니다.
              </h2>
            </div>

            {/* 키워드 구조 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {keywordExamples.map((kw) => (
                <div
                  key={kw}
                  className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-xl px-5 py-4"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Search className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm md:text-base font-medium text-gray-800">
                    {kw}
                  </span>
                </div>
              ))}
            </div>

            {/* 핵심 메시지 */}
            <div className="space-y-6 text-base md:text-lg text-gray-700 leading-relaxed">
              <p>
                이 구조 안에서{' '}
                <strong className="text-gray-900">검색 의도(Intent)</strong>를
                읽지 못하면
                <br className="hidden sm:block" />
                상위권에 잠깐 오르더라도 유지되지 않습니다.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 md:p-6">
                <p className="text-amber-900 font-medium">
                  특히 네이버예약 구조를 이해하지 못하면
                  <br />
                  <span className="text-amber-700">
                    "노출은 되는데 예약이 늘지 않는"
                  </span>{' '}
                  상태가 반복됩니다.
                </p>
              </div>
              <p className="text-gray-800 font-semibold text-lg md:text-xl">
                저는 이 지점을 먼저 봅니다.
              </p>
            </div>
          </div>
        </section>

        {/* ━━━━ 현재 운영 방식 (지역 한정) ━━━━ */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-stone-50 to-white">
          <div className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="mb-12">
              <span className="inline-block px-3 py-1 text-xs font-bold rounded-full text-stone-700 bg-stone-200 mb-4">
                운영 원칙
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                지역별로 1개 사진관만 진행합니다.
              </h2>
              <p className="text-base md:text-lg text-gray-600">
                이유는 단순합니다.
              </p>
            </div>

            <div className="bg-white border-2 border-stone-200 rounded-2xl p-6 md:p-8 shadow-sm mb-8">
              <p className="text-lg md:text-xl text-gray-900 font-semibold text-center leading-relaxed">
                같은 상권 내 2곳을 동시에 올릴 수는 없기 때문입니다.
                <br />
                <span className="bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
                  한 상권에서 우리는 한 곳과만 갑니다.
                </span>
              </p>
            </div>

            {/* 현재 진행 지역 */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-6">
              <p className="text-sm font-semibold text-gray-500 mb-4">
                현재 진행 중인 지역
              </p>
              <div className="flex flex-wrap gap-2 mb-5">
                {activeRegions.map((region) => (
                  <span
                    key={region}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 border border-red-200 rounded-full text-sm font-semibold text-red-700"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {region}
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                위 지역은 이미 진행 중이라{' '}
                <strong className="text-gray-800">
                  현재는 타 지역 사진관만 협업 가능
                </strong>
                합니다.
              </p>
            </div>
          </div>
        </section>

        {/* ━━━━ 우리가 하는 일 ━━━━ */}
        <section className="py-16 md:py-24 bg-white">
          <div className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="mb-12 md:mb-16">
              <span className="inline-block px-3 py-1 text-xs font-bold rounded-full text-amber-700 bg-amber-100 mb-4">
                프로세스
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                우리가 하는 일
              </h2>
              <p className="text-base md:text-lg text-gray-600">
                저희는{' '}
                <span className="line-through text-gray-400 decoration-red-400 decoration-2">
                  "대행"
                </span>
                이라는 단어를 쓰지 않습니다.
                <br />
                대신 다음 단계를 거칩니다.
              </p>
            </div>

            <div className="space-y-8 md:space-y-10">
              {/* Step 1: 1차 무료 진단 */}
              <div className="group">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg md:text-xl">1</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                      1차 무료 진단
                    </h3>
                    <p className="text-sm text-amber-700 font-semibold mb-5">
                      진단 없이 계약하지 않습니다.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {diagnosisItems.map((item) => (
                        <div
                          key={item}
                          className="flex items-start gap-3 bg-stone-50 border border-stone-200 rounded-xl p-4"
                        >
                          <div className="flex-shrink-0 mt-0.5 w-5 h-5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                            <Search className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm text-gray-700 font-medium">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 구분선 */}
              <div className="pl-6 md:pl-7">
                <div className="w-px h-8 bg-gradient-to-b from-amber-300 to-orange-300 ml-[18px] md:ml-[21px]" />
              </div>

              {/* Step 2: 전략 수립 */}
              <div className="group">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg md:text-xl">2</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                      전략 수립
                    </h3>
                    <p className="text-sm text-gray-500 mb-5">
                      단순 상위 노출이 아닌 구조 설계
                    </p>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 md:p-8">
                      <div className="flex items-center gap-3 mb-4">
                        <Target className="w-5 h-5 text-amber-600" />
                        <p className="text-base md:text-lg text-gray-900 font-semibold">
                          "Top 5 안에 고정시키는 구조"를 설계합니다.
                        </p>
                      </div>
                      <div className="space-y-3 text-sm md:text-base text-gray-700 leading-relaxed">
                        <p>
                          사진관 키워드는 한 번 올라가서 유지되면
                          <br className="hidden sm:block" />
                          안정적인 예약 매출을 만들 수 있습니다.
                        </p>
                        <p className="font-medium text-amber-800">
                          특히 지역 키워드 월 검색량이 500 이상이라면
                          <br className="hidden sm:block" />
                          매출과 직결됩니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 구분선 */}
              <div className="pl-6 md:pl-7">
                <div className="w-px h-8 bg-gradient-to-b from-amber-300 to-orange-300 ml-[18px] md:ml-[21px]" />
              </div>

              {/* Step 3: 시즌 전략 가이드 */}
              <div className="group">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg md:text-xl">3</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                      시즌 전략 가이드
                    </h3>
                    <p className="text-sm text-gray-500 mb-5">
                      업종을 이해하지 못하면 이걸 놓칩니다.
                    </p>

                    <div className="bg-white border-2 border-stone-200 rounded-xl p-5 md:p-6 mb-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-amber-600" />
                        <p className="text-sm font-bold text-amber-800">
                          곧 학생증 시즌입니다. 이 시기에 해야 할 것:
                        </p>
                      </div>
                      <div className="space-y-2.5">
                        {seasonChecklist.map((item, idx) => (
                          <div
                            key={item}
                            className="flex items-center gap-3"
                          >
                            <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-orange-500 rounded-md flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-bold">
                                {idx + 1}
                              </span>
                            </div>
                            <span className="text-sm md:text-base text-gray-700">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━ 선입금을 요구하지 않는 이유 ━━━━ */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-stone-50 to-white">
          <div className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center mb-10 md:mb-12">
              <span className="inline-block px-3 py-1 text-xs font-bold rounded-full text-stone-700 bg-stone-200 mb-4">
                신뢰
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                그냥 순위올려주겠다 라는 것이 아닙니다
              </h2>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-sm max-w-2xl mx-auto">
              <div className="space-y-5 text-center">
                <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                  저희는 먼저{' '}
                  <strong className="text-gray-900">방향성을 제시</strong>
                  합니다.
                </p>
                <p className="text-gray-600">그리고</p>
                <div className="space-y-3">
                  {[
                    '이해가 되었는지',
                    '현실적인 실행이 가능한지',
                    '실제 도움이 되는지',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="text-base md:text-lg text-gray-800 font-medium">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-base md:text-lg text-gray-700 pt-2">
                  확인한 후 진행합니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━ 맞는 곳 / 맞지 않는 곳 ━━━━ */}
        <section className="py-16 md:py-24 bg-white">
          <div className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* 맞는 곳 */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900">
                    이런 사진관과 맞습니다
                  </h3>
                </div>
                <div className="space-y-3">
                  {fitCases.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <CheckCircle2
                          className="w-3.5 h-3.5 text-white"
                          strokeWidth={2.5}
                        />
                      </div>
                      <span className="text-sm md:text-base text-gray-700 leading-relaxed">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 맞지 않는 곳 */}
              <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900">
                    이런 분과는 맞지 않습니다
                  </h3>
                </div>
                <div className="space-y-3">
                  {notFitCases.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1 w-5 h-5 bg-red-400 rounded-full flex items-center justify-center">
                        <XCircle
                          className="w-3.5 h-3.5 text-white"
                          strokeWidth={2.5}
                        />
                      </div>
                      <span className="text-sm md:text-base text-gray-700 leading-relaxed">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-red-200">
                  <p className="text-sm text-gray-600 font-medium">
                    우리는 구조를 만듭니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━ 대표의 메시지 ━━━━ */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-neutral-50 to-white">
          <div className="w-full max-w-3xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="text-center mb-8">
              <span className="inline-block px-3 py-1 text-xs font-bold rounded-full text-amber-700 bg-amber-100 mb-4">
                대표가 직접 이야기 드립니다
              </span>
            </div>

            <div className="relative bg-white border border-stone-200 rounded-2xl p-8 md:p-10 shadow-sm">
              <Quote className="absolute top-6 left-6 w-8 h-8 text-amber-200/50" />
              
              <div className="relative space-y-5 text-base md:text-lg text-gray-700 leading-relaxed">
                <p>
                  저는 수많은 업종을 다루지만
                  <br />
                  사진관은 접근 방식이{' '}
                  <strong className="text-gray-900">완전히 다르다</strong>고
                  생각합니다.
                </p>

                <div className="py-4">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                    <div className="text-center">
                      <p className="text-2xl md:text-3xl font-bold text-amber-600 mb-1">
                        노출
                      </p>
                      <p className="text-sm text-gray-500">은 기술이고</p>
                    </div>
                    <div className="hidden sm:block text-2xl text-gray-300">
                      →
                    </div>
                    <div className="sm:hidden text-2xl text-gray-300">↓</div>
                    <div className="text-center">
                      <p className="text-2xl md:text-3xl font-bold text-orange-600 mb-1">
                        유지
                      </p>
                      <p className="text-sm text-gray-500">는 구조입니다</p>
                    </div>
                  </div>
                </div>

                <p>
                  사진관 키워드는
                  <br />
                  카페나 맛집처럼 매일 순위가 크게 흔들리지 않습니다.
                </p>

                <p className="text-xl md:text-2xl font-bold text-gray-900 text-center pt-2">
                  제대로 잡으면, 오래 갑니다.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-stone-100 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold">
                  W
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900">Whiplace</p>
                  <p className="text-sm text-gray-500">
                    대표
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━ 문의 CTA ━━━━ */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-amber-50 via-orange-50 to-stone-50">
          <div className="w-full max-w-4xl mx-auto px-4 md:px-6 lg:px-8 text-center">
            {/* 아이콘 */}
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl mb-6 md:mb-8">
              <Camera
                className="w-8 h-8 md:w-10 md:h-10 text-white"
                strokeWidth={2}
              />
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight mb-4 md:mb-6">
              <span className="text-gray-800">1차 진단은</span>{' '}
              <span className="bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
                무료
              </span>
              <span className="text-gray-800">로 진행합니다.</span>
            </h2>

            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-4">
              지역과 상호명을 보내주시면
              <br className="hidden sm:block" />
              현재 구조와 가능성을 정리해서 전달드립니다.
            </p>

            <p className="text-sm text-gray-500 mb-8 md:mb-10">
              화상 미팅 · 전화 미팅 모두 가능합니다.
            </p>

            {/* 연락처 카드 */}
            <div className="flex items-center justify-center mb-10">
              <a
                href="mailto:business@whiplace.com"
                className="inline-flex items-center justify-center gap-2 px-7 md:px-8 h-13 md:h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-base md:text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
              >
                <Mail className="w-5 h-5" />
                business@whiplace.com
              </a>
            </div>

            {/* 마지막 메시지 */}
            <div className="max-w-xl mx-auto bg-white/70 backdrop-blur-sm border border-stone-200 rounded-2xl p-6 md:p-8">
              <div className="space-y-3 text-base md:text-lg text-gray-700 leading-relaxed">
                <p>사진관 마케팅은</p>
                <p className="text-xl md:text-2xl font-bold text-gray-900">
                  "보여주는 사업"입니다.
                </p>
                <p>
                  플레이스는 그{' '}
                  <span className="underline decoration-amber-400 decoration-2 underline-offset-4">
                    출입문
                  </span>
                  입니다.
                </p>
                <p className="text-gray-600 text-sm md:text-base pt-2">
                  그 문을 어떻게 설계하느냐에 따라
                  <br />
                  예약 흐름이 달라집니다.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-100 text-center">
                <p className="text-sm font-semibold text-amber-700">
                  — Whiplace · 사진관 전용 전략 프로그램
                </p>
              </div>
            </div>

            {/* 안심 마크 */}
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-500" />
                <span>선입금 없음</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>평일 10시~18시</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-amber-500" />
                <span>1차 진단 무료</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
