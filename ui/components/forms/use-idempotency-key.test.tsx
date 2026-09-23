/**
 * DRK-1679 §5:
 *   Scenario: The idempotency key is made when the form opens and survives a refusal
 *     Given the operator Mai opens the record posting form
 *     When her first attempt is refused
 *     Then the second attempt carries the same idempotency key
 *
 * The key is minted on mount (form opens) and only `regenerate` — wired to a
 * reset-after-success path, never called on a refusal — replaces it (§3 row 15).
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useIdempotencyKey } from './use-idempotency-key';

describe('The idempotency key is made when the form opens and survives a refusal', () => {
  it('keeps the same key across a re-render caused by a refused attempt', () => {
    const { result, rerender } = renderHook(() => useIdempotencyKey());
    const mintedOnMount = result.current.value;
    expect(mintedOnMount).toBeTruthy();

    // The refusal re-renders the form; nothing calls `regenerate`.
    rerender();

    expect(result.current.value).toBe(mintedOnMount);
  });
});
