/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FDFCF9',
        parchment: '#F5F3ED',
        linen: '#F0EDE6',
        khaki: '#E8E4DB',
        sand: '#DDD9D0',
        stone: '#C5C0B6',
        walnut: '#8A8478',
        bark: '#6B665D',
        espresso: '#4A4640',
        ink: '#2C2A25',
        deepink: '#1A1814',
        forest: '#16A34A',
        amber: '#D97706',
        brick: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Lora', 'serif'],
        serif: ['Newsreader', 'serif'],
        mono: ['Space Mono', 'monospace'],
      },
      boxShadow: {
        'warm-sm': '0 1px 3px rgba(30,25,18,0.08)',
        warm: '0 2px 8px rgba(30,25,18,0.08), 0 1px 2px rgba(30,25,18,0.06)',
        'warm-md': '0 4px 16px rgba(30,25,18,0.10), 0 1px 3px rgba(30,25,18,0.06)',
        'warm-inset': '0 1px 3px rgba(30,25,18,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
      },
    },
  },
  plugins: [],
};