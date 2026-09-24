/**
 * Mutation-coverage companion to the frozen `postings-filter.test.ts` (DRK-1702 row owed:
 * `postings-filter.ts` mutation score below 80%). Each test names the mutant it kills.
 */
import { describe, expect, it } from 'vitest';
import { defaultPostingsFilter, postingPeriodError, toPostingsQuery, type PostingsFilterState } from './postings-filter';

const BASE: PostingsFilterState = { from: '2026-01-01', to: '2026-01-31', direction: '', category: '', status: '' };

describe('toPostingsQuery', () => {
  it('returns null for a period one day over the 90-day maximum (kills the > to >= boundary mutant)', () => {
    expect(toPostingsQuery('a1', { ...BASE, from: '2026-01-01', to: '2026-04-02' })).toBeNull();
  });

  it('returns a query for a period at exactly the 90-day maximum (kills the > to >= boundary mutant)', () => {
    expect(toPostingsQuery('a1', { ...BASE, from: '2026-01-01', to: '2026-04-01' })).not.toBeNull();
  });

  it('always sets accountId, from and to, even with no narrowing chosen', () => {
    const params = toPostingsQuery('a1', BASE)!;
    expect(params.get('accountId')).toBe('a1');
    expect(params.get('from')).toBe('2026-01-01');
    expect(params.get('to')).toBe('2026-01-31');
  });

  it('omits direction when unchosen (kills the falsy-check-removed mutant)', () => {
    expect(toPostingsQuery('a1', BASE)!.has('direction')).toBe(false);
  });

  it('sets direction when chosen (kills the condition-negated mutant)', () => {
    expect(toPostingsQuery('a1', { ...BASE, direction: 'Credit' })!.get('direction')).toBe('Credit');
  });

  it('omits category when unchosen (kills the falsy-check-removed mutant)', () => {
    expect(toPostingsQuery('a1', BASE)!.has('category')).toBe(false);
  });

  it('sets category when chosen (kills the condition-negated mutant)', () => {
    expect(toPostingsQuery('a1', { ...BASE, category: 'Fee' })!.get('category')).toBe('Fee');
  });

  it('omits status when unchosen (kills the falsy-check-removed mutant)', () => {
    expect(toPostingsQuery('a1', BASE)!.has('status')).toBe(false);
  });

  it('sets status when chosen (kills the condition-negated mutant)', () => {
    expect(toPostingsQuery('a1', { ...BASE, status: 'Reversed' })!.get('status')).toBe('Reversed');
  });

  it('omits pageSize when not passed (kills the undefined-check-removed mutant)', () => {
    expect(toPostingsQuery('a1', BASE)!.has('pageSize')).toBe(false);
  });

  it('sets pageSize=0 when explicitly passed (kills the undefined-check-to-truthy-check mutant)', () => {
    expect(toPostingsQuery('a1', BASE, 0)!.get('pageSize')).toBe('0');
  });

  it('carries a given pageSize', () => {
    expect(toPostingsQuery('a1', BASE, 20)!.get('pageSize')).toBe('20');
  });
});

describe('postingPeriodError — unset, unparseable and inverted periods (DRK-1704 finding 14)', () => {
  it('refuses an empty from', () => {
    expect(postingPeriodError('', '2026-01-31')).toBe('A period must be set.');
  });

  it('refuses an empty to', () => {
    expect(postingPeriodError('2026-01-01', '')).toBe('A period must be set.');
  });

  it('refuses an unparseable date', () => {
    expect(postingPeriodError('not-a-date', '2026-01-31')).toBe('A period must be set.');
  });

  it('refuses an inverted period (from after to)', () => {
    expect(postingPeriodError('2026-01-31', '2026-01-01')).toBe('The period start must not be after its end.');
  });

  it('accepts from equal to to (a one-day period)', () => {
    expect(postingPeriodError('2026-01-01', '2026-01-01')).toBeNull();
  });
});

describe('toPostingsQuery — unset and inverted periods make no call (DRK-1704 finding 1/14)', () => {
  it('returns null for an empty period', () => {
    expect(toPostingsQuery('a1', { ...BASE, from: '', to: '' })).toBeNull();
  });

  it('returns null for an inverted period', () => {
    expect(toPostingsQuery('a1', { ...BASE, from: '2026-01-31', to: '2026-01-01' })).toBeNull();
  });
});

describe('defaultPostingsFilter', () => {
  it('opens exactly 30 days before the injected now, both date-only (kills the arithmetic and slice-boundary mutants)', () => {
    const filter = defaultPostingsFilter(new Date('2026-09-24T15:30:00.000Z'));
    expect(filter.from).toBe('2026-08-25');
    expect(filter.to).toBe('2026-09-24');
  });

  it('leaves direction, category and status unset', () => {
    const filter = defaultPostingsFilter(new Date('2026-09-24T15:30:00.000Z'));
    expect(filter.direction).toBe('');
    expect(filter.category).toBe('');
    expect(filter.status).toBe('');
  });
});
