import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrenciesScreen } from './CurrenciesScreen';

const CURRENCY = { id: 'c1', code: 'SGD', name: 'Singapore Dollar', decimalPlaces: 2, isActive: true };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function renderScreen(grantedScopes: string[] = ['accounts.read', 'accounts.write']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(createElement(QueryClientProvider, { client: queryClient }, createElement(CurrenciesScreen, { grantedScopes })));
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CurrenciesScreen', () => {
  it('renders the fetched currencies with code, name, decimal places and status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [CURRENCY])));
    renderScreen();

    const row = await screen.findByRole('row', { name: /SGD/ });
    expect(within(row).getByText('Singapore Dollar')).toBeInTheDocument();
    expect(within(row).getByText('2')).toBeInTheDocument();
    expect(within(row).getByText('Active')).toBeInTheDocument();
  });

  it('shows a live worked example while registering a currency, before it is saved', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [])));
    renderScreen();
    await userEvent.click(await screen.findByRole('button', { name: 'New currency' }));

    await userEvent.type(screen.getByLabelText('Code'), 'vnd');
    await userEvent.type(screen.getByLabelText('Name'), 'Vietnamese Dong');
    await userEvent.type(screen.getByLabelText('Decimal places'), '0');

    expect(screen.getByTestId('currency-worked-example')).toHaveTextContent('1,250 VND');
  });

  it('registers a currency and shows it active in the list on success', async () => {
    const created = { ...CURRENCY, id: 'c2', code: 'VND', name: 'Vietnamese Dong', decimalPlaces: 0 };
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST') return jsonResponse(201, created);
      if (url.includes('/currencies/c2')) return jsonResponse(200, created);
      return jsonResponse(200, [created]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('button', { name: 'New currency' }));
    await userEvent.type(screen.getByLabelText('Code'), 'vnd');
    await userEvent.type(screen.getByLabelText('Name'), 'Vietnamese Dong');
    await userEvent.type(screen.getByLabelText('Decimal places'), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Register currency' }));

    const panel = within(await screen.findByTestId('detail-panel'));
    expect(await panel.findByText('VND')).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST');
    expect(JSON.parse((postCall?.[1] as RequestInit | undefined)?.body as string)).toEqual({ code: 'VND', name: 'Vietnamese Dong', decimalPlaces: 0 });
  });

  it('a duplicate-code refusal marks the Code field invalid and shows the code', async () => {
    const fetchMock = vi.fn(async (_input: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return jsonResponse(422, { errors: [{ message: 'Code SGD is already registered.', code: 'DUPLICATE_CURRENCY_CODE', field: 'Code' }], traceId: 't-1' });
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('button', { name: 'New currency' }));
    await userEvent.type(screen.getByLabelText('Code'), 'sgd');
    await userEvent.type(screen.getByLabelText('Name'), 'Singapore Dollar Two');
    await userEvent.type(screen.getByLabelText('Decimal places'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Register currency' }));

    expect(await screen.findByText(/DUPLICATE_CURRENCY_CODE/)).toBeInTheDocument();
    expect(screen.getByLabelText('Code')).toHaveAttribute('aria-invalid', 'true');
  });

  it('editing shows Code and Decimal places disabled, Name editable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [CURRENCY])));
    renderScreen();
    await userEvent.click(await screen.findByRole('row', { name: /SGD/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Edit currency' }));

    expect(screen.getByLabelText('Code')).toBeDisabled();
    expect(screen.getByLabelText('Decimal places')).toBeDisabled();
    expect(screen.getByLabelText('Name')).toBeEnabled();
  });

  it('renaming a currency sends only the new name and reflects it immediately', async () => {
    let current = { ...CURRENCY };
    const fetchMock = vi.fn(async (_input: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        current = { ...current, name: 'Singapore Dollar (SG)' };
        return jsonResponse(200, current);
      }
      return jsonResponse(200, [current]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('row', { name: /SGD/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Edit currency' }));
    const nameInput = screen.getByLabelText('Name');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Singapore Dollar (SG)');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    const putCall = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'PUT');
    expect(JSON.parse((putCall?.[1] as RequestInit | undefined)?.body as string)).toEqual({ name: 'Singapore Dollar (SG)' });
    expect(await within(screen.getByTestId('detail-panel')).findByText('Singapore Dollar (SG)')).toBeInTheDocument();
  });

  it('Deactivate currency stays disabled with CURRENCY_HOLDS_BALANCE beside it when an account holds a balance', async () => {
    const fetchMock = vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('/accounts/balances')) return new Response('[{"currency":"SGD","balance":400.00}]', { status: 200 });
      return jsonResponse(200, [CURRENCY]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('row', { name: /SGD/ }));

    const deactivateButton = await screen.findByRole('button', { name: 'Deactivate currency' });
    await waitFor(() => expect(deactivateButton).toBeDisabled());
    expect(screen.getByText('CURRENCY_HOLDS_BALANCE')).toBeInTheDocument();
    expect(screen.getByText(/still holds a balance in this currency/)).toBeInTheDocument();
  });

  it('a blank Decimal places sends no POST (DRK-1700 review I1)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('button', { name: 'New currency' }));
    await userEvent.type(screen.getByLabelText('Code'), 'vnd');
    await userEvent.type(screen.getByLabelText('Name'), 'Vietnamese Dong');

    expect(screen.queryByTestId('currency-worked-example')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register currency' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Register currency' }));

    expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toBe(false);
  });

  it('a refusal naming the DecimalPlaces field is visible on screen (DRK-1700 review B1)', async () => {
    const fetchMock = vi.fn(async (_input: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return jsonResponse(400, { errors: [{ message: 'Decimal places must be 0-4.', field: 'DecimalPlaces' }], traceId: 't-dp' });
      }
      return jsonResponse(200, []);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('button', { name: 'New currency' }));
    await userEvent.type(screen.getByLabelText('Code'), 'vnd');
    await userEvent.type(screen.getByLabelText('Name'), 'Vietnamese Dong');
    await userEvent.type(screen.getByLabelText('Decimal places'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Register currency' }));

    expect(await screen.findByText('Decimal places must be 0-4.')).toBeInTheDocument();
    expect(screen.getByLabelText('Decimal places')).toHaveAttribute('aria-invalid', 'true');
  });

  it('a refused Deactivate in view mode shows the message and code (DRK-1700 review B2)', async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/deactivate') && init?.method === 'POST') {
        return jsonResponse(422, { errors: [{ message: 'An account in SGD still holds a balance.', code: 'CURRENCY_HOLDS_BALANCE' }], traceId: 't-deact' });
      }
      if (url.includes('/accounts/balances')) return new Response('[]', { status: 200 });
      return jsonResponse(200, [CURRENCY]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('row', { name: /SGD/ }));
    const deactivateButton = await screen.findByRole('button', { name: 'Deactivate currency' });
    await waitFor(() => expect(deactivateButton).toBeEnabled());

    await userEvent.click(deactivateButton);

    const panel = within(await screen.findByTestId('detail-panel'));
    expect(await panel.findByText(/An account in SGD still holds a balance\./)).toBeInTheDocument();
    expect(panel.getByText('CURRENCY_HOLDS_BALANCE')).toBeInTheDocument();
  });

  it('a failed list read shows the service code instead of the empty-list text (DRK-1700 review I2)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { errors: [{ message: 'Session expired.', code: 'UNAUTHENTICATED' }], traceId: 't-auth' })));
    renderScreen();

    expect(await screen.findByText('Session expired.')).toBeInTheDocument();
    expect(screen.getByText('UNAUTHENTICATED')).toBeInTheDocument();
    expect(screen.queryByText('No currencies registered.')).not.toBeInTheDocument();
  });

  it('deactivates a currency that holds no balance and shows it inactive', async () => {
    let current = { ...CURRENCY };
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/deactivate') && init?.method === 'POST') {
        current = { ...current, isActive: false };
        return jsonResponse(200, current);
      }
      if (url.includes('/accounts/balances')) return new Response('[]', { status: 200 });
      return jsonResponse(200, [current]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('row', { name: /SGD/ }));
    const deactivateButton = await screen.findByRole('button', { name: 'Deactivate currency' });
    await waitFor(() => expect(deactivateButton).toBeEnabled());

    await userEvent.click(deactivateButton);

    expect(await within(screen.getByTestId('detail-panel')).findByText('Inactive')).toBeInTheDocument();
  });

  it('reactivates an inactive currency', async () => {
    let current = { ...CURRENCY, isActive: false };
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/activate') && !url.includes('deactivate') && init?.method === 'POST') {
        current = { ...current, isActive: true };
        return jsonResponse(200, current);
      }
      return jsonResponse(200, [current]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('row', { name: /SGD/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Activate currency' }));

    expect(await within(screen.getByTestId('detail-panel')).findByText('Active')).toBeInTheDocument();
  });

  it('gates every write control behind accounts.write when the scope is not granted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [CURRENCY])));
    renderScreen(['accounts.read']);

    expect(await screen.findByRole('button', { name: 'New currency' })).toBeDisabled();
  });
});
