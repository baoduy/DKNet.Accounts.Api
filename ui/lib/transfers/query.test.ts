/**
 * DRK-2325 R2, R3, §6a D1/D4 — the transfer list's query builder: the period's UTC window, the
 * search minimum of 2, and the sort and page always sent. Expected values are the spec's literals.
 */
import { describe, expect, it } from 'vitest';
import { toTransfersQuery, transferPeriod, type TransfersListState } from './query';

const NOW = new Date('2026-10-19T10:00:00Z');
const DEFAULTS: TransfersListState = { period: '1y', orderBy: 'RecordedAt', desc: true, pageNumber: 1, pageSize: 10 };

describe('transferPeriod', () => {
  it.each([
    { value: '30d', expected: '30d' },
    { value: '90d', expected: '90d' },
    { value: '1y', expected: '1y' },
    { value: undefined, expected: '1y' },
    { value: null, expected: '1y' },
    { value: '7d', expected: '1y' },
    { value: 'forever', expected: '1y' },
  ])('"$value" reads as $expected', ({ value, expected }) => {
    expect(transferPeriod(value)).toBe(expected);
  });
});

describe('toTransfersQuery', () => {
  it('Last 1 year sends no window, newest first, page 1 of 10', () => {
    expect(toTransfersQuery(DEFAULTS, NOW)?.toString()).toBe('orderBy=RecordedAt&desc=true&pageNumber=1&pageSize=10');
  });

  it('an unknown period sends no window, as Last 1 year does', () => {
    expect(toTransfersQuery({ ...DEFAULTS, period: '7d' }, NOW)?.toString()).toBe('orderBy=RecordedAt&desc=true&pageNumber=1&pageSize=10');
  });

  it.each([
    { period: '30d', now: '2026-10-19T10:00:00Z', from: '2026-09-19', to: '2026-10-19' },
    { period: '90d', now: '2026-10-19T10:00:00Z', from: '2026-07-21', to: '2026-10-19' },
    { period: '30d', now: '2026-10-19T23:30:00Z', from: '2026-09-19', to: '2026-10-19' },
  ])('$period at $now reads from $from to $to', ({ period, now, from, to }) => {
    const query = toTransfersQuery({ ...DEFAULTS, period }, new Date(now))!;

    expect(query.get('from')).toBe(from);
    expect(query.get('to')).toBe(to);
  });

  it.each([
    { search: '', expected: null },
    { search: 'pa', expected: 'pa' },
    { search: 'Pa', expected: 'Pa' },
  ])('search "$search" sends search=$expected', ({ search, expected }) => {
    expect(toTransfersQuery({ ...DEFAULTS, search }, NOW)!.get('search')).toBe(expected);
  });

  it('a search of 1 character makes no query', () => {
    expect(toTransfersQuery({ ...DEFAULTS, search: 'p' }, NOW)).toBeNull();
  });

  it('sends the sort ascending and the page asked for', () => {
    expect(toTransfersQuery({ ...DEFAULTS, orderBy: 'Fee', desc: false, pageNumber: 3, pageSize: 25 }, NOW)?.toString()).toBe('orderBy=Fee&desc=false&pageNumber=3&pageSize=25');
  });
});
