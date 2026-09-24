/**
 * Runs in the Playwright runner, after the `webServer` stand-ins are up and before the first
 * check; the function it returns runs after the last check, before the stand-ins are stopped.
 *
 * - DRK-1726 R3: watches every stand-in for the whole run. The first one that stops is named
 *   ("stand-in sign-in server stopped") and the run is interrupted — the runner's own Ctrl-C
 *   path, so no further check starts, teardown still runs and the run exits non-zero. The auto
 *   fixture in `test.ts` checks the same stand-ins around every check, so the check that was
 *   running fails with the same name.
 * - DRK-1726 R2: removes only what this run started — its own cache container (the `webServer`
 *   stop ends the `docker run` client, not the container) and its consoles' build folders —
 *   and puts back the `tsconfig.json` its consoles rewrote (§9 Q3).
 */
import { execFileSync } from 'node:child_process';
import { DEFAULT_CONSOLE_PORT, FAKE_REDIS_CONTAINER, OWN_CONSOLE_PORT } from './fixtures';
import { currentRun, restoreCheckout } from './run';
import { standInStopped, stoppedStandIn } from './stand-ins';

const WATCH_INTERVAL_MS = 500;

export default async function globalSetup(): Promise<() => Promise<void>> {
  let watching = true;
  let timer: NodeJS.Timeout | undefined;
  const watch = async (): Promise<void> => {
    const stopped = await stoppedStandIn();
    if (!watching) return;
    if (stopped) {
      console.error(`\n${standInStopped(stopped)} — the run stops here.\n`);
      process.kill(process.pid, 'SIGINT');
      return;
    }
    timer = setTimeout(() => void watch(), WATCH_INTERVAL_MS);
  };
  await watch();

  return async () => {
    watching = false;
    clearTimeout(timer);
    try {
      execFileSync('docker', ['rm', '-f', FAKE_REDIS_CONTAINER], { stdio: 'ignore' });
    } catch {
      // Already gone — `--rm` removed it when it stopped.
    }
    restoreCheckout(currentRun().tsconfig, [DEFAULT_CONSOLE_PORT, OWN_CONSOLE_PORT]);
  };
}
