/**
 * DRK-2325 §6a D5/D6 — `estimateConverted`, the confirm step's exact estimate. Expected values are
 * the spec's own literals, plus the rounding edges the rule names (half away from zero).
 */
import { describe, expect, it } from 'vitest';
import { estimateConverted } from './estimate';

describe('estimateConverted', () => {
  it.each([
    { amount: '100.00', fee: '2.00', rate: '0.74', places: 2, expected: '72.52' },
    { amount: '1.00', fee: '0', rate: '1.005', places: 2, expected: '1.01' },
    { amount: '10.00', fee: '0', rate: '113.55', places: 0, expected: '1136' },
    { amount: '100.00', fee: '1.00', rate: null, places: 2, expected: '99.00' },
    { amount: '1.00', fee: '0', rate: '1.004', places: 2, expected: '1.00' },
    { amount: '5', fee: '0', rate: '2', places: 2, expected: '10.00' },
    { amount: '0.5', fee: '0', rate: null, places: 0, expected: '1' },
    { amount: '0.4', fee: '0', rate: null, places: 0, expected: '0' },
    { amount: '0.05', fee: '0.10', rate: '1', places: 1, expected: '-0.1' },
    { amount: '0.05', fee: '0.09', rate: '1', places: 1, expected: '0.0' },
    { amount: '123456789012.345678', fee: '0.000000', rate: '2.5', places: 2, expected: '308641972530.86' },
  ])('($amount − $fee) × $rate at $places places is $expected', ({ amount, fee, rate, places, expected }) => {
    expect(estimateConverted(amount, fee, rate, places)).toBe(expected);
  });

  it.each([
    { amount: 'abc', fee: '0', rate: '0.74' },
    { amount: '100.00', fee: '', rate: '0.74' },
    { amount: '100.00', fee: '0', rate: 'x' },
    { amount: '100.00', fee: '0', rate: '' },
    { amount: '.5', fee: '0', rate: null },
    { amount: '5.', fee: '0', rate: null },
    { amount: '1.2.3', fee: '0', rate: null },
    { amount: '1e5', fee: '0', rate: null },
    { amount: '-1.00', fee: '0', rate: null },
    { amount: ' 1.00', fee: '0', rate: null },
  ])('no estimate for amount "$amount", fee "$fee", rate "$rate"', ({ amount, fee, rate }) => {
    expect(estimateConverted(amount, fee, rate, 2)).toBeNull();
  });
});
