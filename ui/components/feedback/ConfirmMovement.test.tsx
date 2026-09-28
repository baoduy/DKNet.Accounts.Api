import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmMovement } from './ConfirmMovement';

describe('ConfirmMovement — batch mode', () => {

  it('falls back to the single-movement paragraph when legs is an empty array', () => {
    render(createElement(ConfirmMovement, { legs: [], direction: 'Credit', accountNumber: 'ACME-000123' }));
    expect(screen.queryByText(/all-or-nothing/)).toBeNull();
    expect(document.body.querySelector('p')).not.toBeNull();
  });
});

describe('ConfirmMovement — closing (DRK-1725 §3 row 7)', () => {
  it('calls onDismiss, not onBack, when Escape closes it', () => {
    const onBack = vi.fn();
    const onDismiss = vi.fn();
    render(createElement(ConfirmMovement, { direction: 'Credit', amount: '1', accountNumber: 'ACME-000123', onBack, onDismiss }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
  });

  it('treats Escape as Back when no onDismiss is given', () => {
    const onBack = vi.fn();
    render(createElement(ConfirmMovement, { direction: 'Credit', amount: '1', accountNumber: 'ACME-000123', onBack }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('hands where focus goes on close to the caller', async () => {
    const onCloseAutoFocus = vi.fn((event: Event) => event.preventDefault());
    const { rerender } = render(createElement(ConfirmMovement, { direction: 'Credit', amount: '1', accountNumber: 'ACME-000123', onCloseAutoFocus }));
    rerender(createElement(ConfirmMovement, { open: false, direction: 'Credit', amount: '1', accountNumber: 'ACME-000123', onCloseAutoFocus }));
    await waitFor(() => expect(onCloseAutoFocus).toHaveBeenCalledTimes(1));
  });

  it('closes quietly on Escape when the caller handles neither Back nor dismissal', () => {
    render(createElement(ConfirmMovement, { direction: 'Credit', amount: '1', accountNumber: 'ACME-000123' }));
    expect(() => fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })).not.toThrow();
  });
});
