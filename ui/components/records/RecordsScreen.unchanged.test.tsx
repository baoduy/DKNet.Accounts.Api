/**
 * DRK-2325 §5 (@existing — green before and after the Transfers screen):
 *   @unit Scenario: The Records screen still records a posting as before
 *     Given Mai opened Record posting on the Records screen
 *     When she records a 50.00 SGD credit to "Alice SGD" and confirms it
 *     Then the ledger receives a 50.00 SGD credit on ACME-000101 under the panel's idempotency key
 *     And "Record posted" is shown
 *
 * Driven like `RecordsScreen.record.test.tsx`, on the Transfers scenarios' ledger
 * (`components/transfers/transfers.fixture.ts`).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { answer, ID, ledgerAccounts, mintKeysInOrder, OPTION, paged, resetScreen } from '@/components/transfers/transfers.fixture';
import { RecordsScreen } from './RecordsScreen';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

afterEach(() => resetScreen());

describe('The Records screen still records a posting as before', () => {
  it('sends a 50.00 SGD credit on ACME-000101 under the panel\'s idempotency key and shows "Record posted"', async () => {
    mintKeysInOrder();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return answer({ id: 'b0000000-0000-4000-8000-000000000999' }, 201);
      if (url.startsWith('/api/ledger/postings?')) return answer(paged([]));
      if (url.startsWith('/api/ledger/accounts?')) return answer(paged(ledgerAccounts(), { pageSize: 1000 }));
      if (url.startsWith('/api/ledger/currencies')) return answer([{ id: 'c1', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true }]);
      return answer({ status: 404, errors: [{ message: `unexpected ${url}` }] }, 404);
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(RecordsScreen, { grantedScopes: ['accounts.read', 'postings.read', 'postings.write'] })));

    await userEvent.click(await screen.findByRole('button', { name: 'Record posting' }));
    const panel = screen.getByRole('complementary', { name: 'Details' });
    const key = within(panel).getByText('k-1');
    await screen.findByRole('option', { name: OPTION.alice });
    await userEvent.selectOptions(within(panel).getByLabelText('Account'), OPTION.alice);
    await userEvent.type(within(panel).getByLabelText('Amount'), '50.00');
    await userEvent.click(within(panel).getByRole('button', { name: 'Review movement' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Record posting' }));

    const card = await screen.findByRole('status');
    expect(card).toHaveTextContent('Record posted');
    const sends = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');
    expect(sends).toHaveLength(1);
    const [url, init] = sends[0];
    expect(url).toBe('/api/ledger/postings');
    expect(new Headers(init!.headers).get('Idempotency-Key')).toBe(key.textContent);
    expect(JSON.parse(String(init!.body))).toMatchObject({ accountId: ID.alice, direction: 'Credit', amount: '50.00', currency: 'SGD' });
    await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Details' })).toBeNull());
  });
});
