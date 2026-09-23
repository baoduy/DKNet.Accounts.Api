/**
 * DRK-1679 §5:
 *   Scenario Outline: An amount is drawn at its own currency's scale
 *   Scenario: A negative amount uses the minus character
 *   Scenario: An amount keeps every digit the service sent
 *
 * `9007199254740993.75` exceeds IEEE-754 double precision (DRK-1682 §7 slice note):
 * the amount is passed and asserted as a string end to end, never through `Number`.
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { formatAmount, Money } from './Money';

describe('An amount is drawn at its own currency\'s scale', () => {
  it.each([
    { currency: 'JPY', places: 0, amount: '44120000', shown: '44,120,000' },
    // Unpadded on purpose: proves formatAmount pads to the currency's scale, not just formats.
    { currency: 'SGD', places: 2, amount: '1204882.5', shown: '1,204,882.50' },
    { currency: 'BHD', places: 3, amount: '318.004', shown: '318.004' },
  ])('$currency at $places decimal places shows $shown', ({ places, amount, shown }) => {
    expect(formatAmount(amount, places)).toBe(shown);
  });
});

describe('A negative amount uses the minus character', () => {
  it('shows the minus character, never a hyphen, before the digits', () => {
    render(createElement(Money, { amount: '-892.45', currency: 'SGD', decimalPlaces: 2, signed: true }));
    // U+2212 MINUS SIGN, not U+002D HYPHEN-MINUS.
    expect(screen.getByText('−892.45')).toBeInTheDocument();
    expect(screen.queryByText('-892.45')).toBeNull();
  });
});

describe('An amount keeps every digit the service sent', () => {
  it('carries the amount as the exact string the service sent, past double precision', () => {
    render(createElement(Money, { amount: '9007199254740993.75', currency: 'SGD', decimalPlaces: 2 }));
    expect(screen.getByText('9,007,199,254,740,993.75')).toBeInTheDocument();
  });
});
