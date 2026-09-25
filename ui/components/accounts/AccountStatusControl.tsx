/**
 * DRK-1696 §3 row 7 — the quick close/reopen action: one control whose label tracks the
 * account's own status, through `useSetAccountControls` (`lib/accounts/mutations.ts`).
 * Closing an account that still holds money is refused **on the field** (R4) — disabled with
 * the held figure and `ACCOUNT_HOLDS_BALANCE` before any request is ever made, mirroring the
 * service's own refusal wording (`fake-ledger-service.ts`: "The account holds {balance}
 * {currency} and cannot be closed.").
 * DRK-1745 — `variant="panel"` is the side panel's footer pair (Design/ui_kits/accounts-crud):
 * `Close account` / `Reopen account`, and Close asks first in the kit's destructive dialog.
 */
'use client';

import { useState, type CSSProperties, type JSX } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Mono, Note } from '@/components/ui/text';
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
  /** Absent until the currency's scale is known — the held figure is then quoted as the
   * service's own text, never re-scaled to a guessed 2 places. */
  decimalPlaces?: number;
  granted?: boolean;
  /** `panel` — kit labels and a confirmation before Close. Defaults to the detail page's bare pair. */
  variant?: 'inline' | 'panel';
  /** Named in the panel's close confirmation. */
  accountNumber?: string;
  /** After the service accepted the change, with the status it now holds. */
  onStatusChange?: (status: string) => void;
  style?: CSSProperties;
}

export function AccountStatusControl({
  accountId,
  status,
  balance,
  heldAmount = '0',
  currency,
  decimalPlaces,
  granted = true,
  variant = 'inline',
  accountNumber,
  onStatusChange,
  style,
}: AccountStatusControlProps): JSX.Element {
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errors, setErrors] = useState<LedgerError[]>([]);
  const setControls = useSetAccountControls();

  const closed = status === 'Closed';
  const panel = variant === 'panel';
  // The service refuses on the balance OR the held amount (spec decision; `Update.cs:83`) —
  // never `Number(balance)`, which would round a figure past `Number.MAX_SAFE_INTEGER` (R1).
  const blockedByBalance = !closed && (!isZeroAmount(balance) || !isZeroAmount(heldAmount));

  async function change(): Promise<void> {
    setConfirming(false);
    setPending(true);
    try {
      const next = closed ? 'Active' : 'Closed';
      const result = await setControls.mutate({ accountId, status: next });
      setErrors(result.ok ? [] : (result.errors ?? []));
      if (result.ok) onStatusChange?.(next);
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
              The account holds {decimalPlaces === undefined ? balance : formatAmount(balance, decimalPlaces)} {currency} and cannot be closed. <span className="font-mono font-semibold">ACCOUNT_HOLDS_BALANCE</span>
            </>
          ) : undefined
        }
        style={style}
      >
        <Button
          type="button"
          size={panel ? 'sm' : undefined}
          variant={panel ? (closed ? 'primary' : 'destructive') : undefined}
          disabled={pending}
          onClick={panel && !closed ? () => setConfirming(true) : change}
        >
          {panel ? `${closed ? 'Reopen' : 'Close'} account` : closed ? 'Reopen' : 'Close'}
        </Button>
      </ScopeGate>
      {errors.length ? <RefusalAlert errors={errors} /> : null}
      {confirming ? (
        <Dialog
          tone="destructive"
          title="Close account"
          onClose={() => setConfirming(false)}
          footer={
            <>
              <Button type="button" onClick={() => setConfirming(false)}>
                Keep account open
              </Button>
              <Button type="button" variant="destructive" onClick={change}>
                Close account
              </Button>
            </>
          }
        >
          <div>
            Closing <Mono>{accountNumber}</Mono> stops any further posting against it. Its statement and its history stay readable.
          </div>
          <Note className="mt-3">Reversible — a closed account can be reopened from this panel. Nothing in the ledger is erased either way.</Note>
        </Dialog>
      ) : null}
    </span>
  );
}
