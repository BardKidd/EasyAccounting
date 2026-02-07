import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {},
  },
  plugins: [
    plugin(function ({ addBase, theme }) {
      addBase({
        h1: { fontSize: '1.875rem', fontWeight: '700' }, // 30px
        h2: { fontSize: '1.5rem', fontWeight: '600' }, // 24px
        h3: { fontSize: '1.25rem', fontWeight: '600' }, // 20px
        p: { fontSize: '1rem', lineHeight: '1.75' }, // 16px
        small: { fontSize: '0.875rem', fontWeight: '500', lineHeight: '1' }, // 14px
      });
    }),
  ],
};

export default config;
