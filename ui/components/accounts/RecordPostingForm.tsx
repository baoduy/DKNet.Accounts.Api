/**
 * DRK-1696 §3 row 5 — records a posting. On the detail screen the account and currency arrive
 * as props, locked; on the Records screen (DRK-1713 §3 row 10) no account is passed and the
 * operator chooses one, its currency then shown locked.
 *
 * DRK-1745 §3 row 7 (Design/ui_kits/records-crud) — the form is the side panel's content: kit
 * fields and hints, `Review movement` in the panel footer, then `ConfirmMovement` restates the
 * movement and only its `Record posting` sends (R2). The kit's counterparty, transaction group,
 * external reference and metadata fields are not drawn: the service's `RecordPostingRequest`
 * accepts none of them (brief Q1). Composes `useIdempotencyKey` + `IdempotencyKeyField` +
 * `useRecordPosting`; the key is minted when the panel opens and dropped with it. Mounted only
 * under a query provider.
 */
'use client';

import { useRef, useState, type JSX, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input, ReadOnlyField } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Caption, Mono, Note } from '@/components/ui/text';
import { Currency } from '@/components/ledger/Currency';
import { Money } from '@/components/ledger/Money';
import { IdempotencyKeyField } from '@/components/forms/IdempotencyKeyField';
import { useIdempotencyKey } from '@/components/forms/use-idempotency-key';
import { ConfirmMovement } from '@/components/feedback/ConfirmMovement';
import { DetailPanel } from '@/components/feedback/DetailPanel';
import { useReportDirty } from '@/components/feedback/use-panel-state';
import { RefusalAlert, type LedgerError } from '@/components/feedback/RefusalAlert';
import { formatDate } from '@/components/records/RecordsTable';
import { isUnreachable, NO_ANSWER_ERROR, RECORD_POSTING_CODE_FIELDS, routeRefusal } from '@/lib/api/refusal';
import { POSTING_CATEGORIES } from '@/lib/accounts/postings-filter';
import { useAccounts } from '@/lib/accounts/query';
import { useDecimalPlaces } from '@/lib/query/currencies';
import { useRecordPosting } from '@/lib/query/mutations';

// ponytail: the Records screen's account select lists the service's first 1000 accounts (its
// page-size ceiling); a searchable picker is the upgrade once a ledger holds more.
const ACCOUNT_OPTIONS_PAGE_SIZE = 1000;
const DEFAULT_CATEGORY = 'Transfer';

/** Today as the service dates it (UTC) — a local date ahead of UTC would be refused as future. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface PostingAccount {
  id: string;
  accountNumber: string;
  name?: string;
  currency: string;
  status?: string;
  balance?: string;
}

export interface RecordedPosting {
  direction: 'Credit' | 'Debit';
  amount: string;
  currency: string;
  accountNumber: string;
  effectiveDate: string;
}

/** The `Record posted` acknowledgement. The service answers a recording with no posting, so it restates what was sent. */
export function recordedText(recorded: RecordedPosting): JSX.Element {
  return (
    <>
      {recorded.direction} of {recorded.amount} {recorded.currency} against <Mono>{recorded.accountNumber}</Mono>, effective {formatDate(recorded.effectiveDate)}. A new idempotency key has
      been minted for the next record.
    </>
  );
}

export interface RecordPostingFormProps {
  /** The account to record against, locked. Absent: the operator chooses one. */
  account?: PostingAccount;
  granted?: boolean;
  /** Cancel or Esc — the panel's host asks before an unsent record is dropped. */
  onClose: () => void;
  /** Whether anything was entered, so the host can ask before dropping it. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Called once the service recorded the posting — never before. */
  onRecorded?: (recorded: RecordedPosting) => void;
}

function FormRow({ label, hint, required = false, children }: { label: string; hint?: ReactNode; required?: boolean; children: ReactNode }): JSX.Element {
  return (
    <>
      <Caption className="pt-2">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-destructive-solid">
            *
          </span>
        ) : null}
      </Caption>
      <div className="min-w-0">
        {children}
        {hint ? <Note className="mt-1.5">{hint}</Note> : null}
      </div>
    </>
  );
}

function FieldRefusal({ error }: { error?: LedgerError }): JSX.Element | null {
  if (!error) return null;
  return (
    <span role="alert" className="mt-1.5 block text-[length:var(--text-caption-size)] text-destructive-solid">
      {error.code ? <span className="font-mono font-semibold">{error.code}</span> : null} {error.message}
    </span>
  );
}

function AccountSelect({ value, invalid, onChoose }: { value: string; invalid: boolean; onChoose: (account: PostingAccount | null) => void }): JSX.Element {
  const accounts = useAccounts({ filters: {} }, ACCOUNT_OPTIONS_PAGE_SIZE).data?.items ?? [];
  return (
    <Select
      aria-label="Account"
      options={[{ value: '', label: 'Select an account' }, ...accounts.map((account) => ({ value: account.id, label: `${account.accountNumber} — ${account.name}` }))]}
      value={value}
      className={invalid ? 'w-full border-destructive' : 'w-full'}
      onChange={(event) => {
        const chosen = accounts.find((account) => account.id === event.target.value);
        onChoose(chosen ? { id: chosen.id, accountNumber: chosen.accountNumber, name: chosen.name, currency: chosen.currency, status: chosen.status, balance: chosen.balance } : null);
      }}
    />
  );
}

export function RecordPostingForm({ account: lockedAccount, granted = true, onClose, onDirtyChange, onRecorded }: RecordPostingFormProps): JSX.Element {
  const [confirming, setConfirming] = useState(false);
  const [chosen, setChosen] = useState<PostingAccount | null>(null);
  const [direction, setDirection] = useState<'Credit' | 'Debit'>('Credit');
  const [amount, setAmount] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<LedgerError[]>([]);
  const reviewButton = useRef<HTMLButtonElement>(null);

  const idempotency = useIdempotencyKey();
  const record = useRecordPosting();
  const decimalPlacesOf = useDecimalPlaces();
  const { fieldErrors, alertErrors } = routeRefusal(errors, RECORD_POSTING_CODE_FIELDS);
  const account = lockedAccount ?? chosen;
  const decimalPlaces = account ? decimalPlacesOf(account.currency) : undefined;
  const status = account?.status?.toLowerCase();

  const dirty = Boolean(amount || description || chosen || direction !== 'Credit' || category !== DEFAULT_CATEGORY || effectiveDate !== today());
  useReportDirty(dirty, onDirtyChange);

  async function handleConfirm(): Promise<void> {
    if (!account) return;
    setConfirming(false);
    try {
      const result = await record.mutate({
        accountId: account.id,
        direction,
        amount,
        currency: account.currency,
        category,
        description: description || undefined,
        effectiveDate: effectiveDate || undefined,
        idempotencyKey: idempotency.value,
        regenerateIdempotencyKey: idempotency.regenerate,
      });
      if (result.ok) {
        setErrors([]);
        onRecorded?.({ direction, amount, currency: account.currency, accountNumber: account.accountNumber, effectiveDate });
      } else {
        // The pass-through's unreachable answer means the service never answered this write.
        setErrors(isUnreachable(result.errors) ? [NO_ANSWER_ERROR] : (result.errors ?? []));
      }
    } catch {
      setErrors([NO_ANSWER_ERROR]);
    }
  }

  const lock = (content: ReactNode): JSX.Element => (
    <ReadOnlyField locked>
      <span className="inline-flex items-center gap-1.5">{content}</span>
    </ReadOnlyField>
  );

  return (
    <>
      <DetailPanel
        title="Record posting"
        onClose={onClose}
        actions={
          <>
            <Button type="button" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button ref={reviewButton} type="button" size="sm" variant="primary" disabled={record.isPending || !account || !granted} onClick={() => setConfirming(true)}>
              Review movement
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-[length:var(--text-table-size)]">
          <FormRow
            label="Account"
            required
            hint={account && status && status !== 'active' ? `${account.accountNumber} is ${status}.` : 'The account fixes the currency and the floor this record is checked against.'}
          >
            {lockedAccount ? lock(<Mono>{lockedAccount.accountNumber}</Mono>) : <AccountSelect value={chosen?.id ?? ''} invalid={Boolean(fieldErrors.accountId)} onChoose={setChosen} />}
            <FieldRefusal error={fieldErrors.accountId} />
          </FormRow>
          <FormRow label="Currency">
            {account ? (
              lock(
                <>
                  <Currency code={account.currency} />
                  {decimalPlaces !== undefined ? <Caption>{decimalPlaces} dp</Caption> : null}
                </>,
              )
            ) : (
              <ReadOnlyField>
                <Caption>Taken from the account.</Caption>
              </ReadOnlyField>
            )}
          </FormRow>
          <FormRow label="Direction" required hint={status === 'dormant' ? 'Debits are refused: this account is dormant. A credit can still be recorded.' : undefined}>
            <Select
              aria-label="Direction"
              options={['Credit', 'Debit']}
              value={direction}
              className="w-full"
              onChange={(event) => setDirection(event.target.value === 'Debit' ? 'Debit' : 'Credit')}
            />
          </FormRow>
          <FormRow
            label="Amount"
            required
            hint={
              account && decimalPlaces !== undefined ? (
                <>
                  Unsigned, at {decimalPlaces} decimal places.
                  {account.balance !== undefined ? (
                    <>
                      {' '}
                      Balance is now <Money amount={account.balance} currency={account.currency} decimalPlaces={decimalPlaces} showCurrency />.
                    </>
                  ) : null}
                </>
              ) : (
                'Unsigned — the direction carries the sign.'
              )
            }
          >
            <Input numeric aria-label="Amount" placeholder="0.00" value={amount} invalid={Boolean(fieldErrors.amount)} onChange={(event) => setAmount(event.target.value)} className="w-42" />
            <FieldRefusal error={fieldErrors.amount} />
          </FormRow>
          <FormRow label="Effective" hint="Defaults to today. A future date is refused.">
            <Input type="date" aria-label="Effective date" value={effectiveDate} max={today()} onChange={(event) => setEffectiveDate(event.target.value)} className="w-42" />
          </FormRow>
          <FormRow label="Category" required>
            <Select aria-label="Category" options={[...POSTING_CATEGORIES]} value={category} className="w-full" onChange={(event) => setCategory(event.target.value)} />
          </FormRow>
          <FormRow label="Description" hint="Optional.">
            <label className="block">
              <span className="sr-only">Description</span>
              <Textarea rows={2} value={description} placeholder="What this record is for." onChange={(event) => setDescription(event.target.value)} />
            </label>
          </FormRow>
        </div>
        <div className="mt-5">
          <IdempotencyKeyField value={idempotency.value} note="Prevents a duplicate posting if this request is retried." />
        </div>
        <RefusalAlert errors={alertErrors} style={{ marginTop: 'var(--space-4)' }} />
      </DetailPanel>

      <ConfirmMovement
        open={confirming}
        direction={direction}
        amount={amount}
        currency={account?.currency}
        accountNumber={account?.accountNumber}
        accountName={account?.name}
        effectiveDate={effectiveDate ? formatDate(effectiveDate) : undefined}
        category={category}
        consequence="Posting is immediate and final. The record cannot be edited afterwards; a correction is recorded as an opposing record."
        onBack={() => setConfirming(false)}
        // Back, Escape or a sent record: focus returns to `Review movement`, never to the page body
        // (the dialog has no trigger of its own). Once the panel closes it goes to its opener.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          reviewButton.current?.focus();
        }}
        onConfirm={handleConfirm}
        confirmLabel="Record posting"
      />
    </>
  );
}
