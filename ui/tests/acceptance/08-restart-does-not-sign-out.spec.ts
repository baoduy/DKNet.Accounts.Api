/**
 * DRK-1669 §5:
 *   Scenario: Restarting the console does not sign the operator out
 *     Given Mai has signed in
 *     When the console is restarted
 *     And Mai opens the console again
 *     Then Mai is still signed in
 *     And Mai is not sent to Microsoft Entra ID
 *
 * Session state lives in Redis (§3 "Server-side state"), not in process memory, so this
 * runs its own dedicated console process to restart mid-test rather than the shared
 * `webServer` instance.
 */
import { expect, test } from '../support/test';
import { defaultConsoleEnv, MAI, OWN_CONSOLE_PORT } from '../support/fixtures';
import { signInAs } from '../support/sign-in';
import { startConsole, stopConsole } from '../support/console-process';

const PORT = OWN_CONSOLE_PORT;
const BASE = `http://127.0.0.1:${PORT}`;

// DRK-1745: rewrite for the new form
test.fixme('Restarting the console does not sign the operator out', async ({ page }) => {
  let handle = await startConsole(defaultConsoleEnv(PORT), PORT, '/signin');
  try {
    await signInAs(page, { consoleBaseUrl: BASE, email: MAI.email });
    await expect(page.getByText('LEDGER')).toBeVisible();

    await stopConsole(handle);
    handle = await startConsole(defaultConsoleEnv(PORT), PORT, '/');

    await page.goto(`${BASE}/`);

    // Mai is still signed in — not sent to Microsoft Entra ID again.
    await expect(page.getByText('LEDGER')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0);
  } finally {
    await stopConsole(handle);
  }
});
