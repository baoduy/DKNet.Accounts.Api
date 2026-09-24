/**
 * DRK-1696 §3 row 5 — records a posting against **this** account, account and currency
 * locked (not choosable). Composes `useIdempotencyKey` + `IdempotencyKeyField` +
 * `useRecordPosting`; mounted only once an account is on screen (`AccountDetail` gates this
 * behind `accountId`), so its mutation hook is never called without a query provider.
 */
'use client';

import { useState, type CSSProperties, type JSX } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IdempotencyKeyField } from '@/components/forms/IdempotencyKeyField';
import { useIdempotencyKey } from '@/components/forms/use-idempotency-key';
import { RefusalAlert, type LedgerError } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { routeRefusal } from '@/lib/api/refusal';
import { POSTING_CATEGORIES } from '@/lib/accounts/postings-filter';
import { useRecordPosting } from '@/lib/query/mutations';

export interface RecordPostingFormProps {
  accountId: string;
  accountNumber: string;
  currency: string;
  granted?: boolean;
  /** The account's own `Account`/`Currency`/`Direction`/`Category` fields, once open, would
   * otherwise collide (Playwright `getByLabel` matches by substring) with the postings
   * panel's narrowing selects and the edit form's locked fields — both stay on screen
   * throughout. `AccountDetail` hides them while this form is open so each label resolves to
   * exactly one control again. */
  onOpenChange?: (open: boolean) => void;
  style?: CSSProperties;
}

export function RecordPostingForm({ accountId, accountNumber, currency, granted = true, onOpenChange, style }: RecordPostingFormProps): JSX.Element {
  const [open, setOpenState] = useState(false);

  function setOpen(next: boolean): void {
    setOpenState(next);
    onOpenChange?.(next);
  }
  const [pending, setPending] = useState(false);
  const [direction, setDirection] = useState<'Credit' | 'Debit'>('Credit');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [errors, setErrors] = useState<LedgerError[]>([]);

  const idempotency = useIdempotencyKey();
  const record = useRecordPosting();
  const { fieldErrors, alertErrors } = routeRefusal(errors);

  async function handleSubmit(): Promise<void> {
    // Collapses back to the `Record posting` toggle immediately — not only once the mutation
    // settles. `Record posting` and `Record` must never both be on screen at once: Playwright's
    // `getByRole` matches by substring, so `{ name: 'Record' }` would otherwise resolve to both.
    setOpen(false);
    setPending(true);
    try {
      const result = await record.mutate({
        accountId,
        direction,
        amount,
        currency,
        category,
        idempotencyKey: idempotency.value,
        regenerateIdempotencyKey: idempotency.regenerate,
      });
      if (result.ok) {
        setErrors([]);
        setAmount('');
        setCategory('');
      } else {
        setErrors(result.errors ?? []);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={style} className="flex flex-col gap-3">
      {!open ? (
        <ScopeGate scope="postings.write" granted={granted}>
          <Button type="button" disabled={pending} onClick={() => setOpen(true)}>
            Record posting
          </Button>
        </ScopeGate>
      ) : null}

      <RefusalAlert errors={alertErrors} />

      {open ? (
        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          <label className="flex flex-col gap-1">
            Account
            <Input aria-label="Account" value={accountNumber} disabled readOnly />
          </label>

          <label className="flex flex-col gap-1">
            Currency
            <Input aria-label="Currency" value={currency} disabled readOnly />
          </label>

          <label className="flex flex-col gap-1">
            Direction
            <select aria-label="Direction" value={direction} onChange={(event) => setDirection(event.target.value as 'Credit' | 'Debit')}>
              <option value="Credit">Credit</option>
              <option value="Debit">Debit</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            Amount
            <Input aria-label="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} aria-invalid={fieldErrors.amount ? 'true' : undefined} />
            {fieldErrors.amount ? (
              <span role="alert">{fieldErrors.amount.message}</span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1">
            Category
            <select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Select a category</option>
              {POSTING_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <IdempotencyKeyField value={idempotency.value} onRegenerate={idempotency.regenerate} note="Prevents a duplicate posting if this request is retried." />

          <Button type="button" variant="primary" disabled={pending} onClick={handleSubmit}>
            Record
          </Button>
        </div>
      ) : null}
    </div>
  );
}
