import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toaster";
import { ViewportHeight } from "@/components/ViewportHeight";
import { MantineProvider, ColorSchemeScript } from '@mantine/core';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// SEO 최적화된 메타데이터
export const metadata: Metadata = {
  title: {
    default: "윕플 - 플레이스 리뷰와 플레이스 순위를 가장 쉽게 관리하는 자영업자 전용 에이전트",
    template: "%s | 윕플"
  },
  description: "네이버 플레이스 순위 추적, AI 자동 리뷰 답글, 키워드 분석을 한 곳에서. 자영업자를 위한 올인원 매장 관리 솔루션으로 더 많은 고객을 유치하고 리뷰 관리 시간을 90% 절약하세요.",
  keywords: [
    "네이버 플레이스",
    "플레이스 순위",
    "플레이스 리뷰",
    "구글 비즈니스",
    "매장 관리",
    "리뷰 관리",
    "AI 리뷰 답글",
    "AI 답글",
    "키워드 순위",
    "키워드 순위 추적",
    "키워드 분석",
    "로컬 비즈니스",
    "자영업자",
    "매장 마케팅",
    "윕플",
    "whiplace"
  ],
  authors: [{ name: "Whiplace Team" }],
  creator: "Whiplace",
  publisher: "Whiplace",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://whiplace.com",
    siteName: "윕플",
    title: "윕플 - 플레이스 리뷰와 플레이스 순위를 가장 쉽게 관리하는 자영업자 전용 에이전트",
    description: "네이버 플레이스 순위 추적, AI 자동 리뷰 답글, 키워드 분석을 한 곳에서. 자영업자를 위한 올인원 매장 관리 솔루션으로 더 많은 고객을 유치하고 리뷰 관리 시간을 90% 절약하세요.",
    images: [
      {
        url: "https://whiplace.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "윕플 - 자영업자 전용 플레이스 관리 에이전트",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "윕플 - 플레이스 리뷰와 플레이스 순위를 가장 쉽게 관리하는 자영업자 전용 에이전트",
    description: "네이버 플레이스 순위 추적, AI 자동 리뷰 답글, 키워드 분석을 한 곳에서. 자영업자를 위한 올인원 매장 관리 솔루션으로 더 많은 고객을 유치하고 리뷰 관리 시간을 90% 절약하세요.",
    images: ["https://whiplace.com/og-image.png"],
  },
  alternates: {
    canonical: "https://whiplace.com",
  },
  verification: {
    google: "your-google-verification-code",
    other: {
      "naver-site-verification": "your-naver-verification-code",
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/favicon.svg',
      },
    ],
  },
};

// 뷰포트 설정 (모바일 최적화)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#14B8A6", // 디자인 시스템 primary color (teal-500)
  viewportFit: "cover", // 노치/펀치홀 대응
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="overflow-x-hidden" style={{ maxWidth: '100vw', width: '100%' }} suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
        {/* 추가 SEO 태그 */}
        <meta name="format-detection" content="telephone=no" />
        
        {/* 모바일 최적화 메타 태그 */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* Pretendard 폰트 (CDN) */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
        
        {/* 210 Millenial 폰트 (CDN) - 눈누 */}
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/fonts-archive/210Millenial/210Millenial.css"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansKR.variable} antialiased overflow-x-hidden`}
        style={{ maxWidth: '100vw', width: '100%' }}
        suppressHydrationWarning
      >
        <MantineProvider>
          <AuthProvider>
            <ViewportHeight />
            {children}
            <Toaster />
          </AuthProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
