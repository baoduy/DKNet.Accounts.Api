import { expect, type Locator, type Page } from '@playwright/test';
import type { LedgerAccountFixture, LedgerPostingFixture } from './ledger';

/**
 * DRK-1713 — how the acceptance specs 64 to 82 and 96 drive the Records screen (`/records`). The
 * names below are the screen's contract with these specs; every one follows a control the
 * account detail screen (`PostingsPanel`, `RecordPostingForm`, `ReversePostingForm`) or the
 * accounts screen (`AccountsScreen`) already names the same way:
 *
 * - period: date inputs labelled `From` and `To`; narrowing: selects `Direction filter`,
 *   `Category filter`, `Status filter`; search: a text input labelled `Search postings`.
 * - table column headings: `Posting number`, `Account`, `Direction`, `Category`, `Amount`,
 *   `Currency`, `Effective date`, `Status`. A sortable heading holds a button.
 * - paging: buttons `Page <n>`, the current one `aria-current="page"`, 10 rows a page (the
 *   accounts screen's own page size).
 * - choosing a row opens its details beside the list, in `data-testid="detail-panel"`.
 * - recording: a `Record posting` action; the form's controls `Account` (searches accounts by
 *   number or name, offering each as an `option`), `Posting currency`, `Direction`, `Amount`,
 *   `Category`, then `Record`, then the confirmation dialog's `Confirm`.
 * - reversing: `Reverse` in the details, the dialog's `Reason`, then `Confirm`.
 */

/** Account ids are guids, as the service's are — never the account number, so a row that
 * showed the posting's raw `accountId` could never pass for the account number. */
export const ACME_ID = 'a0000000-0000-4000-8000-000000000123';
export const GLOBEX_ID = 'a0000000-0000-4000-8000-000000000456';

export function account(accountNumber: string, id: string, overrides: Partial<LedgerAccountFixture> = {}): LedgerAccountFixture {
  return {
    id,
    accountNumber,
    currency: 'SGD',
    decimalPlaces: 2,
    balance: '1000.00',
    availableBalance: '1000.00',
    heldAmount: '0.00',
    permittedToGoNegative: false,
    ...overrides,
  };
}

let postingSequence = 0;

/** Called before every check by `test.ts`, so a check's stream positions never depend on the checks before it. */
export function resetPostingSequence(): void {
  postingSequence = 0;
}

/** A posting fixture; `amount` is the magnitude, `signedAmount` follows the direction. */
export function posting(fixture: Omit<LedgerPostingFixture, 'streamPosition' | 'signedAmount' | 'balanceAfter'> & Partial<LedgerPostingFixture>): LedgerPostingFixture {
  postingSequence += 1;
  return {
    streamPosition: postingSequence,
    signedAmount: fixture.direction === 'Debit' ? `-${fixture.amount}` : fixture.amount,
    balanceAfter: '0',
    ...fixture,
  };
}

/** `YYYY-MM-DD`, `days` before today (UTC — the console's own `toISOString().slice(0, 10)`). */
export function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

export async function setPeriod(page: Page, from: string, to: string): Promise<void> {
  // `To` first: widening the start before the end moves could pass through a span over 90 days.
  await page.getByLabel('To', { exact: true }).fill(to);
  await page.getByLabel('From', { exact: true }).fill(from);
}

/** The Records screen's table body rows. */
export function recordRows(page: Page): Locator {
  return page.getByRole('main').locator('tbody tr');
}

export function recordRow(page: Page, postingNumber: string): Locator {
  return recordRows(page).filter({ has: page.getByRole('cell', { name: postingNumber, exact: true }) });
}

/** The text of `row`'s cell under the column headed `header`. */
export async function cellText(page: Page, row: Locator, header: string): Promise<string> {
  const headers = (await page.getByRole('main').getByRole('columnheader').allTextContents()).map((text) => text.trim());
  const index = headers.indexOf(header);
  expect(index, `column "${header}" in ${JSON.stringify(headers)}`).toBeGreaterThanOrEqual(0);
  return ((await row.getByRole('cell').nth(index).textContent()) ?? '').trim();
}

/** Every cell of `row`, in column order. */
export async function rowCells(row: Locator): Promise<string[]> {
  return (await row.getByRole('cell').allTextContents()).map((text) => text.trim());
}

/** Opens the Records screen's record form (if it is not open already) and fills it. Leaves the
 * operator one click short of the confirmation: `Record` is pressed, `Confirm` is not. */
export async function fillRecordForm(
  page: Page,
  movement: { accountTerm?: string; accountNumber?: string; direction: 'Credit' | 'Debit'; amount: string; category?: string },
): Promise<void> {
  const toggle = page.getByRole('button', { name: 'Record posting', exact: true });
  if (await toggle.isVisible()) await toggle.click();
  if (movement.accountNumber) {
    const picker = page.getByLabel('Account', { exact: true });
    if (await picker.isEditable()) {
      await picker.fill(movement.accountTerm ?? movement.accountNumber);
      await page.getByRole('option', { name: new RegExp(`^${movement.accountNumber}\\b`) }).click();
    }
  }
  await page.getByLabel('Direction', { exact: true }).selectOption(movement.direction);
  await page.getByLabel('Amount', { exact: true }).fill(movement.amount);
  await page.getByLabel('Category', { exact: true }).selectOption(movement.category ?? 'Transfer');
  await page.getByRole('button', { name: 'Record', exact: true }).click();
}

export async function confirmMovement(page: Page): Promise<void> {
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
}
