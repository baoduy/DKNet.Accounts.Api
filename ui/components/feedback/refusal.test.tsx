/**
 * DRK-1679 §5:
 *   Scenario Outline: A retry is offered only when the attempt reached no decision
 *     Given the operator Mai records a posting and the attempt fails with <failure>
 *     When the console shows her that failure
 *     Then a retry is <offered>
 *
 *     Examples:
 *       | failure                                    | offered     |
 *       | the service not answering in time          | offered     |
 *       | the connection dropping                    | offered     |
 *       | the service refusing the posting on a rule | not offered |
 */
import { describe, expect, it } from 'vitest';
import { classifyFailure } from './refusal';
import type { AttemptFailure } from './refusal';

describe('A retry is offered only when the attempt reached no decision', () => {
  it.each([
    { name: 'the service not answering in time', failure: { kind: 'timeout' } as AttemptFailure, offered: true },
    { name: 'the connection dropping', failure: { kind: 'transport' } as AttemptFailure, offered: true },
    {
      name: 'the service refusing the posting on a rule',
      failure: { kind: 'refusal', errors: [{ code: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds.' }] } as AttemptFailure,
      offered: false,
    },
  ])('$name → retry $offered', ({ failure, offered }) => {
    expect(classifyFailure(failure)).toBe(offered);
  });
});
