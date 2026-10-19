/**
 * DRK-2325 §3 row 2 — one account's transfer list (`GET /v1/accounts/{id}/transfers`) and one
 * transfer with its postings (`GET /v1/transfers/{id}`), read through the pass-through with
 * `readLedger`, so every amount stays the exact text the service sent (R5).
 */
'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { postingPeriodRange } from '@/lib/accounts/postings-filter';
import { readLedger } from '@/lib/api/ledger-request';
import type { AsRead } from '@/lib/api/money-json';
import type { components } from '@/lib/api/schema';
import { transfersListKey } from '@/lib/query/keys';

export type TransferRowDto = AsRead<components['schemas']['TransferRowDto']>;
export type TransferDto = AsRead<components['schemas']['TransferDto']>;
export type PagedTransferResponse = AsRead<components['schemas']['PagedResponseOfTransferRowDto']>;

/** The Period choice: the last 30 or 90 days, or the list's own default window of 1 year. */
export const TRANSFER_PERIODS = ['30d', '90d', '1y'] as const;
export const DEFAULT_TRANSFER_PERIOD = '1y';
export const TRANSFER_PERIOD_OPTIONS = [
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last 1 year' },
];

/** The service refuses a search of 1 character; shorter than this, nothing is read (R3). */
export const MIN_TRANSFER_SEARCH_LENGTH = 2;

/** An unknown or absent choice reads as the default, never as a refused window (D1). */
export function transferPeriod(value: string | null | undefined): string {
  return (TRANSFER_PERIODS as readonly string[]).includes(value ?? '') ? value! : DEFAULT_TRANSFER_PERIOD;
}

/** R2 — 30 or 90 days back from today's UTC date; 1 year sends neither end, so the service applies
 * its own default window (a leap day is never refused). */
export function transferWindow(period: string, now: Date): { from?: string; to?: string } {
  const chosen = transferPeriod(period);
  return chosen === DEFAULT_TRANSFER_PERIOD ? {} : postingPeriodRange(chosen, now);
}

export interface TransfersListState {
  period: string;
  search?: string;
  orderBy: string;
  desc: boolean;
  pageNumber: number;
  pageSize: number;
}

/** Screen state → the service's query string, or `null` when the search is too short to send. */
export function toTransfersQuery(state: TransfersListState, now: Date): URLSearchParams | null {
  const search = state.search ?? '';
  if (search.length > 0 && search.length < MIN_TRANSFER_SEARCH_LENGTH) return null;

  const { from, to } = transferWindow(state.period, now);
  const params = new URLSearchParams();
  if (from && to) {
    params.set('from', from);
    params.set('to', to);
  }
  if (search) params.set('search', search);
  params.set('orderBy', state.orderBy);
  params.set('desc', String(state.desc));
  params.set('pageNumber', String(state.pageNumber));
  params.set('pageSize', String(state.pageSize));
  return params;
}

/** The chosen account's transfers; no read until an account is chosen (R1) and the search is long enough. */
export function useAccountTransfers(accountId: string, state: TransfersListState, now: Date): UseQueryResult<PagedTransferResponse> {
  const query = toTransfersQuery(state, now);
  return useQuery({
    queryKey: transfersListKey({ accountId, ...state }),
    queryFn: async () => (await readLedger(`/api/ledger/accounts/${encodeURIComponent(accountId)}/transfers?${query!.toString()}`)) as PagedTransferResponse,
    enabled: accountId.length > 0 && query !== null,
    placeholderData: keepPreviousData,
  });
}

/** One transfer with the postings it recorded — the detail panel's read. */
export function useTransfer(transferId: string | undefined): UseQueryResult<TransferDto> {
  return useQuery({
    queryKey: transfersListKey({ transferId }),
    queryFn: async () => (await readLedger(`/api/ledger/transfers/${encodeURIComponent(transferId!)}`)) as TransferDto,
    enabled: !!transferId,
  });
}
