/**
 * DRK-1679 §5:
 *   Scenario: An identifier is drawn so two can be compared by eye
 *     Given the account numbers ACME-000123 and ACME-000128
 *     When the console draws them one under the other
 *     Then every character sits in a column of the same width
 *
 * A fixed-width (monospace) face is what puts every character in a column of the same
 * width — the design system's rule for comparing identifiers by eye (AccountNumber.d.ts).
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { AccountNumber } from './AccountNumber';

describe('An identifier is drawn so two can be compared by eye', () => {
  it('draws both account numbers in the same fixed-width font', () => {
    render(
      createElement('div', null, [
        createElement(AccountNumber, { value: 'ACME-000123', key: 'a' }),
        createElement(AccountNumber, { value: 'ACME-000128', key: 'b' }),
      ]),
    );
    const first = screen.getByText('ACME-000123');
    const second = screen.getByText('ACME-000128');
    const fontOf = (el: Element) => getComputedStyle(el).fontFamily;
    expect(fontOf(first)).toMatch(/mono/i);
    expect(fontOf(first)).toBe(fontOf(second));
  });
});
