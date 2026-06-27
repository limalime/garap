/** @type {import('tailwindcss').Config} */
// Garap design system — sourced from PROJECT_SUMMARY.md "UI/UX Design System".
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: {
          DEFAULT: '#6B46C1', // Deep Violet
          light: '#A78BFA', // Lighter Violet (secondary)
        },
        // Surfaces
        background: '#0F0F1E', // Near-black
        card: '#1A1A2E', // Dark Gray
        // Text
        'text-primary': '#FFFFFF',
        'text-secondary': '#9CA3AF',
        // Status colors
        status: {
          active: '#10B981', // Green
          submitted: '#3B82F6', // Blue
          won: '#FBBF24', // Gold
          lost: '#EF4444', // Red
          pending: '#6B7280', // Gray
        },
      },
      borderRadius: {
        card: '24px',
        pill: '50px',
      },
      fontFamily: {
        sans: ['CalSansUI-UIRegular', 'System'],
        'sans-medium': ['CalSansUI-UIMedium', 'System'],
        'sans-bold': ['CalSansUI-UIBold', 'System'],
        heading: ['CalSansUI-TextRegular', 'System'],
        'heading-medium': ['CalSansUI-TextMedium', 'System'],
        'heading-bold': ['CalSansUI-TextBold', 'System'],
      },
    },
  },
  plugins: [],
};
