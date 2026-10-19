/**
 * DRK-2325 R7 — `useRecordTransfer` regenerates the idempotency key only once the service recorded
 * the transfer (201, or 200 replaying it), never after a refusal.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRecordTransfer, type RecordTransferInput } from './record';

function input(regenerateIdempotencyKey: () => void): RecordTransferInput {
  return { sourceAccountId: 'a-1', destinationAccountId: 'a-2', amount: '10.00', sourceCurrency: 'SGD', destinationCurrency: 'SGD', fee: '0', idempotencyKey: 'k-1', regenerateIdempotencyKey };
}

function answering(status: number, body: string): void {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body, { status })));
}

function recordHook(): ReturnType<typeof useRecordTransfer> {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  return renderHook(() => useRecordTransfer(), { wrapper }).result.current;
}

afterEach(() => vi.unstubAllGlobals());

describe('useRecordTransfer', () => {
  it.each([201, 200])('a %i regenerates the key once and hands back the transfer', async (status) => {
    answering(status, '{"id":"c-1","convertedAmount":98.00}');
    const regenerate = vi.fn();

    const result = await recordHook().mutate(input(regenerate));

    expect(result).toEqual({ ok: true, transfer: { id: 'c-1', convertedAmount: '98.00' } });
    expect(regenerate).toHaveBeenCalledTimes(1);
  });

  it('a refusal keeps the key', async () => {
    answering(422, '{"status":422,"errors":[{"code":"INVALID_FEE","message":"Bad fee."}],"traceId":"t-1"}');
    const regenerate = vi.fn();

    const result = await recordHook().mutate(input(regenerate));

    expect(result).toEqual({ ok: false, errors: [{ code: 'INVALID_FEE', message: 'Bad fee.' }], traceId: 't-1' });
    expect(regenerate).not.toHaveBeenCalled();
  });
});
