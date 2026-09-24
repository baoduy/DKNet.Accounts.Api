import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { RefusalAlert } from './RefusalAlert';

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
});
