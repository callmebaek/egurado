'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/use-toast';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  /** 고객센터 / 자주 묻는 질문 클릭 핸들러 */
  const handleSupportClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      router.push('/dashboard/support');
    } else {
      toast({
        title: '로그인이 필요합니다',
        description:
          '고객센터는 정확한 고객의 소리를 듣기 위해 로그인이 필요합니다. 로그인 페이지로 이동합니다.',
      });
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    }
  };

  return (
    <footer className="bg-neutral-900 text-white py-12 md:py-16 lg:py-20">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-8 lg:gap-12 mb-8">
          {/* 회사 정보 */}
          <div className="md:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center mb-4">
              <img
                src="/whiplace-logo.svg"
                alt="/윕플."
                className="h-8 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-sm text-neutral-400 mb-5 leading-relaxed">
              소상공인, 자영업자들을 위한
              <br />
              온라인 매장관리 솔루션
            </p>
            <div className="space-y-1 text-xs text-neutral-500 leading-relaxed">
              <p>상호명: 주식회사 노느니</p>
              <p>서비스명: 윕플 (whiplace.com)</p>
              <p>대표자: 백성민</p>
              <p>사업자등록번호: 612-86-03314</p>
              <p>주소: 서울특별시 중랑구 면목천로6길 22, 1층</p>
              <p>
                이메일: business@whiplace.com
                <br className="md:hidden" />
                <span className="hidden md:inline"> | </span>
                전화: 010-8431-6128
              </p>
              <div className="pt-2.5 mt-2.5 border-t border-neutral-800">
                <p className="text-neutral-600 text-[11px]">
                  본 서비스는 월 구독형 디지털 서비스로 매월 자동결제됩니다.
                </p>
                <p className="text-neutral-600 text-[11px]">
                  네이버(Naver)와 공식적으로 제휴된 서비스가 아닙니다.
                </p>
              </div>
            </div>
          </div>

          {/* 서비스 */}
          <div>
            <h4 className="font-bold text-lg mb-4">서비스</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <button
                  onClick={() =>
                    document
                      .getElementById('service-intro')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="hover:text-white transition-colors"
                >
                  서비스 소개
                </button>
              </li>
              <li>
                <button
                  onClick={() =>
                    document
                      .getElementById('pricing')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="hover:text-white transition-colors"
                >
                  가격 안내
                </button>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-white transition-colors"
                >
                  대시보드
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="hover:text-white transition-colors"
                >
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
                <button
                  onClick={handleSupportClick}
                  className="hover:text-white transition-colors text-left"
                >
                  자주 묻는 질문
                </button>
              </li>
              <li>
                <button
                  onClick={handleSupportClick}
                  className="hover:text-white transition-colors text-left"
                >
                  고객센터
                </button>
              </li>
            </ul>
          </div>

          {/* 법적 고지 */}
          <div>
            <h4 className="font-bold text-lg mb-4">법적 고지</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <Link
                  href="/terms"
                  className="hover:text-white transition-colors"
                >
                  이용약관
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-white transition-colors"
                >
                  개인정보처리방침
                </Link>
              </li>
              <li>
                <Link
                  href="/refundpolicy"
                  className="hover:text-white transition-colors"
                >
                  환불정책
                </Link>
              </li>
              <li>
                <Link
                  href="/legal"
                  className="hover:text-white transition-colors"
                >
                  법적고지
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 하단 구분선 */}
        <div className="border-t border-neutral-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-neutral-500 text-center md:text-left">
              © {currentYear}{' '}
              <span className="font-millenial">/윕플.</span> All rights
              reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
