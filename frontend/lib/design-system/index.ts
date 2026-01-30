/**
 * Egurado Design System
 * TurboTax-inspired design system for Korean service
 */

export * from './colors'
export * from './typography'
export * from './spacing'
export * from './components'
export * from './responsive'
export * from './animations'

import { colors } from './colors'
import { typography } from './typography'
import { spacing } from './spacing'
import { components } from './components'
import responsive from './responsive'
import { animations } from './animations'

// 전체 디자인 토큰 통합
export const designSystem = {
  colors,
  typography,
  spacing,
  components,
  responsive,
  animations,
} as const
