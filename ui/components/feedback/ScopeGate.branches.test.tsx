import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ScopeGate } from './ScopeGate';

describe('ScopeGate — granted', () => {
  it('defaults to not-granted when the prop is left unset', () => {
    render(createElement(ScopeGate, { scope: 'postings.reverse' }, createElement('button', { type: 'button' }, 'Reverse')));
    expect(screen.getByRole('button', { name: 'Reverse' })).toBeDisabled();
  });

  it('leaves the action enabled and shows no missing-scope caption when granted', () => {
    render(createElement(ScopeGate, { scope: 'postings.reverse', granted: true }, createElement('button', { type: 'button' }, 'Reverse')));
    const button = screen.getByRole('button', { name: 'Reverse' });
    expect(button).toBeEnabled();
    expect(screen.queryByText(/postings\.reverse/)).toBeNull();
  });

  it('lets a custom reason override the default caption', () => {
    render(
      createElement(
        ScopeGate,
        { scope: 'postings.reverse', granted: false, reason: 'Ask an admin.' },
        createElement('button', { type: 'button' }, 'Reverse'),
      ),
    );
    expect(screen.getByText('Ask an admin.')).toBeInTheDocument();
  });
});
