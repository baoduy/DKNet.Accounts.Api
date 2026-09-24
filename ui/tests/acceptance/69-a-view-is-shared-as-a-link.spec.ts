/**
 * DRK-1713 §5:
 *   @integration
 *   Scenario: A view is shared as a link
 *     Given the operator Mai sets the period to 2026-09-01 to 2026-09-24, narrows to direction Debit and searches for INV-2026
 *     And she sorts by amount largest first, opens page 2 and opens the posting P-10058 on that page
 *     When she copies the page address and opens it again
 *     Then she sees the same period, narrowing, search, sort, page and open posting
 *
 * 12 debits match; by amount, largest first, P-10058 is the 12th — on page 2 at 10 rows a page
 * (`tests/support/records.ts`). Credits and other references are seeded too, so the narrowing
 * and the search each change the list. RED today: no `/records` route exists.
 */
import { expect, test } from '../support/test';
import { MAI } from '../support/fixtures';
import { ledgerRequests, seedLedgerAccounts, seedLedgerPostings } from '../support/ledger';
import { ACME_ID, account, posting, recordRow, setPeriod } from '../support/records';
import { signInAs } from '../support/sign-in';

test('A view is shared as a link', async ({ page, baseURL }) => {
  await seedLedgerAccounts([account('ACME-000123', ACME_ID)]);
  await seedLedgerPostings([
    // P-10047 … P-10058: 12 matching debits, 100.00 down to 45.00.
    ...Array.from({ length: 12 }, (_, i) =>
      posting({ id: `b0000000-0000-4000-8000-0000000100${47 + i}`, postingNumber: `P-100${47 + i}`, accountId: ACME_ID, direction: 'Debit', amount: `${100 - i * 5}.00`, currency: 'SGD', category: 'Payment', counterpartyReference: `INV-2026-${String(900 + i)}`, effectiveDate: '2026-09-10' }),
    ),
    ...Array.from({ length: 3 }, (_, i) =>
      posting({ id: `b0000000-0000-4000-8000-0000000300${10 + i}`, postingNumber: `P-300${10 + i}`, accountId: ACME_ID, direction: 'Credit', amount: '999.00', currency: 'SGD', category: 'Refund', counterpartyReference: `INV-2026-${String(800 + i)}`, effectiveDate: '2026-09-10' }),
    ),
    posting({ id: 'b0000000-0000-4000-8000-000000040001', postingNumber: 'P-40001', accountId: ACME_ID, direction: 'Debit', amount: '500.00', currency: 'SGD', category: 'Payment', counterpartyReference: 'PO-7781', effectiveDate: '2026-09-10' }),
  ]);
  await signInAs(page, { consoleBaseUrl: baseURL!, email: MAI.email });

  await page.goto(`${baseURL}/records`);
  await setPeriod(page, '2026-09-01', '2026-09-24');
  await page.getByLabel('Direction filter', { exact: true }).selectOption('Debit');
  await page.getByLabel('Search postings', { exact: true }).fill('INV-2026');
  const amountHeading = page.getByRole('main').getByRole('columnheader', { name: 'Amount', exact: true });
  // Largest first, whichever direction the heading's first press sorts in.
  await amountHeading.getByRole('button').click();
  await expect(amountHeading).toHaveAttribute('aria-sort', /^(ascending|descending)$/);
  if ((await amountHeading.getAttribute('aria-sort')) === 'ascending') await amountHeading.getByRole('button').click();
  await expect(amountHeading).toHaveAttribute('aria-sort', 'descending');
  await page.getByRole('button', { name: 'Page 2', exact: true }).click();
  await recordRow(page, 'P-10058').click();
  await expect(page.getByTestId('detail-panel')).toContainText('P-10058');

  const sharedUrl = page.url();
  await page.goto(sharedUrl);

  await expect(page.getByLabel('From', { exact: true })).toHaveValue('2026-09-01');
  await expect(page.getByLabel('To', { exact: true })).toHaveValue('2026-09-24');
  await expect(page.getByLabel('Direction filter', { exact: true })).toHaveValue('Debit');
  await expect(page.getByLabel('Search postings', { exact: true })).toHaveValue('INV-2026');
  await expect(page.getByRole('main').getByRole('columnheader', { name: 'Amount', exact: true })).toHaveAttribute('aria-sort', 'descending');
  await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(recordRow(page, 'P-10058')).toHaveCount(1);
  await expect(page.getByTestId('detail-panel')).toContainText('P-10058');

  // The reopened view is one request the service accepts, carrying every part of the view.
  const list = (await ledgerRequests()).filter((r) => r.method === 'GET' && r.path.startsWith('/v1/postings?')).at(-1)!;
  const params = new URLSearchParams(list.path.split('?')[1]);
  expect(params.get('from')).toBe('2026-09-01');
  expect(params.get('to')).toBe('2026-09-24');
  expect(params.get('direction')).toBe('Debit');
  expect(params.get('search')).toBe('INV-2026');
  expect(params.get('orderBy')?.toLowerCase()).toBe('amount');
  expect(params.get('desc')).toBe('true');
  expect(params.get('pageNumber')).toBe('2');
});
