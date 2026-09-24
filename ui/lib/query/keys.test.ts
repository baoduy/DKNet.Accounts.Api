import { describe, expect, it } from 'vitest';
import { accountBalanceKey, accountGroupsKey, accountKey, accountsListKey, currenciesKey, currenciesQueryOptions, postingsListKey } from './keys';

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

  it('opts the currency list out of the global money-query defaults (pr-reviewer finding 7, DRK-1687)', () => {
    expect(currenciesQueryOptions()).toEqual({
      queryKey: currenciesKey(),
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    });
  });

  it('keys a single account by its id or account number, sharable across every caller', () => {
    expect(accountKey('ACME-000123')).toEqual(accountKey('ACME-000123'));
    expect(accountKey('ACME-000123')).not.toEqual(accountKey('ACME-000456'));
  });

  it('gives the account groups list one fixed key', () => {
    expect(accountGroupsKey()).toEqual(['ledger', 'account-groups']);
  });

  it('never collides across resources', () => {
    const keys = [accountBalanceKey('x'), accountsListKey({}), postingsListKey({}), currenciesKey(), accountKey('x'), accountGroupsKey()];
    const serialized = keys.map((key) => JSON.stringify(key));
    expect(new Set(serialized).size).toBe(keys.length);
  });
});
