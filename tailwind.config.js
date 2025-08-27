/** @type {import('tailwindcss').Config} */

import colors from 'tailwindcss/colors'

module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx,jsx,js}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cera Pro', 'sans-serif']
      },
      maxWidth: {
        '10xl': '150rem',
        '9xl': '130rem',
        '8xl': '110rem',
        '7.5xl': '100rem'
      },
      colors: {
        transparent: 'transparent',
        current: 'currentColor',
        white: '#ffffff',
        primary: '#ED5B52',
        secondary: '#65C1B0',
        third: '#FFE76F',
        accent: colors.gray['200'],
        destructive: colors.red['500'],
        'primary-foreground': '#FCE7E5',
        'secondary-foreground': '#FFFBEA',
        'green-foreground': '#E8F6F3',
        'destructive-foreground': colors.red['100'],
        'accent-foreground': colors.gray['600'],
        purple: '#7E2E84',
        blue: {
          DEFAULT: '#578FD1',
          50: '#E3F2FD',
          100: '#BBDEFB',
          200: '#90CAF9',
          300: '#64B5F6',
          400: '#42A5F5',
          500: '#578FD1',
          600: '#1E88E5',
          700: '#1976D2',
          800: '#1565C0',
          900: '#0D47A1'
        }
      }
    }
  },
  plugins: []
}
