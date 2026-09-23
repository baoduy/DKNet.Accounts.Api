import { describe, expect, it } from 'vitest';
import { routeRefusal } from './refusal';

describe('routeRefusal', () => {
  it('routes an entry with a field to fieldErrors, keyed by that field', () => {
    const routed = routeRefusal([{ message: 'Effective date is later than the recording date.', code: 'EFFECTIVE_DATE_IN_FUTURE', field: 'effectiveDate' }]);
    expect(routed.fieldErrors.effectiveDate).toEqual({
      message: 'Effective date is later than the recording date.',
      code: 'EFFECTIVE_DATE_IN_FUTURE',
      field: 'effectiveDate',
    });
    expect(routed.alertErrors).toEqual([]);
  });

  it('routes a field-less entry to alertErrors', () => {
    const routed = routeRefusal([{ message: 'The debit would take the account past its floor.', code: 'INSUFFICIENT_FUNDS' }]);
    expect(routed.alertErrors).toEqual([{ message: 'The debit would take the account past its floor.', code: 'INSUFFICIENT_FUNDS' }]);
    expect(routed.fieldErrors).toEqual({});
  });

  it('splits a mix of field and field-less entries', () => {
    const routed = routeRefusal([
      { message: 'Bad amount.', field: 'amount' },
      { message: 'Trace only.', code: 'LOCK_TIMEOUT' },
    ]);
    expect(Object.keys(routed.fieldErrors)).toEqual(['amount']);
    expect(routed.alertErrors).toHaveLength(1);
  });

  it('returns empty buckets for an empty list', () => {
    expect(routeRefusal([])).toEqual({ fieldErrors: {}, alertErrors: [] });
  });
});
