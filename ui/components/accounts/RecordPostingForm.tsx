/**
 * DRK-1696 §3 row 5 — records a posting. On the detail screen the account and currency arrive
 * as props, locked; on the Records screen (DRK-1713 §3 row 10) no account is passed and the
 * operator chooses one by searching accounts by number or name, its currency then shown
 * locked. Either way `ConfirmMovement` restates the movement before anything is sent.
 * Composes `useIdempotencyKey` + `IdempotencyKeyField` + `useRecordPosting`; mounted only
 * under a query provider.
 */
'use client';

import { useRef, useState, type CSSProperties, type JSX } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IdempotencyKeyField } from '@/components/forms/IdempotencyKeyField';
import { useIdempotencyKey } from '@/components/forms/use-idempotency-key';
import { ConfirmMovement } from '@/components/feedback/ConfirmMovement';
import { RefusalAlert, type LedgerError } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { isUnreachable, NO_ANSWER_ERROR, RECORD_POSTING_CODE_FIELDS, routeRefusal } from '@/lib/api/refusal';
import { POSTING_CATEGORIES } from '@/lib/accounts/postings-filter';
import { useAccounts } from '@/lib/accounts/query';
import { useRecordPosting } from '@/lib/query/mutations';

const ACCOUNT_OPTIONS_PAGE_SIZE = 10;

export interface RecordPostingFormProps {
  /** The account to record against, locked. Absent: the operator chooses one. */
  accountId?: string;
  accountNumber?: string;
  currency?: string;
  granted?: boolean;
  style?: CSSProperties;
}

interface ChosenAccount {
  id: string;
  accountNumber: string;
  currency: string;
}

function FieldRefusal({ error }: { error?: LedgerError }): JSX.Element | null {
  if (!error) return null;
  return (
    <span role="alert">
      {error.code ? <span className="font-mono font-semibold">{error.code}</span> : null} {error.message}
    </span>
  );
}

function AccountOptions({ term, onChoose }: { term: string; onChoose: (account: ChosenAccount) => void }): JSX.Element | null {
  const accountsQuery = useAccounts({ filters: { search: term } }, ACCOUNT_OPTIONS_PAGE_SIZE);
  const accounts = accountsQuery.data?.items ?? [];
  if (accounts.length === 0) return null;
  return (
    <ul role="listbox" aria-label="Accounts found" className="flex flex-col rounded-md border border-border">
      {accounts.map((account) => {
        const choose = (): void => onChoose({ id: account.id, accountNumber: account.accountNumber, currency: account.currency });
        return (
          <li key={account.id} role="option" aria-selected={false} tabIndex={0} className="cursor-pointer p-2 hover:bg-muted" onClick={choose} onKeyDown={(event) => event.key === 'Enter' && choose()}>
            {account.accountNumber} {account.name}
          </li>
        );
      })}
    </ul>
  );
}

export function RecordPostingForm({ accountId, accountNumber = '', currency = '', granted = true, style }: RecordPostingFormProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [chosen, setChosen] = useState<ChosenAccount | null>(null);
  const [term, setTerm] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [direction, setDirection] = useState<'Credit' | 'Debit'>('Credit');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [errors, setErrors] = useState<LedgerError[]>([]);
  const recordPostingRef = useRef<HTMLButtonElement>(null);
  const dismissedRef = useRef(false);

  const idempotency = useIdempotencyKey();
  const record = useRecordPosting();
  const { fieldErrors, alertErrors } = routeRefusal(errors, RECORD_POSTING_CODE_FIELDS);
  const account: ChosenAccount | null = accountId ? { id: accountId, accountNumber, currency } : chosen;

  function chooseAccount(next: ChosenAccount): void {
    setChosen(next);
    setTerm(next.accountNumber);
    setOptionsOpen(false);
  }

  async function handleConfirm(): Promise<void> {
    if (!account) return;
    // Collapses to the (disabled) `Record posting` toggle while the write is in flight; a
    // refusal or no answer reopens the form, so its controls carry what went wrong.
    setConfirming(false);
    setOpen(false);
    setPending(true);
    try {
      const result = await record.mutate({
        accountId: account.id,
        direction,
        amount,
        currency: account.currency,
        category,
        idempotencyKey: idempotency.value,
        regenerateIdempotencyKey: idempotency.regenerate,
      });
      if (result.ok) {
        setErrors([]);
        setAmount('');
        setCategory('');
      } else {
        // The pass-through's unreachable answer means the service never answered this write.
        setErrors(isUnreachable(result.errors) ? [NO_ANSWER_ERROR] : (result.errors ?? []));
        setOpen(true);
      }
    } catch {
      setErrors([NO_ANSWER_ERROR]);
      setOpen(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={style} className="flex flex-col gap-3">
      {/* `Record posting` and `Record` are never both on screen: Playwright's `getByRole` matches
          by substring, so `{ name: 'Record' }` would otherwise resolve to both. */}
      {!open ? (
        <ScopeGate scope="postings.write" granted={granted}>
          <Button ref={recordPostingRef} type="button" disabled={pending} onClick={() => setOpen(true)}>
            Record posting
          </Button>
        </ScopeGate>
      ) : null}

      <RefusalAlert errors={alertErrors} />

      {open ? (
        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          <label className="flex flex-col gap-1">
            Account
            {accountId ? (
              <Input aria-label="Account" value={accountNumber} disabled readOnly aria-invalid={fieldErrors.accountId ? 'true' : undefined} />
            ) : (
              <Input
                aria-label="Account"
                role="combobox"
                aria-expanded={optionsOpen}
                value={term}
                onFocus={() => setOptionsOpen(true)}
                onChange={(event) => {
                  setTerm(event.target.value);
                  setChosen(null);
                  setOptionsOpen(true);
                }}
                aria-invalid={fieldErrors.accountId ? 'true' : undefined}
              />
            )}
            <FieldRefusal error={fieldErrors.accountId} />
          </label>
          {!accountId && optionsOpen && term ? <AccountOptions term={term} onChoose={chooseAccount} /> : null}

          <label className="flex flex-col gap-1">
            Posting currency
            {/* Not labeled bare "Currency": the edit form's own locked Currency select
                (`AccountForm.tsx`) already carries that exact name, and both show the same
                locked, disabled value — no separate control for the operator to distinguish. */}
            <Input aria-label="Posting currency" value={account?.currency ?? ''} disabled readOnly />
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
            <FieldRefusal error={fieldErrors.amount} />
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

          <Button type="button" variant="primary" disabled={pending || !account} onClick={() => setConfirming(true)}>
            Record
          </Button>
        </div>
      ) : null}

      <ConfirmMovement
        open={confirming}
        direction={direction}
        amount={amount}
        currency={account?.currency}
        accountNumber={account?.accountNumber}
        category={category || undefined}
        onBack={() => setConfirming(false)}
        onDismiss={() => {
          // Escape leaves the whole recording: nothing is recorded, the form closes and focus goes
          // back to `Record posting`, the control that started it (DRK-1725 §3 row 7, brief Q3).
          dismissedRef.current = true;
          setConfirming(false);
          setOpen(false);
        }}
        onCloseAutoFocus={(event) => {
          if (!dismissedRef.current) return;
          dismissedRef.current = false;
          event.preventDefault();
          recordPostingRef.current?.focus();
        }}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
