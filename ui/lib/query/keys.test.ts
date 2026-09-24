import { describe, expect, it } from 'vitest';
import {
  accountBalanceKey,
  accountGroupBalancesKey,
  accountGroupKey,
  accountGroupsKey,
  accountGroupsListKey,
  accountKey,
  accountKeyPrefix,
  accountsListKey,
  currenciesKey,
  currenciesQueryOptions,
  currencyKey,
  ledgerBalancesKey,
  postingsListKey,
} from './keys';

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

  it('prefixes every single-account key, number or guid, and never the accounts list', () => {
    expect(accountKeyPrefix()).toEqual(['ledger', 'account']);
    expect(accountKey('ACME-000123').slice(0, 2)).toEqual(accountKeyPrefix());
    expect(accountKey('0f8fad5b-d9cb-469f-a165-70867728950e').slice(0, 2)).toEqual(accountKeyPrefix());
    expect(accountsListKey({}).slice(0, 2)).not.toEqual(accountKeyPrefix());
  });

  it('gives the account groups list one fixed key', () => {
    expect(accountGroupsKey()).toEqual(['ledger', 'account-groups']);
  });

  it('never collides across resources', () => {
    const keys = [
      accountBalanceKey('x'),
      accountsListKey({}),
      postingsListKey({}),
      currenciesKey(),
      accountKey('x'),
      accountGroupsKey(),
      accountGroupsListKey({}),
      accountGroupKey('g1'),
      accountGroupBalancesKey('g1'),
      currencyKey('c1'),
    ];
    const serialized = keys.map((key) => JSON.stringify(key));
    expect(new Set(serialized).size).toBe(keys.length);
  });

  it('keys an account groups list by its filters', () => {
    expect(accountGroupsListKey({ status: 'Closed' })).toEqual(['ledger', 'account-groups', { status: 'Closed' }]);
  });

  it('keys a single account group and its balances by group id', () => {
    expect(accountGroupKey('TRSY')).toEqual(['ledger', 'account-group', 'TRSY']);
    expect(accountGroupBalancesKey('TRSY')).toEqual(['ledger', 'account-group', 'TRSY', 'balances']);
  });

  it('keys a single currency by its id', () => {
    expect(currencyKey('VND')).toEqual(['ledger', 'currency', 'VND']);
    expect(currencyKey('VND')).not.toEqual(currencyKey('SGD'));
  });

  it('gives the ledger-wide balances one fixed key', () => {
    expect(ledgerBalancesKey()).toEqual(['ledger', 'accounts', 'balances']);
  });
});
