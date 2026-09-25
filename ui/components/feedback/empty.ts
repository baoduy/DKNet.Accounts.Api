/**
 * DRK-1725 §3 "A list must state 3 different empty situations with 3 different messages": nothing
 * exists yet, nothing matches the current filter or period, or the operator is past the last
 * page. Which one applies is read off the service's own total, the list's active narrowing and
 * the page asked for — never guessed from the empty page alone.
 */
export interface EmptyTexts {
  none: string;
  noMatch: string;
  pastLastPage: string;
}

export interface EmptyView {
  /** The service's count of every match for the view (`totalItemCount`). */
  total: number;
  page: number;
  /** A filter or search narrows the list. */
  filtered: boolean;
}

export function emptyMessage(texts: EmptyTexts, { total, page, filtered }: EmptyView): string {
  if (page > 1 && total > 0) return texts.pastLastPage;
  return filtered ? texts.noMatch : texts.none;
}

export const ACCOUNTS_EMPTY: EmptyTexts = { none: 'No accounts yet.', noMatch: 'No accounts match this filter.', pastLastPage: 'No more accounts.' };
export const GROUPS_EMPTY: EmptyTexts = { none: 'No groups yet.', noMatch: 'No groups match this filter.', pastLastPage: 'No more groups.' };
export const CURRENCIES_EMPTY = 'No currencies yet.';
export const NO_POSTINGS_ON_ACCOUNT = 'No postings recorded on this account.';

// Fixed English month names: `Intl`'s `en-GB` short month for September is `Sept` in current ICU data.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-09-01` → `1 Sep`. */
function dayAndMonth(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

/** A posting list's texts: `none` is what an empty period says — nothing took effect in it. */
export function postingsEmpty(from: string, to: string, none = `No postings between ${dayAndMonth(from)} and ${dayAndMonth(to)}.`): EmptyTexts {
  return { none, noMatch: 'No postings match this filter.', pastLastPage: 'No more postings.' };
}
