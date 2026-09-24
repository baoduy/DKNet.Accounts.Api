/**
 * DRK-1696 §3 row 7 — the quick close/reopen action: one control whose label tracks the
 * account's own status, through `useSetAccountControls` (`lib/accounts/mutations.ts`).
 * Closing an account that still holds money is refused **on the field** (R4) — disabled with
 * the held figure and `ACCOUNT_HOLDS_BALANCE` before any request is ever made, mirroring the
 * service's own refusal wording (`fake-ledger-service.ts`: "The account holds {balance}
 * {currency} and cannot be closed.").
 */
'use client';

import { useState, type CSSProperties, type JSX } from 'react';
import { Button } from '@/components/ui/button';
import { RefusalAlert, type LedgerError } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { formatAmount } from '@/components/ledger/Money';
import { isZeroAmount } from '@/lib/api/money-json';
import { useSetAccountControls } from '@/lib/accounts/mutations';

export interface AccountStatusControlProps {
  accountId: string;
  status: string;
  balance: string;
  /** Defaults to `'0'` only for callers with no held figure to report (e.g. a fixture that
   * predates this field) — the service refuses Close on either amount being non-zero. */
  heldAmount?: string;
  currency: string;
  decimalPlaces?: number;
  granted?: boolean;
  style?: CSSProperties;
}

export function AccountStatusControl({
  accountId,
  status,
  balance,
  heldAmount = '0',
  currency,
  decimalPlaces = 2,
  granted = true,
  style,
}: AccountStatusControlProps): JSX.Element {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<LedgerError[]>([]);
  const setControls = useSetAccountControls();

  const closed = status === 'Closed';
  // The service refuses on the balance OR the held amount (spec decision; `Update.cs:83`) —
  // never `Number(balance)`, which would round a figure past `Number.MAX_SAFE_INTEGER` (R1).
  const blockedByBalance = !closed && (!isZeroAmount(balance) || !isZeroAmount(heldAmount));

  async function handleClick(): Promise<void> {
    setPending(true);
    try {
      const result = await setControls.mutate({ accountId, status: closed ? 'Active' : 'Closed' });
      setErrors(result.ok ? [] : (result.errors ?? []));
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <ScopeGate
        scope="accounts.write"
        granted={granted && !blockedByBalance}
        reason={
          blockedByBalance ? (
            <>
              The account holds {formatAmount(balance, decimalPlaces)} {currency} and cannot be closed. <span className="font-mono font-semibold">ACCOUNT_HOLDS_BALANCE</span>
            </>
          ) : undefined
        }
        style={style}
      >
        <Button type="button" disabled={pending} onClick={handleClick}>
          {closed ? 'Reopen' : 'Close'}
        </Button>
      </ScopeGate>
      {errors.length ? <RefusalAlert errors={errors} /> : null}
    </span>
  );
}
