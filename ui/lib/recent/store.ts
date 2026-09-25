/**
 * DRK-1728 §3 row 7 — the records an operator opened, kept in their own browser under a key per
 * directory object id (DRK-1725 §3a `RecentlyViewed`). Only `{ kind, id, openedAt }` is stored:
 * never a name, number or amount (R5) — Overview reads each record again when it draws it.
 */
export type RecentKind = 'Account' | 'AccountGroup' | 'Posting';

export interface RecentEntry {
  kind: RecentKind;
  id: string;
  /** ISO timestamp of the last time the operator opened the record. */
  openedAt: string;
}

export const MAX_RECENT = 10;

function storageKey(directoryObjectId: string): string {
  return `recently-viewed:${directoryObjectId}`;
}

/** `window.localStorage` can be missing (a server render has no `window`, some test
 * environments no storage) or refuse access (a browser with storage blocked) — either way there
 * is simply no list. */
function storage(): Storage | undefined {
  try {
    return window.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}

/** The operator's list exactly as stored — `null` when there is none. */
export function readRecentText(directoryObjectId: string): string | null {
  return storage()?.getItem(storageKey(directoryObjectId)) ?? null;
}

/** A stored list, newest first. A missing or unreadable list is an empty one. */
export function parseRecent(text: string | null): RecentEntry[] {
  try {
    // `null` parses to `null` and `''` throws: both are no list.
    const parsed: unknown = JSON.parse(text ?? 'null');
    return Array.isArray(parsed) ? (parsed as RecentEntry[]) : [];
  } catch {
    return [];
  }
}

export function readRecent(directoryObjectId: string): RecentEntry[] {
  return parseRecent(readRecentText(directoryObjectId));
}

/** Calls `onChange` when another tab of this browser changes a stored list. */
export function subscribeRecent(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

/** Puts the record at the top of the operator's list — once — and keeps the newest 10. */
export function pushRecent(directoryObjectId: string, kind: RecentKind, id: string, now: Date = new Date()): void {
  const others = readRecent(directoryObjectId).filter((entry) => !(entry.kind === kind && entry.id === id));
  const next: RecentEntry[] = [{ kind, id, openedAt: now.toISOString() }, ...others].slice(0, MAX_RECENT);
  try {
    storage()?.setItem(storageKey(directoryObjectId), JSON.stringify(next));
  } catch {
    // Storage full or blocked: the list is a convenience, never worth failing the screen for.
  }
}
