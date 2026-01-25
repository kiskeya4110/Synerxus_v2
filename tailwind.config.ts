import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // Font family
      fontFamily: {
        sans: ['Inter', 'Instrument Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },

      // Border radius
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
        xl: "var(--radius-xl)",
      },

      // Colors
      colors: {
        // Base semantic colors (from CSS variables)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary-hsl))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent-hsl))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success-hsl))",
          foreground: "hsl(var(--success-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Brand colors (direct hex values for flexibility)
        brand: {
          primary: "#0F172A",     // bg-primary
          secondary: "#1E293B",   // bg-secondary
          tertiary: "#334155",    // bg-tertiary
          indigo: "#6366F1",      // Primary action color
          amber: "#F59E0B",       // Accent/CTA color
          green: "#22C55E",       // Success color
          cyan: "#22D3EE",        // Info color
        },

        // Logo colors
        logo: {
          indigo: "#6366F1",
          amber: "#F59E0B",
          green: "#22C55E",
          cyan: "#22D3EE",
        },

        // SDG Colors (1-17)
        sdg: {
          1: "#E5243B",   // No Poverty
          2: "#DDA63A",   // Zero Hunger
          3: "#4C9F38",   // Good Health
          4: "#C5192D",   // Quality Education
          5: "#FF3A21",   // Gender Equality
          6: "#26BDE2",   // Clean Water
          7: "#FCC30B",   // Affordable Energy
          8: "#A21942",   // Decent Work
          9: "#FD6925",   // Industry Innovation
          10: "#DD1367",  // Reduced Inequalities
          11: "#FD9D24",  // Sustainable Cities
          12: "#BF8B2E",  // Responsible Consumption
          13: "#3F7E44",  // Climate Action
          14: "#0A97D9",  // Life Below Water
          15: "#56C02B",  // Life on Land
          16: "#00689D",  // Peace Justice
          17: "#19486A",  // Partnerships
        },

        // Chart colors
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },

        // Sidebar colors
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },

      // Box shadows
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.4)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.5)',
        'xl': '0 20px 25px rgba(0, 0, 0, 0.6)',
        'glow-primary': '0 0 20px rgba(99, 102, 241, 0.4)',
        'glow-accent': '0 0 20px rgba(245, 158, 11, 0.4)',
        'glow-success': '0 0 20px rgba(34, 197, 94, 0.4)',
        'glow-cyan': '0 0 20px rgba(34, 211, 238, 0.4)',
      },

      // Spacing
      spacing: {
        'header': '64px',
        'sidebar': '260px',
      },

      // Max width
      maxWidth: {
        'container': '1280px',
      },

      // Keyframes
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },

      // Animations
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "slide-in-right": "slide-in-right 0.4s ease-out",
        "pulse-slow": "pulse-slow 2s ease-in-out infinite",
        "shimmer": "shimmer 1.5s infinite",
        "spin-slow": "spin-slow 3s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
