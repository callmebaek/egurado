'use client';

import { ArrowRight, Check, Sparkles, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export const HeroSection = () => {
  const [email, setEmail] = useState('');

  return (
    <section className="relative bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 pt-28 md:pt-32 lg:pt-40 pb-12 md:pb-16 lg:pb-20 overflow-hidden">
      {/* 배경 장식 요소 - 파스텔 톤 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1000ms' }} />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-cyan-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '500ms' }} />
        
        {/* 떠다니는 아이콘 - 데스크톱에서만 */}
        <div className="hidden lg:block absolute top-1/4 left-1/4 animate-float">
          <TrendingUp className="w-8 h-8 text-emerald-400/40" strokeWidth={2} />
        </div>
        <div className="hidden lg:block absolute top-1/3 right-1/4 animate-float" style={{ animationDelay: '300ms' }}>
          <Sparkles className="w-10 h-10 text-teal-400/50" strokeWidth={2} />
        </div>
        <div className="hidden lg:block absolute bottom-1/4 right-1/3 animate-float" style={{ animationDelay: '700ms' }}>
          <Zap className="w-9 h-9 text-cyan-400/50" strokeWidth={2} />
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* 왼쪽: 메인 콘텐츠 */}
          <div className="space-y-6 lg:space-y-8">
            {/* 상단 배지 - 파스텔 (작게) */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 bg-gradient-to-r from-emerald-100 to-teal-100 border border-emerald-200/50 rounded-full shadow-sm">
              <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5 text-teal-600 flex-shrink-0" />
              <span className="text-xs md:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent whitespace-nowrap">
                AI 기반 자동화 솔루션
              </span>
            </div>

            {/* 메인 헤드라인 - 파스텔 그라데이션 */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-snug md:leading-tight">
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
            </h1>

            {/* 서브 헤드라인 */}
            <p className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed max-w-xl">
              AI가 자동으로 리뷰 답글을 작성하고, 순위를 추적하며, 데이터 분석까지. 
              이제 매장 운영에만 집중하세요.
            </p>

            {/* CTA 버튼 그룹 */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-6 md:px-8 h-12 md:h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-base font-bold rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                무료로 시작하기
                <ArrowRight size={20} />
              </Link>
              <Link
                href="#service-intro"
                className="inline-flex items-center justify-center px-6 md:px-8 h-12 md:h-14 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 text-base font-semibold rounded-lg transition-all"
              >
                더 알아보기
              </Link>
            </div>

            {/* 안심 메시지 */}
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
          </div>

          {/* 오른쪽: 로그인 카드 */}
          <div className="mt-8 lg:mt-0">
            <div className="relative max-w-lg mx-auto">
              {/* 배경 장식 */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-200/40 to-teal-200/40 rounded-3xl blur-2xl opacity-60 animate-pulse"></div>
              
              {/* 로그인 카드 */}
              <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-2xl border-2 border-emerald-200/50 shadow-2xl p-6 md:p-8">
                <div className="space-y-4">
                  {/* 헤더 */}
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold mb-2">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                        대행사도 사용하는
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-millenial bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                          /윕플.
                        </span>
                        <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                          시작하기
                        </span>
                        <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-emerald-500 animate-pulse flex-shrink-0" />
                      </div>
                    </h3>
                    <p className="text-sm text-gray-500">
                      무료로 시작하고 언제든지 업그레이드하세요
                    </p>
                  </div>

                  {/* 폼 */}
                  <form 
                    onSubmit={(e) => { 
                      e.preventDefault(); 
                      window.location.href = '/login'; 
                    }}
                    className="space-y-3"
                  >
                    <input
                      type="text"
                      placeholder="이메일 또는 전화번호"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-12 md:h-14 px-4 border-2 border-cyan-100 rounded-lg text-base focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 transition-all"
                    />

                    <button
                      type="submit"
                      className="w-full h-12 md:h-14 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 text-white text-base font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                    >
                      로그인
                    </button>
                  </form>

                  {/* 회원가입 링크 */}
                  <p className="text-center text-sm text-gray-500">
                    처음이신가요?{' '}
                    <Link href="/signup" className="text-teal-600 font-semibold hover:underline">
                      회원가입
                    </Link>
                  </p>
                </div>
              </div>

              {/* Free badge */}
              <div className="flex justify-center mt-4">
                <div className="inline-flex items-center justify-center px-4 h-10 bg-white border-2 border-emerald-300 rounded-full shadow-md">
                  <span className="text-sm font-bold text-gray-700 leading-none">
                    간단한 매장 <span className="text-emerald-500">100% 무료</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS 애니메이션 */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};
