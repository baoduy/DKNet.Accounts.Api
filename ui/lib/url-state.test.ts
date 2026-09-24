import { describe, expect, it } from 'vitest';
import { parseListViewState, toListViewSearchParams } from './url-state';

describe('parseListViewState / toListViewSearchParams', () => {
  it('round-trips filters, sort, page and the open record', () => {
    const state = {
      filters: { currency: 'SGD' },
      sort: { field: 'balance', desc: true },
      page: 2,
      openRecordId: 'ACME-000123',
    };
    const roundTripped = parseListViewState(toListViewSearchParams(state));
    expect(roundTripped).toEqual(state);
  });

  it('parses an ascending sort with no leading minus', () => {
    const state = parseListViewState(new URLSearchParams('sort=balance'));
    expect(state.sort).toEqual({ field: 'balance', desc: false });
  });

  it('excludes sort/page/open from the parsed filters', () => {
    const state = parseListViewState(new URLSearchParams('currency=SGD&sort=-balance&page=3&open=ACME-1'));
    expect(state.filters).toEqual({ currency: 'SGD' });
  });

  it('omits sort, page, pageSize and open when unset', () => {
    const state = parseListViewState(new URLSearchParams('currency=SGD'));
    expect(state).toEqual({ filters: { currency: 'SGD' } });
  });

  it('round-trips an explicit pageSize, engaged only once pagination is used', () => {
    const state = { filters: { status: 'Closed' }, page: 2, pageSize: 10 };
    expect(parseListViewState(toListViewSearchParams(state))).toEqual(state);
  });

  it('excludes pageSize from the parsed filters', () => {
    const state = parseListViewState(new URLSearchParams('status=Closed&pageSize=10'));
    expect(state.filters).toEqual({ status: 'Closed' });
  });

  it('produces no search params for an empty state', () => {
    expect(toListViewSearchParams({ filters: {} }).toString()).toBe('');
  });
});
