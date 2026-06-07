/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAFAF6',
        'paper-dark': '#F0F0E8',
        ink: '#1A1A1A',
        'ink-light': '#4A4A4A',
        rust: '#C4633A',
        'rust-dark': '#A34E2A',
        sage: '#5A8A5A',
        'sage-dark': '#4A7A4A',
        stone: '#D4D4D0',
        'stone-dark': '#A0A09A',
        mute: '#6B6B6B',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'woodcut': '3px 3px 0px #1A1A1A',
        'woodcut-sm': '2px 2px 0px #1A1A1A',
      },
      borderRadius: {
        'sm': '2px',
        'md': '4px',
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
};