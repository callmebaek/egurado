/**
 * TurboTax-inspired Typography System for Korean Service
 * 한국 서비스를 위한 타이포그래피 시스템
 */

export const typography = {
  // Font Families
  fontFamily: {
    // 한국어 우선 + 영어 fallback
    sans: '"NanumSquare Neo", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
    mono: '"Roboto Mono", "D2Coding", monospace',
  },

  // Font Sizes with optimized line-heights for Korean
  fontSize: {
    xs: {
      size: '12px',
      lineHeight: '1.55', // Small text
    },
    sm: {
      size: '14px',
      lineHeight: '1.6', // Body text
    },
    base: {
      size: '16px',
      lineHeight: '1.65', // Large body
    },
    lg: {
      size: '18px',
      lineHeight: '1.4', // Section titles
    },
    xl: {
      size: '20px',
      lineHeight: '1.35', // Section titles
    },
    '2xl': {
      size: '24px',
      lineHeight: '1.3', // Page titles
    },
    '3xl': {
      size: '28px',
      lineHeight: '1.25', // Large KPI
    },
    '4xl': {
      size: '32px',
      lineHeight: '1.25', // KPI numbers
    },
  },

  // Font Weights (NanumSquare Neo 지원 범위)
  fontWeight: {
    regular: 400,    // Body text
    medium: 500,     // Emphasized body, labels
    bold: 600,       // Section titles, card headers, buttons
    extrabold: 700,  // Page titles, main headings
    // ⚠️ 800, 900 사용 금지
  },

  // Heading Scale (subtle differences)
  heading: {
    h1: {
      fontSize: '24px',
      fontWeight: 700,
      lineHeight: '1.3',
      usage: 'Page main title',
    },
    h2: {
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: '1.35',
      usage: 'Section title',
    },
    h3: {
      fontSize: '18px',
      fontWeight: 600,
      lineHeight: '1.4',
      usage: 'Card header',
    },
    h4: {
      fontSize: '16px',
      fontWeight: 600,
      lineHeight: '1.45',
      usage: 'Sub-section',
    },
    body: {
      fontSize: '14px',
      fontWeight: 400,
      lineHeight: '1.6',
      usage: 'Body text',
    },
  },
} as const

// Tailwind CSS 클래스 매핑
export const typographyClasses = {
  h1: 'text-2xl font-extrabold leading-[1.3]',
  h2: 'text-xl font-bold leading-[1.35]',
  h3: 'text-lg font-bold leading-[1.4]',
  h4: 'text-base font-bold leading-[1.45]',
  body: 'text-sm font-regular leading-[1.6]',
  bodyLarge: 'text-base font-regular leading-[1.65]',
  label: 'text-sm font-medium leading-[1.6]',
  caption: 'text-xs font-regular leading-[1.55]',
  button: 'text-base font-bold leading-normal',
  buttonSmall: 'text-sm font-bold leading-normal',
} as const
