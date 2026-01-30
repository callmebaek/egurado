/**
 * TurboTax Component Design Tokens
 * 모든 컴포넌트의 일관된 스타일 정의
 */

export const components = {
  // Card Styles
  card: {
    default: {
      background: '#FFFFFF',
      border: '1px solid #E0E0E0',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      transition: 'all 0.2s ease-in-out',
    },
    hover: {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
      transform: 'translateY(-2px)',
    },
    interactive: {
      cursor: 'pointer',
      hoverBackground: '#FAFAFA',
    },
    sizes: {
      small: { padding: '16px', borderRadius: '8px' },
      medium: { padding: '24px', borderRadius: '12px' },
      large: { padding: '32px', borderRadius: '16px' },
    },
  },

  // Button Styles
  button: {
    base: {
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: 600,
      transition: 'all 0.2s ease-in-out',
      cursor: 'pointer',
    },
    sizes: {
      small: {
        padding: '8px 16px',
        fontSize: '14px',
        height: '36px',
      },
      medium: {
        padding: '12px 24px',
        fontSize: '16px',
        height: '44px',
      },
      large: {
        padding: '16px 32px',
        fontSize: '18px',
        height: '52px',
      },
    },
    variants: {
      primary: {
        background: '#405D99',
        color: '#FFFFFF',
        border: 'none',
        boxShadow: '0 2px 4px rgba(64, 93, 153, 0.2)',
        hover: {
          background: '#2E4577',
          boxShadow: '0 4px 8px rgba(64, 93, 153, 0.3)',
        },
        active: {
          background: '#1A2B52',
        },
      },
      secondary: {
        background: '#FFFFFF',
        color: '#405D99',
        border: '2px solid #405D99',
        boxShadow: 'none',
        hover: {
          background: '#F5F5F5',
          borderColor: '#2E4577',
        },
      },
      ghost: {
        background: 'transparent',
        color: '#405D99',
        border: 'none',
        hover: {
          background: '#F5F5F5',
        },
      },
      danger: {
        background: '#F44336',
        color: '#FFFFFF',
        border: 'none',
        hover: {
          background: '#D32F2F',
        },
      },
    },
  },

  // Input Styles
  input: {
    base: {
      background: '#FFFFFF',
      border: '1px solid #BDBDBD',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '16px',
      fontWeight: 400,
      lineHeight: '1.65',
      transition: 'all 0.2s ease-in-out',
    },
    focus: {
      borderColor: '#405D99',
      boxShadow: '0 0 0 3px rgba(64, 93, 153, 0.1)',
      outline: 'none',
    },
    error: {
      borderColor: '#F44336',
      boxShadow: '0 0 0 3px rgba(244, 67, 54, 0.1)',
    },
    disabled: {
      background: '#F5F5F5',
      color: '#9E9E9E',
      cursor: 'not-allowed',
    },
    sizes: {
      small: { padding: '8px 12px', fontSize: '14px' },
      medium: { padding: '12px 16px', fontSize: '16px' },
      large: { padding: '16px 20px', fontSize: '18px' },
    },
  },

  // Modal Styles (일관성 유지)
  modal: {
    overlay: {
      background: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      zIndex: 1000,
    },
    container: {
      background: '#FFFFFF',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.16)',
      padding: '0', // 내부에서 섹션별로 padding 적용
      maxWidth: {
        small: '400px',
        medium: '600px',
        large: '800px',
        xlarge: '1000px',
      },
    },
    header: {
      padding: '24px 24px 16px 24px',
      borderBottom: '1px solid #E0E0E0',
      title: {
        fontSize: '20px',
        fontWeight: 600,
        lineHeight: '1.35',
        color: '#212121',
      },
      closeButton: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        color: '#757575',
        hover: {
          background: '#F5F5F5',
          color: '#212121',
        },
      },
    },
    body: {
      padding: '24px',
      fontSize: '14px',
      fontWeight: 400,
      lineHeight: '1.6',
      color: '#616161',
    },
    footer: {
      padding: '16px 24px 24px 24px',
      borderTop: '1px solid #E0E0E0',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
    },
    animation: {
      enter: {
        opacity: '0',
        transform: 'scale(0.95)',
        transition: 'all 0.2s ease-out',
      },
      enterActive: {
        opacity: '1',
        transform: 'scale(1)',
      },
      exit: {
        opacity: '1',
        transform: 'scale(1)',
      },
      exitActive: {
        opacity: '0',
        transform: 'scale(0.95)',
        transition: 'all 0.15s ease-in',
      },
    },
  },

  // Badge Styles
  badge: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 600,
      lineHeight: '1.55',
    },
    variants: {
      default: {
        background: '#F5F5F5',
        color: '#616161',
      },
      primary: {
        background: '#E8EAF6',
        color: '#405D99',
      },
      success: {
        background: '#E8F5E9',
        color: '#388E3C',
      },
      warning: {
        background: '#FFF3E0',
        color: '#F57C00',
      },
      error: {
        background: '#FFEBEE',
        color: '#D32F2F',
      },
    },
  },

  // Divider
  divider: {
    color: '#E0E0E0',
    thickness: '1px',
    margin: '24px 0',
  },

  // Tooltip
  tooltip: {
    background: '#424242',
    color: '#FFFFFF',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 400,
    lineHeight: '1.55',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    maxWidth: '300px',
  },
} as const

// Tailwind 클래스 매핑
export const componentClasses = {
  card: {
    default: 'bg-white border border-neutral-300 rounded-card p-6 shadow-card transition-all duration-200',
    hover: 'hover:shadow-card-hover hover:-translate-y-0.5',
    interactive: 'cursor-pointer hover:bg-neutral-50',
  },
  button: {
    base: 'rounded-button font-bold transition-all duration-200 cursor-pointer',
    primary: 'bg-primary-500 text-white shadow-button hover:bg-primary-600 hover:shadow-lg active:bg-primary-700',
    secondary: 'bg-white text-primary-500 border-2 border-primary-500 hover:bg-neutral-100',
    ghost: 'bg-transparent text-primary-500 hover:bg-neutral-100',
    small: 'px-4 py-2 text-sm h-9',
    medium: 'px-6 py-3 text-base h-11',
    large: 'px-8 py-4 text-lg h-13',
  },
  modal: {
    overlay: 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000]',
    container: 'bg-white rounded-2xl shadow-2xl',
    header: 'px-6 py-4 border-b border-neutral-200',
    body: 'px-6 py-6 text-sm text-neutral-700 leading-[1.6]',
    footer: 'px-6 py-4 border-t border-neutral-200 flex justify-end gap-3',
  },
}
