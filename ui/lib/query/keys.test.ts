import { describe, expect, it } from 'vitest';
import { accountBalanceKey, accountsListKey, currenciesKey, postingsListKey } from './keys';

describe('query keys', () => {
  it('keys an account balance by its account id, sharable across every caller', () => {
    expect(accountBalanceKey('ACME-000123')).toEqual(accountBalanceKey('ACME-000123'));
    expect(accountBalanceKey('ACME-000123')).not.toEqual(accountBalanceKey('ACME-000456'));
  });

  it('keys an accounts list by its filters', () => {
    expect(accountsListKey({ currency: 'SGD' })).toEqual(['ledger', 'accounts', { currency: 'SGD' }]);
    expect(accountsListKey({ currency: 'SGD' })).not.toEqual(accountsListKey({ currency: 'JPY' }));
  });

  it('keys a postings list by its filters', () => {
    expect(postingsListKey({ accountId: 'ACME-000123' })).toEqual(['ledger', 'postings', { accountId: 'ACME-000123' }]);
  });

  it('gives the currency list one fixed key', () => {
    expect(currenciesKey()).toEqual(['ledger', 'currencies']);
  });

  it('never collides across resources', () => {
    const keys = [accountBalanceKey('x'), accountsListKey({}), postingsListKey({}), currenciesKey()];
    const serialized = keys.map((key) => JSON.stringify(key));
    expect(new Set(serialized).size).toBe(keys.length);
  });
});
