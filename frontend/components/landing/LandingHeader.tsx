'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Container, Button, Group } from '@mantine/core';

export const LandingHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  return (
    <>
      {/* 메인 헤더 - Cal.com 스타일 */}
      <header
        className={`fixed top-10 left-0 right-0 z-50 transition-all duration-200 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm'
            : 'bg-white'
        }`}
      >
        <Container size="xl" px="md">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* 로고 */}
            <Link href="/" className="flex items-center">
              <img
                src="/whiplace-logo.svg"
                alt="/윕플."
                className="h-8 md:h-10 w-auto"
              />
            </Link>

            {/* 데스크톱 네비게이션 */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => scrollToSection('service-intro')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-all"
              >
                서비스 소개
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-all"
              >
                가격
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-all"
              >
                About Us
              </button>
            </nav>

            {/* 데스크톱 CTA 버튼 */}
            <Group gap="xs" className="hidden md:flex">
              <Button
                component={Link}
                href="/signup"
                variant="subtle"
                size="md"
                radius="xl"
                className="text-gray-600 hover:text-teal-600 hover:bg-teal-50"
              >
                회원가입
              </Button>
              <Button
                component={Link}
                href="/dashboard"
                size="md"
                radius="xl"
                className="bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md hover:shadow-lg transition-all"
              >
                시작하기
              </Button>
            </Group>

            {/* 모바일 메뉴 버튼 */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-all"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </Container>
      </header>

      {/* 모바일 메뉴 */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* 오버레이 */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* 메뉴 패널 - Cal.com 스타일 */}
          <div className="absolute top-14 md:top-16 left-4 right-4 bg-white shadow-xl rounded-2xl border border-gray-200 animate-slide-in">
            <nav className="p-4 space-y-1">
              <button
                onClick={() => scrollToSection('service-intro')}
                className="block w-full text-left px-4 py-3 text-base font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-all"
              >
                서비스 소개
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="block w-full text-left px-4 py-3 text-base font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-all"
              >
                가격
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className="block w-full text-left px-4 py-3 text-base font-medium text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-all"
              >
                About Us
              </button>

              <div className="h-px bg-gray-200 my-2" />

              {/* 모바일 CTA 버튼 */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  component={Link}
                  href="/signup"
                  variant="subtle"
                  size="md"
                  radius="xl"
                  fullWidth
                  className="text-gray-600 hover:text-teal-600 hover:bg-teal-50"
                >
                  회원가입
                </Button>
                <Button
                  component={Link}
                  href="/dashboard"
                  size="md"
                  radius="xl"
                  fullWidth
                  className="bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md"
                >
                  시작하기
                </Button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
};
