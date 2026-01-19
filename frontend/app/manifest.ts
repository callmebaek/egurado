import { MetadataRoute } from 'next'

/**
 * PWA Manifest
 * 모바일 및 태블릿 최적화
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '위플레이스 - 네이버 플레이스 & 구글 비즈니스 통합 관리',
    short_name: '위플레이스',
    description: '네이버 플레이스와 구글 비즈니스 프로필을 한 곳에서 관리하세요.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#6d7f48',
    orientation: 'portrait-primary',
    categories: ['business', 'productivity'],
    lang: 'ko',
    dir: 'ltr',
  }
}
