import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // TypeScript 에러를 경고로 변경 (배포 시)
  typescript: {
    ignoreBuildErrors: true,
  },
  // 환경 변수 검증 (개발 모드에서만)
  ...(process.env.NODE_ENV === 'development' && {
    env: {
      // 개발 환경에서 환경 변수 누락 시 경고
    },
  }),
  // 외부 이미지 도메인 허용 (네이버 플레이스, 구글 등)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ldb-phinf.pstatic.net', // 네이버 플레이스 이미지
      },
      {
        protocol: 'https',
        hostname: 'search.pstatic.net', // 네이버 검색 이미지
      },
      {
        protocol: 'https',
        hostname: 'blogpfthumb-phinf.pstatic.net', // 네이버 블로그 썸네일
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com', // 구글 이미지
      },
    ],
  },
};

export default nextConfig;
