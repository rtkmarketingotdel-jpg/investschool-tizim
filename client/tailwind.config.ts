import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        'surface-muted': v('surface-muted'),
        border: v('border'),
        text: v('text'),
        'text-muted': v('text-muted'),
        primary: v('primary'),
        'primary-soft': v('primary-soft'),
        success: v('success'),
        warning: v('warning'),
        danger: v('danger'),
      },
    },
  },
  plugins: [],
} satisfies Config;
