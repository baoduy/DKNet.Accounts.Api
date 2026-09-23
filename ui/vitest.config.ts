import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname) } },
  css: { modules: { localsConvention: 'camelCase' } },
  test: {
    environment: 'jsdom',
    // Lets @testing-library/react register its automatic post-test DOM cleanup.
    globals: true,
    // `tests/` is the frozen acceptance-test suite (DRK-1669 approval round 2) — unit tests
    // for production modules live beside their source instead, under `lib/`.
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx', 'lib/**/*.test.ts', 'components/**/*.test.tsx'],
    css: true,
    setupFiles: ['tests/unit/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'components/**/*.tsx'],
    },
  },
});
