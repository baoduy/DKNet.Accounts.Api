import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LedgerRefusalError } from '@/lib/api/refusal';
import { FailedRead, RefusalAlert } from './RefusalAlert';

describe('RefusalAlert', () => {
  it('always shows the refusal code when one is present', () => {
    render(createElement(RefusalAlert, { errors: [{ code: 'INSUFFICIENT_FUNDS', message: 'This would take the account below its floor.' }] }));
    expect(screen.getByText('INSUFFICIENT_FUNDS')).toBeInTheDocument();
    expect(screen.getByText(/below its floor/)).toBeInTheDocument();
  });

  it('shows the message and traceId with no invented code when the error carries none', () => {
    render(createElement(RefusalAlert, { errors: [{ message: 'The request could not be completed.' }], traceId: '0HN7abc' }));
    expect(screen.getByText('The request could not be completed.')).toBeInTheDocument();
    expect(screen.getByText(/0HN7abc/)).toBeInTheDocument();
    expect(screen.queryByText(/^[A-Z_]+$/)).toBeNull();
  });

  it('does not render an error that carries a field — the caller places it on that field', () => {
    render(createElement(RefusalAlert, { errors: [{ code: 'DUPLICATE_GROUP_CODE', message: 'Already in use.', field: 'code' }] }));
    expect(screen.queryByText('DUPLICATE_GROUP_CODE')).toBeNull();
  });

  it('renders nothing when every error carries a field', () => {
    const { container } = render(createElement(RefusalAlert, { errors: [{ code: 'X', message: 'Y', field: 'code' }] }));
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the retry affordance when one is passed', () => {
    render(createElement(RefusalAlert, { errors: [{ message: 'Timed out.' }], retry: createElement('button', null, 'Retry') }));
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('is announced as an alert, the service wording first and its code after it', () => {
    render(createElement(RefusalAlert, { errors: [{ code: 'INVALID_DATE_RANGE', message: 'The period is too wide' }] }));
    const alert = screen.getByRole('alert');
    expect(alert.querySelector('li')).toHaveTextContent(/^The period is too wide INVALID_DATE_RANGE$/);
    expect(screen.getByText('INVALID_DATE_RANGE')).toHaveClass('font-mono');
  });

  it('draws a line with no code as the wording alone', () => {
    render(createElement(RefusalAlert, { errors: [{ message: 'Ledger store unavailable' }] }));
    expect(screen.getByRole('alert').querySelector('li')).toHaveTextContent(/^Ledger store unavailable$/);
  });
});

describe('FailedRead', () => {
  it("states a refused read in the service's wording and code, with its trace and a Retry that tries again", () => {
    const onRetry = vi.fn();
    render(createElement(FailedRead, { error: new LedgerRefusalError('The period is too wide', 'INVALID_DATE_RANGE', 't-7'), onRetry }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('The period is too wide INVALID_DATE_RANGE');
    expect(alert).toHaveTextContent('Trace: t-7');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('states a read that never reached the service as such', () => {
    render(createElement(FailedRead, { error: new TypeError('Failed to fetch'), onRetry: vi.fn() }));
    expect(screen.getByRole('alert').querySelector('li')).toHaveTextContent(/^The ledger service cannot be reached\.$/);
  });
});
