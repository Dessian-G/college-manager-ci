/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#1e3a5f',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#1e3270',
          950: '#172554',
        },
        accent: {
          DEFAULT: '#f97316',
          light: '#fed7aa',
          dark: '#c2410c',
        },
        sidebar: '#1e3a5f',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
