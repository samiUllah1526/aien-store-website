/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      // Brand palette: poetic, soulful, premium
      // Light: cream/sand/charcoal/ink. Dark: inverted with same accent (emerald, gold).
      colors: {
        charcoal: {
          DEFAULT: '#2d2d2d',
          light: '#3d3d3d',
          dark: '#1a1a1a',
        },
        ink: '#0d0d0d',
        cream: '#f5f2eb',     // off-white (light bg)
        sand: '#e8e4dc',     // beige (light borders/surfaces)
        emerald: {
          DEFAULT: '#0d6b5c',
          light: '#117a6a',
          dark: '#0a5548',
        },
        gold: {
          DEFAULT: '#b8860b',
          light: '#c9a227',
          muted: '#9a7b2e',
        },
      },
      // Apple-like soft shadows (use sparingly)
      boxShadow: {
        'soft': '0 2px 15px -3px rgb(0 0 0 / 0.04), 0 10px 20px -2px rgb(0 0 0 / 0.03)',
        'soft-lg': '0 10px 40px -10px rgb(0 0 0 / 0.08)',
      },
      fontFamily: {
        // Elegant serif / Nastaliq-inspired for headings and Urdu
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        // Clean modern sans for body
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        // Urdu / Nastaliq style – use a font that supports Urdu if available
        urdu: ['"Noto Nastaliq Urdu"', 'serif'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      transitionDuration: {
        '400': '400ms',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInSlide: {
          '0%': { opacity: '0', transform: 'translateX(8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'fade-in-slide': 'fadeInSlide 0.5s ease-out forwards',
      },
    },
  },
  plugins: [],
};
