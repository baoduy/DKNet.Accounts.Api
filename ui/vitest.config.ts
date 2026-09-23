import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  css: { modules: { localsConvention: 'camelCase' } },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    css: true,
    setupFiles: ['tests/unit/setup.ts'],
  },
});
