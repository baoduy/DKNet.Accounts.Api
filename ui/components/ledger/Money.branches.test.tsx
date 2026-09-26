import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { formatAmount, Money } from './Money';

describe('Money — branches not covered by the frozen acceptance tests', () => {
  it('shows an explicit + when signed and the amount is not negative', () => {
    render(createElement(Money, { amount: '100.00', decimalPlaces: 2, signed: true }));
    expect(screen.getByText('+100.00')).toBeInTheDocument();
  });

  it('shows no sign when not signed and the amount is not negative', () => {
    render(createElement(Money, { amount: '100.00', decimalPlaces: 2 }));
    expect(screen.getByText('100.00')).toBeInTheDocument();
  });

  it('appends the currency code when showCurrency is set', () => {
    render(createElement(Money, { amount: '100.00', currency: 'SGD', decimalPlaces: 2, showCurrency: true }));
    expect(screen.getByText('100.00 SGD')).toBeInTheDocument();
  });

  it('applies the reversed tone and a strikethrough when struck', () => {
    render(createElement(Money, { amount: '100.00', decimalPlaces: 2, struck: true }));
    expect(screen.getByText('100.00')).toHaveClass('text-reversed', 'line-through');
  });

  it('lets an explicit tone override the sign-derived colour', () => {
    render(createElement(Money, { amount: '100.00', decimalPlaces: 2, tone: 'debit' }));
    expect(screen.getByText('100.00')).toHaveClass('text-debit');
  });

  it('defaults a negative amount to the debit tone', () => {
    render(createElement(Money, { amount: '-100.00', decimalPlaces: 2 }));
    expect(screen.getByText('−100.00')).toHaveClass('text-debit');
  });

  it('renders the tile size at the tile amount scale', () => {
    render(createElement(Money, { amount: '100.00', decimalPlaces: 2, size: 'tile' }));
    expect(screen.getByText('100.00')).toHaveClass('text-tile-amount');
  });

  it('aligns left when asked', () => {
    render(createElement(Money, { amount: '100.00', decimalPlaces: 2, align: 'left' }));
    expect(screen.getByText('100.00')).toHaveClass('text-left');
  });

  it('accepts a numeric amount', () => {
    render(createElement(Money, { amount: -50, decimalPlaces: 2 }));
    expect(screen.getByText('−50.00')).toBeInTheDocument();
  });

  it('defaults to the credit tone, row size, tabular numerals and no forced alignment', () => {
    render(createElement(Money, { amount: '100.00', decimalPlaces: 2 }));
    const el = screen.getByText('100.00');
    expect(el.className).toBe('tabular-nums text-amount text-credit');
  });

  it('carries the exact class set for a struck, right-aligned tile amount', () => {
    render(createElement(Money, { amount: '100.00', decimalPlaces: 2, struck: true, align: 'right', size: 'tile' }));
    const el = screen.getByText('100.00');
    expect(el.className).toBe('tabular-nums text-tile-amount text-right text-reversed line-through');
  });

  it('pads a fractional amount shorter than the currency scale, not one exactly matching it', () => {
    expect(formatAmount('1.5', 2)).toBe('1.50');
    expect(formatAmount('1.50', 2)).toBe('1.50');
  });

  it('groups and pads a numeric (not string) amount the same way', () => {
    expect(formatAmount(1204882.5, 2)).toBe('1,204,882.50');
  });

  it('treats a non-negative numeric amount as not negative, at the zero boundary', () => {
    render(createElement(Money, { amount: 0, decimalPlaces: 2 }));
    expect(screen.getByText('0.00')).toBeInTheDocument();
    expect(screen.queryByText('−0.00')).toBeNull();
  });

  it('trims a leading + before measuring the fraction, not a trailing one', () => {
    expect(formatAmount('+100.5', 2)).toBe('100.50');
  });

  it('trims surrounding whitespace from a string amount before formatting', () => {
    expect(formatAmount(' 100.00 ', 2)).toBe('100.00');
  });

  it('trims surrounding whitespace before detecting a leading minus', () => {
    render(createElement(Money, { amount: ' -50.00 ', decimalPlaces: 2 }));
    expect(screen.getByText('−50.00')).toHaveClass('text-debit');
  });
});
