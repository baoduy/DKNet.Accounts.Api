import { describe, expect, it } from 'vitest';
import { isUnreachable, LedgerRefusalError, RECORD_POSTING_CODE_FIELDS, ledgerErrorTraceId, refusalError, routeRefusal, toLedgerError, UNREACHABLE_MESSAGE, unreachableBody } from './refusal';

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

  it('normalises a PascalCase field key from the service to camelCase', () => {
    const routed = routeRefusal([{ message: 'Code TRSY is already used.', code: 'DUPLICATE_GROUP_CODE', field: 'Code' }]);
    expect(routed.fieldErrors.code).toEqual({ message: 'Code TRSY is already used.', code: 'DUPLICATE_GROUP_CODE', field: 'Code' });
  });

  it('normalises a multi-word PascalCase field key', () => {
    const routed = routeRefusal([{ message: 'Owner is required.', field: 'OwnerId' }]);
    expect(routed.fieldErrors.ownerId).toBeDefined();

    const decimalRouted = routeRefusal([{ message: 'Decimal places must be 0-4.', field: 'DecimalPlaces' }]);
    expect(decimalRouted.fieldErrors.decimalPlaces).toBeDefined();
  });

  it('normalises a single-letter field key', () => {
    const routed = routeRefusal([{ message: 'Group TRSY still holds an account.', code: 'GROUP_NOT_EMPTY', field: 'Id' }]);
    expect(routed.fieldErrors.id).toBeDefined();
  });
});

describe('refusalError', () => {
  it('builds an error carrying the first entry\'s message and code, and the body traceId', () => {
    const error = refusalError({ errors: [{ message: 'Not permitted.', code: 'FORBIDDEN' }], traceId: 't-1' });
    expect(error.message).toBe('Not permitted.');
    expect(error.code).toBe('FORBIDDEN');
    expect(error.traceId).toBe('t-1');
  });

  it('falls back to a default message and no code/traceId when the body carries no errors', () => {
    const error = refusalError({});
    expect(error.message).toBe('Request failed.');
    expect(error.code).toBeUndefined();
    expect(error.traceId).toBeUndefined();
  });

  it('falls back to a default message on a null body', () => {
    expect(refusalError(null).message).toBe('Request failed.');
  });
});

describe('toLedgerError', () => {
  it('reshapes a LedgerRefusalError into its code and message', () => {
    const error = new LedgerRefusalError('Not permitted.', 'FORBIDDEN', 't-1');
    expect(toLedgerError(error)).toEqual({ code: 'FORBIDDEN', message: 'Not permitted.' });
  });

  it('reads the message off a plain Error with no code', () => {
    expect(toLedgerError(new Error('Network down.'))).toEqual({ message: 'Network down.' });
  });

  it('falls back to a default message for a non-Error value', () => {
    expect(toLedgerError('not an error')).toEqual({ message: 'Request failed.' });
  });
});

describe('ledgerErrorTraceId', () => {
  it('reads the traceId off a LedgerRefusalError', () => {
    const error = new LedgerRefusalError('Not permitted.', 'FORBIDDEN', 't-1');
    expect(ledgerErrorTraceId(error)).toBe('t-1');
  });

  it('is undefined for a plain Error', () => {
    expect(ledgerErrorTraceId(new Error('Network down.'))).toBeUndefined();
  });
});

describe('routeRefusal — the record form\'s codes (DRK-1713 §3 row 13)', () => {
  it.each([
    ['ACCOUNT_FROZEN', 'accountId'],
    ['ACCOUNT_CLOSED', 'accountId'],
    ['ACCOUNT_DORMANT_DEBIT_REFUSED', 'accountId'],
    ['INSUFFICIENT_FUNDS', 'amount'],
    ['INVALID_POSTING_AMOUNT', 'amount'],
  ])('routes a field-less %s onto %s', (code, field) => {
    const error = { message: 'Refused.', code };
    expect(routeRefusal([error], RECORD_POSTING_CODE_FIELDS)).toEqual({ fieldErrors: { [field]: error }, alertErrors: [] });
  });

  it('keeps a code the map does not name, and a field-less entry with no code, in the alert', () => {
    const errors = [{ message: 'Busy.', code: 'LOCK_TIMEOUT' }, { message: 'Failed.' }];
    expect(routeRefusal(errors, RECORD_POSTING_CODE_FIELDS)).toEqual({ fieldErrors: {}, alertErrors: errors });
  });

  it('prefers the entry\'s own field over its code', () => {
    const error = { message: 'Too precise.', code: 'INVALID_POSTING_AMOUNT', field: 'Currency' };
    expect(routeRefusal([error], RECORD_POSTING_CODE_FIELDS).fieldErrors).toEqual({ currency: error });
  });
});

describe('the ledger service cannot be reached (DRK-1725 §3 row 6)', () => {
  it('reads a browser fetch failure as the service not reached, never as its own wording', () => {
    expect(toLedgerError(new TypeError('Failed to fetch'))).toEqual({ message: 'The ledger service cannot be reached.' });
  });

  it("builds the pass-through's own 502 answer in the service's refusal shape, with no code", () => {
    expect(unreachableBody('t-1')).toEqual({ status: 502, errors: [{ message: 'The ledger service cannot be reached.' }], traceId: 't-1' });
    expect(UNREACHABLE_MESSAGE).toBe('The ledger service cannot be reached.');
  });

  it("tells the pass-through's unreachable answer apart from a refusal the service sent", () => {
    expect(isUnreachable([{ message: 'The ledger service cannot be reached.' }])).toBe(true);
    expect(isUnreachable([{ message: 'The ledger service cannot be reached.', code: 'SOMETHING' }])).toBe(false);
    expect(isUnreachable([{ message: 'Ledger store unavailable' }])).toBe(false);
    expect(isUnreachable([{ message: 'The ledger service cannot be reached.' }, { message: 'The ledger service cannot be reached.' }])).toBe(false);
    expect(isUnreachable([])).toBe(false);
    expect(isUnreachable(undefined)).toBe(false);
  });
});
