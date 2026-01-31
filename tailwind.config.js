/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Dark theme (default)
        dark: {
          900: '#0a0a0f',
          800: '#111827',
          700: '#1f2937',
          600: '#374151',
          500: '#4b5563',
          400: '#6b7280',
          300: '#9ca3af',
          200: '#d1d5db',
          100: '#f3f4f6',
        },
        // Primary (Blue)
        primary: {
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        // Success (Green)
        success: {
          500: '#10b981',
          600: '#059669',
        },
        // Warning (Yellow/Orange)
        warning: {
          500: '#f59e0b',
          600: '#d97706',
        },
        // Danger (Red)
        danger: {
          500: '#ef4444',
          600: '#dc2626',
        },
        // Purple
        purple: {
          500: '#a855f7',
          600: '#9333ea',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};