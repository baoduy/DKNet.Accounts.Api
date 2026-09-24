/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario Outline: A refused recording shows the service's code on the control it concerns
 *     Given the account ACME-000123 is <state>
 *     When the operator Mai confirms a <movement> to ACME-000123
 *     Then she sees the service's reason with the code <code>
 *     And the <control> control is marked
 *
 *     Examples:
 *       | state                             | movement              | code                          | control |
 *       | frozen                            | credit of 10.00 SGD   | ACCOUNT_FROZEN                | account |
 *       | closed                            | credit of 10.00 SGD   | ACCOUNT_CLOSED                | account |
 *       | dormant                           | debit of 10.00 SGD    | ACCOUNT_DORMANT_DEBIT_REFUSED | account |
 *       | active with 5.00 SGD and no overdraft | debit of 10.00 SGD | INSUFFICIENT_FUNDS            | amount  |
 *       | active                            | credit of 0.001 SGD   | INVALID_POSTING_AMOUNT        | amount  |
 *
 * The service sends none of these with a `field` (brief §2, `routeRefusal`): the control is
 * chosen from the code (§3 row 13). "The service's reason" is its own wording, as the fake
 * ledger returns it (`PostingRefusalMapping.cs`, `Record.cs`; INSUFFICIENT_FUNDS keeps the
 * fake's existing wording, which spec 59 already pins). The other control stays unmarked.
 * RED today: no `/records` route exists.
 */
import { expect, test } from '../support/test';
import { MAI_WITH_WRITE } from '../support/fixtures';
import { seedLedgerAccounts, type LedgerAccountFixture } from '../support/ledger';
import { ACME_ID, account, confirmMovement, fillRecordForm } from '../support/records';
import { signInAs } from '../support/sign-in';

const EXAMPLES: Array<{ state: string; fixture: Partial<LedgerAccountFixture>; direction: 'Credit' | 'Debit'; amount: string; code: string; reason: string; control: 'Account' | 'Amount' }> = [
  { state: 'frozen', fixture: { status: 'Frozen' }, direction: 'Credit', amount: '10.00', code: 'ACCOUNT_FROZEN', reason: 'The account is frozen.', control: 'Account' },
  { state: 'closed', fixture: { status: 'Closed' }, direction: 'Credit', amount: '10.00', code: 'ACCOUNT_CLOSED', reason: 'The account is closed.', control: 'Account' },
  { state: 'dormant', fixture: { status: 'Dormant' }, direction: 'Debit', amount: '10.00', code: 'ACCOUNT_DORMANT_DEBIT_REFUSED', reason: 'A dormant account refuses a debit.', control: 'Account' },
  {
    state: 'active with 5.00 SGD and no overdraft',
    fixture: { status: 'Active', balance: '5.00', availableBalance: '5.00', permittedToGoNegative: false, overdraftLimit: null, minimumBalance: null },
    direction: 'Debit',
    amount: '10.00',
    code: 'INSUFFICIENT_FUNDS',
    reason: 'The debit would take the account past its floor.',
    control: 'Amount',
  },
  { state: 'active', fixture: { status: 'Active' }, direction: 'Credit', amount: '0.001', code: 'INVALID_POSTING_AMOUNT', reason: "The amount must be positive and match the currency's precision.", control: 'Amount' },
];

for (const { state, fixture, direction, amount, code, reason, control } of EXAMPLES) {
  test(`A refused recording shows the service's code on the control it concerns — ${state}`, async ({ page, baseURL }) => {
    await seedLedgerAccounts([account('ACME-000123', ACME_ID, fixture)]);
    await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI_WITH_WRITE.email });
    await page.goto(`${baseURL}/records`);

    await fillRecordForm(page, { accountNumber: 'ACME-000123', direction, amount });
    await confirmMovement(page);

    const main = page.getByRole('main');
    await expect(main.getByText(new RegExp(`\\b${code}\\b`))).toBeVisible();
    await expect(main.getByText(reason)).toBeVisible();
    await expect(page.getByLabel(control, { exact: true })).toHaveAttribute('aria-invalid', 'true');
    const other = control === 'Account' ? 'Amount' : 'Account';
    await expect(page.getByLabel(other, { exact: true })).not.toHaveAttribute('aria-invalid', 'true');
  });
}
