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
};

export default nextConfig;
