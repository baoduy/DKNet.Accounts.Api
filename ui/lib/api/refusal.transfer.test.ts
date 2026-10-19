/**
 * DRK-2325 R6 / §6a D8 — `routeRefusalByCode`: each R6 code marks its control whatever `field` the
 * service sent; every other entry reaches the alert with its `field` taken off, so nothing is dropped.
 */
import { describe, expect, it } from 'vitest';
import { RECORD_TRANSFER_CODE_FIELDS, routeRefusal, routeRefusalByCode } from './refusal';

describe('routeRefusalByCode with the Record transfer codes', () => {
  it.each([
    { code: 'INVALID_POSTING_AMOUNT', control: 'amount', field: 'Amount' },
    { code: 'CONVERTED_AMOUNT_TOO_SMALL', control: 'amount', field: 'Amount' },
    { code: 'SAME_ACCOUNT_TRANSFER', control: 'destinationAccountId', field: 'DestinationAccountId' },
    { code: 'EXCHANGE_RATE_REQUIRED', control: 'exchangeRate', field: 'ExchangeRate' },
    { code: 'EXCHANGE_RATE_NOT_ALLOWED', control: 'exchangeRate', field: 'ExchangeRate' },
    { code: 'INVALID_EXCHANGE_RATE', control: 'exchangeRate', field: 'ExchangeRate' },
    { code: 'INVALID_FEE', control: 'fee', field: 'Fee' },
    { code: 'FEE_ACCOUNT_REQUIRED', control: 'feeAccountId', field: 'FeeAccountId' },
    { code: 'INVALID_FEE_ACCOUNT', control: 'feeAccountId', field: 'FeeAccountId' },
    { code: 'INSUFFICIENT_FUNDS', control: 'sourceAccountId', field: undefined },
    { code: 'ACCOUNT_DORMANT_DEBIT_REFUSED', control: 'sourceAccountId', field: undefined },
  ])('$code marks $control', ({ code, control, field }) => {
    const routed = routeRefusalByCode([{ code, message: `Refused: ${code}.`, field }], RECORD_TRANSFER_CODE_FIELDS);

    expect(Object.keys(routed.fieldErrors)).toEqual([control]);
    expect(routed.fieldErrors[control]).toEqual({ code, message: `Refused: ${code}.` });
    expect(routed.alertErrors).toEqual([]);
  });

  it.each([
    { label: 'ACCOUNT_FROZEN', error: { code: 'ACCOUNT_FROZEN', message: 'The account is frozen.' }, shown: { code: 'ACCOUNT_FROZEN', message: 'The account is frozen.' } },
    {
      label: 'UNSUPPORTED_CURRENCY with a field',
      error: { code: 'UNSUPPORTED_CURRENCY', message: "'USD' is not a supported currency.", field: 'DestinationCurrency' },
      shown: { code: 'UNSUPPORTED_CURRENCY', message: "'USD' is not a supported currency." },
    },
    { label: 'a missing key: a field, no code', error: { message: "'Idempotency Key' must not be empty.", field: 'IdempotencyKey' }, shown: { message: "'Idempotency Key' must not be empty." } },
    { label: 'not found: no code, no field', error: { message: 'The account was not found.' }, shown: { message: 'The account was not found.' } },
    { label: 'an unknown code', error: { code: 'UNKNOWN_REFUSAL', message: 'A refusal the console has never seen.' }, shown: { code: 'UNKNOWN_REFUSAL', message: 'A refusal the console has never seen.' } },
  ])('$label goes to the alert with no field', ({ error, shown }) => {
    const routed = routeRefusalByCode([error], RECORD_TRANSFER_CODE_FIELDS);

    expect(routed.fieldErrors).toEqual({});
    expect(routed.alertErrors).toStrictEqual([shown]);
  });

  it('keeps every entry of a mixed refusal, in order', () => {
    const routed = routeRefusalByCode(
      [
        { code: 'INVALID_FEE', message: 'Bad fee.', field: 'Fee' },
        { code: 'LOCK_TIMEOUT', message: 'Timed out.' },
        { code: 'CURRENCY_MISMATCH', message: 'Mismatch.', field: 'SourceCurrency' },
      ],
      RECORD_TRANSFER_CODE_FIELDS,
    );

    expect(routed.fieldErrors).toEqual({ fee: { code: 'INVALID_FEE', message: 'Bad fee.' } });
    expect(routed.alertErrors).toEqual([
      { code: 'LOCK_TIMEOUT', message: 'Timed out.' },
      { code: 'CURRENCY_MISMATCH', message: 'Mismatch.' },
    ]);
  });

  it("leaves routeRefusal's field-first default as it was", () => {
    const routed = routeRefusal([{ code: 'CURRENCY_MISMATCH', message: 'Mismatch.', field: 'SourceCurrency' }], RECORD_TRANSFER_CODE_FIELDS);

    expect(routed.fieldErrors).toEqual({ sourceCurrency: { code: 'CURRENCY_MISMATCH', message: 'Mismatch.', field: 'SourceCurrency' } });
    expect(routed.alertErrors).toEqual([]);
  });
});
