/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        infinity: {
          green: {
            50: '#EDFBE2',
            100: '#D5EAD8',
            200: 'rgba(120, 239, 80, 0.2)',
            300: 'rgba(120, 239, 80, 0.5)',
            400: 'rgba(120, 239, 80, 0.75)',
            500: '#78ef50',
            600: '#379237',
            700: '#2d7a2d',
            800: '#1f5a1f',
            900: '#0C1406',
          },
          dark: {
            900: '#0F172A',
            800: '#1E293B',
            700: '#334155',
            600: '#475569',
          },
          gray: {
            DEFAULT: '#353737',
          }
        }
      },
      fontFamily: {
        serif: ['DM Serif Display', 'serif'],
        sans: ['AR One Sans', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
      },
      borderRadius: {
        'infinity': '28px',
      },
      backgroundImage: {
        'gradient-infinity': 'linear-gradient(135deg, rgba(120, 239, 80, 0.75) 0%, #379237 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(120, 239, 80, 0.3)',
        'glow-green-lg': '0 0 40px rgba(120, 239, 80, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
};
