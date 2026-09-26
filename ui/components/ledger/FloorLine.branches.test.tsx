import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { FloorLine } from './FloorLine';

describe('FloorLine — the service’s floor, its absence and its failure', () => {
  it('draws a placeholder, not a figure, while the balance read has not answered', () => {
    const { container } = render(
      createElement(FloorLine, {
        account: { permittedToGoNegative: true, overdraftLimit: '5000.00', minimumBalance: null, currency: 'SGD', decimalPlaces: 2 },
      }),
    );
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(container).not.toHaveTextContent(/Floor/);
  });

  it('states the floor unavailable, with no figure, when the balance read failed', () => {
    const { container } = render(
      createElement(FloorLine, {
        account: { permittedToGoNegative: true, overdraftLimit: '5000.00', minimumBalance: null, currency: 'SGD', decimalPlaces: 2 },
        failed: true,
      }),
    );
    expect(container).toHaveTextContent(/^Floor unavailable — the balance could not be read\.$/);
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  it('draws the service’s floor even once a later read failed', () => {
    render(
      createElement(FloorLine, {
        account: { permittedToGoNegative: false, overdraftLimit: null, minimumBalance: '250.00', currency: 'SGD', decimalPlaces: 2 },
        floor: '250.00',
        failed: true,
      }),
    );
    expect(screen.getByText('Floor 250.00 SGD — not permitted to go negative.')).toBeInTheDocument();
  });

  it('states the minimum balance as the floor, with no sign, when not permitted to go negative', () => {
    render(
      createElement(FloorLine, {
        account: { permittedToGoNegative: false, overdraftLimit: null, minimumBalance: '250.00', currency: 'SGD', decimalPlaces: 2 },
        floor: '250.00',
      }),
    );
    expect(screen.getByText('Floor 250.00 SGD — not permitted to go negative.')).toBeInTheDocument();
  });

  it('states a 0.00 floor with no sign at the zero boundary', () => {
    render(
      createElement(FloorLine, {
        account: { permittedToGoNegative: false, overdraftLimit: null, minimumBalance: null, currency: 'SGD', decimalPlaces: 2 },
        floor: '0.00',
      }),
    );
    expect(screen.getByText('Floor 0.00 SGD — not permitted to go negative.')).toBeInTheDocument();
  });

  it('states the overdraft limit detail phrase, with its own scale, when permitted to go negative', () => {
    render(
      createElement(FloorLine, {
        account: { permittedToGoNegative: true, overdraftLimit: '5000.00', minimumBalance: null, currency: 'SGD', decimalPlaces: 2 },
        floor: '-5000.00',
      }),
    );
    expect(screen.getByText('Floor −5,000.00 SGD — permitted to go negative, overdraft limit 5,000.00.')).toBeInTheDocument();
  });
});
