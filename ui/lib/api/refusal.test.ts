import { describe, expect, it } from 'vitest';
import { LedgerRefusalError, ledgerErrorTraceId, refusalError, routeRefusal, toLedgerError } from './refusal';

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
