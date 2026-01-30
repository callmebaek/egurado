/**
 * Mobile-First Responsive Design System
 * 대부분의 사용자가 모바일 웹으로 접속하므로 모바일 최적화가 최우선
 */

export const breakpoints = {
  // Tailwind 기본 breakpoints
  sm: '640px',   // 작은 모바일 (landscape)
  md: '768px',   // 태블릿
  lg: '1024px',  // 작은 데스크톱
  xl: '1280px',  // 큰 데스크톱
  '2xl': '1536px', // 초대형 화면
} as const

export const devices = {
  mobile: {
    minWidth: '320px',
    maxWidth: '639px',
    orientation: ['portrait', 'landscape'],
    touchTarget: '44px', // Apple HIG, Material Design 권장
  },
  tablet: {
    minWidth: '640px',
    maxWidth: '1023px',
    orientation: ['portrait', 'landscape'],
    touchTarget: '44px',
  },
  desktop: {
    minWidth: '1024px',
    touchTarget: '40px', // 마우스 사용 시 약간 작아도 됨
  },
} as const

// 반응형 폰트 크기 (모바일 → 데스크톱)
export const responsiveFontSize = {
  // 헤딩
  h1: {
    mobile: '20px',    // 모바일에서 작게
    tablet: '22px',
    desktop: '24px',   // 데스크톱에서 크게
  },
  h2: {
    mobile: '18px',
    tablet: '19px',
    desktop: '20px',
  },
  h3: {
    mobile: '16px',
    tablet: '17px',
    desktop: '18px',
  },
  h4: {
    mobile: '15px',
    tablet: '15px',
    desktop: '16px',
  },
  // 본문
  body: {
    mobile: '14px',    // 모바일 본문 크기
    tablet: '14px',
    desktop: '14px',
  },
  bodyLarge: {
    mobile: '15px',
    tablet: '16px',
    desktop: '16px',
  },
  small: {
    mobile: '12px',
    tablet: '12px',
    desktop: '12px',
  },
} as const

// 반응형 스페이싱
export const responsiveSpacing = {
  // 카드 padding
  cardPadding: {
    mobile: '16px',    // 모바일: 작게
    tablet: '20px',
    desktop: '24px',   // 데스크톱: 크게
  },
  // 섹션 gap
  sectionGap: {
    mobile: '16px',
    tablet: '20px',
    desktop: '24px',
  },
  // 컴포넌트 gap
  componentGap: {
    mobile: '12px',
    tablet: '16px',
    desktop: '16px',
  },
  // 페이지 padding
  pagePadding: {
    mobile: '16px',
    tablet: '24px',
    desktop: '32px',
  },
} as const

// 반응형 컴포넌트 크기
export const responsiveComponents = {
  // 버튼 높이
  button: {
    small: {
      mobile: '40px',   // 터치 타겟 고려
      desktop: '36px',
    },
    medium: {
      mobile: '48px',   // 터치 타겟 최소 44px
      desktop: '44px',
    },
    large: {
      mobile: '52px',
      desktop: '52px',
    },
  },
  
  // Input 높이
  input: {
    mobile: '48px',     // 터치 타겟 최소 44px
    desktop: '44px',
  },
  
  // 모달 크기
  modal: {
    mobile: {
      width: 'calc(100vw - 32px)', // 양옆 16px 여백
      maxWidth: '100%',
      margin: '16px',
    },
    tablet: {
      width: '600px',
      maxWidth: 'calc(100vw - 64px)',
      margin: '32px',
    },
    desktop: {
      width: '600px',
      maxWidth: '800px',
      margin: 'auto',
    },
  },
  
  // 네비게이션 바
  navbar: {
    mobile: '56px',     // 모바일: 콤팩트
    desktop: '64px',    // 데스크톱: 여유있게
  },
} as const

// 터치 인터랙션 최적화
export const touchOptimization = {
  // 최소 터치 타겟 크기
  minTouchTarget: '44px',
  
  // 터치 가능한 요소 간 최소 간격
  minTouchGap: '8px',
  
  // 터치 피드백
  touchFeedback: {
    tapHighlight: 'transparent', // -webkit-tap-highlight-color
    userSelect: 'none',
    touchAction: 'manipulation', // 더블탭 줌 방지
  },
  
  // 스와이프 가능한 영역
  swipeArea: {
    minWidth: '100px',
    minHeight: '44px',
  },
} as const

// 반응형 Grid 시스템
export const responsiveGrid = {
  columns: {
    mobile: 4,      // 모바일: 4열
    tablet: 8,      // 태블릿: 8열
    desktop: 12,    // 데스크톱: 12열
  },
  gutter: {
    mobile: '16px',
    tablet: '24px',
    desktop: '24px',
  },
} as const

// Tailwind 클래스 매핑
export const responsiveClasses = {
  // 반응형 폰트 크기
  h1: 'text-[20px] md:text-[22px] lg:text-2xl',
  h2: 'text-lg md:text-[19px] lg:text-xl',
  h3: 'text-base md:text-[17px] lg:text-lg',
  h4: 'text-[15px] lg:text-base',
  body: 'text-sm',
  bodyLarge: 'text-[15px] md:text-base',
  
  // 반응형 패딩
  cardPadding: 'p-4 md:p-5 lg:p-6',
  pagePadding: 'px-4 md:px-6 lg:px-8',
  sectionGap: 'space-y-4 md:space-y-5 lg:space-y-6',
  
  // 반응형 버튼
  buttonMedium: 'h-12 md:h-11 px-6 text-base',
  buttonSmall: 'h-10 md:h-9 px-4 text-sm',
  
  // 반응형 Input
  input: 'h-12 md:h-11 px-4 text-base',
  
  // 반응형 Grid
  grid2Cols: 'grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 lg:gap-6',
  grid3Cols: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6',
  grid4Cols: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6',
} as const

export default {
  breakpoints,
  devices,
  responsiveFontSize,
  responsiveSpacing,
  responsiveComponents,
  touchOptimization,
  responsiveGrid,
  responsiveClasses,
}
