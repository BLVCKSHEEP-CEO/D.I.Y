/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F9F9F7',
        ink: '#070707',
        action: '#FF3B30',
        electric: '#0466FF',
        neon: '#20E070',
        amber: '#FFBB00'
      },
      boxShadow: {
        hard: '4px 4px 0px 0px rgba(0,0,0,1)',
        'hard-lg': '6px 6px 0px 0px rgba(0,0,0,1)'
      },
      fontFamily: {
        sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular']
      }
    }
  },
  plugins: [
    function ({ addComponents }) {
      addComponents({
        '.diy-card': {
          '@apply border-2 border-black bg-paper shadow-hard': {}
        },
        '.diy-card-void': {
          '@apply border-2 border-black bg-ink text-paper shadow-hard': {}
        }
      });
    }
  ]
};







