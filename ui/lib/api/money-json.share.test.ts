import { describe, expect, it } from 'vitest';
import { fractionDigitsOf, shareBasisPoints } from './money-json';

describe('shareBasisPoints', () => {
  it('gives available 1,200.50 of 1,250.50 as 96.00%', () => {
    expect(shareBasisPoints('1200.50', '50.00')).toBe(9600);
  });

  it('rounds down to the basis point', () => {
    expect(shareBasisPoints('2', '1')).toBe(6666);
  });

  it('compares amounts written to different decimal places', () => {
    expect(shareBasisPoints('1.5', '0.50')).toBe(7500);
    expect(shareBasisPoints('10', '0.000001')).toBe(9999);
  });

  it('gives everything to the part when nothing is held', () => {
    expect(shareBasisPoints('500000', '0')).toBe(10000);
  });

  it('gives nothing to the part when everything is held', () => {
    expect(shareBasisPoints('0', '25.00')).toBe(0);
  });

  it('keeps every digit of amounts past 2^53', () => {
    expect(shareBasisPoints('9007199254740993', '9007199254740993')).toBe(5000);
  });

  it('counts a negative amount as nothing', () => {
    expect(shareBasisPoints('-10.00', '5.00')).toBe(0);
    expect(shareBasisPoints('5.00', '-10.00')).toBe(10000);
  });

  it('has no share when there is nothing to share', () => {
    expect(shareBasisPoints('0.00', '0')).toBeNull();
    expect(shareBasisPoints('-1', '0')).toBeNull();
  });

  it('reads an explicit plus sign and a missing whole part', () => {
    expect(shareBasisPoints('+.5', '.5')).toBe(5000);
  });
});

describe('fractionDigitsOf', () => {
  it('counts the digits after the decimal point', () => {
    expect(fractionDigitsOf('10.123456')).toBe(6);
    expect(fractionDigitsOf('500000')).toBe(0);
    expect(fractionDigitsOf('0.5')).toBe(1);
    expect(fractionDigitsOf('.5')).toBe(1);
  });
});
