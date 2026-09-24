/**
 * DRK-1696 §5:
 *   Scenario: A period wider than the service accepts is refused before it is sent
 *     Given the operator Mai is reading the postings of the account ACME-000123
 *     When she sets the period to 120 days
 *     Then she is told the period may span at most 90 days
 *     And the console makes no call to the ledger service
 *
 * README.md: `GET /v1/postings` requires a date window "of at most 90 days" (INVALID_DATE_RANGE).
 * RED today: `lib/accounts/postings-filter.ts` does not exist.
 */
import { describe, expect, it } from 'vitest';
import { MAX_POSTING_PERIOD_DAYS, postingPeriodError } from './postings-filter';

describe('postingPeriodError', () => {
  it('refuses a 120-day period before any call is made', () => {
    expect(postingPeriodError('2026-01-01', '2026-05-01')).toBe('The period may span at most 90 days.');
  });

  it('accepts a period at exactly the 90-day maximum', () => {
    expect(postingPeriodError('2026-01-01', '2026-04-01')).toBeNull();
    expect(MAX_POSTING_PERIOD_DAYS).toBe(90);
  });

  it('accepts the last-30-days default window', () => {
    expect(postingPeriodError('2026-03-01', '2026-03-31')).toBeNull();
  });
});
