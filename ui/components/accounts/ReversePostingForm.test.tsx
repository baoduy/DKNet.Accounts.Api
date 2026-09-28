import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReversePostingForm } from './ReversePostingForm';

function renderForm(props: Partial<React.ComponentProps<typeof ReversePostingForm>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(ReversePostingForm, {
        accountId: 'a1',
        accountNumber: 'ACME-000123',
        postingId: 'p1',
        postingNumber: 'PST0000000001',
        amount: '500.00',
        currency: 'SGD',
        direction: 'Credit',
        ...props,
      }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ReversePostingForm', () => {

  it('disables the action and states the missing scope when not granted', () => {
    renderForm({ granted: false });
    const button = screen.getByRole('button', { name: 'Reverse' });
    expect(button).toBeDisabled();
    expect(screen.getByText(/postings\.reverse/)).toBeInTheDocument();
  });

  it('shows no refusal before the dialog is ever opened (kills the bogus-initial-array mutant)', () => {
    const { container } = renderForm();
    expect(container.querySelector('[data-slot="card"]')).toBeNull();
  });
});
