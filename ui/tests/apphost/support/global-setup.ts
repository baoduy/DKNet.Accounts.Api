/**
 * Removes only what this run started: its cache container (the `webServer` stop ends the `docker run` client,
 * not the container), its console's build folder, and the `tsconfig.json` that console rewrote — as the
 * acceptance suite's own global setup does.
 */
import { execFileSync } from 'node:child_process';
import { FAKE_REDIS_CONTAINER, OWN_CONSOLE_PORT } from '../../support/fixtures';
import { currentRun, restoreCheckout } from '../../support/run';

export default async function globalSetup(): Promise<() => Promise<void>> {
  process.once('exit', () => restoreCheckout(currentRun().tsconfig, [OWN_CONSOLE_PORT]));
  return async () => {
    try {
      execFileSync('docker', ['rm', '-f', FAKE_REDIS_CONTAINER], { stdio: 'ignore' });
    } catch {
      // Already gone.
    }
  };
}
