import { configDefaults, defineConfig } from 'vitest/config';
import base, { UNIT_FILES } from './vitest.config';

const { projects: _projects, ...test } = base.test!;

/**
 * Stryker-only override (brief row 12) — `tests/unit/console-process.test.ts` (DRK-1688)
 * drives a real `next dev` child process; Stryker mutates only `lib/**` (`stryker.conf.json`)
 * and analyzes coverage in-process, so that test can never observe a mutant and excluding it
 * from Stryker's run loses no kill. `test:unit` still runs it via `vitest.config.ts`, untouched.
 * Stryker runs one flat project: the `test:unit` projects and their one-at-a-time lane are dropped.
 */
export default defineConfig({
  ...base,
  test: {
    ...test,
    include: UNIT_FILES,
    exclude: [...configDefaults.exclude, 'tests/unit/console-process.test.ts'],
  },
});
