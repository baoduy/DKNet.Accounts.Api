/**
 * DRK-1725 §3 "A list must state 3 different empty situations with 3 different messages" — which
 * of the three a list states, read off the service's total, the active narrowing and the page.
 */
import { describe, expect, it } from 'vitest';
import { ACCOUNTS_EMPTY, CURRENCIES_EMPTY, emptyMessage, GROUPS_EMPTY, NO_POSTINGS_ON_ACCOUNT, postingsEmpty } from './empty';

describe('emptyMessage', () => {
  it('says nothing exists yet when the service counts nothing and nothing narrows the list', () => {
    expect(emptyMessage(ACCOUNTS_EMPTY, { total: 0, page: 1, filtered: false })).toBe('No accounts yet.');
  });

  it('says nothing matches when a filter narrows the list to nothing', () => {
    expect(emptyMessage(ACCOUNTS_EMPTY, { total: 0, page: 1, filtered: true })).toBe('No accounts match this filter.');
  });

  it('says the operator is past the last page when the service counts rows on earlier pages', () => {
    expect(emptyMessage(GROUPS_EMPTY, { total: 25, page: 9, filtered: false })).toBe('No more groups.');
  });

  it('says past the last page even with a filter, when the filter matched rows on earlier pages', () => {
    expect(emptyMessage(GROUPS_EMPTY, { total: 3, page: 2, filtered: true })).toBe('No more groups.');
  });

  it('never says past the last page for a page past the end of a list that holds nothing', () => {
    expect(emptyMessage(GROUPS_EMPTY, { total: 0, page: 9, filtered: false })).toBe('No groups yet.');
    expect(emptyMessage(GROUPS_EMPTY, { total: 0, page: 9, filtered: true })).toBe('No groups match this filter.');
  });

  it('treats page 1 with rows counted as no match, never as past the last page', () => {
    expect(emptyMessage(ACCOUNTS_EMPTY, { total: 4, page: 1, filtered: true })).toBe('No accounts match this filter.');
  });
});

describe('the list texts', () => {
  it('carry the spec table literals', () => {
    expect(GROUPS_EMPTY).toEqual({ none: 'No groups yet.', noMatch: 'No groups match this filter.', pastLastPage: 'No more groups.' });
    expect(ACCOUNTS_EMPTY).toEqual({ none: 'No accounts yet.', noMatch: 'No accounts match this filter.', pastLastPage: 'No more accounts.' });
    expect(CURRENCIES_EMPTY).toBe('No currencies yet.');
    expect(NO_POSTINGS_ON_ACCOUNT).toBe('No postings recorded on this account.');
  });

  it('state an empty posting period by its first and last day, month by its short English name', () => {
    expect(postingsEmpty('2026-09-01', '2026-09-24')).toEqual({
      none: 'No postings between 1 Sep and 24 Sep.',
      noMatch: 'No postings match this filter.',
      pastLastPage: 'No more postings.',
    });
    expect(postingsEmpty('2026-01-01', '2026-01-31').none).toBe('No postings between 1 Jan and 31 Jan.');
    expect(postingsEmpty('2025-12-09', '2026-02-28').none).toBe('No postings between 9 Dec and 28 Feb.');
  });

  it.each([
    ['01', 'Jan'],
    ['02', 'Feb'],
    ['03', 'Mar'],
    ['04', 'Apr'],
    ['05', 'May'],
    ['06', 'Jun'],
    ['07', 'Jul'],
    ['08', 'Aug'],
    ['09', 'Sep'],
    ['10', 'Oct'],
    ['11', 'Nov'],
    ['12', 'Dec'],
  ])('names month %s as %s', (month, name) => {
    expect(postingsEmpty(`2026-${month}-05`, `2026-${month}-15`).none).toBe(`No postings between 5 ${name} and 15 ${name}.`);
  });

  it('let a posting list say its own nothing-yet text in place of the period', () => {
    expect(postingsEmpty('2026-09-01', '2026-09-24', NO_POSTINGS_ON_ACCOUNT).none).toBe('No postings recorded on this account.');
  });
});
