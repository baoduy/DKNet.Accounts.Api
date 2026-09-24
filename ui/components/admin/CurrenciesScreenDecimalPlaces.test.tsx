import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CurrenciesScreen } from './CurrenciesScreen';

// DRK-1719: the new-currency form's decimal-places rule is one whole digit 0-6, never a longer entry that
// merely starts or ends with one.
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CurrenciesScreen decimal places', () => {
  it('keeps Register disabled for a two-digit decimal-places entry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(createElement(QueryClientProvider, { client: queryClient }, createElement(CurrenciesScreen, { grantedScopes: ['accounts.read', 'accounts.write'] })));

    await userEvent.click(await screen.findByRole('button', { name: 'New currency' }));
    await userEvent.type(screen.getByLabelText('Code'), 'LOYALTYPTS');
    await userEvent.type(screen.getByLabelText('Name'), 'Loyalty Points');
    await userEvent.type(screen.getByLabelText('Decimal places'), '16');

    expect(screen.queryByTestId('currency-worked-example')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register currency' })).toBeDisabled();
  });
});
