/** @type {import('tailwindcss').Config} */
module.exports = {
  safelist: [
    'animate-in',
    'fade-in',
    'zoom-in',
    'slide-in-from-top-1',
  ],
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [require('tailwindcss-animate')],
};
