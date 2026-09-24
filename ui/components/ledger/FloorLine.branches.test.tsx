import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { computeFloor, FloorLine } from './FloorLine';

describe('computeFloor — every row of the FloorPolicy table', () => {
  it('is 0.00 when not permitted to go negative and no minimum balance is set', () => {
    expect(computeFloor({ permittedToGoNegative: false, overdraftLimit: null, minimumBalance: null })).toBe(0);
  });

  it('is the minimum balance when not permitted to go negative and one is set', () => {
    expect(computeFloor({ permittedToGoNegative: false, overdraftLimit: null, minimumBalance: '250.00' })).toBe(250);
  });

  it('is minus the overdraft limit when permitted to go negative with a limit set', () => {
    expect(computeFloor({ permittedToGoNegative: true, overdraftLimit: '5000.00', minimumBalance: null })).toBe(-5000);
  });

  it('is null — invalid — when permitted to go negative with no overdraft limit', () => {
    expect(computeFloor({ permittedToGoNegative: true, overdraftLimit: null, minimumBalance: null })).toBeNull();
  });

  it('is 0.00 when the minimum balance is undefined, not just when it is null', () => {
    expect(computeFloor({ permittedToGoNegative: false, overdraftLimit: null, minimumBalance: undefined })).toBe(0);
  });

  it('is null — invalid — when the overdraft limit is undefined, not just when it is null', () => {
    expect(computeFloor({ permittedToGoNegative: true, overdraftLimit: undefined, minimumBalance: null })).toBeNull();
  });
});

describe('FloorLine — the invalid and minimum-balance states', () => {
  it('renders OVERDRAFT_LIMIT_REQUIRED instead of a number when the policy is invalid', () => {
    render(
      createElement(FloorLine, {
        account: { permittedToGoNegative: true, overdraftLimit: null, minimumBalance: null, currency: 'SGD' },
      }),
    );
    expect(screen.getByText(/OVERDRAFT_LIMIT_REQUIRED/)).toBeInTheDocument();
  });

  it('states the minimum balance as the floor, with no sign, when not permitted to go negative', () => {
    render(
      createElement(FloorLine, {
        account: { permittedToGoNegative: false, overdraftLimit: null, minimumBalance: '250.00', currency: 'SGD', decimalPlaces: 2 },
      }),
    );
    expect(screen.getByText('Floor 250.00 SGD — not permitted to go negative.')).toBeInTheDocument();
  });

  it('states a 0.00 floor with no sign at the zero boundary', () => {
    render(
      createElement(FloorLine, {
        account: { permittedToGoNegative: false, overdraftLimit: null, minimumBalance: null, currency: 'SGD', decimalPlaces: 2 },
      }),
    );
    expect(screen.getByText('Floor 0.00 SGD — not permitted to go negative.')).toBeInTheDocument();
  });

  it('states the overdraft limit detail phrase, with its own scale, when permitted to go negative', () => {
    render(
      createElement(FloorLine, {
        account: { permittedToGoNegative: true, overdraftLimit: '5000.00', minimumBalance: null, currency: 'SGD', decimalPlaces: 2 },
      }),
    );
    expect(
      screen.getByText('Floor −5,000.00 SGD — permitted to go negative, overdraft limit 5,000.00.'),
    ).toBeInTheDocument();
  });
});
