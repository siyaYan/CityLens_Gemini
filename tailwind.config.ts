import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './types.ts',
    './utils.ts',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
