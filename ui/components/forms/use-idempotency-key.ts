import { useState } from 'react';

/**
 * Mints a key on mount, never on submit (§3 row 15) — minting on submit means a
 * double-click sends two distinct keys and records two postings. The key survives a
 * refused attempt; only `regenerate` (wired to a reset-after-success path) replaces it.
 */
export interface UseIdempotencyKeyResult {
  value: string;
  regenerate: () => void;
}

export function useIdempotencyKey(): UseIdempotencyKeyResult {
  const [value, setValue] = useState(() => crypto.randomUUID());
  return { value, regenerate: () => setValue(crypto.randomUUID()) };
}
