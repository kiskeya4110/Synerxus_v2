/**
 * Synerxus Unified Theme Configuration
 * Consistent colors, gradients, and styles across all dashboards
 */

export const SynerxusTheme = {
  // Primary Brand Colors
  colors: {
    primary: '#2A4B7F',           // Deep Synerxus Blue
    secondary: '#00C389',         // Impact Green
    accent: '#F59E0B',            // Amber accent

    // Neutrals - Updated for better contrast
    dark: '#0F172A',            // Darker for better contrast
    darkGray: '#334155',        // Slightly darker for better readability
    gray: '#475569',            // Darker gray for better contrast (was #6B7280)
    mediumGray: '#64748B',      // Medium gray for secondary text
    lightGray: '#CBD5E1',       // Adjusted for better visibility
    veryLightGray: '#F1F5F9',
    white: '#FFFFFF',

    // Status Colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #2A4B7F 0%, #00C389 100%)',
    primaryReverse: 'linear-gradient(135deg, #00C389 0%, #2A4B7F 100%)',
    header: 'linear-gradient(to right, #2A4B7F 0%, #1E3A5F 100%)',
    card: 'linear-gradient(135deg, rgba(42, 75, 127, 0.05) 0%, rgba(0, 195, 137, 0.05) 100%)',
    glassmorphism: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.65) 100%)',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    glow: '0 0 20px rgba(42, 75, 127, 0.3)',
    glowGreen: '0 0 20px rgba(0, 195, 137, 0.3)',
  },

  // Glassmorphism
  glass: {
    background: 'rgba(255, 255, 255, 0.85)',
    backgroundDark: 'rgba(42, 75, 127, 0.85)',
    blur: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
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
