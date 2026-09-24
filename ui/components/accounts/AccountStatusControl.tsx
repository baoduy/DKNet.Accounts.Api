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
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { formatAmount } from '@/components/ledger/Money';
import { useSetAccountControls } from '@/lib/accounts/mutations';

export interface AccountStatusControlProps {
  accountId: string;
  status: string;
  balance: string;
  currency: string;
  decimalPlaces?: number;
  granted?: boolean;
  style?: CSSProperties;
}

export function AccountStatusControl({
  accountId,
  status,
  balance,
  currency,
  decimalPlaces = 2,
  granted = true,
  style,
}: AccountStatusControlProps): JSX.Element {
  const [pending, setPending] = useState(false);
  const setControls = useSetAccountControls();

  const closed = status === 'Closed';
  const blockedByBalance = !closed && Number(balance) !== 0;

  async function handleClick(): Promise<void> {
    setPending(true);
    try {
      await setControls.mutate({ accountId, status: closed ? 'Active' : 'Closed' });
    } finally {
      setPending(false);
    }
  }

  return (
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
  );
}
