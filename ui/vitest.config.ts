import path from 'node:path';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

/**
 * The 4 unit files that start a real `next dev` in this checkout (DRK-1780 R1): every start, and
 * every restore after it, rewrites the one `tsconfig.json`, so two of them must never run at once.
 */
export const CONSOLE_STARTING_FILES = [
  'tests/unit/acceptance-harness.test.ts',
  'tests/unit/console-process.test.ts',
  'tests/unit/no-retry.test.ts',
  'tests/unit/stand-in-liveness.test.ts',
];

// `tests/` is the frozen acceptance-test suite (DRK-1669 approval round 2) — unit tests
// for production modules live beside their source instead, under `lib/`.
export const UNIT_FILES = ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx', 'lib/**/*.test.ts', 'lib/**/*.test.tsx', 'components/**/*.test.tsx'];

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname) } },
  css: { modules: { localsConvention: 'camelCase' } },
  test: {
    environment: 'jsdom',
    // Lets @testing-library/react register its automatic post-test DOM cleanup.
    globals: true,
    css: true,
    setupFiles: ['tests/unit/setup.ts'],
    // Vitest 5 sizes workers per project: the `console` project runs one file at a time, and only
    // the console-starting files are in it. The rest run in parallel in `unit`. Projects with
    // different `maxWorkers` need their own `sequence.groupOrder`. No root `include`.
    projects: [
      { extends: true, test: { name: 'console', pool: 'forks', maxWorkers: 1, sequence: { groupOrder: 0 }, include: CONSOLE_STARTING_FILES } },
      {
        extends: true,
        test: { name: 'unit', pool: 'threads', sequence: { groupOrder: 1 }, include: UNIT_FILES, exclude: [...configDefaults.exclude, ...CONSOLE_STARTING_FILES] },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'lib/**/*.tsx', 'components/**/*.tsx'],
    },
  },
});
