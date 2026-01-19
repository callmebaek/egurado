import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

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
    default: "위플레이스 - 네이버 플레이스 & 구글 비즈니스 통합 관리",
    template: "%s | 위플레이스"
  },
  description: "네이버 플레이스와 구글 비즈니스 프로필을 한 곳에서 관리하세요. AI 리뷰 답글, 키워드 순위 추적, 자동화된 매장 관리 솔루션.",
  keywords: [
    "네이버 플레이스",
    "구글 비즈니스",
    "매장 관리",
    "리뷰 관리",
    "AI 답글",
    "키워드 순위",
    "로컬 비즈니스",
    "자영업자",
    "매장 마케팅"
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
    url: "https://egurado.com",
    siteName: "위플레이스",
    title: "위플레이스 - 네이버 플레이스 & 구글 비즈니스 통합 관리",
    description: "네이버 플레이스와 구글 비즈니스 프로필을 한 곳에서 관리하세요.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "위플레이스 - 매장 관리 솔루션",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "위플레이스 - 네이버 플레이스 & 구글 비즈니스 통합 관리",
    description: "네이버 플레이스와 구글 비즈니스 프로필을 한 곳에서 관리하세요.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://egurado.com",
  },
  verification: {
    google: "your-google-verification-code",
    other: {
      "naver-site-verification": "your-naver-verification-code",
    },
  },
};

// 뷰포트 설정
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#6d7f48",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* 추가 SEO 태그 */}
        <meta name="format-detection" content="telephone=no" />
        <link rel="icon" href="/whiplace-logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansKR.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
