/**
 * pr-reviewer finding 2 (DRK-1687, round 1) — `FloorLine` routed the service's own `floor`
 * text through `Number`, losing digits past `Number.MAX_SAFE_INTEGER`. The frozen
 * `FloorLine.service-formula.test.tsx:28` case (`'-5000.00'`) survives that round-trip
 * unchanged, so it does not discriminate (finding 6). This canary does: it fails against
 * `d27fb448` (renders `...994.00`, the last two digits and one unit lost) and passes once the
 * `floor` prop is kept as a string end to end.
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { FloorLine } from './FloorLine';

describe('FloorLine — the service’s own floor survives past Number.MAX_SAFE_INTEGER', () => {
  it('renders every digit of a floor too large for a double to round-trip exactly', () => {
    render(
      createElement(FloorLine, {
        account: { permittedToGoNegative: false, overdraftLimit: null, minimumBalance: '0.00', currency: 'SGD', decimalPlaces: 2 },
        floor: '-9007199254740993.75',
      }),
    );
    expect(screen.getByText(/−9,007,199,254,740,993\.75/)).toBeInTheDocument();
  });
});
