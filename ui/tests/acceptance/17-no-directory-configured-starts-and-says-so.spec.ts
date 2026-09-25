/**
 * DRK-1669 §5:
 *   Scenario: A console with no directory configured starts and says so
 *     Given the console is configured with blank directory values
 *     When Mai opens the console
 *     Then Mai sees a page stating that sign-in is not configured
 *     And Mai is not sent to Microsoft Entra ID
 */
import { expect, test } from '../support/test';
import { defaultConsoleEnv, OWN_CONSOLE_PORT } from '../support/fixtures';
import { startConsole, stopConsole } from '../support/console-process';

const PORT = OWN_CONSOLE_PORT;
const BASE = `http://127.0.0.1:${PORT}`;

test('A console with no directory configured starts and says so', async ({ page }) => {
  const env = { ...defaultConsoleEnv(PORT), CONSOLE_ENTRA_TENANT_ID: '', CONSOLE_ENTRA_CLIENT_ID: '' };
  const handle = await startConsole(env, PORT);
  try {
    await page.goto(`${BASE}/`);

    await expect(page.getByText(/sign-in is not configured/i)).toBeVisible();
    expect(page.url()).not.toContain('/signin');
  } finally {
    await stopConsole(handle);
  }
});
