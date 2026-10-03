import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 2px rgb(26 64 129 / 0.04), 0 8px 24px -12px rgb(26 64 129 / 0.12)',
        shell: '0 24px 60px -30px rgb(26 64 129 / 0.35)',
      },
      colors: {
        bg: v('bg'),
        canvas: v('canvas'),
        surface: v('surface'),
        'surface-muted': v('surface-muted'),
        border: v('border'),
        text: v('text'),
        'text-muted': v('text-muted'),
        primary: v('primary'),
        'primary-bright': v('primary-bright'),
        'primary-deep': v('primary-deep'),
        'primary-soft': v('primary-soft'),
        success: v('success'),
        warning: v('warning'),
        danger: v('danger'),
      },
    },
  },
  plugins: [],
} satisfies Config;
