/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Dark theme (default)
        background:  '#080b14',
        card:        '#0e1320',
        border:      'rgba(255,255,255,0.07)',
        primary:     '#6366f1',
        muted:       '#131827',
        foreground:  '#eef0ff',
        'muted-fg':  '#636b8a',
        success:     '#10b981',
        warning:     '#f59e0b',
        destructive: '#f43f5e',
        info:        '#38bdf8',
      },
      fontFamily: {
        sans:  ['DMSans_400Regular'],
        medium:['DMSans_500Medium'],
        bold:  ['DMSans_700Bold'],
        mono:  ['DMMono_400Regular'],
      },
    },
  },
  plugins: [],
};
