import type { Metadata } from 'next';
import { ServicePageContent } from '@/components/landing/ServicePageContent';

export const metadata: Metadata = {
  title: '서비스 소개 - 플레이스 순위 추적, 리뷰 관리, 매장 분석 올인원 솔루션',
  description:
    '플레이스 순위 조회 및 자동 추적, AI 리뷰 답글, 경쟁매장 분석, 플레이스 진단까지. 자영업자와 소상공인을 위한 올인원 플레이스 관리 솔루션 윕플의 모든 기능을 확인하세요.',
  keywords: [
    '플레이스 순위',
    '플레이스 리뷰',
    '플레이스 광고',
    '플레이스 관리',
    '플레이스 순위 추적',
    '플레이스 순위 조회',
    '플레이스 리뷰 관리',
    '플레이스 리뷰 답글',
    'AI 리뷰 답글',
    '플레이스 진단',
    '경쟁매장 분석',
    '키워드 분석',
    '매장 관리',
    '자영업자 마케팅',
    '소상공인 솔루션',
    '윕플',
  ],
  openGraph: {
    title: '서비스 소개 - 윕플 | 플레이스 순위·리뷰·매장 관리 올인원',
    description:
      '플레이스 순위 조회 및 자동 추적, AI 리뷰 답글, 경쟁매장 분석, 플레이스 진단까지. 자영업자를 위한 올인원 매장 관리 솔루션.',
    url: 'https://whiplace.com/service',
    type: 'website',
    locale: 'ko_KR',
    siteName: '윕플',
    images: [
      {
        url: 'https://whiplace.com/og-image.png',
        width: 1200,
        height: 630,
        alt: '윕플 서비스 소개 - 플레이스 관리 올인원 솔루션',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '서비스 소개 - 윕플 | 플레이스 순위·리뷰·매장 관리 올인원',
    description:
      '플레이스 순위 조회 및 자동 추적, AI 리뷰 답글, 경쟁매장 분석, 플레이스 진단까지.',
    images: ['https://whiplace.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://whiplace.com/service',
  },
};

// JSON-LD 구조화 데이터
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: '윕플 (Whiplace)',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    '플레이스 순위 추적, AI 리뷰 답글, 경쟁매장 분석, 플레이스 진단 등 자영업자를 위한 올인원 매장 관리 솔루션',
  url: 'https://whiplace.com/service',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'KRW',
    description: '무료 플랜으로 시작 가능',
  },
  publisher: {
    '@type': 'Organization',
    name: '주식회사 노느니',
    url: 'https://whiplace.com',
  },
  featureList: [
    '플레이스 순위 조회',
    '키워드 순위 자동 추적',
    'AI 리뷰 답글 생성',
    '리뷰 분석',
    '플레이스 진단',
    '플레이스 활성화 분석',
    '경쟁매장 분석',
    '대표키워드 분석',
    '타겟키워드 추출',
    '키워드 검색량 조회',
    '알림 서비스',
  ],
};

export default function ServicePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ServicePageContent />
    </>
  );
}
