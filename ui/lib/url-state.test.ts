import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseListViewState, toListViewSearchParams, useListViewState, withFilter } from './url-state';

const mockSearch = vi.hoisted(() => ({ value: '' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(mockSearch.value) }));

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

describe('withFilter (DRK-1760 §3 row 5)', () => {
  it('narrows by the field and goes back to the first page', () => {
    expect(withFilter({ filters: { search: 'acme' }, page: 3 }, 'status', 'Closed')).toEqual({ filters: { search: 'acme', status: 'Closed' }, page: undefined });
  });

  it('drops the field when the value is empty', () => {
    expect(withFilter({ filters: { search: 'acme', status: 'Closed' }, page: 2 }, 'status', '')).toEqual({ filters: { search: 'acme' }, page: undefined });
  });
});

describe('useListViewState (DRK-1760 §3 row 5, R4)', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
    mockSearch.value = '';
  });

  it('starts from the view the address was opened with', () => {
    mockSearch.value = 'status=Closed&sort=code&page=2&open=c1';
    const { result } = renderHook(() => useListViewState('/currencies'));

    expect(result.current[0]).toEqual({ filters: { status: 'Closed' }, sort: { field: 'code', desc: false }, page: 2, openRecordId: 'c1' });
  });

  it('adds one history entry per change, carrying the whole view', () => {
    const push = vi.spyOn(window.history, 'pushState');
    const { result } = renderHook(() => useListViewState('/currencies'));

    act(() => result.current[1]({ filters: { status: 'Closed' }, page: 2 }));

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(null, '', '/currencies?status=Closed&page=2');
    expect(result.current[0]).toEqual({ filters: { status: 'Closed' }, page: 2 });
    push.mockRestore();
  });

  it('reads the view back from the address when Back moves it', () => {
    const { result } = renderHook(() => useListViewState('/accounts'));
    act(() => result.current[1]({ filters: {}, page: 2 }));

    act(() => {
      window.history.replaceState(null, '', '/accounts?page=1');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current[0]).toEqual({ filters: {}, page: 1 });
  });

  it('stops listening once the screen is gone', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useListViewState('/accounts'));
    const listener = add.mock.calls.find(([type]) => type === 'popstate')?.[1];

    unmount();

    expect(listener).toBeTypeOf('function');
    expect(remove).toHaveBeenCalledWith('popstate', listener);
    add.mockRestore();
    remove.mockRestore();
  });
});
