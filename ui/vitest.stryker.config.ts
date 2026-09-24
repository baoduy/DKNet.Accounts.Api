import { configDefaults, mergeConfig } from 'vitest/config';
import base from './vitest.config';

/**
 * Stryker-only override (brief row 12) — `tests/unit/console-process.test.ts` (DRK-1688)
 * drives a real `next dev` child process; Stryker mutates only `lib/**` (`stryker.conf.json`)
 * and analyzes coverage in-process, so that test can never observe a mutant and excluding it
 * from Stryker's run loses no kill. `test:unit` still runs it via `vitest.config.ts`, untouched.
 */
export default mergeConfig(base, {
  test: {
    exclude: [...configDefaults.exclude, 'tests/unit/console-process.test.ts'],
  },
});
