/**
 * DRK-1696 §5 rule R1 — "No money figure passes through a number type in the browser, on
 * either screen" proven at the parsing layer itself, not only on a screen: `JSON.parse`
 * routes every numeric literal through a JS `number`, which loses digits past
 * `Number.MAX_SAFE_INTEGER` — a real money figure the fake ledger service now serializes
 * (DRK-1696 §3 row 1). `parseLedgerJson` must read a money field's digits back as text,
 * whatever key it sits under, not just the ones a specific screen happens to draw.
 *
 * RED today: `lib/api/json.ts` does not exist.
 */
import { describe, expect, it } from 'vitest';
import { parseLedgerJson } from './json';

describe('parseLedgerJson — a numeric literal keeps every digit, never routed through Number', () => {
  it('keeps every digit of a balance past Number.MAX_SAFE_INTEGER', () => {
    const parsed = parseLedgerJson('{"currency":"SGD","balance":9007199254740993.75}') as { balance: string };
    expect(parsed.balance).toBe('9007199254740993.75');
  });

  it('proves the rule fails through plain JSON.parse (the regression this parser exists to prevent)', () => {
    const parsed = JSON.parse('{"balance":9007199254740993.75}') as { balance: number };
    expect(String(parsed.balance)).not.toBe('9007199254740993.75');
  });

  it('keeps digits at whatever key the number sits under, not only "balance"', () => {
    const parsed = parseLedgerJson('{"floor":-9007199254740993.75,"amount":318.004}') as { floor: string; amount: string };
    expect(parsed.floor).toBe('-9007199254740993.75');
    expect(parsed.amount).toBe('318.004');
  });

  it('leaves a string and a boolean untouched — only numeric literals are read back as text', () => {
    const parsed = parseLedgerJson('{"status":"Active","permittedToGoNegative":true}') as { status: string; permittedToGoNegative: boolean };
    expect(parsed.status).toBe('Active');
    expect(parsed.permittedToGoNegative).toBe(true);
  });
});
