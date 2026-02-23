import type { Metadata } from 'next';
import { PhotoStudioPageContent } from '@/components/landing/PhotoStudioPageContent';

export const metadata: Metadata = {
  title: '사진관 전용 네이버플레이스 전략 프로그램 - 윕플 | 지역 1곳 한정 운영',
  description:
    '사진관은 다른 업종과 다릅니다. 검색 의도를 읽고, 네이버예약 구조를 이해하고, Top 5 안에 고정시키는 전략을 설계합니다. 지역별 1개 사진관만 진행하는 전략 프로그램.',
  keywords: [
    '사진관 마케팅',
    '사진관 네이버플레이스',
    '사진관 상위노출',
    '증명사진 마케팅',
    '프로필사진 마케팅',
    '사진관 플레이스 관리',
    '네이버플레이스 상위노출',
    '사진관 키워드',
    '윕플',
    'whiplace',
  ],
  openGraph: {
    title: '사진관 전용 네이버플레이스 전략 프로그램 - 윕플',
    description:
      '지역별 1곳만 진행합니다. 단순 대행이 아닌, 구조를 만드는 사진관 전용 전략 프로그램.',
    url: 'https://whiplace.com/photo-studio',
    type: 'website',
    locale: 'ko_KR',
    siteName: '윕플',
    images: [
      {
        url: 'https://whiplace.com/og-image.png',
        width: 1200,
        height: 630,
        alt: '윕플 - 사진관 전용 네이버플레이스 전략 프로그램',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '사진관 전용 네이버플레이스 전략 프로그램 - 윕플',
    description:
      '지역별 1곳만 진행합니다. 사진관은 다른 업종과 다릅니다.',
    images: ['https://whiplace.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://whiplace.com/photo-studio',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: '사진관 전용 네이버플레이스 전략 프로그램',
  provider: {
    '@type': 'Organization',
    name: '주식회사 노느니 (윕플)',
    url: 'https://whiplace.com',
  },
  description:
    '지역별 1개 사진관만 진행하는 네이버플레이스 상위권 전략 프로그램. 진단, 전략 수립, 시즌 가이드 제공.',
  url: 'https://whiplace.com/photo-studio',
  areaServed: {
    '@type': 'Country',
    name: 'KR',
  },
};

export default function PhotoStudioPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PhotoStudioPageContent />
    </>
  );
}
