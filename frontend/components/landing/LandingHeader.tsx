'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

export const LandingHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  /** 홈페이지('/')인 경우 스크롤, 다른 페이지에서는 홈으로 이동 후 앵커 */
  const handleSectionLink = (sectionId: string) => {
    if (pathname === '/') {
      scrollToSection(sectionId);
    } else {
      window.location.href = `/#${sectionId}`;
    }
  };

  return (
    <>
      {/* 메인 헤더 */}
      <header
        className={`fixed top-10 left-0 right-0 z-50 transition-all duration-200 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm'
            : 'bg-white'
        }`}
      >
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* 로고 */}
            <Link href="/" className="flex items-center">
              <img
                src="/whiplace-logo.svg"
                alt="/윕플."
                className="h-7 md:h-9 w-auto"
              />
            </Link>

            {/* 데스크톱 네비게이션 */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/service"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-all"
              >
                서비스 소개
              </Link>
              <button
                onClick={() => handleSectionLink('pricing')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-all"
              >
                가격
              </button>
              <button
                onClick={() => handleSectionLink('about')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-all"
              >
                About Us
              </button>
            </nav>

            {/* 데스크톱 CTA 버튼 */}
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/signup"
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-all"
              >
                회원가입
              </Link>
              <Link
                href="/dashboard"
                className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 rounded-full shadow-md hover:shadow-lg transition-all"
              >
                시작하기
              </Link>
            </div>

            {/* 모바일 메뉴 버튼 */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-all touch-target-minimum"
              aria-label="메뉴"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 메뉴 */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* 오버레이 */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* 메뉴 패널 - TopBanner(40px) + Header(56px) = 96px */}
          <div className="absolute top-24 left-4 right-4 bg-white shadow-xl rounded-2xl border border-gray-200 animate-slide-in">
            <nav className="p-4 space-y-1">
              <Link
                href="/service"
                className="block w-full text-left px-4 py-3 text-base font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-all touch-target-minimum"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                서비스 소개
              </Link>
              <button
                onClick={() => { handleSectionLink('pricing'); setIsMobileMenuOpen(false); }}
                className="block w-full text-left px-4 py-3 text-base font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-all touch-target-minimum"
              >
                가격
              </button>
              <button
                onClick={() => { handleSectionLink('about'); setIsMobileMenuOpen(false); }}
                className="block w-full text-left px-4 py-3 text-base font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-all touch-target-minimum"
              >
                About Us
              </button>

              <div className="h-px bg-gray-200 my-2" />

              {/* 모바일 CTA 버튼 */}
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/signup"
                  className="block w-full text-center px-5 py-3 text-base font-medium text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-all touch-target-minimum"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  회원가입
                </Link>
                <Link
                  href="/dashboard"
                  className="block w-full text-center px-5 py-3 text-base font-bold text-white bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 rounded-full shadow-md transition-all touch-target-minimum"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  시작하기
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
};
