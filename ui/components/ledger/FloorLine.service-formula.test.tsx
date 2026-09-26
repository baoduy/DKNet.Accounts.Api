/**
 * DRK-1684 §3 row 11c — the pass-through of the service's own `floor` value. DRK-1760 §3 row 11
 * removed the browser's own `computeFloor` (and its cases here): the service's figure is the only
 * one `FloorLine` draws.
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { FloorLine } from './FloorLine';

describe('FloorLine — renders the service’s own floor when given one (row 11c)', () => {
  it('renders the exact `floor` prop text, not a locally recomputed value', () => {
    render(
      createElement(FloorLine, {
        account: { permittedToGoNegative: false, overdraftLimit: null, minimumBalance: '0.00', currency: 'SGD', decimalPlaces: 2 },
        floor: '-5000.00',
      }),
    );
    // The minus character (U+2212), never a hyphen (U+002D) — "Must stay true" on the spec's
    // own list — which is exactly the conversion a service value arriving as the hyphen
    // `'-5000.00'` needs `FloorLine` to make.
    expect(screen.getByText(/−5,000\.00/)).toBeInTheDocument();
  });
});
