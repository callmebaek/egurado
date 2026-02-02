'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral-900 text-white py-16 md:py-20">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-8">
          {/* 회사 정보 */}
          <div>
            <Link href="/" className="flex items-center mb-4">
              <img
                src="/whiplace-logo.svg"
                alt="/윕플."
                className="h-8 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-sm text-neutral-400 mb-4 leading-relaxed">
              네이버 플레이스 관리를 위한
              <br />
              AI 기반 데이터 솔루션
            </p>
            <div className="space-y-2 text-sm text-neutral-400">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <a href="mailto:support@whiplace.com" className="hover:text-white transition-colors">
                  support@whiplace.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <a href="tel:02-1234-5678" className="hover:text-white transition-colors">
                  02-1234-5678
                </a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>서울특별시 강남구 테헤란로</span>
              </div>
            </div>
          </div>

          {/* 서비스 */}
          <div>
            <h4 className="font-bold text-lg mb-4">서비스</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <button
                  onClick={() => document.getElementById('service-intro')?.scrollIntoView({ behavior: 'smooth' })}
                  className="hover:text-white transition-colors"
                >
                  서비스 소개
                </button>
              </li>
              <li>
                <button
                  onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                  className="hover:text-white transition-colors"
                >
                  가격 안내
                </button>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  대시보드
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition-colors">
                  무료 시작하기
                </Link>
              </li>
            </ul>
          </div>

          {/* 지원 */}
          <div>
            <h4 className="font-bold text-lg mb-4">지원</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  자주 묻는 질문
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  사용 가이드
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  고객 지원
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  API 문서
                </a>
              </li>
            </ul>
          </div>

          {/* 법적 고지 */}
          <div>
            <h4 className="font-bold text-lg mb-4">법적 고지</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  이용약관
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  개인정보처리방침
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  환불 정책
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  사업자 정보
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 하단 구분선 */}
        <div className="border-t border-neutral-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-neutral-500 text-center md:text-left">
              © {currentYear} /윕플. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-neutral-500">
              <a href="#" className="hover:text-white transition-colors">
                블로그
              </a>
              <a href="#" className="hover:text-white transition-colors">
                뉴스레터
              </a>
              <a href="#" className="hover:text-white transition-colors">
                제휴 문의
              </a>
            </div>
          </div>
        </div>

        {/* 사업자 정보 (선택적) */}
        <div className="mt-6 pt-6 border-t border-neutral-800 text-xs text-neutral-600 text-center">
          <p>
            상호명: /윕플. | 대표자: OOO | 사업자등록번호: 000-00-00000
            <br className="md:hidden" />
            <span className="hidden md:inline"> | </span>
            통신판매업신고번호: 제2024-서울강남-0000호
          </p>
        </div>
      </div>
    </footer>
  );
};
