/**
 * Synerxus Unified Theme Configuration
 * Consistent colors, gradients, and styles across all dashboards
 */

export const SynerxusTheme = {
  // Primary Brand Colors
  colors: {
    primary: '#6366F1',           // Indigo - Primary action
    secondary: '#22C55E',         // Impact Green
    accent: '#F59E0B',            // Amber accent

    // Neutrals - Light theme (off-white)
    dark: '#1C1917',            // Stone 900 - Dark text
    darkGray: '#57534E',        // Stone 600 - Secondary text
    gray: '#78716C',            // Stone 500 - Muted text
    mediumGray: '#A8A29E',      // Stone 400 - Lighter muted
    lightGray: '#D6D3D1',       // Stone 300 - Borders
    veryLightGray: '#E7E5E4',   // Stone 200 - Tertiary bg
    offWhite: '#F5F5F4',        // Stone 100 - Primary bg
    white: '#FFFFFF',

    // Status Colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #6366F1 0%, #22C55E 100%)',
    primaryReverse: 'linear-gradient(135deg, #22C55E 0%, #6366F1 100%)',
    header: 'linear-gradient(to right, #FFFFFF 0%, #F5F5F4 100%)',
    card: 'linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(34, 197, 94, 0.03) 100%)',
    glassmorphism: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)',
    glow: '0 0 20px rgba(99, 102, 241, 0.2)',
    glowGreen: '0 0 20px rgba(34, 197, 94, 0.2)',
  },

  // Glassmorphism
  glass: {
    background: 'rgba(255, 255, 255, 0.9)',
    backgroundDark: 'rgba(28, 25, 23, 0.85)',
    blur: 'blur(10px)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
  },

  // Typography
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  // Spacing (8px grid system)
  spacing: {
    xs: '0.5rem',    // 8px
    sm: '0.75rem',   // 12px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },

  // Border Radius
  borderRadius: {
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    full: '9999px',  // Fully rounded
  },

  // Transitions
  transitions: {
    fast: 'all 0.15s ease',
    default: 'all 0.2s ease',
    slow: 'all 0.3s ease',
  },

  // Z-index layers
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
  },
};

// CSS Variables for easy access
export const getCSSVariables = () => {
  return `
    :root {
      /* Colors */
      --color-primary: ${SynerxusTheme.colors.primary};
      --color-secondary: ${SynerxusTheme.colors.secondary};
      --color-accent: ${SynerxusTheme.colors.accent};
      --color-dark: ${SynerxusTheme.colors.dark};
      --color-gray: ${SynerxusTheme.colors.gray};
      --color-off-white: ${SynerxusTheme.colors.offWhite};
      --color-success: ${SynerxusTheme.colors.success};
      --color-warning: ${SynerxusTheme.colors.warning};
      --color-error: ${SynerxusTheme.colors.error};

      /* Gradients */
      --gradient-primary: ${SynerxusTheme.gradients.primary};
      --gradient-header: ${SynerxusTheme.gradients.header};
      --gradient-glass: ${SynerxusTheme.gradients.glassmorphism};

      /* Shadows */
      --shadow-sm: ${SynerxusTheme.shadows.sm};
      --shadow-md: ${SynerxusTheme.shadows.md};
      --shadow-lg: ${SynerxusTheme.shadows.lg};
      --shadow-glow: ${SynerxusTheme.shadows.glow};

      /* Glass */
      --glass-bg: ${SynerxusTheme.glass.background};
      --glass-blur: ${SynerxusTheme.glass.blur};

      /* Transitions */
      --transition-default: ${SynerxusTheme.transitions.default};
    }
  `;
};

export default SynerxusTheme;
