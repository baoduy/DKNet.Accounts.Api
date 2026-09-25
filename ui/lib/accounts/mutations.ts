/**
 * DRK-1696 §3 row 7 — account write hooks. Each invalidates the account + list keys on
 * success only, mirroring `lib/query/mutations.ts`'s posting hooks.
 */
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LedgerError } from '@/components/feedback/RefusalAlert';
import { readLedgerJson } from '@/lib/api/money-json';
import { accountKeyPrefix, accountsListKey } from '@/lib/query/keys';
import type { AccountDto } from './query';

export interface AccountWriteResult {
  ok: boolean;
  account?: AccountDto;
  errors?: LedgerError[];
  traceId?: string;
}

/** `readLedgerJson`, never `response.json()` — an `AccountDto` carries money fields (R1). */
async function readAccountResult(response: Response): Promise<AccountWriteResult> {
  const body = (await readLedgerJson(response)) as (AccountDto & { errors?: LedgerError[]; traceId?: string }) | null;
  if (response.ok) return { ok: true, account: body as AccountDto };
  return { ok: false, errors: body?.errors, traceId: body?.traceId };
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

export function useOpenAccount(): { mutate: (input: OpenAccountInput) => Promise<AccountWriteResult> } {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: OpenAccountInput): Promise<AccountWriteResult> => {
      const response = await fetch('/api/ledger/accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      return readAccountResult(response);
    },
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountsListKey({}) });
    },
  });
  return { mutate: (input) => mutation.mutateAsync(input) };
}

export interface ChangeAccountDetailsInput {
  accountId: string;
  name?: string;
  metadata?: Record<string, string>;
}

export function useChangeAccountDetails(): { mutate: (input: ChangeAccountDetailsInput) => Promise<AccountWriteResult> } {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: ChangeAccountDetailsInput): Promise<AccountWriteResult> => {
      const response = await fetch(`/api/ledger/accounts/${input.accountId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: input.name, metadata: input.metadata }),
      });
      return readAccountResult(response);
    },
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountKeyPrefix() });
      queryClient.invalidateQueries({ queryKey: accountsListKey({}) });
    },
  });
  return { mutate: (input) => mutation.mutateAsync(input) };
}

export interface SetAccountControlsInput {
  accountId: string;
  status?: string;
  overdraftLimit?: string | null;
  minimumBalance?: string | null;
  permittedToGoNegative?: boolean;
}

export function useSetAccountControls(): { mutate: (input: SetAccountControlsInput) => Promise<AccountWriteResult> } {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: SetAccountControlsInput): Promise<AccountWriteResult> => {
      const response = await fetch(`/api/ledger/accounts/${input.accountId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: input.status,
          overdraftLimit: input.overdraftLimit,
          minimumBalance: input.minimumBalance,
          permittedToGoNegative: input.permittedToGoNegative,
        }),
      });
      return readAccountResult(response);
    },
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: accountKeyPrefix() });
      queryClient.invalidateQueries({ queryKey: accountsListKey({}) });
    },
  });
  return { mutate: (input) => mutation.mutateAsync(input) };
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
export function useSaveAccountEdit(): (input: SaveAccountEditInput) => Promise<LedgerError[]> {
  const changeDetails = useChangeAccountDetails();
  const setControls = useSetAccountControls();
  return async ({ accountId, current, name, notes, status, floor }) => {
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
  };
}
