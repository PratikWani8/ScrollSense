/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        veya: {
          obsidian: '#09090E',
          blush: '#F0E1EB',
          lavender: '#CBB4CD',
          coral: '#F49EA6',
          indigo: '#433F60',
          orchid: '#D19DD7',
          offwhite: '#F8F6FA',
          surface: '#12111A',
          card: '#151320',
          border: '#262335',
          borderLight: '#39354F',
          muted: '#9E9AA8',
        },
        navy: {
          950: '#070a12',
          900: '#0b101d',
          850: '#10172a',
          800: '#162039',
          700: '#1e2c4f',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Instrument Serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
