/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      // -----------------------------------------------------------------------
      // AIEN design system — editorial, architectural, monochromatic.
      // Tokens are M3-inspired so a single source of truth drives every screen.
      // -----------------------------------------------------------------------
      colors: {
        // Editorial core
        primary: '#000000',
        'on-primary': '#ffffff',
        'primary-container': '#1c1b1b',
        'on-primary-container': '#858383',
        'primary-fixed': '#e5e2e1',
        'primary-fixed-dim': '#c9c6c5',
        'on-primary-fixed': '#1c1b1b',
        'on-primary-fixed-variant': '#474646',

        // Editorial accent — deep teal used sparingly for prices / focus
        secondary: '#2b685c',
        'on-secondary': '#ffffff',
        'secondary-container': '#b0efdf',
        'on-secondary-container': '#316e62',
        'secondary-fixed': '#b0efdf',
        'secondary-fixed-dim': '#95d3c4',
        'on-secondary-fixed': '#00201b',
        'on-secondary-fixed-variant': '#095045',

        tertiary: '#000000',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#1a1c1d',
        'on-tertiary-container': '#838486',
        'tertiary-fixed': '#e2e2e4',
        'tertiary-fixed-dim': '#c6c6c8',
        'on-tertiary-fixed': '#1a1c1d',
        'on-tertiary-fixed-variant': '#454749',

        // Surfaces
        background: '#fbf9f9',
        'on-background': '#1b1c1c',
        surface: '#fbf9f9',
        'surface-bright': '#fbf9f9',
        'surface-dim': '#dbdad9',
        'surface-tint': '#5f5e5e',
        'surface-variant': '#e3e2e2',
        'on-surface': '#1b1c1c',
        'on-surface-variant': '#444748',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f5f3f3',
        'surface-container': '#efeded',
        'surface-container-high': '#e9e8e7',
        'surface-container-highest': '#e3e2e2',
        'inverse-surface': '#303031',
        'inverse-on-surface': '#f2f0f0',
        'inverse-primary': '#c9c6c5',

        // Outlines
        outline: '#747878',
        'outline-variant': '#c4c7c7',

        // Status
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',

        // -------------------------------------------------------------------
        // Legacy tokens (kept so older components keep compiling during the
        // editorial redesign rollout). Mapped to the AIEN palette.
        // -------------------------------------------------------------------
        charcoal: '#0E0E0E',
        bone: '#fbf9f9',
        ash: '#747878',
        mehndi: '#2b685c',
        ink: '#1b1c1c',
        'off-white': '#fbf9f9',
        'soft-charcoal': '#1b1c1c',
        cream: '#fbf9f9',
        sand: '#e3e2e2',
        emerald: { DEFAULT: '#2b685c', light: '#316e62' },
        gold: '#747878',
        'charcoal-light': '#1c1b1b',
      },

      fontFamily: {
        // Two-typeface system: serif for editorial display, Inter for UI/body.
        serif: ['"Noto Serif"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Noto Serif"', 'Georgia', 'serif'],
        editorial: ['"Noto Serif"', 'Georgia', 'serif'],
        'noto-serif': ['"Noto Serif"', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Inter', 'system-ui', 'sans-serif'],
        urdu: ['"Noto Nastaliq Urdu"', 'serif'],
      },

      fontSize: {
        // Editorial AIEN type scale — direct from design spec.
        'label-caps': ['12px', { lineHeight: '1', letterSpacing: '0.1em', fontWeight: '600' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '1.6', letterSpacing: '0.01em', fontWeight: '400' }],
        button: ['14px', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '500' }],
        'h3-section': ['32px', { lineHeight: '1.3', fontWeight: '400' }],
        'h2-editorial-sm': ['36px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '400' }],
        'h2-editorial': ['48px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '400' }],
        'h1-display': [
          'clamp(48px, 8vw, 84px)',
          { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '400' },
        ],

        // Backwards-compatible roles (referenced by checkout/forms)
        'urdu-hero': ['clamp(2rem, 6vw, 4.5rem)', { lineHeight: '1.6' }],
        'urdu-large': ['clamp(1.75rem, 4vw, 3rem)', { lineHeight: '1.7' }],
        'page-title': ['1.875rem', { lineHeight: '2.25rem' }],
        'section-title': ['1.125rem', { lineHeight: '1.75rem' }],
        'form-label': ['0.875rem', { lineHeight: '1.25rem' }],
        'form-hint': ['0.75rem', { lineHeight: '1rem' }],
      },

      spacing: {
        'section-gap': '128px',
        'element-gap': '16px',
        gutter: '24px',
        unit: '8px',
        'margin-page': '64px',
        18: '4.5rem',
        22: '5.5rem',
        30: '7.5rem',
        prose: '65ch',
      },

      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },

      maxWidth: {
        site: '1440px',
      },

      animation: {
        'fade-in': 'fadeIn 1.2s ease-out forwards',
        'fade-up': 'fadeUp 0.8s ease-out forwards',
        marquee: 'marquee linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      transitionDuration: {
        400: '400ms',
        600: '600ms',
        700: '700ms',
      },
    },
  },
  plugins: [],
};
