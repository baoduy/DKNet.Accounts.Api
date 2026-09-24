import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { STATUS_TONE, StatusBadge } from './StatusBadge';

const BASE_CLASS = 'inline-flex w-fit items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap';

const TONE_CLASS: Record<string, string> = {
  credit: 'bg-badge-credit-bg text-badge-credit-fg',
  debit: 'bg-badge-debit-bg text-badge-debit-fg',
  warning: 'bg-badge-warning-bg text-badge-warning-fg',
  info: 'bg-badge-info-bg text-badge-info-fg',
  neutral: 'bg-badge-neutral-bg text-badge-neutral-fg',
};

describe('StatusBadge', () => {
  it('renders the status word and the exact tone class for every mapped status', () => {
    for (const [status, tone] of Object.entries(STATUS_TONE)) {
      const { unmount } = render(createElement(StatusBadge, { status }));
      expect(screen.getByText(status).className).toBe(`${BASE_CLASS} ${TONE_CLASS[tone]}`);
      unmount();
    }
  });

  it('falls back to neutral tone for a status not in the map', () => {
    render(createElement(StatusBadge, { status: 'Unknown' }));
    expect(screen.getByText('Unknown').className).toBe(`${BASE_CLASS} ${TONE_CLASS.neutral}`);
  });

  it('lets an explicit tone override the status map', () => {
    render(createElement(StatusBadge, { status: 'Active', tone: 'debit' }));
    expect(screen.getByText('Active').className).toBe(`${BASE_CLASS} ${TONE_CLASS.debit}`);
  });
});
