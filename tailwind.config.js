/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
    presets: [require('nativewind/preset')],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#3B82F6',
                    light: '#60A5FA',
                    dark: '#2563EB',
                    glow: 'rgba(59, 130, 246, 0.15)',
                },
                surface: {
                    dark: '#111827',
                    'dark-elevated': '#1F2937',
                    light: '#FFFFFF',
                },
                bg: {
                    dark: '#0A0E1A',
                    light: '#F3F4F6',
                },
                price: {
                    cheap: '#10B981',
                    medium: '#F59E0B',
                    expensive: '#EF4444',
                },
            },
        },
    },
    plugins: [],
};