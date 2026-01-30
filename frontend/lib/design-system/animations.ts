/**
 * TurboTax Animation & Transition System
 */

export const animations = {
  // Transition Durations
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },

  // Easing Functions
  easing: {
    default: 'ease-in-out',
    in: 'ease-in',
    out: 'ease-out',
    linear: 'linear',
  },

  // Common Transitions
  transition: {
    default: 'all 0.2s ease-in-out',
    fast: 'all 0.15s ease-in-out',
    slow: 'all 0.3s ease-in-out',
    color: 'color 0.2s ease-in-out',
    background: 'background-color 0.2s ease-in-out',
    transform: 'transform 0.2s ease-in-out',
    shadow: 'box-shadow 0.2s ease-in-out',
  },

  // Hover Effects
  hover: {
    lift: 'translateY(-2px)',
    scale: 'scale(1.02)',
    scaleSmall: 'scale(1.01)',
  },

  // Loading Animations
  loading: {
    spin: {
      animation: 'spin 1s linear infinite',
    },
    pulse: {
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    },
  },
} as const
