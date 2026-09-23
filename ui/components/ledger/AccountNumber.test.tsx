/**
 * DRK-1679 §5:
 *   Scenario: An identifier is drawn so two can be compared by eye
 *     Given the account numbers ACME-000123 and ACME-000128
 *     When the console draws them one under the other
 *     Then every character sits in a column of the same width
 *
 * A fixed-width (monospace) face is what puts every character in a column of the same
 * width — the design system's rule for comparing identifiers by eye (AccountNumber.d.ts).
 *
 * Asserted as the `font-mono` class, not a computed `fontFamily`: nothing imports
 * `globals.css` and Tailwind utilities aren't generated in the Vitest pipeline, so a
 * class-based mono face resolves to an empty computed `fontFamily` under jsdom — the
 * only way to make a computed-style assertion green is an inline `style` restating the
 * token, which R3 and `ui/oxlint-plugins/design-system.js` forbid. `Id.tsx` (the sibling
 * fixed-width control, DRK-1680) sets the precedent: `font-mono` via `className`.
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { AccountNumber } from './AccountNumber';

describe('An identifier is drawn so two can be compared by eye', () => {
  it('draws both account numbers with the same fixed-width class', () => {
    render(
      createElement('div', null, [
        createElement(AccountNumber, { value: 'ACME-000123', key: 'a' }),
        createElement(AccountNumber, { value: 'ACME-000128', key: 'b' }),
      ]),
    );
    const first = screen.getByText('ACME-000123');
    const second = screen.getByText('ACME-000128');
    expect(first).toHaveClass('font-mono');
    expect(second).toHaveClass('font-mono');
  });
});
