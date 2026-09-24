import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmMovement } from './ConfirmMovement';
import type { MovementLeg } from './ConfirmMovement';

describe('ConfirmMovement — single movement', () => {
  it('restates a debit in full, with every optional detail, and wires back/confirm', () => {
    const onBack = vi.fn();
    const onConfirm = vi.fn();
    render(
      createElement(ConfirmMovement, {
        direction: 'Debit',
        amount: '12400.00',
        currency: 'SGD',
        decimalPlaces: 2,
        accountNumber: 'ACME-000123',
        accountName: 'Operating Account',
        effectiveDate: '21 Sep 2026',
        category: 'Transfer',
        onBack,
        onConfirm,
        confirmLabel: 'Record posting',
      }),
    );
    const [movement, details] = Array.from(document.body.querySelectorAll('p')).map((p) => p.textContent);
    expect(movement).toBe('Debit 12,400.00 SGD from ACME-000123');
    expect(details).toBe('Operating Account, effective 21 Sep 2026, category Transfer');

    screen.getByRole('button', { name: 'Back' }).click();
    expect(onBack).toHaveBeenCalled();
    screen.getByRole('button', { name: 'Record posting' }).click();
    expect(onConfirm).toHaveBeenCalled();
  });

  it('restates a credit with none of the optional details, and defaults the confirm label', () => {
    render(
      createElement(ConfirmMovement, {
        direction: 'Credit',
        amount: '892.45',
        currency: 'SGD',
        accountNumber: 'ACME-000123',
        consequence: 'A new opposing posting will be recorded; the original is marked Reversed. Nothing is deleted.',
      }),
    );
    expect(document.body.querySelector('p')?.textContent).toBe('Credit 892.45 SGD to ACME-000123');
    expect(screen.getByText(/Nothing is deleted/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });
});

describe('ConfirmMovement — single movement details', () => {
  it('lists only the optional details given, the amount still exactly as typed', () => {
    render(createElement(ConfirmMovement, { direction: 'Credit', amount: '9007199254740993.01', currency: 'SGD', accountNumber: 'ACME-000123', category: 'Fee' }));
    const [movement, details] = Array.from(document.body.querySelectorAll('p')).map((p) => p.textContent);
    expect(movement).toBe('Credit 9007199254740993.01 SGD to ACME-000123');
    expect(details).toBe('category Fee');
  });

  it('lists an effective date given alone', () => {
    render(createElement(ConfirmMovement, { direction: 'Credit', amount: '1', currency: 'JPY', accountNumber: 'ACME-000123', effectiveDate: '2026-09-01' }));
    expect(Array.from(document.body.querySelectorAll('p')).map((p) => p.textContent)[1]).toBe('effective 2026-09-01');
  });
});

describe('ConfirmMovement — a ledger amount (DRK-1717 F1)', () => {
  it.each([
    { amount: '500.00', currency: 'JPY', decimalPlaces: 0, movement: 'Credit 500 JPY to ACME-000123' },
    { amount: '12400.00', currency: 'SGD', decimalPlaces: 2, movement: 'Credit 12,400.00 SGD to ACME-000123' },
  ])('draws $amount $currency at $decimalPlaces places', ({ amount, currency, decimalPlaces, movement }) => {
    render(createElement(ConfirmMovement, { direction: 'Credit', amount, currency, decimalPlaces, accountNumber: 'ACME-000123' }));
    expect(document.body.querySelector('p')?.textContent).toBe(movement);
  });
});

describe('ConfirmMovement — typed amount, no currency yet', () => {
  it('names no currency rather than an undefined one', () => {
    render(createElement(ConfirmMovement, { direction: 'Credit', amount: '10', accountNumber: 'ACME-000123' }));
    expect(document.body.querySelector('p')?.textContent).toBe('Credit 10  to ACME-000123');
  });
});

describe('ConfirmMovement — single movement, bare', () => {
  it('draws no details line when no optional detail is given, and no amount when none is given', () => {
    render(createElement(ConfirmMovement, { direction: 'Debit', currency: 'SGD', accountNumber: 'ACME-000123' }));
    expect(Array.from(document.body.querySelectorAll('p')).map((p) => p.textContent)).toEqual(['Debit  SGD from ACME-000123']);
  });
});

describe('ConfirmMovement — batch mode', () => {
  it('lists every leg with its own currency scale and states all-or-nothing', () => {
    const legs: MovementLeg[] = [
      { direction: 'Debit', amount: '100.00', currency: 'SGD', decimalPlaces: 2, accountNumber: 'ACME-000123' },
      { direction: 'Credit', amount: '44120000', currency: 'JPY', decimalPlaces: 0, accountNumber: 'ACME-000456' },
    ];
    render(createElement(ConfirmMovement, { legs }));
    expect(screen.getByText(/all-or-nothing/)).toBeInTheDocument();
    expect(screen.getByText('100.00 SGD')).toBeInTheDocument();
    expect(screen.getByText('44,120,000 JPY')).toBeInTheDocument();
  });

  it('falls back to an empty account number when none is given', () => {
    render(createElement(ConfirmMovement, { direction: 'Credit', amount: '10.00', currency: 'SGD' }));
    expect(document.body.querySelector('p')?.textContent).toBe('Credit 10.00 SGD to ');
  });

  it('falls back to the single-movement paragraph when legs is an empty array', () => {
    render(createElement(ConfirmMovement, { legs: [], direction: 'Credit', accountNumber: 'ACME-000123' }));
    expect(screen.queryByText(/all-or-nothing/)).toBeNull();
    expect(document.body.querySelector('p')).not.toBeNull();
  });
});
