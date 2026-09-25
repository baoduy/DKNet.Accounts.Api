/**
 * DRK-1669 §5:
 *   Scenario: The console refuses to start without a token encryption key
 *     Given the console is configured with no token encryption key
 *     When the console is started
 *     Then the console does not start
 *     And the console states that the token encryption key is missing
 */
import { expect, test } from '../support/test';
import { defaultConsoleEnv, OWN_CONSOLE_PORT } from '../support/fixtures';
import { startConsoleExpectingExit } from '../support/console-process';

const PORT = OWN_CONSOLE_PORT;

test('The console refuses to start without a token encryption key', async () => {
  const env = defaultConsoleEnv(PORT);
  delete env.CONSOLE_TOKEN_ENCRYPTION_KEY;

  const result = await startConsoleExpectingExit(env, PORT);

  expect(result.code).not.toBe(0);
  expect(result.stdout + result.stderr).toContain('CONSOLE_TOKEN_ENCRYPTION_KEY');
});
