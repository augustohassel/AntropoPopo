/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Teal/esmeralda: identidad "salud" diferenciada del índigo de RatingsApp
        brand: {
          50: '#effefb',
          100: '#c8fff4',
          200: '#91feea',
          300: '#53f5dc',
          400: '#1fe0c8',
          500: '#06c4ae',
          600: '#019e8f',
          700: '#067e74',
          800: '#0a645d',
          900: '#0d524d',
          950: '#003331',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};
