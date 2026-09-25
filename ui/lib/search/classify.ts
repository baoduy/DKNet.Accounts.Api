/**
 * DRK-1728 §3 row 3 — which route a typed search takes (DRK-1725 §3 Search): an identifier is
 * looked up as an account, then a group, then a posting; an account number narrows the accounts
 * list; anything else searches accounts and groups together. Below 2 characters nothing is sent.
 */
export type SearchRoute = 'identifier' | 'accountNumber' | 'text' | 'tooShort';

export interface ClassifiedSearch {
  route: SearchRoute;
  /** What is sent: trimmed, and upper-cased for an account number. */
  value: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A group code of 3 to 5 characters, a dash, then 3 to 10 characters, no spaces; any case. */
const ACCOUNT_NUMBER_PATTERN = /^[A-Za-z0-9]{3,5}-[A-Za-z0-9]{3,10}$/;

export const MIN_SEARCH_LENGTH = 2;

export function classifySearch(typed: string): ClassifiedSearch {
  const value = typed.trim();
  if (value.length < MIN_SEARCH_LENGTH) return { route: 'tooShort', value };
  if (UUID_PATTERN.test(value)) return { route: 'identifier', value };
  if (ACCOUNT_NUMBER_PATTERN.test(value)) return { route: 'accountNumber', value: value.toUpperCase() };
  return { route: 'text', value };
}

/** The caption under the field, stated before anything is sent. */
export const SEARCH_CAPTIONS: Record<SearchRoute, string> = {
  identifier: 'Looked up as an account, then a group, then a posting.',
  accountNumber: 'Matched as an account number.',
  text: 'Searched across accounts and groups.',
  tooShort: `A search needs at least ${MIN_SEARCH_LENGTH} characters.`,
};
