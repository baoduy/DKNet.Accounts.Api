/**
 * DRK-1696 §5:
 *   Scenario Outline: Every status the service supports can be set
 *     Given the account ACME-000123 is active and holds 0.00 SGD
 *     When the operator Mai sets it to <status>
 *     Then the account is <status>
 *
 *     Examples: frozen | dormant | closed
 *
 * All four statuses are offered (decision log, `2026-09-24 · drunkcoding · All 4 account
 * statuses are offered, not only the 2 that close and reopen`) — not only via the
 * close/reopen control. RED today: no `/accounts/{account}` route exists yet.
 *
 * dev-leader AT review round 1, finding 2: `getByText(status)` matched the `Status` select's
 * own selected-option text, which is on screen whether or not the write ever happened — the
 * test passed with no `PATCH` sent. Fixed to assert the write actually reached the service
 * (the `PATCH` body) and that the *stored* value is what a fresh read shows, via the status
 * badge — a control distinct from the select the operator just touched.
 */
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { ledgerRequests, seedLedgerAccounts } from '../support/ledger';
import { signInAs } from '../support/sign-in';

for (const status of ['Frozen', 'Dormant', 'Closed']) {
  test(`Every status the service supports can be set — ${status}`, async ({ page, baseURL }) => {
    await seedLedgerAccounts([
      { accountNumber: 'ACME-000123', currency: 'SGD', decimalPlaces: 2, balance: '0.00', availableBalance: '0.00', heldAmount: '0.00', permittedToGoNegative: false },
    ]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });

    await page.goto(`${baseURL}/accounts/ACME-000123`);
    await page.getByLabel('Status', { exact: true }).selectOption(status);
    await page.getByRole('button', { name: 'Save' }).click();

    await expect
      .poll(async () => (await ledgerRequests()).filter((r) => r.method === 'PATCH' && r.path === '/v1/accounts/ACME-000123'))
      .toHaveLength(1);
    const calls = (await ledgerRequests()).filter((r) => r.method === 'PATCH' && r.path === '/v1/accounts/ACME-000123');
    const body = calls[0] as unknown as { body: { status: string } };
    expect(body.body.status).toBe(status);

    // The stored value, on a fresh read — not the select the operator just set.
    await page.reload();
    await expect(page.getByTestId('account-status')).toHaveText(status);
  });
}
