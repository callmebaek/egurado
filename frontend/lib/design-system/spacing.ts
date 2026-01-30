/**
 * TurboTax Spacing System (8px grid)
 */

export const spacing = {
  // Base spacing scale (8px grid)
  0: '0',
  0.5: '4px',   // xs
  1: '8px',     // sm
  1.5: '12px',
  2: '16px',    // md
  2.5: '20px',
  3: '24px',    // lg
  3.5: '28px',
  4: '32px',    // xl
  5: '40px',
  6: '48px',    // 2xl
  7: '56px',
  8: '64px',    // 3xl
  9: '72px',
  10: '80px',
  12: '96px',
  16: '128px',

  // Semantic spacing
  cardPadding: {
    small: '16px',
    medium: '24px',
    large: '32px',
  },
  sectionGap: '24px',
  componentGap: '16px',
  elementGap: '8px',
} as const

// Tailwind에서 사용할 추가 spacing
export const customSpacing = {
  18: '72px',
  22: '88px',
  26: '104px',
  30: '120px',
}
