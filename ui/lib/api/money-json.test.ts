import { describe, expect, it } from 'vitest';
import { isZeroAmount, parseLedgerJsonPreservingNumbers, readLedgerJson } from './money-json';

describe('parseLedgerJsonPreservingNumbers', () => {
  it('ends an exponent at the first non-digit, keeping the next member intact', () => {
    expect(parseLedgerJsonPreservingNumbers('{"a":1e5,"b":2,"c":1E-5}')).toEqual({ a: '1e5', b: '2', c: '1E-5' });
  });

  it('keeps every digit of a number past 2^53, as a string', () => {
    const parsed = parseLedgerJsonPreservingNumbers('{"balance":9007199254740993.01}') as { balance: unknown };
    expect(parsed.balance).toBe('9007199254740993.01');
    expect(typeof parsed.balance).toBe('string');
  });

  it('routing the same text through JSON.parse loses the last two digits (the bug this guards against)', () => {
    const viaNativeParse = (JSON.parse('{"balance":9007199254740993.01}') as { balance: number }).balance;
    expect(String(viaNativeParse)).not.toBe('9007199254740993.01');
  });

  it('keeps a whole number with no decimal point as its exact text', () => {
    expect(parseLedgerJsonPreservingNumbers('{"balance":1250}')).toEqual({ balance: '1250' });
  });

  it('keeps a negative number and a small fraction as their exact text', () => {
    expect(parseLedgerJsonPreservingNumbers('{"balance":-0.005}')).toEqual({ balance: '-0.005' });
  });

  it('keeps a fraction ending in the digit 9 as its exact text', () => {
    expect(parseLedgerJsonPreservingNumbers('{"balance":12.39}')).toEqual({ balance: '12.39' });
  });

  it('keeps a number in exponent notation as its exact text', () => {
    expect(parseLedgerJsonPreservingNumbers('{"balance":1.5e10}')).toEqual({ balance: '1.5e10' });
  });

  it('keeps a number with a signed exponent as its exact text', () => {
    expect(parseLedgerJsonPreservingNumbers('{"balance":1.5E-10}')).toEqual({ balance: '1.5E-10' });
  });

  it('keeps a number with an explicit-plus exponent as its exact text', () => {
    expect(parseLedgerJsonPreservingNumbers('{"balance":1.5e+10}')).toEqual({ balance: '1.5e+10' });
  });

  it('keeps a number with an exponent ending in the digit 9 as its exact text', () => {
    expect(parseLedgerJsonPreservingNumbers('{"balance":1.5e19}')).toEqual({ balance: '1.5e19' });
  });

  it('never mistakes a digit inside a string for a number literal', () => {
    expect(parseLedgerJsonPreservingNumbers('{"message":"Code 123 is already registered."}')).toEqual({
      message: 'Code 123 is already registered.',
    });
  });

  it('parses numbers nested inside arrays and objects alike', () => {
    expect(parseLedgerJsonPreservingNumbers('[{"balance":1.50},{"balance":2}]')).toEqual([{ balance: '1.50' }, { balance: '2' }]);
  });

  it('leaves booleans, null and ordinary strings untouched', () => {
    expect(parseLedgerJsonPreservingNumbers('{"isActive":true,"note":null,"code":"SGD"}')).toEqual({
      isActive: true,
      note: null,
      code: 'SGD',
    });
  });

  it('round-trips an escaped quote inside a string without treating it as string end', () => {
    expect(parseLedgerJsonPreservingNumbers('{"message":"She said \\"123\\" out loud"}')).toEqual({
      message: 'She said "123" out loud',
    });
  });
});

describe('isZeroAmount', () => {
  it('is true for zero, with or without a sign or a decimal tail of zeros', () => {
    expect(isZeroAmount('0')).toBe(true);
    expect(isZeroAmount('-0')).toBe(true);
    expect(isZeroAmount('+0.0')).toBe(true);
    expect(isZeroAmount('0.00')).toBe(true);
  });

  it('is false for a non-zero amount, including one that merely starts with 0', () => {
    expect(isZeroAmount('0.01')).toBe(false);
    expect(isZeroAmount('10')).toBe(false);
    expect(isZeroAmount('01')).toBe(false);
  });
});

describe('readLedgerJson', () => {
  it('reads the response body as text before parsing it, preserving a large balance', async () => {
    const response = new Response('{"balance":9007199254740993.01}');
    await expect(readLedgerJson(response)).resolves.toEqual({ balance: '9007199254740993.01' });
  });

  it('reads a 204 No Content response as null instead of a JSON.parse syntax error', async () => {
    const response = new Response(null, { status: 204 });
    await expect(readLedgerJson(response)).resolves.toBeNull();
  });
});
