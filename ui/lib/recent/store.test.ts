import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_RECENT, parseRecent, pushRecent, readRecent, readRecentText, subscribeRecent } from './store';

const MAI = '11111111-1111-4111-8111-111111111111';
const NAM = '22222222-2222-4222-8222-222222222222';

/** Node's jsdom here has no `window.localStorage` (brief Q3) — a plain in-memory one stands in. */
function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

function id(n: number): string {
  return `a0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

describe('with storage', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = memoryStorage();
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists nothing before anything was opened', () => {
    expect(readRecent(MAI)).toEqual([]);
    expect(readRecentText(MAI)).toBeNull();
  });

  it('keeps kind, id and when it was opened, under a key for the operator — nothing else', () => {
    pushRecent(MAI, 'Account', id(1), new Date('2026-09-24T10:00:00.000Z'));

    expect(storage.getItem(`recently-viewed:${MAI}`)).toBe(`[{"kind":"Account","id":"${id(1)}","openedAt":"2026-09-24T10:00:00.000Z"}]`);
  });

  it('puts the newest first', () => {
    pushRecent(MAI, 'Account', id(1));
    pushRecent(MAI, 'AccountGroup', id(2));
    pushRecent(MAI, 'Posting', id(3));

    expect(readRecent(MAI).map((entry) => [entry.kind, entry.id])).toEqual([
      ['Posting', id(3)],
      ['AccountGroup', id(2)],
      ['Account', id(1)],
    ]);
  });

  it('moves a record opened again to the top, listed once', () => {
    pushRecent(MAI, 'Account', id(1), new Date('2026-09-24T10:00:00.000Z'));
    pushRecent(MAI, 'Account', id(2));
    pushRecent(MAI, 'Account', id(1), new Date('2026-09-24T11:00:00.000Z'));

    expect(readRecent(MAI)).toEqual([
      { kind: 'Account', id: id(1), openedAt: '2026-09-24T11:00:00.000Z' },
      expect.objectContaining({ kind: 'Account', id: id(2) }),
    ]);
  });

  it('keeps an account and a posting that share an id as two records', () => {
    pushRecent(MAI, 'Account', id(1));
    pushRecent(MAI, 'Posting', id(1));

    expect(readRecent(MAI)).toHaveLength(2);
  });

  it('keeps the newest 10 and drops the oldest', () => {
    for (let n = 1; n <= 12; n += 1) pushRecent(MAI, 'Account', id(n));

    expect(MAX_RECENT).toBe(10);
    expect(readRecent(MAI).map((entry) => entry.id)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3].map(id));
  });

  it("keeps each operator's list apart", () => {
    pushRecent(MAI, 'Account', id(1));

    expect(readRecent(NAM)).toEqual([]);
    expect(readRecent(MAI)).toHaveLength(1);
  });

  it('treats unreadable storage text as an empty list', () => {
    storage.setItem(`recently-viewed:${MAI}`, '{not json');
    expect(readRecent(MAI)).toEqual([]);
    storage.setItem(`recently-viewed:${MAI}`, '{"kind":"Account"}');
    expect(readRecent(MAI)).toEqual([]);
  });

  it('never fails the screen when the browser refuses to store', () => {
    storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    expect(() => pushRecent(MAI, 'Account', id(1))).not.toThrow();
  });
});

describe('without storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists nothing and keeps nothing when the browser has no storage', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(() => pushRecent(MAI, 'Account', id(1))).not.toThrow();
    expect(readRecent(MAI)).toEqual([]);
  });

  it('lists nothing when reading storage throws (storage blocked)', () => {
    const saved = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('SecurityError');
      },
    });
    try {
      expect(readRecent(MAI)).toEqual([]);
    } finally {
      if (saved) Object.defineProperty(window, 'localStorage', saved);
      else delete (window as { localStorage?: unknown }).localStorage;
    }
  });
});

describe('parseRecent', () => {
  it('reads no text as an empty list', () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent('')).toEqual([]);
  });
});

describe('subscribeRecent', () => {
  it("calls back when another tab changes storage, until it stops listening", () => {
    const onChange = vi.fn();
    const stop = subscribeRecent(onChange);

    window.dispatchEvent(new StorageEvent('storage'));
    stop();
    window.dispatchEvent(new StorageEvent('storage'));

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
