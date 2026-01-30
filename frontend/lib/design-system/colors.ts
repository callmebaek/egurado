/**
 * TurboTax Color Palette for Korean Service
 * 기존 기능을 유지하면서 TurboTax 스타일 컬러 시스템 추가
 */

export const colors = {
  // Brand Colors (TurboTax signature)
  brand: {
    red: '#D32F2F',
    darkRed: '#B71C1C',
    lightRed: '#EF5350',
  },

  // Primary Colors (Blue - main actions)
  primary: {
    50: '#E8EAF6',
    100: '#C5CAE9',
    200: '#9FA8DA',
    300: '#7986CB',
    400: '#5C6BC0',
    500: '#405D99',   // Main primary
    600: '#2E4577',   // Hover
    700: '#1A2B52',   // Active/Pressed
    800: '#121B3A',
    900: '#0A0F22',
  },

  // Neutral Colors (Gray scale)
  neutral: {
    50: '#FAFAFA',    // Page background
    100: '#F5F5F5',   // Card background
    200: '#EEEEEE',   // Divider
    300: '#E0E0E0',   // Border
    400: '#BDBDBD',   // Disabled
    500: '#9E9E9E',   // Secondary text
    600: '#757575',   // Body text
    700: '#616161',   // Headings
    800: '#424242',   // Dark text
    900: '#212121',   // Sidebar, darkest text
  },

  // Semantic Colors
  success: {
    light: '#81C784',
    main: '#4CAF50',
    dark: '#388E3C',
    background: '#E8F5E9',
  },
  warning: {
    light: '#FFB74D',
    main: '#FF9800',
    dark: '#F57C00',
    background: '#FFF3E0',
  },
  error: {
    light: '#E57373',
    main: '#F44336',
    dark: '#D32F2F',
    background: '#FFEBEE',
  },
  info: {
    light: '#64B5F6',
    main: '#2196F3',
    dark: '#1976D2',
    background: '#E3F2FD',
  },

  // Background Colors
  background: {
    default: '#FAFAFA',
    paper: '#FFFFFF',
    elevated: '#FFFFFF',
  },

  // Text Colors
  text: {
    primary: '#212121',
    secondary: '#616161',
    disabled: '#9E9E9E',
    hint: '#BDBDBD',
  },

  // Border Colors
  border: {
    light: '#F5F5F5',
    main: '#E0E0E0',
    dark: '#BDBDBD',
  },
} as const

// Tailwind config에서 사용할 색상 export
export const tailwindColors = {
  brand: colors.brand,
  primary: colors.primary,
  neutral: colors.neutral,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,
}
