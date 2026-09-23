/**
 * DRK-1684 §3 rows 11b/11c — `computeFloor` diverges from the service's own
 * `AccountFloorPolicy.Floor` (`ApiEndpoints/DKNet.Accounts.Domains/Features/Accounts/
 * Entities/AccountFloorPolicy.cs:32-34`) in two operator-visible ways: it ignores
 * `minimumBalance` whenever `permittedToGoNegative` is true, and never clamps a negative
 * `minimumBalance` to 0 when it is false. These tests pin the service's own formula —
 * `Math.max(-overdraftLimit, minimumBalance ?? MinValue)` / `Math.max(0, minimumBalance ??
 * 0)` — and the pass-through of the service's own `floor` value (row 11c). Not implemented
 * yet: `computeFloor` still uses the old formula and `FloorLine` does not yet read `floor`.
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { computeFloor, FloorLine } from './FloorLine';

describe('computeFloor — corrected to the service formula (row 11b)', () => {
  it('is the minimum balance, not minus the overdraft limit, when both controls are set (README.md example)', () => {
    // permitted to go negative, minimumBalance 50.00, overdraftLimit 20.00 -> floor 50.00, not -20.00.
    expect(computeFloor({ permittedToGoNegative: true, overdraftLimit: '20.00', minimumBalance: '50.00' })).toBe(50);
  });

  it('clamps a negative minimum balance to 0 when not permitted to go negative', () => {
    expect(computeFloor({ permittedToGoNegative: false, overdraftLimit: null, minimumBalance: '-10.00' })).toBe(0);
  });
});

describe('FloorLine — renders the service’s own floor when given one (row 11c)', () => {
  it('renders the exact `floor` prop text, not a locally recomputed value', () => {
    render(
      createElement(FloorLine, {
        account: { permittedToGoNegative: false, overdraftLimit: null, minimumBalance: '0.00', currency: 'SGD', decimalPlaces: 2 },
        floor: '-5000.00',
      }),
    );
    expect(screen.getByText(/-5,000\.00|−5,000\.00/)).toBeInTheDocument();
  });
});
