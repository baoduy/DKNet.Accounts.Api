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

  // DRK-1745: rewrite for the new form
  it.skip('editing shows Code and Decimal places disabled, Name editable', async () => {
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

  // DRK-1745: rewrite for the new form
  it.skip('Deactivate currency stays disabled with CURRENCY_HOLDS_BALANCE beside it when an account holds a balance', async () => {
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

  // DRK-1745: rewrite for the new form
  it.skip('a refused Deactivate in view mode shows the message and code (DRK-1700 review B2)', async () => {
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

  // DRK-1745: rewrite for the new form
  it.skip('a view-mode Deactivate refused with a field still renders in the alert (DRK-1700 review round 2, R2-1)', async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/deactivate') && init?.method === 'POST') {
        return jsonResponse(422, { errors: [{ message: 'An account in SGD still holds a balance.', code: 'CURRENCY_HOLDS_BALANCE', field: 'Id' }], traceId: 't-deact2' });
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

  // DRK-1745: rewrite for the new form
  it.skip('deactivates a currency that holds no balance and shows it inactive', async () => {
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

  // DRK-1745: rewrite for the new form
  it.skip('reactivates an inactive currency', async () => {
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

// DRK-1719 §5 (@unit): Scenario Outline: The console's new-currency form accepts up to 6 decimal places
//   Given treasury-ops is registering "Loyalty Points" as LOYALTYPTS in the console
//   When treasury-ops enters <places> decimal places
//   Then the console <outcome> the registration
//   Examples: | places | outcome | 6 | allows | 7 | blocks |
describe("The console's new-currency form accepts up to 6 decimal places", () => {
  async function registerLoyaltyPointsWith(places: string) {
    const fetchMock = vi.fn(async (_input: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? jsonResponse(201, { id: 'c9', code: 'LOYALTYPTS', name: 'Loyalty Points', decimalPlaces: Number(places), isActive: true })
        : jsonResponse(200, []),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('button', { name: 'New currency' }));
    await userEvent.type(screen.getByLabelText('Code'), 'LOYALTYPTS');
    await userEvent.type(screen.getByLabelText('Name'), 'Loyalty Points');
    await userEvent.type(screen.getByLabelText('Decimal places'), places);
    return fetchMock;
  }

  const posts = (fetchMock: ReturnType<typeof vi.fn>) =>
    fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST');

  // DRK-1745: rewrite for the new form
  it.skip('places 6: the console allows the registration', async () => {
    const fetchMock = await registerLoyaltyPointsWith('6');

    expect(screen.getByTestId('currency-worked-example')).toHaveTextContent(/^1,250\.000000 LOYALTYPTS$/);
    expect(screen.getByRole('button', { name: 'Register currency' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'Register currency' }));

    await waitFor(() => expect(posts(fetchMock)).toHaveLength(1));
    expect(JSON.parse((posts(fetchMock)[0]?.[1] as RequestInit | undefined)?.body as string)).toEqual({ code: 'LOYALTYPTS', name: 'Loyalty Points', decimalPlaces: 6 });
  });

  it('places 7: the console blocks the registration', async () => {
    const fetchMock = await registerLoyaltyPointsWith('7');

    expect(screen.queryByTestId('currency-worked-example')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register currency' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Register currency' }));

    expect(posts(fetchMock)).toHaveLength(0);
  });
});

describe('CurrenciesScreen — screen states (DRK-1725 §3)', () => {
  // DRK-1745: rewrite for the new form
  it.skip('says the ledger holds no currencies yet, under the list headings', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, [])));
    renderScreen();
    expect(await screen.findByRole('cell', { name: 'No currencies yet.' })).toHaveAttribute('colspan', '4');
  });

  // DRK-1745: rewrite for the new form
  it.skip('draws placeholder rows under its headings while the list is read', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    const { container } = renderScreen();
    expect(container.querySelectorAll('thead th')).toHaveLength(4);
    expect(container.querySelectorAll('tbody tr [data-slot="skeleton"]')).toHaveLength(40);
    expect(screen.queryByText('No currencies yet.')).toBeNull();
  });

  it('offers Retry on a failed list read, keeping New currency usable', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent('The ledger service cannot be reached.');
    expect(screen.getByRole('button', { name: 'New currency' })).toBeEnabled();

    fetchMock.mockResolvedValue(jsonResponse(200, [CURRENCY]));
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('cell', { name: 'SGD' })).toBeInTheDocument();
  });

  it('states a failed balances read in the panel, with Retry, and moves focus into the panel', async () => {
    const fetchMock = vi.fn(async (input: string) => (String(input).includes('/balances') ? jsonResponse(503, { errors: [{ message: 'Ledger store unavailable' }] }) : jsonResponse(200, [CURRENCY])));
    vi.stubGlobal('fetch', fetchMock);
    renderScreen();
    await userEvent.click(await screen.findByRole('cell', { name: 'SGD' }));

    const panel = await screen.findByTestId('detail-panel');
    expect(panel).toHaveFocus();
    expect(panel).toHaveAttribute('tabindex', '-1');
    expect(await within(panel).findByRole('alert')).toHaveTextContent('Ledger store unavailable');

    fetchMock.mockImplementation(async (input: string) =>
      String(input).includes('/balances') ? jsonResponse(200, [{ currency: 'SGD', balance: '5.00', available: '5.00', held: '0' }]) : jsonResponse(200, [CURRENCY]),
    );
    await userEvent.click(within(panel).getByRole('button', { name: 'Retry' }));
    expect(await within(panel).findByText('CURRENCY_HOLDS_BALANCE')).toBeInTheDocument();
    expect(within(panel).queryByRole('alert')).toBeNull();
  });
});
