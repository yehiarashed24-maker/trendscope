/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0c',
        foreground: '#FAFAFA',
        primary: {
          DEFAULT: '#F8FAFC',
          foreground: '#09090B',
        },
        secondary: {
          DEFAULT: '#18181B',
          foreground: '#F4F4F5',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FAFAFA',
        },
        muted: {
          DEFAULT: '#27272A',
          foreground: '#A1A1AA',
        },
        accent: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          foreground: '#FFFFFF',
        },
        input: 'rgba(255, 255, 255, 0.14)',
        ring: 'rgba(255, 255, 255, 0.35)',
        obsidian: {
          950: '#060913',
          900: '#0A0F1E',
          850: '#0E1528',
          800: '#131C33',
          700: '#1C2947',
          600: '#283A63',
        },
        detective: {
          bg: '#060913',
          surface: '#0C1222',
          card: '#10182D',
          popover: '#131D38',
          border: '#1E2942',
          borderActive: '#4F8BFF',
          blue: '#3B82F6',
          blueBright: '#548CFF',
          textMain: '#F1F5F9',
          textMuted: '#7E8BA3',
          inc: '#F06449',
          dec: '#38BDF8',
        },
        slate: {
          950: '#060913',
          900: '#0C1222',
          850: '#111930',
          800: '#1E2942',
          700: '#2E3D5E',
        },
        satellite: {
          DEFAULT: '#3B82F6',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        cyan: {
          science: '#38BDF8',
        },
        thermal: {
          low: '#FBBF24',
          mid: '#F97316',
          high: '#F06449',
        },
        precip: {
          low: '#38BDF8',
          mid: '#0284C7',
          high: '#1D4ED8',
        },
        veg: {
          low: '#A3E635',
          mid: '#22C55E',
          high: '#15803D',
        },
        soil: {
          low: '#D97706',
          mid: '#B45309',
          high: '#78350F',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Cairo', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'system-ui', 'sans-serif'],
        cairo: ['Cairo', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      keyframes: {
        scanline: {
          '0%': { top: '-10%' },
          '100%': { top: '110%' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        cardIn: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        scanline: 'scanline 6s linear infinite',
        ticker: 'ticker 40s linear infinite',
        'card-in': 'cardIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      boxShadow: {
        'focus-ring': '0 0 0 1px #548CFF, 0 0 24px -2px rgba(84, 140, 255, 0.35)',
        'popover': '0 20px 50px -10px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(84, 140, 255, 0.3)',
        'pill': '0 4px 14px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08)',
      }
    },
  },
  plugins: [],
}
