import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { useIdempotencyKey } from './use-idempotency-key';

describe('useIdempotencyKey — regenerate', () => {
  it('replaces the key only when regenerate is called', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const first = result.current.value;

    act(() => result.current.regenerate());

    expect(result.current.value).not.toBe(first);
  });
});
