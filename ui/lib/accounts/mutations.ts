/**
 * DRK-1696 §3 row 7 — account write hooks. Each invalidates the account + list keys on
 * success only, mirroring `lib/query/mutations.ts`'s posting hooks.
 */
'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { LedgerError } from '@/components/feedback/RefusalAlert';
import { sendLedgerWrite } from '@/lib/api/ledger-request';
import { accountKeyPrefix, accountsListKey } from '@/lib/query/keys';
import { useLedgerMutation, type LedgerMutation } from '@/lib/query/mutations';
import type { AccountDto } from './query';

export interface AccountWriteResult {
  ok: boolean;
  account?: AccountDto;
  errors?: LedgerError[];
  traceId?: string;
}

/** Through `sendLedgerWrite`, never `response.json()` — an `AccountDto` carries money fields (R1). */
async function sendAccountRequest(url: string, init: RequestInit): Promise<AccountWriteResult> {
  const result = await sendLedgerWrite(url, init);
  return result.ok ? { ok: true, account: result.body as AccountDto } : result;
}

export interface OpenAccountInput {
  groupId: string;
  name: string;
  currency: string;
  classification: string;
  permittedToGoNegative: boolean;
  overdraftLimit?: string | null;
  minimumBalance?: string | null;
  externalReference?: string;
  metadata?: Record<string, string>;
}

export function useOpenAccount(): LedgerMutation<OpenAccountInput, AccountWriteResult> {
  const queryClient = useQueryClient();
  return useLedgerMutation({
    mutationFn: (input: OpenAccountInput): Promise<AccountWriteResult> =>
      sendAccountRequest('/api/ledger/accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountsListKey({}) });
    },
  });
}

export interface ChangeAccountDetailsInput {
  accountId: string;
  name?: string;
  metadata?: Record<string, string>;
}

export function useChangeAccountDetails(): LedgerMutation<ChangeAccountDetailsInput, AccountWriteResult> {
  const queryClient = useQueryClient();
  return useLedgerMutation({
    mutationFn: (input: ChangeAccountDetailsInput): Promise<AccountWriteResult> =>
      sendAccountRequest(`/api/ledger/accounts/${input.accountId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: input.name, metadata: input.metadata }),
      }),
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountKeyPrefix() });
      queryClient.invalidateQueries({ queryKey: accountsListKey({}) });
    },
  });
}

export interface SetAccountControlsInput {
  accountId: string;
  status?: string;
  overdraftLimit?: string | null;
  minimumBalance?: string | null;
  permittedToGoNegative?: boolean;
}

export function useSetAccountControls(): LedgerMutation<SetAccountControlsInput, AccountWriteResult> {
  const queryClient = useQueryClient();
  return useLedgerMutation({
    mutationFn: (input: SetAccountControlsInput): Promise<AccountWriteResult> =>
      sendAccountRequest(`/api/ledger/accounts/${input.accountId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: input.status,
          overdraftLimit: input.overdraftLimit,
          minimumBalance: input.minimumBalance,
          permittedToGoNegative: input.permittedToGoNegative,
        }),
      }),
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountKeyPrefix() });
      queryClient.invalidateQueries({ queryKey: accountsListKey({}) });
    },
  });
}

export interface SaveAccountEditInput {
  accountId: string;
  /** The account as read — what the form's name and notes are compared against. */
  current: { name: string; notes: string; metadata?: Record<string, string> };
  name: string;
  notes: string;
  status?: string;
  floor: { permittedToGoNegative: boolean; overdraftLimit: string | null; minimumBalance: string | null };
}

/**
 * The account edit form's save, shared by the Accounts panel and the detail page. Only the
 * endpoint a changed field belongs to is called — `PUT` accepts just `name`/`metadata`,
 * `PATCH` just `status`/floor settings (README.md) — `PUT` only when the name or notes
 * changed, then `PATCH`. The service has no dedicated "notes" field, so the free-form text
 * rides in `metadata.notes`, resent with every other key (DRK-1704 finding 4). Resolves to
 * every refusal both calls returned — empty when the save went through.
 */
export function useSaveAccountEdit(): LedgerMutation<SaveAccountEditInput, LedgerError[]> {
  const changeDetails = useChangeAccountDetails();
  const setControls = useSetAccountControls();
  // One mutation around both calls, so `isPending` holds from the first request to the last.
  return useLedgerMutation({
    mutationFn: async ({ accountId, current, name, notes, status, floor }: SaveAccountEditInput): Promise<LedgerError[]> => {
      const errors: LedgerError[] = [];
      const nameChanged = name !== current.name;
      const notesChanged = notes !== current.notes;
      if (nameChanged || notesChanged) {
        const result = await changeDetails.mutate({
          accountId,
          name: nameChanged ? name : undefined,
          metadata: notesChanged ? { ...current.metadata, notes } : undefined,
        });
        if (!result.ok) errors.push(...(result.errors ?? []));
      }
      const controls = await setControls.mutate({
        accountId,
        status,
        overdraftLimit: floor.overdraftLimit,
        minimumBalance: floor.minimumBalance,
        permittedToGoNegative: floor.permittedToGoNegative,
      });
      if (!controls.ok) errors.push(...(controls.errors ?? []));
      return errors;
    },
  });
}
