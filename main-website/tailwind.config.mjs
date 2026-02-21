/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Aien design system: melancholic, editorial
        charcoal: '#0E0E0E',
        bone: '#F3F1ED',
        ash: '#8A8A8A',
        mehndi: '#2F3A32',
        ink: '#3A2E28',
        // Soft text (never pure white/black)
        'off-white': '#F8F6F2',
        'soft-charcoal': '#1A1A1A',
        // Backward compatibility (map old names)
        cream: '#F3F1ED',
        sand: '#E8E6E2',
        emerald: { DEFAULT: '#2F3A32', light: '#3d4a3f' },
        gold: '#8A8A8A',
        'charcoal-light': '#1e1e1e',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        urdu: ['"Noto Nastaliq Urdu"', 'serif'],
      },
      fontSize: {
        'urdu-hero': ['clamp(2rem, 6vw, 4.5rem)', { lineHeight: '1.6' }],
        'urdu-large': ['clamp(1.75rem, 4vw, 3rem)', { lineHeight: '1.7' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        'prose': '65ch',
      },
      animation: {
        'fade-in': 'fadeIn 1.2s ease-out forwards',
        'fade-up': 'fadeUp 0.8s ease-out forwards',
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
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
    },
  },
  plugins: [],
};
