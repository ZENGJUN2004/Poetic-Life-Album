import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        poem: ['"Noto Serif SC"', 'serif'],
        body: ['"Noto Sans SC"', 'sans-serif'],
      },
      colors: {
        parchment: {
          50: '#fefcf9',
          100: '#fdf8f3',
          200: '#f8f0e6',
          300: '#f0e4d4',
          400: '#e5d4bc',
          500: '#d4b896',
          600: '#b89670',
          700: '#99785a',
          800: '#7a5f48',
          900: '#5c4837',
        },
        ink: {
          50: '#f7f7f7',
          100: '#e8e8e8',
          200: '#d4d4d4',
          300: '#a3a3a3',
          400: '#737373',
          500: '#525252',
          600: '#404040',
          700: '#262626',
          800: '#171717',
          900: '#0a0a0a',
        },
        mist: {
          50: '#f0f4f8',
          100: '#e1e8f0',
          200: '#c3d1e1',
          300: '#a5b9d1',
          400: '#87a2c2',
          500: '#698ab2',
          600: '#546f8f',
          700: '#3f546b',
          800: '#2a3847',
          900: '#151c23',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'gentle-pulse': 'gentlePulse 3s ease-in-out infinite',
        'ink-spread': 'inkSpread 1.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        gentlePulse: {
          '0%, 100%': { opacity: '0.8' },
          '50%': { opacity: '1' },
        },
        inkSpread: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { opacity: '0.6' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
