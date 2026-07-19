import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#111827',
          100: '#1f2937',
          200: '#374151',
          300: '#4b5563',
          400: '#6b7280',
          500: '#6b7280',
          600: '#9ca3af',
          700: '#d1d5db',
          800: '#e5e7eb',
          900: '#ffffff',
          950: '#f3f4f6',
        },
        blue: {
          300: '#93c5fd',
          400: '#1d4ed8',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          950: '#172554',
        },
        purple: {
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        green: {
          400: '#166534',
          500: '#166534',
          950: '#dcfce7',
        },
        red: {
          400: '#dc2626',
          500: '#dc2626',
          600: '#dc2626',
          700: '#b91c1c',
          950: '#fee2e2',
        },
        amber: {
          400: '#92400e',
          500: '#92400e',
        },
      },
      fontFamily: {
        display: ['Limelight', 'Georgia', 'serif'],
        sans: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        artistic: '5px 5px 0 #111827',
        'artistic-sm': '3px 3px 0 #111827',
      },
    },
  },
  plugins: [],
} satisfies Config;
