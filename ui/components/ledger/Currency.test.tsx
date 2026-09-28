import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Currency, CURRENCY_COUNTRY } from './Currency';

describe('Currency', () => {
  it('shows the code with its exact flag emoji by default, wrapped in the expected layout', () => {
    const { container } = render(createElement(Currency, { code: 'SGD' }));
    expect(screen.getByText('SGD')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass('inline-flex', 'items-center', 'gap-1');
    const flag = container.querySelector('[aria-hidden="true"]');
    expect(flag?.getAttribute('data-flag')).toBe('\u{1f1f8}\u{1f1ec}');
    expect(container.textContent, 'the flag is drawn, never part of the text').toBe('SGD');
  });

  it('shows the EU flag for EUR, and the generic currency icon for a code with no country', () => {
    const eur = render(createElement(Currency, { code: 'EUR' }));
    expect(eur.container.querySelector('[aria-hidden="true"]')?.getAttribute('data-flag')).toBe('\u{1f1ea}\u{1f1fa}');
    eur.unmount();
    for (const code of ['USDT', 'XAU', 'XOF']) {
      const { container, unmount } = render(createElement(Currency, { code }));
      const mark = container.querySelector('[aria-hidden="true"]');
      expect(mark?.hasAttribute('data-flag'), code).toBe(false);
      expect(mark?.querySelector('svg'), code).not.toBeNull();
      expect(container.textContent, 'the icon is never part of the text').toBe(code);
      unmount();
    }
  });

  it('flags every national currency by the country its code is built from', () => {
    expect(CURRENCY_COUNTRY.KRW).toBe('KR');
    expect(CURRENCY_COUNTRY.CHF).toBe('CH');
    expect(Object.keys(CURRENCY_COUNTRY)).toHaveLength(151);
    for (const [code, country] of Object.entries(CURRENCY_COUNTRY)) if (code !== 'EUR') expect(code).toMatch(new RegExp(`^${country}[A-Z]$`));
  });

  it('omits the flag slot entirely when showFlag is false', () => {
    render(createElement(Currency, { code: 'SGD', showFlag: false }));
    const code = screen.getByText('SGD');
    expect(code.parentElement?.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
