import { describe, expect, it } from 'vitest';
import { classifyFailure } from './refusal';

describe('classifyFailure — LOCK_TIMEOUT is a refusal that still offers retry', () => {
  it('offers retry when the refusal carries a LOCK_TIMEOUT code', () => {
    expect(classifyFailure({ kind: 'refusal', errors: [{ code: 'LOCK_TIMEOUT', message: 'Locked.' }] })).toBe(true);
  });

  it('offers retry when only one of several errors is LOCK_TIMEOUT', () => {
    expect(
      classifyFailure({
        kind: 'refusal',
        errors: [
          { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds.' },
          { code: 'LOCK_TIMEOUT', message: 'Locked.' },
        ],
      }),
    ).toBe(true);
  });
});
