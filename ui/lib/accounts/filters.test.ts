/**
 * DRK-1696 §5:
 *   Scenario: A search term too short for the service is refused before it is sent
 *     Given the operator Mai is reading the accounts list
 *     When she searches for the single character a
 *     Then she is told a search needs at least 2 characters
 *     And the console makes no call to the ledger service
 *
 * README.md's generic list surface: "search — Free-text Contains ... Minimum 2 characters."
 * The console must refuse client-side before the call, mirroring
 * `lib/api/routes.traversal.test.ts`'s "the rule itself, not the screen" for a search term.
 * RED today: `lib/accounts/filters.ts` does not exist.
 */
import { describe, expect, it } from 'vitest';
import { accountSearchError, MIN_ACCOUNT_SEARCH_LENGTH } from './filters';

describe('accountSearchError', () => {
  it('refuses a 1-character search term before any call is made', () => {
    expect(accountSearchError('a')).toBe('A search needs at least 2 characters.');
  });

  it('accepts an empty term (no narrowing)', () => {
    expect(accountSearchError('')).toBeNull();
  });

  it('accepts a term at the minimum length', () => {
    expect(accountSearchError('a'.repeat(MIN_ACCOUNT_SEARCH_LENGTH))).toBeNull();
  });
});
