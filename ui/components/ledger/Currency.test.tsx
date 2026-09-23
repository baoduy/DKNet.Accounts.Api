import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Currency } from './Currency';

describe('Currency', () => {
  it('shows the code with its exact flag emoji by default, wrapped in the expected layout', () => {
    const { container } = render(createElement(Currency, { code: 'SGD' }));
    expect(screen.getByText('SGD')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass('inline-flex', 'items-center', 'gap-1');
    const flag = container.querySelector('[aria-hidden="true"]');
    expect(flag?.textContent).toBe('\u{1f1f8}\u{1f1ec}');
  });

  it('shows an empty reserved slot for a code with no country, never a substitute glyph', () => {
    const { container } = render(createElement(Currency, { code: 'XAU' }));
    expect(screen.getByText('XAU')).toBeInTheDocument();
    const flag = container.querySelector('[aria-hidden="true"]');
    expect(flag?.textContent).toBe('');
  });

  it('omits the flag slot entirely when showFlag is false', () => {
    render(createElement(Currency, { code: 'SGD', showFlag: false }));
    const code = screen.getByText('SGD');
    expect(code.parentElement?.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
