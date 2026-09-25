/**
 * DRK-1679 §5:
 *   Scenario: The console asks the directory for every permission the service defines
 *     Given the operator Mai signs in
 *     When the console asks the directory for her permissions
 *     Then it asks for all 5 permissions the service defines
 *
 * The 5 literal scope names are copied from the service's own registry
 * (`ApiEndpoints/DKNet.Accounts.Api/Configs/Auth/SampleAuthorizationRequirement.cs:
 * ScopeNames.All`) — never computed from the console's own `KNOWN_SCOPES`, which is exactly
 * the constant DRK-1684 §3 row 11 widens from 3 to these same 5. RED today: the harness
 * env's `CONSOLE_ENTRA_SCOPES` (and the shipped `.env.sample` default) still requests only 3.
 */
import { expect, test } from '../support/test';

const SERVICE_SCOPES = ['accounts.read', 'accounts.write', 'postings.read', 'postings.write', 'postings.reverse'];

test('The console asks the directory for every permission the service defines', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/signin`);

  const authorizeUrl = new URL(page.url());
  expect(authorizeUrl.pathname).toContain('authorize');
  const requestedScopes = (authorizeUrl.searchParams.get('scope') ?? '').split(' ');

  for (const scope of SERVICE_SCOPES) {
    expect(requestedScopes).toContain(scope);
  }
});
